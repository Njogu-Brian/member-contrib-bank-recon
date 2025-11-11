<?php

namespace App\Services;

class TransactionParserService
{
    /**
     * Parse transaction particulars and extract structured data
     */
    public function parseParticulars(string $particulars): array
    {
        $particulars = trim($particulars);
        $result = [
            'transaction_type' => null,
            'phone_numbers' => [],
            'transaction_code' => null,
            'member_number' => null,
            'member_name' => null,
            'raw_particulars' => $particulars,
        ];

        // Detect transaction type
        $result['transaction_type'] = $this->detectTransactionType($particulars);

        // Parse based on transaction type
        switch ($result['transaction_type']) {
            case 'M-Pesa Paybill':
                $result = array_merge($result, $this->parseMpesaPaybill($particulars));
                break;
            case 'M-Pesa':
            case 'M-Pesa Bank':
                $result = array_merge($result, $this->parseMpesa($particulars));
                break;
            case 'Equity App':
                $result = array_merge($result, $this->parseEquityApp($particulars));
                break;
            case 'Bank Transfer':
                $result = array_merge($result, $this->parseBankTransfer($particulars));
                break;
            case 'Bank Agent':
                $result = array_merge($result, $this->parseBankAgent($particulars));
                break;
            case 'Eazzy Funds':
                $result = array_merge($result, $this->parseEazzyFunds($particulars));
                break;
            default:
                // Try generic parsing
                $result = array_merge($result, $this->parseGeneric($particulars));
        }

        return $result;
    }

    protected function detectTransactionType(string $particulars): ?string
    {
        $upper = strtoupper($particulars);
        
        // Check for Paybill first (more specific)
        // Paybill statements have "Acc" pattern (account name) or "PAYBILL" keyword
        if (preg_match('/\bPAYBILL\b/i', $upper) || 
            preg_match('/\bPAY\s+BILL\b/i', $upper) ||
            preg_match('/\bAcc\s+/i', $particulars)) {
            return 'M-Pesa Paybill';
        }
        
        // Check for regular M-Pesa (MPS pattern or bank deposit)
        if (preg_match('/\bMPS\b/i', $upper)) {
            // If it's a bank statement with MPS, it's "M-Pesa Bank"
            // If it's from paybill statement, it would have been caught above
            return 'M-Pesa Bank';
        }
        
        if (preg_match('/\bAPP\b/i', $upper)) {
            return 'Equity App';
        }
        if (preg_match('/\bTPG\b/i', $upper) || preg_match('/\bPESALINK\b/i', $upper)) {
            return 'Bank Transfer';
        }
        if (preg_match('/\bEAZZY-FUNDS\b/i', $upper) || preg_match('/\bEAZZY\s+FUNDS\b/i', $upper)) {
            return 'Eazzy Funds';
        }
        if (preg_match('/\bENTERPRTBY\b/i', $upper) || preg_match('/\/\d{12}\//', $particulars)) {
            return 'Bank Agent';
        }

        return null;
    }

    protected function parseMpesa(string $particulars): array
    {
        $result = [
            'phone_numbers' => [],
            'transaction_code' => null,
            'member_number' => null,
            'member_name' => null,
        ];

        // Pattern: MPS 254720499810 TGG77BLCU1 BONIFACE MWAURA WAMBUG
        // Or: MPS 254713304335 TGH2BNRI4E 000889# JANE W GITUKUI
        // Or: MPS 254114257554 (phone only, no transaction code)
        // Or: MPS THA8P819T4 EVIMERIA (transaction code first, no phone)
        
        // First, extract phone number (starts with 254, exactly 12 digits total)
        // This is the highest priority - if we find 254XXXXXXXXX, it's definitely a phone
        // Extract ALL phone numbers in the string
        if (preg_match_all('/\b(254\d{9})\b/', $particulars, $phoneMatches)) {
            foreach ($phoneMatches[1] as $phone) {
                $result['phone_numbers'][] = $phone;
            }
        }

        // Extract transaction code - must start with letter (usually T), followed by alphanumeric
        // Should NOT be a phone number (254XXXXXXXXX)
        // Should be 8-15 characters, starting with a letter
        // CRITICAL: If we found phone numbers, be extra careful not to extract them as transaction codes
        $phonePositions = [];
        if (preg_match_all('/\b(254\d{9})\b/', $particulars, $phoneMatches, PREG_OFFSET_CAPTURE)) {
            foreach ($phoneMatches[1] as $match) {
                $phonePositions[] = ['start' => $match[1], 'end' => $match[1] + strlen($match[0])];
            }
        }

        // Only look for transaction codes if we haven't found a phone number, OR if pattern is clearly MPS [CODE] (not phone)
        // Pattern: MPS THA8P819T4 (transaction code, not phone)
        // Pattern: MPS 254114257554 (phone, not transaction code)
        if (preg_match('/MPS\s+([A-Z][A-Z0-9]{7,14})\b/i', $particulars, $codeMatch)) {
            // This is a transaction code after MPS (not a phone)
            $potentialCode = $codeMatch[1];
            if (!preg_match('/^254\d{9}$/', $potentialCode)) {
                $result['transaction_code'] = strtoupper($potentialCode);
            }
        } elseif (empty($result['phone_numbers'])) {
            // No phone found, look for any transaction code pattern
            if (preg_match_all('/\b([A-Z][A-Z0-9]{7,14})\b/i', $particulars, $codeMatches, PREG_OFFSET_CAPTURE)) {
                foreach ($codeMatches[1] as $match) {
                    $potentialCode = $match[0];
                    $codeStart = $match[1];
                    
                    // Skip if it overlaps with a phone number position
                    $isPhone = false;
                    foreach ($phonePositions as $phonePos) {
                        if ($codeStart >= $phonePos['start'] && $codeStart < $phonePos['end']) {
                            $isPhone = true;
                            break;
                        }
                    }
                    
                    // Exclude if it's a phone number or just digits
                    if (!$isPhone && !preg_match('/^254\d{9}$/', $potentialCode) && !preg_match('/^\d+$/', $potentialCode)) {
                        $result['transaction_code'] = strtoupper($potentialCode);
                        break; // Take the first valid transaction code
                    }
                }
            }
        }

        // Extract member number (pattern: digits followed by #, or standalone 4-6 digit numbers that aren't phones)
        // Must be after MPS and phone/transaction code
        if (preg_match('/MPS\s+(?:254\d{9}\s+)?(?:[A-Z][A-Z0-9]+\s+)?(\d{4,6})#?/i', $particulars, $matches)) {
            $potentialMemberNumber = $matches[1];
            // Ensure it's not a phone number
            if (!str_starts_with($potentialMemberNumber, '254')) {
                $result['member_number'] = $potentialMemberNumber;
            }
        }

        // Extract name - more sophisticated approach
        // Remove MPS, phone, transaction code, member number
        $nameText = $particulars;
        $nameText = preg_replace('/^MPS\s+/i', '', $nameText);
        $nameText = preg_replace('/\b254\d{9}\b/', '', $nameText);
        if ($result['transaction_code']) {
            $nameText = preg_replace('/\b' . preg_quote($result['transaction_code'], '/') . '\b/i', '', $nameText);
        }
        if ($result['member_number']) {
            $nameText = preg_replace('/\b' . preg_quote($result['member_number'], '/') . '#?\b/', '', $nameText);
        }
        
        // Clean up and extract name
        $nameText = trim(preg_replace('/\s+/', ' ', $nameText));
        if (!empty($nameText) && preg_match('/^[A-Z\s]+$/', $nameText)) {
            $result['member_name'] = $nameText;
        }

        return $result;
    }

    protected function parseEquityApp(string $particulars): array
    {
        $result = [
            'phone_numbers' => [],
            'transaction_code' => null,
            'member_number' => null,
            'member_name' => null,
        ];

        // Pattern: APP/PENINA WANJIKU MUCHICHU/
        if (preg_match('/APP\/(.+?)(?:\/|$)/i', $particulars, $matches)) {
            $namePart = trim($matches[1]);
            $result['member_name'] = $namePart;
        }

        return $result;
    }

    protected function parseBankTransfer(string $particulars): array
    {
        $result = [
            'phone_numbers' => [],
            'transaction_code' => null,
            'member_number' => null,
            'member_name' => null,
        ];

        // Pattern: TPG 229qx00hn9 IMB Pesalink transfer UPESI/5725072
        // Extract transaction code (alphanumeric after TPG)
        if (preg_match('/TPG\s+([A-Z0-9]+)/i', $particulars, $matches)) {
            $result['transaction_code'] = $matches[1];
        }

        // Try to extract name from end
        if (preg_match('/TRANSFER\s+(.+?)(?:\s*\/|\s*$)/i', $particulars, $matches)) {
            $namePart = trim($matches[1]);
            if (!preg_match('/^\d+$/', $namePart)) {
                $result['member_name'] = $namePart;
            }
        }

        return $result;
    }

    protected function parseBankAgent(string $particulars): array
    {
        $result = [
            'phone_numbers' => [],
            'transaction_code' => null,
            'member_number' => null,
            'member_name' => null,
        ];

        // Pattern: LOCHOKA ENTERPRTBY:/436013102263/25-12-2024 18:20
        // Extract transaction number (starts with 43, ends with 63, 12 digits)
        if (preg_match('/\/(\d{12})\//', $particulars, $matches)) {
            $result['transaction_code'] = $matches[1];
        }

        return $result;
    }

    protected function parseMpesaPaybill(string $particulars): array
    {
        $result = [
            'phone_numbers' => [],
            'phone_last_3_digits' => null, // Last 3 digits from masked phone (25472****176 -> 176)
            'transaction_code' => null,
            'member_number' => null,
            'member_name' => null,
            'payer_name' => null, // Name of person who paid (before "Acc")
        ];

        // Paybill Details format from statement:
        // "Pay Bill from 25472****176 - JOYCE NJAGI Acc. Joyce Njagi"
        // Or: "Pay Bill Online from 25471****904 - Nelson **** Sammy Acc. INV-19"
        // Structure: "Pay Bill [Online] from [partial_phone] - [PAYER_NAME] Acc. [ACCOUNT_NAME]"
        // 
        // Where:
        // - partial_phone: 25472****176 (masked, can't use for matching)
        // - PAYER_NAME: JOYCE NJAGI (person who made payment, before "Acc")
        // - ACCOUNT_NAME: Joyce Njagi (member name entered during payment, after "Acc.") - THIS IS WHAT WE USE FOR MATCHING
        
        // Extract partial phone number (25472****XXX or 079****XXX format) - extract last 3 digits for matching
        // Pattern: 25472****176 -> extract "176" (last 3 digits)
        // Pattern: 079****290 -> extract "290" (last 3 digits)
        // Pattern: 25471****904 -> extract "904" (last 3 digits)
        // Match both formats: 2547X****XXX or 07X****XXX (where X is digit, and * can be 3-5 asterisks)
        // Updated pattern to be more flexible with asterisk count
        if (preg_match('/\b(?:2547\d|07\d)\*{3,5}(\d{3})\b/', $particulars, $matches)) {
            // Store last 3 digits for matching
            $result['phone_numbers'][] = $matches[1]; // Last 3 digits
            $result['phone_last_3_digits'] = $matches[1]; // Store explicitly for Paybill matching
        }

        // Extract account name after "Acc." or "Acc " - THIS IS THE MEMBER NAME (highest priority for matching)
        // Pattern: "Acc." or "Acc " followed by the member's account name
        // Examples: "Acc. Joyce Njagi", "Acc. JOHN MWANGI", "Acc INV-19"
        if (preg_match('/\bAcc\.?\s+(.+?)(?:\s*$|$)/i', $particulars, $matches)) {
            $accountName = trim($matches[1]);
            // Clean up - remove any trailing special characters but keep the name as-is
            $accountName = trim($accountName);
            if (!empty($accountName) && strlen($accountName) > 1) {
                $result['member_name'] = $accountName;
            }
        }

        // Extract payer name (before "Acc") - this is who made the payment
        // Pattern: "Pay Bill [Online] from [phone] - [PAYER_NAME] Acc"
        // Extract the name between the dash and "Acc"
        if (preg_match('/-\s+([A-Z\s\*]+?)\s+Acc\.?/i', $particulars, $matches)) {
            $payerName = trim($matches[1]);
            // Remove asterisks used for masking
            $payerName = preg_replace('/\*+/', '', $payerName);
            $payerName = trim($payerName);
            if (!empty($payerName) && strlen($payerName) > 2) {
                $result['payer_name'] = $payerName;
            }
        }

        // If no "Acc" pattern found, try to extract name from end (fallback)
        // This handles cases where format might be slightly different
        if (empty($result['member_name'])) {
            // Remove "Pay Bill" prefix and phone patterns
            $nameText = $particulars;
            $nameText = preg_replace('/^Pay\s+Bill\s+(?:Online\s+)?from\s+/i', '', $nameText);
            $nameText = preg_replace('/2547\d\*{4}\d{3}/', '', $nameText);
            $nameText = preg_replace('/-\s*/', '', $nameText);
            $nameText = trim($nameText);
            
            // Extract potential name (words with letters)
            if (preg_match('/\b([A-Za-z]{2,}(?:\s+[A-Za-z]{2,}){0,3})\b/', $nameText, $matches)) {
                $result['member_name'] = trim($matches[1]);
            }
        }

        return $result;
    }

    protected function parseEazzyFunds(string $particulars): array
    {
        $result = [
            'phone_numbers' => [],
            'transaction_code' => null,
            'member_number' => null,
            'member_name' => null,
        ];

        // Pattern: EAZZY-FUNDS TRNSF FRM TABITHA WANGU MUNGAI
        if (preg_match('/EAZZY-FUNDS\s+TRNSF\s+FRM\s+(.+?)(?:\s*$)/i', $particulars, $matches)) {
            $result['member_name'] = trim($matches[1]);
        }

        return $result;
    }

    protected function parseGeneric(string $particulars): array
    {
        $result = [
            'phone_numbers' => [],
            'transaction_code' => null,
            'member_number' => null,
            'member_name' => null,
        ];

        // Try to extract phone numbers
        if (preg_match_all('/\b(254\d{9})\b/', $particulars, $matches)) {
            $result['phone_numbers'] = $matches[1];
        }

        // Try to extract transaction codes (alphanumeric, 8-15 chars)
        if (preg_match('/\b([A-Z0-9]{8,15})\b/', $particulars, $matches)) {
            $result['transaction_code'] = $matches[1];
        }

        return $result;
    }

    /**
     * Normalize phone number for comparison
     */
    public function normalizePhone(string $phone): string
    {
        // Remove all non-numeric characters
        $phone = preg_replace('/[^0-9]/', '', $phone);
        
        // Handle different formats
        if (str_starts_with($phone, '0')) {
            $phone = '254' . substr($phone, 1);
        } elseif (str_starts_with($phone, '+')) {
            $phone = substr($phone, 1);
        }
        
        return $phone;
    }

    /**
     * Normalize name for comparison (handle initials like "W" as part of name)
     */
    public function normalizeName(string $name): string
    {
        // Remove extra spaces, convert to lowercase
        $name = strtolower(trim(preg_replace('/\s+/', ' ', $name)));
        
        // Remove common prefixes/suffixes
        $name = preg_replace('/^(mr|mrs|miss|ms|dr|prof)\s+/i', '', $name);
        
        return $name;
    }

    /**
     * Compare two names, handling initials and case-insensitive matching
     */
    public function compareNames(string $name1, string $name2): float
    {
        $name1 = $this->normalizeName($name1);
        $name2 = $this->normalizeName($name2);

        // Exact match (case-insensitive after normalization)
        if ($name1 === $name2) {
            return 1.0;
        }

        // Split into words
        $words1 = explode(' ', $name1);
        $words2 = explode(' ', $name2);

        // Remove single character words (initials) for comparison but keep them for context
        $words1Filtered = array_filter($words1, fn($w) => strlen($w) > 1);
        $words2Filtered = array_filter($words2, fn($w) => strlen($w) > 1);

        if (empty($words1Filtered) || empty($words2Filtered)) {
            return 0.0;
        }

        // Count matching words (case-insensitive)
        $matches = 0;
        $matchedWords2 = [];
        foreach ($words1Filtered as $word1) {
            foreach ($words2Filtered as $idx => $word2) {
                if (in_array($idx, $matchedWords2)) {
                    continue; // Already matched
                }
                
                // Exact match
                if ($word1 === $word2) {
                    $matches++;
                    $matchedWords2[] = $idx;
                    break;
                }
                
                // Partial match (one word contains the other for longer words)
                if (strlen($word1) > 3 && str_contains($word2, $word1)) {
                    $matches++;
                    $matchedWords2[] = $idx;
                    break;
                }
                
                if (strlen($word2) > 3 && str_contains($word1, $word2)) {
                    $matches++;
                    $matchedWords2[] = $idx;
                    break;
                }
                
                // Similarity match (for typos or variations)
                if (strlen($word1) >= 4 && strlen($word2) >= 4) {
                    $similarity = similar_text($word1, $word2, $percent);
                    if ($percent >= 80) {
                        $matches++;
                        $matchedWords2[] = $idx;
                        break;
                    }
                }
            }
        }

        // Calculate similarity score
        $maxWords = max(count($words1Filtered), count($words2Filtered));
        if ($maxWords == 0) {
            return 0.0;
        }
        
        $score = $matches / $maxWords;
        
        // Boost score if all words match (even if order is different)
        if ($matches == count($words1Filtered) && $matches == count($words2Filtered)) {
            $score = min(1.0, $score * 1.1); // Slight boost for perfect word match
        }
        
        return $score;
    }
}

