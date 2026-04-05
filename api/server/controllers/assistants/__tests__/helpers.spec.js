const { defaultAssistantsVersion } = require('librechat-data-provider');

jest.mock('@librechat/data-schemas', () => ({
  logger: { debug: jest.fn(), warn: jest.fn() },
  SystemCapabilities: { MANAGE_ASSISTANTS: 'manage_assistants' },
}));

jest.mock('~/server/services/Endpoints/azureAssistants', () => ({
  initializeClient: jest.fn(),
}));

jest.mock('~/server/services/Endpoints/assistants', () => ({
  initializeClient: jest.fn(),
}));

jest.mock('~/server/middleware/roles/capabilities', () => ({
  hasCapability: jest.fn(),
}));

jest.mock('~/server/services/Config', () => ({
  getEndpointsConfig: jest.fn(),
}));

const { getCurrentVersion } = require('../helpers');
const { getEndpointsConfig } = require('~/server/services/Config');

describe('getCurrentVersion', () => {
  it('should extract version from baseUrl containing /v1', async () => {
    const req = { baseUrl: '/api/assistants/v1', body: {} };
    const result = await getCurrentVersion(req);
    expect(result).toBe('v1');
  });

  it('should extract version from baseUrl containing /v2', async () => {
    const req = { baseUrl: '/api/assistants/v2', body: {} };
    const result = await getCurrentVersion(req);
    expect(result).toBe('v2');
  });

  it('should fall back to req.body.version when baseUrl has no version', async () => {
    const req = { baseUrl: '/api/assistants', body: { version: '2' } };
    const result = await getCurrentVersion(req);
    expect(result).toBe('v2');
  });

  it('should look up version from endpoint config when not in URL or body', async () => {
    getEndpointsConfig.mockResolvedValue({
      assistants: { version: '2' },
    });
    const req = { baseUrl: '/api/assistants', body: {} };
    const result = await getCurrentVersion(req, 'assistants');
    expect(result).toBe('v2');
  });

  it('should use defaultAssistantsVersion when endpoint config has no version', async () => {
    getEndpointsConfig.mockResolvedValue({});
    const req = { baseUrl: '/api/assistants', body: {} };
    const result = await getCurrentVersion(req, 'assistants');
    const expected = `v${defaultAssistantsVersion['assistants']}`;
    expect(result).toBe(expected);
  });

  it('should throw Error for null version when no endpoint is provided', async () => {
    const req = { baseUrl: '/api/assistants', body: {} };
    await expect(getCurrentVersion(req)).rejects.toThrow('Invalid version');
  });

  it('should throw Error (not TypeError) for null version with optional chaining', async () => {
    const req = { baseUrl: '/api/something', body: {} };
    await expect(getCurrentVersion(req)).rejects.toThrow(Error);
    await expect(getCurrentVersion(req)).rejects.not.toThrow(TypeError);
  });

  it('should handle version extracted from deeply nested baseUrl', async () => {
    const req = { baseUrl: '/api/nested/path/v2/more', body: {} };
    const result = await getCurrentVersion(req);
    expect(result).toBe('v2');
  });

  it('should prefer URL version over body version', async () => {
    const req = { baseUrl: '/api/assistants/v1', body: { version: '2' } };
    const result = await getCurrentVersion(req);
    expect(result).toBe('v1');
  });

  it('should handle body version "1" correctly', async () => {
    const req = { baseUrl: '/api/assistants', body: { version: '1' } };
    const result = await getCurrentVersion(req);
    expect(result).toBe('v1');
  });
});
