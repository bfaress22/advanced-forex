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

  // Dialog states for view and edit actions
  const [selectedInstrument, setSelectedInstrument] = useState<HedgingInstrument | null>(null);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

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

  // Force re-calculation when valuation date changes
  useEffect(() => {
    if (instruments.length > 0) {
      console.log(`[DEBUG] Valuation date changed to ${valuationDate}, forcing recalculation of all Today Prices`);
      // Force re-render to recalculate all Today Prices with new valuation date
      setInstruments([...instruments]);
    }
  }, [valuationDate]);

  // Force re-calculation when market parameters change (spot, volatility, rates)
  useEffect(() => {
    if (instruments.length > 0) {
      console.log(`[DEBUG] Market parameters changed, forcing recalculation of all Today Prices`);
      // Force re-render to recalculate all Today Prices with new market parameters
      setInstruments([...instruments]);
    }
  }, [currencyMarketData]);

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

  // Fonction calculateTodayPrice améliorée pour utiliser les données enrichies d'export
  // Note: La fonction calculateBarrierOptionClosedForm a été déplacée vers PricingService
  // avec une implémentation complète pour les options à double barrière

  const calculateTodayPrice = (instrument: HedgingInstrument): number => {
    // Paramètres de marché dynamiques (spot, taux, vol) et timeToMaturity recalculé à chaque rendu
    const marketData = currencyMarketData[instrument.currency] || getDefaultMarketDataForCurrency(instrument.currency);
    const r_d = marketData.domesticRate / 100;
    const r_f = marketData.foreignRate / 100;
    const currentSpot = marketData.spot;
    // Prioriser la volatilité des Strategy Components (originalComponent)
    let sigma;
    if (instrument.impliedVolatility) {
      // 1. Priorité : Volatilité implicite spécifique
      sigma = instrument.impliedVolatility / 100;
    } else if (instrument.originalComponent && instrument.originalComponent.volatility) {
      // 2. Priorité : Volatilité des Strategy Components (10% dans votre cas)
      sigma = instrument.originalComponent.volatility / 100;
    } else if (instrument.volatility) {
      // 3. Priorité : Volatilité de l'instrument lui-même
      sigma = instrument.volatility / 100;
    } else {
      // 4. Fallback : Volatilité des données de marché
      sigma = marketData.volatility / 100;
    }
    // Recalculer le timeToMaturity en utilisant la Valuation Date actuelle des MTM Parameters
    const timeToMaturity = calculateTimeToMaturity(instrument.maturity, valuationDate);
    
    // IMPORTANT: Toujours utiliser le spot actuel pour permettre l'ajustement dynamique des prix
    // Calculer le forward à partir du spot actuel et des taux d'intérêt actuels
    const S = currentSpot * Math.exp((r_d - r_f) * timeToMaturity); // Forward calculé dynamiquement
    
    console.log(`[DEBUG] ${instrument.id}: Time to maturity calculated from valuation date ${valuationDate} to maturity ${instrument.maturity}: ${timeToMaturity.toFixed(4)} years`);
    console.log(`[DEBUG] ${instrument.id}: Using current spot ${currentSpot.toFixed(4)} -> forward ${S.toFixed(4)} (r_d=${(r_d*100).toFixed(1)}%, r_f=${(r_f*100).toFixed(1)}%, t=${timeToMaturity.toFixed(4)})`);
    
    // Vérifier l'expiration
    if (timeToMaturity <= 0) {
      return 0;
    }

    // Utiliser le strike en valeur absolue de l'instrument
    const K = instrument.strike || S;
    
    // Map instrument type to option type pour pricing
    const optionType = instrument.type.toLowerCase();
    
    // Pour les options à barrière, vérifier si le spot actuel a franchi les barrières
    if (optionType.includes('knock') || optionType.includes('barrier')) {
      const barrier = instrument.barrier;
      const secondBarrier = instrument.secondBarrier;
      
      if (barrier) {
        console.log(`[DEBUG] ${instrument.id}: Barrier analysis - spot=${currentSpot.toFixed(4)}, barrier=${barrier.toFixed(4)}`);
        
        if (secondBarrier) {
          const lowerBarrier = Math.min(barrier, secondBarrier);
          const upperBarrier = Math.max(barrier, secondBarrier);
          const spotOutsideRange = currentSpot <= lowerBarrier || currentSpot >= upperBarrier;
          console.log(`[DEBUG] ${instrument.id}: Double barrier analysis - spot=${currentSpot.toFixed(4)}, lower=${lowerBarrier.toFixed(4)}, upper=${upperBarrier.toFixed(4)}, outside=${spotOutsideRange}`);
          
          // Pour les double knock-out: si le spot est en dehors des barrières, l'option est déjà knockée
          if (optionType.includes('knock-out') && spotOutsideRange) {
            console.log(`[DEBUG] ${instrument.id}: Double knock-out option already knocked out (spot outside barriers)`);
            return 0;
          }
          
          // Pour les double knock-in: si le spot est en dehors des barrières, l'option est activée
          if (optionType.includes('knock-in') && spotOutsideRange) {
            console.log(`[DEBUG] ${instrument.id}: Double knock-in option activated (spot outside barriers)`);
            // Continuer avec le pricing normal d'une option vanille
          }
        } else {
          // Barrière simple
          let barrierCrossed = false;
          
          if (optionType.includes('reverse')) {
            // Pour les reverse barriers, la logique est inversée
            if (optionType.includes('call')) {
              barrierCrossed = currentSpot <= barrier; // Call reverse: knocked si spot en dessous
            } else {
              barrierCrossed = currentSpot >= barrier; // Put reverse: knocked si spot au dessus
            }
          } else {
            // Barrières normales
            if (optionType.includes('call')) {
              barrierCrossed = currentSpot >= barrier; // Call: knocked si spot au dessus
            } else {
              barrierCrossed = currentSpot <= barrier; // Put: knocked si spot en dessous
            }
          }
          
          console.log(`[DEBUG] ${instrument.id}: Single barrier analysis - barrierCrossed=${barrierCrossed}`);
          
          // Pour les knock-out: si barrière franchie, option knockée
          if (optionType.includes('knock-out') && barrierCrossed) {
            console.log(`[DEBUG] ${instrument.id}: Knock-out option already knocked out`);
            return 0;
          }
          
          // Pour les knock-in: si barrière franchie, option activée
          if (optionType.includes('knock-in') && barrierCrossed) {
            console.log(`[DEBUG] ${instrument.id}: Knock-in option activated`);
            // Continuer avec le pricing normal d'une option vanille
          }
        }
      }
    }
    // DEBUG: Log des paramètres pour diagnostiquer
    console.log(`[DEBUG] Instrument ${instrument.id}: params S=${S}, r_d=${r_d}, r_f=${r_f}, t=${timeToMaturity}, sigma=${sigma}`);
    console.log(`[DEBUG] Instrument ${instrument.id}: volatility source - impliedVol: ${instrument.impliedVolatility}, originalComponent: ${instrument.originalComponent?.volatility}, instrument: ${instrument.volatility}, market: ${marketData.volatility}`);
    console.log(`[DEBUG] Instrument ${instrument.id}: timeToMaturity source - detailedResults: ${instrument.timeToMaturity}, calculated: ${calculateTimeToMaturity(instrument.maturity, valuationDate)}`);
    
    // STRATÉGIE DE PRICING SELON LE TYPE D'INSTRUMENT
    // IMPORTANT: Ordre des conditions critique - les plus spécifiques d'abord !
    
    // 1. OPTIONS BARRIÈRES - PRIORITÉ ABSOLUE (avant les vanilles)
    if (optionType.includes('knock-out') || optionType.includes('knock-in') || 
        optionType.includes('barrier') || optionType.includes('ko ') || optionType.includes('ki ') ||
        optionType.includes('knockout') || optionType.includes('knockin') || optionType.includes('reverse')) {
      
      console.log(`[DEBUG] ${instrument.id}: Detected as BARRIER option, using closed-form`);
      
      // Utiliser les barrières en valeur absolue de l'instrument
      const barrier = instrument.barrier;
      const secondBarrier = instrument.secondBarrier;
      
      if (!barrier) {
        console.warn(`Barrier missing for ${instrument.type} instrument ${instrument.id}`);
        return 0;
      }
      
      // MAPPING CORRECT DES TYPES POUR LE PRICING SERVICE
      let pricingType = "";
      
      // 1. OPTIONS À DOUBLE BARRIÈRE - PRIORITÉ ABSOLUE
      if (optionType.includes('double')) {
        if (optionType.includes('knock-out') || optionType.includes('knockout')) {
          if (optionType.includes('call')) {
            pricingType = "call-double-knockout";
            console.log(`[DEBUG] ${instrument.id}: Call-double-knockout detected`);
          } else if (optionType.includes('put')) {
            pricingType = "put-double-knockout";
            console.log(`[DEBUG] ${instrument.id}: Put-double-knockout detected`);
          }
        } else if (optionType.includes('knock-in') || optionType.includes('knockin')) {
          if (optionType.includes('call')) {
            pricingType = "call-double-knockin";
            console.log(`[DEBUG] ${instrument.id}: Call-double-knockin detected`);
          } else if (optionType.includes('put')) {
            pricingType = "put-double-knockin";
            console.log(`[DEBUG] ${instrument.id}: Put-double-knockin detected`);
          }
        }
      }
      // 2. OPTIONS À BARRIÈRE SIMPLE
      else if (optionType.includes('knock-out') || optionType.includes('knockout') || optionType.includes('reverse')) {
    if (optionType.includes('call')) {
          if (optionType.includes('reverse')) {
            pricingType = "call-reverse-knockout";
            console.log(`[DEBUG] ${instrument.id}: Call-reverse-knockout mapped to call-reverse-knockout`);
          } else {
            pricingType = "call-knockout";
          }
        } else if (optionType.includes('put')) {
          if (optionType.includes('reverse')) {
            pricingType = "put-reverse-knockout";
            console.log(`[DEBUG] ${instrument.id}: Put-reverse-knockout mapped to put-reverse-knockout (barrier=${barrier}, spot=${S})`);
          } else {
            pricingType = "put-knockout";
          }
        }
      } else if (optionType.includes('knock-in') || optionType.includes('knockin')) {
        if (optionType.includes('call')) {
          pricingType = "call-knockin";
        } else if (optionType.includes('put')) {
          pricingType = "put-knockin";
        }
      }
      
      console.log(`[DEBUG] ${instrument.id}: Mapped type to: "${pricingType}"`);
      console.log(`[DEBUG] ${instrument.id}: Barrier params - barrier=${barrier}, strike=${K}, spot=${S}`);
      console.log(`[DEBUG] ${instrument.id}: Barrier relationship - barrier < spot: ${barrier < S}, barrier > spot: ${barrier > S}`);
      
      if (pricingType) {
        // Pour les reverse-knockout, on peut avoir besoin d'ajuster les paramètres
        let adjustedBarrier = barrier;
        let adjustedStrike = K;
        
        if (optionType.includes('reverse')) {
          console.log(`[DEBUG] ${instrument.id}: Reverse option detected, using original parameters`);
          // Pour les reverse, on garde les paramètres originaux mais on change le type de pricing
        }
        
        // Utiliser le PricingService mis à jour avec support des options à double barrière
        const price = PricingService.calculateBarrierOptionClosedForm(
          pricingType,
          S,
          adjustedStrike,
          r_d, // Utiliser seulement le taux domestique comme dans Strategy Builder
          timeToMaturity,
          sigma,
          adjustedBarrier,
          secondBarrier,
          r_f // Ajouter le taux étranger pour FX options
        );
        console.log(`[DEBUG] ${instrument.id}: Calculated price: ${price}`);
        return price;
      }
      
      // Fallback si le mapping échoue
      return 0;
    }
    
    // 2. OPTIONS DIGITALES - DEUXIÈME PRIORITÉ
    else if (optionType.includes('touch') || optionType.includes('binary') || 
             optionType.includes('digital')) {
      
      console.log(`[DEBUG] ${instrument.id}: Detected as DIGITAL option, using Monte Carlo`);
      
      const barrier = instrument.barrier || K;
      const secondBarrier = instrument.secondBarrier;
      const rebate = instrument.rebate || 5; // Utiliser le rebate de l'instrument ou 5% par défaut
      
      console.log(`[DEBUG] ${instrument.id}: Digital option params - barrier=${barrier}, secondBarrier=${secondBarrier}, rebate=${rebate}%`);
      
      return PricingService.calculateDigitalOptionPrice(
        instrument.type.toLowerCase(),
        S,
        K,
        r_d,
        timeToMaturity,
        sigma,
        barrier,
        secondBarrier,
        10000, // Nombre de simulations pour les digitales
        rebate
      );
    }
    
    // 3. OPTIONS VANILLES EXPLICITES - Utiliser Garman-Kohlhagen
    else if (optionType === 'vanilla call') {
      console.log(`[DEBUG] ${instrument.id}: Detected as VANILLA CALL, using Garman-Kohlhagen`);
      
      return PricingService.calculateGarmanKohlhagenPrice(
        'call',
        S,
        K,
        r_d,
        r_f,
        timeToMaturity,
        sigma
      );
    } else if (optionType === 'vanilla put') {
      console.log(`[DEBUG] ${instrument.id}: Detected as VANILLA PUT, using Garman-Kohlhagen`);
      
      return PricingService.calculateGarmanKohlhagenPrice(
        'put',
        S,
        K,
        r_d,
        r_f,
        timeToMaturity,
        sigma
      );
    }
    
    // 4. FORWARDS
    else if (optionType === 'forward') {
      console.log(`[DEBUG] ${instrument.id}: Detected as FORWARD`);
      
      const forward = S * Math.exp((r_d - r_f) * timeToMaturity);
      return (forward - K) * Math.exp(-r_d * timeToMaturity);
    }
    
    // 5. SWAPS
    else if (optionType === 'swap') {
      console.log(`[DEBUG] ${instrument.id}: Detected as SWAP`);
      
      const forward = S * Math.exp((r_d - r_f) * timeToMaturity);
      return forward;
    }
    
    // 6. OPTIONS VANILLES GÉNÉRIQUES - SEULEMENT si pas déjà traité
    else if (optionType.includes('call') && !optionType.includes('knock')) {
      console.log(`[DEBUG] ${instrument.id}: Fallback to VANILLA CALL (Garman-Kohlhagen)`);
      
      return PricingService.calculateGarmanKohlhagenPrice(
        'call',
        S,
        K,
        r_d,
        r_f,
        timeToMaturity,
        sigma
      );
    } else if (optionType.includes('put') && !optionType.includes('knock')) {
      console.log(`[DEBUG] ${instrument.id}: Fallback to VANILLA PUT (Garman-Kohlhagen)`);
      
      return PricingService.calculateGarmanKohlhagenPrice(
        'put',
        S,
        K,
        r_d,
        r_f,
        timeToMaturity,
        sigma
      );
    }

    // Fallback pour types inconnus
    console.warn(`Unknown instrument type: ${instrument.type} for instrument ${instrument.id}`);
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
    
    // Si c'est la volatilité qui change, recalculer automatiquement les prix
    if (field === 'volatility') {
      // Force re-render pour recalculer les Today Price
      setInstruments(prevInstruments => [...prevInstruments]);
      
      toast({
        title: "Volatility Updated",
        description: `Updated volatility to ${value}% for ${currency}. Today Prices recalculated.`,
      });
    }
  };

  // Fonction pour mettre à jour la volatilité d'un instrument spécifique
  const updateInstrumentVolatility = (instrumentId: string, volatility: number) => {
    setInstruments(prevInstruments => 
      prevInstruments.map(instrument => 
        instrument.id === instrumentId 
          ? { ...instrument, impliedVolatility: volatility }
          : instrument
      )
    );
    
    toast({
      title: "Individual Volatility Updated",
      description: `Updated volatility to ${volatility}% for instrument ${instrumentId}`,
    });
  };

  // Fonction pour réinitialiser la volatilité individuelle (utiliser la volatilité globale)
  const resetInstrumentVolatility = (instrumentId: string) => {
    setInstruments(prevInstruments => 
      prevInstruments.map(instrument => 
        instrument.id === instrumentId 
          ? { ...instrument, impliedVolatility: undefined }
          : instrument
      )
    );
    
    toast({
      title: "Individual Volatility Reset",
      description: `Reset to global volatility for instrument ${instrumentId}`,
    });
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

  // View instrument function
  const viewInstrument = (instrument: HedgingInstrument) => {
    setSelectedInstrument(instrument);
    setIsViewDialogOpen(true);
  };

  // Edit instrument function
  const editInstrument = (instrument: HedgingInstrument) => {
    setSelectedInstrument(instrument);
    setIsEditDialogOpen(true);
  };

  // Save instrument changes function
  const saveInstrumentChanges = (updatedInstrument: HedgingInstrument) => {
    importService.updateInstrument(updatedInstrument.id, updatedInstrument);
    const updatedInstruments = importService.getHedgingInstruments();
    setInstruments(updatedInstruments);
    setIsEditDialogOpen(false);
    setSelectedInstrument(null);
    
    // Dispatch custom event to notify other components
    window.dispatchEvent(new CustomEvent('hedgingInstrumentsUpdated'));
    
    toast({
      title: "Instrument Updated",
      description: "The hedging instrument has been updated successfully.",
    });
  };

  const filteredInstruments = instruments.filter(instrument => {
    const isOption = instrument.type.includes("Call") || 
                    instrument.type.includes("Put") || 
                    instrument.type === "Collar" ||
                    instrument.type.includes("Touch") ||
                    instrument.type.includes("Binary") ||
                    instrument.type.includes("Digital") ||
                    instrument.type.includes("Knock");
    
    const matchesTab = selectedTab === "all" || 
                      (selectedTab === "forwards" && instrument.type === "Forward") ||
                      (selectedTab === "options" && isOption) ||
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

      {/* Individual Volatility Overrides Summary */}
      {instruments.some(inst => inst.impliedVolatility) && (
        <Card className="mb-4 border-purple-200 bg-purple-50/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-purple-700 flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Individual Volatility Overrides
            </CardTitle>
            <CardDescription className="text-xs">
              Instruments using custom volatility instead of global market parameters
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="flex flex-wrap gap-2">
              {instruments
                .filter(inst => inst.impliedVolatility)
                .map(inst => (
                  <Badge key={inst.id} variant="secondary" className="text-xs bg-purple-100 text-purple-700">
                    {inst.id}: {inst.impliedVolatility?.toFixed(1)}%
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-3 w-3 p-0 ml-1 text-purple-500 hover:text-red-500"
                      onClick={() => resetInstrumentVolatility(inst.id)}
                      title="Reset to global volatility"
                    >
                      ×
                    </Button>
                  </Badge>
                ))}
            </div>
          </CardContent>
        </Card>
      )}

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
                      <TableHead>Quantity (%)</TableHead>
                      <TableHead>Unit Price (Initial)</TableHead>
                      <TableHead>Today Price</TableHead>
                      <TableHead>MTM</TableHead>
                      <TableHead>Time to Maturity</TableHead>
                      <TableHead>Volatility (%)</TableHead>
                      <TableHead>Strike</TableHead>
                      <TableHead>Barrier 1</TableHead>
                      <TableHead>Barrier 2</TableHead>
                      <TableHead>Rebate (%)</TableHead>
                      <TableHead>Volume</TableHead>
                      <TableHead>Notional</TableHead>
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
                      // Calculate time to maturity - prioriser les données des Detailed Results
                      const timeToMaturity = instrument.timeToMaturity || calculateTimeToMaturity(instrument.maturity, valuationDate);
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
                                {instrument.repricingData && (
                                  <div className="text-xs text-blue-600">
                                    Period Data ✓
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
                            <span className={todayPrice !== 0 ? "text-blue-600" : "text-gray-500"}>
                              {todayPrice !== 0 ? todayPrice.toFixed(4) : 'N/A'}
                            </span>
                            {(() => {
                              // Détecter le modèle de pricing utilisé (EXACTEMENT la même logique que calculateTodayPrice)
                              const optionType = instrument.type.toLowerCase();
                              let modelName = "unknown";
                              
                              // 1. OPTIONS BARRIÈRES - PRIORITÉ ABSOLUE (avant les vanilles)
                              if (optionType.includes('knock-out') || optionType.includes('knock-in') || 
                                  optionType.includes('barrier') || optionType.includes('ko ') || optionType.includes('ki ') ||
                                  optionType.includes('knockout') || optionType.includes('knockin') || optionType.includes('reverse')) {
                                modelName = "closed-form";
                              }
                              // 2. OPTIONS DIGITALES - DEUXIÈME PRIORITÉ
                              else if (optionType.includes('touch') || optionType.includes('binary') || 
                                       optionType.includes('digital')) {
                                modelName = "monte-carlo";
                              }
                              // 3. OPTIONS VANILLES EXPLICITES
                              else if (optionType === 'vanilla call' || optionType === 'vanilla put') {
                                modelName = "garman-kohlhagen";
                              }
                              // 4. FORWARDS
                              else if (optionType === 'forward') {
                                modelName = "forward-pricing";
                              }
                              // 5. SWAPS
                              else if (optionType === 'swap') {
                                modelName = "swap-pricing";
                              }
                              // 6. OPTIONS VANILLES GÉNÉRIQUES - SEULEMENT si pas déjà traité
                              else if (optionType.includes('call') && !optionType.includes('knock')) {
                                modelName = "garman-kohlhagen";
                              } else if (optionType.includes('put') && !optionType.includes('knock')) {
                                modelName = "garman-kohlhagen";
                              }
                              
                              return (
                                <div className="text-xs text-green-600">
                                  Model: {modelName}
                                </div>
                              );
                            })()}
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
                            {instrument.timeToMaturity && (
                              <div className="text-xs text-blue-600">
                                Exact: {instrument.timeToMaturity.toFixed(4)}y
                              </div>
                            )}
                          </TableCell>
                          <TableCell className="font-mono text-center">
                            <div className="space-y-1">
                              {/* Volatilité globale (non-éditable, pour référence) */}
                              <div className="text-xs text-gray-500">
                                Global: {volatility > 0 ? volatility.toFixed(1) + '%' : 'N/A'}
                              </div>
                              
                              {/* Volatilité individuelle (éditable) */}
                              <div className="flex items-center gap-1">
                                <Input
                                  type="number"
                                  value={instrument.impliedVolatility || ''}
                                  onChange={(e) => {
                                    const value = parseFloat(e.target.value);
                                    if (!isNaN(value) && value >= 0 && value <= 100) {
                                      updateInstrumentVolatility(instrument.id, value);
                                    }
                                  }}
                                  placeholder={volatility.toFixed(1)}
                                  className="w-16 h-6 text-xs text-center"
                                  step="0.1"
                                  min="0"
                                  max="100"
                                />
                                <span className="text-xs">%</span>
                            {instrument.impliedVolatility && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-4 w-4 p-0 text-gray-400 hover:text-red-500"
                                    onClick={() => resetInstrumentVolatility(instrument.id)}
                                    title="Reset to global volatility"
                                  >
                                    ×
                                  </Button>
                                )}
                              </div>
                              
                              {instrument.impliedVolatility ? (
                                <div className="text-xs text-purple-600 font-medium">
                                  ✓ Using: {instrument.impliedVolatility.toFixed(1)}%
                                </div>
                              ) : (
                                <div className="text-xs text-blue-600">
                                  ✓ Using Global: {volatility.toFixed(1)}%
                              </div>
                            )}
                            </div>
                          </TableCell>
                          <TableCell className="font-mono text-right">
                            {instrument.strike ? instrument.strike.toFixed(4) : 'N/A'}
                            {instrument.dynamicStrikeInfo && (
                              <div className="text-xs text-orange-600">
                                Dyn: {instrument.dynamicStrikeInfo.calculatedStrikePercent}
                              </div>
                            )}
                          </TableCell>
                          <TableCell className="font-mono text-right">
                            {instrument.barrier ? instrument.barrier.toFixed(4) : 'N/A'}
                          </TableCell>
                          <TableCell className="font-mono text-right">
                            {instrument.secondBarrier ? instrument.secondBarrier.toFixed(4) : 'N/A'}
                          </TableCell>
                          <TableCell className="font-mono text-right">
                            {instrument.rebate ? instrument.rebate.toFixed(2) : 'N/A'}
                          </TableCell>
                          <TableCell className="font-mono text-right">
                            {formatCurrency(volumeToHedge)}
                          </TableCell>
                          <TableCell className="font-mono text-right">
                            {calculatedNotional > 0 ? formatCurrency(calculatedNotional) : formatCurrency(instrument.notional)}
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
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              title="View Details"
                              onClick={() => viewInstrument(instrument)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              title="Edit"
                              onClick={() => editInstrument(instrument)}
                            >
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

      {/* View Instrument Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Instrument Details</DialogTitle>
            <DialogDescription>
              View detailed information about this hedging instrument
            </DialogDescription>
          </DialogHeader>
          {selectedInstrument && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium">ID</Label>
                  <p className="text-sm text-muted-foreground">{selectedInstrument.id}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Type</Label>
                  <p className="text-sm text-muted-foreground">{selectedInstrument.type}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Currency Pair</Label>
                  <p className="text-sm text-muted-foreground">{selectedInstrument.currency}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Quantity</Label>
                  <p className="text-sm text-muted-foreground">{selectedInstrument.quantity?.toFixed(1)}%</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Strike</Label>
                  <p className="text-sm text-muted-foreground">{selectedInstrument.strike?.toFixed(4) || 'N/A'}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Maturity</Label>
                  <p className="text-sm text-muted-foreground">{selectedInstrument.maturity}</p>
                </div>
                {selectedInstrument.barrier && (
                  <div>
                    <Label className="text-sm font-medium">Barrier 1</Label>
                    <p className="text-sm text-muted-foreground">{selectedInstrument.barrier.toFixed(4)}</p>
                  </div>
                )}
                {selectedInstrument.secondBarrier && (
                  <div>
                    <Label className="text-sm font-medium">Barrier 2</Label>
                    <p className="text-sm text-muted-foreground">{selectedInstrument.secondBarrier.toFixed(4)}</p>
                  </div>
                )}
                {selectedInstrument.rebate && (
                  <div>
                    <Label className="text-sm font-medium">Rebate (%)</Label>
                    <p className="text-sm text-muted-foreground">{selectedInstrument.rebate.toFixed(2)}%</p>
                  </div>
                )}
                <div>
                  <Label className="text-sm font-medium">Notional</Label>
                  <p className="text-sm text-muted-foreground">{formatCurrency(selectedInstrument.notional)}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Status</Label>
                  <p className="text-sm text-muted-foreground">{selectedInstrument.status}</p>
                </div>
              </div>
              {selectedInstrument.strategyName && (
                <div>
                  <Label className="text-sm font-medium">Strategy Source</Label>
                  <p className="text-sm text-muted-foreground">{selectedInstrument.strategyName}</p>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsViewDialogOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Instrument Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Edit Instrument</DialogTitle>
            <DialogDescription>
              Modify the parameters of this hedging instrument
            </DialogDescription>
          </DialogHeader>
          {selectedInstrument && (
            <InstrumentEditForm 
              instrument={selectedInstrument}
              onSave={saveInstrumentChanges}
              onCancel={() => setIsEditDialogOpen(false)}
            />
          )}
        </DialogContent>
      </Dialog>
    </Layout>
  );
};

// Component for editing instrument details
const InstrumentEditForm: React.FC<{
  instrument: HedgingInstrument;
  onSave: (instrument: HedgingInstrument) => void;
  onCancel: () => void;
}> = ({ instrument, onSave, onCancel }) => {
  const [editedInstrument, setEditedInstrument] = useState<HedgingInstrument>({ ...instrument });

  const handleSave = () => {
    onSave(editedInstrument);
  };

  const updateField = (field: keyof HedgingInstrument, value: any) => {
    setEditedInstrument(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="edit-quantity">Quantity (%)</Label>
          <Input
            id="edit-quantity"
            type="number"
            step="0.1"
            value={editedInstrument.quantity || 0}
            onChange={(e) => updateField('quantity', parseFloat(e.target.value) || 0)}
          />
        </div>
        <div>
          <Label htmlFor="edit-strike">Strike</Label>
          <Input
            id="edit-strike"
            type="number"
            step="0.0001"
            value={editedInstrument.strike || 0}
            onChange={(e) => updateField('strike', parseFloat(e.target.value) || 0)}
          />
        </div>
        {editedInstrument.barrier !== undefined && (
          <div>
            <Label htmlFor="edit-barrier">Barrier 1</Label>
            <Input
              id="edit-barrier"
              type="number"
              step="0.0001"
              value={editedInstrument.barrier || 0}
              onChange={(e) => updateField('barrier', parseFloat(e.target.value) || 0)}
            />
          </div>
        )}
        {editedInstrument.secondBarrier !== undefined && (
          <div>
            <Label htmlFor="edit-second-barrier">Barrier 2</Label>
            <Input
              id="edit-second-barrier"
              type="number"
              step="0.0001"
              value={editedInstrument.secondBarrier || 0}
              onChange={(e) => updateField('secondBarrier', parseFloat(e.target.value) || 0)}
            />
          </div>
        )}
        {editedInstrument.rebate !== undefined && (
          <div>
            <Label htmlFor="edit-rebate">Rebate (%)</Label>
            <Input
              id="edit-rebate"
              type="number"
              step="0.01"
              value={editedInstrument.rebate || 0}
              onChange={(e) => updateField('rebate', parseFloat(e.target.value) || 0)}
            />
          </div>
        )}
        <div>
          <Label htmlFor="edit-notional">Notional</Label>
          <Input
            id="edit-notional"
            type="number"
            step="1000"
            value={editedInstrument.notional || 0}
            onChange={(e) => updateField('notional', parseFloat(e.target.value) || 0)}
          />
        </div>
        <div>
          <Label htmlFor="edit-maturity">Maturity Date</Label>
          <Input
            id="edit-maturity"
            type="date"
            value={editedInstrument.maturity}
            onChange={(e) => updateField('maturity', e.target.value)}
          />
        </div>
        <div>
          <Label htmlFor="edit-status">Status</Label>
          <Select value={editedInstrument.status} onValueChange={(value) => updateField('status', value)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Active">Active</SelectItem>
              <SelectItem value="Inactive">Inactive</SelectItem>
              <SelectItem value="Expired">Expired</SelectItem>
              <SelectItem value="Settled">Settled</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button onClick={handleSave}>
          Save Changes
        </Button>
      </DialogFooter>
    </div>
  );
};

export default HedgingInstruments; 