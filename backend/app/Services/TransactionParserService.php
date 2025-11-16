<?php

namespace App\Services;

class TransactionParserService
{
    public function parseParticulars(string $particulars): array
    {
        $result = [
            'transaction_type' => null,
            'phones' => [],
            'member_name' => null,
            'member_number' => null,
            'transaction_code' => null,
            'last_3_phone_digits' => null,
        ];

        // Detect transaction type and parse accordingly
        $particularsUpper = strtoupper($particulars);
        
        // M-Pesa Paybill: "Pay Bill from 25472****176 - JOYCE NJAGI Acc. Joyce Njagi"
        if (strpos($particularsUpper, 'PAY BILL') !== false || strpos($particularsUpper, 'PAYBILL') !== false) {
            $result['transaction_type'] = 'M-Pesa Paybill';
            $this->parsePaybillParticulars($particulars, $result);
        }
        // MPS format: "MPS 254721404848 SIA93MAWD9 0716227320 DICKSON NJO"
        elseif (preg_match('/^MPS\s+/i', $particulars)) {
            $result['transaction_type'] = 'MPS';
            $this->parseMpsParticulars($particulars, $result);
        }
        // EAZZYPAY format: "EAZZYPAY/254763545091/07STK/16227320/100972950094/"
        elseif (preg_match('/^EAZZYPAY\//i', $particulars)) {
            $result['transaction_type'] = 'EAZZYPAY';
            $this->parseEazzypayParticulars($particulars, $result);
        }
        // USSD format: "USSD/254726836024/629199529486/254716227320/ EVIMER"
        elseif (preg_match('/^USSD\//i', $particulars)) {
            $result['transaction_type'] = 'USSD';
            $this->parseUssdParticulars($particulars, $result);
        }
        // EAZZY-FUNDS format: "EAZZY-FUNDS TRNSF FRM BEDAN NJOGU NJUGUNA"
        elseif (preg_match('/EAZZY[- ]?FUNDS/i', $particulars)) {
            $result['transaction_type'] = 'EAZZY-FUNDS';
            $this->parseEazzyFundsParticulars($particulars, $result);
        }
        // Generic bank transaction
        else {
            $result['transaction_type'] = 'Bank Transaction';
            $this->parseGenericBankParticulars($particulars, $result);
        }

        // Extract last 3 digits from first phone
        if (!empty($result['phones'])) {
            $firstPhone = $result['phones'][0];
            if (strlen($firstPhone) >= 3) {
                $result['last_3_phone_digits'] = substr($firstPhone, -3);
            }
        }

        return $result;
    }

    protected function parsePaybillParticulars(string $particulars, array &$result): void
    {
        // Format: "Pay Bill from 25472****176 - JOYCE NJAGI Acc. Joyce Njagi"
        // Extract phone (last 3 digits from masked number)
        if (preg_match('/254\d{2}\*+\d{3}/', $particulars, $matches)) {
            $maskedPhone = $matches[0];
            $last3 = substr($maskedPhone, -3);
            $result['last_3_phone_digits'] = $last3;
        }
        
        // Extract member name - appears twice: before and after "Acc."
        // Try multiple patterns to get the most complete name
        $name = null;
        
        // Pattern 1: "--- NAME Acc. Name" or "- NAME Acc. Name"
        if (preg_match('/-\s*([A-Z][A-Z\s]{3,})\s+Acc\.\s*([A-Z][A-Z\s]+)/i', $particulars, $matches)) {
            // Use the name after "Acc." as it's usually more complete and properly formatted
            $name = trim($matches[2]);
        }
        // Pattern 2: "Acc. Name" (if pattern 1 didn't match)
        elseif (preg_match('/Acc\.\s*([A-Z][A-Z\s]+)/i', $particulars, $matches)) {
            $name = trim($matches[1]);
        }
        // Pattern 3: "--- NAME" or "- NAME" (before Acc.)
        elseif (preg_match('/-\s*([A-Z][A-Z\s]{3,})(?:\s+Acc\.|$)/i', $particulars, $matches)) {
            $name = trim($matches[1]);
        }
        
        if ($name) {
            // Clean up the name - remove extra spaces, ensure proper case
            $name = preg_replace('/\s+/', ' ', trim($name));
            // Convert to title case for consistency
            $name = ucwords(strtolower($name));
            $result['member_name'] = $name;
        }
    }

    protected function parseMpsParticulars(string $particulars, array &$result): void
    {
        // Format: "MPS 254721404848 SIA93MAWD9 0716227320 DICKSON NJO"
        // Extract phone number
        if (preg_match('/MPS\s+(\d{12})/i', $particulars, $matches)) {
            $phone = $this->normalizePhone($matches[1]);
            if ($phone) {
                $result['phones'][] = $phone;
            }
        }
        
        // Extract transaction code (alphanumeric code after phone)
        if (preg_match('/\d{12}\s+([A-Z0-9]{8,12})/i', $particulars, $matches)) {
            $result['transaction_code'] = $matches[1];
        }
        
        // Extract member name (at the end)
        if (preg_match('/\d{10}\s+([A-Z][A-Z\s]+)$/i', $particulars, $matches)) {
            $result['member_name'] = trim($matches[1]);
        }
    }

    protected function parseEazzypayParticulars(string $particulars, array &$result): void
    {
        // Format: "EAZZYPAY/254763545091/07STK/16227320/100972950094/"
        // Extract phone number
        if (preg_match('/EAZZYPAY\/(\d{12})/i', $particulars, $matches)) {
            $phone = $this->normalizePhone($matches[1]);
            if ($phone) {
                $result['phones'][] = $phone;
            }
        }
        
        // Extract transaction reference (starts with 100, ends with 094 or other 3 digits)
        if (preg_match('/100(\d+)(\d{3})/', $particulars, $matches)) {
            $result['transaction_code'] = '100' . $matches[1] . $matches[2];
        }
    }

    protected function parseUssdParticulars(string $particulars, array &$result): void
    {
        // Format: "USSD/254726836024/629199529486/254716227320/ EVIMER"
        // Extract customer phone (first number after USSD/)
        if (preg_match('/USSD\/(\d{12})/i', $particulars, $matches)) {
            $phone = $this->normalizePhone($matches[1]);
            if ($phone) {
                $result['phones'][] = $phone;
            }
        }
        
        // Extract transaction code (starts with 629, ends with 486 or other 3 digits)
        if (preg_match('/629(\d+)(\d{3})/', $particulars, $matches)) {
            $result['transaction_code'] = '629' . $matches[1] . $matches[2];
        }
        
        // Extract member name (at the end after last slash)
        if (preg_match('/\d{12}\/\s*([A-Z][A-Z\s]+)$/i', $particulars, $matches)) {
            $result['member_name'] = trim($matches[1]);
        }
    }

    protected function parseEazzyFundsParticulars(string $particulars, array &$result): void
    {
        // Format: "EAZZY-FUNDS TRNSF FRM BEDAN NJOGU NJUGUNA"
        // Extract member name (after "TRNSF FRM" or "FROM")
        if (preg_match('/(?:TRNSF\s+FRM|FROM)\s+([A-Z][A-Z\s]+)$/i', $particulars, $matches)) {
            $result['member_name'] = trim($matches[1]);
        } elseif (preg_match('/EAZZY[- ]?FUNDS\s+[A-Z\s]+\s+([A-Z][A-Z\s]+)$/i', $particulars, $matches)) {
            $result['member_name'] = trim($matches[1]);
        }
    }

    protected function parseGenericBankParticulars(string $particulars, array &$result): void
    {
        // Extract phones
        $phones = $this->extractPhones($particulars);
        $result['phones'] = $phones;
        
        // Try multiple patterns to extract member name
        $namePatterns = [
            // Pattern 1: Capitalized words at the end (at least 2 words, 3+ chars each)
            '/\s+([A-Z][A-Z\s]{5,})$/',
            // Pattern 2: Name after common prefixes
            '/\s+(?:FROM|FRM|TO|BY)\s+([A-Z][A-Z\s]{3,})/i',
            // Pattern 3: Name in the middle (between numbers/phones and end)
            '/\d+\s+([A-Z][A-Z\s]{3,})(?:\s+\d|$)/',
            // Pattern 4: RTGS format: "RTGS NAME" or "--- RTGS NAME"
            '/RTGS\s+([A-Z][A-Z\s]{3,})/i',
            // Pattern 5: APP format: "APP/NAME" or "--- APP/NAME"
            '/APP\/?([A-Z][A-Z\s]{3,})/i',
        ];
        
        foreach ($namePatterns as $pattern) {
            if (preg_match($pattern, $particulars, $matches)) {
                $name = trim($matches[1]);
                // Exclude common transaction words and validate
                if (!preg_match('/^(MPS|EAZZY|USSD|TRNSF|FRM|FROM|TO|ACCOUNT|PAYMENT|RTGS|APP|ONLINE|BILL)$/i', $name) 
                    && strlen($name) >= 3
                    && preg_match('/[A-Z]/', $name)) {
                    $result['member_name'] = $name;
                    break;
                }
            }
        }
        
        // Extract transaction code
        $transactionCode = $this->extractTransactionCode($particulars, $phones);
        if ($transactionCode) {
            $result['transaction_code'] = $transactionCode;
        }
    }

    public function extractPhones(string $text): array
    {
        $phones = [];
        
        // Pattern for Kenyan phone numbers (254XXXXXXXXX or 0XXXXXXXXX)
        $patterns = [
            '/254\d{9}/',
            '/0\d{9}/',
            '/\+254\d{9}/',
        ];

        foreach ($patterns as $pattern) {
            preg_match_all($pattern, $text, $matches);
            if (!empty($matches[0])) {
                foreach ($matches[0] as $phone) {
                    $normalized = $this->normalizePhone($phone);
                    if ($normalized && !in_array($normalized, $phones)) {
                        $phones[] = $normalized;
                    }
                }
            }
        }
        
        // Also extract masked phone numbers (2547*** or 07****)
        // Pattern: 2547 followed by asterisks and then digits, or 07 followed by asterisks and digits
        $maskedPatterns = [
            '/2547\*+\d{3}/',  // 2547***176 format
            '/07\*+\d+/',      // 07**** format
        ];
        
        foreach ($maskedPatterns as $pattern) {
            preg_match_all($pattern, $text, $matches);
            if (!empty($matches[0])) {
                foreach ($matches[0] as $maskedPhone) {
                    // Extract visible digits (prefix + suffix)
                    // For 2547***176: extract 2547 and 176
                    // For 07****123: extract 07 and 123
                    if (preg_match('/^(2547|07)(\*+)(\d+)$/', $maskedPhone, $parts)) {
                        $prefix = $parts[1];
                        $suffix = $parts[3];
                        
                        // Store as masked format for matching
                        // Format: "2547***176" or "07***123"
                        $phones[] = $maskedPhone; // Store original for reference
                        
                        // Also store normalized prefix + suffix for matching
                        // This allows us to match against full member phones
                        if ($prefix === '2547' && strlen($suffix) >= 3) {
                            // For 2547***176, we can match last 3 digits
                            $phones[] = 'masked_2547_' . $suffix;
                        } elseif ($prefix === '07' && strlen($suffix) >= 3) {
                            // For 07****123, convert to 254 format and match last 3
                            $phones[] = 'masked_07_' . $suffix;
                        }
                    }
                }
            }
        }

        return $phones;
    }

    public function normalizePhone(string $phone): ?string
    {
        // Remove non-digits
        $phone = preg_replace('/\D/', '', $phone);
        
        // Convert to 254 format
        if (strlen($phone) === 10 && $phone[0] === '0') {
            $phone = '254' . substr($phone, 1);
        } elseif (strlen($phone) === 9) {
            $phone = '254' . $phone;
        } elseif (strlen($phone) === 12 && substr($phone, 0, 3) === '254') {
            // Already in correct format
        } else {
            return null;
        }

        return $phone;
    }

    public function normalizeName(string $name): string
    {
        $name = trim($name);
        $name = preg_replace('/\s+/', ' ', $name);
        return strtolower($name);
    }

    public function compareNames(string $name1, string $name2): float
    {
        $name1 = $this->normalizeName($name1);
        $name2 = $this->normalizeName($name2);

        if ($name1 === $name2) {
            return 1.0;
        }

        // Simple similarity using similar_text
        similar_text($name1, $name2, $percent);
        return $percent / 100;
    }

    public function extractMemberName(string $particulars): ?string
    {
        // Pattern: "Acc. Name" or "from ... - NAME Acc. Name"
        $patterns = [
            '/Acc\.\s*([A-Z][a-zA-Z\s]+)/i',
            '/from\s+\d+\*+\d+\s*-\s*([A-Z][a-zA-Z\s]+)\s+Acc\./i',
            '/-\s*([A-Z][a-zA-Z\s]+)\s+Acc\./i',
        ];

        foreach ($patterns as $pattern) {
            if (preg_match($pattern, $particulars, $matches)) {
                $name = trim($matches[1]);
                if (strlen($name) > 2) {
                    return $name;
                }
            }
        }

        return null;
    }

    public function extractMemberNumber(string $text): ?string
    {
        // Look for patterns like "M001", "MEM123", "Member: 123"
        $patterns = [
            '/M\d{3,}/i',
            '/MEM\d+/i',
            '/Member[:\s]+(\d+)/i',
            '/Member\s+Code[:\s]+([A-Z0-9]+)/i',
        ];

        foreach ($patterns as $pattern) {
            if (preg_match($pattern, $text, $matches)) {
                return trim($matches[1] ?? $matches[0]);
            }
        }

        return null;
    }

    public function extractTransactionCode(string $particulars, array $phones): ?string
    {
        // Remove phone numbers from text
        $text = $particulars;
        foreach ($phones as $phone) {
            $text = str_replace($phone, '', $text);
        }

        // Look for alphanumeric codes (typically 8-12 characters)
        // Exclude common words
        $patterns = [
            '/\b([A-Z0-9]{8,12})\b/',
            '/Receipt\s+No[:\s]+([A-Z0-9]+)/i',
            '/Ref[:\s]+([A-Z0-9]+)/i',
        ];

        foreach ($patterns as $pattern) {
            if (preg_match($pattern, $text, $matches)) {
                $code = trim($matches[1]);
                // Exclude if it looks like a phone number
                if (!preg_match('/^254\d{9}$/', $code) && !preg_match('/^0\d{9}$/', $code)) {
                    // Require code to contain at least one digit to avoid generic words (e.g., ENTERPRT)
                    if (preg_match('/\d/', $code)) {
                        return $code;
                    }
                }
            }
        }

        return null;
    }
}

