'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import {
  LayoutDashboard,
  Users,
  Briefcase,
  GitBranch,
  Settings,
  MessageSquare,
  BarChart3,
  LogOut,
  Bell,
  DollarSign,
  Timer,
} from 'lucide-react';

const navItems = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/jobs', label: 'Jobs', icon: Briefcase },
  { href: '/alerts', label: 'Alerts', icon: Bell, alertBadge: true },
  { href: '/users', label: 'Team', icon: Users },
  { href: '/workflows', label: 'Workflow Templates', icon: GitBranch },
  { href: '/timers', label: 'Timer Monitor', icon: Timer },
  { href: '/finance', label: 'Finance', icon: DollarSign },
  { href: '/analytics', label: 'Analytics', icon: BarChart3 },
  { href: '/messages', label: 'WhatsApp Logs', icon: MessageSquare },
  { href: '/settings', label: 'Settings', icon: Settings },
];

interface SidebarProps {
  open: boolean;
}

export default function Sidebar({ open }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [userName, setUserName] = useState('Admin');
  const [userInitials, setUserInitials] = useState('A');
  const [alertCount, setAlertCount] = useState(0);

  useEffect(() => {
    const raw = localStorage.getItem('auth_user');
    if (raw) {
      try {
        const u = JSON.parse(raw);
        const name = u.name ?? 'Admin';
        setUserName(name);
        setUserInitials(
          name.split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0, 2)
        );
      } catch { /* ignore */ }
    }
  }, []);

  // Poll alert count every 30s
  useEffect(() => {
    async function fetchAlertCount() {
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/dashboard`);
        const json = await res.json();
        setAlertCount(json?.data?.stats?.alertCount ?? 0);
      } catch { /* ignore */ }
    }
    fetchAlertCount();
    const t = setInterval(fetchAlertCount, 30000);
    return () => clearInterval(t);
  }, []);

  function handleLogout() {
    localStorage.removeItem('auth_user');
    localStorage.removeItem('auth_token');
    document.cookie = 'auth_token=; Max-Age=0; path=/';
    router.push('/sign-in');
  }

  return (
    <aside
      className="flex-shrink-0 h-screen flex flex-col overflow-hidden transition-all duration-300"
      style={{
        background: 'linear-gradient(180deg, #0d1424 0%, #0f172a 60%, #0a1020 100%)',
        width: open ? '16rem' : '4rem',
        minWidth: open ? '16rem' : '4rem',
        borderRight: '1px solid rgba(255,255,255,0.05)',
      }}
    >
      {/* Logo */}
      <div
        className={`flex items-center gap-3 ${open ? 'px-5 py-5' : 'px-3.5 py-5 justify-center'}`}
        style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}
      >
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center font-black text-sm text-slate-900 flex-shrink-0 shadow-lg"
          style={{ background: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)' }}
        >
          SC
        </div>
        {open && (
          <div>
            <p className="text-white font-bold text-sm leading-tight tracking-tight">Stone Co</p>
            <p className="text-slate-500 text-[11px] font-medium tracking-wide uppercase">Admin Portal</p>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className={`flex-1 py-5 space-y-0.5 overflow-y-auto ${open ? 'px-3' : 'px-2'}`}>
        {navItems.map(({ href, label, icon: Icon, alertBadge }) => {
          const active = pathname === href || (href !== '/' && pathname.startsWith(href));
          const showBadge = alertBadge && alertCount > 0;
          return (
            <Link
              key={href}
              href={href}
              title={!open ? label : undefined}
              className={`relative flex items-center gap-3 rounded-xl text-sm font-medium transition-all duration-150 ${
                open ? 'px-3 py-2.5' : 'px-2 py-2.5 justify-center'
              } ${
                active
                  ? 'text-slate-900 shadow-md'
                  : 'text-slate-400 hover:text-white hover:bg-white/[0.06]'
              }`}
              style={active ? { background: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)' } : {}}
            >
              {/* left glow bar for active */}
              {!active && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-0 rounded-full bg-amber-400 transition-all duration-150 group-hover:h-4 opacity-0 hover:opacity-100" />
              )}
              <div className="relative flex-shrink-0">
                <Icon size={17} />
                {showBadge && (
                  <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center leading-none shadow-sm">
                    {alertCount > 9 ? '9+' : alertCount}
                  </span>
                )}
              </div>
              {open && <span className="flex-1 truncate">{label}</span>}
              {open && showBadge && (
                <span className="px-1.5 py-0.5 bg-red-500 text-white text-[10px] font-bold rounded-full leading-none shadow-sm">
                  {alertCount}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Footer — user + logout */}
      <div
        className={`${open ? 'px-4 py-4' : 'px-2 py-4'}`}
        style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}
      >
        {open ? (
          <div className="flex items-center gap-2.5">
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-slate-900 flex-shrink-0 shadow-md"
              style={{ background: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)' }}
            >
              {userInitials}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white text-xs font-semibold truncate">{userName}</p>
              <p className="text-slate-500 text-[11px]">Administrator</p>
            </div>
            <button
              onClick={handleLogout}
              title="Sign Out"
              className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-900/20 transition-all"
            >
              <LogOut size={14} />
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3">
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-slate-900 shadow-md"
              style={{ background: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)' }}
            >
              {userInitials}
            </div>
            <button
              onClick={handleLogout}
              title="Sign Out"
              className="p-2 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-900/20 transition-all"
            >
              <LogOut size={15} />
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}
