import React, { useState, useEffect } from "react";
import { Layout } from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from 'recharts';
import { 
  Activity, 
  TrendingUp,
  TrendingDown,
  Pause,
  Play,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  DollarSign,
  Clock,
  Zap
} from "lucide-react";

const PositionMonitor = () => {
  const [isLiveMode, setIsLiveMode] = useState(true);
  const [refreshInterval, setRefreshInterval] = useState("5");
  const [lastUpdate, setLastUpdate] = useState(new Date());

  // Sample real-time position data
  const [positions, setPositions] = useState([
    {
      id: "POS-001",
      currency: "EUR/USD",
      position: 1500000,
      marketRate: 1.0856,
      entryRate: 1.0845,
      unrealizedPnL: 16500,
      dailyPnL: 3200,
      exposure: "Long",
      hedge_status: "Partial",
      hedge_ratio: 65,
      last_trade: "10:34:22"
    },
    {
      id: "POS-002",
      currency: "GBP/USD",
      position: -750000,
      marketRate: 1.2734,
      entryRate: 1.2780,
      unrealizedPnL: 3450,
      dailyPnL: -1800,
      exposure: "Short",
      hedge_status: "Full",
      hedge_ratio: 100,
      last_trade: "10:33:45"
    },
    {
      id: "POS-003",
      currency: "USD/JPY",
      position: 300000,
      marketRate: 161.85,
      entryRate: 160.25,
      unrealizedPnL: 2970,
      dailyPnL: 850,
      exposure: "Long",
      hedge_status: "None",
      hedge_ratio: 0,
      last_trade: "10:32:18"
    }
  ]);

  // Sample market data for charts
  const marketData = [
    { time: "10:00", eurUsd: 1.0845, gbpUsd: 1.2780, usdJpy: 160.25 },
    { time: "10:15", eurUsd: 1.0850, gbpUsd: 1.2765, usdJpy: 160.80 },
    { time: "10:30", eurUsd: 1.0856, gbpUsd: 1.2734, usdJpy: 161.85 },
  ];

  // Simulate real-time updates
  useEffect(() => {
    if (!isLiveMode) return;

    const interval = setInterval(() => {
      setPositions(prevPositions =>
        prevPositions.map(pos => ({
          ...pos,
          marketRate: pos.marketRate + (Math.random() - 0.5) * 0.001,
          unrealizedPnL: pos.unrealizedPnL + (Math.random() - 0.5) * 1000,
          dailyPnL: pos.dailyPnL + (Math.random() - 0.5) * 500,
          last_trade: new Date().toLocaleTimeString()
        }))
      );
      setLastUpdate(new Date());
    }, parseInt(refreshInterval) * 1000);

    return () => clearInterval(interval);
  }, [isLiveMode, refreshInterval]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const formatRate = (rate: number, currency: string) => {
    if (currency.includes("JPY")) {
      return rate.toFixed(2);
    }
    return rate.toFixed(4);
  };

  const getPnLColor = (value: number) => {
    return value >= 0 ? "text-green-600" : "text-red-600";
  };

  const getHedgeStatusBadge = (status: string) => {
    switch (status) {
      case "Full":
        return <Badge className="bg-green-100 text-green-800 border-green-200">Full</Badge>;
      case "Partial":
        return <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">Partial</Badge>;
      case "None":
        return <Badge variant="destructive">None</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getExposureIcon = (exposure: string) => {
    return exposure === "Long" ? 
      <TrendingUp className="h-4 w-4 text-green-600" /> : 
      <TrendingDown className="h-4 w-4 text-red-600" />;
  };

  const totalUnrealizedPnL = positions.reduce((sum, pos) => sum + pos.unrealizedPnL, 0);
  const totalDailyPnL = positions.reduce((sum, pos) => sum + pos.dailyPnL, 0);
  const totalPositions = positions.length;
  const fullyHedgedCount = positions.filter(pos => pos.hedge_status === "Full").length;

  return (
    <Layout 
      breadcrumbs={[
        { label: "Dashboard", href: "/" },
        { label: "Position Monitor" }
      ]}
    >
      {/* Control Panel */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Real-Time Position Monitor
              </CardTitle>
              <CardDescription>
                Live monitoring of FX positions and market movements
              </CardDescription>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center space-x-2">
                <Switch
                  id="live-mode"
                  checked={isLiveMode}
                  onCheckedChange={setIsLiveMode}
                />
                <Label htmlFor="live-mode" className="flex items-center gap-2">
                  {isLiveMode ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
                  Live Mode
                </Label>
              </div>
              <Select value={refreshInterval} onValueChange={setRefreshInterval}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1 sec</SelectItem>
                  <SelectItem value="5">5 sec</SelectItem>
                  <SelectItem value="10">10 sec</SelectItem>
                  <SelectItem value="30">30 sec</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" size="sm">
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <div className={`h-2 w-2 rounded-full ${isLiveMode ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`} />
                <span className="text-sm text-muted-foreground">
                  {isLiveMode ? 'Live' : 'Paused'}
                </span>
              </div>
              <div className="text-sm text-muted-foreground">
                Last Update: {lastUpdate.toLocaleTimeString()}
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">Market Hours: 09:00 - 17:00 EST</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Unrealized P&L</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${getPnLColor(totalUnrealizedPnL)}`}>
              {formatCurrency(totalUnrealizedPnL)}
            </div>
            <p className="text-xs text-muted-foreground">
              Across all positions
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Daily P&L</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${getPnLColor(totalDailyPnL)}`}>
              {formatCurrency(totalDailyPnL)}
            </div>
            <p className="text-xs text-muted-foreground">
              Today's performance
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Positions</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalPositions}</div>
            <p className="text-xs text-muted-foreground">
              Open positions
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Hedge Coverage</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{fullyHedgedCount}/{totalPositions}</div>
            <p className="text-xs text-muted-foreground">
              Fully hedged
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Position Table */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Live Positions</CardTitle>
            <CardDescription>Real-time position updates and P&L</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Currency</TableHead>
                  <TableHead>Position</TableHead>
                  <TableHead>Market Rate</TableHead>
                  <TableHead>Entry Rate</TableHead>
                  <TableHead>Unrealized P&L</TableHead>
                  <TableHead>Daily P&L</TableHead>
                  <TableHead>Hedge Status</TableHead>
                  <TableHead>Last Trade</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {positions.map((position) => (
                  <TableRow key={position.id}>
                    <TableCell>
                      <Badge variant="outline" className="font-mono">
                        {position.currency}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getExposureIcon(position.exposure)}
                        <span className="font-mono">
                          {formatCurrency(Math.abs(position.position))}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="font-mono">
                      {formatRate(position.marketRate, position.currency)}
                    </TableCell>
                    <TableCell className="font-mono">
                      {formatRate(position.entryRate, position.currency)}
                    </TableCell>
                    <TableCell>
                      <span className={`font-mono font-medium ${getPnLColor(position.unrealizedPnL)}`}>
                        {formatCurrency(position.unrealizedPnL)}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className={`font-mono font-medium ${getPnLColor(position.dailyPnL)}`}>
                        {formatCurrency(position.dailyPnL)}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getHedgeStatusBadge(position.hedge_status)}
                        <span className="text-sm text-muted-foreground">
                          {position.hedge_ratio}%
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-sm">
                      {position.last_trade}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* Market Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Market Movements</CardTitle>
          <CardDescription>Real-time FX rate movements</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={marketData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="time" />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="eurUsd" stroke="#8884d8" strokeWidth={2} name="EUR/USD" />
              <Line type="monotone" dataKey="gbpUsd" stroke="#82ca9d" strokeWidth={2} name="GBP/USD" />
              <Line type="monotone" dataKey="usdJpy" stroke="#ffc658" strokeWidth={2} name="USD/JPY" />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Risk Alerts */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5" />
            Active Alerts
          </CardTitle>
          <CardDescription>Real-time position and market alerts</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center gap-3 p-3 border rounded-lg bg-yellow-50 border-yellow-200">
              <Zap className="h-4 w-4 text-yellow-600" />
              <div className="flex-1">
                <p className="text-sm font-medium">Position Limit Warning</p>
                <p className="text-xs text-muted-foreground">USD/JPY position approaching daily limit (85% utilized)</p>
              </div>
              <Badge variant="outline" className="text-xs">
                10:34:22
              </Badge>
            </div>
            
            <div className="flex items-center gap-3 p-3 border rounded-lg bg-red-50 border-red-200">
              <AlertTriangle className="h-4 w-4 text-red-600" />
              <div className="flex-1">
                <p className="text-sm font-medium">Hedge Effectiveness Alert</p>
                <p className="text-xs text-muted-foreground">EUR/USD hedge effectiveness below 80% threshold</p>
              </div>
              <Badge variant="outline" className="text-xs">
                10:32:15
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </Layout>
  );
};

export default PositionMonitor; 