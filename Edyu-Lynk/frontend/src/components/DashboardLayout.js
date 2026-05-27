import React from 'react';
import Sidebar from '@/components/Sidebar';

const DashboardLayout = ({ children }) => {
  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <div className="lg:ml-64 pt-16 lg:pt-0">
        <main className="p-4 sm:p-6 md:p-8 lg:p-12">
          {children}
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;