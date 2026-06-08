'use client';

import { useState } from 'react';
import { usePathname } from 'next/navigation';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import Sidebar from './Sidebar';
import AlertNotifier from './AlertNotifier';

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  // Standalone pages render without the admin chrome (sidebar/notifier).
  const isStandalonePage = ['/sign-in', '/privacy', '/terms'].some((p) => pathname.startsWith(p));
  const [sidebarOpen, setSidebarOpen] = useState(true);

  if (isStandalonePage) {
    return <>{children}</>;
  }

  return (
    <>
      <Sidebar open={sidebarOpen} />
      {/* Toggle button — lives outside the sidebar so overflow never clips it */}
      <button
        onClick={() => setSidebarOpen(o => !o)}
        title={sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
        className="absolute z-50 top-6 flex items-center justify-center w-6 h-6 rounded-full border border-slate-600 bg-slate-800 text-slate-300 hover:text-amber-400 hover:border-amber-400 transition-all duration-300 shadow-lg"
        style={{ left: sidebarOpen ? 'calc(16rem - 12px)' : 'calc(4rem - 12px)' }}
      >
        {sidebarOpen ? <ChevronLeft size={13} /> : <ChevronRight size={13} />}
      </button>
      <AlertNotifier />
      <div className="flex-1 flex flex-col h-screen overflow-hidden min-w-0">
        {children}
      </div>
    </>
  );
}
