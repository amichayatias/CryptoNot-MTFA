# Crypto Trader Bot

A real-time cryptocurrency trading bot that analyzes market data, generates trading signals, and sends them to Telegram.

## Features
- **Market Scanner**: Analyzes 5m charts with RSI and MACD indicators.
- **Volume Analysis**: Detects volume spikes.
- **Order Book**: Analyzes buy/sell pressure.
- **News Alerts**: Fetches and analyzes news sentiment via CryptoPanic API.
- **Stop-Loss**: Calculates SL based on recent support levels.
- **Real-time**: Uses WebSocket for live data.
- **Signal Generator**: Generates LONG/SHORT signals.
- **Telegram Bot**: Sends signals to Telegram in real-time.

## Setup
1. Clone the repository.
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create a `.env` file with your API keys:
   ```
   BINANCE_API_KEY=your_binance_api_key
   BINANCE_API_SECRET=your_binance_api_secret
   TELEGRAM_BOT_TOKEN=your_telegram_bot_token
   TELEGRAM_CHAT_ID=your_telegram_chat_id
   CRYPTOPANIC_API_KEY=your_cryptopanic_api_key
   TAAPI_IO_KEY=your_taapi_io_key
   ```
4. Compile TypeScript:
   ```bash
   npx tsc
   ```
5. Run the bot:
   ```bash
   node dist/index.js
   ```
6. Run tests:
   ```bash
   npm test
   ```

## Dependencies
- Node.js
- TypeScript
- Binance API (`binance-api-node`)
- Technical Indicators (`technicalindicators`)
- Telegram Bot (`node-telegram-bot-api`)
- Winston (`winston`) for logging
- Jest (`jest`) for testing

## Logs
Logs are stored in the `logs/` directory:
- `error.log`: Error messages
- `combined.log`: All logs