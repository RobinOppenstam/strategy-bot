# MEXC Trend Strategy Bot

Trading bot för MEXC Futures med ICT Premium/Discount zones + MA crossover.

## Skillnader mot Hyperliquid

| Feature | MEXC | Hyperliquid |
|---------|------|-------------|
| TP/SL | **1 order med TP/SL attached** | 3 separata ordrar |
| API | REST + polling | WebSocket |
| Contract size | 0.0001 BTC per contract | Direkt i BTC |
| Leverage | Up to 200x | Up to 50x |

## Ordrar på MEXC

MEXC stödjer **TP/SL direkt på ordern** - så det blir **1 order istället för 3**:

```typescript
await client.placeMarketOrder(
  "BTC_USDT",
  "long",
  100,              // contracts
  40,               // leverage
  stopLossPrice,    // TP/SL attached!
  takeProfitPrice
);
```

Börsen hanterar cancellation automatiskt när TP eller SL triggas.

## Risk Management

```
Bankroll:    $999
Risk/trade:  2% = $19.98
Leverage:    40x

Entry:       $100,000
Stop Loss:   $99,500 (0.5% bort)

Position Size = $19.98 / 0.5% = $3,996 exposure
Contracts    = $3,996 / $100,000 / 0.0001 = 399 contracts
```

## Installation

```bash
npm install

export MEXC_API_KEY=mx0...
export MEXC_API_SECRET=...

npm run dev
```

## MEXC API Setup

1. Gå till https://www.mexc.com/user/openapi
2. Skapa ny API key
3. Aktivera "Futures Trading" permission
4. Whitelist din IP (rekommenderat)

## Config

```typescript
const config = {
  symbol: "BTC_USDT",     // Trading pair
  timeframe: "Min15",     // Min1, Min5, Min15, Min30, Min60, Hour4, Day1
  bankrollUsd: 999,
  riskPercent: 0.02,      // 2%
  leverage: 40,
  riskRewardRatio: 2.0,   // 1:2
};
```

## Timeframes

| Pine Script | MEXC |
|-------------|------|
| 1m | Min1 |
| 5m | Min5 |
| 15m | Min15 |
| 30m | Min30 |
| 1h | Min60 |
| 4h | Hour4 |
| 1d | Day1 |

## File Structure

```
mexc-trend-bot/
├── src/
│   ├── index.ts        # Entry + config
│   ├── bot.ts          # Trading logic
│   ├── mexc-client.ts  # MEXC API wrapper
│   ├── indicators.ts   # Technical indicators
│   └── types.ts        # TypeScript types
├── package.json
└── tsconfig.json
```
