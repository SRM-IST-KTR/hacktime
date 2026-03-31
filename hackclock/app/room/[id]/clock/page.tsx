"use client";

import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import useSWR from 'swr';
import Sidebar from '@/components/ui/Sidebar';
import { Megaphone, X, Menu, Clock as ClockIcon, Activity, History } from 'lucide-react';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

interface Phase {
  name: string;
  durationMinutes: number;
}

export default function ClockView({ params }: { params: Promise<{ id: string }> }) {
  const [roomId, setRoomId] = useState<string>("");
  const [timeLeft, setTimeLeft] = useState({ hours: 0, minutes: 0, seconds: 0 });
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Broadcast States
  const [showAnnouncement, setShowAnnouncement] = useState(false);
  const [lastAnnouncementTime, setLastAnnouncementTime] = useState<string | null>(null);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [showHistory, setShowHistory] = useState(false);
  const [history, setHistory] = useState<string[]>([]);
  const announcementDurationRef = useRef(10);

  useEffect(() => {
    params.then(p => setRoomId(p.id));
  }, [params]);

  const { data: eventData } = useSWR(
    roomId ? `${process.env.NEXT_PUBLIC_API_URL}/api/hackathons/${roomId}` : null, 
    fetcher, 
    { 
      refreshInterval: 3000,
      keepPreviousData: true 
    }
  );

  // Load history and last seen TS from local storage
  useEffect(() => {
    if (roomId) {
      const localHistory = localStorage.getItem(`clock_history_${roomId}`);
      const lastTS = localStorage.getItem(`last_broadcast_${roomId}`);
      const timeout = setTimeout(() => {
        if (localHistory) {
          setHistory(JSON.parse(localHistory));
        }
        if (lastTS) {
          setLastAnnouncementTime(lastTS);
        }
      }, 0);
      return () => clearTimeout(timeout);
    }
  }, [roomId]);

  // Broadcast logic
  useEffect(() => {
    if (!eventData || !roomId) return;

    const currentTS = eventData.announcementTimestamp;
    
    if (isInitialLoad) {
      if (!lastAnnouncementTime && currentTS) {
        const timeout = setTimeout(() => {
          setLastAnnouncementTime(currentTS);
          localStorage.setItem(`last_broadcast_${roomId}`, currentTS);
        }, 0);
        return () => clearTimeout(timeout);
      }
      const timeout = setTimeout(() => {
        setIsInitialLoad(false);
      }, 0);
      return () => clearTimeout(timeout);
    }

    if (currentTS && currentTS !== lastAnnouncementTime) {
      const timestampTimeout = setTimeout(() => {
        setLastAnnouncementTime(currentTS);
        localStorage.setItem(`last_broadcast_${roomId}`, currentTS);
      }, 0);
      
      if (eventData.announcement) {
        const historyTimeout = setTimeout(() => {
          setHistory(prev => {
            const newHistory = [eventData.announcement, ...prev.filter(h => h !== eventData.announcement)].slice(0, 10);
            localStorage.setItem(`clock_history_${roomId}`, JSON.stringify(newHistory));
            return newHistory;
          });
        }, 0);

        announcementDurationRef.current = eventData.announcementDuration || 10;
        const announcementTimeout = setTimeout(() => {
          setShowAnnouncement(true);
        }, 0);
        return () => {
          clearTimeout(timestampTimeout);
          clearTimeout(historyTimeout);
          clearTimeout(announcementTimeout);
        };
      }

      return () => clearTimeout(timestampTimeout);
    }
  }, [eventData, isInitialLoad, lastAnnouncementTime, roomId]);

  // Auto-dismiss announcement after duration (separate effect so SWR re-fetches don't clear the timer)
  useEffect(() => {
    if (!showAnnouncement) return;
    const timer = setTimeout(() => setShowAnnouncement(false), announcementDurationRef.current * 1000);
    return () => clearTimeout(timer);
  }, [showAnnouncement]);

  // Normal Clock Logic
  useEffect(() => {
    if (!eventData) return;
    if (eventData.status === 'PAUSED' && eventData.pausedRemainingMs) {
      const distance = eventData.pausedRemainingMs;
      const timeout = setTimeout(() => {
        setTimeLeft({
          hours: Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
          minutes: Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60)),
          seconds: Math.floor((distance % (1000 * 60)) / 1000)
        });
      }, 0);
      return () => clearTimeout(timeout); 
    }
    if (!eventData.phaseEndTime || eventData.status !== 'RUNNING') {
      if (eventData.status === 'COMPLETED' || eventData.status === 'DRAFT') {
        const timeout = setTimeout(() => {
          setTimeLeft({ hours: 0, minutes: 0, seconds: 0 });
        }, 0);
        return () => clearTimeout(timeout);
      }
      return;
    }

    const targetTime = new Date(eventData.phaseEndTime).getTime();
    const updateTimer = () => {
      const distance = targetTime - new Date().getTime();
      if (distance <= 0) return setTimeLeft({ hours: 0, minutes: 0, seconds: 0 });
      setTimeLeft({
        hours: Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
        minutes: Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60)),
        seconds: Math.floor((distance % (1000 * 60)) / 1000)
      });
    };
    updateTimer(); 
    const timer = setInterval(updateTimer, 1000);
    return () => clearInterval(timer);
  }, [eventData]);

  const formatTime = (time: number) => Math.max(0, time).toString().padStart(2, '0');
  
  if (!eventData || eventData.error || !eventData.phases) {
    return (
      <div className="flex flex-col min-h-screen items-center justify-center p-6" style={{ backgroundColor: '#0F0F10' }}>
        <div className="glass rounded-[20px] p-12 md:p-16 max-w-xl w-full text-center shadow-2xl relative z-10 overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.06)' }}>
          <div className="inline-flex p-5 rounded-[20px] mb-10 shadow-2xl" style={{ backgroundColor: 'rgba(244,63,94,0.06)', border: '1px solid rgba(244,63,94,0.15)' }}>
            <ClockIcon size={40} style={{ color: '#F43F5E' }} />
          </div>
          <h1 className="text-4xl md:text-5xl font-semibold tracking-tight mb-6" style={{ color: '#E6E6E6' }}>
            Node Not Found
          </h1>
          <p className="text-lg font-medium leading-relaxed mb-12" style={{ color: '#A0A0A0' }}>
            The clock terminal you are attempting to link with does not exist or has been decommissioned.
          </p>
          <Link 
            href="/dashboard" 
            className="px-8 py-4 rounded-[20px] font-bold text-xs uppercase tracking-[0.2em] transition-all shadow-xl active:scale-95 inline-flex items-center justify-center gap-2"
            style={{ backgroundColor: '#CFFF04', color: '#0F0F10' }}
          >
            <ClockIcon size={16} /> Hub Terminal
          </Link>
        </div>
      </div>
    );
  }

  const currentPhase = eventData.phases[eventData.currentPhaseIndex] || {};
  const accent = eventData.branding?.accentColor || '#FF2E9A';

  return (
    <div className="flex flex-col lg:flex-row h-screen overflow-hidden relative" style={{ backgroundColor: '#0F0F10', color: '#E6E6E6' }}>
      {/* Mobile Toggle */}
      <button 
        onClick={() => setIsSidebarOpen(true)} 
        className="lg:hidden absolute top-6 left-6 z-30 p-3 glass rounded-[20px] active:scale-95 transition-all"
        style={{ color: '#A0A0A0' }}
      >
        <Menu size={20} />
      </button>

      {/* Sidebar Desktop/Mobile */}
      <div className={`fixed inset-0 z-40 lg:relative lg:inset-auto lg:block ${isSidebarOpen ? 'pointer-events-auto' : 'pointer-events-none'} lg:pointer-events-auto`}>
        <div
          className={`absolute inset-0 bg-black/60 backdrop-blur-md transition-opacity duration-300 ease-out lg:hidden ${isSidebarOpen ? 'opacity-100' : 'opacity-0'}`}
          onClick={() => setIsSidebarOpen(false)}
        />
        <div className={`relative h-full w-72 shrink-0 transition-transform duration-300 ease-[cubic-bezier(0.23,1,0.32,1)] lg:translate-x-0 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
          <Sidebar onNavItemClick={() => setIsSidebarOpen(false)} />
        </div>
      </div>

      <main className="flex-1 flex flex-col overflow-y-auto min-w-0 stagger-in">
        {/* Top Header / Announcement Bar */}
        <header className="h-20 flex justify-between items-center px-8 backdrop-blur-xl shrink-0 z-10" style={{ backgroundColor: 'rgba(15,15,16,0.8)', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
          <div 
            className="flex items-center gap-4 overflow-hidden group cursor-pointer"
            onClick={() => setShowHistory(true)}
          >
            <div className="p-2.5 rounded-xl group-hover:scale-110 transition-all" style={{ backgroundColor: 'rgba(255,46,154,0.06)', color: '#FF2E9A' }}>
              <Megaphone size={18} />
            </div>
            <div className="flex flex-col overflow-hidden">
              <span className="text-[9px] font-bold uppercase tracking-[0.2em]" style={{ color: '#6B7280' }}>Latest Broadcast</span>
              <span className="text-sm font-semibold truncate max-w-md" style={{ color: '#E6E6E6' }}>
                {eventData.announcement || "Station initialization complete. Awaiting further commands."}
              </span>
            </div>
          </div>
          
          <div className="hidden sm:flex items-center gap-2 px-4 py-2 rounded-[20px]" style={{ backgroundColor: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.15)' }}>
               <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ backgroundColor: '#10B981' }}></div>
               <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: '#10B981' }}>Live</span>
          </div>
        </header>

        <div className="p-6 md:p-12 max-w-7xl mx-auto w-full space-y-12">
          
          {/* THE CLOCK — HERO COMPONENT with gradient background per brand §7.1 */}
          <div 
            className="rounded-[20px] p-10 md:p-20 relative overflow-hidden flex flex-col items-center justify-center min-h-[400px] md:min-h-[500px] transition-all group"
            style={{ 
              background: 'linear-gradient(135deg, rgba(93,0,255,0.15) 0%, rgba(255,46,154,0.1) 100%)',
              border: '1px solid rgba(255,46,154,0.12)',
              boxShadow: '0 64px 128px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.04)'
            }}
          >
            {/* Soft radial glow per brand §7.1 */}
            <div className="absolute inset-0 pointer-events-none" style={{ background: `radial-gradient(circle at center, ${accent}10 0%, transparent 60%)` }} />

            {/* Status Badge */}
            <div className="absolute top-8 md:top-12 flex flex-col items-center gap-3">
              <span 
                className="px-4 py-1.5 rounded-full text-[10px] font-bold tracking-[0.2em] uppercase transition-all" 
                style={{ backgroundColor: 'rgba(15,15,16,0.6)', border: `1px solid ${accent}30`, color: accent, boxShadow: `0 0 20px ${accent}15` }}
              >
                {eventData.status}
              </span>
            </div>

            {/* TIMER — Largest visual element per brand guidelines */}
            <div
              className="my-6 md:my-10 flex items-center justify-center gap-1 sm:gap-2 text-center font-mono font-black tracking-tighter leading-none select-none z-10"
              style={{ color: '#E6E6E6', textShadow: `0 0 80px ${accent}30` }}
            >
              <span className="text-[clamp(2.8rem,16vw,10rem)]">{formatTime(timeLeft.hours)}</span>
              <span className="text-[clamp(2rem,10vw,7rem)] drop-shadow-none mx-1 md:mx-2" style={{ color: '#6B7280' }}>:</span>
              <span className="text-[clamp(2.8rem,16vw,10rem)]">{formatTime(timeLeft.minutes)}</span>
              <span className="text-[clamp(2rem,10vw,7rem)] drop-shadow-none mx-1 md:mx-2" style={{ color: '#6B7280' }}>:</span>
              <span className="text-[clamp(2.8rem,16vw,10rem)]">{formatTime(timeLeft.seconds)}</span>
            </div>

            <div className="flex flex-col items-center gap-2">
              <p className="text-[11px] md:text-sm font-bold tracking-[0.4em] uppercase group-hover:text-[#E6E6E6] transition-colors" style={{ color: '#A0A0A0' }}>
                {currentPhase.name || "Station Standby"}
              </p>
            </div>
          </div>

          {/* Experience Flow — Card Based Layout per Screenshot */}
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-6 duration-700">
            <div className="flex items-center gap-3 px-2">
              <h3 className="text-xl font-bold tracking-tight" style={{ color: '#E6E6E6' }}>Hackathon Flow</h3>
            </div>

            <div className="flex flex-wrap gap-6">
              {eventData.phases.map((phase: Phase, index: number) => {
                const isPast = index < eventData.currentPhaseIndex;
                const isCurrent = index === eventData.currentPhaseIndex;
                const isNext = index === eventData.currentPhaseIndex + 1;
                
                return (
                  <div 
                    key={index} 
                    className={`flex-1 min-w-[280px] rounded-[24px] p-8 transition-all duration-500 relative overflow-hidden ${isPast ? 'opacity-30 grayscale' : 'opacity-100'}`}
                    style={{ 
                      backgroundColor: '#1C1C1C',
                      border: isCurrent 
                        ? `1.5px solid ${accent}` 
                        : '1.5px solid rgba(255,255,255,0.06)',
                      boxShadow: isCurrent ? `0 0 30px ${accent}15` : 'none'
                    }}
                  >
                    {isCurrent && (
                      <div className="absolute top-0 right-0 w-32 h-32 opacity-10 pointer-events-none" style={{ background: `radial-gradient(circle at top right, ${accent}, transparent 70%)` }} />
                    )}

                    <h4 className={`text-xl font-bold mb-2 tracking-tight ${isCurrent ? 'text-white' : 'text-[#A0A0A0]'}`}>
                      {phase.name}
                    </h4>
                    <p className="text-sm font-medium mb-6" style={{ color: isCurrent ? '#6B7280' : '#4B5563' }}>
                      {phase.durationMinutes} Minutes
                    </p>

                    <div className="flex items-center">
                      {isCurrent ? (
                        <span className="px-3 py-1 rounded-lg text-[9px] font-bold uppercase tracking-widest" style={{ backgroundColor: 'rgba(16,185,129,0.1)', color: '#10B981', border: '1px solid rgba(16,185,129,0.2)' }}>
                          In Progress
                        </span>
                      ) : isPast ? (
                        <span className="px-3 py-1 rounded-lg text-[9px] font-bold uppercase tracking-widest" style={{ backgroundColor: 'rgba(255,255,255,0.03)', color: '#4B5563', border: '1px solid rgba(255,255,255,0.05)' }}>
                          Concluded
                        </span>
                      ) : (
                        <span className="px-3 py-1 rounded-lg text-[9px] font-bold uppercase tracking-widest" style={{ backgroundColor: 'rgba(255,255,255,0.05)', color: '#6B7280', border: '1px solid rgba(255,255,255,0.08)' }}>
                          Upcoming
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </main>

      {/* History Overlay */}
      {showHistory && (
        <div 
          className="absolute inset-0 z-[90] bg-black/60 backdrop-blur-sm flex items-center justify-center p-6 animate-in fade-in duration-300"
          onClick={() => setShowHistory(false)}
        >
          <div 
            className="w-full max-w-xl overflow-hidden shadow-[0_64px_128px_rgba(0,0,0,0.8)] animate-in zoom-in-95 duration-300"
            style={{ backgroundColor: 'rgba(28,28,28,0.95)', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.08)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-8 flex justify-between items-center" style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', backgroundColor: 'rgba(255,255,255,0.01)' }}>
              <div className="flex items-center gap-3">
                <History size={20} style={{ color: '#FF2E9A' }} />
                <h3 className="text-lg font-bold uppercase tracking-[0.2em]" style={{ color: '#E6E6E6' }}>Broadcast History</h3>
              </div>
              <button onClick={() => setShowHistory(false)} className="p-2 rounded-full transition-all hover:text-white" style={{ color: '#6B7280' }}>
                <X size={24} />
              </button>
            </div>
            <div className="max-h-[60vh] overflow-y-auto p-6 space-y-4 custom-scrollbar">
              {history.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 opacity-30 text-center">
                   <Megaphone size={48} className="mb-4" />
                   <p className="text-sm font-bold uppercase tracking-widest">No transmissions captured.</p>
                </div>
              ) : (
                history.map((item, i) => (
                  <div key={i} className="p-5 rounded-[20px] group transition-all" style={{ backgroundColor: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)' }}>
                    <p className="font-medium leading-relaxed" style={{ color: '#E6E6E6' }}>{item}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Announcement Overlay */}
      {showAnnouncement && (
        <div 
          className="absolute inset-0 z-[100] flex items-center justify-center backdrop-blur-2xl cursor-pointer p-12 overflow-hidden" 
          style={{ backgroundColor: 'rgba(15,15,16,0.95)' }}
          onClick={() => setShowAnnouncement(false)}
        >
          <div 
            className="absolute inset-0 opacity-20 pointer-events-none"
            style={{ background: `radial-gradient(circle at center, ${accent} 0%, transparent 70%)` }}
          />
          
          <div className="relative max-w-6xl w-full text-center animate-in fade-in zoom-in slide-in-from-bottom-12 duration-700 ease-out">
            <button 
              onClick={(e) => { e.stopPropagation(); setShowAnnouncement(false); }} 
              className="absolute -top-20 right-0 md:top-0 md:right-0 p-4 glass rounded-[20px] hover:text-white active:scale-90 transition-all"
              style={{ color: '#A0A0A0' }}
            >
              <X size={32} />
            </button>
            
            <div className="mb-12 inline-block p-6 rounded-[20px] shadow-2xl animate-bounce" style={{ backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
              <Megaphone size={64} className="md:size-[80px]" style={{ color: accent }} />
            </div>
            
            <h1 className="text-5xl md:text-7xl lg:text-[9rem] font-black tracking-tighter leading-[0.9] drop-shadow-[0_0_50px_rgba(255,255,255,0.15)] break-words mb-12" style={{ color: '#E6E6E6' }}>
              {eventData.announcement}
            </h1>
            
            <div className="flex flex-col items-center gap-4">
              <div className="w-24 h-1 rounded-full overflow-hidden" style={{ backgroundColor: 'rgba(255,255,255,0.08)' }}>
                <div className="h-full animate-progress origin-left" style={{ backgroundColor: '#E6E6E6' }}></div>
              </div>
              <p className="tracking-[0.4em] uppercase text-[10px] font-bold animate-pulse" style={{ color: '#6B7280' }}>
                System Broadcast in Progress
              </p>
            </div>
          </div>
        </div>
      )}

      <style jsx global>{`
        @keyframes progress {
          from { transform: scaleX(1); }
          to { transform: scaleX(0); }
        }
        .animate-progress {
          animation: progress ${eventData?.announcementDuration || 10}s linear forwards;
        }
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.05);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.1);
        }
      `}</style>
    </div>
  );
}
