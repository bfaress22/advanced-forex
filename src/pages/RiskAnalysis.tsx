import React, { useState, useEffect } from "react";
import { Layout } from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Slider } from "@/components/ui/slider";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "@/components/ui/use-toast";
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { 
  BarChart3, 
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Target,
  Zap,
  Play,
  Download,
  Settings,
  RefreshCw,
  Shield,
  DollarSign,
  RotateCcw,
  Calendar,
  Percent
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

// Interface pour les résultats de stress test
interface StressTestResult {
  instrumentId: string;
  instrumentType: string;
  currency: string;
  originalMTM: number;
  stressedMTM: number;
  mtmChange: number;
  mtmChangePercent: number;
  originalTodayPrice: number;
  stressedTodayPrice: number;
  volatilityShock: number;
  spotShock: number;
}

const RiskAnalysis = () => {
  // États pour les instruments réels
  const [instruments, setInstruments] = useState<HedgingInstrument[]>([]);
  const [importService] = useState(() => StrategyImportService.getInstance());

  // États pour les paramètres de marché (original et stressé)
  const [baseMarketData, setBaseMarketData] = useState<{ [currency: string]: CurrencyMarketData }>({});
  const [stressedMarketData, setStressedMarketData] = useState<{ [currency: string]: CurrencyMarketData }>({});
  
  // États pour les volatilités individuelles des instruments
  const [instrumentVolatilities, setInstrumentVolatilities] = useState<{ [instrumentId: string]: number }>({});
  
  // États pour les dates
  const [baseValuationDate, setBaseValuationDate] = useState(new Date().toISOString().split('T')[0]);
  const [stressedValuationDate, setStressedValuationDate] = useState(new Date().toISOString().split('T')[0]);
  
  // États pour les résultats
  const [stressTestResults, setStressTestResults] = useState<StressTestResult[]>([]);
  const [isRunningStressTest, setIsRunningStressTest] = useState(false);
  
  // États pour les contrôles de stress test
  const [selectedScenario, setSelectedScenario] = useState("custom");
  const [globalVolatilityShock, setGlobalVolatilityShock] = useState([0]);
  const [timeShift, setTimeShift] = useState([0]);

  // Charger les instruments au démarrage
  useEffect(() => {
    const loadInstruments = () => {
      const loadedInstruments = importService.getHedgingInstruments();
      setInstruments(loadedInstruments);
      
      // Initialiser les données de marché pour chaque devise
      const currencies = getUniqueCurrencies(loadedInstruments);
      const marketData: { [currency: string]: CurrencyMarketData } = {};
      
      currencies.forEach(currency => {
        marketData[currency] = getDefaultMarketDataForCurrency(currency);
      });
      
      setBaseMarketData(marketData);
      setStressedMarketData({ ...marketData });
      
      // Initialiser les volatilités individuelles
      const volatilities: { [instrumentId: string]: number } = {};
      loadedInstruments.forEach(instrument => {
        volatilities[instrument.id] = instrument.volatility || 20;
      });
      setInstrumentVolatilities(volatilities);
    };

    loadInstruments();

    // Écouter les mises à jour des instruments
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'hedgingInstruments') {
        loadInstruments();
      }
    };

    const handleCustomUpdate = () => {
      loadInstruments();
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('hedgingInstrumentsUpdated', handleCustomUpdate);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('hedgingInstrumentsUpdated', handleCustomUpdate);
    };
  }, [importService]);

  // Mettre à jour la date stressée quand le time shift change
  useEffect(() => {
    const baseDate = new Date(baseValuationDate);
    const stressedDate = new Date(baseDate);
    stressedDate.setDate(stressedDate.getDate() + timeShift[0]);
    setStressedValuationDate(stressedDate.toISOString().split('T')[0]);
  }, [baseValuationDate, timeShift]);

  // Fonctions utilitaires (identiques à HedgingInstruments)
  const getUniqueCurrencies = (instruments: HedgingInstrument[]): string[] => {
    const currencies = new Set<string>();
    instruments.forEach(instrument => {
      if (instrument.currency) {
        currencies.add(instrument.currency);
      }
    });
    return Array.from(currencies).sort();
  };

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

  const calculateTimeToMaturity = (maturityDate: string, valuationDate: string): number => {
    const maturity = new Date(maturityDate);
    const valuation = new Date(valuationDate);
    const diffTime = maturity.getTime() - valuation.getTime();
    const diffDays = diffTime / (1000 * 3600 * 24);
    return Math.max(0, diffDays / 365.25);
  };

  // Fonction de calcul MTM identique à HedgingInstruments
  const calculateInstrumentMTM = (
    instrument: HedgingInstrument, 
    marketData: { [currency: string]: CurrencyMarketData },
    valuationDate: string,
    useStressedVolatility: boolean = false
  ): { originalPrice: number; todayPrice: number; mtm: number } => {
    const currencyData = marketData[instrument.currency];
    if (!currencyData) {
      return { originalPrice: 0, todayPrice: 0, mtm: 0 };
    }
    
    const r_d = currencyData.domesticRate / 100;
    const r_f = currencyData.foreignRate / 100;
    const currentSpot = currencyData.spot;
    
    // Utiliser la volatilité stressée si demandée
    let sigma;
    if (useStressedVolatility && instrumentVolatilities[instrument.id]) {
      sigma = instrumentVolatilities[instrument.id] / 100;
    } else if (instrument.impliedVolatility) {
      sigma = instrument.impliedVolatility / 100;
    } else if (instrument.originalComponent && instrument.originalComponent.volatility) {
      sigma = instrument.originalComponent.volatility / 100;
    } else if (instrument.volatility) {
      sigma = instrument.volatility / 100;
    } else {
      sigma = currencyData.volatility / 100;
    }
    
    const timeToMaturity = calculateTimeToMaturity(instrument.maturity, valuationDate);
    const S = currentSpot * Math.exp((r_d - r_f) * timeToMaturity);
    
    if (timeToMaturity <= 0) {
      return { originalPrice: 0, todayPrice: 0, mtm: 0 };
    }

    const K = instrument.strike || S;
    const optionType = instrument.type.toLowerCase();
    
    // Calculer le prix aujourd'hui avec la même logique que HedgingInstruments
    let todayPrice = 0;
    
    if (optionType.includes('knock-out') || optionType.includes('knock-in') || 
        optionType.includes('barrier') || optionType.includes('reverse')) {
      const barrier = instrument.barrier;
      const secondBarrier = instrument.secondBarrier;
      
      if (barrier) {
        let pricingType = "";
       
        if (optionType.includes('double')) {
          if (optionType.includes('knock-out')) {
            pricingType = optionType.includes('call') ? "call-double-knockout" : "put-double-knockout";
          } else if (optionType.includes('knock-in')) {
            pricingType = optionType.includes('call') ? "call-double-knockin" : "put-double-knockin";
          }
        } else if (optionType.includes('knock-out')) {
          if (optionType.includes('reverse')) {
            pricingType = optionType.includes('call') ? "call-reverse-knockout" : "put-reverse-knockout";
          } else {
            pricingType = optionType.includes('call') ? "call-knockout" : "put-knockout";
          }
        } else if (optionType.includes('knock-in')) {
          pricingType = optionType.includes('call') ? "call-knockin" : "put-knockin";
        }
        
        if (pricingType) {
          todayPrice = PricingService.calculateBarrierOptionClosedForm(
            pricingType, S, K, r_d, timeToMaturity, sigma, barrier, secondBarrier, r_f
          );
        }
      }
    } else if (optionType.includes('touch') || optionType.includes('binary') || optionType.includes('digital')) {
      const barrier = instrument.barrier || K;
      const rebate = instrument.rebate || 5;
      
      todayPrice = PricingService.calculateDigitalOptionPrice(
        optionType, S, K, r_d, timeToMaturity, sigma, barrier, instrument.secondBarrier, 10000, rebate
      );
    } else if (optionType === 'vanilla call' || (optionType.includes('call') && !optionType.includes('knock'))) {
      todayPrice = PricingService.calculateGarmanKohlhagenPrice('call', S, K, r_d, r_f, timeToMaturity, sigma);
    } else if (optionType === 'vanilla put' || (optionType.includes('put') && !optionType.includes('knock'))) {
      todayPrice = PricingService.calculateGarmanKohlhagenPrice('put', S, K, r_d, r_f, timeToMaturity, sigma);
    } else if (optionType === 'forward') {
      const forward = S * Math.exp((r_d - r_f) * timeToMaturity);
      todayPrice = (forward - K) * Math.exp(-r_d * timeToMaturity);
    } else if (optionType === 'swap') {
      todayPrice = S * Math.exp((r_d - r_f) * timeToMaturity);
    }
    
    // Calculer le MTM
    const originalPrice = instrument.realOptionPrice || instrument.premium || 0;
    const quantity = instrument.quantity || 1;
    const isShort = quantity < 0;
    
    let mtmValue;
    if (isShort) {
      mtmValue = originalPrice - todayPrice;
    } else {
      mtmValue = todayPrice - originalPrice;
    }
    
    const mtm = mtmValue * Math.abs(instrument.notional);
    
    return { originalPrice, todayPrice, mtm };
  };

  // Fonction principale de stress testing
  const runStressTest = async () => {
    setIsRunningStressTest(true);
    
    try {
      const results: StressTestResult[] = [];
      
      // Calculer pour chaque instrument
      for (const instrument of instruments) {
        // Calculer MTM original (avec paramètres de base)
        const originalResult = calculateInstrumentMTM(instrument, baseMarketData, baseValuationDate, false);
        
        // Calculer MTM stressé (avec paramètres stressés)
        const stressedResult = calculateInstrumentMTM(instrument, stressedMarketData, stressedValuationDate, true);
        
        // Calculer les chocs appliqués
        const baseSpot = baseMarketData[instrument.currency]?.spot || 1;
        const stressedSpot = stressedMarketData[instrument.currency]?.spot || baseSpot;
        const spotShock = ((stressedSpot - baseSpot) / baseSpot) * 100;
        
        const baseVol = instrument.volatility || 20;
        const stressedVol = instrumentVolatilities[instrument.id] || baseVol;
        const volatilityShock = stressedVol - baseVol;
        
        const mtmChange = stressedResult.mtm - originalResult.mtm;
        const mtmChangePercent = originalResult.mtm !== 0 ? (mtmChange / Math.abs(originalResult.mtm)) * 100 : 0;
        
        results.push({
          instrumentId: instrument.id,
          instrumentType: instrument.type,
          currency: instrument.currency,
          originalMTM: originalResult.mtm,
          stressedMTM: stressedResult.mtm,
          mtmChange,
          mtmChangePercent,
          originalTodayPrice: originalResult.todayPrice,
          stressedTodayPrice: stressedResult.todayPrice,
          volatilityShock,
          spotShock
        });
      }
      
      setStressTestResults(results);
      
      const totalMTMChange = results.reduce((sum, result) => sum + result.mtmChange, 0);
      
      toast({
        title: "Stress Test Terminé",
        description: `Impact total: ${totalMTMChange >= 0 ? '+' : ''}${formatCurrency(totalMTMChange)}`,
        variant: totalMTMChange >= 0 ? "default" : "destructive"
      });
      
    } catch (error) {
      toast({
        title: "Erreur de Stress Test",
        description: "Échec du calcul. Vérifiez vos paramètres.",
        variant: "destructive"
      });
    } finally {
      setIsRunningStressTest(false);
    }
  };

  // Fonctions de mise à jour des paramètres
  const updateSpotRate = (currency: string, newSpot: number) => {
    setStressedMarketData(prev => ({
      ...prev,
      [currency]: {
        ...prev[currency],
        spot: newSpot
      }
    }));
  };

  const updateInstrumentVolatility = (instrumentId: string, newVolatility: number) => {
    setInstrumentVolatilities(prev => ({
      ...prev,
      [instrumentId]: newVolatility
    }));
  };

  const applyGlobalVolatilityShock = () => {
    const shock = globalVolatilityShock[0];
    const newVolatilities: { [instrumentId: string]: number } = {};
    
    instruments.forEach(instrument => {
      const baseVol = instrument.volatility || 20;
      newVolatilities[instrument.id] = baseVol + shock;
    });
    
    setInstrumentVolatilities(newVolatilities);
  };

  const resetToBaseParameters = () => {
    setStressedMarketData({ ...baseMarketData });
    
    const resetVolatilities: { [instrumentId: string]: number } = {};
    instruments.forEach(instrument => {
      resetVolatilities[instrument.id] = instrument.volatility || 20;
    });
    setInstrumentVolatilities(resetVolatilities);
    
    setGlobalVolatilityShock([0]);
    setTimeShift([0]);
    setStressedValuationDate(baseValuationDate);
    
    toast({
      title: "Paramètres Réinitialisés",
      description: "Tous les paramètres ont été remis aux valeurs de base"
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const getPnLColor = (value: number) => {
    return value >= 0 ? "text-green-600" : "text-red-600";
  };

  const getImpactSeverity = (changePercent: number) => {
    const abs = Math.abs(changePercent);
    if (abs < 5) return "low";
    if (abs < 15) return "medium";
    return "high";
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "low": return "text-green-600";
      case "medium": return "text-yellow-600";
      case "high": return "text-red-600";
      default: return "text-gray-600";
    }
  };

  // Calculer les métriques globales
  const totalOriginalMTM = stressTestResults.reduce((sum, result) => sum + result.originalMTM, 0);
  const totalStressedMTM = stressTestResults.reduce((sum, result) => sum + result.stressedMTM, 0);
  const totalMTMChange = totalStressedMTM - totalOriginalMTM;
  const totalMTMChangePercent = totalOriginalMTM !== 0 ? (totalMTMChange / Math.abs(totalOriginalMTM)) * 100 : 0;

  const currencies = getUniqueCurrencies(instruments);

  return (
    <Layout 
      breadcrumbs={[
        { label: "Dashboard", href: "/" },
        { label: "Analyse des Risques & Stress Testing" }
      ]}
    >
      {/* Métriques de Risque */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">MTM Portfolio Original</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${getPnLColor(totalOriginalMTM)}`}>
              {formatCurrency(totalOriginalMTM)}
            </div>
            <p className="text-xs text-muted-foreground">
              {instruments.length} instruments
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">MTM Stressé</CardTitle>
            <TrendingDown className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${getPnLColor(totalStressedMTM)}`}>
              {formatCurrency(totalStressedMTM)}
            </div>
            <p className="text-xs text-muted-foreground">
              Après stress testing
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Impact Total</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${getPnLColor(totalMTMChange)}`}>
              {totalMTMChange >= 0 ? '+' : ''}{formatCurrency(totalMTMChange)}
            </div>
            <p className="text-xs text-muted-foreground">
              {totalMTMChangePercent >= 0 ? '+' : ''}{totalMTMChangePercent.toFixed(1)}%
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Instruments à Risque</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {stressTestResults.filter(r => getImpactSeverity(r.mtmChangePercent) === "high").length}
            </div>
            <p className="text-xs text-muted-foreground">
              Impact &gt; 15%
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Configuration des Stress Tests */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Contrôles de Stress Test */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5" />
              Configuration des Analyses
            </CardTitle>
            <CardDescription>
              Choquer les paramètres et recalculer les MTM en temps réel
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Date de Valuation */}
              <div>
              <Label className="flex items-center gap-2 mb-2">
                <Calendar className="h-4 w-4" />
                Date de Valuation
              </Label>
              <div className="grid grid-cols-2 gap-3">
              <div>
                  <Label className="text-sm text-muted-foreground">Base</Label>
                  <Input
                    type="date"
                    value={baseValuationDate}
                    onChange={(e) => setBaseValuationDate(e.target.value)}
                />
              </div>
              <div>
                  <Label className="text-sm text-muted-foreground">Stressée (+{timeShift[0]} jours)</Label>
                  <Input
                    type="date"
                    value={stressedValuationDate}
                    readOnly
                    className="bg-muted"
                  />
                </div>
              </div>
              <div className="mt-2">
                <Label>Décalage Temporel: {timeShift[0]} jours</Label>
                <Slider
                  value={timeShift}
                  onValueChange={setTimeShift}
                  max={365}
                  min={-180}
                  step={1}
                  className="mt-2"
                />
              </div>
            </div>

            {/* Choc Global de Volatilité */}
            <div>
              <Label className="flex items-center gap-2 mb-2">
                <Percent className="h-4 w-4" />
                Choc Global Volatilité: {globalVolatilityShock[0] >= 0 ? '+' : ''}{globalVolatilityShock[0]}%
              </Label>
              <Slider
                value={globalVolatilityShock}
                onValueChange={setGlobalVolatilityShock}
                max={100}
                min={-50}
                step={1}
                className="mb-2"
              />
              <Button 
                size="sm" 
                onClick={applyGlobalVolatilityShock}
                className="w-full"
              >
                Appliquer à Tous les Instruments
              </Button>
              </div>

            {/* Boutons de Contrôle */}
              <div className="flex gap-2">
              <Button 
                onClick={runStressTest} 
                className="flex-1"
                disabled={isRunningStressTest}
              >
                {isRunningStressTest ? (
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Play className="h-4 w-4 mr-2" />
                )}
                {isRunningStressTest ? "Calcul..." : "Lancer Stress Test"}
                </Button>
              <Button variant="outline" onClick={resetToBaseParameters}>
                <RotateCcw className="h-4 w-4" />
                </Button>
            </div>
          </CardContent>
        </Card>

        {/* Chocs par Devise */}
        <Card>
          <CardHeader>
            <CardTitle>Chocs de Spot par Devise</CardTitle>
            <CardDescription>Modifier les taux de change spot</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {currencies.map(currency => {
                const baseSpot = baseMarketData[currency]?.spot || 1;
                const stressedSpot = stressedMarketData[currency]?.spot || baseSpot;
                const shockPercent = ((stressedSpot - baseSpot) / baseSpot) * 100;
                
                return (
                  <div key={currency} className="space-y-2">
                    <div className="flex justify-between items-center">
                      <Badge variant="outline" className="font-mono">{currency}</Badge>
                      <span className={`text-sm font-mono ${shockPercent !== 0 ? (shockPercent > 0 ? 'text-green-600' : 'text-red-600') : 'text-muted-foreground'}`}>
                        {shockPercent >= 0 ? '+' : ''}{shockPercent.toFixed(2)}%
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label className="text-xs text-muted-foreground">Base: {baseSpot.toFixed(4)}</Label>
                        <Input
                          type="number"
                          step="0.0001"
                          value={stressedSpot.toFixed(4)}
                          onChange={(e) => updateSpotRate(currency, parseFloat(e.target.value) || baseSpot)}
                          className="text-sm"
                        />
                      </div>
                      <div className="flex items-end">
                        <Button 
                          size="sm" 
                          variant="outline" 
                          onClick={() => updateSpotRate(currency, baseSpot)}
                          className="w-full"
                        >
                          Reset
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Volatilités par Instrument */}
      <Card>
        <CardHeader>
          <CardTitle>Chocs de Volatilité par Instrument</CardTitle>
          <CardDescription>
            Modifier la volatilité de chaque instrument individuellement
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3">
            {instruments.map(instrument => {
              const baseVol = instrument.volatility || 20;
              const stressedVol = instrumentVolatilities[instrument.id] || baseVol;
              const volShock = stressedVol - baseVol;
              
              return (
                <div key={instrument.id} className="flex items-center gap-4 p-3 border rounded-lg">
                  <div className="flex-1">
                    <div className="font-medium text-sm">{instrument.id}</div>
                    <div className="text-xs text-muted-foreground">{instrument.type} • {instrument.currency}</div>
                  </div>
                    <div className="flex items-center gap-3">
                    <div className="text-xs text-center">
                      <div className="text-muted-foreground">Base</div>
                      <div className="font-mono">{baseVol.toFixed(1)}%</div>
                    </div>
                    <div className="w-32">
                      <Input
                        type="number"
                        step="0.1"
                        value={stressedVol.toFixed(1)}
                        onChange={(e) => updateInstrumentVolatility(instrument.id, parseFloat(e.target.value) || baseVol)}
                        className="text-sm text-center"
                      />
                    </div>
                    <div className="text-xs text-center min-w-[50px]">
                      <div className="text-muted-foreground">Choc</div>
                      <div className={`font-mono ${volShock !== 0 ? (volShock > 0 ? 'text-green-600' : 'text-red-600') : 'text-muted-foreground'}`}>
                        {volShock >= 0 ? '+' : ''}{volShock.toFixed(1)}%
                      </div>
                    </div>
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => updateInstrumentVolatility(instrument.id, baseVol)}
                    >
                      Reset
                    </Button>
                  </div>
                </div>
              );
            })}
              </div>
        </CardContent>
      </Card>

      {/* Résultats du Stress Test */}
      {stressTestResults.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <CardTitle>Résultats du Stress Test</CardTitle>
                <CardDescription>
                  Impact détaillé par instrument avec recalcul MTM
                </CardDescription>
              </div>
              <Button variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                Exporter
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Instrument</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Devise</TableHead>
                  <TableHead>MTM Original</TableHead>
                  <TableHead>MTM Stressé</TableHead>
                  <TableHead>Changement</TableHead>
                  <TableHead>%</TableHead>
                  <TableHead>Today Price Δ</TableHead>
                  <TableHead>Chocs Appliqués</TableHead>
                  <TableHead>Sévérité</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stressTestResults.map((result) => {
                  const severity = getImpactSeverity(result.mtmChangePercent);
                  const priceChange = result.stressedTodayPrice - result.originalTodayPrice;
                  
                  return (
                    <TableRow key={result.instrumentId}>
                      <TableCell className="font-medium">{result.instrumentId}</TableCell>
                      <TableCell className="text-sm">{result.instrumentType}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{result.currency}</Badge>
                      </TableCell>
                      <TableCell className={`font-mono ${getPnLColor(result.originalMTM)}`}>
                        {formatCurrency(result.originalMTM)}
                      </TableCell>
                      <TableCell className={`font-mono ${getPnLColor(result.stressedMTM)}`}>
                        {formatCurrency(result.stressedMTM)}
                      </TableCell>
                      <TableCell className={`font-mono ${getPnLColor(result.mtmChange)}`}>
                        {result.mtmChange >= 0 ? '+' : ''}{formatCurrency(result.mtmChange)}
                      </TableCell>
                      <TableCell className={`font-mono ${getPnLColor(result.mtmChangePercent)}`}>
                        {result.mtmChangePercent >= 0 ? '+' : ''}{result.mtmChangePercent.toFixed(1)}%
                      </TableCell>
                      <TableCell className={`font-mono text-xs ${getPnLColor(priceChange)}`}>
                        {priceChange >= 0 ? '+' : ''}{priceChange.toFixed(4)}
                      </TableCell>
                      <TableCell className="text-xs">
                        <div>Vol: {result.volatilityShock >= 0 ? '+' : ''}{result.volatilityShock.toFixed(1)}%</div>
                        <div>Spot: {result.spotShock >= 0 ? '+' : ''}{result.spotShock.toFixed(2)}%</div>
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant={severity === "low" ? "default" : severity === "medium" ? "secondary" : "destructive"}
                          className="capitalize"
                        >
                          {severity}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </Layout>
  );
};

export default RiskAnalysis; 