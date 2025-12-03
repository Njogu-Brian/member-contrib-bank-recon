<?php

namespace App\Services;

use App\Models\Invoice;
use App\Models\Transaction;
use App\Models\ManualContribution;
use Illuminate\Support\Facades\Log;

class InvoicePaymentMatcher
{
    /**
     * Match a transaction to pending invoices for the member
     */
    public function matchTransactionToInvoices(Transaction $transaction): array
    {
        if (!$transaction->member_id || $transaction->credit <= 0) {
            return [
                'matched' => false,
                'reason' => 'Transaction has no member or zero amount',
            ];
        }

        $member = $transaction->member;
        $availableAmount = $transaction->credit;
        
        // Get pending/overdue invoices for this member, oldest first
        $pendingInvoices = Invoice::where('member_id', $member->id)
            ->whereIn('status', ['pending', 'overdue'])
            ->orderBy('due_date', 'asc')
            ->orderBy('issue_date', 'asc')
            ->get();

        if ($pendingInvoices->isEmpty()) {
            return [
                'matched' => false,
                'reason' => 'No pending invoices for this member',
            ];
        }

        $matchedInvoices = [];
        $remainingAmount = $availableAmount;

        foreach ($pendingInvoices as $invoice) {
            if ($remainingAmount <= 0) {
                break;
            }

            if ($remainingAmount >= $invoice->amount) {
                // Full payment of invoice
                $invoice->update([
                    'status' => 'paid',
                    'paid_at' => now(),
                    'metadata' => array_merge($invoice->metadata ?? [], [
                        'auto_matched' => true,
                        'transaction_id' => $transaction->id,
                        'matched_at' => now()->toDateTimeString(),
                    ]),
                ]);

                $matchedInvoices[] = [
                    'invoice_id' => $invoice->id,
                    'invoice_number' => $invoice->invoice_number,
                    'amount_paid' => $invoice->amount,
                    'status' => 'fully_paid',
                ];

                $remainingAmount -= $invoice->amount;
                
                Log::info('Invoice auto-matched to transaction', [
                    'invoice_id' => $invoice->id,
                    'transaction_id' => $transaction->id,
                    'amount' => $invoice->amount,
                ]);
            }
        }

        return [
            'matched' => count($matchedInvoices) > 0,
            'matched_invoices' => $matchedInvoices,
            'total_matched_amount' => $availableAmount - $remainingAmount,
            'remaining_amount' => $remainingAmount,
        ];
    }

    /**
     * Match a manual contribution to pending invoices
     */
    public function matchManualContributionToInvoices(ManualContribution $contribution): array
    {
        $member = $contribution->member;
        $availableAmount = $contribution->amount;
        
        // Get pending/overdue invoices for this member, oldest first
        $pendingInvoices = Invoice::where('member_id', $member->id)
            ->whereIn('status', ['pending', 'overdue'])
            ->orderBy('due_date', 'asc')
            ->orderBy('issue_date', 'asc')
            ->get();

        if ($pendingInvoices->isEmpty()) {
            return [
                'matched' => false,
                'reason' => 'No pending invoices for this member',
            ];
        }

        $matchedInvoices = [];
        $remainingAmount = $availableAmount;

        foreach ($pendingInvoices as $invoice) {
            if ($remainingAmount <= 0) {
                break;
            }

            if ($remainingAmount >= $invoice->amount) {
                // Full payment of invoice
                $invoice->update([
                    'status' => 'paid',
                    'paid_at' => now(),
                    'metadata' => array_merge($invoice->metadata ?? [], [
                        'auto_matched' => true,
                        'manual_contribution_id' => $contribution->id,
                        'matched_at' => now()->toDateTimeString(),
                    ]),
                ]);

                $matchedInvoices[] = [
                    'invoice_id' => $invoice->id,
                    'invoice_number' => $invoice->invoice_number,
                    'amount_paid' => $invoice->amount,
                    'status' => 'fully_paid',
                ];

                $remainingAmount -= $invoice->amount;
                
                Log::info('Invoice auto-matched to manual contribution', [
                    'invoice_id' => $invoice->id,
                    'contribution_id' => $contribution->id,
                    'amount' => $invoice->amount,
                ]);
            }
        }

        return [
            'matched' => count($matchedInvoices) > 0,
            'matched_invoices' => $matchedInvoices,
            'total_matched_amount' => $availableAmount - $remainingAmount,
            'remaining_amount' => $remainingAmount,
        ];
    }

    /**
     * Bulk match all unmatched transactions and contributions
     */
    public function bulkMatchPayments(): array
    {
        $matchedTransactions = 0;
        $matchedContributions = 0;
        $totalInvoicesPaid = 0;

        // Match transactions
        $transactions = Transaction::whereNotNull('member_id')
            ->where('credit', '>', 0)
            ->where('is_archived', false)
            ->get();

        foreach ($transactions as $transaction) {
            $result = $this->matchTransactionToInvoices($transaction);
            if ($result['matched']) {
                $matchedTransactions++;
                $totalInvoicesPaid += count($result['matched_invoices']);
            }
        }

        // Match manual contributions
        $contributions = ManualContribution::all();
        foreach ($contributions as $contribution) {
            $result = $this->matchManualContributionToInvoices($contribution);
            if ($result['matched']) {
                $matchedContributions++;
                $totalInvoicesPaid += count($result['matched_invoices']);
            }
        }

        return [
            'matched_transactions' => $matchedTransactions,
            'matched_contributions' => $matchedContributions,
            'total_invoices_paid' => $totalInvoicesPaid,
        ];
    }
}

