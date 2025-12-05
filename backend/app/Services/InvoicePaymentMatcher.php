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
     * This method processes all payments and matches them to ALL pending invoices in a single pass
     * It tracks which transactions have been used to prevent duplicate matching
     */
    public function bulkMatchPayments(): array
    {
        $matchedTransactions = 0;
        $matchedContributions = 0;
        $totalInvoicesPaid = 0;
        $totalAmountMatched = 0;

        // Get all pending invoices grouped by member
        $pendingInvoicesByMember = Invoice::whereIn('status', ['pending', 'overdue'])
            ->orderBy('due_date', 'asc')
            ->orderBy('issue_date', 'asc')
            ->get()
            ->groupBy('member_id');

        // Get all transactions and calculate how much has already been used
        $allTransactions = Transaction::whereNotNull('member_id')
            ->where('credit', '>', 0)
            ->where('is_archived', false)
            ->orderBy('tran_date', 'asc')
            ->get();

        // Track how much of each transaction has already been used by existing paid invoices
        $transactionAmountsUsed = [];
        
        Invoice::where('status', 'paid')
            ->whereNotNull('metadata')
            ->get()
            ->each(function($invoice) use (&$transactionAmountsUsed) {
                $metadata = is_string($invoice->metadata) 
                    ? json_decode($invoice->metadata, true) 
                    : ($invoice->metadata ?? []);
                
                // If this invoice was paid by a transaction, mark that transaction as used
                if (isset($metadata['transaction_id'])) {
                    $transactionId = $metadata['transaction_id'];
                    $transaction = $allTransactions->firstWhere('id', $transactionId);
                    if ($transaction) {
                        // For simplicity, if a transaction was used, mark it as fully used
                        // In a more complex system, we could track partial usage
                        $transactionAmountsUsed[$transactionId] = $transaction->credit;
                    }
                }
                
                // Handle multiple transactions used for one invoice
                if (isset($metadata['matched_transactions']) && is_array($metadata['matched_transactions'])) {
                    foreach ($metadata['matched_transactions'] as $transactionId) {
                        $transaction = $allTransactions->firstWhere('id', $transactionId);
                        if ($transaction) {
                            $transactionAmountsUsed[$transactionId] = $transaction->credit;
                        }
                    }
                }
            });

        // Group transactions by member
        $transactions = $allTransactions->groupBy('member_id');

        foreach ($transactions as $memberId => $memberTransactions) {
            if (!isset($pendingInvoicesByMember[$memberId])) {
                continue; // No pending invoices for this member
            }

            $pendingInvoices = $pendingInvoicesByMember[$memberId];
            $memberMatched = false;

            foreach ($pendingInvoices as $invoice) {
                // Calculate available amount from all member's unused transactions
                $availableAmount = 0;
                foreach ($memberTransactions as $transaction) {
                    $used = $transactionAmountsUsed[$transaction->id] ?? 0;
                    $availableAmount += max(0, $transaction->credit - $used);
                }

                if ($availableAmount < $invoice->amount) {
                    continue; // Not enough funds for this invoice
                }

                // Use transactions to pay this invoice
                $amountNeeded = $invoice->amount;
                $usedTransactionIdsForInvoice = [];

                foreach ($memberTransactions as $transaction) {
                    if ($amountNeeded <= 0) {
                        break;
                    }

                    $used = $transactionAmountsUsed[$transaction->id] ?? 0;
                    $available = $transaction->credit - $used;

                    if ($available > 0) {
                        $useAmount = min($available, $amountNeeded);
                        $transactionAmountsUsed[$transaction->id] = ($transactionAmountsUsed[$transaction->id] ?? 0) + $useAmount;
                        $usedTransactionIdsForInvoice[] = $transaction->id;
                        $amountNeeded -= $useAmount;
                    }
                }

                // Mark invoice as paid
                if ($amountNeeded <= 0) {
                    $primaryTransactionId = $usedTransactionIdsForInvoice[0];
                    
                    $invoice->update([
                        'status' => 'paid',
                        'paid_at' => now(),
                        'metadata' => array_merge($invoice->metadata ?? [], [
                            'auto_matched' => true,
                            'transaction_id' => $primaryTransactionId,
                            'matched_at' => now()->toDateTimeString(),
                            'matched_transactions' => $usedTransactionIdsForInvoice,
                        ]),
                    ]);

                    $totalInvoicesPaid++;
                    $totalAmountMatched += $invoice->amount;
                    $memberMatched = true;

                    Log::info('Invoice auto-matched in bulk', [
                        'invoice_id' => $invoice->id,
                        'transaction_ids' => $usedTransactionIdsForInvoice,
                        'amount' => $invoice->amount,
                    ]);
                }
            }

            if ($memberMatched) {
                $matchedTransactions++;
            }
        }

        // Match manual contributions (check if already used)
        $usedContributionIds = Invoice::where('status', 'paid')
            ->whereNotNull('metadata')
            ->get()
            ->filter(function($invoice) {
                $metadata = is_string($invoice->metadata) 
                    ? json_decode($invoice->metadata, true) 
                    : $invoice->metadata;
                return isset($metadata['manual_contribution_id']);
            })
            ->pluck('metadata')
            ->map(function($metadata) {
                $meta = is_string($metadata) ? json_decode($metadata, true) : $metadata;
                return $meta['manual_contribution_id'] ?? null;
            })
            ->filter()
            ->unique()
            ->toArray();

        $contributions = ManualContribution::whereNotIn('id', $usedContributionIds)->get();
        foreach ($contributions as $contribution) {
            $result = $this->matchManualContributionToInvoices($contribution);
            if ($result['matched']) {
                $matchedContributions++;
                $totalInvoicesPaid += count($result['matched_invoices']);
                $totalAmountMatched += $result['total_matched_amount'];
            }
        }

        return [
            'matched_transactions' => $matchedTransactions,
            'matched_contributions' => $matchedContributions,
            'total_invoices_paid' => $totalInvoicesPaid,
            'total_amount_matched' => $totalAmountMatched,
        ];
    }
}

