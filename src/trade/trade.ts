// trade.ts

interface SignalData {
    type: string;
    currentPrice: number;
    stopLoss: {
        stopLossPercent: number,
        stopLossPrice: number
    };
    takeProfit: {
        takeProfitPercent: number,
        takeProfitPrice: number
    };
    news: string; // e.g., 'Positive', 'Negative'
    confidence: string; // e.g., '8.5/10'
    symbol: string;
}

interface TradeResult {
    symbol: string;
    signal: '🟢 BUY 🟢' | '🔴 SELL 🔴';
    timestamp: string;
    confidence: number;
    entry: number;
    tp: number;
    sl: number;
    positionSize: number;
    sentiment: string;
    outcome: 'TP Hit' | 'SL Hit' | 'Running' | 'Neutral';
    duration: string;
    errors: string[];
}

function buildTradeMessage(signalData: SignalData): TradeResult {
    const numericConfidence = parseFloat(signalData.confidence.split('/')[0]) || 0;

    return {
        symbol: signalData.symbol,
        signal: signalData.type === 'LONG' ? '🟢 BUY 🟢' : '🔴 SELL 🔴',
        timestamp: new Date().toLocaleTimeString(),
        confidence: parseFloat(((numericConfidence / 10) * 100).toFixed(1)),
        entry: signalData.currentPrice, //need to be smarter
        tp: signalData.takeProfit?.takeProfitPrice,
        sl: signalData.stopLoss?.stopLossPrice,
        positionSize: 0,
        sentiment: signalData.news, // still "Positive"/"Negative" //need to be smarter
        outcome: 'Running',
        duration: '0',
        errors: [],
    };
}

export async function reportTrade(signalData: SignalData): Promise<string> {
    let trade: TradeResult;

    try {
        trade = buildTradeMessage(signalData);

        const message = `
📈 *Trade Signal Alert*

*Symbol:* ${trade.symbol}
*Signal:* ${trade.signal}
*Confidence:* ${trade.confidence}%
*Entry:* ${trade.entry}
*TP:* ${trade.tp}
*SL:* ${trade.sl}
*Sentiment:* ${trade.sentiment}
*Size:* ${trade.positionSize}
*Outcome:* ${trade.outcome}
*Duration:* ${trade.duration}
⏰ *Time:* ${trade.timestamp}
    `.trim();

        // await sendTelegramMessage(message);

        return message;
    } catch (error) {
        console.error('Error reporting trade:', error);
        trade = {
            symbol: signalData.symbol,
            signal: signalData.type === 'LONG' ? '🟢 BUY 🟢' : '🔴 SELL 🔴',
            timestamp: new Date().toLocaleTimeString(),
            confidence: 0,
            entry: signalData.currentPrice,
            tp: signalData.takeProfit?.takeProfitPrice,
            sl: signalData.stopLoss?.stopLossPrice,
            positionSize: 0,
            sentiment: signalData.news,
            outcome: 'Neutral',
            duration: '0m',
            errors: [(error as Error).message],
        };
        return (`Error reporting trade: {$error}`);
    }
}
