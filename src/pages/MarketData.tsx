import React from 'react';
import { Layout } from "@/components/Layout";
import Index from "./Index";

const MarketData = () => {
  return (
    <Layout 
      title="Market Data"
      breadcrumbs={[
        { label: "Dashboard", href: "/" },
        { label: "Market Data" }
      ]}
    >
      <Index />
    </Layout>
  );
};

export default MarketData; 