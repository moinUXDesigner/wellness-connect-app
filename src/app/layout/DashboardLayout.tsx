import { useState, type CSSProperties, type ReactNode } from 'react';
import { Outlet } from 'react-router';
import { motion, type TargetAndTransition } from 'motion/react';
import Sidebar, { type NavItem } from './Sidebar';
import Topbar from './Topbar';
import { BottomNav } from '../components/BottomNav';

export default function DashboardLayout({
  navItems,
  bottomNavItems,
  title,
  children,
}: {
  navItems: NavItem[];
  bottomNavItems?: NavItem[];
  title?: string;
  children?: ReactNode;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const sidebarWidth = collapsed ? 80 : 288;

  return (
    <div className="dashboard-theme min-h-screen overflow-x-clip bg-slate-50 text-slate-950 transition-colors dark:bg-slate-950 dark:text-slate-100">
      <Sidebar
        items={navItems}
        collapsed={collapsed}
        width={sidebarWidth}
        title={title}
        onToggle={() => setCollapsed((prev) => !prev)}
        mobileOpen={mobileSidebarOpen}
        onMobileClose={() => setMobileSidebarOpen(false)}
      />
      <motion.div
        initial={false}
        style={{ '--sidebar-offset': '288px' } as CSSProperties}
        animate={{ '--sidebar-offset': `${sidebarWidth}px` } as unknown as TargetAndTransition}
        transition={{ type: 'spring', stiffness: 240, damping: 28 }}
        className="dashboard-content min-w-0 max-w-full overflow-x-clip"
      >
        <Topbar
          onOpenMobileSidebar={() => setMobileSidebarOpen(true)}
          onToggleSidebar={() => setCollapsed((prev) => !prev)}
          sidebarCollapsed={collapsed}
        />
        <main className="mx-auto w-full max-w-[1600px] overflow-x-clip px-3 py-4 pb-24 sm:p-4 sm:pb-24 lg:p-6">{children ?? <Outlet />}</main>
      </motion.div>
      <BottomNav items={bottomNavItems ?? navItems} onOpenMenu={() => setMobileSidebarOpen(true)} />
    </div>
  );
}
