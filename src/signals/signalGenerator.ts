import { calculateStopLoss, calculateTakeProfit } from '../indicators/stopLoss';
import { fetchNewsSentiment } from '../news/newsFeed';
import logger from '../utils/logger';

let client: any;
let symbol: string;

export function setClientAndSymbol(_client: any, _symbol: string) {
  client = _client;
  symbol = _symbol;
  logger.info(`Client and symbol set: ${symbol}`);
}




export async function generateSignal(data: {
  volume: { [key: string]: { spike: number; isSignificant: boolean } };
  orderBook: { buyerPressure: boolean };
  rsi: { [key: string]: number };
  macd: { [key: string]: { macd: number; signal: number; histogram: number } };
  currentPrice: number;
}) {
  try {
    if (!client || !symbol) {
      throw new Error('Client or symbol not initialized');
    }

    const { volume, orderBook, rsi, macd, currentPrice } = data;
    const news = await fetchNewsSentiment();

    const use5mConfirmation = true;
    const threshold = 6;

    let longScore = 0;
    let shortScore = 0;

    // Fetch recent candles for price trend
    const candles = await client.candles({ symbol, interval: '5m', limit: 5 });
    const closes = candles.map((c: any) => parseFloat(c.close));
    const sma5 = closes.reduce((a: number, b: number) => a + b, 0) / 5;
    const priceTrend = currentPrice > sma5 ? 'Up' : 'Down';

    // === LONG CONDITIONS ===
    if (macd['1h'].histogram > 0) longScore += 2;
    if (rsi['1h'] > 50) longScore += 1;
    if (!use5mConfirmation || (rsi['5m'] < 25 && volume['5m'].isSignificant)) longScore += 1;
    if (rsi['1m'] < 20) longScore += 2;
    if (volume['1m'].isSignificant) longScore += 1;
    if (orderBook.buyerPressure) longScore += 1;
    if (macd['1m'].histogram > 0) longScore += 1;
    if (news.sentiment === 'Positive') longScore += 1;
    if (priceTrend === 'Up') longScore += 1; // Favor long if price is rising

    // === SHORT CONDITIONS ===
    if (macd['1h'].histogram < 0) shortScore += 2;
    if (rsi['1h'] < 50) shortScore += 1;
    if (!use5mConfirmation || (rsi['5m'] > 75 && volume['5m'].isSignificant)) shortScore += 1;
    if (rsi['1m'] > 80) shortScore += 2;
    if (volume['1m'].isSignificant) shortScore += 1;
    if (!orderBook.buyerPressure) shortScore += 1;
    if (macd['1m'].histogram < 0) shortScore += 1;
    if (news.sentiment === 'Negative') shortScore += 1;
    if (priceTrend === 'Down') shortScore += 1; // Favor short if price is falling



    logger.info({
      context: "Signal scoring",
      symbol,
      longScore,
      shortScore,
      rsi,
      macd,
      volume,
      orderBook,
      news: news.sentiment,
      priceTrend,
    });

    if (longScore >= threshold && longScore > shortScore) {
      let stopLoss = await calculateStopLoss(client, symbol, currentPrice, 'LONG');
      let takeProfit = await calculateTakeProfit(symbol, currentPrice, 'LONG');

      const signal = {
        type: 'LONG',
        currentPrice,
        symbol,
        rsi,
        macd,
        volume,
        orderBook,
        stopLoss,
        takeProfit,
        news: news.sentiment,
        confidence: `${longScore}/10`,
      };
      logger.info(`Generated LONG signal for ${symbol}`);
      return signal;
    }

    if (shortScore >= threshold && shortScore > longScore && priceTrend !== 'Up') {
      let stopLoss = await calculateStopLoss(client, symbol, currentPrice, 'SHORT');
      let takeProfit = await calculateTakeProfit(symbol, currentPrice, 'SHORT');

      const signal = {
        type: 'SHORT',
        symbol,
        currentPrice,
        rsi,
        macd,
        volume,
        orderBook,
        stopLoss,
        takeProfit,
        news: news.sentiment,
        confidence: `${shortScore}/10`,
      };
      logger.info(`Generated SHORT signal for ${symbol}`);
      return signal;
    }


    const signal = {
      type: 'NEUTRAL',
      symbol,
      currentPrice,
      rsi,
      macd,
      volume,
      orderBook,
      stopLoss: { stopLossPercent: 0, stopLossPrice: 0 },
      takeProfit: { takeProfitPercent: 0, takeProfitPrice: 0 },
      news: news.sentiment,
      confidence: `SS: ${shortScore}/10 - LS: ${longScore}/10`,
    };
    logger.info(`Generated SHORT signal for ${symbol}`);
    return signal;

  } catch (error) {
    logger.error(`Failed to generate signal for ${symbol || 'undefined'}: ${error}`);
    throw error;
  }
}
