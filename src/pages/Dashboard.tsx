import React from "react";
import { Layout } from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useFinancialData } from "@/hooks/useFinancialData";
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Shield, 
  AlertTriangle,
  BarChart3,
  Globe,
  Target,
  Activity,
  ArrowUpRight,
  ArrowDownRight,
  RefreshCw,
  Play,
  Pause
} from "lucide-react";

const Dashboard = () => {
  const { 
    riskMetrics, 
    currencyExposures, 
    marketData, 
    isLiveMode, 
    setLiveMode, 
    lastUpdate,
    updateMarketData,
    generateStressScenarios
  } = useFinancialData();

  // Generate real-time alerts based on actual data
  const generateAlerts = () => {
    const alerts = [];
    
    // Check volatility alerts
    Object.entries(marketData.volatilities).forEach(([pair, vol]) => {
      if (vol > 0.15) { // 15% volatility threshold
        alerts.push({
          type: "high",
          message: `${pair} volatility above ${(vol * 100).toFixed(1)}%`,
          time: "Real-time"
        });
      }
    });

    // Check hedge ratio alerts
    currencyExposures.forEach(exp => {
      if (exp.hedgeRatio < 60 && exp.grossExposure > 1000000) {
        alerts.push({
          type: "medium",
          message: `${exp.currency} hedge ratio below target (${exp.hedgeRatio.toFixed(1)}%)`,
          time: "Real-time"
        });
      }
    });

    // Check VaR alerts
    if (riskMetrics.var95 > 500000) {
      alerts.push({
        type: "high",
        message: `VaR exceeds $${(riskMetrics.var95 / 1000).toFixed(0)}K threshold`,
        time: "Real-time"
      });
    }

    return alerts.slice(0, 3); // Show only top 3 alerts
  };

  const alerts = generateAlerts();

  const formatCurrency = (amount: number, currency: string) => {
    if (currency === "JPY") {
      return `¥${(amount / 1000000).toFixed(1)}M`;
    }
    return `${currency === "USD" ? "$" : currency === "EUR" ? "€" : "£"}${(amount / 1000000).toFixed(1)}M`;
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case "up": return <TrendingUp className="h-4 w-4 text-green-500" />;
      case "down": return <TrendingDown className="h-4 w-4 text-red-500" />;
      default: return <Activity className="h-4 w-4 text-gray-500" />;
    }
  };

  const getAlertVariant = (type: string) => {
    switch (type) {
      case "high": return "destructive";
      case "medium": return "secondary";
      default: return "outline";
    }
  };

  return (
    <Layout 
      title="Dashboard"
      breadcrumbs={[
        { label: "Dashboard" }
      ]}
    >
      {/* Real-time Controls */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-4">
          <div className="text-sm text-muted-foreground">
            Last updated: {lastUpdate.toLocaleTimeString()}
          </div>
          <div className={`flex items-center gap-2 text-sm ${isLiveMode ? 'text-green-600' : 'text-gray-600'}`}>
            {isLiveMode ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
            {isLiveMode ? 'Live Mode' : 'Static Mode'}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={updateMarketData}
            className="flex items-center gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh Data
          </Button>
          <Button
            variant={isLiveMode ? "destructive" : "default"}
            size="sm"
            onClick={() => setLiveMode(!isLiveMode)}
            className="flex items-center gap-2"
          >
            {isLiveMode ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            {isLiveMode ? 'Stop Live' : 'Start Live'}
          </Button>
        </div>
      </div>
      {/* Key Metrics Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Exposure</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${(riskMetrics.totalExposure / 1000000).toFixed(1)}M</div>
            <p className="text-xs text-muted-foreground">
              <span className="text-green-600 flex items-center gap-1">
                <ArrowUpRight className="h-3 w-3" />
                Real-time calculation
              </span>
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Hedged Amount</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${(riskMetrics.hedgedAmount / 1000000).toFixed(1)}M</div>
            <p className="text-xs text-muted-foreground">
              <span className={`flex items-center gap-1 ${riskMetrics.hedgeRatio > 70 ? 'text-green-600' : 'text-yellow-600'}`}>
                {riskMetrics.hedgeRatio > 70 ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                {riskMetrics.hedgeRatio.toFixed(1)}% hedge ratio
              </span>
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Unhedged Risk</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${(riskMetrics.unhedgedRisk / 1000000).toFixed(1)}M</div>
            <p className="text-xs text-muted-foreground">
              <span className={`flex items-center gap-1 ${riskMetrics.unhedgedRisk > 2000000 ? 'text-red-600' : 'text-yellow-600'}`}>
                <AlertTriangle className="h-3 w-3" />
                {riskMetrics.unhedgedRisk > 2000000 ? 'High' : 'Medium'} priority
              </span>
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">MTM Impact</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${riskMetrics.mtmImpact >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {riskMetrics.mtmImpact >= 0 ? '+' : ''}${(riskMetrics.mtmImpact / 1000).toFixed(0)}K
            </div>
            <p className="text-xs text-muted-foreground">
              <span className={`flex items-center gap-1 ${riskMetrics.mtmImpact >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {riskMetrics.mtmImpact >= 0 ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                {riskMetrics.mtmImpact >= 0 ? 'Favorable' : 'Unfavorable'} movements
              </span>
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        {/* Currency Exposure Overview */}
        <Card className="col-span-4">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="h-5 w-5" />
              Currency Exposure Overview
            </CardTitle>
            <CardDescription>
              Breakdown of exposures and hedge ratios by currency
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {currencyExposures.map((item) => (
              <div key={item.currency} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="font-mono">
                        {item.currency}
                      </Badge>
                      {getTrendIcon(item.trend)}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {formatCurrency(item.grossExposure, item.currency)} exposure
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-medium">
                      {formatCurrency(item.hedgedAmount, item.currency)} hedged
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {item.hedgeRatio.toFixed(1)}% ratio
                    </div>
                  </div>
                </div>
                <Progress value={item.hedgeRatio} className="h-2" />
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Risk Alerts */}
        <Card className="col-span-3">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Risk Alerts
            </CardTitle>
            <CardDescription>
              Active alerts and notifications
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {alerts.map((alert, index) => (
              <div key={index} className="flex items-start gap-3 p-3 rounded-lg border bg-card">
                <div className={`h-2 w-2 rounded-full mt-2 ${
                  alert.type === "high" ? "bg-red-500" : 
                  alert.type === "medium" ? "bg-yellow-500" : "bg-blue-500"
                }`} />
                <div className="flex-1">
                  <p className="text-sm font-medium">{alert.message}</p>
                  <p className="text-xs text-muted-foreground mt-1">{alert.time}</p>
                </div>
              </div>
            ))}
            <Button variant="outline" className="w-full" size="sm">
              View All Alerts
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card className="hover:shadow-md transition-shadow cursor-pointer">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Target className="h-5 w-5 text-primary" />
              Strategy Builder
            </CardTitle>
            <CardDescription>
              Build and test new hedging strategies
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button className="w-full">
              Create New Strategy
            </Button>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow cursor-pointer">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <BarChart3 className="h-5 w-5 text-primary" />
              Risk Analysis
            </CardTitle>
            <CardDescription>
              Run scenario analysis and stress tests
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" className="w-full">
              Run Analysis
            </Button>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow cursor-pointer">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Activity className="h-5 w-5 text-primary" />
              Live Positions
            </CardTitle>
            <CardDescription>
              Monitor real-time position changes
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" className="w-full">
              View Positions
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Market Overview Footer */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Market Overview</CardTitle>
          <CardDescription>Current FX rates and recent changes</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-lg font-mono font-bold">1.0856</div>
              <div className="text-sm text-muted-foreground">EUR/USD</div>
              <div className="text-xs text-green-600">+0.12%</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-mono font-bold">1.2734</div>
              <div className="text-sm text-muted-foreground">GBP/USD</div>
              <div className="text-xs text-red-600">-0.08%</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-mono font-bold">161.85</div>
              <div className="text-sm text-muted-foreground">USD/JPY</div>
              <div className="text-xs text-green-600">+0.24%</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-mono font-bold">0.9642</div>
              <div className="text-sm text-muted-foreground">USD/CHF</div>
              <div className="text-xs text-green-600">+0.05%</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </Layout>
  );
};

export default Dashboard; 