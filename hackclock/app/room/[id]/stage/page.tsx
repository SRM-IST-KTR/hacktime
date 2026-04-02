"use client";

import { useState, useEffect, useRef } from 'react';
import useSWR from 'swr';
import Link from 'next/link';
import { Terminal, Megaphone, Clock, X, History, Home } from 'lucide-react';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function StageMode({ params }: { params: Promise<{ id: string }> }) {
  const [roomId, setRoomId] = useState<string>("");
  const [timeLeft, setTimeLeft] = useState({ hours: 0, minutes: 0, seconds: 0 });
  const [realTime, setRealTime] = useState("");

  const [showAnnouncement, setShowAnnouncement] = useState(false);
  const [lastAnnouncementTime, setLastAnnouncementTime] = useState<string | null>(null);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  
  const [showHistory, setShowHistory] = useState(false);
  const [history, setHistory] = useState<string[]>([]);
  const announcementDurationRef = useRef(10);

  useEffect(() => {
    params.then(p => setRoomId(p.id));
  }, [params]);

  useEffect(() => {
    if (roomId) {
      const localHistory = localStorage.getItem(`stage_history_${roomId}`);
      if (localHistory) {
        const timeout = setTimeout(() => {
          setHistory(JSON.parse(localHistory));
        }, 0);
        return () => clearTimeout(timeout);
      }
    }
  }, [roomId]);

  const { data: eventData } = useSWR(
    roomId ? `${process.env.NEXT_PUBLIC_API_URL}/api/hackathons/${roomId}` : null,
    fetcher,
    { refreshInterval: 5000 }
  );

  useEffect(() => {
    const tick = () => setRealTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (!eventData || !roomId) return;

    const currentTS = eventData.announcementTimestamp;

    // On initial load, record the current timestamp without triggering overlay
    if (isInitialLoad) {
      if (!lastAnnouncementTime && currentTS) {
        const timeout = setTimeout(() => {
          setLastAnnouncementTime(currentTS);
        }, 0);
        return () => clearTimeout(timeout);
      }
      const timeout = setTimeout(() => {
        setIsInitialLoad(false);
      }, 0);
      return () => clearTimeout(timeout);
    }

    // When a new announcement arrives (timestamp changed)
    if (currentTS && currentTS !== lastAnnouncementTime) {
      const timestampTimeout = setTimeout(() => {
        setLastAnnouncementTime(currentTS);
      }, 0);

      if (eventData.announcement) {
        // Add to history
        const historyTimeout = setTimeout(() => {
          setHistory(prev => {
            const newHistory = [eventData.announcement, ...prev.filter(h => h !== eventData.announcement)].slice(0, 10);
            localStorage.setItem(`stage_history_${roomId}`, JSON.stringify(newHistory));
            return newHistory;
          });
        }, 0);

        announcementDurationRef.current = eventData.announcementDuration || 10;
        const announcementTimeout = setTimeout(() => setShowAnnouncement(true), 0);

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
    if (!eventData.phaseEndTime || eventData.status !== 'RUNNING') return;

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
            <X size={40} style={{ color: '#F43F5E' }} />
          </div>
          <h1 className="text-4xl md:text-5xl font-semibold tracking-tight mb-6" style={{ color: '#E6E6E6' }}>
            Hackathon Not Found
          </h1>
          <p className="text-lg font-medium leading-relaxed mb-12" style={{ color: '#A0A0A0' }}>
            The stage endpoint you are attempting to access does not exist or has been decommissioned.
          </p>
          <Link
            href="/dashboard"
            className="px-8 py-4 rounded-[20px] font-bold text-xs uppercase tracking-[0.2em] transition-all shadow-xl active:scale-95 inline-flex items-center justify-center gap-2"
            style={{ backgroundColor: '#CFFF04', color: '#0F0F10' }}
          >
            <Terminal size={16} /> Hub Terminal
          </Link>
        </div>
      </div>
    );
  }

  const currentPhase = eventData.phases[eventData.currentPhaseIndex] || {};
  const nextPhase = eventData.phases[eventData.currentPhaseIndex + 1] || null;
  const accent = eventData.branding?.accentColor || '#FF2E9A';

  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden font-sans relative" style={{ backgroundColor: '#0F0F10', color: '#E6E6E6' }}>
      <header className="h-20 md:h-24 px-6 md:px-12 flex justify-between items-center shrink-0" style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
        <div className="flex items-center gap-4 md:gap-6">
          <Link href="/dashboard" className="cursor-pointer group">
            {eventData.branding?.logoUrl ? (
              <div className="h-10 md:h-14 rounded-xl flex items-center justify-center px-3 md:px-4 transition-colors" style={{ backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
                <img src={eventData.branding.logoUrl} alt="Logo" className="h-6 md:h-8 object-contain" />
              </div>
            ) : (
              <div className="w-10 h-10 md:w-14 md:h-14 rounded-xl flex items-center justify-center transition-colors" style={{ background: 'linear-gradient(135deg, #5D00FF, #FF2E9A)', boxShadow: `0 0 20px ${accent}30` }}>
                <Terminal size={24} className="md:size-[32px]" style={{ color: '#0F0F10' }} strokeWidth={2.5} />
              </div>
            )}
          </Link>
          <div>
            <h1 className="text-xl md:text-3xl font-black tracking-tight leading-none mb-1 truncate max-w-[150px] sm:max-w-none" style={{ color: '#E6E6E6' }}>{eventData.name}</h1>
            <p className="text-[9px] md:text-[11px] font-bold tracking-[0.2em] md:tracking-[0.3em] uppercase" style={{ color: '#FF2E9A' }}>Stage Broadcast Mode</p>
          </div>
        </div>

        <div className="flex items-center gap-4 md:gap-12">
          <div className="text-right">
            <p className="text-[8px] md:text-[10px] font-bold tracking-[0.2em] uppercase mb-1" style={{ color: '#6B7280' }}>Status</p>
            <p className={`text-xs md:text-sm font-bold flex items-center gap-2 justify-end ${eventData.status !== 'RUNNING' ? 'animate-pulse' : ''}`} style={{ color: eventData.status === 'RUNNING' ? '#E6E6E6' : '#F43F5E' }}>
              <span className={`w-1.5 h-1.5 md:w-2 md:h-2 rounded-full ${eventData.status === 'RUNNING' ? 'animate-pulse' : ''}`} style={{ backgroundColor: eventData.status === 'RUNNING' ? accent : '#F43F5E', boxShadow: `0 0 8px ${eventData.status === 'RUNNING' ? accent : 'rgba(244,63,94,0.8)'}` }}></span>
              <span className="hidden sm:inline">{eventData.status}</span>
            </p>
          </div>
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center relative p-6">
        {/* Background Glow */}
        <div className="absolute inset-0 opacity-5 pointer-events-none" style={{ background: `radial-gradient(circle at center, ${accent} 0%, transparent 50%)` }}></div>
        
        <p className="text-[10px] md:text-sm font-bold tracking-[0.3em] md:tracking-[0.5em] uppercase mb-4 md:mb-8 z-10" style={{ color: '#6B7280' }}>Time Remaining</p>
        
        {/* TIMER — Largest visual element per brand guidelines */}
        <div
          className="text-[clamp(4rem,25vw,18rem)] font-black tracking-tighter leading-none font-mono z-10 mb-8 md:mb-16 flex items-center"
          style={{ color: '#E6E6E6', textShadow: `0 0 80px ${accent}30` }}
        >
          {formatTime(timeLeft.hours)}
          <span className="drop-shadow-none mx-1 md:mx-2" style={{ color: '#6B7280' }}>:</span>
          {formatTime(timeLeft.minutes)}
          <span className="drop-shadow-none mx-1 md:mx-2" style={{ color: '#6B7280' }}>:</span>
          {formatTime(timeLeft.seconds)}
        </div>

        <div className="flex flex-col md:flex-row gap-6 md:gap-12 z-10 mb-8 md:mb-12 w-full max-w-5xl">
          <div className="flex-1 bg-transparent border-l-4 pl-6 md:pl-8" style={{ borderColor: accent }}>
            <p className="text-[9px] md:text-[11px] font-bold tracking-[0.2em] uppercase mb-2 md:mb-3" style={{ color: accent }}>Current Phase</p>
            <h2 className="text-2xl md:text-4xl font-black mb-2 md:mb-3 tracking-tight" style={{ color: '#E6E6E6' }}>{currentPhase.name}</h2>
            <p className="text-sm md:text-lg font-medium" style={{ color: '#A0A0A0' }}>{currentPhase.durationMinutes} Minute Sprint</p>
          </div>
          {nextPhase && (
            <div className="flex-1 rounded-xl p-6 md:p-8" style={{ backgroundColor: 'rgba(28,28,28,0.6)', border: '1px solid rgba(255,255,255,0.06)' }}>
              <p className="text-[9px] md:text-[11px] font-bold tracking-[0.2em] uppercase mb-2 md:mb-3" style={{ color: '#6B7280' }}>Next Up</p>
              <h2 className="text-2xl md:text-4xl font-black mb-1 tracking-tight" style={{ color: '#6B7280' }}>{nextPhase.name}</h2>
            </div>
          )}
        </div>

        {/* Room Code — Cyber Lime accent */}
        <div className="z-10 text-center rounded-[20px] px-8 md:px-16 py-4 md:py-6 shadow-[0_0_40px_rgba(0,0,0,0.5)] backdrop-blur-md" style={{ backgroundColor: 'rgba(28,28,28,0.8)', border: '1px solid rgba(255,255,255,0.06)' }}>
          <p className="text-[9px] md:text-[11px] font-bold tracking-[0.3em] md:tracking-[0.5em] uppercase mb-1 md:mb-2" style={{ color: '#CFFF04' }}>Room Access Code</p>
          <p className="text-4xl md:text-7xl font-black font-mono tracking-widest" style={{ color: '#E6E6E6' }}>{roomId}</p>
        </div>
      </main>

      <footer className="h-16 md:h-20 flex items-stretch shrink-0" style={{ borderTop: '1px solid rgba(255,255,255,0.04)', backgroundColor: '#0F0F10' }}>
        <div
          onClick={() => setShowHistory(true)}
          className="w-40 md:w-80 flex items-center px-4 md:px-8 gap-3 md:gap-4 cursor-pointer transition-all group"
          style={{ backgroundColor: '#1C1C1C', borderRight: '1px solid rgba(255,255,255,0.04)' }}
          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#232323'}
          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#1C1C1C'}
        >
          <Megaphone size={16} className="md:size-[20px] transition-transform group-hover:scale-110" style={{ color: '#FF2E9A' }} />
          <span className="text-[10px] md:text-sm font-bold tracking-[0.1em] md:tracking-[0.2em] uppercase truncate" style={{ color: '#E6E6E6' }}>{eventData.announcement || "SYSTEM NOMINAL"}</span>
        </div>

        <div className="flex-1 flex items-center justify-end pr-3 pl-4 md:pr-10 md:pl-8">
          <div className="flex items-center gap-2.5 md:gap-3.5 px-4 md:px-6 py-2.5 md:py-3 rounded-md" style={{ backgroundColor: '#1C1C1C', border: '1px solid rgba(255,255,255,0.04)' }}>
            <Clock size={15} className="md:size-[18px]" style={{ color: '#FF2E9A' }} />
            <span className="text-sm md:text-base font-mono tracking-[0.22em]" style={{ color: '#E6E6E6' }}>{realTime}</span>
          </div>
        </div>
      </footer>

      {/* Return Home Button - Subtle bottom right */}
      <Link
        href="/dashboard"
        className="fixed bottom-6 right-6 z-[60] p-4 glass rounded-full opacity-20 hover:opacity-100 transition-all hover:scale-110 group"
        title="Return to Hub"
      >
        <Home size={20} className="text-[#A0A0A0] group-hover:text-[#FF2E9A]" />
      </Link>

      {/* Expandable History Overlay */}
      {showHistory && (
        <div
          className="absolute inset-0 z-40 bg-black/60 backdrop-blur-sm flex items-end justify-start p-6 md:p-12 animate-in fade-in duration-300"
          onClick={() => setShowHistory(false)}
        >
          <div
            className="w-full max-w-lg overflow-hidden shadow-2xl animate-in slide-in-from-bottom-4 duration-300"
            style={{ backgroundColor: '#1C1C1C', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '20px' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 flex justify-between items-center" style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', backgroundColor: '#0F0F10' }}>
              <h3 className="text-sm font-bold uppercase tracking-[0.2em] flex items-center gap-3" style={{ color: '#E6E6E6' }}>
                <History size={16} style={{ color: '#FF2E9A' }} /> Broadcast History
              </h3>
              <button onClick={() => setShowHistory(false)} className="transition-colors hover:text-white" style={{ color: '#6B7280' }}>
                <X size={20} />
              </button>
            </div>
            <div className="max-h-[60vh] overflow-y-auto p-4 space-y-3 custom-scrollbar">
              {history.length === 0 ? (
                <p className="text-xs italic text-center py-12" style={{ color: '#6B7280' }}>No previous broadcasts captured.</p>
              ) : (
                history.map((item, i) => (
                  <div key={i} className="p-4 rounded-xl animate-in fade-in slide-in-from-left-2" style={{ backgroundColor: '#0F0F10', border: '1px solid rgba(255,255,255,0.04)', animationDelay: `${i * 50}ms` }}>
                    <p className="text-sm font-medium leading-relaxed" style={{ color: '#E6E6E6' }}>{item}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* MASSIVE FULL SCREEN OVERLAY */}
      {showAnnouncement && (
        <div
          className="absolute inset-0 z-50 flex items-center justify-center backdrop-blur-md cursor-pointer p-6"
          style={{ backgroundColor: 'rgba(15,15,16,0.9)' }}
          onClick={() => setShowAnnouncement(false)}
        >
          <div className="relative max-w-[90%] w-full text-center animate-in fade-in zoom-in duration-300">
            <button
              onClick={(e) => { e.stopPropagation(); setShowAnnouncement(false); }}
              className="absolute top-4 right-4 hover:text-white" style={{ color: '#6B7280' }}
            >
              <X size={24} className="md:size-[32px]" />
            </button>
            <Megaphone size={48} className="md:size-[96px] mx-auto mb-8 md:mb-12 animate-pulse" style={{ color: accent }} />
            <h1 className="text-4xl md:text-7xl lg:text-[140px] font-black tracking-tighter leading-tight md:leading-none drop-shadow-[0_0_50px_rgba(255,255,255,0.2)] break-words" style={{ color: '#E6E6E6' }}>
              {eventData.announcement}
            </h1>
            <p className="mt-8 md:mt-16 tracking-[0.3em] uppercase text-sm md:text-xl font-bold animate-pulse" style={{ color: '#6B7280' }}>
              Tap to dismiss
            </p>
          </div>
        </div>
      )}

      <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: #0F0F10;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.06);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.12);
        }
      `}</style>
    </div>
  );
}
