"use strict";
/**
 * Convert MT5 CSV files to Supabase-compatible format
 *
 * Usage:
 *   npx ts-node src/backtest/convert-for-supabase.ts
 *
 * Output files will be in ./data/supabase/
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
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const readline = __importStar(require("readline"));
const crypto_1 = require("crypto");
const SYMBOL_MAP = {
    XAUUSD: "XAU/USD",
    BTCUSD: "BTC_USDT",
    ETHUSD: "ETH_USDT",
    SOLUSD: "SOL_USDT",
};
const TIMEFRAME_MAP = {
    M1: "Min1",
    M5: "Min5",
    M15: "Min15",
    M30: "Min30",
    H1: "Min60",
    H4: "Hour4",
    D1: "Day1",
};
async function convertFile(inputPath, symbol, timeframe) {
    const outputDir = path.join(process.cwd(), "data", "supabase");
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }
    const baseName = path.basename(inputPath, ".csv");
    const outputPath = path.join(outputDir, `${baseName}_supabase.csv`);
    const fileStream = fs.createReadStream(inputPath);
    const rl = readline.createInterface({
        input: fileStream,
        crlfDelay: Infinity,
    });
    const writeStream = fs.createWriteStream(outputPath);
    // Write header
    writeStream.write("id,symbol,timeframe,timestamp,open,high,low,close,volume,createdAt\n");
    let count = 0;
    const now = new Date().toISOString();
    for await (const line of rl) {
        const cleanLine = line.replace(/\r/g, "");
        const separator = cleanLine.includes("\t") ? "\t" : ",";
        const parts = cleanLine.split(separator);
        // Skip header
        if (parts[0].toLowerCase().includes("date") || parts[0].includes("<")) {
            continue;
        }
        if (parts.length < 6)
            continue;
        try {
            const dateStr = parts[0].replace(/\./g, "-");
            const timeStr = parts[1];
            const timestamp = new Date(`${dateStr}T${timeStr}Z`).toISOString();
            const id = (0, crypto_1.randomUUID)();
            const open = parseFloat(parts[2]);
            const high = parseFloat(parts[3]);
            const low = parseFloat(parts[4]);
            const close = parseFloat(parts[5]);
            const volume = parseFloat(parts[6]) || 0;
            writeStream.write(`${id},${symbol},${timeframe},${timestamp},${open},${high},${low},${close},${volume},${now}\n`);
            count++;
        }
        catch {
            // Skip invalid lines
        }
    }
    writeStream.end();
    return count;
}
async function main() {
    const dataDir = path.join(process.cwd(), "data");
    const files = fs.readdirSync(dataDir).filter(f => f.endsWith(".csv") && !f.includes("supabase"));
    console.log(`Found ${files.length} CSV files to convert\n`);
    for (const file of files) {
        // Parse filename: BTCUSD_M15.csv
        const match = file.match(/^([A-Z]+)_?(M\d+|H\d+|D\d+)\.csv$/i);
        if (!match) {
            console.log(`Skipping ${file} - couldn't parse filename`);
            continue;
        }
        const mt5Symbol = match[1].toUpperCase();
        const mt5Timeframe = match[2].toUpperCase();
        const symbol = SYMBOL_MAP[mt5Symbol];
        const timeframe = TIMEFRAME_MAP[mt5Timeframe];
        if (!symbol || !timeframe) {
            console.log(`Skipping ${file} - unknown symbol/timeframe`);
            continue;
        }
        console.log(`Converting ${file} → ${symbol} ${timeframe}...`);
        const filePath = path.join(dataDir, file);
        const count = await convertFile(filePath, symbol, timeframe);
        console.log(`  ✓ ${count.toLocaleString()} candles\n`);
    }
    console.log(`\nDone! Files are in ./data/supabase/`);
    console.log(`\nTo import into Supabase:`);
    console.log(`1. Go to Supabase Dashboard → Table Editor → Candle`);
    console.log(`2. Click "Insert" → "Import data from CSV"`);
    console.log(`3. Upload each file from ./data/supabase/`);
}
main().catch(console.error);
//# sourceMappingURL=convert-for-supabase.js.map