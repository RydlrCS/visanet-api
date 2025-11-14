const visaNet = require('../../services/visaNet');

describe('VisaNet Service (unit tests)', () => {
  beforeAll(() => {
    process.env.VISANET_USER_ID = 'testuser';
    process.env.VISANET_PASSWORD = 'testpass';
  });

  test('createHeaders returns Authorization header', () => {
    const headers = visaNet.createHeaders();
    expect(headers).toHaveProperty('Authorization');
    expect(headers['Content-Type']).toBe('application/json');
  });

  test('generateCorrelationId produces a string <= 23 chars', () => {
    const id = visaNet.generateCorrelationId();
    expect(typeof id).toBe('string');
    expect(id.length).toBeLessThanOrEqual(23);
  });

  test('getLocalDateTime returns ISO-like string', () => {
    const dt = visaNet.getLocalDateTime();
    expect(dt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/);
  });

  test('handleError formats API error messages', () => {
    const apiError = new Error('API Error: 400 - {"responseStatus":{"status":400,"code":"9125","message":"Expected input credential was not present"}}');
    const formatted = visaNet.handleError(apiError);
    expect(formatted.name).toBe('VisaNetError');
    expect(formatted.details).toBeDefined();
  });

  test('authorize returns success when makeRequest mocked', async () => {
    // Arrange
    visaNet.useMLE = false;
    const mockResponse = {
      statusCode: 200,
      data: {
        msgIdentfctn: { reqstId: 'req1', id: 'auth1' },
        Body: {
          PrcgRslt: { RsltData: { Rslt: 'Approved', RsltDtls: '00' }, ApprvlData: { ApprvlCd: '123456' } },
          Envt: { Card: { PANFourLastDgts: '0006' } },
          Tx: { TxAmts: { TxAmt: { Ccy: '840', Amt: '124.05' } } }
        }
      }
    };

    jest.spyOn(visaNet, 'makeRequest').mockResolvedValue(mockResponse);

    // Act
    const result = await visaNet.authorize({
      cardNumber: '4895142232120006',
      expiryDate: '2512',
      amount: 124.05
    });

    // Assert
    expect(result.success).toBe(true);
    expect(result.approvalCode).toBe('123456');

    visaNet.makeRequest.mockRestore();
  });

  test('voidAuthorization returns success when makeRequest mocked', async () => {
    const mockResponse = {
      statusCode: 200,
      data: {
        msgIdentfctn: { reqstId: 'req2', id: 'void1' },
        Body: {
          PrcgRslt: { RsltData: { Rslt: 'Processed', RsltDtls: '00' } }
        }
      }
    };

    jest.spyOn(visaNet, 'makeRequest').mockResolvedValue(mockResponse);

    const result = await visaNet.voidAuthorization({ authorizationId: 'auth1', amount: 10.0 });
    expect(result.success).toBe(true);
    expect(result.voidId).toBe('void1');

    visaNet.makeRequest.mockRestore();
  });
});
