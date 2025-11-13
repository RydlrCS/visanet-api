/**
 * VisaNet Connect API Usage Examples
 *
 * This script demonstrates how to use the VisaNet Connect service
 * for payment authorization and void operations.
 *
 * Prerequisites:
 * 1. Configure .env with Visa API credentials
 * 2. Place certificates in certs/ directory
 * 3. Ensure environment variables are set
 */

const visaNet = require('../services/visaNet');

// Example 1: Basic Authorization (E-commerce)
async function exampleBasicAuthorizationEcommerce() {
  console.log('\n=== Example 1: Basic Authorization (E-commerce) ===\n');

  try {
    const result = await visaNet.authorize({
      cardNumber: '4957030420210454',    // Test card number
      expiryDate: '2512',                 // YYMM format
      cvv: '123',
      amount: 50.00,
      currency: '840',                    // USD
      merchantCategoryCode: '5814',       // Fast food restaurant
      isEcommerce: true,
      transactionDescription: 'Online food order',
      cardHolder: {
        name: 'John Doe'
      }
    });

    console.log('Authorization Result:');
    console.log(`- Success: ${result.success}`);
    console.log(`- Authorization ID: ${result.authorizationId}`);
    console.log(`- Approval Code: ${result.approvalCode}`);
    console.log(`- Result: ${result.result}`);
    console.log(`- Result Code: ${result.resultCode}`);

    return result;
  } catch (error) {
    console.error('Error:', error.message);
    throw error;
  }
}

// Example 2: Authorization (Point of Sale - Chip Card)
async function exampleAuthorizationPOS() {
  console.log('\n=== Example 2: Authorization (Point of Sale - Chip Card) ===\n');

  try {
    const result = await visaNet.authorize({
      cardNumber: '4957030420210454',
      expiryDate: '2512',
      cvv: '123',
      amount: 125.50,
      currency: '840',
      merchantCategoryCode: '5411',       // Grocery store
      isEcommerce: false,                 // POS transaction
      transactionDescription: 'Grocery purchase',
      cardHolder: {
        name: 'Jane Smith'
      }
    });

    console.log('Authorization Result:');
    console.log(`- Success: ${result.success}`);
    console.log(`- Authorization ID: ${result.authorizationId}`);
    console.log(`- Approval Code: ${result.approvalCode}`);
    console.log(`- Correlation ID: ${result.correlationId}`);

    return result;
  } catch (error) {
    console.error('Error:', error.message);
    throw error;
  }
}

// Example 3: Void Authorization (with ID)
async function exampleVoidWithId(authorizationId, amount) {
  console.log('\n=== Example 3: Void Authorization (with ID) ===\n');

  try {
    const result = await visaNet.voidAuthorization({
      authorizationId,
      amount,
      reason: '2501',                     // Merchant/customer cancellation
      merchantCategoryCode: '5814',
      additionalData: 'Customer requested cancellation'
    });

    console.log('Void Result:');
    console.log(`- Success: ${result.success}`);
    console.log(`- Void ID: ${result.voidId}`);
    console.log(`- Result: ${result.result}`);
    console.log(`- Result Code: ${result.resultCode}`);

    return result;
  } catch (error) {
    console.error('Error:', error.message);
    throw error;
  }
}

// Example 4: Void Authorization (without ID)
async function exampleVoidWithoutId() {
  console.log('\n=== Example 4: Void Authorization (without ID) ===\n');

  try {
    const result = await visaNet.voidAuthorizationWithoutId({
      amount: 50.00,
      reason: '2502',                     // Duplicate transaction
      merchantCategoryCode: '5814',
      additionalData: 'Duplicate transaction detected'
    });

    console.log('Void Result:');
    console.log(`- Success: ${result.success}`);
    console.log(`- Void ID: ${result.voidId}`);
    console.log(`- Correlation ID: ${result.correlationId}`);

    return result;
  } catch (error) {
    console.error('Error:', error.message);
    throw error;
  }
}

// Example 5: Authorization with Custom Acceptor
async function exampleCustomAcceptor() {
  console.log('\n=== Example 5: Authorization with Custom Acceptor ===\n');

  try {
    const result = await visaNet.authorize({
      cardNumber: '4957030420210454',
      expiryDate: '2512',
      cvv: '123',
      amount: 200.00,
      currency: '840',
      merchantCategoryCode: '7372',       // Computer programming
      isEcommerce: true,
      transactionDescription: 'Software subscription',
      cardHolder: {
        name: 'Alice Johnson'
      },
      acceptor: {
        PaymentFacltId: '52014057',
        Accptr: '520142254322',
        CstmrSvc: '1 8005551234',         // Custom customer service number
        Adr: {
          PstlCd: '10001',                // New York
          CtrySubDvsnMjr: '36',           // NY state code
          Ctry: 'US',
          CtrySubDvsnMnr: '061'           // New York county
        }
      },
      terminal: {
        TermnlId: {
          Id: '20012344'                  // Custom terminal ID
        }
      }
    });

    console.log('Authorization Result:');
    console.log(`- Success: ${result.success}`);
    console.log(`- Authorization ID: ${result.authorizationId}`);
    console.log(`- Approval Code: ${result.approvalCode}`);

    return result;
  } catch (error) {
    console.error('Error:', error.message);
    throw error;
  }
}

// Example 6: Declined Transaction (Insufficient Funds)
async function exampleDeclinedTransaction() {
  console.log('\n=== Example 6: Declined Transaction Test ===\n');

  try {
    // Using test amount that will be declined
    const result = await visaNet.authorize({
      cardNumber: '4400000000000008',     // Test card that declines with insufficient funds
      expiryDate: '2512',
      cvv: '123',
      amount: 101.00,                     // Amount that triggers insufficient funds
      currency: '840',
      merchantCategoryCode: '5999',
      isEcommerce: true,
      transactionDescription: 'Test declined transaction'
    });

    console.log('Authorization Result:');
    console.log(`- Success: ${result.success}`);
    console.log(`- Result: ${result.result}`);
    console.log(`- Result Code: ${result.resultCode}`);

    return result;
  } catch (error) {
    console.error('Expected decline - Error:', error.message);
    return { success: false, error: error.message };
  }
}

// Example 7: Complete Authorization and Void Flow
async function exampleCompleteFlow() {
  console.log('\n=== Example 7: Complete Authorization and Void Flow ===\n');

  try {
    // Step 1: Create authorization
    console.log('Step 1: Creating authorization...');
    const authResult = await visaNet.authorize({
      cardNumber: '4957030420210454',
      expiryDate: '2512',
      cvv: '123',
      amount: 75.00,
      currency: '840',
      merchantCategoryCode: '5812',       // Restaurant
      isEcommerce: true,
      transactionDescription: 'Restaurant order',
      cardHolder: {
        name: 'Bob Williams'
      }
    });

    console.log('Authorization created successfully');
    console.log(`- Authorization ID: ${authResult.authorizationId}`);
    console.log(`- Approval Code: ${authResult.approvalCode}`);

    // Wait a bit before voiding
    console.log('\nStep 2: Waiting 2 seconds before voiding...');
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Step 3: Void the authorization
    console.log('Step 3: Voiding authorization...');
    const voidResult = await visaNet.voidAuthorization({
      authorizationId: authResult.authorizationId,
      amount: 75.00,
      reason: '2501',
      merchantCategoryCode: '5812',
      additionalData: 'Customer cancelled order'
    });

    console.log('Void completed successfully');
    console.log(`- Void ID: ${voidResult.voidId}`);
    console.log(`- Result: ${voidResult.result}`);

    return { authResult, voidResult };
  } catch (error) {
    console.error('Error in complete flow:', error.message);
    throw error;
  }
}

// Example 8: High-Value Transaction
async function exampleHighValueTransaction() {
  console.log('\n=== Example 8: High-Value Transaction ===\n');

  try {
    const result = await visaNet.authorize({
      cardNumber: '4957030420210454',
      expiryDate: '2512',
      cvv: '123',
      amount: 5000.00,                    // High value
      currency: '840',
      merchantCategoryCode: '7995',       // Casino/gambling
      isEcommerce: true,
      transactionDescription: 'High-value purchase',
      cardHolder: {
        name: 'Charlie Brown'
      },
      additionalData: 'High-value transaction - additional verification performed'
    });

    console.log('High-Value Authorization Result:');
    console.log(`- Success: ${result.success}`);
    console.log(`- Authorization ID: ${result.authorizationId}`);
    console.log(`- Approval Code: ${result.approvalCode}`);
    console.log(`- Amount: $${result.transactionAmounts?.TxAmt?.Amt || '5000.00'}`);

    return result;
  } catch (error) {
    console.error('Error:', error.message);
    throw error;
  }
}

// Main execution function
async function runExamples() {
  console.log('╔════════════════════════════════════════════════════════╗');
  console.log('║   VisaNet Connect API - Usage Examples                ║');
  console.log('╚════════════════════════════════════════════════════════╝');

  try {
    // Check if credentials are configured
    if (!process.env.VISA_USER_ID || !process.env.VISA_PASSWORD) {
      console.error('\n❌ Error: Visa API credentials not configured!');
      console.log('\nPlease configure the following in your .env file:');
      console.log('- VISA_USER_ID');
      console.log('- VISA_PASSWORD');
      console.log('- VISA_CLIENT_ID');
      console.log('\nSee CREDENTIALS_CHECKLIST.md for details.\n');
      process.exit(1);
    }

    console.log('\n✅ Credentials configured. Running examples...\n');

    // Uncomment the examples you want to run:

    // Basic authorization
    // await exampleBasicAuthorizationEcommerce();

    // POS authorization
    // await exampleAuthorizationPOS();

    // Complete flow (authorization + void)
    // await exampleCompleteFlow();

    // Custom acceptor
    // await exampleCustomAcceptor();

    // Declined transaction test
    // await exampleDeclinedTransaction();

    // High-value transaction
    // await exampleHighValueTransaction();

    // Void examples (requires authorization ID)
    // await exampleVoidWithId('382056700290001', 50.00);
    // await exampleVoidWithoutId();

    console.log('\n✅ All examples completed successfully!\n');

  } catch (error) {
    console.error('\n❌ Example failed:', error.message);
    if (error.details) {
      console.error('Details:', JSON.stringify(error.details, null, 2));
    }
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  runExamples();
}

// Export for use in other scripts
module.exports = {
  exampleBasicAuthorizationEcommerce,
  exampleAuthorizationPOS,
  exampleVoidWithId,
  exampleVoidWithoutId,
  exampleCustomAcceptor,
  exampleDeclinedTransaction,
  exampleCompleteFlow,
  exampleHighValueTransaction
};
