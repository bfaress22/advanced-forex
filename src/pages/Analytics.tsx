import React from 'react';
import { Layout } from "@/components/Layout";
import Index from "./Index";

const Analytics = () => {
  return (
    <Layout 
      title="Analytics"
      breadcrumbs={[
        { label: "Dashboard", href: "/" },
        { label: "Analytics" }
      ]}
    >
      <Index />
    </Layout>
  );
};

export default Analytics; 