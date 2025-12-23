"use strict";
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
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const fs = __importStar(require("fs"));
const readline = __importStar(require("readline"));
const prisma_1 = require("../db/prisma");
// Map string timeframe to Prisma enum
const TIMEFRAME_MAP = {
    Min1: "Min1",
    Min5: "Min5",
    Min15: "Min15",
    Min30: "Min30",
    Min60: "Min60",
    Hour4: "Hour4",
    Day1: "Day1",
};
/**
 * Parse MT5 CSV line
 * MT5 format: Date,Time,Open,High,Low,Close,TickVolume,Volume,Spread
 * Can use comma or tab as separator
 * Example: 2023.01.02,00:00:00,1826.28,1826.67,1824.58,1825.18,2174,0,35
 * Example: 2023.01.02\t00:00:00\t1826.28\t1826.67\t1824.58\t1825.18\t2174\t0\t35
 */
function parseMT5Line(line) {
    // Handle Windows line endings and detect separator
    const cleanLine = line.replace(/\r/g, "");
    const separator = cleanLine.includes("\t") ? "\t" : ",";
    const parts = cleanLine.split(separator);
    if (parts.length < 6)
        return null;
    // Skip header row
    if (parts[0].toLowerCase().includes("date") || parts[0].toLowerCase().includes("<")) {
        return null;
    }
    try {
        // Parse date: "2023.01.02" or "2023-01-02"
        const dateStr = parts[0].replace(/\./g, "-");
        // Parse time: "00:00:00" or "00:00"
        const timeStr = parts[1];
        const timestamp = new Date(`${dateStr}T${timeStr}Z`);
        if (isNaN(timestamp.getTime())) {
            return null;
        }
        return {
            timestamp,
            open: parseFloat(parts[2]),
            high: parseFloat(parts[3]),
            low: parseFloat(parts[4]),
            close: parseFloat(parts[5]),
            volume: parseFloat(parts[6]) || 0,
        };
    }
    catch {
        return null;
    }
}
/**
 * Parse generic CSV (Date,Open,High,Low,Close,Volume)
 */
function parseGenericLine(line) {
    const parts = line.split(",");
    if (parts.length < 5)
        return null;
    // Skip header
    if (parts[0].toLowerCase().includes("date") || parts[0].toLowerCase().includes("time")) {
        return null;
    }
    try {
        // Try to parse first column as timestamp
        let timestamp;
        // Check if it's a Unix timestamp (milliseconds)
        if (/^\d{13}$/.test(parts[0])) {
            timestamp = new Date(parseInt(parts[0]));
        }
        // Check if Unix timestamp (seconds)
        else if (/^\d{10}$/.test(parts[0])) {
            timestamp = new Date(parseInt(parts[0]) * 1000);
        }
        // Otherwise parse as date string
        else {
            timestamp = new Date(parts[0]);
        }
        if (isNaN(timestamp.getTime())) {
            return null;
        }
        return {
            timestamp,
            open: parseFloat(parts[1]),
            high: parseFloat(parts[2]),
            low: parseFloat(parts[3]),
            close: parseFloat(parts[4]),
            volume: parseFloat(parts[5]) || 0,
        };
    }
    catch {
        return null;
    }
}
async function importCSV(filePath, symbol, timeframe) {
    const tf = TIMEFRAME_MAP[timeframe];
    if (!tf) {
        console.error(`Invalid timeframe: ${timeframe}`);
        console.log("Valid timeframes:", Object.keys(TIMEFRAME_MAP).join(", "));
        process.exit(1);
    }
    if (!fs.existsSync(filePath)) {
        console.error(`File not found: ${filePath}`);
        process.exit(1);
    }
    console.log(`\nImporting ${filePath}`);
    console.log(`Symbol: ${symbol}, Timeframe: ${timeframe}`);
    console.log("─".repeat(50));
    const fileStream = fs.createReadStream(filePath);
    const rl = readline.createInterface({
        input: fileStream,
        crlfDelay: Infinity,
    });
    const candles = [];
    let lineCount = 0;
    let parseErrors = 0;
    let isMT5Format = false;
    for await (const line of rl) {
        lineCount++;
        if (lineCount === 1) {
            // Detect format from header
            isMT5Format = line.includes("Time") || line.includes("<DATE>");
            if (line.toLowerCase().includes("date") || line.includes("<")) {
                continue; // Skip header
            }
        }
        const candle = isMT5Format ? parseMT5Line(line) : parseGenericLine(line);
        if (candle) {
            candles.push(candle);
        }
        else if (line.trim()) {
            parseErrors++;
            if (parseErrors <= 5) {
                console.log(`Parse error on line ${lineCount}: ${line.substring(0, 50)}...`);
            }
        }
    }
    console.log(`Parsed ${candles.length} candles (${parseErrors} parse errors)`);
    if (candles.length === 0) {
        console.error("No valid candles found!");
        process.exit(1);
    }
    // Sort by timestamp
    candles.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
    console.log(`Date range: ${candles[0].timestamp.toISOString()} to ${candles[candles.length - 1].timestamp.toISOString()}`);
    // Insert in batches
    const BATCH_SIZE = 1000;
    let inserted = 0;
    let updated = 0;
    console.log(`\nInserting into database...`);
    for (let i = 0; i < candles.length; i += BATCH_SIZE) {
        const batch = candles.slice(i, i + BATCH_SIZE);
        // Use upsert to handle duplicates
        for (const candle of batch) {
            try {
                await prisma_1.prisma.candle.upsert({
                    where: {
                        symbol_timeframe_timestamp: {
                            symbol,
                            timeframe: tf,
                            timestamp: candle.timestamp,
                        },
                    },
                    update: {
                        open: candle.open,
                        high: candle.high,
                        low: candle.low,
                        close: candle.close,
                        volume: candle.volume,
                    },
                    create: {
                        symbol,
                        timeframe: tf,
                        timestamp: candle.timestamp,
                        open: candle.open,
                        high: candle.high,
                        low: candle.low,
                        close: candle.close,
                        volume: candle.volume,
                    },
                });
                inserted++;
            }
            catch (err) {
                updated++;
            }
        }
        const progress = Math.round(((i + batch.length) / candles.length) * 100);
        process.stdout.write(`\rProgress: ${progress}% (${i + batch.length}/${candles.length})`);
    }
    console.log(`\n\nImport complete!`);
    console.log(`Total candles: ${candles.length}`);
    // Verify
    const count = await prisma_1.prisma.candle.count({
        where: { symbol, timeframe: tf },
    });
    console.log(`Candles in database for ${symbol} ${timeframe}: ${count}`);
}
// CLI entry point
async function main() {
    const args = process.argv.slice(2);
    if (args.length < 3) {
        console.log(`
MT5 CSV Import Tool
═══════════════════

Usage:
  npx ts-node src/backtest/csv-import.ts <csv_file> <symbol> <timeframe>

Examples:
  npx ts-node src/backtest/csv-import.ts ./data/XAUUSD_M15.csv XAU/USD Min15
  npx ts-node src/backtest/csv-import.ts ./data/BTCUSD_M5.csv BTC_USDT Min5
  npx ts-node src/backtest/csv-import.ts ./data/ETHUSD_M15.csv ETH_USDT Min15
  npx ts-node src/backtest/csv-import.ts ./data/SOLUSD_M15.csv SOL_USDT Min15

Symbols:
  BTC_USDT, ETH_USDT, SOL_USDT, XAU/USD

Timeframes:
  Min1, Min5, Min15, Min30, Min60, Hour4, Day1

MT5 Export Instructions:
  1. Open MT5 → Tools → History Center (F2)
  2. Select symbol and timeframe
  3. Download data if needed (double-click)
  4. Click Export → Save as CSV
`);
        process.exit(0);
    }
    const [filePath, symbol, timeframe] = args;
    try {
        await importCSV(filePath, symbol, timeframe);
    }
    catch (error) {
        console.error("Import failed:", error);
        process.exit(1);
    }
    finally {
        await prisma_1.prisma.$disconnect();
    }
}
main();
//# sourceMappingURL=csv-import.js.map