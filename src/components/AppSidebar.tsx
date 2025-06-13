import React from "react";
import {
  BarChart3,
  DollarSign,
  Globe,
  Home,
  Settings,
  TrendingUp,
  FileText,
  Shield,
  AlertTriangle,
  Target,
  PieChart,
  Users,
  Database,
  Briefcase,
  Activity
} from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  SidebarSeparator,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const menuItems = [
  {
    title: "Dashboard",
    url: "/",
    icon: Home,
    description: "Global overview and key metrics"
  },
  {
    title: "FX Exposures",
    url: "/exposures",
    icon: DollarSign,
    description: "Manage currency exposures and flows",
    badge: "Active"
  },
  {
    title: "Hedging Instruments",
    url: "/hedging",
    icon: Shield,
    description: "Forwards, options, swaps management"
  },
  {
    title: "Strategy Builder",
    url: "/strategy-builder",
    icon: Target,
    description: "Build and test hedging strategies"
  },
  {
    title: "Risk Analysis",
    url: "/risk-analysis",
    icon: BarChart3,
    description: "Scenario analysis and stress testing"
  },
  {
    title: "Position Monitor",
    url: "/positions",
    icon: Activity,
    description: "Real-time position monitoring"
  }
];

const reportingItems = [
  {
    title: "Reports",
    url: "/reports",
    icon: FileText,
    description: "Generate custom reports"
  },
  {
    title: "Performance",
    url: "/performance",
    icon: TrendingUp,
    description: "Hedging effectiveness tracking"
  },
  {
    title: "Analytics",
    url: "/analytics",
    icon: PieChart,
    description: "Advanced analytics dashboard"
  }
];

const managementItems = [
  {
    title: "Market Data",
    url: "/market-data",
    icon: Database,
    description: "FX rates and volatility feeds"
  },
  {
    title: "User Management",
    url: "/users",
    icon: Users,
    description: "Roles and permissions"
  },
  {
    title: "Settings",
    url: "/settings",
    icon: Settings,
    description: "System configuration"
  }
];

export function AppSidebar() {
  const location = useLocation();
  
  const isActive = (path: string) => {
    return location.pathname === path;
  };

  return (
    <Sidebar className="border-r border-border/40 bg-gradient-to-b from-background to-background/95">
      <SidebarHeader className="p-6 border-b border-border/40">
        <div className="flex items-center space-x-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 border border-primary/20">
            <Globe className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-foreground">FX Risk Manager</h2>
            <p className="text-sm text-muted-foreground">Currency Hedging Platform</p>
          </div>
        </div>
      </SidebarHeader>
      
      <SidebarContent className="p-2">
        {/* Core Functions */}
        <SidebarGroup>
          <SidebarGroupLabel className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-2 mb-2">
            Core Functions
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton 
                    asChild 
                    isActive={isActive(item.url)}
                    className="group relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all hover:bg-accent hover:text-accent-foreground"
                  >
                    <Link to={item.url} className="flex items-center gap-3 w-full">
                      <item.icon className="h-4 w-4 shrink-0" />
                      <span className="flex-1">{item.title}</span>
                      {item.badge && (
                        <Badge variant="secondary" className="text-xs h-5">
                          {item.badge}
                        </Badge>
                      )}
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarSeparator className="my-4" />

        {/* Reporting & Analytics */}
        <SidebarGroup>
          <SidebarGroupLabel className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-2 mb-2">
            Reporting & Analytics
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {reportingItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton 
                    asChild 
                    isActive={isActive(item.url)}
                    className="group relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all hover:bg-accent hover:text-accent-foreground"
                  >
                    <Link to={item.url} className="flex items-center gap-3 w-full">
                      <item.icon className="h-4 w-4 shrink-0" />
                      <span className="flex-1">{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarSeparator className="my-4" />

        {/* Management */}
        <SidebarGroup>
          <SidebarGroupLabel className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-2 mb-2">
            Management
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {managementItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton 
                    asChild 
                    isActive={isActive(item.url)}
                    className="group relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all hover:bg-accent hover:text-accent-foreground"
                  >
                    <Link to={item.url} className="flex items-center gap-3 w-full">
                      <item.icon className="h-4 w-4 shrink-0" />
                      <span className="flex-1">{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Risk Alerts */}
        <SidebarGroup className="mt-6">
          <SidebarGroupLabel className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-2 mb-2">
            Risk Alerts
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <div className="space-y-2">
              <div className="p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/30 rounded-lg">
                <div className="flex items-center space-x-2">
                  <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-amber-800 dark:text-amber-200">High Volatility</p>
                    <p className="text-xs text-amber-600 dark:text-amber-400 truncate">EUR/USD above threshold</p>
                  </div>
                </div>
              </div>
              
              <div className="p-3 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800/30 rounded-lg">
                <div className="flex items-center space-x-2">
                  <AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-400" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-red-800 dark:text-red-200">Exposure Limit</p>
                    <p className="text-xs text-red-600 dark:text-red-400 truncate">GBP exposure at 95%</p>
                  </div>
                </div>
              </div>
            </div>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-4 border-t border-border/40">
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Market Status</span>
            <div className="flex items-center gap-1">
              <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-green-600 dark:text-green-400">Live</span>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="bg-muted/50 rounded p-2">
              <div className="text-muted-foreground">EUR/USD</div>
              <div className="font-mono font-medium">1.0856</div>
            </div>
            <div className="bg-muted/50 rounded p-2">
              <div className="text-muted-foreground">GBP/USD</div>
              <div className="font-mono font-medium">1.2734</div>
            </div>
          </div>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
} 