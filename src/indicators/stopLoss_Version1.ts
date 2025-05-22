import Binance from 'binance-api-node';
import logger from '../utils/logger';

export async function calculateStopLoss(
  client: any,
  symbol: string,
  currentPrice: number,
  lookback = 10
): Promise<number> {
  const timeframe = '5m';
  try {
    if (!client || !client.candles) {
      throw new Error('Invalid or uninitialized client');
    }
    if (!symbol) {
      throw new Error('Symbol is not provided');
    }
    const candles = await client.candles({ symbol, interval: timeframe, limit: lookback });
    const lows = candles.map((c: any) => parseFloat(c.low));
    const supportLevel = Math.min(...lows);
    const stopLossPercentage = ((currentPrice - supportLevel) / currentPrice) * 100;
    const stopLoss = Math.max(parseFloat(stopLossPercentage.toFixed(2)), 0.3); // Tight for scalping
    logger.info(`Calculated stop-loss for ${symbol} (${timeframe}): ${stopLoss}%`);
    return stopLoss;
  } catch (error) {
    logger.error(`Failed to calculate stop-loss for ${symbol || 'undefined'}: ${error}`);
    throw error;
  }
}

export async function calculateTakeProfit(symbol: string, currentPrice: number): Promise<number> {
  const targetProfit = 0.5; // 62.5% return on 125x leverage
  logger.info(`Calculated take-profit for ${symbol}: ${targetProfit}%`);
  return targetProfit;
}