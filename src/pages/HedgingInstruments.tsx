import React, { useState, useEffect } from "react";
import { Layout } from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { toast } from "@/components/ui/use-toast";
import { 
  Plus, 
  Shield, 
  TrendingUp,
  TrendingDown,
  Clock,
  Target,
  ArrowUpDown,
  BarChart3,
  Edit,
  Trash2,
  Eye,
  Download,
  AlertCircle,
  Calculator,
  RefreshCw
} from "lucide-react";
import StrategyImportService, { HedgingInstrument } from "@/services/StrategyImportService";
import { PricingService } from "@/services/PricingService";

// Interface pour les paramètres de marché par devise
interface CurrencyMarketData {
  spot: number;
  volatility: number;
  domesticRate: number;
  foreignRate: number;
}

const HedgingInstruments = () => {
  const [selectedTab, setSelectedTab] = useState("all");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [instruments, setInstruments] = useState<HedgingInstrument[]>([]);
  const [importService] = useState(() => StrategyImportService.getInstance());
  
  // MTM Calculation states - maintenant par devise
  const [valuationDate, setValuationDate] = useState(new Date().toISOString().split('T')[0]);
  const [currencyMarketData, setCurrencyMarketData] = useState<{ [currency: string]: CurrencyMarketData }>({});
  const [isRecalculating, setIsRecalculating] = useState(false);

  // Pricing model states - récupérer depuis le localStorage pour utiliser les mêmes paramètres que Strategy Builder
  const [optionPricingModel, setOptionPricingModel] = useState<'black-scholes' | 'garman-kohlhagen' | 'monte-carlo'>(() => {
    const savedState = localStorage.getItem('calculatorState');
    if (savedState) {
      const state = JSON.parse(savedState);
      // Chercher optionPricingModel dans les paramètres sauvegardés
      return state.optionPricingModel || 'garman-kohlhagen';
    }
    return 'garman-kohlhagen';
  });
  
  const [barrierPricingModel, setBarrierPricingModel] = useState<'monte-carlo' | 'closed-form'>(() => {
    const savedState = localStorage.getItem('calculatorState');
    if (savedState) {
      const state = JSON.parse(savedState);
      return state.barrierPricingModel || 'monte-carlo';
    }
    return 'monte-carlo';
  });
  
  const [barrierOptionSimulations, setBarrierOptionSimulations] = useState<number>(() => {
    const savedState = localStorage.getItem('calculatorState');
    if (savedState) {
      const state = JSON.parse(savedState);
      return state.barrierOptionSimulations || 1000;
    }
    return 1000;
  });
  
  const [useImpliedVol, setUseImpliedVol] = useState<boolean>(() => {
    const savedState = localStorage.getItem('calculatorState');
    if (savedState) {
      const state = JSON.parse(savedState);
      return state.useImpliedVol || false;
    }
    return false;
  });
  
  const [impliedVolatilities, setImpliedVolatilities] = useState(() => {
    const savedState = localStorage.getItem('calculatorState');
    if (savedState) {
      const state = JSON.parse(savedState);
      return state.impliedVolatilities || {};
    }
    return {};
  });

  // Fonction pour extraire les devises uniques des instruments
  const getUniqueCurrencies = (instruments: HedgingInstrument[]): string[] => {
    const currencies = new Set<string>();
    instruments.forEach(instrument => {
      if (instrument.currency) {
        currencies.add(instrument.currency);
      }
    });
    return Array.from(currencies).sort();
  };

  // Fonction pour initialiser les données de marché par défaut pour une devise
  const getDefaultMarketDataForCurrency = (currency: string): CurrencyMarketData => {
    const defaultData: { [key: string]: CurrencyMarketData } = {
      'EUR/USD': { spot: 1.0850, volatility: 20, domesticRate: 1.0, foreignRate: 0.5 },
      'GBP/USD': { spot: 1.2650, volatility: 22, domesticRate: 1.0, foreignRate: 1.5 },
      'USD/JPY': { spot: 149.50, volatility: 18, domesticRate: 1.0, foreignRate: 0.1 },
      'USD/CHF': { spot: 0.9125, volatility: 16, domesticRate: 1.0, foreignRate: 0.25 },
      'AUD/USD': { spot: 0.6750, volatility: 24, domesticRate: 1.0, foreignRate: 2.0 },
      'USD/CAD': { spot: 1.3425, volatility: 19, domesticRate: 1.0, foreignRate: 1.25 },
    };
    
    return defaultData[currency] || { spot: 1.0000, volatility: 20, domesticRate: 1.0, foreignRate: 1.0 };
  };

  // Load instruments from the import service
  useEffect(() => {
    const loadInstruments = () => {
      const importedInstruments = importService.getHedgingInstruments();
      setInstruments(importedInstruments);
      
      // Initialiser les données de marché pour les nouvelles devises
      const uniqueCurrencies = getUniqueCurrencies(importedInstruments);
      setCurrencyMarketData(prevData => {
        const newData = { ...prevData };
        uniqueCurrencies.forEach(currency => {
          if (!newData[currency]) {
            newData[currency] = getDefaultMarketDataForCurrency(currency);
          }
        });
        return newData;
      });
    };

    loadInstruments();
    
    // Listen for storage changes to update instruments when new strategies are imported
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'hedgingInstruments') {
        loadInstruments();
      }
    };

    window.addEventListener('storage', handleStorageChange);
    
    // Also listen for custom events from the same tab
    const handleCustomUpdate = () => {
      loadInstruments();
    };
    
    window.addEventListener('hedgingInstrumentsUpdated', handleCustomUpdate);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('hedgingInstrumentsUpdated', handleCustomUpdate);
    };
  }, [importService]);

  // Utiliser exactement la même logique de pricing que Strategy Builder

  const calculateTimeToMaturity = (maturityDate: string, valuationDate: string): number => {
    const maturity = new Date(maturityDate);
    const valuation = new Date(valuationDate);
    const diffTime = maturity.getTime() - valuation.getTime();
    const diffDays = diffTime / (1000 * 3600 * 24);
    return Math.max(0, diffDays / 365.25); // Convert to years
  };

  // Error function (erf) implementation - identique à Index.tsx
  const erf = (x: number): number => {
    const a1 =  0.254829592;
    const a2 = -0.284496736;
    const a3 =  1.421413741;
    const a4 = -1.453152027;
    const a5 =  1.061405429;
    const p  =  0.3275911;
    
    const sign = x < 0 ? -1 : 1;
    x = Math.abs(x);
    
    const t = 1.0/(1.0 + p*x);
    const y = 1.0 - ((((((a5*t + a4)*t) + a3)*t + a2)*t + a1)*t*Math.exp(-x*x));
    
    return sign*y;
  };

  // Function to get implied volatility - identique à Index.tsx
  const getImpliedVolatility = (monthKey: string, optionKey?: string) => {
    if (!useImpliedVol) return null;
    
    if (optionKey && impliedVolatilities[monthKey] && impliedVolatilities[monthKey][optionKey] !== undefined) {
      return impliedVolatilities[monthKey][optionKey];
    }
    
    if (impliedVolatilities[monthKey] && impliedVolatilities[monthKey].global !== undefined) {
      return impliedVolatilities[monthKey].global;
    }
    
    return null;
  };

  // Fonction calculateOptionPrice adaptée pour les instruments importés - maintenant utilise les données par devise
  const calculateOptionPrice = (type: string, S: number, K: number, r: number, t: number, sigma: number, instrument: HedgingInstrument, date?: Date, optionIndex?: number) => {
    // Utilize the volatility implied if available
    let effectiveSigma = sigma;
    if (date && useImpliedVol) {
      const monthKey = `${date.getFullYear()}-${date.getMonth() + 1}`;
      const optionKey = optionIndex !== undefined ? `${type}-${optionIndex}` : undefined;
      const iv = getImpliedVolatility(monthKey, optionKey);
      
      if (iv !== null) {
        effectiveSigma = iv / 100;
      }
    }

    // If it's a barrier option, use Monte Carlo simulation or closed-form solution based on flag
    if (type.includes('knockout') || type.includes('knockin')) {
      // Récupérer les paramètres depuis l'originalComponent de l'instrument
      const originalComponent = instrument.originalComponent;
      if (!originalComponent) {
        console.warn('Missing originalComponent for barrier option:', instrument.id);
        return 0;
      }

      // Calculate barrier values
      const barrier = originalComponent.barrierType === 'percent' ? 
        S * (originalComponent.barrier / 100) : 
        originalComponent.barrier;
        
      const secondBarrier = originalComponent.type.includes('double') ? 
        (originalComponent.barrierType === 'percent' ? 
          S * (originalComponent.secondBarrier / 100) : 
          originalComponent.secondBarrier) : 
        undefined;

      if (barrierPricingModel === 'closed-form') {
        return PricingService.calculateBarrierOptionClosedForm(
          type, S, K, r, t, effectiveSigma, barrier, secondBarrier
        );
      } else {
        return PricingService.calculateBarrierOptionPrice(
          type, S, K, r, t, effectiveSigma, barrier, secondBarrier, barrierOptionSimulations
        );
      }
    }

    // If it's a digital option, use Monte Carlo simulation
    if (type.includes('one-touch') || type.includes('no-touch') || type.includes('double-touch') || 
        type.includes('double-no-touch') || type.includes('range-binary') || type.includes('outside-binary')) {
      
      const originalComponent = instrument.originalComponent;
      if (!originalComponent) {
        console.warn('Missing originalComponent for digital option:', instrument.id);
        return 0;
      }

      const barrier = originalComponent.barrierType === 'percent' ? 
        S * (originalComponent.barrier / 100) : 
        originalComponent.barrier;
        
      const secondBarrier = originalComponent.type.includes('double') ? 
        (originalComponent.barrierType === 'percent' ? 
          S * (originalComponent.secondBarrier / 100) : 
          originalComponent.secondBarrier) : 
        undefined;

      const rebate = (originalComponent.rebate || 5) / 100;

      return PricingService.calculateDigitalOptionPrice(
        type, S, K, r, t, effectiveSigma, barrier, secondBarrier, 10000, rebate
      );
    }

    // For vanilla options, use the selected pricing model
    if (optionPricingModel === 'monte-carlo') {
      // Use domestic and foreign rates for FX options
      const marketData = currencyMarketData[instrument.currency];
      if (marketData) {
        return PricingService.calculateVanillaOptionMonteCarlo(
          type, S, K, marketData.domesticRate / 100, marketData.foreignRate / 100, t, effectiveSigma
        );
      }
    }

    // Default to Garman-Kohlhagen for FX options
    const marketData = currencyMarketData[instrument.currency];
    if (marketData) {
      return PricingService.calculateGarmanKohlhagenPrice(
        type, S, K, marketData.domesticRate / 100, marketData.foreignRate / 100, t, effectiveSigma
      );
    }

    // Fallback to Black-Scholes if no market data
    return PricingService.calculateGarmanKohlhagenPrice(type, S, K, r, 0, t, effectiveSigma);
  };

  // Fonction calculateTodayPrice adaptée pour utiliser les données par devise
  const calculateTodayPrice = (instrument: HedgingInstrument): number => {
    const marketData = currencyMarketData[instrument.currency];
    if (!marketData) {
      console.warn(`No market data found for currency: ${instrument.currency}`);
      return 0;
    }

    const timeToMaturity = calculateTimeToMaturity(instrument.maturity, valuationDate);
    
    if (timeToMaturity <= 0) {
      // Option has expired
      return 0;
    }

    const S = marketData.spot;
    const sigma = marketData.volatility / 100;
    const r_d = marketData.domesticRate / 100;
    const r_f = marketData.foreignRate / 100;

    // Calculate forward price (same as Strategy Builder)
    const forward = S * Math.exp((r_d - r_f) * timeToMaturity);

    // Use the strike from the instrument
    const K = instrument.strike || S;

    // Map instrument type to option type for pricing
    let optionType = instrument.type.toLowerCase();
    
    // Handle different instrument type formats and calculate price using Strategy Builder logic
    if (optionType.includes('call')) {
      optionType = 'call';
      // Use Garman-Kohlhagen pricing (same as Strategy Builder)
      return PricingService.calculateGarmanKohlhagenPrice(
        'call',
        S,
        K,
        r_d,
        r_f,
        timeToMaturity,
        sigma
      );
    } else if (optionType.includes('put')) {
      optionType = 'put';
      // Use Garman-Kohlhagen pricing (same as Strategy Builder)
      return PricingService.calculateGarmanKohlhagenPrice(
        'put',
        S,
        K,
        r_d,
        r_f,
        timeToMaturity,
        sigma
      );
    } else if (optionType === 'forward') {
      // For forwards, calculate the value as difference between forward and strike, discounted
      return (forward - K) * Math.exp(-r_d * timeToMaturity);
    } else if (optionType === 'swap') {
      // For swaps, use forward price as approximation
      return forward;
    } else if (optionType.includes('knockout') || optionType.includes('knockin')) {
      // For barrier options, use the same logic as Strategy Builder
      const barrier = instrument.barrier || K * 1.1; // Default barrier if not specified
      const secondBarrier = instrument.secondBarrier;
      
      // Use closed-form barrier option pricing (same as Strategy Builder)
      return PricingService.calculateBarrierOptionClosedForm(
        instrument.type,
        S,
        K,
        r_d,
        timeToMaturity,
        sigma,
        barrier,
        secondBarrier
      );
    } else if (optionType.includes('touch') || optionType.includes('binary')) {
      // For digital options, use the same logic as Strategy Builder
      const barrier = instrument.barrier || K;
      const secondBarrier = instrument.secondBarrier;
      const rebate = instrument.rebate || 1;
      
      return PricingService.calculateDigitalOptionPrice(
        instrument.type,
        S,
        K,
        r_d,
        timeToMaturity,
        sigma,
        barrier,
        secondBarrier,
        10000, // Number of simulations
        rebate
      );
    }

    // Fallback to Garman-Kohlhagen for unknown types
    return PricingService.calculateGarmanKohlhagenPrice(
      'call', // Default to call
      S,
      K,
      r_d,
      r_f,
      timeToMaturity,
      sigma
    );
  };

  // Fonction pour mettre à jour les données de marché d'une devise spécifique
  const updateCurrencyMarketData = (currency: string, field: keyof CurrencyMarketData, value: number) => {
    setCurrencyMarketData(prev => ({
      ...prev,
      [currency]: {
        ...prev[currency],
        [field]: value
      }
    }));
  };

  // Fonction pour appliquer les données par défaut d'une paire de devises
  const applyDefaultDataForCurrency = (currency: string) => {
    const defaultData = getDefaultMarketDataForCurrency(currency);
    setCurrencyMarketData(prev => ({
      ...prev,
      [currency]: defaultData
    }));
    
    toast({
      title: "Market Data Updated",
      description: `Applied default parameters for ${currency}`,
    });
  };

  const recalculateAllMTM = async () => {
    setIsRecalculating(true);
    
    try {
      // Small delay to show loading state
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Force re-render by updating state
      setInstruments([...instruments]);
      
      toast({
        title: "MTM Recalculated",
        description: `Updated prices for ${instruments.length} instruments using valuation date ${valuationDate}`,
      });
    } catch (error) {
      toast({
        title: "Calculation Error",
        description: "Failed to recalculate MTM. Please check your parameters.",
        variant: "destructive"
      });
    } finally {
      setIsRecalculating(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return <Badge className="bg-green-100 text-green-800 border-green-200">Active</Badge>;
      case "matured":
        return <Badge variant="secondary">Matured</Badge>;
      case "cancelled":
        return <Badge variant="destructive">Cancelled</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getInstrumentIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case "forward":
        return <ArrowUpDown className="h-4 w-4 text-blue-600" />;
      case "vanilla call":
      case "vanilla put":
        return <TrendingUp className="h-4 w-4 text-green-600" />;
      case "swap":
        return <BarChart3 className="h-4 w-4 text-purple-600" />;
      case "collar":
        return <Shield className="h-4 w-4 text-orange-600" />;
      default:
        return <Target className="h-4 w-4 text-gray-600" />;
    }
  };

  const getMTMColor = (mtm: number) => {
    return mtm >= 0 ? "text-green-600" : "text-red-600";
  };

  // Delete instrument function
  const deleteInstrument = (id: string) => {
    importService.deleteInstrument(id);
    const updatedInstruments = importService.getHedgingInstruments();
    setInstruments(updatedInstruments);
    
    // Dispatch custom event to notify other components
    window.dispatchEvent(new CustomEvent('hedgingInstrumentsUpdated'));
    
    toast({
      title: "Instrument Deleted",
      description: "The hedging instrument has been removed successfully.",
    });
  };

  const filteredInstruments = instruments.filter(instrument => {
    const matchesTab = selectedTab === "all" || 
                      (selectedTab === "forwards" && instrument.type === "Forward") ||
                      (selectedTab === "options" && (instrument.type.includes("Call") || instrument.type.includes("Put") || instrument.type === "Collar")) ||
                      (selectedTab === "swaps" && instrument.type === "Swap") ||
                      (selectedTab === "hedge-accounting" && instrument.hedge_accounting);
    
    return matchesTab;
  });

  // Summary calculations
  const totalNotional = instruments.reduce((sum, inst) => {
    // Calculate the same way as displayed in the table
    const quantityToHedge = inst.quantity || 0;
    const unitPrice = inst.realOptionPrice || inst.premium || 0;
    const volumeToHedge = inst.notional;
    const calculatedNotional = unitPrice * volumeToHedge;
    
    // Use the same logic as in the table display
    const displayedNotional = calculatedNotional > 0 ? calculatedNotional : inst.notional;
    return sum + displayedNotional;
  }, 0);
  
  // Calculate total MTM using our pricing functions with currency-specific data
  const totalMTM = instruments.reduce((sum, inst) => {
    const marketData = currencyMarketData[inst.currency];
    if (!marketData) {
      console.warn(`No market data for currency ${inst.currency}, skipping MTM calculation`);
      return sum;
    }
    
    // Use the original premium paid/received for the instrument
    const originalPrice = inst.realOptionPrice || inst.premium || 0;
    
    // Calculate today's theoretical price using the same logic as Strategy Builder
    const todayPrice = calculateTodayPrice(inst);
    
    // MTM = (Today's Price - Original Price) * Notional
    // For sold options (negative quantity), the MTM calculation is inverted
    const quantity = inst.quantity || 1;
    const isShort = quantity < 0;
    
    let mtmValue;
    if (isShort) {
      // For short positions: MTM = Original Price - Today's Price
      mtmValue = originalPrice - todayPrice;
    } else {
      // For long positions: MTM = Today's Price - Original Price  
      mtmValue = todayPrice - originalPrice;
    }
    
    return sum + (mtmValue * Math.abs(inst.notional));
  }, 0);
  
  const hedgeAccountingCount = instruments.filter(inst => inst.hedge_accounting).length;

  return (
    <Layout 
      breadcrumbs={[
        { label: "Dashboard", href: "/" },
        { label: "Hedging Instruments" }
      ]}
    >
      {/* MTM Calculation Controls */}
      <Card className="mb-4">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5" />
            MTM Valuation Parameters
          </CardTitle>
          <CardDescription>
            Configure market parameters for Mark-to-Market calculations
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Valuation Date - Global */}
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="valuation-date">Valuation Date</Label>
                <Input
                  id="valuation-date"
                  type="date"
                  value={valuationDate}
                  onChange={(e) => setValuationDate(e.target.value)}
                  className="font-mono"
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label>&nbsp;</Label>
                <Button 
                  onClick={recalculateAllMTM}
                  disabled={isRecalculating}
                  className="w-full"
                >
                  {isRecalculating ? (
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Calculator className="h-4 w-4 mr-2" />
                  )}
                  {isRecalculating ? "Calculating..." : "Recalculate All MTM"}
                </Button>
              </div>
            </div>

            {/* Market Data per Currency */}
            {getUniqueCurrencies(instruments).length > 0 ? (
              <div className="space-y-3">
                <Label className="text-sm font-medium text-muted-foreground">
                  Market Parameters by Currency ({getUniqueCurrencies(instruments).length} currencies found)
                </Label>
                {getUniqueCurrencies(instruments).map((currency) => {
                  const data = currencyMarketData[currency] || getDefaultMarketDataForCurrency(currency);
                  return (
                    <div key={currency} className="border rounded-lg p-4 bg-muted/20">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="font-mono font-semibold">
                            {currency}
                          </Badge>
                          <span className="text-sm text-muted-foreground">
                            {instruments.filter(inst => inst.currency === currency).length} instrument(s)
                          </span>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => applyDefaultDataForCurrency(currency)}
                          className="text-xs"
                        >
                          Reset to Default
                        </Button>
                      </div>
                      <div className="grid gap-3 md:grid-cols-4">
                        <div className="space-y-1">
                          <Label htmlFor={`spot-${currency}`} className="text-xs">Spot Rate</Label>
                          <Input
                            id={`spot-${currency}`}
                            type="number"
                            step="0.0001"
                            value={data.spot}
                            onChange={(e) => updateCurrencyMarketData(currency, 'spot', parseFloat(e.target.value) || data.spot)}
                            className="font-mono text-sm"
                            placeholder="1.0850"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label htmlFor={`vol-${currency}`} className="text-xs">Volatility (%)</Label>
                          <Input
                            id={`vol-${currency}`}
                            type="number"
                            step="0.1"
                            min="0"
                            max="100"
                            value={data.volatility}
                            onChange={(e) => updateCurrencyMarketData(currency, 'volatility', parseFloat(e.target.value) || data.volatility)}
                            className="font-mono text-sm"
                            placeholder="20"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label htmlFor={`dom-${currency}`} className="text-xs">Domestic Rate (%)</Label>
                          <Input
                            id={`dom-${currency}`}
                            type="number"
                            step="0.01"
                            min="0"
                            max="20"
                            value={data.domesticRate}
                            onChange={(e) => updateCurrencyMarketData(currency, 'domesticRate', parseFloat(e.target.value) || data.domesticRate)}
                            className="font-mono text-sm"
                            placeholder="1.0"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label htmlFor={`for-${currency}`} className="text-xs">Foreign Rate (%)</Label>
                          <Input
                            id={`for-${currency}`}
                            type="number"
                            step="0.01"
                            min="0"
                            max="20"
                            value={data.foreignRate}
                            onChange={(e) => updateCurrencyMarketData(currency, 'foreignRate', parseFloat(e.target.value) || data.foreignRate)}
                            className="font-mono text-sm"
                            placeholder="0.5"
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <AlertCircle className="h-8 w-8 mx-auto mb-2" />
                <p>No instruments found. Import strategies from Strategy Builder to see market parameters.</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Notional</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalNotional)}</div>
            <p className="text-xs text-muted-foreground">
              Across {instruments.length} instruments
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Mark-to-Market</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${getMTMColor(totalMTM)}`}>
              {formatCurrency(totalMTM)}
            </div>
            <p className="text-xs text-muted-foreground">
              Unrealized P&L
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Hedge Accounting</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{hedgeAccountingCount}</div>
            <p className="text-xs text-muted-foreground">
              Qualifying instruments
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Near Maturity</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">2</div>
            <p className="text-xs text-muted-foreground">
              Next 30 days
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Hedging Instruments</CardTitle>
              <CardDescription>
                Manage forwards, options, swaps and other hedging instruments
              </CardDescription>
            </div>
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Instrument
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[600px]">
                <DialogHeader>
                  <DialogTitle>Add New Hedging Instrument</DialogTitle>
                  <DialogDescription>
                    Create a new hedging instrument entry.
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="instrument-type" className="text-right">
                      Type
                    </Label>
                    <Select>
                      <SelectTrigger className="col-span-3">
                        <SelectValue placeholder="Select instrument type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="forward">Forward Contract</SelectItem>
                        <SelectItem value="vanilla-call">Vanilla Call</SelectItem>
                        <SelectItem value="vanilla-put">Vanilla Put</SelectItem>
                        <SelectItem value="collar">Collar</SelectItem>
                        <SelectItem value="swap">Currency Swap</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="currency-pair" className="text-right">
                      Currency Pair
                    </Label>
                    <Select>
                      <SelectTrigger className="col-span-3">
                        <SelectValue placeholder="Select currency pair" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="EURUSD">EUR/USD</SelectItem>
                        <SelectItem value="GBPUSD">GBP/USD</SelectItem>
                        <SelectItem value="USDJPY">USD/JPY</SelectItem>
                        <SelectItem value="USDCHF">USD/CHF</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="notional" className="text-right">
                      Notional
                    </Label>
                    <Input
                      id="notional"
                      type="number"
                      placeholder="1000000"
                      className="col-span-3"
                    />
                  </div>
                  
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="rate" className="text-right">
                      Rate/Strike
                    </Label>
                    <Input
                      id="rate"
                      type="number"
                      step="0.0001"
                      placeholder="1.0850"
                      className="col-span-3"
                    />
                  </div>
                  
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="maturity" className="text-right">
                      Maturity
                    </Label>
                    <Input
                      id="maturity"
                      type="date"
                      className="col-span-3"
                    />
                  </div>
                  
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="counterparty" className="text-right">
                      Counterparty
                    </Label>
                    <Select>
                      <SelectTrigger className="col-span-3">
                        <SelectValue placeholder="Select counterparty" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="deutsche-bank">Deutsche Bank</SelectItem>
                        <SelectItem value="hsbc">HSBC</SelectItem>
                        <SelectItem value="jpmorgan">JPMorgan</SelectItem>
                        <SelectItem value="bnp-paribas">BNP Paribas</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <DialogFooter>
                  <Button type="submit">Add Instrument</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {/* Tabs */}
          <Tabs value={selectedTab} onValueChange={setSelectedTab}>
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="forwards">Forwards</TabsTrigger>
              <TabsTrigger value="options">Options</TabsTrigger>
              <TabsTrigger value="swaps">Swaps</TabsTrigger>
              <TabsTrigger value="hedge-accounting">Hedge Accounting</TabsTrigger>
            </TabsList>
            
            <TabsContent value={selectedTab} className="mt-4">
              {filteredInstruments.length === 0 ? (
                <div className="text-center py-12">
                  <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No Hedging Instruments</h3>
                  <p className="text-muted-foreground mb-4">
                    You haven't imported any strategies yet. Create and import strategies from the Strategy Builder.
                  </p>
                  <div className="flex gap-2 justify-center">
                    <Button asChild>
                      <a href="/strategy-builder">
                        <Target className="h-4 w-4 mr-2" />
                        Go to Strategy Builder
                      </a>
                    </Button>
                    <Button variant="outline" onClick={() => setIsAddDialogOpen(true)}>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Manual Instrument
                    </Button>
                  </div>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ID</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Currency Pair</TableHead>
                      <TableHead>Quantity to Hedge (%)</TableHead>
                      <TableHead>Unit Price (Initial)</TableHead>
                      <TableHead>Today Price</TableHead>
                      <TableHead>MTM</TableHead>
                      <TableHead>Time to Maturity</TableHead>
                      <TableHead>Volatility (%)</TableHead>
                      <TableHead>Volume to Hedge</TableHead>
                      <TableHead>Notional</TableHead>
                      <TableHead>Rate/Strike</TableHead>
                      <TableHead>Maturity</TableHead>
                      <TableHead>Effectiveness</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredInstruments.map((instrument) => {
                      // Calculate derived values
                      const quantityToHedge = instrument.quantity || 0;
                      // Use real option price from Detailed Results if available, otherwise use premium
                      const unitPrice = instrument.realOptionPrice || instrument.premium || 0;
                      // Calculate today's price using current market parameters
                      const todayPrice = calculateTodayPrice(instrument);
                      
                      // Calculate MTM with proper long/short logic (same as total MTM calculation)
                      const isShort = quantityToHedge < 0;
                      let mtmValue;
                      if (isShort) {
                        // For short positions: MTM = Original Price - Today's Price
                        mtmValue = unitPrice - todayPrice;
                      } else {
                        // For long positions: MTM = Today's Price - Original Price  
                        mtmValue = todayPrice - unitPrice;
                      }
                      // Calculate time to maturity
                      const timeToMaturity = calculateTimeToMaturity(instrument.maturity, valuationDate);
                      // Use implied volatility from Detailed Results if available, otherwise use component volatility
                      const volatility = instrument.impliedVolatility || instrument.volatility || 0;
                      // FIX: Le notional contient déjà la quantité appliquée, donc volumeToHedge = notional
                      const volumeToHedge = instrument.notional; // Plus de double multiplication
                      const calculatedNotional = unitPrice * volumeToHedge;
                      
                      return (
                        <TableRow key={instrument.id}>
                          <TableCell className="font-medium">{instrument.id}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {getInstrumentIcon(instrument.type)}
                              <div>
                                <div>{instrument.type}</div>
                                {instrument.strategyName && (
                                  <div className="text-xs text-muted-foreground">
                                    From: {instrument.strategyName}
                                  </div>
                                )}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="font-mono">
                              {instrument.currency}
                            </Badge>
                          </TableCell>
                          <TableCell className="font-mono text-center">
                            {quantityToHedge.toFixed(1)}%
                          </TableCell>
                          <TableCell className="font-mono text-right">
                            {unitPrice > 0 ? unitPrice.toFixed(4) : 'N/A'}
                          </TableCell>
                          <TableCell className="font-mono text-right">
                            <span className={todayPrice > 0 ? "text-blue-600" : "text-gray-500"}>
                              {todayPrice > 0 ? todayPrice.toFixed(4) : 'N/A'}
                            </span>
                          </TableCell>
                          <TableCell className="font-mono text-right">
                            <span className={`font-medium ${getMTMColor(mtmValue)}`}>
                              {Math.abs(mtmValue) > 0.0001 ? (mtmValue >= 0 ? '+' : '') + mtmValue.toFixed(4) : '0.0000'}
                            </span>
                          </TableCell>
                          <TableCell className="font-mono text-center">
                            <span className={timeToMaturity <= 0.1 ? "text-red-600 font-medium" : "text-gray-600"}>
                              {timeToMaturity > 0 ? `${(timeToMaturity * 365).toFixed(0)}d` : 'Expired'}
                            </span>
                          </TableCell>
                          <TableCell className="font-mono text-center">
                            {volatility > 0 ? volatility.toFixed(1) + '%' : 'N/A'}
                          </TableCell>
                          <TableCell className="font-mono text-right">
                            {formatCurrency(volumeToHedge)}
                          </TableCell>
                          <TableCell className="font-mono text-right">
                            {calculatedNotional > 0 ? formatCurrency(calculatedNotional) : formatCurrency(instrument.notional)}
                          </TableCell>
                          <TableCell className="font-mono">
                            {instrument.strike ? instrument.strike.toFixed(4) : 'N/A'}
                          </TableCell>
                          <TableCell>{instrument.maturity}</TableCell>
                        <TableCell>
                          {instrument.effectiveness_ratio ? (
                            <div className="flex items-center gap-2">
                              <Progress 
                                value={instrument.effectiveness_ratio} 
                                className="w-16 h-2" 
                              />
                              <span className="text-sm font-medium">
                                {instrument.effectiveness_ratio}%
                              </span>
                            </div>
                          ) : (
                            <span className="text-muted-foreground">N/A</span>
                          )}
                        </TableCell>
                        <TableCell>{getStatusBadge(instrument.status)}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Button variant="ghost" size="sm" title="View Details">
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="sm" title="Edit">
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              title="Delete"
                              onClick={() => deleteInstrument(instrument.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Hedge Effectiveness Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Hedge Effectiveness Summary</CardTitle>
          <CardDescription>
            Overview of hedge accounting qualifying instruments
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {instruments.filter(inst => inst.hedge_accounting).map((instrument) => (
              <div key={instrument.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-4">
                  {getInstrumentIcon(instrument.type)}
                  <div>
                    <div className="font-medium">{instrument.id} - {instrument.type}</div>
                    <div className="text-sm text-muted-foreground">
                      {instrument.currency} • {formatCurrency(instrument.notional)}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <div className="text-sm font-medium">Effectiveness Ratio</div>
                    <div className="text-lg font-bold">
                      {instrument.effectiveness_ratio}%
                    </div>
                  </div>
                  <Progress 
                    value={instrument.effectiveness_ratio || 0} 
                    className="w-24 h-3" 
                  />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </Layout>
  );
};

export default HedgingInstruments; 