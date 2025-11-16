const stringSimilarity = require('string-similarity');

/**
 * Extract phone numbers from text
 */
function extractPhones(text) {
  if (!text) return [];
  
  const patterns = [
    /254\d{9}/g,
    /0\d{9}/g,
    /\+254\d{9}/g,
  ];
  
  const phones = [];
  patterns.forEach(pattern => {
    const matches = text.match(pattern);
    if (matches) {
      phones.push(...matches);
    }
  });
  
  return [...new Set(phones.map(normalizePhone))].filter(Boolean);
}

/**
 * Normalize phone number to 254XXXXXXXXX format
 */
function normalizePhone(phone) {
  if (!phone) return null;
  
  // Remove non-digits
  phone = phone.replace(/\D/g, '');
  
  // Convert to 254 format
  if (phone.length === 10 && phone[0] === '0') {
    phone = '254' + phone.substring(1);
  } else if (phone.length === 9) {
    phone = '254' + phone;
  } else if (phone.length === 12 && phone.substring(0, 3) === '254') {
    // Already correct
  } else {
    return null;
  }
  
  return phone;
}

/**
 * Normalize name for comparison
 */
function normalizeName(name) {
  if (!name) return '';
  return name.trim().toLowerCase().replace(/\s+/g, ' ');
}

/**
 * Match a single transaction to members
 */
function matchTransaction(transaction, members) {
  const matches = [];
  
  // Extract phones from transaction
  const txPhones = extractPhones(transaction.particulars || '');
  const txPhone = txPhones[0];
  
  // Extract member name from particulars (for Paybill)
  const memberNameMatch = transaction.particulars?.match(/Acc\.\s*([A-Z][a-zA-Z\s]+)/i);
  const txMemberName = memberNameMatch ? memberNameMatch[1].trim() : null;
  
  members.forEach(member => {
    let score = 0;
    let reason = '';
    
    // Strategy 1: Phone match
    if (txPhone && member.phone) {
      const memberPhone = normalizePhone(member.phone);
      if (txPhone === memberPhone || txPhone.substring(3) === memberPhone.substring(3)) {
        score = 0.98;
        reason = 'Phone number match';
      }
    }
    
    // Strategy 2: Name match
    if (txMemberName && member.name) {
      const similarity = stringSimilarity.compareTwoStrings(
        normalizeName(txMemberName),
        normalizeName(member.name)
      );
      
      if (similarity >= 0.6) {
        if (similarity > score) {
          score = similarity;
          reason = `Name match (${(similarity * 100).toFixed(0)}% similarity)`;
        }
      }
    }
    
    // Strategy 3: Member number match
    if (transaction.transaction_code && 
        (member.member_code === transaction.transaction_code || 
         member.member_number === transaction.transaction_code)) {
      if (0.98 > score) {
        score = 0.98;
        reason = 'Member number match';
      }
    }
    
    if (score > 0) {
      matches.push({
        member_id: member.id,
        member_name: member.name,
        confidence: score,
        reason: reason
      });
    }
  });
  
  // Sort by confidence descending
  matches.sort((a, b) => b.confidence - a.confidence);
  
  return matches;
}

/**
 * Batch match multiple transactions
 */
function matchBatch(transactions, members) {
  return transactions.map(transaction => {
    const matches = matchTransaction(transaction, members);
    return {
      transaction_id: transaction.id,
      matches: matches.slice(0, 5) // Top 5 matches
    };
  });
}

module.exports = {
  matchTransaction,
  matchBatch,
  extractPhones,
  normalizePhone,
  normalizeName
};

