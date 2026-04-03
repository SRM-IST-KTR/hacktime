"use client";

import { useState, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import useSWR from 'swr';
import { io, Socket } from 'socket.io-client';
import { Network, Play, Pause, FastForward, Megaphone, Terminal, CheckCircle2, Copy, Square, Trash2, ChevronDown, History, AlertTriangle, RefreshCw, Clock, Monitor, Edit, XCircle } from 'lucide-react';
import Modal from '@/components/ui/Modal';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

interface HackathonFlow {
  roomId: string;
  name: string;
  status: 'DRAFT' | 'RUNNING' | 'PAUSED' | 'COMPLETED';
  currentPhaseIndex?: number;
  phases?: Array<{ name: string; durationMinutes: number }>;
  branding?: { accentColor?: string; logoUrl?: string };
  participants?: Array<{ teamName: string }>;
  updatedAt: string;
  error?: string;
}

interface Participant {
  teamName: string;
}

export default function DashboardPage() {
  const { data: session, update } = useSession();
  const lastClearedRoomRef = useRef<string | null>(null);
  const activeRoomId = (session?.user as { activeRoomId?: string })?.activeRoomId;
  const userEmail = session?.user?.email;

  const [announcementInput, setAnnouncementInput] = useState("");
  const [announcementDuration, setAnnouncementDuration] = useState(10);
  const [showHistory, setShowHistory] = useState(false);
  const [broadcastHistory, setBroadcastHistory] = useState<string[]>([]);
  const [isArchiveOpen, setIsArchiveOpen] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [liveParticipants, setLiveParticipants] = useState<Participant[] | null>(null);
  const [controlActionInFlight, setControlActionInFlight] = useState<string | null>(null);
  const socketRef = useRef<Socket | null>(null);

  // Modal State
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    type: 'DELETE' | 'STOP' | 'NEXT_PHASE' | 'RECALCULATE';
    roomId: string;
    flowName: string;
  }>({
    isOpen: false,
    type: 'DELETE',
    roomId: '',
    flowName: ''
  });

  // Fetch all flows for the organizer
  const { data: allFlows, mutate: mutateAll } = useSWR<HackathonFlow[]>(
    userEmail ? `${process.env.NEXT_PUBLIC_API_URL}/api/hackathons?organizerSecret=${userEmail}` : null,
    fetcher,
    { refreshInterval: 3000 }
  );

  // Fetch specific active room data
  const { data: activeEvent, mutate: mutateActive } = useSWR<HackathonFlow & { error?: string }>(
    activeRoomId ? `${process.env.NEXT_PUBLIC_API_URL}/api/hackathons/${activeRoomId}` : null,
    fetcher,
    { refreshInterval: 2000 }
  );

  const isValidActiveEvent = (event: HackathonFlow | undefined): event is HackathonFlow => {
    return Boolean(event && Array.isArray(event.phases));
  };

  const activeControlEvent =
    activeRoomId && isValidActiveEvent(activeEvent) && activeEvent.roomId === activeRoomId
      ? activeEvent
      : null;

  useEffect(() => {
    if (!activeRoomId || !activeEvent) return;

    if (!isValidActiveEvent(activeEvent) || activeEvent.roomId !== activeRoomId) {
      if (lastClearedRoomRef.current !== activeRoomId) {
        lastClearedRoomRef.current = activeRoomId;
        update({ activeRoomId: null });
      }
      return;
    }

    lastClearedRoomRef.current = null;
  }, [activeRoomId, activeEvent, update]);

  useEffect(() => {
    const history = localStorage.getItem('broadcast_history');
    if (history) {
      const timeout = setTimeout(() => {
        setBroadcastHistory(JSON.parse(history));
      }, 0);
      return () => clearTimeout(timeout);
    }
  }, []);

  useEffect(() => {
    if (!activeRoomId) {
      setLiveParticipants(null);
      socketRef.current?.disconnect();
      socketRef.current = null;
      return;
    }

    const socket = io(process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000');
    socketRef.current = socket;

    socket.on('connect', () => {
      socket.emit('watch-room', activeRoomId);
    });

    socket.on('room-users-updated', (payload: { roomId: string; users: Array<{ teamName: string }> }) => {
      if (payload.roomId !== activeRoomId) return;
      setLiveParticipants(payload.users.map((user) => ({ teamName: user.teamName })));
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [activeRoomId]);

  useEffect(() => {
    if (!activeRoomId) return;
    if (liveParticipants !== null) return;
    setLiveParticipants(activeControlEvent?.participants || []);
  }, [activeControlEvent?.participants, activeRoomId, liveParticipants]);

  const openConfirmModal = (type: 'DELETE' | 'STOP' | 'NEXT_PHASE' | 'RECALCULATE', roomId: string, flowName: string) => {
    setConfirmModal({ isOpen: true, type, roomId, flowName });
  };

  const handleConfirmedAction = async () => {
    const { type, roomId } = confirmModal;
    setConfirmModal(prev => ({ ...prev, isOpen: false }));

    if (type === 'DELETE') {
      await deleteFlowExecution(roomId);
    } else if (type === 'STOP') {
      await engineControlExecution(roomId, 'STOP');
    } else if (type === 'NEXT_PHASE') {
      await engineControlExecution(roomId, 'NEXT_PHASE');
    } else if (type === 'RECALCULATE') {
      await engineControlExecution(roomId, 'RECALCULATE');
    }
  };

  const engineControlExecution = async (roomId: string, action: 'PAUSE' | 'RESUME' | 'NEXT_PHASE' | 'STOP' | 'RECALCULATE') => {
    if (!userEmail) return;
    const lockKey = `${roomId}:${action}`;
    if (controlActionInFlight) return;

    setControlActionInFlight(lockKey);
    try {
      await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/hackathons/${roomId}/state`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, organizerSecret: userEmail })
      });
      mutateAll();
      if (roomId === activeRoomId) mutateActive();
      if (action === 'STOP' && roomId === activeRoomId) {
        await update({ activeRoomId: null });
      }
    } catch { alert("System Error: Could not connect to Master Node."); }
    finally { setControlActionInFlight(null); }
  };

  const deleteFlowExecution = async (roomId: string) => {
    try {
      await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/hackathons/${roomId}`, {
        method: 'DELETE', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ organizerSecret: userEmail })
      });
      mutateAll();
      if (roomId === activeRoomId) {
        await update({ activeRoomId: null });
        mutateActive();
      }
    } catch { alert("System Error: Deletion failed."); }
  };

  const handleBroadcast = async () => {
    if (!activeRoomId || !userEmail || !announcementInput.trim()) return;
    try {
      await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/hackathons/${activeRoomId}/state`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'ANNOUNCE',
          organizerSecret: userEmail,
          announcementText: announcementInput,
          announcementDuration: announcementDuration
        })
      });

      const newHistory = [announcementInput, ...broadcastHistory.slice(0, 9)];
      setBroadcastHistory(newHistory);
      localStorage.setItem('broadcast_history', JSON.stringify(newHistory));

      setAnnouncementInput("");
      mutateActive();
    } catch { alert("System Error: Could not connect to Master Node."); }
  };

  const handleDisconnectTerminal = async () => {
    if (!userEmail || !activeRoomId) return;

    try {
      await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/auth/active-room`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: userEmail, roomId: null })
      });
      await update({ activeRoomId: null });
      mutateActive();
    } catch {
      alert("System Error: Could not disconnect terminal.");
    }
  };

  const activeFlows = allFlows?.filter((f) => f.status === 'RUNNING' || f.status === 'PAUSED') || [];
  const drafts = allFlows?.filter((f) => f.status === 'DRAFT') || [];
  const completed = allFlows?.filter((f) => f.status === 'COMPLETED') || [];
  const isBroadcastDisabled = !announcementInput.trim();
  const displayedParticipants = liveParticipants ?? activeControlEvent?.participants ?? [];

  return (
    <div className="max-w-6xl mx-auto pb-20 space-y-12 stagger-in">

      {/* 1. Header & Quick Stats */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h1 className="text-4xl font-semibold tracking-tight mb-2" style={{ color: '#E6E6E6' }}>Overview</h1>
          <p className="text-sm font-medium" style={{ color: '#A0A0A0' }}>
            Welcome back, <span style={{ color: '#FF2E9A' }}>{userEmail?.split('@')[0]}</span>. System is operational.
          </p>
        </div>
        <div className="flex items-center gap-4">
          <Link
            href="/flow"
            className="px-6 py-2.5 rounded-full font-semibold transition-all flex items-center gap-2 text-sm"
            style={{ backgroundColor: '#CFFF04', color: '#0F0F10', boxShadow: '0 0 20px rgba(207,255,4,0.2)' }}
          >
            <Network size={18} /> New Flow
          </Link>
        </div>
      </header>

      {/* 2. Active Engines */}
      <section>
        <div className="flex items-center justify-between mb-8 px-1">
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: '#FF2E9A', boxShadow: '0 0 12px rgba(255,46,154,0.5)' }}></div>
            <h2 className="text-lg font-semibold" style={{ color: '#E6E6E6' }}>
              Active Hackathon{activeControlEvent ? `: ${activeControlEvent.name}` : ''}
            </h2>
          </div>
        </div>

        {activeFlows.length === 0 ? (
          <div className="border-dashed rounded-[20px] p-16 text-center group transition-all" style={{ backgroundColor: '#1C1C1C', border: '1px dashed rgba(255,255,255,0.08)' }}>
            <p className="font-medium" style={{ color: '#A0A0A0' }}>No active hackathon sessions detected.</p>
            <Link href="/flow" className="text-sm mt-2 inline-block hover:underline" style={{ color: '#FF2E9A' }}>Deploy a blueprint to begin</Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 stagger-in">
            {activeFlows.map((flow) => (
              <div
                key={flow.roomId}
                className="rounded-[20px] p-8 relative overflow-hidden group transition-all ht-card-hover"
                style={{ backgroundColor: '#1C1C1C', border: '1px solid rgba(255,255,255,0.06)' }}
              >
                {/* Visual Accent */}
                <div
                  className="absolute top-0 left-0 w-1.5 h-full opacity-60"
                  style={{ backgroundColor: flow.branding?.accentColor || '#FF2E9A' }}
                ></div>

                <div className="flex justify-between items-start mb-6">
                  <div>
                    <h3 className="text-2xl font-bold mb-2 group-hover:text-[#FF2E9A] transition-colors" style={{ color: '#E6E6E6' }}>{flow.name}</h3>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(flow.roomId);
                          setCopiedId(flow.roomId);
                          setTimeout(() => setCopiedId(null), 2000);
                        }}
                        className="text-[10px] font-mono tracking-wider uppercase px-2 py-0.5 rounded transition-all flex items-center gap-1.5"
                        style={{ color: copiedId === flow.roomId ? '#10B981' : '#A0A0A0', backgroundColor: 'rgba(255,255,255,0.04)' }}
                      >
                        ID: {flow.roomId}
                        {copiedId === flow.roomId ? <CheckCircle2 size={10} /> : <Copy size={10} className="opacity-0 group-hover:opacity-100" />}
                      </button>
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase`} style={{
                        backgroundColor: flow.status === 'RUNNING' ? 'rgba(16,185,129,0.1)' : 'rgba(245,158,11,0.1)',
                        color: flow.status === 'RUNNING' ? '#10B981' : '#F59E0B'
                      }}>
                        {flow.status}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => openConfirmModal('DELETE', flow.roomId, flow.name)}
                    className="cursor-pointer p-2.5 hover:text-[#F43F5E] rounded-xl transition-all opacity-0 group-hover:opacity-100"
                    style={{ color: '#A0A0A0' }}
                  >
                    <Trash2 size={18} />
                  </button>
                </div>

                <div className="flex gap-4 mt-8">
                  {flow.status === 'RUNNING' ? (
                    <button
                      disabled={Boolean(controlActionInFlight)}
                      onClick={() => engineControlExecution(flow.roomId, 'PAUSE')}
                      className="cursor-pointer flex-1 py-3 rounded-[20px] font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all"
                      style={{ backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)', color: '#E6E6E6' }}
                    >
                      <Pause size={14} /> Pause
                    </button>
                  ) : (
                    <button
                      disabled={Boolean(controlActionInFlight)}
                      onClick={() => engineControlExecution(flow.roomId, 'RESUME')}
                      className="cursor-pointer flex-1 py-3 rounded-[20px] font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all"
                      style={{ backgroundColor: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.15)', color: '#10B981' }}
                    >
                      <Play size={14} /> Resume
                    </button>
                  )}
                  <button
                    disabled={Boolean(controlActionInFlight)}
                    onClick={() => openConfirmModal('NEXT_PHASE', flow.roomId, flow.name)}
                    className="cursor-pointer flex-1 py-3 rounded-[20px] font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all"
                    style={{ backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)', color: '#E6E6E6' }}
                  >
                    <FastForward size={14} /> Next
                  </button>
                  <button
                    disabled={Boolean(controlActionInFlight)}
                    onClick={() => openConfirmModal('STOP', flow.roomId, flow.name)}
                    className="cursor-pointer p-3 rounded-[20px] transition-all hover:text-[#F43F5E]"
                    style={{ backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)', color: '#A0A0A0' }}
                  >
                    <Square size={16} />
                  </button>
                </div>

                <div className="mt-4">
                  <Link
                    href={`/flow?edit=${flow.roomId}`}
                    className="inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] hover:text-white transition-colors"
                    style={{ color: '#A0A0A0' }}
                  >
                    <Edit size={12} /> Edit Flow
                  </Link>
                </div>

                <Link href={flow.roomId === activeRoomId ? "#active-control" : `/room/${flow.roomId}/clock`} onClick={async () => { if (flow.roomId !== activeRoomId) await update({ activeRoomId: flow.roomId }); }} className="block mt-6 text-center text-[11px] font-bold uppercase tracking-[0.2em] transition-colors" style={{ color: flow.roomId === activeRoomId ? '#CFFF04' : '#FF2E9A' }}>
                  {flow.roomId === activeRoomId ? "● Currently Linked" : "Connect to Terminal"}
                </Link>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* 4. Global Control */}
      {activeControlEvent && activeControlEvent.status !== 'COMPLETED' && (
        <section id="active-control" className="rounded-[20px] p-10 relative overflow-hidden" style={{ backgroundColor: 'rgba(28,28,28,0.6)', border: '1px solid rgba(255,46,154,0.08)', boxShadow: '0 32px 64px rgba(0,0,0,0.4)' }}>
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-10">
              <div className="p-2.5 rounded-xl" style={{ backgroundColor: 'rgba(255,46,154,0.08)', color: '#FF2E9A' }}>
                <Terminal size={20} />
              </div>
              <div>
                <h2 className="text-xl font-bold" style={{ color: '#E6E6E6' }}>{activeControlEvent.name}</h2>
                <p className="text-xs font-medium" style={{ color: '#6B7280' }}>Live Control Interface</p>
              </div>
              <Link
                href={`/flow?edit=${activeControlEvent.roomId}`}
                className="ml-auto inline-flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-[0.2em] transition-all"
                style={{ backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)', color: '#A0A0A0' }}
              >
                <Edit size={14} /> Edit Flow
              </Link>
              <button
                onClick={handleDisconnectTerminal}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-[0.2em] transition-all"
                style={{ backgroundColor: 'rgba(244,63,94,0.06)', border: '1px solid rgba(244,63,94,0.15)', color: '#F43F5E' }}
              >
                <XCircle size={14} /> Disconnect Terminal
              </button>
              <button
                disabled={Boolean(controlActionInFlight)}
                onClick={() => openConfirmModal('RECALCULATE', activeControlEvent.roomId, activeControlEvent.name)}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-[0.2em] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ backgroundColor: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)', color: '#F59E0B' }}
              >
                <RefreshCw size={14} /> Reset Phase
              </button>
            </div>

            <div className="flex flex-col lg:flex-row gap-12">
              <div className="flex-1 space-y-10">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  {[
                    { label: 'Status', value: activeControlEvent.status, sub: 'Current State' },
                    { label: 'Phase', value: activeControlEvent.phases?.[activeControlEvent.currentPhaseIndex ?? 0]?.name || "N/A", sub: 'Phase Execution' },
                    { label: 'Teams', value: displayedParticipants.length || 0, sub: 'Total Connected' },
                    { label: 'Node ID', value: activeRoomId, sub: 'Active Room' },
                  ].map((item, i) => (
                    <div key={i} className="p-5 rounded-[20px]" style={{ backgroundColor: 'rgba(15,15,16,0.6)', border: '1px solid rgba(255,255,255,0.04)' }}>
                      <p className="text-[9px] uppercase font-bold mb-1 tracking-wider" style={{ color: '#6B7280' }}>{item.label}</p>
                      <p className="text-sm font-semibold truncate" style={{ color: '#E6E6E6' }}>{item.value}</p>
                      <p className="text-[8px] font-medium mt-1" style={{ color: '#6B7280' }}>{item.sub}</p>
                    </div>
                  ))}
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] font-bold uppercase tracking-widest flex items-center gap-2" style={{ color: '#A0A0A0' }}>
                      <Megaphone size={14} style={{ color: '#FF2E9A' }} /> Terminal Broadcast
                    </p>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-4">
                    <input
                      type="text"
                      value={announcementInput}
                      onChange={(e) => setAnnouncementInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && !isBroadcastDisabled && handleBroadcast()}
                      placeholder="Broadcast message to all terminals..."
                      className="flex-1 rounded-[20px] py-4 px-6 text-sm outline-none transition-all"
                      style={{ backgroundColor: 'rgba(15,15,16,0.6)', border: '1px solid rgba(255,255,255,0.04)', color: '#E6E6E6' }}
                      onFocus={(e) => e.target.style.borderColor = 'rgba(255,46,154,0.3)'}
                      onBlur={(e) => e.target.style.borderColor = 'rgba(255,255,255,0.04)'}
                    />
                    <div className="flex gap-4">
                      <div className="relative">
                        <input
                          type="number"
                          value={announcementDuration}
                          onChange={(e) => setAnnouncementDuration(parseInt(e.target.value) || 5)}
                          className="w-24 rounded-[20px] py-4 pr-10 pl-4 text-center text-sm outline-none font-mono"
                          style={{ backgroundColor: 'rgba(15,15,16,0.6)', border: '1px solid rgba(255,255,255,0.04)', color: '#E6E6E6' }}
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[9px] font-bold pointer-events-none uppercase" style={{ color: '#6B7280' }}>Sec</span>
                      </div>
                      <button
                        onClick={handleBroadcast}
                        disabled={isBroadcastDisabled}
                        className={`px-8 py-4 rounded-[20px] font-bold text-[11px] uppercase tracking-widest transition-all shadow-xl active:scale-95 ${isBroadcastDisabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                        style={{ backgroundColor: '#CFFF04', color: '#0F0F10' }}
                      >
                        Broadcast
                      </button>
                    </div>
                  </div>

                  {broadcastHistory.length > 0 && (
                    <div className="pt-2">
                      <button
                        onClick={() => setShowHistory(!showHistory)}
                        className="text-[10px] font-bold uppercase tracking-widest flex items-center gap-2 transition-colors"
                        style={{ color: '#6B7280' }}
                        onMouseEnter={(e) => e.currentTarget.style.color = '#FF2E9A'}
                        onMouseLeave={(e) => e.currentTarget.style.color = '#6B7280'}
                      >
                        <History size={12} /> {showHistory ? 'Hide' : 'Show'} History
                      </button>
                      {showHistory && (
                        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-40 overflow-y-auto pr-2 custom-scrollbar">
                          {broadcastHistory.map((h, i) => (
                            <div key={i} className="text-[10px] p-3 rounded-xl flex justify-between items-center group" style={{ color: '#A0A0A0', backgroundColor: 'rgba(15,15,16,0.6)', border: '1px solid rgba(255,255,255,0.04)' }}>
                              <span className="truncate pr-4">{h}</span>
                              <button onClick={() => setAnnouncementInput(h)} className="opacity-0 group-hover:opacity-100 uppercase font-bold text-[9px] shrink-0" style={{ color: '#FF2E9A' }}>Reuse</button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              <div className="w-full lg:w-72 space-y-6">
                <div className="flex justify-between items-center px-1">
                  <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: '#6B7280' }}>Active Terminals</p>
                  <RefreshCw size={12} className="cursor-pointer transition-colors" style={{ color: '#6B7280' }} onClick={() => mutateActive()} />
                </div>
                <div className="rounded-[20px] p-6 h-[280px] overflow-y-auto space-y-3 custom-scrollbar" style={{ backgroundColor: 'rgba(15,15,16,0.6)', border: '1px solid rgba(255,255,255,0.04)' }}>
                  {displayedParticipants.map((p: Participant, i: number) => (
                    <div key={i} className="flex items-center gap-3 py-2 last:border-0 group" style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                      <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: '#10B981', boxShadow: '0 0 8px rgba(16,185,129,0.4)' }}></div>
                      <span className="text-sm font-medium truncate group-hover:text-white transition-colors" style={{ color: '#A0A0A0' }}>{p.teamName}</span>
                    </div>
                  ))}
                  {displayedParticipants.length === 0 && (
                    <div className="h-full flex flex-col items-center justify-center text-center opacity-40">
                      <Monitor size={32} className="mb-2" style={{ color: '#6B7280' }} />
                      <p className="text-[11px] font-medium" style={{ color: '#6B7280' }}>Listening for nodes...</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* 5. Blueprints */}
      <section className="pt-10">
        <div className="flex items-center gap-3 mb-8 px-1">
          <h2 className="text-lg font-semibold" style={{ color: '#E6E6E6' }}>Hackathon Blueprints</h2>
        </div>

        {drafts.length === 0 ? (
          <div className="rounded-[20px] p-12 text-center" style={{ backgroundColor: '#1C1C1C', border: '1px solid rgba(255,255,255,0.06)' }}>
            <p className="font-medium text-sm" style={{ color: '#6B7280' }}>No saved blueprints. Create a flow to get started.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {drafts.map((flow) => (
              <div key={flow.roomId} className="rounded-[20px] p-6 flex flex-col justify-between ht-card-hover group relative overflow-hidden" style={{ backgroundColor: '#1C1C1C', border: '1px solid rgba(255,255,255,0.06)' }}>
                <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none group-hover:opacity-10 transition-opacity">
                  <Terminal size={64} />
                </div>

                <div>
                  <div className="flex justify-between items-start mb-4">
                    <h3 className="text-lg font-bold group-hover:text-[#FF2E9A] transition-colors truncate pr-6" style={{ color: '#E6E6E6' }}>{flow.name}</h3>
                    <button
                      onClick={() => openConfirmModal('DELETE', flow.roomId, flow.name)}
                      className="cursor-pointer p-1.5 transition-all opacity-0 group-hover:opacity-100 hover:text-[#F43F5E]"
                      style={{ color: '#6B7280' }}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                  <div className="flex items-center gap-3 mb-6">
                    <div className="flex items-center gap-1 text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                      <Clock size={12} /> {flow.phases?.reduce((acc: number, p) => acc + p.durationMinutes, 0) ?? 0}m
                    </div>
                    <div className="w-1 h-1 rounded-full bg-slate-700"></div>
                    <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                      {flow.phases?.length ?? 0} Phases
                    </div>
                  </div>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => engineControlExecution(flow.roomId, 'RESUME')}
                    className="flex-1 py-2.5 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all active:scale-95"
                    style={{ backgroundColor: '#CFFF04', color: '#0F0F10' }}
                  >
                    Launch
                  </button>
                  <Link
                    href={`/flow?edit=${flow.roomId}`}
                    className="flex-1 py-2.5 rounded-xl text-[10px] font-bold uppercase tracking-widest text-center transition-all"
                    style={{ backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)', color: '#A0A0A0' }}
                  >
                    Edit
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* 6. Archive */}
      <section className="pt-10">
        <button
          onClick={() => setIsArchiveOpen(!isArchiveOpen)}
          className="flex items-center gap-3 transition-all group"
          style={{ color: '#6B7280' }}
        >
          <div className="p-2 rounded-lg transition-all" style={{ backgroundColor: 'rgba(255,255,255,0.04)' }}>
            <History size={16} />
          </div>
          <h2 className="text-sm font-bold tracking-widest uppercase">Archived Hackathon ({completed.length})</h2>
          <div className={`transition-transform duration-300 ${isArchiveOpen ? 'rotate-180' : ''}`}>
            <ChevronDown size={18} />
          </div>
        </button>

        {isArchiveOpen && (
          <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-4 animate-in fade-in slide-in-from-top-4 duration-500">
            {completed.length === 0 && <p className="text-xs italic p-6" style={{ color: '#6B7280' }}>Archive is currently empty.</p>}
            {completed.map((flow) => (
              <div key={flow.roomId} className="rounded-[20px] p-5 flex justify-between items-center group transition-all" style={{ backgroundColor: '#1C1C1C', border: '1px solid rgba(255,255,255,0.06)' }}>
                <div className="flex items-center gap-4">
                  <div className="p-2.5 rounded-xl" style={{ backgroundColor: 'rgba(16,185,129,0.08)', color: '#10B981' }}>
                    <CheckCircle2 size={18} />
                  </div>
                  <div>
                    <p className="text-sm font-bold group-hover:text-[#10B981] transition-colors" style={{ color: '#E6E6E6' }}>{flow.name}</p>
                    <p className="text-[10px] font-mono mt-1 uppercase tracking-tight" style={{ color: '#6B7280' }}>{flow.roomId} • Concluded {new Date(flow.updatedAt).toLocaleDateString()}</p>
                  </div>
                </div>
                <button
                  onClick={() => openConfirmModal('DELETE', flow.roomId, flow.name)}
                  className="cursor-pointer p-2 transition-all opacity-0 group-hover:opacity-100 hover:text-[#F43F5E]"
                  style={{ color: '#6B7280' }}
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Confirmation Modal */}
      <Modal
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
        title="System Confirmation"
        footer={(
          <div className="flex gap-4 w-full">
            <button
              onClick={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
              className="flex-1 py-3 text-[11px] font-bold uppercase tracking-widest rounded-[20px] transition-all"
              style={{ color: '#6B7280' }}
            >
              Cancel
            </button>
            <button
              onClick={handleConfirmedAction}
              className="flex-2 py-3 px-8 rounded-[20px] font-bold text-[11px] uppercase tracking-widest transition-all shadow-xl active:scale-95"
              style={{
                backgroundColor: confirmModal.type === 'DELETE' ? '#F43F5E' : '#CFFF04',
                color: confirmModal.type === 'DELETE' ? '#E6E6E6' : '#0F0F10'
              }}
            >
              Confirm {confirmModal.type === 'DELETE' ? 'Purge' : 'Execution'}
            </button>
          </div>
        )}
      >
        <div className="flex flex-col items-center text-center py-4">
          <div className="p-5 rounded-[20px] mb-6 shadow-2xl" style={{
            backgroundColor: confirmModal.type === 'DELETE' ? 'rgba(244,63,94,0.08)' : 'rgba(255,46,154,0.08)',
            color: confirmModal.type === 'DELETE' ? '#F43F5E' : '#FF2E9A'
          }}>
            <AlertTriangle size={32} />
          </div>
          <h4 className="text-xl font-bold mb-3" style={{ color: '#E6E6E6' }}>
            {confirmModal.type === 'DELETE' ? 'Irreversible Purge' : 'Master Override'}
          </h4>
          <p className="text-sm leading-relaxed max-w-[280px]" style={{ color: '#A0A0A0' }}>
            {confirmModal.type === 'DELETE'
              ? `Proceeding will permanently erase "${confirmModal.flowName}" from the central database. This action cannot be undone.`
              : confirmModal.type === 'STOP'
                ? `The session for "${confirmModal.flowName}" will be terminated and archived. All terminal links will be severed.`
                : confirmModal.type === 'RECALCULATE'
                  ? `This will reset the current phase for "${confirmModal.flowName}" and rebuild its timer baseline from the phase duration.`
                  : `You are forcing a phase transition for "${confirmModal.flowName}". Active terminal clocks will be synchronized immediately.`}
          </p>
        </div>
      </Modal>

      <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.08);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.15);
        }
      `}</style>
    </div>
  );
}
