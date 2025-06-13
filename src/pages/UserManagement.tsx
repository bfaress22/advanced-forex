import React from 'react';
import { Layout } from "@/components/Layout";
import Index from "./Index";

const UserManagement = () => {
  return (
    <Layout 
      title="User Management"
      breadcrumbs={[
        { label: "Dashboard", href: "/" },
        { label: "User Management" }
      ]}
    >
      <Index />
    </Layout>
  );
};

export default UserManagement; 