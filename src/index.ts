import Binance from 'binance-api-node';
import WebSocket from 'ws';
import Bottleneck from 'bottleneck';
import { config } from './config/config';
import { analyzeVolume } from './volume/volumeAnalysis';
import { analyzeOrderBook } from './orderbook/orderBook';
import { generateSignal, setClientAndSymbol } from './signals/signalGenerator';
import { sendTelegramMessage } from './telegram/telegramBot';
import { calculateRSI, calculateMACD } from './indicators/technicalIndicators';
import logger from './utils/logger';
import { reportTrade } from './trade/trade';

const limiter = new Bottleneck({
  minTime: 50, // 50ms for scalping speed
  maxConcurrent: 1,
});

const client = Binance({
  apiKey: config.binance.apiKey,
  apiSecret: config.binance.apiSecret,
});

logger.info(`Client initialized: ${client ? 'success' : 'failure'}`);

const symbol = 'BTCUSDT';
const primaryTimeframe = '1m';
const confirmationTimeframe = '5m';
const trendTimeframe = '1h';

// Cache for higher timeframe data
let cached1hData: { volume: any; rsi: any; macd: any; } | null = null;
let cached5mData: { volume: any; rsi: any; } | null = null;
let last1hUpdate = 0;
let last5mUpdate = 0;

// Set client and symbol for signalGenerator
setClientAndSymbol(client, symbol);

// Wrap client methods with rate limiter
const wrappedClient = {
  candles: limiter.wrap(client.candles.bind(client)),
  book: limiter.wrap(client.book.bind(client)),
  ping: limiter.wrap(client.ping.bind(client)),
};

async function updateCachedData() {
  try {
    const now = Date.now();
    if (now - last1hUpdate > 5 * 60 * 1000) { // Update 1h every 5 minutes
      cached1hData = {
        rsi: await calculateRSI(wrappedClient, symbol, trendTimeframe),
        macd: await calculateMACD(wrappedClient, symbol, trendTimeframe),
        volume: await analyzeVolume(wrappedClient, symbol, null, trendTimeframe),
      };
      last1hUpdate = now;
      logger.info(`Updated 1h cached data for ${symbol}`);
    }
    if (now - last5mUpdate > 60 * 1000) { // Update 5m every minute
      cached5mData = {
        rsi: await calculateRSI(wrappedClient, symbol, confirmationTimeframe),
        volume: await analyzeVolume(wrappedClient, symbol, null, confirmationTimeframe),
      };
      last5mUpdate = now;
      logger.info(`Updated 5m cached data for ${symbol}`);
    }
  } catch (error) {
    logger.error(`Failed to update cached data: ${error}`);
  }
}

async function startBot() {
  try {
    logger.info(`Starting bot for ${symbol} on ${primaryTimeframe} with ${trendTimeframe} trend`);
    await wrappedClient.ping(); // Test API connectivity
    const ws = new WebSocket(`wss://stream.binance.com:9443/ws/${symbol.toLowerCase()}@kline_${primaryTimeframe}`);

    ws.on('message', async (data: string) => {
      try {
        const kline = JSON.parse(data).k;
        if (kline.x) { // Closed candle
          logger.info(`Processing 1m closed candle for ${symbol} at ${new Date(kline.t).toUTCString()}`);
          await updateCachedData();

          const currentPrice = parseFloat(kline.c);
          const volumeData = {
            '1m': await analyzeVolume(wrappedClient, symbol, kline.v, primaryTimeframe),
            '5m': cached5mData?.volume || { spike: 1, isSignificant: false },
            '1h': cached1hData?.volume || { spike: 1, isSignificant: false },
          };
          const rsiData = {
            '1m': await calculateRSI(wrappedClient, symbol, primaryTimeframe),
            '5m': cached5mData?.rsi || 50,
            '1h': cached1hData?.rsi || 50,
          };
          const macdData = {
            '1m': await calculateMACD(wrappedClient, symbol, primaryTimeframe),
            '1h': cached1hData?.macd || { macd: 0, signal: 0, histogram: 0 },
          };
          const orderBookData = await analyzeOrderBook(wrappedClient, symbol);

          const signal = await generateSignal({
            volume: volumeData,
            orderBook: orderBookData,
            rsi: rsiData,
            macd: macdData,
            currentPrice,
          });

          if (signal) {
            await sendTelegramMessage(formatSignalMessage(signal));

            //send alert trade
            if (signal.type == "LONG" || signal.type == "SHORT")
              await sendTelegramMessage(await reportTrade(signal));

            logger.info(`Signal generated: ${signal.type}`);
          }
        }
      } catch (error) {
        logger.error(`Error processing WebSocket message: ${error}`);
      }
    });
    ws.on('close', () => {
      logger.warn('WebSocket closed. Reconnecting...');
      setTimeout(startBot, 5000);
    });
    ws.on('error', (error) => {
      logger.error(`WebSocket error: ${error}`);
    });
  } catch (error) {
    logger.error(`Failed to start bot: ${error}`);
  }
}

function formatSignalMessage_1(signal: any): string {
  return `
(${signal.type == "LONG" ? '🟢' : signal.type == "SHORT" ? '🔴' : '🔵'}) ${signal.type} (${signal.type == "LONG" ? '🟢' : signal.type == "SHORT" ? '🔴' : '🔵'})
📈  Signal – ${symbol} (1m entry)
• Price: ${signal.currentPrice}
• 1m RSI: ${signal.rsi['1m'].toFixed(2)} (${signal.rsi['1m'] < 20 ? 'Oversold' : signal.rsi['1m'] > 80 ? 'Overbought' : 'Normal'})
• 5m RSI: ${signal.rsi['5m'].toFixed(2)}
• 1h Trend: ${signal.macd['1h'].histogram > 0 ? 'Bullish' : 'Bearish'}
• Volume Spike: 1m=${signal.volume['1m'].spike}x
• Order book: ${signal.orderBook.buyerPressure ? 'Buyers dominate' : 'Sellers dominate'}
• News Sentiment: ${signal.news}
• SL: ${signal.stopLoss.stopLossPercent}% Price:${signal.stopLoss.stopLossPrice}
• TP: ${signal.takeProfit.takeProfitPercent}% Price:${signal.takeProfit.takeProfitPrice}
⏰ Time: ${new Date().toUTCString()}
📊 Exchange: Binance
🧠 Confidence: ${signal.confidence}
  `;
}



function formatSignalMessage(signal: any): string {
  return `
*${signal.type === 'LONG' ? 'LONG' : signal.type === 'SHORT' ? 'SHORT' : 'NEUTRAL'} SIGNAL ALERT*

*Symbol:* ${signal.symbol}
*Entry Price:* $${signal.currentPrice.toFixed(2)}
*1m RSI:* ${signal.rsi['1m'].toFixed(2)} (${signal.rsi['1m'] < 20 ? 'Oversold' : signal.rsi['1m'] > 80 ? 'Overbought' : 'Neutral'})
*5m RSI:* ${signal.rsi['5m'].toFixed(2)}
*1h Trend:* ${signal.macd['1h'].histogram > 0 ? 'Bullish' : 'Bearish'}
*Volume Spike:* 1m=${signal.volume['1m'].spike.toFixed(2)}x
*Order Book:* ${signal.orderBook.buyerPressure ? 'Buyers dominate' : 'Sellers dominate'}
*News Sentiment:* ${signal.news}
*Stop Loss:* ${signal.stopLoss.stopLossPercent.toFixed(2)}% ($${signal.stopLoss.stopLossPrice.toFixed(2)})
*Take Profit:* ${signal.takeProfit.takeProfitPercent.toFixed(2)}% ($${signal.takeProfit.takeProfitPrice.toFixed(2)})
*Confidence:* ${signal.confidence}
*Timestamp:* ${new Date().toUTCString()}

*Exchange:* Binance
  `.trim();
}





startBot().catch((error) => logger.error(`Bot startup error: ${error}`));

sendTelegramMessage(`      
@@ Bot MTFA start running @@ 
At: ${new Date().toUTCString()},
Check: ${symbol},
For every: MTFA`);