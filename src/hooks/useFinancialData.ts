import { useState, useEffect, useCallback, useRef } from 'react';
import FinancialDataService, { 
  MarketData, 
  ExposureData, 
  HedgingInstrument, 
  RiskMetrics, 
  CurrencyExposure 
} from '../services/FinancialDataService';
import StrategyImportService from '../services/StrategyImportService';

interface UseFinancialDataReturn {
  // Data
  marketData: MarketData;
  exposures: ExposureData[];
  instruments: HedgingInstrument[];
  riskMetrics: RiskMetrics;
  currencyExposures: CurrencyExposure[];
  
  // Actions
  addExposure: (exposure: Omit<ExposureData, 'id'>) => void;
  updateExposure: (id: string, updates: Partial<Omit<ExposureData, 'id'>>) => boolean;
  deleteExposure: (id: string) => boolean;
  addInstrument: (instrument: Omit<HedgingInstrument, 'id' | 'mtm'>) => void;
  updateInstrument: (id: string, updates: Partial<Omit<HedgingInstrument, 'id'>>) => boolean;
  deleteInstrument: (id: string) => boolean;
  updateMarketData: () => void;
  calculateForwardRate: (currencyPair: string, tenor: string) => number;
  calculateOptionPrice: (
    optionType: 'call' | 'put',
    currencyPair: string,
    strike: number,
    timeToMaturity: number,
    volatility?: number
  ) => number;
  generateStressScenarios: () => Array<{
    name: string;
    description: string;
    shocks: { [currencyPair: string]: number };
    impact: number;
  }>;
  syncWithHedgingInstruments: () => void;
  autoGenerateExposures: () => void;
  
  // State
  isLoading: boolean;
  lastUpdate: Date;
  isLiveMode: boolean;
  setLiveMode: (enabled: boolean) => void;
}

export const useFinancialData = (): UseFinancialDataReturn => {
  const serviceRef = useRef<FinancialDataService>(new FinancialDataService());
  const strategyImportServiceRef = useRef<StrategyImportService>(StrategyImportService.getInstance());
  const [isLoading, setIsLoading] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(new Date());
  const [isLiveMode, setIsLiveMode] = useState(false);
  
  // State for reactive data
  const [marketData, setMarketData] = useState<MarketData>(() => 
    serviceRef.current.getMarketData()
  );
  const [exposures, setExposures] = useState<ExposureData[]>(() => 
    serviceRef.current.getExposures()
  );
  const [instruments, setInstruments] = useState<HedgingInstrument[]>(() => 
    serviceRef.current.getInstruments()
  );
  const [riskMetrics, setRiskMetrics] = useState<RiskMetrics>(() => 
    serviceRef.current.calculateRiskMetrics()
  );
  const [currencyExposures, setCurrencyExposures] = useState<CurrencyExposure[]>(() => 
    serviceRef.current.getCurrencyExposures()
  );

  // Load data from localStorage and sync with other parts of the application
  useEffect(() => {
    const loadDataFromStorage = () => {
      try {
        // Load exposures from localStorage
        const savedExposures = localStorage.getItem('fxExposures');
        if (savedExposures) {
          const exposuresData = JSON.parse(savedExposures);
          exposuresData.forEach((exposure: any) => {
            // Convert date strings back to Date objects
            exposure.maturity = new Date(exposure.maturity);
            serviceRef.current.addExposure(exposure);
          });
        }

        // Sync with hedging instruments from StrategyImportService
        syncWithHedgingInstruments();
        
        // Auto-generate exposures if none exist but instruments do
        autoGenerateExposures();
        
        // Update all state
        refreshAllData();
      } catch (error) {
        console.error('Error loading data from storage:', error);
      }
    };

    loadDataFromStorage();

    // Listen for updates from other parts of the application
    const handleHedgingInstrumentsUpdate = () => {
      syncWithHedgingInstruments();
      autoGenerateExposures();
      refreshAllData();
    };

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'hedgingInstruments' || e.key === 'fxExposures') {
        loadDataFromStorage();
      }
    };

    // Add event listeners
    window.addEventListener('hedgingInstrumentsUpdated', handleHedgingInstrumentsUpdate);
    window.addEventListener('storage', handleStorageChange);

    return () => {
      window.removeEventListener('hedgingInstrumentsUpdated', handleHedgingInstrumentsUpdate);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  // Save exposures to localStorage whenever they change
  useEffect(() => {
    const saveExposuresToStorage = () => {
      try {
        const exposuresData = serviceRef.current.getExposures();
        localStorage.setItem('fxExposures', JSON.stringify(exposuresData));
      } catch (error) {
        console.error('Error saving exposures to storage:', error);
      }
    };

    saveExposuresToStorage();
  }, [exposures]);

  // Live mode updates
  useEffect(() => {
    if (!isLiveMode) return;

    const interval = setInterval(() => {
      serviceRef.current.updateMarketData();
      refreshAllData();
    }, 5000); // Update every 5 seconds

    return () => clearInterval(interval);
  }, [isLiveMode]);

  const syncWithHedgingInstruments = useCallback(() => {
    try {
      // Get hedging instruments from StrategyImportService
      const hedgingInstruments = strategyImportServiceRef.current.getHedgingInstruments();
      
      // Clear existing instruments in FinancialDataService (keep exposures)
      serviceRef.current.clearInstruments();
      
      // Convert and add hedging instruments to FinancialDataService
      hedgingInstruments.forEach(hedgingInstrument => {
        // Convert StrategyImportService HedgingInstrument to FinancialDataService HedgingInstrument
        const financialInstrument: Omit<HedgingInstrument, 'id' | 'mtm'> = {
          type: mapInstrumentType(hedgingInstrument.type),
          currencyPair: hedgingInstrument.currency,
          notional: hedgingInstrument.notional,
          strike: hedgingInstrument.strike,
          premium: hedgingInstrument.premium,
          maturity: new Date(hedgingInstrument.maturity),
          counterparty: hedgingInstrument.counterparty || 'Strategy Import',
          hedgeAccounting: hedgingInstrument.hedge_accounting || false,
          effectivenessRatio: hedgingInstrument.effectiveness_ratio || 95
        };
        
        serviceRef.current.addInstrument(financialInstrument);
      });
    } catch (error) {
      console.error('Error syncing with hedging instruments:', error);
    }
  }, []);

  // Auto-generate exposures based on hedging instruments
  const autoGenerateExposures = useCallback(() => {
    try {
      const currentExposures = serviceRef.current.getExposures();
      const currentInstruments = serviceRef.current.getInstruments();
      
      // Only auto-generate if we have instruments but no exposures
      if (currentInstruments.length > 0 && currentExposures.length === 0) {
        console.log('Auto-generating exposures from hedging instruments...');
        
        // Group instruments by currency to create consolidated exposures
        const currencyGroups: { [currency: string]: HedgingInstrument[] } = {};
        
        currentInstruments.forEach(instrument => {
          const currency = extractBaseCurrency(instrument.currencyPair);
          if (!currencyGroups[currency]) {
            currencyGroups[currency] = [];
          }
          currencyGroups[currency].push(instrument);
        });
        
        // Create exposures for each currency group
        Object.entries(currencyGroups).forEach(([currency, instruments]) => {
          const totalNotional = instruments.reduce((sum, inst) => sum + inst.notional, 0);
          const avgMaturity = new Date(
            instruments.reduce((sum, inst) => sum + inst.maturity.getTime(), 0) / instruments.length
          );
          
          // Determine if this should be a receivable or payable based on instrument types
          const hasReceivableInstruments = instruments.some(inst => 
            inst.type === 'vanilla-call' || inst.type === 'forward' || inst.type === 'collar'
          );
          
          const exposureType: 'receivable' | 'payable' = hasReceivableInstruments ? 'receivable' : 'payable';
          const exposureAmount = exposureType === 'receivable' ? totalNotional : -totalNotional;
          
          // Calculate hedge ratio (assume 100% hedged since we have instruments)
          const hedgeRatio = 100;
          const hedgedAmount = exposureType === 'receivable' ? totalNotional : -totalNotional;
          
          const autoExposure: Omit<ExposureData, 'id'> = {
            currency: currency,
            amount: exposureAmount,
            type: exposureType,
            maturity: avgMaturity,
            description: `Auto-generated from ${instruments.length} hedging instrument(s)`,
            subsidiary: 'Auto-Generated',
            hedgeRatio: hedgeRatio,
            hedgedAmount: hedgedAmount
          };
          
          serviceRef.current.addExposure(autoExposure);
          console.log(`Created auto-exposure for ${currency}: ${exposureAmount}`);
        });
        
        // Dispatch event to notify that exposures were auto-generated
        window.dispatchEvent(new CustomEvent('exposuresAutoGenerated', {
          detail: { count: Object.keys(currencyGroups).length }
        }));
      }
    } catch (error) {
      console.error('Error auto-generating exposures:', error);
    }
  }, []);

  // Helper function to extract base currency from currency pair
  const extractBaseCurrency = (currencyPair: string): string => {
    // Handle common currency pair formats
    if (currencyPair.includes('/')) {
      return currencyPair.split('/')[0];
    }
    if (currencyPair.length === 6) {
      return currencyPair.substring(0, 3);
    }
    // Fallback for other formats
    return currencyPair.substring(0, 3);
  };

  // Helper function to map instrument types
  const mapInstrumentType = (type: string): 'forward' | 'vanilla-call' | 'vanilla-put' | 'collar' | 'swap' | 'barrier' => {
    const typeMap: { [key: string]: 'forward' | 'vanilla-call' | 'vanilla-put' | 'collar' | 'swap' | 'barrier' } = {
      'Forward': 'forward',
      'Vanilla Call': 'vanilla-call',
      'Vanilla Put': 'vanilla-put',
      'Swap': 'swap',
      'Knock-Out Call': 'barrier',
      'Knock-Out Put': 'barrier',
      'Knock-In Call': 'barrier',
      'Knock-In Put': 'barrier',
      'Double Knock-Out Call': 'barrier',
      'Double Knock-Out Put': 'barrier',
      'One-Touch': 'barrier',
      'No-Touch': 'barrier',
      'Double-Touch': 'barrier',
      'Double-No-Touch': 'barrier',
      'Range Binary': 'barrier',
      'Outside Binary': 'barrier'
    };
    
    return typeMap[type] || 'barrier';
  };

  const refreshAllData = useCallback(() => {
    setMarketData(serviceRef.current.getMarketData());
    setExposures(serviceRef.current.getExposures());
    setInstruments(serviceRef.current.getInstruments());
    setRiskMetrics(serviceRef.current.calculateRiskMetrics());
    setCurrencyExposures(serviceRef.current.getCurrencyExposures());
    setLastUpdate(new Date());
  }, []);

  const addExposure = useCallback((exposure: Omit<ExposureData, 'id'>) => {
    setIsLoading(true);
    try {
      serviceRef.current.addExposure(exposure);
      refreshAllData();
    } finally {
      setIsLoading(false);
    }
  }, [refreshAllData]);

  const updateExposure = useCallback((id: string, updates: Partial<Omit<ExposureData, 'id'>>) => {
    setIsLoading(true);
    try {
      const result = serviceRef.current.updateExposure(id, updates);
      if (result) {
        refreshAllData();
      }
      return result;
    } finally {
      setIsLoading(false);
    }
  }, [refreshAllData]);

  const deleteExposure = useCallback((id: string) => {
    setIsLoading(true);
    try {
      const result = serviceRef.current.deleteExposure(id);
      if (result) {
        refreshAllData();
      }
      return result;
    } finally {
      setIsLoading(false);
    }
  }, [refreshAllData]);

  const addInstrument = useCallback((instrument: Omit<HedgingInstrument, 'id' | 'mtm'>) => {
    setIsLoading(true);
    try {
      serviceRef.current.addInstrument(instrument);
      refreshAllData();
    } finally {
      setIsLoading(false);
    }
  }, [refreshAllData]);

  const updateInstrument = useCallback((id: string, updates: Partial<Omit<HedgingInstrument, 'id'>>) => {
    setIsLoading(true);
    try {
      const result = serviceRef.current.updateInstrument(id, updates);
      if (result) {
        refreshAllData();
      }
      return result;
    } finally {
      setIsLoading(false);
    }
  }, [refreshAllData]);

  const deleteInstrument = useCallback((id: string) => {
    setIsLoading(true);
    try {
      const result = serviceRef.current.deleteInstrument(id);
      if (result) {
        refreshAllData();
      }
      return result;
    } finally {
      setIsLoading(false);
    }
  }, [refreshAllData]);

  const updateMarketData = useCallback(() => {
    serviceRef.current.updateMarketData();
    refreshAllData();
  }, [refreshAllData]);

  const calculateForwardRate = useCallback((currencyPair: string, tenor: string) => {
    return serviceRef.current.calculateForwardRate(currencyPair, tenor);
  }, []);

  const calculateOptionPrice = useCallback((
    optionType: 'call' | 'put',
    currencyPair: string,
    strike: number,
    timeToMaturity: number,
    volatility?: number
  ) => {
    return serviceRef.current.calculateOptionPrice(optionType, currencyPair, strike, timeToMaturity, volatility);
  }, []);

  const generateStressScenarios = useCallback(() => {
    return serviceRef.current.generateStressScenarios();
  }, []);

  const setLiveMode = useCallback((enabled: boolean) => {
    setIsLiveMode(enabled);
    if (enabled) {
      // Immediate update when enabling live mode
      updateMarketData();
    }
  }, [updateMarketData]);

  return {
    // Data
    marketData,
    exposures,
    instruments,
    riskMetrics,
    currencyExposures,
    
    // Actions
    addExposure,
    updateExposure,
    deleteExposure,
    addInstrument,
    updateInstrument,
    deleteInstrument,
    updateMarketData,
    calculateForwardRate,
    calculateOptionPrice,
    generateStressScenarios,
    syncWithHedgingInstruments,
    autoGenerateExposures,
    
    // State
    isLoading,
    lastUpdate,
    isLiveMode,
    setLiveMode
  };
}; 