import Binance from 'binance-api-node';
import logger from '../utils/logger';

export async function analyzeVolume(client: any, symbol: string, currentVolume: number | null, timeframe: string) {
  try {
    const candles = await client.candles({ symbol, interval: timeframe, limit: 10 });
    const volumes = candles.map((c: any) => parseFloat(c.volume));
    const avgVolume = volumes.slice(0, -1).reduce((a: number, b: number) => a + b, 0) / (volumes.length - 1);
    const spike = currentVolume !== null ? currentVolume / avgVolume : volumes[volumes.length - 1] / avgVolume;
    const threshold = timeframe === '1h' ? 2 : 2; // Strong spikes for scalping
    const isSignificant = spike > threshold;
    logger.info(`Volume analysis for ${symbol} (${timeframe}): spike=${spike.toFixed(2)}, significant=${isSignificant}`);
    return { spike: parseFloat(spike.toFixed(2)), isSignificant };
  } catch (error) {
    logger.error(`Failed to analyze volume for ${symbol} (${timeframe}): ${error}`);
    throw error;
  }
}