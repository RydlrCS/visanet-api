const xpay = require('../../utils/xpay');

describe('XPay Token Generator', () => {
  beforeAll(() => {
    // set a known shared secret (base64 of 'secret')
    process.env.VISA_SHARED_SECRET = Buffer.from('secret').toString('base64');
    // re-init module - require cache
    jest.resetModules();
  });

  test('generateXPayToken returns xPayToken and timestamp', () => {
    const generator = require('../../utils/xpay');
    const res = generator.generateXPayToken('/path', 'query=1', { a: 1 });
    expect(res).toHaveProperty('xPayToken');
    expect(res).toHaveProperty('timestamp');
    expect(typeof res.xPayToken).toBe('string');
    expect(Number(res.timestamp)).toBeGreaterThan(0);
  });

  test('generateHeaders returns header object including x-pay-token', () => {
    const generator = require('../../utils/xpay');
    const headers = generator.generateHeaders('/path', '', '');
    expect(headers).toHaveProperty('x-pay-token');
    expect(headers).toHaveProperty('x-v-datetime');
    expect(headers['Content-Type']).toBe('application/json');
  });
});
