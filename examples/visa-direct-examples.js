/**
 * Visa Direct API Usage Examples
 *
 * This script demonstrates how to use the Visa Direct service
 * for different transaction types.
 *
 * Prerequisites:
 * 1. Configure .env with Visa API credentials
 * 2. Place certificates in certs/ directory
 * 3. Ensure environment variables are set
 */

const visaDirect = require('../services/visaDirect');

// Example 1: Push Payment (P2P - Same Person)
async function examplePushPaymentSamePerson() {
  console.log('\n=== Example 1: Push Payment (P2P - Same Person) ===\n');

  try {
    const result = await visaDirect.pushPayment({
      amount: 100.00,
      recipientPAN: '4957030420210454',  // Test card number
      currency: 'USD',
      businessApplicationId: 'AA',        // Account to Account (same person)
      sourceOfFundsCode: '02',            // Debit card
      senderAccountNumber: '4005520000011126',
      sender: {
        name: 'John Doe',
        address: '123 Main St',
        city: 'New York',
        stateCode: 'NY',
        countryCode: 'USA',
        postalCode: '10001'
      },
      recipient: {
        name: 'John Doe'
      }
    });

    console.log('Success:', JSON.stringify(result, null, 2));
    return result;
  } catch (error) {
    console.error('Error:', error.message);
    throw error;
  }
}

// Example 2: Push Payment (P2P - Different Persons)
async function examplePushPaymentDifferentPersons() {
  console.log('\n=== Example 2: Push Payment (P2P - Different Persons) ===\n');

  try {
    const result = await visaDirect.pushPayment({
      amount: 50.00,
      recipientPAN: '4957030420210454',
      currency: 'USD',
      businessApplicationId: 'PP',        // Person to Person (different)
      sourceOfFundsCode: '02',
      senderAccountNumber: '4005520000011126',
      sender: {
        firstName: 'John',
        lastName: 'Doe',
        address: '123 Main St',
        city: 'New York',
        stateCode: 'NY',
        countryCode: 'USA',
        postalCode: '10001'
      },
      recipient: {
        firstName: 'Jane',
        lastName: 'Smith',
        city: 'Los Angeles',
        state: 'CA',
        countryCode: 'USA',
        postalCode: '90001'
      }
    });

    console.log('Success:', JSON.stringify(result, null, 2));
    return result;
  } catch (error) {
    console.error('Error:', error.message);
    throw error;
  }
}

// Example 3: Push Payment with Cash (using senderReference)
async function examplePushPaymentCash() {
  console.log('\n=== Example 3: Push Payment (Cash Funding) ===\n');

  try {
    const result = await visaDirect.pushPayment({
      amount: 75.00,
      recipientPAN: '4957030420210454',
      currency: 'USD',
      businessApplicationId: 'PP',
      sourceOfFundsCode: '04',            // Cash
      senderReference: 'CASH' + Date.now().toString().slice(-10), // Unique ref
      sender: {
        name: 'John Doe',
        address: '123 Main St',
        city: 'New York',
        stateCode: 'NY',
        countryCode: 'USA'
      },
      recipient: {
        name: 'Jane Smith'
      }
    });

    console.log('Success:', JSON.stringify(result, null, 2));
    return result;
  } catch (error) {
    console.error('Error:', error.message);
    throw error;
  }
}

// Example 4: Pull Funds (Account Funding Transaction)
async function examplePullFunds() {
  console.log('\n=== Example 4: Pull Funds (AFT) ===\n');

  try {
    const result = await visaDirect.pullFunds({
      amount: 25.00,
      senderPAN: '4005520000011126',
      currency: 'USD',
      businessApplicationId: 'AA',
      sender: {
        name: 'Jane Smith',
        city: 'Los Angeles',
        stateCode: 'CA',
        countryCode: 'USA'
      },
      merchantCategoryCode: 6012
    });

    console.log('Success:', JSON.stringify(result, null, 2));

    // Return data needed for potential reversal
    return {
      amount: result.data.amount,
      senderPAN: '4005520000011126',
      systemsTraceAuditNumber: result.data.systemsTraceAuditNumber,
      retrievalReferenceNumber: result.data.retrievalReferenceNumber,
      transmissionDateTime: result.transmissionDateTime,
      approvalCode: result.approvalCode,
      transactionIdentifier: result.transactionIdentifier
    };
  } catch (error) {
    console.error('Error:', error.message);
    throw error;
  }
}

// Example 5: Reverse Transaction
async function exampleReverseTransaction(originalTransaction) {
  console.log('\n=== Example 5: Reverse Transaction (AFTR) ===\n');

  try {
    const result = await visaDirect.reverseTransaction({
      originalTransaction,
      businessApplicationId: 'AA',
      currency: 'USD',
      merchantCategoryCode: 6012
    });

    console.log('Success:', JSON.stringify(result, null, 2));
    return result;
  } catch (error) {
    console.error('Error:', error.message);
    throw error;
  }
}

// Example 6: Check Transaction Status (for async transactions)
async function exampleCheckStatus(statusIdentifier, transactionType = 'push') {
  console.log('\n=== Example 6: Check Transaction Status ===\n');

  try {
    const result = await visaDirect.getTransactionStatus(
      statusIdentifier,
      transactionType
    );

    console.log('Success:', JSON.stringify(result, null, 2));
    return result;
  } catch (error) {
    console.error('Error:', error.message);
    throw error;
  }
}

// Example 7: Cross-border Payment
async function exampleCrossBorderPayment() {
  console.log('\n=== Example 7: Cross-border Payment ===\n');

  try {
    const result = await visaDirect.pushPayment({
      amount: 200.00,
      recipientPAN: '4957030420210454',
      currency: 'USD',
      businessApplicationId: 'PP',
      sourceOfFundsCode: '02',
      senderAccountNumber: '4005520000011126',
      sender: {
        firstName: 'John',
        lastName: 'Doe',
        address: '123 Main St',
        city: 'New York',
        stateCode: 'NY',
        countryCode: 'USA',
        postalCode: '10001'
      },
      recipient: {
        firstName: 'Jane',
        lastName: 'Smith',
        city: 'Toronto',
        state: 'ON',
        countryCode: 'CAN',        // Canada
        postalCode: 'M5H2N2'
      }
    });

    console.log('Success:', JSON.stringify(result, null, 2));
    return result;
  } catch (error) {
    console.error('Error:', error.message);
    throw error;
  }
}

// Example 8: Funds Disbursement
async function exampleFundsDisbursement() {
  console.log('\n=== Example 8: Funds Disbursement ===\n');

  try {
    const result = await visaDirect.pushPayment({
      amount: 150.00,
      recipientPAN: '4957030420210454',
      currency: 'USD',
      businessApplicationId: 'FD',        // Funds Disbursement
      sourceOfFundsCode: '05',            // Deposit account
      senderReference: 'DISBURSEMENT_' + Date.now(),
      sender: {
        name: 'Government Agency',
        address: '456 Government Plaza',
        city: 'Washington',
        stateCode: 'DC',
        countryCode: 'USA'
      },
      recipient: {
        name: 'John Doe',
        city: 'New York',
        stateCode: 'NY',
        countryCode: 'USA'
      },
      messageReasonCode: 5120  // Tax refund
    });

    console.log('Success:', JSON.stringify(result, null, 2));
    return result;
  } catch (error) {
    console.error('Error:', error.message);
    throw error;
  }
}

// Main execution function
async function runExamples() {
  console.log('╔════════════════════════════════════════════════════════╗');
  console.log('║   Visa Direct API - Usage Examples                    ║');
  console.log('╚════════════════════════════════════════════════════════╝');

  try {
    // Check if credentials are configured
    if (!process.env.VISA_USER_ID || !process.env.VISA_PASSWORD) {
      console.error('\n❌ Error: Visa API credentials not configured!');
      console.log('\nPlease configure the following in your .env file:');
      console.log('- VISA_USER_ID');
      console.log('- VISA_PASSWORD');
      console.log('\nSee CREDENTIALS_CHECKLIST.md for details.\n');
      process.exit(1);
    }

    console.log('\n✅ Credentials configured. Running examples...\n');

    // Uncomment the examples you want to run:

    // await examplePushPaymentSamePerson();
    // await examplePushPaymentDifferentPersons();
    // await examplePushPaymentCash();

    // const originalTx = await examplePullFunds();
    // if (originalTx) {
    //   // Wait a bit before reversing
    //   await new Promise(resolve => setTimeout(resolve, 2000));
    //   await exampleReverseTransaction(originalTx);
    // }

    // await exampleCrossBorderPayment();
    // await exampleFundsDisbursement();

    // For async status checking (if you get a 202 response):
    // await exampleCheckStatus(234234322342343, 'push');

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
  examplePushPaymentSamePerson,
  examplePushPaymentDifferentPersons,
  examplePushPaymentCash,
  examplePullFunds,
  exampleReverseTransaction,
  exampleCheckStatus,
  exampleCrossBorderPayment,
  exampleFundsDisbursement
};
