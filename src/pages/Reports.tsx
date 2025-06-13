import React from 'react';
import { Layout } from "@/components/Layout";
import Index from "./Index";

const Reports = () => {
  return (
    <Layout 
      title="Reports"
      breadcrumbs={[
        { label: "Dashboard", href: "/" },
        { label: "Reports" }
      ]}
    >
      <Index />
    </Layout>
  );
};

export default Reports; 