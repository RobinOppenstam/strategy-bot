"use strict";
/**
 * Technical Indicators
 * Implements the indicators used in the Pine Script strategy
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.Indicators = void 0;
class Indicators {
    /**
     * Simple Moving Average
     */
    sma(data, period) {
        const result = [];
        for (let i = 0; i < data.length; i++) {
            if (i < period - 1) {
                result.push(NaN);
                continue;
            }
            let sum = 0;
            for (let j = 0; j < period; j++) {
                sum += data[i - j];
            }
            result.push(sum / period);
        }
        return result;
    }
    /**
     * Exponential Moving Average
     */
    ema(data, period) {
        const result = [];
        const multiplier = 2 / (period + 1);
        for (let i = 0; i < data.length; i++) {
            if (i === 0) {
                result.push(data[0]);
            }
            else if (i < period - 1) {
                // Use SMA for warmup period
                let sum = 0;
                for (let j = 0; j <= i; j++) {
                    sum += data[j];
                }
                result.push(sum / (i + 1));
            }
            else if (i === period - 1) {
                // First EMA value is SMA
                let sum = 0;
                for (let j = 0; j < period; j++) {
                    sum += data[i - j];
                }
                result.push(sum / period);
            }
            else {
                // EMA formula: (Close - Previous EMA) * multiplier + Previous EMA
                const ema = (data[i] - result[i - 1]) * multiplier + result[i - 1];
                result.push(ema);
            }
        }
        return result;
    }
    /**
     * True Range
     */
    trueRange(highs, lows, closes) {
        const result = [];
        for (let i = 0; i < highs.length; i++) {
            if (i === 0) {
                result.push(highs[i] - lows[i]);
                continue;
            }
            const hl = highs[i] - lows[i];
            const hc = Math.abs(highs[i] - closes[i - 1]);
            const lc = Math.abs(lows[i] - closes[i - 1]);
            result.push(Math.max(hl, hc, lc));
        }
        return result;
    }
    /**
     * Average True Range
     */
    atr(highs, lows, closes, period) {
        const tr = this.trueRange(highs, lows, closes);
        return this.sma(tr, period);
    }
    /**
     * Standard Deviation (used for SD levels in your script)
     */
    stdev(data, period) {
        const smaValues = this.sma(data, period);
        const result = [];
        for (let i = 0; i < data.length; i++) {
            if (i < period - 1) {
                result.push(NaN);
                continue;
            }
            let sumSquares = 0;
            for (let j = 0; j < period; j++) {
                const diff = data[i - j] - smaValues[i];
                sumSquares += diff * diff;
            }
            result.push(Math.sqrt(sumSquares / period));
        }
        return result;
    }
    /**
     * Pivot High - Swing High Detection
     * Returns the high if it's a pivot, otherwise NaN
     */
    pivotHigh(highs, leftBars, rightBars) {
        const result = [];
        for (let i = 0; i < highs.length; i++) {
            // Need enough bars on both sides
            if (i < leftBars || i >= highs.length - rightBars) {
                result.push(NaN);
                continue;
            }
            const pivotIndex = i;
            const pivotHigh = highs[pivotIndex];
            let isPivot = true;
            // Check left bars
            for (let j = pivotIndex - leftBars; j < pivotIndex; j++) {
                if (highs[j] >= pivotHigh) {
                    isPivot = false;
                    break;
                }
            }
            // Check right bars
            if (isPivot) {
                for (let j = pivotIndex + 1; j <= pivotIndex + rightBars; j++) {
                    if (highs[j] >= pivotHigh) {
                        isPivot = false;
                        break;
                    }
                }
            }
            result.push(isPivot ? pivotHigh : NaN);
        }
        return result;
    }
    /**
     * Pivot Low - Swing Low Detection
     * Returns the low if it's a pivot, otherwise NaN
     */
    pivotLow(lows, leftBars, rightBars) {
        const result = [];
        for (let i = 0; i < lows.length; i++) {
            // Need enough bars on both sides
            if (i < leftBars || i >= lows.length - rightBars) {
                result.push(NaN);
                continue;
            }
            const pivotIndex = i;
            const pivotLow = lows[pivotIndex];
            let isPivot = true;
            // Check left bars
            for (let j = pivotIndex - leftBars; j < pivotIndex; j++) {
                if (lows[j] <= pivotLow) {
                    isPivot = false;
                    break;
                }
            }
            // Check right bars
            if (isPivot) {
                for (let j = pivotIndex + 1; j <= pivotIndex + rightBars; j++) {
                    if (lows[j] <= pivotLow) {
                        isPivot = false;
                        break;
                    }
                }
            }
            result.push(isPivot ? pivotLow : NaN);
        }
        return result;
    }
    /**
     * VWAP (Volume Weighted Average Price)
     * Note: Resets daily - for simplicity, this is a rolling calculation
     */
    vwap(highs, lows, closes, volumes) {
        const result = [];
        let cumulativeTPV = 0; // Cumulative (typical price * volume)
        let cumulativeVolume = 0;
        for (let i = 0; i < closes.length; i++) {
            const typicalPrice = (highs[i] + lows[i] + closes[i]) / 3;
            cumulativeTPV += typicalPrice * volumes[i];
            cumulativeVolume += volumes[i];
            result.push(cumulativeVolume > 0 ? cumulativeTPV / cumulativeVolume : typicalPrice);
        }
        return result;
    }
    /**
     * RSI (Relative Strength Index) - useful for additional confirmation
     */
    rsi(closes, period) {
        const result = [];
        const gains = [];
        const losses = [];
        for (let i = 0; i < closes.length; i++) {
            if (i === 0) {
                gains.push(0);
                losses.push(0);
                result.push(50); // Neutral
                continue;
            }
            const change = closes[i] - closes[i - 1];
            gains.push(change > 0 ? change : 0);
            losses.push(change < 0 ? Math.abs(change) : 0);
            if (i < period) {
                result.push(50);
                continue;
            }
            // Calculate average gains and losses
            let avgGain = 0;
            let avgLoss = 0;
            if (i === period) {
                for (let j = 1; j <= period; j++) {
                    avgGain += gains[j];
                    avgLoss += losses[j];
                }
                avgGain /= period;
                avgLoss /= period;
            }
            else {
                // Smoothed averages
                const prevRsi = result[i - 1];
                const prevAvgGain = (100 / (100 - prevRsi) - 1) * (period - 1);
                const prevAvgLoss = period - 1;
                avgGain = (prevAvgGain * (period - 1) + gains[i]) / period;
                avgLoss = (prevAvgLoss * (period - 1) + losses[i]) / period;
            }
            if (avgLoss === 0) {
                result.push(100);
            }
            else {
                const rs = avgGain / avgLoss;
                result.push(100 - 100 / (1 + rs));
            }
        }
        return result;
    }
    /**
     * ADX (Average Directional Index) - Trend strength
     */
    adx(highs, lows, closes, period) {
        const plusDM = [];
        const minusDM = [];
        const tr = this.trueRange(highs, lows, closes);
        // Calculate +DM and -DM
        for (let i = 0; i < highs.length; i++) {
            if (i === 0) {
                plusDM.push(0);
                minusDM.push(0);
                continue;
            }
            const upMove = highs[i] - highs[i - 1];
            const downMove = lows[i - 1] - lows[i];
            if (upMove > downMove && upMove > 0) {
                plusDM.push(upMove);
            }
            else {
                plusDM.push(0);
            }
            if (downMove > upMove && downMove > 0) {
                minusDM.push(downMove);
            }
            else {
                minusDM.push(0);
            }
        }
        // Smooth the values
        const smoothedPlusDM = this.ema(plusDM, period);
        const smoothedMinusDM = this.ema(minusDM, period);
        const smoothedTR = this.ema(tr, period);
        // Calculate +DI and -DI
        const plusDI = [];
        const minusDI = [];
        const dx = [];
        for (let i = 0; i < highs.length; i++) {
            const pdi = smoothedTR[i] > 0 ? (smoothedPlusDM[i] / smoothedTR[i]) * 100 : 0;
            const mdi = smoothedTR[i] > 0 ? (smoothedMinusDM[i] / smoothedTR[i]) * 100 : 0;
            plusDI.push(pdi);
            minusDI.push(mdi);
            const diSum = pdi + mdi;
            dx.push(diSum > 0 ? (Math.abs(pdi - mdi) / diSum) * 100 : 0);
        }
        // ADX is smoothed DX
        const adx = this.ema(dx, period);
        return { adx, plusDI, minusDI };
    }
}
exports.Indicators = Indicators;
//# sourceMappingURL=indicators.js.map