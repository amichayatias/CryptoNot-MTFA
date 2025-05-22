
import { calculateStopLoss, calculateTakeProfit } from '../indicators/stopLoss';
import { fetchNewsSentiment } from '../news/newsFeed';
import { generateSignal, setClientAndSymbol } from './signalGenerator';

jest.mock('../indicators/stopLoss', () => ({
  calculateStopLoss: jest.fn().mockResolvedValue(0.3),
  calculateTakeProfit: jest.fn().mockResolvedValue(0.5),
}));

jest.mock('../news/newsFeed', () => ({
  fetchNewsSentiment: jest.fn().mockResolvedValue({ sentiment: 'Positive', titles: ['BTC Bullish News'] }),
}));

describe('Signal Generator', () => {
  beforeAll(() => {
    setClientAndSymbol({}, 'BTCUSDT');
  });

  it('should generate a LONG signal for bullish conditions', async () => {
    (fetchNewsSentiment as jest.Mock).mockResolvedValueOnce({ sentiment: 'Positive', titles: ['BTC Bullish News'] });
    const input = {
      volume: {
        '1m': { spike: 2.5, isSignificant: true },
        '5m': { spike: 2.0, isSignificant: true },
        '1h': { spike: 2.0, isSignificant: true },
      },
      orderBook: { buyerPressure: true },
      rsi: { '1m': 18, '5m': 22, '1h': 55 },
      macd: {
        '1m': { macd: 100, signal: 90, histogram: 10 },
        '1h': { macd: 100, signal: 90, histogram: 10 },
      },
      currentPrice: 50000,
    };

    const signal = await generateSignal(input);
    expect(signal).not.toBeNull();
    expect(signal?.type).toBe('LONG');
    expect(signal?.confidence).toBe('High');
    expect(signal?.takeProfit).toBe(0.5);
    expect(signal?.stopLoss).toBe(0.3);
  });

  it('should generate a SHORT signal for bearish conditions', async () => {
    (fetchNewsSentiment as jest.Mock).mockResolvedValueOnce({ sentiment: 'Negative', titles: ['BTC Bearish News'] });
    const input = {
      volume: {
        '1m': { spike: 2.5, isSignificant: true },
        '5m': { spike: 2.0, isSignificant: true },
        '1h': { spike: 2.0, isSignificant: true },
      },
      orderBook: { buyerPressure: false },
      rsi: { '1m': 82, '5m': 78, '1h': 45 },
      macd: {
        '1m': { macd: 90, signal: 100, histogram: -10 },
        '1h': { macd: 90, signal: 100, histogram: -10 },
      },
      currentPrice: 50000,
    };

    const signal = await generateSignal(input);
    expect(signal).not.toBeNull();
    expect(signal?.type).toBe('SHORT');
    expect(signal?.confidence).toBe('High');
    expect(signal?.takeProfit).toBe(0.5);
    expect(signal?.stopLoss).toBe(0.3);
  });

  it('should return null for unaligned conditions', async () => {
    (fetchNewsSentiment as jest.Mock).mockResolvedValueOnce({ sentiment: 'Neutral', titles: ['BTC News'] });
    const input = {
      volume: {
        '1m': { spike: 1.1, isSignificant: false },
        '5m': { spike: 1.1, isSignificant: false },
        '1h': { spike: 1.1, isSignificant: false },
      },
      orderBook: { buyerPressure: false },
      rsi: { '1m': 50, '5m': 50, '1h': 50 },
      macd: {
        '1m': { macd: 100, signal: 100, histogram: 0 },
        '1h': { macd: 100, signal: 100, histogram: 0 },
      },
      currentPrice: 50000,
    };

    const signal = await generateSignal(input);
    expect(signal).toBeNull();
  });
});