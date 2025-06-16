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
  Cell,
  ComposedChart,
  Area,
  AreaChart
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
  Shield,
  Activity,
  DollarSign,
  Percent
} from "lucide-react";
import StrategyImportService, { HedgingInstrument } from "@/services/StrategyImportService";
import { PricingService } from "@/services/PricingService";

interface RiskMetrics {
  var95: number;
  var99: number;
  expectedShortfall95: number;
  expectedShortfall99: number;
  maxDrawdown: number;
  sharpeRatio: number;
  totalExposure: number;
  hedgedExposure: number;
  hedgeRatio: number;
}

interface CurrencyRisk {
  currency: string;
  exposure: number;
  hedgedAmount: number;
  netExposure: number;
  var95: number;
  instruments: number;
  color: string;
}

interface ScenarioResult {
  scenario: string;
  spotShock: number;
  volShock: number;
  unhedgedPnL: number;
  hedgedPnL: number;
  hedgeEffectiveness: number;
  probability: number;
}

const RiskAnalysis = () => {
  const [instruments, setInstruments] = useState<HedgingInstrument[]>([]);
  const [importService] = useState(() => StrategyImportService.getInstance());
  const [selectedScenario, setSelectedScenario] = useState("stress-test");
  const [volatilityShock, setVolatilityShock] = useState([25]);
  const [currencyShock, setCurrencyShock] = useState([15]);
  const [timeHorizon, setTimeHorizon] = useState([30]);
  const [isCalculating, setIsCalculating] = useState(false);
  
  const [riskMetrics, setRiskMetrics] = useState<RiskMetrics>({
    var95: 0,
    var99: 0,
    expectedShortfall95: 0,
    expectedShortfall99: 0,
    maxDrawdown: 0,
    sharpeRatio: 0,
    totalExposure: 0,
    hedgedExposure: 0,
    hedgeRatio: 0
  });

  const [currencyRisks, setCurrencyRisks] = useState<CurrencyRisk[]>([]);
  const [scenarioResults, setScenarioResults] = useState<ScenarioResult[]>([]);

  // Colors for charts
  const colors = ['#8884d8', '#82ca9d', '#ffc658', '#ff7300', '#00ff00', '#ff00ff', '#00ffff'];

  // Load instruments and calculate risk metrics
  useEffect(() => {
    const loadData = () => {
      const importedInstruments = importService.getHedgingInstruments();
      setInstruments(importedInstruments);
      calculateRiskMetrics(importedInstruments);
      calculateCurrencyRisks(importedInstruments);
      generateScenarioResults(importedInstruments);
    };

    loadData();
    
    // Listen for updates
    const handleUpdate = () => loadData();
    window.addEventListener('hedgingInstrumentsUpdated', handleUpdate);
    window.addEventListener('storage', handleUpdate);

    return () => {
      window.removeEventListener('hedgingInstrumentsUpdated', handleUpdate);
      window.removeEventListener('storage', handleUpdate);
    };
  }, [importService]);

  const calculateRiskMetrics = (instruments: HedgingInstrument[]) => {
    if (instruments.length === 0) {
      setRiskMetrics({
        var95: 0, var99: 0, expectedShortfall95: 0, expectedShortfall99: 0,
        maxDrawdown: 0, sharpeRatio: 0, totalExposure: 0, hedgedExposure: 0, hedgeRatio: 0
      });
      return;
    }

    // Calculate total exposure and hedged amounts
    const totalExposure = instruments.reduce((sum, inst) => sum + Math.abs(inst.notional), 0);
    const hedgedExposure = instruments.reduce((sum, inst) => {
      // Consider forwards and options as hedging instruments
      if (inst.type !== 'Forward' && !inst.type.includes('Call') && !inst.type.includes('Put') && !inst.type.includes('Touch')) {
        return sum;
      }
      return sum + Math.abs(inst.notional);
    }, 0);

    const hedgeRatio = totalExposure > 0 ? (hedgedExposure / totalExposure) * 100 : 0;

    // Simple VaR calculation based on notional and volatility
    // This is a simplified approach - in practice, you'd use more sophisticated models
    const portfolioVolatility = 0.15; // 15% assumed portfolio volatility
    const confidenceLevel95 = 1.645; // 95% confidence z-score
    const confidenceLevel99 = 2.326; // 99% confidence z-score
    
    const var95 = totalExposure * portfolioVolatility * confidenceLevel95 * Math.sqrt(1/252); // 1-day VaR
    const var99 = totalExposure * portfolioVolatility * confidenceLevel99 * Math.sqrt(1/252);
    
    // Expected Shortfall (simplified)
    const expectedShortfall95 = var95 * 1.3;
    const expectedShortfall99 = var99 * 1.25;

    // Calculate MTM-based metrics
    const totalMTM = instruments.reduce((sum, inst) => sum + (inst.mtm || 0), 0);
    const maxDrawdown = Math.min(0, totalMTM); // Simplified max drawdown
    
    // Simple Sharpe ratio approximation
    const avgReturn = totalMTM / Math.max(totalExposure, 1);
    const sharpeRatio = avgReturn / Math.max(portfolioVolatility, 0.01);

    setRiskMetrics({
      var95,
      var99,
      expectedShortfall95,
      expectedShortfall99,
      maxDrawdown,
      sharpeRatio,
      totalExposure,
      hedgedExposure,
      hedgeRatio
    });
  };

  const calculateCurrencyRisks = (instruments: HedgingInstrument[]) => {
    const currencyMap = new Map<string, {
      exposure: number;
      hedgedAmount: number;
      instruments: number;
    }>();

    instruments.forEach(inst => {
      const currency = inst.currency;
      const existing = currencyMap.get(currency) || { exposure: 0, hedgedAmount: 0, instruments: 0 };
      
      existing.exposure += Math.abs(inst.notional);
      existing.instruments += 1;
      
      // Consider hedging instruments
      if (inst.type === 'Forward' || inst.type.includes('Call') || inst.type.includes('Put') || inst.type.includes('Touch')) {
        existing.hedgedAmount += Math.abs(inst.notional);
      }
      
      currencyMap.set(currency, existing);
    });

    const risks: CurrencyRisk[] = Array.from(currencyMap.entries()).map(([currency, data], index) => {
      const netExposure = data.exposure - data.hedgedAmount;
      const var95 = Math.abs(netExposure) * 0.15 * 1.645 * Math.sqrt(1/252); // Simplified VaR
      
      return {
        currency,
        exposure: data.exposure,
        hedgedAmount: data.hedgedAmount,
        netExposure,
        var95,
        instruments: data.instruments,
        color: colors[index % colors.length]
      };
    }).sort((a, b) => b.exposure - a.exposure);

    setCurrencyRisks(risks);
  };

  const generateScenarioResults = (instruments: HedgingInstrument[]) => {
    const scenarios: ScenarioResult[] = [
      {
        scenario: "Base Case",
        spotShock: 0,
        volShock: 0,
        unhedgedPnL: 0,
        hedgedPnL: 0,
        hedgeEffectiveness: 100,
        probability: 40
      },
      {
        scenario: "EUR Strengthens 10%",
        spotShock: 10,
        volShock: 0,
        unhedgedPnL: calculateScenarioPnL(instruments, 0.10, 0),
        hedgedPnL: calculateScenarioPnL(instruments, 0.10, 0, true),
        hedgeEffectiveness: 0,
        probability: 20
      },
      {
        scenario: "EUR Weakens 15%",
        spotShock: -15,
        volShock: 0,
        unhedgedPnL: calculateScenarioPnL(instruments, -0.15, 0),
        hedgedPnL: calculateScenarioPnL(instruments, -0.15, 0, true),
        hedgeEffectiveness: 0,
        probability: 15
      },
      {
        scenario: "High Volatility (+50%)",
        spotShock: 0,
        volShock: 50,
        unhedgedPnL: calculateScenarioPnL(instruments, 0, 0.5),
        hedgedPnL: calculateScenarioPnL(instruments, 0, 0.5, true),
        hedgeEffectiveness: 0,
        probability: 15
      },
      {
        scenario: "Market Crisis",
        spotShock: -25,
        volShock: 100,
        unhedgedPnL: calculateScenarioPnL(instruments, -0.25, 1.0),
        hedgedPnL: calculateScenarioPnL(instruments, -0.25, 1.0, true),
        hedgeEffectiveness: 0,
        probability: 10
      }
    ];

    // Calculate hedge effectiveness
    scenarios.forEach(scenario => {
      if (scenario.unhedgedPnL !== 0) {
        scenario.hedgeEffectiveness = Math.max(0, Math.min(100, 
          (1 - Math.abs(scenario.hedgedPnL) / Math.abs(scenario.unhedgedPnL)) * 100
        ));
      }
    });

    setScenarioResults(scenarios);
  };

  const calculateScenarioPnL = (instruments: HedgingInstrument[], spotShock: number, volShock: number, includeHedges: boolean = false): number => {
    return instruments.reduce((totalPnL, inst) => {
      // Skip non-hedging instruments if includeHedges is false
      if (!includeHedges && (inst.type === 'Forward' || inst.type.includes('Call') || inst.type.includes('Put') || inst.type.includes('Touch'))) {
        return totalPnL;
      }

      const notional = inst.notional;
      let pnl = 0;

      if (inst.type === 'Forward') {
        // Forward P&L = notional * spot_shock
        pnl = notional * spotShock;
      } else if (inst.type.includes('Call') || inst.type.includes('Put')) {
        // Option P&L approximation
        const delta = inst.type.includes('Call') ? 0.5 : -0.5; // Simplified delta
        const vega = notional * 0.01; // Simplified vega
        pnl = delta * notional * spotShock + vega * volShock;
      } else if (inst.type.includes('Touch')) {
        // Digital option P&L
        const rebate = (inst.rebate || 5) / 100;
        pnl = Math.abs(spotShock) > 0.1 ? notional * rebate : 0; // Simplified trigger
      } else {
        // Underlying exposure
        pnl = notional * spotShock;
      }

      return totalPnL + pnl;
    }, 0);
  };

  const runScenarioAnalysis = async () => {
    setIsCalculating(true);
    
    // Simulate calculation time
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Recalculate with current parameters
    generateScenarioResults(instruments);
    calculateRiskMetrics(instruments);
    
    setIsCalculating(false);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const formatPercent = (value: number) => {
    return `${value.toFixed(1)}%`;
  };

  const getPnLColor = (value: number) => {
    return value >= 0 ? "text-green-600" : "text-red-600";
  };

  const getRiskColor = (value: number, threshold: number) => {
    return value > threshold ? "text-red-600" : value > threshold * 0.7 ? "text-yellow-600" : "text-green-600";
  };

  return (
    <Layout 
      breadcrumbs={[
        { label: "Dashboard", href: "/" },
        { label: "Risk Analysis" }
      ]}
    >
      {/* Risk Metrics Overview */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">VaR (95%)</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${getRiskColor(riskMetrics.var95, 100000)}`}>
              {formatCurrency(riskMetrics.var95)}
            </div>
            <p className="text-xs text-muted-foreground">
              1-day Value at Risk
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Expected Shortfall</CardTitle>
            <TrendingDown className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${getRiskColor(riskMetrics.expectedShortfall95, 150000)}`}>
              {formatCurrency(riskMetrics.expectedShortfall95)}
            </div>
            <p className="text-xs text-muted-foreground">
              Conditional VaR (95%)
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Hedge Ratio</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${riskMetrics.hedgeRatio > 80 ? 'text-green-600' : riskMetrics.hedgeRatio > 50 ? 'text-yellow-600' : 'text-red-600'}`}>
              {formatPercent(riskMetrics.hedgeRatio)}
            </div>
            <p className="text-xs text-muted-foreground">
              Portfolio hedged
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Exposure</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {formatCurrency(riskMetrics.totalExposure)}
            </div>
            <p className="text-xs text-muted-foreground">
              Across {instruments.length} instruments
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Scenario Analysis Controls */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5" />
              Scenario Analysis
            </CardTitle>
            <CardDescription>
              Run stress tests based on current portfolio
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4">
              <div>
                <Label htmlFor="scenario-type">Scenario Type</Label>
                <Select value={selectedScenario} onValueChange={setSelectedScenario}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="stress-test">Stress Test</SelectItem>
                    <SelectItem value="historical">Historical Simulation</SelectItem>
                    <SelectItem value="monte-carlo">Monte Carlo</SelectItem>
                    <SelectItem value="custom">Custom Scenario</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Volatility Shock: +{volatilityShock[0]}%</Label>
                <Slider
                  value={volatilityShock}
                  onValueChange={setVolatilityShock}
                  max={200}
                  min={0}
                  step={5}
                  className="mt-2"
                />
              </div>

              <div>
                <Label>Currency Shock: ±{currencyShock[0]}%</Label>
                <Slider
                  value={currencyShock}
                  onValueChange={setCurrencyShock}
                  max={50}
                  min={0}
                  step={1}
                  className="mt-2"
                />
              </div>

              <div>
                <Label>Time Horizon: {timeHorizon[0]} days</Label>
                <Slider
                  value={timeHorizon}
                  onValueChange={setTimeHorizon}
                  max={365}
                  min={1}
                  step={1}
                  className="mt-2"
                />
              </div>

              <div className="flex gap-2">
                <Button 
                  onClick={runScenarioAnalysis} 
                  className="flex-1"
                  disabled={isCalculating}
                >
                  {isCalculating ? (
                    <Activity className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Play className="h-4 w-4 mr-2" />
                  )}
                  {isCalculating ? "Calculating..." : "Run Analysis"}
                </Button>
                <Button variant="outline">
                  <Settings className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Portfolio Risk Summary */}
        <Card>
          <CardHeader>
            <CardTitle>Portfolio Risk Summary</CardTitle>
            <CardDescription>Key risk metrics and ratios</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <div className="font-medium">Total Exposure</div>
                  <div className="text-sm text-muted-foreground">Gross notional</div>
                </div>
                <div className="text-right">
                  <div className="text-lg font-bold text-blue-600">
                    {formatCurrency(riskMetrics.totalExposure)}
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <div className="font-medium">Hedged Amount</div>
                  <div className="text-sm text-muted-foreground">Protected exposure</div>
                </div>
                <div className="text-right">
                  <div className="text-lg font-bold text-green-600">
                    {formatCurrency(riskMetrics.hedgedExposure)}
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <div className="font-medium">Net Exposure</div>
                  <div className="text-sm text-muted-foreground">Unhedged risk</div>
                </div>
                <div className="text-right">
                  <div className={`text-lg font-bold ${getRiskColor(riskMetrics.totalExposure - riskMetrics.hedgedExposure, 500000)}`}>
                    {formatCurrency(riskMetrics.totalExposure - riskMetrics.hedgedExposure)}
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <div className="font-medium">Sharpe Ratio</div>
                  <div className="text-sm text-muted-foreground">Risk-adjusted return</div>
                </div>
                <div className="text-right">
                  <div className={`text-lg font-bold ${riskMetrics.sharpeRatio > 1 ? 'text-green-600' : riskMetrics.sharpeRatio > 0 ? 'text-yellow-600' : 'text-red-600'}`}>
                    {riskMetrics.sharpeRatio.toFixed(2)}
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Section */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Currency Risk Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle>Risk by Currency</CardTitle>
            <CardDescription>Exposure and VaR by currency pair</CardDescription>
          </CardHeader>
          <CardContent>
            {currencyRisks.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={currencyRisks}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="currency" />
                  <YAxis tickFormatter={(value) => `$${(value/1000000).toFixed(1)}M`} />
                  <Tooltip 
                    formatter={(value: number, name: string) => [
                      formatCurrency(value), 
                      name === 'exposure' ? 'Total Exposure' : 
                      name === 'hedgedAmount' ? 'Hedged Amount' : 
                      name === 'var95' ? '1-day VaR (95%)' : name
                    ]}
                  />
                  <Bar dataKey="exposure" fill="#8884d8" name="exposure" />
                  <Bar dataKey="hedgedAmount" fill="#82ca9d" name="hedgedAmount" />
                  <Bar dataKey="var95" fill="#ffc658" name="var95" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                No currency data available
              </div>
            )}
          </CardContent>
        </Card>

        {/* VaR Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>VaR Distribution</CardTitle>
            <CardDescription>Value at Risk by confidence level</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={[
                { confidence: "95%", var: riskMetrics.var95, es: riskMetrics.expectedShortfall95 },
                { confidence: "99%", var: riskMetrics.var99, es: riskMetrics.expectedShortfall99 }
              ]}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="confidence" />
                <YAxis tickFormatter={(value) => `$${(value/1000).toFixed(0)}K`} />
                <Tooltip formatter={(value: number) => formatCurrency(value)} />
                <Bar dataKey="var" fill="#ff7300" name="VaR" />
                <Bar dataKey="es" fill="#ff0000" name="Expected Shortfall" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Scenario Results */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Scenario Analysis Results</CardTitle>
              <CardDescription>P&L impact under different market scenarios</CardDescription>
            </div>
            <Button variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Export Results
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {scenarioResults.map((scenario, index) => (
              <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-3">
                  <Badge variant="outline">{scenario.probability}%</Badge>
                  <div>
                    <div className="font-medium">{scenario.scenario}</div>
                    <div className="text-sm text-muted-foreground">
                      Spot: {scenario.spotShock > 0 ? '+' : ''}{scenario.spotShock}% | Vol: +{scenario.volShock}%
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="flex gap-4">
                    <div>
                      <div className="text-sm text-muted-foreground">Unhedged</div>
                      <div className={`font-bold ${getPnLColor(scenario.unhedgedPnL)}`}>
                        {formatCurrency(scenario.unhedgedPnL)}
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">Hedged</div>
                      <div className={`font-bold ${getPnLColor(scenario.hedgedPnL)}`}>
                        {formatCurrency(scenario.hedgedPnL)}
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">Effectiveness</div>
                      <div className={`font-bold ${scenario.hedgeEffectiveness > 80 ? 'text-green-600' : scenario.hedgeEffectiveness > 50 ? 'text-yellow-600' : 'text-red-600'}`}>
                        {formatPercent(scenario.hedgeEffectiveness)}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </Layout>
  );
};

export default RiskAnalysis; 