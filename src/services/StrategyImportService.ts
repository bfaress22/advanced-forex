import { StrategyComponent } from '../pages/Index';

export interface ImportedStrategy {
  id: string;
  name: string;
  timestamp: number;
  currencyPair: string;
  spotPrice: number;
  components: StrategyComponent[];
  params: {
    startDate: string;
    monthsToHedge: number;
    baseVolume: number;
    quoteVolume: number;
    domesticRate: number;
    foreignRate: number;
  };
}

export interface HedgingInstrument {
  id: string;
  type: string;
  currency: string;
  notional: number;
  strike?: number;
  premium?: number;
  maturity: string;
  status: string;
  mtm: number;
  hedge_accounting: boolean;
  effectiveness_ratio?: number;
  counterparty: string;
  barrier?: number;
  secondBarrier?: number;
  rebate?: number;
  volatility?: number;
  quantity?: number;
  originalComponent?: StrategyComponent;
  strategyName?: string;
  importedAt?: number;
  // New fields for real data from Detailed Results
  realOptionPrice?: number;  // Actual option price from calculations (Call Price 1, Put Price 2, etc.)
  impliedVolatility?: number; // IV from Detailed Results
  optionIndex?: number;       // Index of the option in the strategy for mapping
  // New fields for detailed period information
  periodIndex?: number;       // Index of the period in the detailed results
  periodDate?: string;        // Date of the period
  timeToMaturity?: number;    // Time to maturity for this specific period
  forwardPrice?: number;      // Forward price for this period
  realPrice?: number;         // Real price for this period
  dynamicStrikeInfo?: {       // Dynamic strike information if applicable
    calculatedStrike: number;
    calculatedStrikePercent: string;
    forwardRate: number;
    timeToMaturity: number;
  };
  customPrice?: number;       // Custom price if used
  repricingData?: {           // Complete repricing information
    underlyingPrice: number;
    timeToMaturity: number;
    domesticRate: number;
    foreignRate: number;
    volatility: number;
    dividendYield: number;
    pricingModel: string;
  };
}

class StrategyImportService {
  private static instance: StrategyImportService;
  private importedStrategies: ImportedStrategy[] = [];
  private hedgingInstruments: HedgingInstrument[] = [];

  constructor() {
    this.loadFromStorage();
  }

  static getInstance(): StrategyImportService {
    if (!StrategyImportService.instance) {
      StrategyImportService.instance = new StrategyImportService();
    }
    return StrategyImportService.instance;
  }

  private loadFromStorage(): void {
    try {
      const savedStrategies = localStorage.getItem('importedStrategies');
      if (savedStrategies) {
        this.importedStrategies = JSON.parse(savedStrategies);
      }

      const savedInstruments = localStorage.getItem('hedgingInstruments');
      if (savedInstruments) {
        this.hedgingInstruments = JSON.parse(savedInstruments);
      }
    } catch (error) {
      console.error('Error loading from storage:', error);
    }
  }

  private saveToStorage(): void {
    try {
      localStorage.setItem('importedStrategies', JSON.stringify(this.importedStrategies));
      localStorage.setItem('hedgingInstruments', JSON.stringify(this.hedgingInstruments));
    } catch (error) {
      console.error('Error saving to storage:', error);
    }
  }

  importStrategy(
    strategyName: string,
    components: StrategyComponent[],
    params: {
      currencyPair: { symbol: string; base: string; quote: string };
      spotPrice: number;
      startDate: string;
      monthsToHedge: number;
      baseVolume: number;
      quoteVolume: number;
      domesticRate: number;
      foreignRate: number;
      useCustomPeriods?: boolean;
      customPeriods?: Array<{ maturityDate: string; volume: number }>;
    },
    detailedResults?: any[] // Optional: results from the Detailed Results table
  ): string {
    const strategyId = `STRAT-${Date.now()}`;
    const timestamp = Date.now();

    // Save the imported strategy
    const importedStrategy: ImportedStrategy = {
      id: strategyId,
      name: strategyName,
      timestamp,
      currencyPair: params.currencyPair.symbol,
      spotPrice: params.spotPrice,
      components,
      params: {
        startDate: params.startDate,
        monthsToHedge: params.monthsToHedge,
        baseVolume: params.baseVolume,
        quoteVolume: params.quoteVolume,
        domesticRate: params.domesticRate,
        foreignRate: params.foreignRate,
      }
    };

    this.importedStrategies.push(importedStrategy);

    // Convert strategy components to hedging instruments
    const newInstruments = this.convertStrategyToInstruments(
      strategyName,
      components,
      params,
      timestamp,
      detailedResults
    );

    this.hedgingInstruments.push(...newInstruments);
    this.saveToStorage();

    return strategyId;
  }

  private convertStrategyToInstruments(
    strategyName: string,
    components: StrategyComponent[],
    params: {
      currencyPair: { symbol: string; base: string; quote: string };
      spotPrice: number;
      startDate: string;
      monthsToHedge: number;
      baseVolume: number;
      quoteVolume: number;
      useCustomPeriods?: boolean;
      customPeriods?: Array<{ maturityDate: string; volume: number }>;
    },
    timestamp: number,
    detailedResults?: any[]
  ): HedgingInstrument[] {
    const instruments: HedgingInstrument[] = [];
    
    if (!detailedResults || detailedResults.length === 0) {
      // Fallback: comportement original si pas de résultats détaillés
      const maturityDates = this.calculateMaturityDates(
        params.startDate, 
        params.monthsToHedge,
        params.useCustomPeriods,
        params.customPeriods
      );
      
      const finalMaturityDate = maturityDates[maturityDates.length - 1];

      components.forEach((component, index) => {
        const instrumentId = `HDG-${timestamp}-${index + 1}`;
        const notional = this.calculateNotional(component, params);
        const strike = this.calculateStrike(component, params.spotPrice);
        let instrumentType = this.mapComponentTypeToInstrument(component.type);
        
        const baseInstrument: HedgingInstrument = {
          id: instrumentId,
          type: instrumentType,
          currency: params.currencyPair.symbol,
          notional: Math.abs(notional),
          maturity: finalMaturityDate,
          status: 'active',
          mtm: 0,
          hedge_accounting: true,
          effectiveness_ratio: 95,
          counterparty: 'Strategy Import',
          volatility: component.volatility,
          quantity: component.quantity,
          originalComponent: component,
          strategyName,
          importedAt: timestamp,
          optionIndex: index
        };

        if (component.type === 'call' || component.type === 'put' || 
            component.type.includes('call') || component.type.includes('put')) {
          baseInstrument.strike = strike;
          baseInstrument.premium = this.estimatePremium(component, params);
        }

        if (component.type === 'forward' || component.type === 'swap') {
          baseInstrument.strike = strike;
        }

        // Ajouter les barrières SEULEMENT pour les options barrières
        if (component.type.includes('knockout') || component.type.includes('knockin') || 
            component.type.includes('touch') || component.type.includes('binary')) {
          if (component.barrier !== undefined) {
            baseInstrument.barrier = component.barrierType === 'percent' 
              ? params.spotPrice * (component.barrier / 100)
              : component.barrier;
          }

          if (component.secondBarrier !== undefined) {
            baseInstrument.secondBarrier = component.barrierType === 'percent'
              ? params.spotPrice * (component.secondBarrier / 100)
              : component.secondBarrier;
          }
        }

        if (component.rebate) {
          baseInstrument.rebate = component.rebate;
        }

        instruments.push(baseInstrument);
      });
    } else {
      // Nouveau comportement: créer un instrument pour chaque période et chaque composant
      detailedResults.forEach((periodResult, periodIndex) => {
        const periodDate = new Date(periodResult.date);
        const maturityDateStr = periodDate.toISOString().split('T')[0];
        
        // Extraire les détails de stratégie du résultat enrichi
        const strategyDetails = periodResult.strategyDetails || [];
        
        components.forEach((component, componentIndex) => {
          const strategyDetail = strategyDetails[componentIndex];
          const instrumentId = `HDG-${timestamp}-P${periodIndex + 1}-C${componentIndex + 1}`;
          
          // Calculer le notional pour cette période spécifique
          const periodVolume = periodResult.monthlyVolume || (params.baseVolume / detailedResults.length);
          const notional = Math.abs(component.quantity / 100) * periodVolume;
          
          let instrumentType = this.mapComponentTypeToInstrument(component.type);
          
          // Utiliser les informations enrichies si disponibles
          const absoluteStrike = strategyDetail?.absoluteStrike || this.calculateStrike(component, params.spotPrice);
          const effectiveVolatility = strategyDetail?.effectiveVolatility || component.volatility;
          const realOptionPrice = strategyDetail?.calculatedPrice || periodResult.optionPrices?.[componentIndex]?.price;
          
          const instrument: HedgingInstrument = {
            id: instrumentId,
            type: instrumentType,
            currency: params.currencyPair.symbol,
            notional: notional,
            maturity: maturityDateStr,
            status: 'active',
            mtm: 0, // Sera calculé plus tard
            hedge_accounting: true,
            effectiveness_ratio: 95,
            counterparty: 'Strategy Import',
            volatility: component.volatility,
            quantity: component.quantity,
            originalComponent: component,
            strategyName: `${strategyName} [P${periodIndex + 1}]`,
            importedAt: timestamp,
            // Nouvelles informations enrichies
            realOptionPrice: realOptionPrice,
            impliedVolatility: effectiveVolatility,
            optionIndex: componentIndex,
            // Période et informations détaillées
            periodIndex: periodIndex,
            periodDate: periodResult.date,
            timeToMaturity: periodResult.timeToMaturity,
            forwardPrice: periodResult.forward,
            realPrice: strategyDetail?.repricingData?.underlyingPrice || periodResult.realPrice,
            // Informations de re-pricing complètes
            repricingData: strategyDetail?.repricingData
          };

          // Ajouter le strike en valeur absolue
          if (component.type === 'call' || component.type === 'put' || 
              component.type.includes('call') || component.type.includes('put') ||
              component.type === 'forward' || component.type === 'swap') {
            instrument.strike = absoluteStrike;
            instrument.premium = realOptionPrice || this.estimatePremium(component, params);
          }

          // Ajouter les barrières en valeur absolue SEULEMENT pour les options barrières
          if (component.type.includes('knockout') || component.type.includes('knockin') || 
              component.type.includes('touch') || component.type.includes('binary')) {
            if (strategyDetail?.absoluteBarrier !== undefined) {
              instrument.barrier = strategyDetail.absoluteBarrier;
            } else if (component.barrier !== undefined) {
              instrument.barrier = component.barrierType === 'percent' 
                ? params.spotPrice * (component.barrier / 100)
                : component.barrier;
            }

            if (strategyDetail?.absoluteSecondBarrier !== undefined) {
              instrument.secondBarrier = strategyDetail.absoluteSecondBarrier;
            } else if (component.secondBarrier !== undefined) {
              instrument.secondBarrier = component.barrierType === 'percent'
                ? params.spotPrice * (component.secondBarrier / 100)
                : component.secondBarrier;
            }
          }

          // Ajouter la rebate pour les options digitales
          if (component.rebate !== undefined) {
            instrument.rebate = component.rebate;
          } else if (component.type.includes('touch') || component.type.includes('binary') || component.type.includes('digital')) {
            // Pour les options digitales sans rebate explicite, utiliser une valeur par défaut
            instrument.rebate = 5; // 5% par défaut pour les options digitales
          }

          // Ajouter les informations de strike dynamique si disponibles
          if (strategyDetail?.dynamicStrikeInfo) {
            instrument.dynamicStrikeInfo = strategyDetail.dynamicStrikeInfo;
          }

          // Ajouter les prix personnalisés si utilisés
          if (strategyDetail?.customPrice !== undefined) {
            instrument.customPrice = strategyDetail.customPrice;
          }

          instruments.push(instrument);
        });
      });
    }

    return instruments;
  }

  private mapComponentTypeToInstrument(componentType: string): string {
    const typeMapping: { [key: string]: string } = {
      'call': 'Vanilla Call',
      'put': 'Vanilla Put',
      'forward': 'Forward',
      'swap': 'Swap',
      'call-knockout': 'Knock-Out Call',
      'put-knockout': 'Knock-Out Put',
      'call-knockin': 'Knock-In Call',
      'put-knockin': 'Knock-In Put',
      'call-double-knockout': 'Double Knock-Out Call',
      'put-double-knockout': 'Double Knock-Out Put',
      'one-touch': 'One-Touch',
      'no-touch': 'No-Touch',
      'double-touch': 'Double-Touch',
      'double-no-touch': 'Double-No-Touch',
      'range-binary': 'Range Binary',
      'outside-binary': 'Outside Binary'
    };

    return typeMapping[componentType] || componentType.charAt(0).toUpperCase() + componentType.slice(1);
  }

  private calculateNotional(component: StrategyComponent, params: { baseVolume: number; quoteVolume: number }): number {
    // Calculate notional based on quantity percentage and base volume
    const percentage = Math.abs(component.quantity) / 100;
    return params.baseVolume * percentage;
  }

  private calculateStrike(component: StrategyComponent, spotPrice: number): number {
    if (component.strikeType === 'percent') {
      return spotPrice * (component.strike / 100);
    }
    return component.strike;
  }

  private calculateMaturityDate(startDate: string, monthsToHedge: number): string {
    const start = new Date(startDate);
    const maturity = new Date(start);
    maturity.setMonth(maturity.getMonth() + monthsToHedge);
    return maturity.toISOString().split('T')[0];
  }

  private calculateMaturityDates(
    startDate: string, 
    monthsToHedge: number,
    useCustomPeriods?: boolean,
    customPeriods?: Array<{ maturityDate: string; volume: number }>
  ): string[] {
    const startDateObj = new Date(startDate);
    let months: Date[] = [];

    // Check if we're using custom periods or standard months (same logic as Index.tsx)
    if (useCustomPeriods && customPeriods && customPeriods.length > 0) {
      // Sort custom periods by maturity date
      const sortedPeriods = [...customPeriods].sort(
        (a, b) => new Date(a.maturityDate).getTime() - new Date(b.maturityDate).getTime()
      );
      
      // Convert custom periods to months array
      months = sortedPeriods.map(period => new Date(period.maturityDate));
    } else {
      // Use the standard month generation logic (same as Index.tsx)
      let currentDate = new Date(startDateObj);
      const lastDayOfStartMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
      const remainingDaysInMonth = lastDayOfStartMonth.getDate() - currentDate.getDate() + 1;

      if (remainingDaysInMonth > 0) {
        months.push(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0));
      }

      for (let i = 0; i < monthsToHedge - (remainingDaysInMonth > 0 ? 1 : 0); i++) {
        currentDate.setMonth(currentDate.getMonth() + 1);
        months.push(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0));
      }
    }

    // Convert dates to ISO string format
    return months.map(date => date.toISOString().split('T')[0]);
  }

  private estimatePremium(component: StrategyComponent, params: { spotPrice: number; baseVolume: number }): number {
    // Enhanced premium estimation based on option type and parameters
    if (component.type === 'forward' || component.type === 'swap') {
      return 0; // Forwards and swaps typically have no upfront premium
    }

    // For options, use a more sophisticated estimation
    const timeToMaturity = 1; // Assume 1 year for estimation
    const volatility = component.volatility / 100;
    const spotPrice = params.spotPrice;
    
    // Calculate strike price
    const strike = component.strikeType === 'percent' 
      ? spotPrice * (component.strike / 100)
      : component.strike;
    
    let intrinsicValue = 0;
    
    // Calculate intrinsic value based on option type
    if (component.type === 'call' || component.type.includes('call')) {
      intrinsicValue = Math.max(0, spotPrice - strike);
    } else if (component.type === 'put' || component.type.includes('put')) {
      intrinsicValue = Math.max(0, strike - spotPrice);
    }
    
    // Time value estimation using simplified Black-Scholes approximation
    const timeValue = spotPrice * volatility * Math.sqrt(timeToMaturity) * 0.4;
    
    // For barrier options, reduce premium by 20-40%
    let barrierDiscount = 1;
    if (component.type.includes('knockout') || component.type.includes('knockin')) {
      barrierDiscount = 0.7; // 30% discount for barrier features
    }
    
    // For digital options, use rebate-based pricing
    if (component.type.includes('touch') || component.type.includes('binary')) {
      const rebate = (component.rebate || 5) / 100;
      return rebate * 0.5; // Simplified digital option premium
    }
    
    const totalPremium = (intrinsicValue + timeValue) * barrierDiscount;
    return Math.max(0.0001, totalPremium); // Minimum premium of 0.01%
  }

  getHedgingInstruments(): HedgingInstrument[] {
    return [...this.hedgingInstruments];
  }

  getImportedStrategies(): ImportedStrategy[] {
    return [...this.importedStrategies];
  }

  deleteInstrument(id: string): void {
    this.hedgingInstruments = this.hedgingInstruments.filter(inst => inst.id !== id);
    this.saveToStorage();
  }

  deleteStrategy(id: string): void {
    // Remove strategy and all its associated instruments
    this.importedStrategies = this.importedStrategies.filter(strat => strat.id !== id);
    this.hedgingInstruments = this.hedgingInstruments.filter(inst => 
      !inst.strategyName || !inst.importedAt || 
      !this.importedStrategies.find(s => s.timestamp === inst.importedAt)
    );
    this.saveToStorage();
  }

  updateInstrument(id: string, updates: Partial<HedgingInstrument>): void {
    const index = this.hedgingInstruments.findIndex(inst => inst.id === id);
    if (index !== -1) {
      this.hedgingInstruments[index] = { ...this.hedgingInstruments[index], ...updates };
      this.saveToStorage();
    }
  }

  clearAllData(): void {
    this.importedStrategies = [];
    this.hedgingInstruments = [];
    this.saveToStorage();
  }
}

export default StrategyImportService; 