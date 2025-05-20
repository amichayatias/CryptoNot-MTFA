import { analyzeVolume } from './volumeAnalysis';

const mockClient = {
  candles: jest.fn().mockResolvedValue([
    { volume: '1000' },
    { volume: '1200' },
    { volume: '1100' },
  ]),
};

describe('Volume Analysis', () => {
  it('should detect a significant volume spike', async () => {
    const result = await analyzeVolume(mockClient, 'BTCUSDT', 3000, "");
    expect(result.spike).toBeGreaterThan(2);
    expect(result.isSignificant).toBe(true);
  });

  it('should not detect a spike for normal volume', async () => {
    const result = await analyzeVolume(mockClient, 'BTCUSDT', 1100, "");
    expect(result.spike).toBeLessThanOrEqual(1.1);
    expect(result.isSignificant).toBe(false);
  });
});