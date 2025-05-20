import Binance from 'binance-api-node';
import logger from '../utils/logger';

export async function analyzeOrderBook(client: any, symbol: string) {
  try {
    const orderBook = await client.book({ symbol, limit: 20 });
    const bids = orderBook.bids.reduce((sum: number, bid: any) => sum + parseFloat(bid.quantity), 0);
    const asks = orderBook.asks.reduce((sum: number, ask: any) => sum + parseFloat(ask.quantity), 0);
    const buyerPressure = bids / asks;
    logger.info(`Order book analysis for ${symbol}: buyerPressure=${buyerPressure.toFixed(2)}`);
    return { buyerPressure: buyerPressure > 3, bids, asks };
  } catch (error) {
    logger.error(`Failed to analyze order book for ${symbol}: ${error}`);
    throw error;
  }
}