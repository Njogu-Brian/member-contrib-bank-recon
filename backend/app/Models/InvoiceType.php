<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class InvoiceType extends Model
{
    use HasFactory;

    protected $fillable = [
        'code',
        'name',
        'description',
        'charge_type',
        'charge_interval_days',
        'default_amount',
        'due_days',
        'is_active',
        'metadata',
        'sort_order',
    ];

    protected $casts = [
        'charge_interval_days' => 'integer',
        'default_amount' => 'decimal:2',
        'due_days' => 'integer',
        'is_active' => 'boolean',
        'metadata' => 'array',
        'sort_order' => 'integer',
    ];

    // Charge type constants
    const CHARGE_ONCE = 'once';
    const CHARGE_YEARLY = 'yearly';
    const CHARGE_MONTHLY = 'monthly';
    const CHARGE_WEEKLY = 'weekly';
    const CHARGE_AFTER_JOINING = 'after_joining';
    const CHARGE_CUSTOM = 'custom';

    public function invoices()
    {
        return $this->hasMany(Invoice::class, 'invoice_type_id');
    }

    /**
     * Check if this invoice type should be charged for a member
     */
    public function shouldChargeForMember(Member $member, ?\Carbon\Carbon $asOfDate = null): bool
    {
        $asOfDate = $asOfDate ?? now();

        switch ($this->charge_type) {
            case self::CHARGE_ONCE:
                // Check if already charged
                return !Invoice::where('member_id', $member->id)
                    ->where('invoice_type_id', $this->id)
                    ->exists();

            case self::CHARGE_AFTER_JOINING:
                // Charge once after member joins (based on date_of_registration)
                if (!$member->date_of_registration) {
                    return false;
                }
                // Check if already charged
                return !Invoice::where('member_id', $member->id)
                    ->where('invoice_type_id', $this->id)
                    ->exists();

            case self::CHARGE_YEARLY:
                // Charge yearly based on registration date or last charge
                $lastInvoice = Invoice::where('member_id', $member->id)
                    ->where('invoice_type_id', $this->id)
                    ->orderBy('issue_date', 'desc')
                    ->first();

                if (!$lastInvoice) {
                    // First charge - use registration date
                    if (!$member->date_of_registration) {
                        return false;
                    }
                    $nextChargeDate = \Carbon\Carbon::parse($member->date_of_registration)
                        ->addYear();
                    return $asOfDate->greaterThanOrEqualTo($nextChargeDate);
                }

                // Next charge based on last invoice
                $nextChargeDate = \Carbon\Carbon::parse($lastInvoice->issue_date)
                    ->addYear();
                return $asOfDate->greaterThanOrEqualTo($nextChargeDate);

            case self::CHARGE_MONTHLY:
                // Similar to yearly but monthly
                $lastInvoice = Invoice::where('member_id', $member->id)
                    ->where('invoice_type_id', $this->id)
                    ->orderBy('issue_date', 'desc')
                    ->first();

                if (!$lastInvoice) {
                    if (!$member->date_of_registration) {
                        return false;
                    }
                    $nextChargeDate = \Carbon\Carbon::parse($member->date_of_registration)
                        ->addMonth();
                    return $asOfDate->greaterThanOrEqualTo($nextChargeDate);
                }

                $nextChargeDate = \Carbon\Carbon::parse($lastInvoice->issue_date)
                    ->addMonth();
                return $asOfDate->greaterThanOrEqualTo($nextChargeDate);

            case self::CHARGE_WEEKLY:
                // Weekly charges (handled by existing weekly invoice command)
                return false; // Let existing command handle this

            case self::CHARGE_CUSTOM:
                // Custom logic defined in metadata
                return false; // Requires manual handling

            default:
                return false;
        }
    }

    /**
     * Get the issue date for charging this invoice type for a member
     */
    public function getIssueDateForMember(Member $member, ?\Carbon\Carbon $asOfDate = null): \Carbon\Carbon
    {
        $asOfDate = $asOfDate ?? now();

        switch ($this->charge_type) {
            case self::CHARGE_ONCE:
            case self::CHARGE_AFTER_JOINING:
                // Use registration date or current date
                if ($member->date_of_registration) {
                    return \Carbon\Carbon::parse($member->date_of_registration);
                }
                return $asOfDate;

            case self::CHARGE_YEARLY:
            case self::CHARGE_MONTHLY:
                $lastInvoice = Invoice::where('member_id', $member->id)
                    ->where('invoice_type_id', $this->id)
                    ->orderBy('issue_date', 'desc')
                    ->first();

                if ($lastInvoice) {
                    $interval = $this->charge_type === self::CHARGE_YEARLY ? 'year' : 'month';
                    return \Carbon\Carbon::parse($lastInvoice->issue_date)->add($interval);
                }

                // First charge - use registration date
                if ($member->date_of_registration) {
                    return \Carbon\Carbon::parse($member->date_of_registration);
                }
                return $asOfDate;

            default:
                return $asOfDate;
        }
    }
}

