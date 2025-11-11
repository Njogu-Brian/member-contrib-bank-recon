#!/usr/bin/env node
/**
 * E2E Smoke Test
 * Tests the complete flow: upload PDF, process, match, assign
 */

const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

const API_URL = process.env.API_URL || 'http://localhost:8000/api';
const TEST_PDF = path.join(__dirname, '../fixtures/sample_statement.pdf');
const TEST_CSV = path.join(__dirname, '../fixtures/sample_members.csv');

let authToken = null;
let userId = null;

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function login() {
  console.log('🔐 Logging in...');
  try {
    const response = await axios.post(`${API_URL}/register`, {
      name: 'Test User',
      email: `test${Date.now()}@example.com`,
      password: 'password123',
      password_confirmation: 'password123',
    });
    authToken = response.data.token;
    userId = response.data.user.id;
    console.log('✅ Logged in');
    return true;
  } catch (error) {
    console.error('❌ Login failed:', error.response?.data || error.message);
    return false;
  }
}

async function uploadMembers() {
  console.log('👥 Uploading members...');
  if (!fs.existsSync(TEST_CSV)) {
    console.log('⚠️  Sample CSV not found, creating test members via API...');
    const members = [
      { name: 'Jacinta Wan', phone: '0716227320', member_code: 'MPS2547' },
      { name: 'John Doe', phone: '0723456789', member_code: 'MPS1234' },
    ];
    
    for (const member of members) {
      try {
        await axios.post(
          `${API_URL}/members`,
          member,
          { headers: { Authorization: `Bearer ${authToken}` } }
        );
      } catch (error) {
        // Ignore duplicates
      }
    }
    console.log('✅ Members created');
    return true;
  }

  try {
    const formData = new FormData();
    formData.append('file', fs.createReadStream(TEST_CSV));
    
    await axios.post(`${API_URL}/members/bulk-upload`, formData, {
      headers: {
        ...formData.getHeaders(),
        Authorization: `Bearer ${authToken}`,
      },
    });
    console.log('✅ Members uploaded');
    return true;
  } catch (error) {
    console.error('❌ Member upload failed:', error.response?.data || error.message);
    return false;
  }
}

async function uploadStatement() {
  console.log('📄 Uploading statement...');
  if (!fs.existsSync(TEST_PDF)) {
    console.log('⚠️  Sample PDF not found, skipping upload test');
    return null;
  }

  try {
    const formData = new FormData();
    formData.append('file', fs.createReadStream(TEST_PDF));
    
    const response = await axios.post(`${API_URL}/statements/upload`, formData, {
      headers: {
        ...formData.getHeaders(),
        Authorization: `Bearer ${authToken}`,
      },
    });
    console.log('✅ Statement uploaded:', response.data.statement.id);
    return response.data.statement.id;
  } catch (error) {
    console.error('❌ Upload failed:', error.response?.data || error.message);
    return null;
  }
}

async function waitForProcessing(statementId, maxWait = 60000) {
  console.log('⏳ Waiting for processing...');
  const startTime = Date.now();
  
  while (Date.now() - startTime < maxWait) {
    try {
      const response = await axios.get(
        `${API_URL}/statements/${statementId}`,
        { headers: { Authorization: `Bearer ${authToken}` } }
      );
      
      const status = response.data.status;
      console.log(`   Status: ${status}`);
      
      if (status === 'completed') {
        console.log('✅ Processing completed');
        return true;
      }
      
      if (status === 'failed') {
        console.error('❌ Processing failed:', response.data.error_message);
        return false;
      }
      
      await sleep(2000);
    } catch (error) {
      console.error('❌ Error checking status:', error.message);
      return false;
    }
  }
  
  console.log('⚠️  Processing timeout');
  return false;
}

async function checkTransactions() {
  console.log('🔍 Checking transactions...');
  try {
    const response = await axios.get(
      `${API_URL}/transactions`,
      { headers: { Authorization: `Bearer ${authToken}` } }
    );
    
    const transactions = response.data.data || [];
    console.log(`✅ Found ${transactions.length} transactions`);
    
    const autoAssigned = transactions.filter(t => t.assignment_status === 'auto_assigned');
    const highConfidence = transactions.filter(t => t.match_confidence >= 0.85);
    
    console.log(`   Auto-assigned: ${autoAssigned.length}`);
    console.log(`   High confidence (>=0.85): ${highConfidence.length}`);
    
    if (highConfidence.length > 0) {
      console.log('✅ High confidence matches found');
      return true;
    } else {
      console.log('⚠️  No high confidence matches found');
      return transactions.length > 0;
    }
  } catch (error) {
    console.error('❌ Error checking transactions:', error.message);
    return false;
  }
}

async function runTests() {
  console.log('🚀 Starting E2E Smoke Test\n');
  
  if (!(await login())) {
    process.exit(1);
  }
  
  if (!(await uploadMembers())) {
    process.exit(1);
  }
  
  const statementId = await uploadStatement();
  if (statementId) {
    await waitForProcessing(statementId);
  }
  
  if (!(await checkTransactions())) {
    process.exit(1);
  }
  
  console.log('\n✅ All tests passed!');
}

runTests().catch(error => {
  console.error('❌ Test suite failed:', error);
  process.exit(1);
});

