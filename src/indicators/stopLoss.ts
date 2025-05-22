import logger from '../utils/logger';

type Candle = {
    open: string;
    high: string;
    low: string;
    close: string;
    volume: string;
    openTime: number;
    closeTime: number;
    quoteAssetVolume: string;
    numberOfTrades: number;
    takerBuyBaseAssetVolume: string;
    takerBuyQuoteAssetVolume: string;
};

interface BinanceClient {
    candles: (options: {
        symbol: string;
        interval: string;
        limit: number;
    }) => Promise<Candle[]>;
}

/**
 * Calculates the stop-loss percentage and price based on recent lows or highs.
 * Ensures a tight stop-loss for scalping strategies, adjusted for trade type.
 * @param client - Binance API client
 * @param symbol - Trading pair (e.g., BTCUSDT)
 * @param currentPrice - Current market price
 * @param tradeType - Trade direction ('LONG' or 'SHORT')
 * @param lookback - Number of candles to look back for support/resistance levels
 * @returns Object with stopLossPercent and stopLossPrice
 */


export async function calculateStopLoss(
    client: BinanceClient,
    symbol: string,
    currentPrice: number,
    tradeType: 'LONG' | 'SHORT',
    lookback = 10
): Promise<{ stopLossPercent: number; stopLossPrice: number }> {
    const timeframe = '5m';
    const TradeTypeLong = 'LONG';
    const TradeTypeSHORT = 'SHORT';

    try {
        if (!client || typeof client.candles !== 'function') {
            throw new Error('Invalid or uninitialized Binance client');
        }

        if (!symbol || typeof symbol !== 'string') {
            throw new Error('Symbol must be a non-empty string');
        }

        if (!currentPrice || currentPrice <= 0) {
            throw new Error('Current price must be a positive number');
        }

        if (![TradeTypeLong, TradeTypeSHORT].includes(tradeType)) {
            throw new Error(`Trade type must be either ${TradeTypeLong} or ${TradeTypeSHORT}`);
        }

        const candles = await client.candles({ symbol, interval: timeframe, limit: lookback });

        if (!candles.length) {
            throw new Error(`No candle data available for ${symbol}`);
        }

        let stopLossPrice: number;
        let stopLossPercent: number;

        if (tradeType === TradeTypeLong) {
            const lows = candles.map((c) => parseFloat(c.low));
            const supportLevel = Math.min(...lows);
            stopLossPrice = supportLevel;
            stopLossPercent = Math.max(
                parseFloat((((currentPrice - supportLevel) / currentPrice) * 100).toFixed(2)),
                0.3 // Minimum 0.3% to avoid over-tight stops
            );
        } else {
            const highs = candles.map((c) => parseFloat(c.high));
            const resistanceLevel = Math.max(...highs);
            stopLossPrice = resistanceLevel;
            stopLossPercent = Math.max(
                parseFloat((((resistanceLevel - currentPrice) / currentPrice) * 100).toFixed(2)),
                0.3 // Minimum 0.3% to avoid over-tight stops
            );
        }

        logger.info(
            `Calculated stop-loss for ${symbol} (${timeframe}, ${tradeType}): ${stopLossPercent}% [${tradeType === TradeTypeLong ? 'Support' : 'Resistance'} at ${stopLossPrice}]`
        );

        return {
            stopLossPercent,
            stopLossPrice,
        };
    } catch (error: any) {
        logger.error(
            `Failed to calculate stop-loss for ${symbol || 'unknown'}: ${error instanceof Error ? error.message : error}`
        );
        throw error;
    }
}

/**
 * Calculates the take-profit percentage and corresponding price.
 * Adjusted for trade type (LONG or SHORT).
 * @param symbol - Trading pair (e.g., BTCUSDT)
 * @param currentPrice - Current market price
 * @param tradeType - Trade direction ('LONG' or 'SHORT')
 * @returns Object with takeProfitPercent and takeProfitPrice
 */
export async function calculateTakeProfit(
    symbol: string,
    currentPrice: number,
    tradeType: 'LONG' | 'SHORT'
): Promise<{ takeProfitPercent: number; takeProfitPrice: number }> {
    const takeProfitPercent = 0.5; // Example: 0.5% target for scalping
    const TradeTypeLong = 'LONG';
    const TradeTypeSHORT = 'SHORT';

    if (!currentPrice || currentPrice <= 0) {
        throw new Error('Invalid current price for take-profit calculation');
    }

    if (![TradeTypeLong, TradeTypeSHORT].includes(tradeType)) {
        throw new Error(`Trade type must be either ${TradeTypeLong} or ${TradeTypeSHORT}`);
    }

    let takeProfitPrice: number;

    if (tradeType === TradeTypeLong) {
        takeProfitPrice = parseFloat(
            (currentPrice + (currentPrice * takeProfitPercent) / 100).toFixed(2)
        );
    } else {
        takeProfitPrice = parseFloat(
            (currentPrice - (currentPrice * takeProfitPercent) / 100).toFixed(2)
        );
    }

    logger.info(
        `Calculated take-profit for ${symbol} (${tradeType}): ${takeProfitPercent}% (Target Price: $${takeProfitPrice})`
    );

    return {
        takeProfitPercent,
        takeProfitPrice,
    };
}