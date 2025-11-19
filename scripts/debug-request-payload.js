#!/usr/bin/env node

/**
 * Debug Request Payload
 * Shows exactly what we're sending to Visa API
 */

require('dotenv').config();
const visaNet = require('../services/visaNet');

// Monkey-patch the makeRequest to intercept the payload
const originalMakeRequest = visaNet.makeRequest;
visaNet.makeRequest = async function(method, endpoint, payload) {
  console.log('\n════════════════════════════════════════════════════════════════');
  console.log('REQUEST PAYLOAD TO VISA API');
  console.log('════════════════════════════════════════════════════════════════\n');
  console.log(JSON.stringify(payload, null, 2));
  console.log('\n════════════════════════════════════════════════════════════════\n');
  
  // Call original
  return originalMakeRequest.call(this, method, endpoint, payload);
};

async function debugRequest() {
  console.log('Testing with card: 4957030420210454');
  console.log('Amount: $10.00 USD\n');
  
  try {
    const result = await visaNet.authorize({
      cardNumber: '4957030420210454',
      expiryDate: '2512',
      cvv: '123',
      amount: 10.00
    });
    
    console.log('✅ Success:', result);
  } catch (error) {
    console.log('❌ Error:', error.message);
  }
}

debugRequest();
