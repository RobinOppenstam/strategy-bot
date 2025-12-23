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

import * as fs from "fs";
import * as path from "path";
import { execSync } from "child_process";

// Symbol mapping: MT5 name -> Andre-Bot name
const SYMBOL_MAP: Record<string, string> = {
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
const TIMEFRAME_MAP: Record<string, string> = {
  M1: "Min1",
  M5: "Min5",
  M15: "Min15",
  M30: "Min30",
  H1: "Min60",
  H4: "Hour4",
  D1: "Day1",
};

function parseFileName(fileName: string): { symbol: string; timeframe: string } | null {
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

  const imports: { file: string; symbol: string; timeframe: string }[] = [];

  for (const file of files) {
    const parsed = parseFileName(file);
    if (parsed) {
      imports.push({ file, ...parsed });
      console.log(`  ${file} → ${parsed.symbol} ${parsed.timeframe}`);
    } else {
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
      execSync(
        `npx ts-node src/backtest/csv-import.ts "${filePath}" "${symbol}" "${timeframe}"`,
        { stdio: "inherit" }
      );
    } catch (error) {
      console.error(`Failed to import ${file}`);
    }
  }

  console.log(`\n${"═".repeat(50)}`);
  console.log("All imports complete!");
}

main().catch(console.error);
