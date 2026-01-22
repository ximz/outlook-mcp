const { getMailboxTimezone, clearTimezoneCache } = require('../../utils/mailbox-settings');
const { callGraphAPI } = require('../../utils/graph-api');
const { DEFAULT_TIMEZONE } = require('../../config');

jest.mock('../../utils/graph-api');

describe('mailbox-settings', () => {
  beforeEach(() => {
    callGraphAPI.mockClear();
    clearTimezoneCache();
  });

  describe('getMailboxTimezone', () => {
    test('should fetch and return mailbox timezone from API', async () => {
      const mockTimezone = 'Pacific Standard Time';
      callGraphAPI.mockResolvedValue({ timeZone: mockTimezone });

      const result = await getMailboxTimezone('test_token');

      expect(callGraphAPI).toHaveBeenCalledWith('test_token', 'GET', 'me/mailboxSettings');
      expect(result).toBe(mockTimezone);
    });

    test('should cache timezone and not make repeated API calls', async () => {
      const mockTimezone = 'Eastern Standard Time';
      callGraphAPI.mockResolvedValue({ timeZone: mockTimezone });

      // First call
      const result1 = await getMailboxTimezone('test_token');
      // Second call should use cache
      const result2 = await getMailboxTimezone('test_token');
      // Third call should still use cache
      const result3 = await getMailboxTimezone('test_token');

      expect(callGraphAPI).toHaveBeenCalledTimes(1);
      expect(result1).toBe(mockTimezone);
      expect(result2).toBe(mockTimezone);
      expect(result3).toBe(mockTimezone);
    });

    test('should return DEFAULT_TIMEZONE when API returns no timezone', async () => {
      callGraphAPI.mockResolvedValue({});

      const result = await getMailboxTimezone('test_token');

      expect(result).toBe(DEFAULT_TIMEZONE);
    });

    test('should return DEFAULT_TIMEZONE when API call fails', async () => {
      callGraphAPI.mockRejectedValue(new Error('API Error'));

      const result = await getMailboxTimezone('test_token');

      expect(result).toBe(DEFAULT_TIMEZONE);
    });

    test('should make new API call after cache is cleared', async () => {
      const mockTimezone1 = 'Pacific Standard Time';
      const mockTimezone2 = 'Mountain Standard Time';

      callGraphAPI
        .mockResolvedValueOnce({ timeZone: mockTimezone1 })
        .mockResolvedValueOnce({ timeZone: mockTimezone2 });

      // First call
      const result1 = await getMailboxTimezone('test_token');
      expect(result1).toBe(mockTimezone1);

      // Clear cache
      clearTimezoneCache();

      // Second call should make new API call
      const result2 = await getMailboxTimezone('test_token');
      expect(result2).toBe(mockTimezone2);

      expect(callGraphAPI).toHaveBeenCalledTimes(2);
    });
  });

  describe('clearTimezoneCache', () => {
    test('should clear cached timezone', async () => {
      const mockTimezone = 'Central Standard Time';
      callGraphAPI.mockResolvedValue({ timeZone: mockTimezone });

      // First call - caches result
      await getMailboxTimezone('test_token');
      expect(callGraphAPI).toHaveBeenCalledTimes(1);

      // Clear cache
      clearTimezoneCache();

      // Next call should make a new API request
      await getMailboxTimezone('test_token');
      expect(callGraphAPI).toHaveBeenCalledTimes(2);
    });
  });
});
