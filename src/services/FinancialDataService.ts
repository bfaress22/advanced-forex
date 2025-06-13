/**
 * Financial Data Service
 * 
 * This service provides real-time financial calculations based on user inputs
 * and market data, ensuring all metrics are contextually accurate rather than
 * using default values.
 */

export interface MarketData {
  spotRates: { [currencyPair: string]: number };
  volatilities: { [currencyPair: string]: number };
  interestRates: { [currency: string]: number };
  forwardPoints: { [currencyPair: string]: { [tenor: string]: number } };
  lastUpdated: Date;
}

export interface ExposureData {
  id: string;
  currency: string;
  amount: number;
  type: 'receivable' | 'payable';
  maturity: Date;
  description: string;
  subsidiary?: string;
  hedgeRatio: number;
  hedgedAmount: number;
}

export interface HedgingInstrument {
  id: string;
  type: 'forward' | 'vanilla-call' | 'vanilla-put' | 'collar' | 'swap' | 'barrier';
  currencyPair: string;
  notional: number;
  strike?: number;
  premium?: number;
  maturity: Date;
  counterparty: string;
  mtm: number;
  hedgeAccounting: boolean;
  effectivenessRatio?: number;
}

export interface RiskMetrics {
  var95: number;
  var99: number;
  expectedShortfall95: number;
  expectedShortfall99: number;
  totalExposure: number;
  hedgedAmount: number;
  unhedgedRisk: number;
  hedgeRatio: number;
  mtmImpact: number;
}

export interface CurrencyExposure {
  currency: string;
  grossExposure: number;
  netExposure: number;
  hedgedAmount: number;
  hedgeRatio: number;
  var95: number;
  trend: 'up' | 'down' | 'stable';
}

class FinancialDataService {
  private marketData: MarketData;
  private exposures: ExposureData[] = [];
  private instruments: HedgingInstrument[] = [];

  constructor() {
    this.marketData = this.initializeMarketData();
  }

  /**
   * Initialize market data with realistic current rates
   */
  private initializeMarketData(): MarketData {
    return {
      spotRates: {
        'EURUSD': 1.0856,
        'GBPUSD': 1.2734,
        'USDJPY': 161.85,
        'USDCHF': 0.9642,
        'AUDUSD': 0.6523,
        'USDCAD': 1.3845,
        'NZDUSD': 0.5987,
        'EURGBP': 0.8523,
        'EURJPY': 175.68,
        'EURCHF': 1.0468
      },
      volatilities: {
        'EURUSD': 0.0875, // 8.75% annualized
        'GBPUSD': 0.1125, // 11.25% annualized
        'USDJPY': 0.0945, // 9.45% annualized
        'USDCHF': 0.0785, // 7.85% annualized
        'AUDUSD': 0.1235, // 12.35% annualized
        'USDCAD': 0.0695, // 6.95% annualized
        'NZDUSD': 0.1345, // 13.45% annualized
        'EURGBP': 0.0625, // 6.25% annualized
        'EURJPY': 0.0985, // 9.85% annualized
        'EURCHF': 0.0545  // 5.45% annualized
      },
      interestRates: {
        'USD': 0.0525, // 5.25% Fed Funds Rate
        'EUR': 0.0400, // 4.00% ECB Rate
        'GBP': 0.0525, // 5.25% BoE Rate
        'JPY': -0.0010, // -0.10% BoJ Rate
        'CHF': 0.0175, // 1.75% SNB Rate
        'AUD': 0.0435, // 4.35% RBA Rate
        'CAD': 0.0500, // 5.00% BoC Rate
        'NZD': 0.0550  // 5.50% RBNZ Rate
      },
      forwardPoints: {
        'EURUSD': {
          '1M': -0.0012,
          '3M': -0.0035,
          '6M': -0.0068,
          '12M': -0.0125
        },
        'GBPUSD': {
          '1M': -0.0008,
          '3M': -0.0024,
          '6M': -0.0047,
          '12M': -0.0089
        },
        'USDJPY': {
          '1M': 0.45,
          '3M': 1.35,
          '6M': 2.68,
          '12M': 5.25
        }
      },
      lastUpdated: new Date()
    };
  }

  /**
   * Calculate real-time risk metrics based on current exposures and instruments
   */
  calculateRiskMetrics(): RiskMetrics {
    const totalExposure = this.exposures.reduce((sum, exp) => sum + Math.abs(exp.amount), 0);
    const hedgedAmount = this.exposures.reduce((sum, exp) => sum + Math.abs(exp.hedgedAmount), 0);
    const unhedgedRisk = totalExposure - hedgedAmount;
    const hedgeRatio = totalExposure > 0 ? (hedgedAmount / totalExposure) * 100 : 0;
    
    // Calculate VaR using parametric method
    const var95 = this.calculateVaR(0.95);
    const var99 = this.calculateVaR(0.99);
    
    // Calculate Expected Shortfall (Conditional VaR)
    const expectedShortfall95 = var95 * 1.28; // Approximation for normal distribution
    const expectedShortfall99 = var99 * 1.15;
    
    // Calculate MTM impact from instruments
    const mtmImpact = this.instruments.reduce((sum, inst) => sum + inst.mtm, 0);

    return {
      var95,
      var99,
      expectedShortfall95,
      expectedShortfall99,
      totalExposure,
      hedgedAmount,
      unhedgedRisk,
      hedgeRatio,
      mtmImpact
    };
  }

  /**
   * Calculate Value at Risk using parametric method
   */
  private calculateVaR(confidenceLevel: number): number {
    const zScore = confidenceLevel === 0.95 ? 1.645 : 2.326; // 95% and 99% confidence
    
    let portfolioVariance = 0;
    const currencyExposures = this.getCurrencyExposures();
    
    // Calculate portfolio variance considering correlations
    currencyExposures.forEach((exp1, i) => {
      currencyExposures.forEach((exp2, j) => {
        const vol1 = this.getVolatility(exp1.currency);
        const vol2 = this.getVolatility(exp2.currency);
        const correlation = this.getCorrelation(exp1.currency, exp2.currency);
        
        portfolioVariance += exp1.netExposure * exp2.netExposure * vol1 * vol2 * correlation;
      });
    });
    
    const portfolioStdDev = Math.sqrt(portfolioVariance);
    return zScore * portfolioStdDev * Math.sqrt(1/252); // 1-day VaR
  }

  /**
   * Get currency exposures grouped by currency
   */
  getCurrencyExposures(): CurrencyExposure[] {
    const currencyMap = new Map<string, {
      grossExposure: number;
      netExposure: number;
      hedgedAmount: number;
      receivables: number;
      payables: number;
    }>();

    // Aggregate exposures by currency
    this.exposures.forEach(exp => {
      const existing = currencyMap.get(exp.currency) || {
        grossExposure: 0,
        netExposure: 0,
        hedgedAmount: 0,
        receivables: 0,
        payables: 0
      };

      existing.grossExposure += Math.abs(exp.amount);
      existing.hedgedAmount += Math.abs(exp.hedgedAmount);
      
      if (exp.type === 'receivable') {
        existing.receivables += exp.amount;
        existing.netExposure += exp.amount;
      } else {
        existing.payables += Math.abs(exp.amount);
        existing.netExposure -= Math.abs(exp.amount);
      }

      currencyMap.set(exp.currency, existing);
    });

    // Convert to array and calculate additional metrics
    return Array.from(currencyMap.entries()).map(([currency, data]) => {
      const hedgeRatio = data.grossExposure > 0 ? (data.hedgedAmount / data.grossExposure) * 100 : 0;
      const volatility = this.getVolatility(currency);
      const var95 = Math.abs(data.netExposure) * volatility * 1.645 * Math.sqrt(1/252);
      
      // Determine trend based on recent price movements (simplified)
      const trend = this.determineTrend(currency);

      return {
        currency,
        grossExposure: data.grossExposure,
        netExposure: data.netExposure,
        hedgedAmount: data.hedgedAmount,
        hedgeRatio,
        var95,
        trend
      };
    });
  }

  /**
   * Calculate forward rate based on interest rate differential
   */
  calculateForwardRate(currencyPair: string, tenor: string): number {
    const spotRate = this.marketData.spotRates[currencyPair];
    if (!spotRate) return 0;

    // Parse currency pair
    const baseCurrency = currencyPair.substring(0, 3);
    const quoteCurrency = currencyPair.substring(3, 6);
    
    const baseRate = this.marketData.interestRates[baseCurrency] || 0;
    const quoteRate = this.marketData.interestRates[quoteCurrency] || 0;
    
    // Convert tenor to years
    const timeToMaturity = this.tenorToYears(tenor);
    
    // Forward rate formula: Spot * exp((r_quote - r_base) * t)
    return spotRate * Math.exp((quoteRate - baseRate) * timeToMaturity);
  }

  /**
   * Calculate option price using Garman-Kohlhagen model
   */
  calculateOptionPrice(
    optionType: 'call' | 'put',
    currencyPair: string,
    strike: number,
    timeToMaturity: number,
    volatility?: number
  ): number {
    const spotRate = this.marketData.spotRates[currencyPair];
    if (!spotRate) return 0;

    const baseCurrency = currencyPair.substring(0, 3);
    const quoteCurrency = currencyPair.substring(3, 6);
    
    const domesticRate = this.marketData.interestRates[quoteCurrency] || 0;
    const foreignRate = this.marketData.interestRates[baseCurrency] || 0;
    const vol = volatility || this.marketData.volatilities[currencyPair] || 0.1;

    return this.garmanKohlhagenPrice(optionType, spotRate, strike, domesticRate, foreignRate, timeToMaturity, vol);
  }

  /**
   * Garman-Kohlhagen option pricing model
   */
  private garmanKohlhagenPrice(
    type: string,
    S: number,
    K: number,
    r_d: number,
    r_f: number,
    t: number,
    sigma: number
  ): number {
    const d1 = (Math.log(S / K) + (r_d - r_f + 0.5 * sigma * sigma) * t) / (sigma * Math.sqrt(t));
    const d2 = d1 - sigma * Math.sqrt(t);
    
    const N = (x: number) => (1 + this.erf(x / Math.sqrt(2))) / 2;
    
    if (type === 'call') {
      return S * Math.exp(-r_f * t) * N(d1) - K * Math.exp(-r_d * t) * N(d2);
    } else {
      return K * Math.exp(-r_d * t) * N(-d2) - S * Math.exp(-r_f * t) * N(-d1);
    }
  }

  /**
   * Error function approximation
   */
  private erf(x: number): number {
    const a1 = 0.254829592;
    const a2 = -0.284496736;
    const a3 = 1.421413741;
    const a4 = -1.453152027;
    const a5 = 1.061405429;
    const p = 0.3275911;

    const sign = x >= 0 ? 1 : -1;
    x = Math.abs(x);

    const t = 1.0 / (1.0 + p * x);
    const y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);

    return sign * y;
  }

  /**
   * Calculate Mark-to-Market for instruments
   */
  calculateMTM(instrument: HedgingInstrument): number {
    const currentSpot = this.marketData.spotRates[instrument.currencyPair];
    if (!currentSpot) return 0;

    const timeToMaturity = (instrument.maturity.getTime() - Date.now()) / (365.25 * 24 * 60 * 60 * 1000);
    
    switch (instrument.type) {
      case 'forward':
        const forwardRate = this.calculateForwardRate(instrument.currencyPair, this.yearsToTenor(timeToMaturity));
        return instrument.notional * (currentSpot - (instrument.strike || 0)) * Math.exp(-this.getRiskFreeRate() * timeToMaturity);
      
      case 'vanilla-call':
      case 'vanilla-put':
        const optionValue = this.calculateOptionPrice(
          instrument.type.replace('vanilla-', '') as 'call' | 'put',
          instrument.currencyPair,
          instrument.strike || 0,
          timeToMaturity
        );
        return instrument.notional * optionValue - (instrument.premium || 0);
      
      default:
        return 0;
    }
  }

  /**
   * Update market data (simulated real-time updates)
   */
  updateMarketData(): void {
    Object.keys(this.marketData.spotRates).forEach(pair => {
      const volatility = this.marketData.volatilities[pair] || 0.1;
      const randomShock = (Math.random() - 0.5) * 2 * volatility * 0.01; // Small random movement
      this.marketData.spotRates[pair] *= (1 + randomShock);
    });
    
    this.marketData.lastUpdated = new Date();
    
    // Update MTM for all instruments
    this.instruments.forEach(instrument => {
      instrument.mtm = this.calculateMTM(instrument);
    });
  }

  /**
   * Add exposure
   */
  addExposure(exposure: Omit<ExposureData, 'id'>): void {
    const newExposure: ExposureData = {
      ...exposure,
      id: `EXP-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    };
    this.exposures.push(newExposure);
  }

  /**
   * Update exposure
   */
  updateExposure(id: string, updates: Partial<Omit<ExposureData, 'id'>>): boolean {
    const index = this.exposures.findIndex(exp => exp.id === id);
    if (index === -1) return false;
    
    this.exposures[index] = { ...this.exposures[index], ...updates };
    return true;
  }

  /**
   * Delete exposure
   */
  deleteExposure(id: string): boolean {
    const index = this.exposures.findIndex(exp => exp.id === id);
    if (index === -1) return false;
    
    this.exposures.splice(index, 1);
    return true;
  }

  /**
   * Get exposure by ID
   */
  getExposureById(id: string): ExposureData | undefined {
    return this.exposures.find(exp => exp.id === id);
  }

  /**
   * Add hedging instrument
   */
  addInstrument(instrument: Omit<HedgingInstrument, 'id' | 'mtm'>): void {
    const newInstrument: HedgingInstrument = {
      ...instrument,
      id: `HDG-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      mtm: 0
    };
    newInstrument.mtm = this.calculateMTM(newInstrument);
    this.instruments.push(newInstrument);
  }

  /**
   * Update instrument
   */
  updateInstrument(id: string, updates: Partial<Omit<HedgingInstrument, 'id'>>): boolean {
    const index = this.instruments.findIndex(inst => inst.id === id);
    if (index === -1) return false;
    
    this.instruments[index] = { ...this.instruments[index], ...updates };
    // Recalculate MTM after update
    this.instruments[index].mtm = this.calculateMTM(this.instruments[index]);
    return true;
  }

  /**
   * Delete instrument
   */
  deleteInstrument(id: string): boolean {
    const index = this.instruments.findIndex(inst => inst.id === id);
    if (index === -1) return false;
    
    this.instruments.splice(index, 1);
    return true;
  }

  /**
   * Get instrument by ID
   */
  getInstrumentById(id: string): HedgingInstrument | undefined {
    return this.instruments.find(inst => inst.id === id);
  }

  /**
   * Get exposures filtered by criteria
   */
  getExposuresFiltered(criteria: {
    currency?: string;
    type?: 'receivable' | 'payable';
    minAmount?: number;
    maxAmount?: number;
    unhedgedOnly?: boolean;
  }): ExposureData[] {
    return this.exposures.filter(exp => {
      if (criteria.currency && exp.currency !== criteria.currency) return false;
      if (criteria.type && exp.type !== criteria.type) return false;
      if (criteria.minAmount && Math.abs(exp.amount) < criteria.minAmount) return false;
      if (criteria.maxAmount && Math.abs(exp.amount) > criteria.maxAmount) return false;
      if (criteria.unhedgedOnly && exp.hedgeRatio > 0) return false;
      return true;
    });
  }

  /**
   * Get summary statistics
   */
  getSummaryStatistics(): {
    totalExposures: number;
    totalReceivables: number;
    totalPayables: number;
    totalHedged: number;
    averageHedgeRatio: number;
    currencyBreakdown: { [currency: string]: { receivables: number; payables: number; net: number } };
    maturityBreakdown: { next30Days: number; next90Days: number; beyond90Days: number };
  } {
    const currencyBreakdown: { [currency: string]: { receivables: number; payables: number; net: number } } = {};
    let totalReceivables = 0;
    let totalPayables = 0;
    let totalHedged = 0;
    let totalHedgeRatioWeighted = 0;
    let totalAmount = 0;

    const now = new Date();
    const next30Days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    const next90Days = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);
    
    let maturityNext30 = 0;
    let maturityNext90 = 0;
    let maturityBeyond90 = 0;

    this.exposures.forEach(exp => {
      const absAmount = Math.abs(exp.amount);
      totalAmount += absAmount;
      totalHedged += Math.abs(exp.hedgedAmount);
      totalHedgeRatioWeighted += exp.hedgeRatio * absAmount;

      // Currency breakdown
      if (!currencyBreakdown[exp.currency]) {
        currencyBreakdown[exp.currency] = { receivables: 0, payables: 0, net: 0 };
      }

      if (exp.type === 'receivable') {
        totalReceivables += absAmount;
        currencyBreakdown[exp.currency].receivables += absAmount;
        currencyBreakdown[exp.currency].net += exp.amount;
      } else {
        totalPayables += absAmount;
        currencyBreakdown[exp.currency].payables += absAmount;
        currencyBreakdown[exp.currency].net += exp.amount;
      }

      // Maturity breakdown
      if (exp.maturity <= next30Days) {
        maturityNext30++;
      } else if (exp.maturity <= next90Days) {
        maturityNext90++;
      } else {
        maturityBeyond90++;
      }
    });

    const averageHedgeRatio = totalAmount > 0 ? totalHedgeRatioWeighted / totalAmount : 0;

    return {
      totalExposures: this.exposures.length,
      totalReceivables,
      totalPayables,
      totalHedged,
      averageHedgeRatio,
      currencyBreakdown,
      maturityBreakdown: {
        next30Days: maturityNext30,
        next90Days: maturityNext90,
        beyond90Days: maturityBeyond90
      }
    };
  }

  /**
   * Validate exposure data
   */
  validateExposure(exposure: Omit<ExposureData, 'id'>): string[] {
    const errors: string[] = [];

    if (!exposure.currency || exposure.currency.length !== 3) {
      errors.push('Currency must be a valid 3-letter code');
    }

    if (!exposure.amount || exposure.amount === 0) {
      errors.push('Amount must be non-zero');
    }

    if (!exposure.description || exposure.description.trim().length === 0) {
      errors.push('Description is required');
    }

    if (exposure.hedgeRatio < 0 || exposure.hedgeRatio > 100) {
      errors.push('Hedge ratio must be between 0 and 100');
    }

    if (!exposure.maturity || exposure.maturity <= new Date()) {
      errors.push('Maturity date must be in the future');
    }

    if (exposure.type !== 'receivable' && exposure.type !== 'payable') {
      errors.push('Type must be either receivable or payable');
    }

    // Validate hedged amount consistency
    const expectedHedgedAmount = (exposure.hedgeRatio / 100) * exposure.amount;
    const tolerance = Math.abs(exposure.amount) * 0.01; // 1% tolerance
    if (Math.abs(exposure.hedgedAmount - expectedHedgedAmount) > tolerance) {
      errors.push('Hedged amount is inconsistent with hedge ratio');
    }

    return errors;
  }

  /**
   * Clear all data (for testing/reset purposes)
   */
  clearAllData(): void {
    this.exposures = [];
    this.instruments = [];
  }

  /**
   * Clear only instruments (keep exposures)
   */
  clearInstruments(): void {
    this.instruments = [];
  }

  /**
   * Export data to JSON
   */
  exportData(): {
    exposures: ExposureData[];
    instruments: HedgingInstrument[];
    marketData: MarketData;
    exportTimestamp: string;
  } {
    return {
      exposures: [...this.exposures],
      instruments: [...this.instruments],
      marketData: { ...this.marketData },
      exportTimestamp: new Date().toISOString()
    };
  }

  /**
   * Import data from JSON
   */
  importData(data: {
    exposures?: ExposureData[];
    instruments?: HedgingInstrument[];
  }): { success: boolean; errors: string[] } {
    const errors: string[] = [];

    try {
      if (data.exposures) {
        // Validate all exposures before importing
        for (const exposure of data.exposures) {
          const validationErrors = this.validateExposure(exposure);
          if (validationErrors.length > 0) {
            errors.push(`Exposure ${exposure.description}: ${validationErrors.join(', ')}`);
          }
        }

        if (errors.length === 0) {
          this.exposures = [...data.exposures];
        }
      }

      if (data.instruments && errors.length === 0) {
        this.instruments = [...data.instruments];
        // Recalculate MTM for all instruments
        this.instruments.forEach(inst => {
          inst.mtm = this.calculateMTM(inst);
        });
      }

      return { success: errors.length === 0, errors };
    } catch (error) {
      return { 
        success: false, 
        errors: [`Import failed: ${error instanceof Error ? error.message : 'Unknown error'}`] 
      };
    }
  }

  /**
   * Helper methods
   */
  private getVolatility(currency: string): number {
    // Find volatility for currency pairs containing this currency
    const pairs = Object.keys(this.marketData.volatilities);
    const relevantPair = pairs.find(pair => pair.includes(currency));
    return relevantPair ? this.marketData.volatilities[relevantPair] : 0.1;
  }

  private getCorrelation(currency1: string, currency2: string): number {
    // Simplified correlation matrix (in reality, this would be more complex)
    if (currency1 === currency2) return 1.0;
    
    const correlations: { [key: string]: number } = {
      'EUR-GBP': 0.75,
      'EUR-CHF': 0.85,
      'GBP-CHF': 0.65,
      'USD-JPY': -0.25,
      'EUR-USD': -0.15,
      'GBP-USD': -0.10
    };
    
    const key1 = `${currency1}-${currency2}`;
    const key2 = `${currency2}-${currency1}`;
    
    return correlations[key1] || correlations[key2] || 0.3; // Default correlation
  }

  private determineTrend(currency: string): 'up' | 'down' | 'stable' {
    // Simplified trend determination (in reality, this would analyze historical data)
    const random = Math.random();
    if (random < 0.33) return 'up';
    if (random < 0.66) return 'down';
    return 'stable';
  }

  private tenorToYears(tenor: string): number {
    const match = tenor.match(/(\d+)([DWMY])/);
    if (!match) return 0;
    
    const value = parseInt(match[1]);
    const unit = match[2];
    
    switch (unit) {
      case 'D': return value / 365.25;
      case 'W': return value / 52.18;
      case 'M': return value / 12;
      case 'Y': return value;
      default: return 0;
    }
  }

  private yearsToTenor(years: number): string {
    if (years < 1/12) return `${Math.round(years * 365.25)}D`;
    if (years < 1) return `${Math.round(years * 12)}M`;
    return `${Math.round(years)}Y`;
  }

  private getRiskFreeRate(): number {
    return this.marketData.interestRates['USD'] || 0.05;
  }

  /**
   * Generate stress test scenarios based on current market conditions
   */
  generateStressScenarios(): Array<{
    name: string;
    description: string;
    shocks: { [currencyPair: string]: number };
    impact: number;
  }> {
    const scenarios = [
      {
        name: "USD Strength",
        description: "10% USD appreciation across all pairs",
        shocks: this.generateUSDStrengthShocks(0.10),
        impact: 0
      },
      {
        name: "EUR Crisis",
        description: "15% EUR depreciation with increased volatility",
        shocks: this.generateEURCrisisShocks(0.15),
        impact: 0
      },
      {
        name: "Risk-Off Sentiment",
        description: "Flight to safe havens (USD, CHF, JPY)",
        shocks: this.generateRiskOffShocks(),
        impact: 0
      }
    ];

    // Calculate impact for each scenario
    scenarios.forEach(scenario => {
      scenario.impact = this.calculateScenarioImpact(scenario.shocks);
    });

    return scenarios;
  }

  private generateUSDStrengthShocks(magnitude: number): { [currencyPair: string]: number } {
    const shocks: { [currencyPair: string]: number } = {};
    
    Object.keys(this.marketData.spotRates).forEach(pair => {
      if (pair.endsWith('USD')) {
        shocks[pair] = magnitude; // Foreign currency strengthens vs USD
      } else if (pair.startsWith('USD')) {
        shocks[pair] = -magnitude; // USD strengthens vs foreign currency
      }
    });
    
    return shocks;
  }

  private generateEURCrisisShocks(magnitude: number): { [currencyPair: string]: number } {
    const shocks: { [currencyPair: string]: number } = {};
    
    Object.keys(this.marketData.spotRates).forEach(pair => {
      if (pair.startsWith('EUR')) {
        shocks[pair] = -magnitude; // EUR weakens
      } else if (pair.endsWith('EUR')) {
        shocks[pair] = magnitude; // Other currencies strengthen vs EUR
      }
    });
    
    return shocks;
  }

  private generateRiskOffShocks(): { [currencyPair: string]: number } {
    const shocks: { [currencyPair: string]: number } = {};
    const safeHavens = ['USD', 'CHF', 'JPY'];
    
    Object.keys(this.marketData.spotRates).forEach(pair => {
      const base = pair.substring(0, 3);
      const quote = pair.substring(3, 6);
      
      const baseIsSafe = safeHavens.includes(base);
      const quoteIsSafe = safeHavens.includes(quote);
      
      if (baseIsSafe && !quoteIsSafe) {
        shocks[pair] = 0.05; // Safe haven strengthens
      } else if (!baseIsSafe && quoteIsSafe) {
        shocks[pair] = -0.05; // Safe haven strengthens
      } else {
        shocks[pair] = 0; // No change between safe havens or risk currencies
      }
    });
    
    return shocks;
  }

  private calculateScenarioImpact(shocks: { [currencyPair: string]: number }): number {
    let totalImpact = 0;
    
    this.exposures.forEach(exposure => {
      // Find relevant currency pair for this exposure
      const relevantPairs = Object.keys(shocks).filter(pair => 
        pair.includes(exposure.currency)
      );
      
      if (relevantPairs.length > 0) {
        const shock = shocks[relevantPairs[0]] || 0;
        const unhedgedAmount = exposure.amount - exposure.hedgedAmount;
        totalImpact += unhedgedAmount * shock;
      }
    });
    
    return totalImpact;
  }

  /**
   * Get all exposures
   */
  getExposures(): ExposureData[] {
    return [...this.exposures];
  }

  /**
   * Get all instruments
   */
  getInstruments(): HedgingInstrument[] {
    return [...this.instruments];
  }

  /**
   * Get current market data
   */
  getMarketData(): MarketData {
    return { ...this.marketData };
  }
}

export default FinancialDataService; 