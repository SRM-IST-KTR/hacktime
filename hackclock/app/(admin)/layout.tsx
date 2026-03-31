"use client";

import { useSession } from "next-auth/react";
import { redirect } from "next/navigation";
import Link from "next/link";
import { useState } from "react";
import Sidebar from "@/components/ui/Sidebar";
import NotificationPopover from "@/components/ui/NotificationPopover";
import SettingsPopover from "@/components/ui/SettingsPopover";
import { User, Menu, X } from "lucide-react";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  if (status === "unauthenticated") {
    redirect("/login");
  }

  return (
    <div className="flex flex-col lg:flex-row h-screen overflow-hidden" style={{ backgroundColor: '#0F0F10', color: '#E6E6E6' }}>
      {/* Mobile Header */}
      <header className="lg:hidden h-16 flex justify-between items-center px-6 z-30 shrink-0" style={{ backgroundColor: '#0F0F10', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <button
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          className="p-2 -ml-2 transition-colors hover:text-white"
          style={{ color: '#A0A0A0' }}
        >
          {isSidebarOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
        <h2 className="text-lg font-bold tracking-tight" style={{ color: '#E6E6E6' }}>hackTime</h2>
        <Link href="/profile" className="flex items-center gap-2 min-w-0 max-w-[44vw]">
          <span className="truncate text-[10px] font-mono uppercase" style={{ color: '#CFFF04' }}>
            {session?.user?.name || 'ADMIN'}
          </span>
          <div className="w-8 h-8 rounded-full flex items-center justify-center overflow-hidden shrink-0" style={{ backgroundColor: '#1C1C1C', border: '1px solid rgba(255,255,255,0.06)' }}>
            {session?.user?.image ? (
              <img src={session.user.image} alt="Avatar" className="w-full h-full object-cover" />
            ) : (
              <User size={16} style={{ color: '#E6E6E6' }} />
            )}
          </div>
        </Link>
      </header>

      {/* Sidebar - Responsive logic handled within Sidebar or here */}
      <div className={`
        fixed inset-0 z-40 lg:relative lg:inset-auto lg:block
        ${isSidebarOpen ? 'pointer-events-auto' : 'pointer-events-none'}
        lg:pointer-events-auto
      `}>
        {/* Backdrop for mobile */}
        <div
          className={`absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity duration-300 ease-out lg:hidden ${isSidebarOpen ? 'opacity-100' : 'opacity-0'}`}
          onClick={() => setIsSidebarOpen(false)}
        />
        <div className={`relative h-full w-64 transition-transform duration-300 ease-[cubic-bezier(0.23,1,0.32,1)] lg:translate-x-0 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
          <Sidebar onNavItemClick={() => setIsSidebarOpen(false)} />
        </div>
      </div>

      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        {/* Desktop Header */}
        <header className="hidden lg:flex h-16 justify-between items-center px-8 shrink-0" style={{ backgroundColor: '#0F0F10', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <h2 className="text-lg font-bold" style={{ color: '#E6E6E6' }}>hackTime</h2>
          <div className="flex items-center gap-4" style={{ color: '#A0A0A0' }}>

            <Link href="/profile" className="flex items-center gap-3 cursor-pointer group">
              <span className="text-xs font-mono uppercase group-hover:text-[#FF2E9A] transition-colors" style={{ color: '#CFFF04' }}>
                {session?.user?.name || 'ADMIN'}
              </span>
              <div className="w-8 h-8 rounded-full flex items-center justify-center overflow-hidden transition-colors" style={{ backgroundColor: '#1C1C1C', border: '1px solid rgba(255,255,255,0.06)' }}>
                {session?.user?.image ? (
                  <img src={session.user.image} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  <User size={16} style={{ color: '#E6E6E6' }} />
                )}
              </div>
            </Link>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 md:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
