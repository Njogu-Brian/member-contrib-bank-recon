<?php

namespace App\Models;

use Carbon\Carbon;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Invoice extends Model
{
    use HasFactory;

    // Invoice type constants
    const TYPE_WEEKLY = 'weekly_contribution';
    const TYPE_REGISTRATION = 'registration_fee';
    const TYPE_ANNUAL = 'annual_subscription';
    const TYPE_SOFTWARE = 'software_acquisition';
    const TYPE_CUSTOM = 'custom';

    protected $fillable = [
        'member_id',
        'invoice_number',
        'amount',
        'due_date',
        'issue_date',
        'status',
        'paid_at',
        'payment_id',
        'period',
        'invoice_type',
        'invoice_type_id',
        'invoice_year',
        'description',
        'metadata',
    ];

    protected $casts = [
        'amount' => 'decimal:2',
        'due_date' => 'date',
        'issue_date' => 'date',
        'paid_at' => 'date',
        'metadata' => 'array',
        'invoice_year' => 'integer',
    ];

    public function member()
    {
        return $this->belongsTo(Member::class);
    }

    public function payment()
    {
        return $this->belongsTo(Payment::class);
    }

    public function invoiceType()
    {
        return $this->belongsTo(InvoiceType::class, 'invoice_type_id');
    }

    public function isPending(): bool
    {
        return $this->status === 'pending';
    }

    public function isPaid(): bool
    {
        return $this->status === 'paid';
    }

    public function isOverdue(): bool
    {
        return $this->status === 'overdue' || 
               ($this->status === 'pending' && $this->due_date->isPast());
    }

    public function markAsPaid(Payment $payment): void
    {
        $this->update([
            'status' => 'paid',
            'paid_at' => now(),
            'payment_id' => $payment->id,
        ]);
    }

    public function markAsOverdue(): void
    {
        if ($this->isPending() && $this->due_date->isPast()) {
            $this->update(['status' => 'overdue']);
        }
    }

    /**
     * Generate unique invoice number based on type
     */
    public static function generateInvoiceNumber(string $type = self::TYPE_WEEKLY, ?Carbon $issueDate = null): string
    {
        // Different prefixes for different invoice types
        $prefixes = [
            self::TYPE_WEEKLY => 'INV',
            self::TYPE_REGISTRATION => 'REG',
            self::TYPE_ANNUAL => 'SUB',
            self::TYPE_SOFTWARE => 'SFT',
            self::TYPE_CUSTOM => 'CST',
        ];
        
        $prefix = $prefixes[$type] ?? 'INV';
        $date = $issueDate ? $issueDate->format('Ymd') : Carbon::now()->format('Ymd');
        
        // Get last invoice of this type created today
        $lastInvoice = static::where('invoice_type', $type)
            ->whereDate('created_at', Carbon::today())
            ->orderBy('id', 'desc')
            ->first();
        
        $sequence = $lastInvoice ? (intval(substr($lastInvoice->invoice_number, -4)) + 1) : 1;
        
        return sprintf('%s-%s-%04d', $prefix, $date, $sequence);
    }
    
    /**
     * Get human-readable invoice type label
     */
    public function getTypeLabel(): string
    {
        $labels = [
            self::TYPE_WEEKLY => 'Weekly Contribution',
            self::TYPE_REGISTRATION => 'Registration Fee',
            self::TYPE_ANNUAL => 'Annual Subscription',
            self::TYPE_SOFTWARE => 'Software Acquisition',
            self::TYPE_CUSTOM => 'Custom Invoice',
        ];
        
        return $labels[$this->invoice_type] ?? 'Invoice';
    }
    
    /**
     * Get invoice type badge color
     */
    public function getTypeBadgeColor(): string
    {
        $colors = [
            self::TYPE_WEEKLY => 'blue',
            self::TYPE_REGISTRATION => 'green',
            self::TYPE_ANNUAL => 'purple',
            self::TYPE_SOFTWARE => 'orange',
            self::TYPE_CUSTOM => 'gray',
        ];
        
        return $colors[$this->invoice_type] ?? 'gray';
    }
}
