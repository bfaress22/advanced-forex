import React from 'react';
import { Layout } from "@/components/Layout";
import Index from "./Index";

const Performance = () => {
  return (
    <Layout 
      title="Performance"
      breadcrumbs={[
        { label: "Dashboard", href: "/" },
        { label: "Performance" }
      ]}
    >
      <Index />
    </Layout>
  );
};

export default Performance; 