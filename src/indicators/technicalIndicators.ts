import { RSI, MACD } from 'technicalindicators';
import logger from '../utils/logger';

export async function calculateRSI(client: any, symbol: string, timeframe: string): Promise<number> {
  const period = timeframe === '1h' ? 14 : 8; // Faster for 1m/5m
  try {
    const candles = await client.candles({ symbol, interval: timeframe, limit: period + 1 });
    const closes = candles.map((c: any) => parseFloat(c.close));
    const rsiResult = RSI.calculate({ values: closes, period });
    const rsi = rsiResult[rsiResult.length - 1];
    if (rsi === undefined) {
      throw new Error('RSI calculation returned undefined');
    }
    logger.info(`Calculated RSI for ${symbol} (${timeframe}): ${rsi}`);
    return rsi;
  } catch (error) {
    logger.error(`Failed to calculate RSI for ${symbol} (${timeframe}): ${error}`);
    throw error;
  }
}

export async function calculateMACD(
  client: any,
  symbol: string,
  timeframe: string
): Promise<{ macd: number; signal: number; histogram: number }> {
  const params = {
    '1m': { fastPeriod: 6, slowPeriod: 13, signalPeriod: 4 }, // Optimized for scalping
    '5m': { fastPeriod: 6, slowPeriod: 13, signalPeriod: 4 },
    '1h': { fastPeriod: 12, slowPeriod: 26, signalPeriod: 9 },
  }[timeframe] || { fastPeriod: 12, slowPeriod: 26, signalPeriod: 9 };

  try {
    const candles = await client.candles({ symbol, interval: timeframe, limit: params.slowPeriod + params.signalPeriod + 1 });
    const closes = candles.map((c: any) => parseFloat(c.close));
    const macdResult = MACD.calculate({
      values: closes,
      ...params,
      SimpleMAOscillator: true,
      SimpleMASignal: true,
    });
    const latest = macdResult[macdResult.length - 1];
    if (!latest || latest.MACD === undefined || latest.signal === undefined || latest.histogram === undefined) {
      throw new Error('MACD calculation returned undefined values');
    }
    logger.info(`Calculated MACD for ${symbol} (${timeframe}): ${JSON.stringify(latest)}`);
    return {
      macd: latest.MACD,
      signal: latest.signal,
      histogram: latest.histogram,
    };
  } catch (error) {
    logger.error(`Failed to calculate MACD for ${symbol} (${timeframe}): ${error}`);
    throw error;
  }
}