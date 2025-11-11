const stringSimilarity = require('string-similarity');

/**
 * Normalize phone number to +254 format
 */
function normalizePhone(phone) {
  if (!phone) return null;
  
  let normalized = phone.toString().trim();
  
  // Remove spaces, dashes, parentheses
  normalized = normalized.replace(/[\s\-()]/g, '');
  
  // Convert to +254 format
  if (normalized.startsWith('+254')) {
    return normalized;
  } else if (normalized.startsWith('254')) {
    return '+' + normalized;
  } else if (normalized.startsWith('0')) {
    return '+254' + normalized.substring(1);
  } else if (normalized.length === 9) {
    return '+254' + normalized;
  }
  
  return normalized;
}

/**
 * Extract phone numbers from text
 */
function extractPhones(text) {
  if (!text) return [];
  
  const phoneRegex = /(?:\+?254|0)?(?:7[0-9]|1[0-9])[0-9]{7}/g;
  const matches = text.match(phoneRegex) || [];
  
  return matches.map(normalizePhone).filter(Boolean);
}

/**
 * Match transaction to members using multiple strategies
 */
function matchTransaction(transaction, members) {
  const particulars = (transaction.particulars || '').toLowerCase();
  const transactionCode = transaction.transaction_code || '';
  const phones = transaction.phones || extractPhones(transaction.particulars || '');
  
  let bestMatch = null;
  let bestConfidence = 0;
  let matchTokens = [];
  let matchReason = '';
  
  // Strategy 1: Exact phone match (highest confidence)
  if (phones.length > 0) {
    for (const phone of phones) {
      const normalizedPhone = normalizePhone(phone);
      const member = members.find(m => {
        const memberPhone = normalizePhone(m.phone);
        return memberPhone && memberPhone === normalizedPhone;
      });
      
      if (member) {
        bestMatch = member;
        bestConfidence = 0.98;
        matchTokens = [normalizedPhone];
        matchReason = 'Exact phone match';
        break;
      }
    }
  }
  
  // Strategy 2: Transaction code match
  if (!bestMatch && transactionCode) {
    const member = members.find(m => {
      const memberCode = (m.member_code || '').toLowerCase();
      const code = transactionCode.toLowerCase();
      return memberCode && memberCode.includes(code) || code.includes(memberCode);
    });
    
    if (member) {
      bestMatch = member;
      bestConfidence = 0.90;
      matchTokens = [transactionCode];
      matchReason = 'Transaction code match';
    }
  }
  
  // Strategy 3: Name fuzzy matching
  if (!bestMatch) {
    let bestNameMatch = null;
    let bestNameScore = 0;
    
    for (const member of members) {
      const memberName = (member.name || '').toLowerCase();
      
      // Extract potential names from particulars
      const namePatterns = [
        memberName,
        ...memberName.split(' ').filter(n => n.length > 2),
      ];
      
      for (const pattern of namePatterns) {
        if (pattern.length < 3) continue;
        
        const score = stringSimilarity.compareTwoStrings(particulars, pattern);
        
        if (score > bestNameScore && score > 0.6) {
          bestNameScore = score;
          bestNameMatch = member;
        }
      }
    }
    
    if (bestNameMatch && bestNameScore > 0.6) {
      bestMatch = bestNameMatch;
      bestConfidence = Math.min(0.85, 0.5 + (bestNameScore * 0.35));
      matchTokens = [bestNameMatch.name];
      matchReason = `Name similarity: ${(bestNameScore * 100).toFixed(0)}%`;
    }
  }
  
  // Strategy 4: Partial phone match (if phone contains member phone)
  if (!bestMatch && phones.length > 0) {
    for (const phone of phones) {
      const normalizedPhone = normalizePhone(phone);
      const lastDigits = normalizedPhone.slice(-6); // Last 6 digits
      
      const member = members.find(m => {
        const memberPhone = normalizePhone(m.phone);
        return memberPhone && memberPhone.endsWith(lastDigits);
      });
      
      if (member) {
        bestMatch = member;
        bestConfidence = 0.75;
        matchTokens = [lastDigits];
        matchReason = 'Partial phone match (last 6 digits)';
        break;
      }
    }
  }
  
  return {
    candidate_member_id: bestMatch ? bestMatch.id : null,
    confidence: bestConfidence,
    match_tokens: matchTokens,
    match_reason: matchReason || (bestMatch ? 'Multiple factors' : 'No match found'),
  };
}

/**
 * Match batch of transactions to members
 */
async function matchBatch(transactions, members) {
  // Check if Cursor AI should be used
  if (process.env.CURSOR_API_KEY) {
    return await matchBatchWithCursor(transactions, members);
  }
  
  // Use local fuzzy matching
  return transactions.map(transaction => {
    const match = matchTransaction(transaction, members);
    
    return {
      client_tran_id: transaction.client_tran_id,
      tran_date: transaction.tran_date,
      particulars: transaction.particulars,
      credit: transaction.credit,
      transaction_code: transaction.transaction_code,
      phones: transaction.phones || [],
      ...match,
    };
  });
}

/**
 * Match using Cursor AI (if API key is provided)
 */
async function matchBatchWithCursor(transactions, members) {
  // This is a placeholder for Cursor AI integration
  // In production, you would call the Cursor API here
  
  const prompt = `Match the following transactions to members:

Transactions:
${JSON.stringify(transactions, null, 2)}

Members:
${JSON.stringify(members, null, 2)}

For each transaction, return a JSON object with:
- client_tran_id: the transaction's client_tran_id
- candidate_member_id: the matched member ID or null
- confidence: 0.0-1.0
- match_tokens: array of matched tokens
- match_reason: explanation

Return as JSON array.`;

  // For now, fall back to local matching
  // In production, implement actual Cursor API call
  console.log('Cursor AI key found, but using local matching (implement Cursor API call)');
  
  return transactions.map(transaction => {
    const match = matchTransaction(transaction, members);
    
    return {
      client_tran_id: transaction.client_tran_id,
      tran_date: transaction.tran_date,
      particulars: transaction.particulars,
      credit: transaction.credit,
      transaction_code: transaction.transaction_code,
      phones: transaction.phones || [],
      ...match,
    };
  });
}

module.exports = { matchBatch, matchTransaction };

