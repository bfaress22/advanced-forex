import React from 'react';
import { Layout } from "@/components/Layout";
import Index from "./Index";

const Settings = () => {
  return (
    <Layout 
      title="Settings"
      breadcrumbs={[
        { label: "Dashboard", href: "/" },
        { label: "Settings" }
      ]}
    >
      <Index />
    </Layout>
  );
};

export default Settings; 