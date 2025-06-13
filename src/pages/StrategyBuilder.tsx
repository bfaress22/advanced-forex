import React from 'react';
import { Layout } from "@/components/Layout";
import Index from "./Index";

const StrategyBuilder = () => {
  return (
    <Layout 
      title="Strategy Builder"
      breadcrumbs={[
        { label: "Dashboard", href: "/" },
        { label: "Strategy Builder" }
      ]}
    >
      {/* Wrap the existing Index component */}
      <Index />
    </Layout>
  );
};

export default StrategyBuilder; 