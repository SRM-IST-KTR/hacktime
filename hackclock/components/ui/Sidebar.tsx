"use client";

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useState, useEffect, useRef } from 'react';
import { LayoutGrid, Clock, Network, Monitor, XCircle, X, Terminal } from 'lucide-react';
import JoinRoomControls from '@/components/ui/JoinRoomControls';

interface SidebarProps {
  onNavItemClick?: () => void;
}

export default function Sidebar({ onNavItemClick }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session, update } = useSession();
  const stageTransitionTimeoutRef = useRef<number | null>(null);
  const lastClearedRoomRef = useRef<string | null>(null);
  
  // Dynamic State for both Organizers and Guests
  const [currentRoomId, setCurrentRoomId] = useState<string | null>(null);
  const [currentRoomName, setCurrentRoomName] = useState<string | null>(null);
  const [isGuest, setIsGuest] = useState(false);
  const [guestName, setGuestName] = useState("");
  const [isStageTransitioning, setIsStageTransitioning] = useState(false);

  useEffect(() => {
    let cancelled = false;

    // 1. Check for Organizer Session First
    const sessionRoom = (session?.user as { activeRoomId?: string })?.activeRoomId;
    if (sessionRoom) {
      if (lastClearedRoomRef.current !== sessionRoom) {
        lastClearedRoomRef.current = null;
      }

      const validateOrganizerRoom = async () => {
        try {
          const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/hackathons/${sessionRoom}`);
          if (cancelled) return;

          if (!res.ok) {
            setCurrentRoomId(null);
            setCurrentRoomName(null);
            setIsGuest(false);
            setGuestName("");
            if (lastClearedRoomRef.current !== sessionRoom) {
              lastClearedRoomRef.current = sessionRoom;
              await update({ activeRoomId: null });
            }
            return;
          }

          const room = await res.json();
          if (cancelled) return;

          if (room?.roomId && (room.status === 'RUNNING' || room.status === 'PAUSED') && !room.error) {
            const timeout = setTimeout(() => {
              if (cancelled) return;
              setCurrentRoomId(room.roomId);
              setCurrentRoomName(room.name);
              setIsGuest(false);
              setGuestName("");
            }, 0);
            return () => clearTimeout(timeout);
          }

          setCurrentRoomId(null);
          setCurrentRoomName(null);
          setIsGuest(false);
          setGuestName("");
          if (lastClearedRoomRef.current !== sessionRoom) {
            lastClearedRoomRef.current = sessionRoom;
            await update({ activeRoomId: null });
          }
        } catch {
          if (!cancelled) {
            setCurrentRoomId(null);
            setCurrentRoomName(null);
            setIsGuest(false);
            setGuestName("");
          }
        }
      };

      void validateOrganizerRoom();
      return () => {
        cancelled = true;
      };
    }

    // 2. Check for Guest Session Fallback
    const guestData = localStorage.getItem('hackclock_guest');
    if (guestData) {
      try {
        const parsed = JSON.parse(guestData);
        if (parsed.roomId) {
          const validateGuestRoom = async () => {
            try {
              const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/hackathons/${parsed.roomId}`);
              if (cancelled) return;

              if (!res.ok) {
                localStorage.removeItem('hackclock_guest');
                setCurrentRoomId(null);
                setCurrentRoomName(null);
                setIsGuest(false);
                setGuestName("");
                return;
              }

              const room = await res.json();
              if (cancelled) return;

              if (room?.roomId && !room.error) {
                const timeout = setTimeout(() => {
                  if (cancelled) return;
                  setCurrentRoomId(parsed.roomId);
                  setCurrentRoomName(room.name);
                  setIsGuest(true);
                  setGuestName(parsed.teamName || "Guest");
                }, 0);
                return () => clearTimeout(timeout);
              }

              localStorage.removeItem('hackclock_guest');
              setCurrentRoomId(null);
              setCurrentRoomName(null);
              setIsGuest(false);
              setGuestName("");
            } catch {
              if (!cancelled) {
                setCurrentRoomId(null);
                setCurrentRoomName(null);
                setIsGuest(false);
                setGuestName("");
              }
            }
          };

          void validateGuestRoom();
          return () => {
            cancelled = true;
          };
        }
      } catch { console.error("Guest session parse failed"); }
    } else {
      const timeout = setTimeout(() => {
        setCurrentRoomId(null);
        setCurrentRoomName(null);
        setIsGuest(false);
        setGuestName("");
      }, 0);
      return () => clearTimeout(timeout);
    }
  }, [session, update]);

  useEffect(() => {
    return () => {
      if (stageTransitionTimeoutRef.current) {
        window.clearTimeout(stageTransitionTimeoutRef.current);
      }
    };
  }, []);

  const handleDisconnect = async () => {
    if (isGuest) {
      // Disconnect Guest
      localStorage.removeItem('hackclock_guest');
      setCurrentRoomId(null);
      router.push('/login');
    } else {
      // Disconnect Organizer
      await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/auth/active-room`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: session?.user?.email, roomId: null })
      });
      await update({ activeRoomId: null });
    }
    onNavItemClick?.();
  };

  // Restrict Nav Items based on Role
  const navItems = [
    ...(!isGuest ? [{ name: 'Dashboard', href: '/dashboard', icon: LayoutGrid }] : []),
    ...(!isGuest ? [{ name: 'Flow Creation', href: '/flow', icon: Network }] : []),
    { name: 'Clock View', href: currentRoomId ? `/room/${currentRoomId}/clock` : '/clock', icon: Clock },
    { name: 'Stage Mode', href: currentRoomId ? `/room/${currentRoomId}/stage` : '/stage', icon: Monitor },
  ];

  const handleNavClick = (href: string) => {
    const shouldAnimateStageExit = href.startsWith('/room/') && href.endsWith('/stage') && pathname !== href;

    if (!shouldAnimateStageExit) {
      onNavItemClick?.();
      return;
    }

    setIsStageTransitioning(true);
    stageTransitionTimeoutRef.current = window.setTimeout(() => {
      router.push(href);
      onNavItemClick?.();
    }, 220);
  };

  return (
    <aside className={`w-full h-full backdrop-blur-2xl flex flex-col z-20 overflow-y-auto transition-all duration-200 ${isStageTransitioning ? '-translate-x-full opacity-0 scale-[0.98]' : 'translate-x-0 opacity-100 scale-100'}`} style={{ backgroundColor: 'rgba(15,15,16,0.8)', borderRight: '1px solid rgba(255,255,255,0.06)' }}>
      <div className="h-20 flex items-center justify-between px-8 shrink-0" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <h2 className="text-xl font-bold tracking-tight flex items-center gap-2" style={{ color: '#E6E6E6' }}>
          <div className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #5D00FF, #FF2E9A)' }}>
            <Terminal size={14} className="text-white" />
          </div>
          hackTime
        </h2>
        <button className="lg:hidden transition-colors hover:text-white" style={{ color: '#A0A0A0' }} onClick={onNavItemClick}>
          <X size={20} />
        </button>
      </div>
      
      <div className="px-6 py-6" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        {currentRoomId ? (
          <div className="p-4 rounded-[20px] relative group overflow-hidden" style={{ backgroundColor: 'rgba(28,28,28,0.6)', border: '1px solid rgba(255,46,154,0.15)', boxShadow: '0 8px 32px rgba(255,46,154,0.06)' }}>
            <p className="text-[9px] uppercase font-bold tracking-[0.15em] mb-1.5 flex items-center gap-2" style={{ color: '#FF2E9A' }}>
               <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ backgroundColor: '#FF2E9A' }}></span> 
               {isGuest ? 'GUEST NODE' : 'ACTIVE HACKATHON'}
            </p>
            <p className="text-sm font-semibold truncate" style={{ color: '#E6E6E6' }}>{currentRoomName || 'Session Loading...'}</p>
            <p className="text-[10px] font-mono tracking-widest mt-1 opacity-50" style={{ color: '#A0A0A0' }}>{currentRoomId}</p>
            {isGuest && <p className="text-[10px] font-medium mt-1 truncate" style={{ color: '#FF2E9A' }}>{guestName}</p>}
            
            <button onClick={handleDisconnect} className="absolute right-3 top-3 opacity-0 group-hover:opacity-100 transition-all hover:text-[#F43F5E]" style={{ color: '#A0A0A0' }}>
               <XCircle size={16} />
            </button>
          </div>
        ) : (
          <div className="p-4 rounded-[20px]" style={{ backgroundColor: 'rgba(244,63,94,0.05)', border: '1px solid rgba(244,63,94,0.1)' }}>
            <p className="text-[9px] uppercase font-bold tracking-[0.15em] mb-1" style={{ color: '#F43F5E' }}>OFFLINE</p>
            <p className="text-[11px] font-medium leading-relaxed" style={{ color: '#A0A0A0' }}>No active connection. Join a room to begin.</p>
          </div>
        )}
      </div>

      <nav className="flex-1 py-6 px-4">
        <ul className="space-y-1.5">
          {navItems.map((item) => {
            const isActive = pathname.startsWith(item.href) && item.href !== '/';
            return (
              <li key={item.name}>
                <Link 
                  href={item.href} 
                  onClick={(e) => {
                    const shouldAnimateStageExit = item.name === 'Stage Mode' && item.href.startsWith('/room/') && item.href.endsWith('/stage');

                    if (shouldAnimateStageExit) {
                      e.preventDefault();
                      handleNavClick(item.href);
                      return;
                    }
                    onNavItemClick?.();
                  }}
                  className={`flex items-center gap-3.5 px-4 py-3 rounded-xl text-sm font-semibold tracking-wide transition-all group`}
                  style={isActive 
                    ? { backgroundColor: 'rgba(255,46,154,0.08)', color: '#FF2E9A', boxShadow: 'inset 0 0 20px rgba(255,46,154,0.04)' }
                    : { color: '#A0A0A0' }
                  }
                  onMouseEnter={(e) => { if (!isActive) { e.currentTarget.style.color = '#E6E6E6'; e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.04)'; }}}
                  onMouseLeave={(e) => { if (!isActive) { e.currentTarget.style.color = '#A0A0A0'; e.currentTarget.style.backgroundColor = 'transparent'; }}}
                >
                  <item.icon size={18} style={{ color: isActive ? '#FF2E9A' : '#6B7280' }} />
                  {item.name}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Show Join Button if NOT already in a room */}
      {!currentRoomId && (
        <div className="p-6 bg-[#0F0F10]/40" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          <JoinRoomControls
            mode="modal"
            title="Connect Terminal"
            description="Join an active hackathon with a room ID. We'll route you straight into the live clock view."
            buttonLabel="Connect Terminal"
            onSuccess={onNavItemClick}
            className="w-full py-3 rounded-xl font-bold text-[10px] transition-all flex justify-center items-center gap-2 tracking-[0.1em] uppercase shadow-lg active:scale-95"
            style={{ backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)', color: '#A0A0A0' }}
          />
        </div>
      )}
    </aside>
  );
}
