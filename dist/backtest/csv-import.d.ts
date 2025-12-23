/**
 * CSV Import Script for MT5 Historical Data
 *
 * Usage:
 *   npx ts-node src/backtest/csv-import.ts <csv_file> <symbol> <timeframe>
 *
 * Example:
 *   npx ts-node src/backtest/csv-import.ts ./data/XAUUSD_M15.csv XAU/USD Min15
 *   npx ts-node src/backtest/csv-import.ts ./data/BTCUSD_M5.csv BTC_USDT Min5
 */
import "dotenv/config";
