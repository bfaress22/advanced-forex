import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "./hooks/ThemeProvider";

// Import pages
import Dashboard from "./pages/Dashboard";
import Exposures from "./pages/Exposures";
import HedgingInstruments from "./pages/HedgingInstruments";
import RiskAnalysis from "./pages/RiskAnalysis";
import PositionMonitor from "./pages/PositionMonitor";
import Index from "./pages/Index";
import StrategyBuilder from "./pages/StrategyBuilder";
import Reports from "./pages/Reports";
import Performance from "./pages/Performance";
import Analytics from "./pages/Analytics";
import MarketData from "./pages/MarketData";
import UserManagement from "./pages/UserManagement";
import Settings from "./pages/Settings";
import SavedScenarios from "./pages/SavedScenarios";
import NotFound from "./pages/NotFound";

// Theme toggle component
import { ThemeToggle } from "./components/ui/theme-toggle";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <div className="fixed top-4 right-4 z-50">
          <ThemeToggle />
        </div>
        <Router>
          <Routes>
            {/* FX Risk Management Routes */}
            <Route path="/" element={<Dashboard />} />
            <Route path="/exposures" element={<Exposures />} />
            <Route path="/hedging" element={<HedgingInstruments />} />
            <Route path="/risk-analysis" element={<RiskAnalysis />} />
            
            {/* Strategy Builder and Advanced Features */}
            <Route path="/strategy-builder" element={<StrategyBuilder />} />
            <Route path="/positions" element={<PositionMonitor />} />
            <Route path="/reports" element={<Reports />} />
            <Route path="/performance" element={<Performance />} />
            <Route path="/analytics" element={<Analytics />} />
            <Route path="/market-data" element={<MarketData />} />
            <Route path="/users" element={<UserManagement />} />
            <Route path="/settings" element={<Settings />} />
            
            {/* Legacy routes */}
            <Route path="/saved" element={<SavedScenarios />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Router>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
