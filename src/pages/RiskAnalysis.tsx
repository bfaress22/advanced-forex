import React, { useState } from "react";
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
  Settings
} from "lucide-react";

const RiskAnalysis = () => {
  const [selectedScenario, setSelectedScenario] = useState("stress-test");
  const [volatilityShock, setVolatilityShock] = useState([20]);
  const [currencyShock, setCurrencyShock] = useState([10]);
  const [timeHorizon, setTimeHorizon] = useState([30]);

  // Sample scenario data
  const scenarioResults = [
    { scenario: "Base Case", pnl: 0, probability: 40 },
    { scenario: "Bull Market", pnl: 125000, probability: 20 },
    { scenario: "Bear Market", pnl: -180000, probability: 15 },
    { scenario: "High Volatility", pnl: -95000, probability: 15 },
    { scenario: "Currency Crisis", pnl: -350000, probability: 10 }
  ];

  const varData = [
    { confidence: "95%", var: 185000, expected_shortfall: 245000 },
    { confidence: "99%", var: 295000, expected_shortfall: 385000 },
    { confidence: "99.9%", var: 485000, expected_shortfall: 625000 }
  ];

  const currencyBreakdown = [
    { currency: "EUR", exposure: 2500000, var_95: 125000, color: "#8884d8" },
    { currency: "GBP", exposure: 1800000, var_95: 98000, color: "#82ca9d" },
    { currency: "JPY", exposure: 300000, var_95: 25000, color: "#ffc658" },
    { currency: "CHF", exposure: 950000, var_95: 42000, color: "#ff7300" }
  ];

  const timeSeries = [
    { date: "2024-01", pnl: 15000, cumulative: 15000 },
    { date: "2024-02", pnl: -25000, cumulative: -10000 },
    { date: "2024-03", pnl: 45000, cumulative: 35000 },
    { date: "2024-04", pnl: -15000, cumulative: 20000 },
    { date: "2024-05", pnl: 35000, cumulative: 55000 },
    { date: "2024-06", pnl: -60000, cumulative: -5000 }
  ];

  const stressTestResults = [
    { factor: "EUR/USD -10%", impact: -185000, hedged_impact: -92500 },
    { factor: "GBP/USD -15%", impact: -270000, hedged_impact: -54000 },
    { factor: "USD/JPY +20%", impact: 60000, hedged_impact: 18000 },
    { factor: "Volatility +50%", impact: -125000, hedged_impact: -37500 }
  ];

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

  const runScenarioAnalysis = () => {
    // Placeholder for scenario analysis logic
    console.log("Running scenario analysis with:", {
      scenario: selectedScenario,
      volatilityShock: volatilityShock[0],
      currencyShock: currencyShock[0],
      timeHorizon: timeHorizon[0]
    });
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
            <div className="text-2xl font-bold text-red-600">$185K</div>
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
            <div className="text-2xl font-bold text-red-600">$245K</div>
            <p className="text-xs text-muted-foreground">
              Conditional VaR (95%)
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Stress Test</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">$350K</div>
            <p className="text-xs text-muted-foreground">
              Worst case scenario
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Risk Utilization</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">74%</div>
            <p className="text-xs text-muted-foreground">
              Of allocated limit
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Scenario Analysis */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5" />
              Scenario Analysis
            </CardTitle>
            <CardDescription>
              Run custom stress tests and scenario analysis
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
                <Label>Volatility Shock: {volatilityShock[0]}%</Label>
                <Slider
                  value={volatilityShock}
                  onValueChange={setVolatilityShock}
                  max={100}
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
                <Button onClick={runScenarioAnalysis} className="flex-1">
                  <Play className="h-4 w-4 mr-2" />
                  Run Analysis
                </Button>
                <Button variant="outline">
                  <Settings className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* VaR Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle>Value at Risk Breakdown</CardTitle>
            <CardDescription>Risk metrics by confidence level</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {varData.map((item) => (
                <div key={item.confidence} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <div className="font-medium">{item.confidence} Confidence</div>
                    <div className="text-sm text-muted-foreground">1-day horizon</div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold text-red-600">
                      {formatCurrency(item.var)}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      ES: {formatCurrency(item.expected_shortfall)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Section */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* P&L Time Series */}
        <Card>
          <CardHeader>
            <CardTitle>Historical P&L</CardTitle>
            <CardDescription>Monthly P&L and cumulative performance</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={timeSeries}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis tickFormatter={(value) => `$${(value/1000).toFixed(0)}K`} />
                <Tooltip 
                  formatter={(value: number) => [formatCurrency(value), ""]}
                  labelFormatter={(label) => `Month: ${label}`}
                />
                <Line type="monotone" dataKey="pnl" stroke="#8884d8" strokeWidth={2} />
                <Line type="monotone" dataKey="cumulative" stroke="#82ca9d" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Currency Risk Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle>Risk by Currency</CardTitle>
            <CardDescription>VaR contribution by currency pair</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={currencyBreakdown}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ currency, percent }) => `${currency} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="var_95"
                >
                  {currencyBreakdown.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: number) => formatCurrency(value)} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Scenario Results */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Scenario Results</CardTitle>
              <CardDescription>Potential P&L under different market scenarios</CardDescription>
            </div>
            <Button variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="scenarios">
            <TabsList>
              <TabsTrigger value="scenarios">Market Scenarios</TabsTrigger>
              <TabsTrigger value="stress-tests">Stress Tests</TabsTrigger>
            </TabsList>
            
            <TabsContent value="scenarios" className="mt-4">
              <div className="space-y-3">
                {scenarioResults.map((scenario, index) => (
                  <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <Badge variant="outline">{scenario.probability}%</Badge>
                      <div>
                        <div className="font-medium">{scenario.scenario}</div>
                        <div className="text-sm text-muted-foreground">
                          Probability of occurrence
                        </div>
                      </div>
                    </div>
                    <div className={`text-lg font-bold ${getPnLColor(scenario.pnl)}`}>
                      {formatCurrency(scenario.pnl)}
                    </div>
                  </div>
                ))}
              </div>
            </TabsContent>
            
            <TabsContent value="stress-tests" className="mt-4">
              <div className="space-y-3">
                {stressTestResults.map((test, index) => (
                  <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <div className="font-medium">{test.factor}</div>
                      <div className="text-sm text-muted-foreground">
                        Market stress scenario
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={`font-bold ${getPnLColor(test.impact)}`}>
                        {formatCurrency(test.impact)}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        After hedge: {formatCurrency(test.hedged_impact)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </Layout>
  );
};

export default RiskAnalysis; 