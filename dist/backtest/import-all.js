"use strict";
/**
 * Batch Import Script for MT5 Historical Data
 *
 * Place your CSV files in the ./data directory with naming convention:
 *   SYMBOL_TIMEFRAME.csv
 *
 * Examples:
 *   ./data/XAUUSD_M15.csv
 *   ./data/BTCUSD_M5.csv
 *   ./data/ETHUSD_M15.csv
 *
 * Usage:
 *   npx ts-node src/backtest/import-all.ts
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
const child_process_1 = require("child_process");
// Symbol mapping: MT5 name -> Andre-Bot name
const SYMBOL_MAP = {
    XAUUSD: "XAU/USD",
    BTCUSD: "BTC_USDT",
    ETHUSD: "ETH_USDT",
    SOLUSD: "SOL_USDT",
    BITCOIN: "BTC_USDT",
    ETHEREUM: "ETH_USDT",
    SOLANA: "SOL_USDT",
    GOLD: "XAU/USD",
};
// Timeframe mapping: MT5 name -> Andre-Bot name
const TIMEFRAME_MAP = {
    M1: "Min1",
    M5: "Min5",
    M15: "Min15",
    M30: "Min30",
    H1: "Min60",
    H4: "Hour4",
    D1: "Day1",
};
function parseFileName(fileName) {
    // Remove extension
    const baseName = path.basename(fileName, path.extname(fileName));
    // Try pattern: SYMBOL_TIMEFRAME (e.g., XAUUSD_M15)
    const match = baseName.match(/^([A-Z]+)_?(M\d+|H\d+|D\d+)$/i);
    if (match) {
        const mt5Symbol = match[1].toUpperCase();
        const mt5Timeframe = match[2].toUpperCase();
        const symbol = SYMBOL_MAP[mt5Symbol];
        const timeframe = TIMEFRAME_MAP[mt5Timeframe];
        if (symbol && timeframe) {
            return { symbol, timeframe };
        }
    }
    return null;
}
async function main() {
    const dataDir = path.join(process.cwd(), "data");
    if (!fs.existsSync(dataDir)) {
        console.log(`Creating data directory: ${dataDir}`);
        fs.mkdirSync(dataDir, { recursive: true });
        console.log(`
Place your MT5 CSV files in: ${dataDir}

File naming convention:
  SYMBOL_TIMEFRAME.csv

Examples:
  XAUUSD_M15.csv  → XAU/USD Min15
  BTCUSD_M5.csv   → BTC_USDT Min5
  ETHUSD_M15.csv  → ETH_USDT Min15
  SOLUSD_M15.csv  → SOL_USDT Min15

Then run this script again.
`);
        return;
    }
    const files = fs.readdirSync(dataDir).filter((f) => f.endsWith(".csv"));
    if (files.length === 0) {
        console.log(`No CSV files found in ${dataDir}`);
        console.log(`
Place your MT5 CSV files in: ${dataDir}

File naming convention:
  SYMBOL_TIMEFRAME.csv

Examples:
  XAUUSD_M15.csv  → XAU/USD Min15
  BTCUSD_M5.csv   → BTC_USDT Min5
  ETHUSD_M15.csv  → ETH_USDT Min15
  SOLUSD_M15.csv  → SOL_USDT Min15
`);
        return;
    }
    console.log(`Found ${files.length} CSV files:\n`);
    const imports = [];
    for (const file of files) {
        const parsed = parseFileName(file);
        if (parsed) {
            imports.push({ file, ...parsed });
            console.log(`  ${file} → ${parsed.symbol} ${parsed.timeframe}`);
        }
        else {
            console.log(`  ${file} → ⚠️ Could not parse (skipping)`);
        }
    }
    if (imports.length === 0) {
        console.log("\nNo valid files to import.");
        return;
    }
    console.log(`\n${"═".repeat(50)}`);
    console.log(`Starting import of ${imports.length} files...\n`);
    for (const { file, symbol, timeframe } of imports) {
        const filePath = path.join(dataDir, file);
        console.log(`\n${"─".repeat(50)}`);
        console.log(`Importing: ${file}`);
        try {
            (0, child_process_1.execSync)(`npx ts-node src/backtest/csv-import.ts "${filePath}" "${symbol}" "${timeframe}"`, { stdio: "inherit" });
        }
        catch (error) {
            console.error(`Failed to import ${file}`);
        }
    }
    console.log(`\n${"═".repeat(50)}`);
    console.log("All imports complete!");
}
main().catch(console.error);
//# sourceMappingURL=import-all.js.map