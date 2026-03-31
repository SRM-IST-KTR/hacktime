"use client";

import { useState, useRef, useEffect, Suspense, useMemo } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { Network, Plus, Trash2, Zap, Save, GripVertical, CheckCircle2, Copy, Image as ImageIcon, Loader2, ArrowLeft, Clock, Calendar, Globe, Palette, Settings2, Sparkles, ChevronRight, Activity, AlertTriangle, Wand2, RefreshCw } from 'lucide-react';

function FlowForm() {
  const { data: session, update } = useSession();
  const searchParams = useSearchParams();
  const router = useRouter();
  const editId = searchParams.get('edit');

  const [isDeploying, setIsDeploying] = useState(false);
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(!!editId);
  const [showExtendedPalette, setShowExtendedPalette] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [generatedRoom, setGeneratedRoom] = useState<{ id: string, secret: string } | null>(null);
  const [isCopied, setIsCopied] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

  const [formData, setFormData] = useState({
    name: '',
    eventStartTime: '',
    eventEndTime: '',
    timezone: '',
    accentColor: '#FF2E9A',
    logoUrl: '',
    themeMode: 'noir',
    glassIntensity: 20,
  });

  const [availableTimezones, setAvailableTimezones] = useState<string[]>([]);

  const [phases, setPhases] = useState([
    { id: 1, name: 'Registration & Kickoff', durationMinutes: 60, autoTransition: true },
    { id: 2, name: 'Hacking Session', durationMinutes: 1440, autoTransition: false },
    { id: 3, name: 'Submission & Pitch', durationMinutes: 120, autoTransition: false },
  ]);

  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  useEffect(() => {
    const now = new Date();
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const formatDateTime = (d: Date) => new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
    const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

    const tzs = [
      'UTC', 'Africa/Lagos', 'America/New_York', 'America/Los_Angeles', 'America/Chicago',
      'America/Sao_Paulo', 'Asia/Dubai', 'Asia/Kolkata', 'Asia/Singapore', 'Asia/Tokyo',
      'Asia/Shanghai', 'Australia/Sydney', 'Europe/London', 'Europe/Paris', 'Europe/Berlin',
      'Europe/Moscow', 'Pacific/Auckland'
    ];
    setAvailableTimezones(!tzs.includes(userTimezone) ? [userTimezone, ...tzs].sort() : tzs.sort());

    if (!editId) {
      setFormData(prev => ({
        ...prev,
        eventStartTime: formatDateTime(now),
        eventEndTime: formatDateTime(tomorrow),
        timezone: userTimezone
      }));
    } else {
      fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/hackathons/${editId}`)
        .then(res => res.json())
        .then(data => {
          if (data && !data.error) {
            setFormData({
              name: data.name,
              eventStartTime: data.eventStartTime,
              eventEndTime: data.eventEndTime,
              timezone: data.timezone,
              accentColor: data.branding?.accentColor || '#0070F3',
              logoUrl: data.branding?.logoUrl || '',
              themeMode: data.branding?.themeMode || 'noir',
              glassIntensity: data.branding?.glassIntensity || 20,
            });
            if (data.phases) setPhases(data.phases.map((p: any, i: number) => ({ ...p, id: p._id || i })));
          }
          setIsLoadingData(false);
        })
        .catch(() => setIsLoadingData(false));
    }
  }, [editId]);

  const totalPhaseMinutes = useMemo(() => phases.reduce((acc, p) => acc + (p.durationMinutes || 0), 0), [phases]);
  
  const scheduledMinutes = useMemo(() => {
    if (!formData.eventStartTime || !formData.eventEndTime) return 0;
    const start = new Date(formData.eventStartTime).getTime();
    const end = new Date(formData.eventEndTime).getTime();
    return Math.max(0, Math.floor((end - start) / 60000));
  }, [formData.eventStartTime, formData.eventEndTime]);

  const formatDuration = (mins: number) => {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return m > 0 ? `${h}h ${m}m` : `${h}h`;
  };

  const autoPopulatePhases = () => {
    if (scheduledMinutes <= 0) {
      alert("Please set event start and end times first.");
      return;
    }

    const kickoff = Math.min(120, Math.floor(scheduledMinutes * 0.05));
    const pitch = Math.min(240, Math.floor(scheduledMinutes * 0.10));
    const hack = scheduledMinutes - kickoff - pitch;

    setPhases([
      { id: Date.now(), name: 'Kickoff & Team Matching', durationMinutes: kickoff || 60, autoTransition: true },
      { id: Date.now() + 1, name: 'Hacking Period', durationMinutes: hack || 1440, autoTransition: false },
      { id: Date.now() + 2, name: 'Demos & Judging', durationMinutes: pitch || 120, autoTransition: false },
    ]);
  };

  const syncDuration = () => {
    if (phases.length === 0) return;
    const newPhases = [...phases];
    // Find the longest phase (usually hacking) and adjust it
    const hackIdx = newPhases.findIndex(p => p.name.toLowerCase().includes('hack') || p.name.toLowerCase().includes('build')) || 1;
    const currentOthers = totalPhaseMinutes - (newPhases[hackIdx]?.durationMinutes || 0);
    const newHackDuration = Math.max(1, scheduledMinutes - currentOthers);
    newPhases[hackIdx] = { ...newPhases[hackIdx], durationMinutes: newHackDuration };
    setPhases(newPhases);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 1000000) {
        alert("Image too large (>1MB)");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => setFormData({ ...formData, logoUrl: reader.result as string });
      reader.readAsDataURL(file);
    }
  };

  const handleAction = async (isDraft = false) => {
    // 1. CLEAR PREVIOUS ERRORS
    setValidationErrors([]);
    const errors: string[] = [];

    // 2. VALIDATE MANDATORY FIELDS (ONLY FOR LIVE LAUNCH)
    if (!isDraft) {
      if (!formData.name.trim()) errors.push("Hackathon Name is required.");
      if (!formData.eventStartTime) errors.push("Event Start Time is required.");
      if (!formData.eventEndTime) errors.push("Event End Time is required.");
      if (!formData.timezone) errors.push("Event Timezone is required.");
      if (phases.length === 0) errors.push("At least one phase is required.");
      if (totalPhaseMinutes <= 0) errors.push("Phases must have duration.");
    }

    if (errors.length > 0) {
      setValidationErrors(errors);
      return;
    }

    if (isDraft) setIsSavingDraft(true);
    else setIsDeploying(true);

    try {
      const payload = {
        name: formData.name,
        organizerSecret: session?.user?.email,
        eventStartTime: formData.eventStartTime,
        eventEndTime: formData.eventEndTime,
        timezone: formData.timezone,
        branding: { 
          accentColor: formData.accentColor, 
          logoUrl: formData.logoUrl,
          themeMode: formData.themeMode,
          glassIntensity: formData.glassIntensity
        },
        phases: phases,
        status: editId ? undefined : (isDraft ? 'DRAFT' : 'RUNNING')
      };

      const url = editId
        ? `${process.env.NEXT_PUBLIC_API_URL}/api/hackathons/${editId}`
        : `${process.env.NEXT_PUBLIC_API_URL}/api/hackathons`;

      const res = await fetch(url, {
        method: editId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (res.ok) {
        if (editId) {
          router.push('/dashboard');
        } else {
          setGeneratedRoom({ id: data.roomId, secret: session?.user?.email || 'N/A' });
          if (!isDraft) await update({ activeRoomId: data.roomId });
          setTimeout(() => resultsRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
        }
      } else {
        setValidationErrors([`Server Error: ${data.error}`]);
      }
    } catch (error: any) {
      setValidationErrors([`System Error: ${error.message}`]);
    } finally {
      setIsDeploying(false);
      setIsSavingDraft(false);
    }
  };

  const onDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const onDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;

    const newPhases = [...phases];
    const draggedItem = newPhases[draggedIndex];
    newPhases.splice(draggedIndex, 1);
    newPhases.splice(index, 0, draggedItem);
    setDraggedIndex(index);
    setPhases(newPhases);
  };

  const onDragEnd = () => {
    setDraggedIndex(null);
  };

  if (isLoadingData) return (
    <div className="h-96 flex flex-col items-center justify-center gap-4">
      <Loader2 className="animate-spin" size={32} style={{ color: '#FF2E9A' }} />
      <p className="font-medium animate-pulse uppercase tracking-[0.2em] text-[10px]" style={{ color: '#6B7280' }}>Initializing Builder...</p>
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto pb-24 stagger-in">
      <style jsx global>{`
        input[type="number"]::-webkit-inner-spin-button,
        input[type="number"]::-webkit-outer-spin-button {
          -webkit-appearance: none;
          margin: 0;
        }
        input[type="number"] {
          -moz-appearance: textfield;
        }
      `}</style>
      {/* Top Navigation */}
      {/* <div className="mb-12 flex items-center justify-between">
        <Link href="/dashboard" className="group flex items-center gap-2 text-slate-500 hover:text-white transition-all">
          <div className="p-2 rounded-full group-hover:bg-white/5 transition-all">
            <ArrowLeft size={18} />
          </div>
          <span className="text-xs font-bold uppercase tracking-widest">Back to Hub</span>
        </Link>
        <div className="flex items-center gap-3">
           <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></div>
           <span className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em]">Builder Mode</span>
        </div>
      </div> */}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
        <div className="lg:col-span-8 space-y-12">
          {/* Header Section */}
          <div className="relative">
            <h1 className="text-5xl font-semibold tracking-tight mb-4" style={{ color: '#E6E6E6' }}>
              {editId ? 'Refining Hackathon' : 'Hackathon Builder'}
            </h1>
            <p className="text-lg font-medium max-w-2xl leading-relaxed" style={{ color: '#A0A0A0' }}>
              Design your hackathon's journey. Set your schedule, define phases, and customize your visual style.
            </p>
          </div>

          {/* 1. Configuration Section */}
          <section className="rounded-[20px] p-10 shadow-2xl space-y-10 relative overflow-hidden" style={{ backgroundColor: '#1C1C1C', border: '1px solid rgba(255,255,255,0.06)' }}>
             <div className="flex items-center gap-3 mb-4">
                <div className="p-2 rounded-xl" style={{ backgroundColor: 'rgba(255,46,154,0.06)', color: '#FF2E9A' }}>
                   <Activity size={18} />
                </div>
                <h2 className="text-sm font-bold tracking-[0.2em] uppercase" style={{ color: '#E6E6E6' }}>Event Info</h2>
             </div>

             <div className="grid grid-cols-1 gap-8 relative z-10">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest ml-1" style={{ color: '#6B7280' }}>Hackathon Name</label>
                  <input 
                    type="text" 
                    value={formData.name} 
                    onChange={e => setFormData({ ...formData, name: e.target.value })} 
                    placeholder="e.g. Global Hack 2026"
                    className="w-full rounded-[20px] py-5 px-6 text-xl font-semibold outline-none transition-all placeholder:text-[#6B7280]" 
                    style={{ backgroundColor: 'rgba(15,15,16,0.6)', border: '1px solid rgba(255,255,255,0.04)', color: '#E6E6E6' }}
                    onFocus={(e) => e.target.style.borderColor = 'rgba(255,46,154,0.3)'}
                    onBlur={(e) => e.target.style.borderColor = 'rgba(255,255,255,0.04)'}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest ml-1 flex items-center gap-2" style={{ color: '#6B7280' }}>
                       <Calendar size={12} style={{ color: '#FF2E9A' }} /> Starts
                    </label>
                    <input 
                      type="datetime-local" 
                      value={formData.eventStartTime} 
                      onChange={e => setFormData({ ...formData, eventStartTime: e.target.value })} 
                      className="w-full rounded-[20px] py-4 px-6 outline-none text-sm [color-scheme:dark]" 
                      style={{ backgroundColor: 'rgba(15,15,16,0.6)', border: '1px solid rgba(255,255,255,0.04)', color: '#E6E6E6' }}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest ml-1 flex items-center gap-2" style={{ color: '#6B7280' }}>
                       <Calendar size={12} style={{ color: '#F43F5E' }} /> Ends
                    </label>
                    <input 
                      type="datetime-local" 
                      value={formData.eventEndTime} 
                      onChange={e => setFormData({ ...formData, eventEndTime: e.target.value })} 
                      className="w-full rounded-[20px] py-4 px-6 outline-none text-sm [color-scheme:dark]" 
                      style={{ backgroundColor: 'rgba(15,15,16,0.6)', border: '1px solid rgba(255,255,255,0.04)', color: '#E6E6E6' }}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest ml-1 flex items-center gap-2" style={{ color: '#6B7280' }}>
                    <Globe size={12} style={{ color: '#CFFF04' }} /> Timezone
                  </label>
                  <select 
                    value={formData.timezone} 
                    onChange={e => setFormData({ ...formData, timezone: e.target.value })} 
                    className="w-full rounded-[20px] py-4 px-6 outline-none text-sm appearance-none"
                    style={{ backgroundColor: 'rgba(15,15,16,0.6)', border: '1px solid rgba(255,255,255,0.04)', color: '#E6E6E6' }}
                  >
                    {availableTimezones.map(tz => <option key={tz} value={tz} style={{ backgroundColor: '#1C1C1C' }}>{tz}</option>)}
                  </select>
                </div>
             </div>
          </section>

          {/* 2. Timeline Section */}
          <section className="space-y-8">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 px-2">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl" style={{ backgroundColor: 'rgba(16,185,129,0.08)', color: '#10B981' }}>
                  <Clock size={18} />
                </div>
                <h2 className="text-sm font-bold tracking-[0.2em] uppercase" style={{ color: '#E6E6E6' }}>Experience Timeline</h2>
              </div>
              <div className="flex items-center gap-3">
                <button 
                  onClick={autoPopulatePhases}
                  className="flex items-center gap-2 px-4 py-2 rounded-full text-[9px] font-bold uppercase tracking-widest transition-all"
                  style={{ backgroundColor: 'rgba(255,46,154,0.06)', border: '1px solid rgba(255,46,154,0.15)', color: '#FF2E9A' }}
                >
                  <Wand2 size={12} /> Auto-Fill Timeline
                </button>
                <button 
                  onClick={() => setPhases([...phases, { id: Date.now(), name: 'New Phase', durationMinutes: 60, autoTransition: false }])} 
                  className="flex items-center gap-2 px-4 py-2 rounded-full text-[9px] font-bold uppercase tracking-widest transition-all"
                  style={{ backgroundColor: 'rgba(255,255,255,0.04)', color: '#A0A0A0' }}
                >
                  <Plus size={12} /> Add Phase
                </button>
              </div>
            </div>

            <div className="relative pl-8 space-y-6" style={{ position: 'relative' }}>
              <div className="absolute left-3 top-2 bottom-2 w-0.5" style={{ background: 'linear-gradient(to bottom, rgba(255,46,154,0.4), rgba(16,185,129,0.3), transparent)' }}></div>
              {phases.map((phase, index) => (
                <div 
                  key={phase.id} 
                  draggable
                  onDragStart={() => onDragStart(index)}
                  onDragOver={(e) => onDragOver(e, index)}
                  onDragEnd={onDragEnd}
                  className={`group relative rounded-[20px] p-6 shadow-xl transition-all duration-300 ${draggedIndex === index ? 'opacity-40 scale-95' : 'opacity-100'}`}
                  style={{ backgroundColor: '#1C1C1C', border: `1px solid ${draggedIndex === index ? 'rgba(255,46,154,0.3)' : 'rgba(255,255,255,0.06)'}` }}
                >
                  {/* Timeline Dot */}
                  <div className="absolute -left-[29px] top-1/2 -translate-y-1/2 w-4 h-4 rounded-full z-10" style={{ backgroundColor: '#0F0F10', border: '2px solid #FF2E9A', boxShadow: '0 0 10px rgba(255,46,154,0.5)' }}></div>
                  
                  <div className="flex flex-col md:flex-row items-start md:items-center gap-8">
                    {/* Reorder Handle */}
                    <div className="cursor-grab active:cursor-grabbing p-2 rounded-xl transition-all" style={{ backgroundColor: 'rgba(255,255,255,0.04)', color: '#6B7280' }}>
                       <GripVertical size={20} />
                    </div>

                    <div className="flex-1 w-full space-y-1">
                      <p className="text-[9px] font-bold tracking-widest uppercase ml-1" style={{ color: '#6B7280' }}>Phase {String(index + 1).padStart(2, '0')}</p>
                      <input 
                        type="text" 
                        value={phase.name} 
                        onChange={(e) => setPhases(phases.map(p => p.id === phase.id ? { ...p, name: e.target.value } : p))} 
                        className="bg-transparent border-none text-xl font-bold outline-none w-full transition-colors" 
                        style={{ color: '#E6E6E6' }}
                        onFocus={(e) => e.target.style.color = '#FF2E9A'}
                        onBlur={(e) => e.target.style.color = '#E6E6E6'}
                      />
                    </div>

                    <div className="flex flex-wrap items-center gap-8 w-full md:w-auto">
                      <div className="space-y-1">
                        <p className="text-[9px] font-bold tracking-widest uppercase text-center md:text-left" style={{ color: '#6B7280' }}>Duration</p>
                        <div className="flex items-center gap-3 rounded-xl px-4 py-2" style={{ backgroundColor: 'rgba(15,15,16,0.6)', border: '1px solid rgba(255,255,255,0.04)' }}>
                          <input 
                            type="number" 
                            value={phase.durationMinutes} 
                            onChange={(e) => setPhases(phases.map(p => p.id === phase.id ? { ...p, durationMinutes: parseInt(e.target.value) || 0 } : p))} 
                            className="w-12 bg-transparent text-sm font-mono font-bold text-center outline-none" style={{ color: '#E6E6E6' }}
                          />
                          <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: '#6B7280' }}>Min</span>
                        </div>
                      </div>

                      <div className="space-y-1">
                        <p className="text-[9px] font-bold tracking-widest uppercase text-center md:text-left" style={{ color: '#6B7280' }}>Auto-Skip</p>
                        <button 
                          onClick={() => setPhases(phases.map(p => p.id === phase.id ? { ...p, autoTransition: !p.autoTransition } : p))} 
                          className="w-12 h-6 rounded-full relative transition-all duration-300"
                          style={{ backgroundColor: phase.autoTransition ? '#10B981' : 'rgba(255,255,255,0.08)' }}
                        >
                          <div className={`w-4 h-4 bg-white rounded-full absolute top-1 transition-all ${phase.autoTransition ? 'right-1' : 'left-1'}`}></div>
                        </button>
                      </div>

                      <button 
                        onClick={() => setPhases(phases.filter(p => p.id !== phase.id))} 
                        className="p-3 hover:text-[#F43F5E] rounded-[20px] transition-all md:opacity-0 md:group-hover:opacity-100"
                        style={{ color: '#6B7280' }}
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
              
              <button 
                onClick={() => setPhases([...phases, { id: Date.now(), name: 'New Phase', durationMinutes: 60, autoTransition: false }])} 
                className="w-full py-6 border border-dashed rounded-[20px] text-sm font-bold tracking-[0.2em] uppercase transition-all flex items-center justify-center gap-3 active:scale-[0.99]"
                style={{ borderColor: 'rgba(255,255,255,0.08)', color: '#6B7280' }}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'rgba(255,46,154,0.3)'; e.currentTarget.style.color = '#FF2E9A'; }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'; e.currentTarget.style.color = '#6B7280'; }}
              >
                <Plus size={18} /> Add New Phase
              </button>
            </div>
          </section>
        </div>

        {/* Sidebar Summary */}
        <div className="lg:col-span-4 space-y-8 lg:sticky lg:top-12 h-fit">
          {/* Validation Errors Display */}
          {validationErrors.length > 0 && (
            <div className="rounded-[20px] p-6 bg-red-500/10 border border-red-500/20 space-y-3 animate-in fade-in slide-in-from-top-4">
               <div className="flex items-center gap-2 text-red-400">
                  <AlertTriangle size={16} />
                  <p className="text-[10px] font-bold uppercase tracking-widest">Incomplete Flow</p>
               </div>
               <ul className="space-y-1">
                  {validationErrors.map((err, i) => (
                    <li key={i} className="text-[11px] font-medium text-red-200/70 flex items-start gap-2">
                       <span className="mt-1.5 w-1 h-1 rounded-full bg-red-400 shrink-0"></span>
                       {err}
                    </li>
                  ))}
               </ul>
            </div>
          )}

          <section className="rounded-[20px] p-8 shadow-2xl space-y-8 overflow-hidden relative" style={{ backgroundColor: '#1C1C1C', border: '1px solid rgba(255,255,255,0.06)' }}>
            <h2 className="text-xs font-bold tracking-[0.2em] uppercase flex items-center gap-2" style={{ color: '#A0A0A0' }}>
               <Activity size={16} style={{ color: '#FF2E9A' }} /> Hackathon Pulse
            </h2>

            <div className="space-y-6 relative z-10">
               <div className="p-6 rounded-[20px]" style={{ backgroundColor: 'rgba(15,15,16,0.6)', border: '1px solid rgba(255,255,255,0.04)' }}>
                  <div className="flex justify-between items-end mb-2">
                    <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: '#6B7280' }}>Scheduled Total</p>
                  </div>
                  <p className="text-4xl font-bold" style={{ color: '#E6E6E6' }}>{formatDuration(scheduledMinutes)}</p>
                  
                  <div className="mt-6 space-y-2 pt-4" style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }}>
                    <div className="flex justify-between items-center">
                      <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: '#6B7280' }}>Phase Allocation</p>
                      <p className="text-[10px] font-mono font-bold" style={{ color: Math.abs(totalPhaseMinutes - scheduledMinutes) < 1 ? '#10B981' : '#F59E0B' }}>
                        {formatDuration(totalPhaseMinutes)}
                      </p>
                    </div>
                    <div className="w-full h-1 rounded-full overflow-hidden" style={{ backgroundColor: 'rgba(255,255,255,0.04)' }}>
                       <div 
                          className="h-full transition-all duration-500"
                          style={{ width: `${Math.min(100, (totalPhaseMinutes / scheduledMinutes) * 100)}%`, backgroundColor: Math.abs(totalPhaseMinutes - scheduledMinutes) < 1 ? '#10B981' : '#FF2E9A' }}
                       ></div>
                    </div>
                  </div>

                  {Math.abs(totalPhaseMinutes - scheduledMinutes) > 1 && (
                    <div className="mt-4 p-3 rounded-xl bg-amber-500/5 border border-amber-500/10">
                      <p className="text-[9px] text-amber-500/80 font-medium flex items-center gap-1.5 leading-relaxed">
                        <AlertTriangle size={12} className="shrink-0" /> 
                        Timeline Mismatch: Your phases are {formatDuration(Math.abs(totalPhaseMinutes - scheduledMinutes))} {totalPhaseMinutes > scheduledMinutes ? 'over' : 'under'} schedule.
                      </p>
                      <button 
                        onClick={syncDuration}
                        className="mt-2 w-full py-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-500 rounded-lg text-[8px] font-bold uppercase tracking-widest transition-all flex items-center justify-center gap-1.5"
                      >
                        <RefreshCw size={10} /> Smart Sync Phases
                      </button>
                    </div>
                  )}
               </div>

               <div className="grid grid-cols-2 gap-4">
                  <div className="p-5 rounded-[20px]" style={{ backgroundColor: 'rgba(15,15,16,0.6)', border: '1px solid rgba(255,255,255,0.04)' }}>
                     <p className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: '#6B7280' }}>Phases</p>
                     <p className="text-xl font-bold" style={{ color: '#E6E6E6' }}>{phases.length}</p>
                  </div>
                  <div className="p-5 rounded-[20px]" style={{ backgroundColor: 'rgba(15,15,16,0.6)', border: '1px solid rgba(255,255,255,0.04)' }}>
                     <p className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: '#6B7280' }}>Auto-Steps</p>
                     <p className="text-xl font-bold" style={{ color: '#10B981' }}>{phases.filter(p => p.autoTransition).length}</p>
                  </div>
               </div>

               {/* Visual Style Customization */}
               <div className="space-y-6 pt-6" style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }}>
                  <div className="flex items-center gap-2 mb-2">
                     <Palette size={14} style={{ color: '#FF2E9A' }} />
                     <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: '#E6E6E6' }}>Visual Identity</p>
                  </div>
                  
                  {/* Logo Upload Card */}
                  <input type="file" ref={fileInputRef} onChange={handleImageUpload} accept="image/*" className="hidden" />
                  <div 
                    className="rounded-[20px] p-5 flex items-center gap-5 cursor-pointer group transition-all"
                    style={{ backgroundColor: 'rgba(15,15,16,0.6)', border: '1px solid rgba(255,255,255,0.04)' }}
                    onClick={() => fileInputRef.current?.click()}
                    onMouseEnter={(e) => e.currentTarget.style.borderColor = 'rgba(255,46,154,0.2)'}
                    onMouseLeave={(e) => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.04)'}
                  >
                    <div 
                      className="w-14 h-14 rounded-xl flex items-center justify-center overflow-hidden shrink-0 transition-all group-hover:scale-105"
                      style={{ backgroundColor: '#1C1C1C', border: '1px solid rgba(255,255,255,0.06)' }}
                    >
                      {formData.logoUrl ? (
                        <img src={formData.logoUrl} alt="Logo" className="w-full h-full object-contain p-1.5" />
                      ) : (
                        <ImageIcon size={20} style={{ color: '#6B7280' }} />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold truncate uppercase tracking-wider" style={{ color: '#E6E6E6' }}>
                        Logo
                      </p>
                      <p className="text-[9px] font-medium mt-0.5" style={{ color: '#6B7280' }}>
                        {formData.logoUrl ? 'Ready to ship • Max 1MB' : 'PNG, JPG, SVG • Max 1MB'}
                      </p>
                    </div>
                    <div className="text-[8px] font-bold uppercase tracking-widest px-3 py-1.5 rounded-lg shrink-0 transition-all group-hover:bg-[#FF2E9A] group-hover:text-white" style={{ backgroundColor: 'rgba(255,46,154,0.08)', color: '#FF2E9A', border: '1px solid rgba(255,46,154,0.1)' }}>
                      Add
                    </div>
                  </div>

                  {/* Accent Color Section */}
                  <div className="space-y-4">
                    <p className="text-[9px] font-bold uppercase tracking-widest" style={{ color: '#6B7280' }}>Accent Color</p>
                    
                    {/* Active Color Display */}
                    <div className="flex items-center gap-4">
                      <div className="relative">
                        <div 
                          className="w-12 h-12 rounded-xl shadow-xl cursor-pointer transition-all hover:scale-105"
                          style={{ backgroundColor: formData.accentColor, border: '1px solid rgba(255,255,255,0.1)', boxShadow: `0 4px 20px ${formData.accentColor}30` }}
                          onClick={() => document.getElementById('color-picker-input')?.click()}
                        ></div>
                        <input 
                          id="color-picker-input"
                          type="color" 
                          value={formData.accentColor}
                          onChange={(e) => setFormData({ ...formData, accentColor: e.target.value })}
                          className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                        />
                      </div>
                      <div className="flex-1">
                        <input 
                          type="text" 
                          value={formData.accentColor} 
                          onChange={(e) => setFormData({ ...formData, accentColor: e.target.value })} 
                          className="bg-transparent text-sm font-mono font-bold w-full outline-none" 
                          style={{ color: '#E6E6E6' }}
                          onFocus={(e) => e.target.style.color = formData.accentColor}
                          onBlur={(e) => e.target.style.color = '#E6E6E6'}
                        />
                        <p className="text-[8px] font-medium mt-0.5" style={{ color: '#6B7280' }}>Click swatch or type hex</p>
                      </div>
                    </div>

                    {/* Preset Palettes */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <p className="text-[8px] font-bold uppercase tracking-widest" style={{ color: '#6B7280' }}>hackTime Brand</p>
                        <button 
                          onClick={() => setShowExtendedPalette(!showExtendedPalette)}
                          className="w-5 h-5 rounded-full flex items-center justify-center transition-all hover:bg-white/5"
                          style={{ color: showExtendedPalette ? '#FF2E9A' : '#6B7280' }}
                        >
                          <Plus size={12} className={`transition-transform duration-300 ${showExtendedPalette ? 'rotate-45' : ''}`} />
                        </button>
                      </div>
                      
                      <div className="flex gap-2">
                        {[
                          { color: '#FF2E9A', name: 'Fuchsia' },
                          { color: '#5D00FF', name: 'Indigo' },
                          { color: '#CFFF04', name: 'Lime' },
                        ].map(c => (
                          <button
                            key={c.color}
                            onClick={() => setFormData({ ...formData, accentColor: c.color })}
                            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[8px] font-bold uppercase tracking-wider transition-all hover:scale-105"
                            style={{ 
                              backgroundColor: formData.accentColor === c.color ? `${c.color}15` : 'rgba(255,255,255,0.02)',
                              border: `1px solid ${formData.accentColor === c.color ? `${c.color}40` : 'rgba(255,255,255,0.04)'}`,
                              color: formData.accentColor === c.color ? c.color : '#6B7280'
                            }}
                          >
                            <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: c.color }}></div>
                            {c.name}
                          </button>
                        ))}
                      </div>

                      {showExtendedPalette && (
                        <div className="pt-2 animate-in fade-in slide-in-from-top-2">
                          <p className="text-[8px] font-bold uppercase tracking-widest mb-2" style={{ color: '#6B7280' }}>Extended Palette</p>
                          <div className="flex gap-2 flex-wrap">
                            {[
                              { color: '#10B981', name: 'Emerald' },
                              { color: '#3B82F6', name: 'Sky' },
                              { color: '#F43F5E', name: 'Rose' },
                              { color: '#8B5CF6', name: 'Violet' },
                              { color: '#F59E0B', name: 'Amber' },
                              { color: '#06B6D4', name: 'Cyan' },
                            ].map(c => (
                              <button
                                key={c.color}
                                onClick={() => setFormData({ ...formData, accentColor: c.color })}
                                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[8px] font-bold uppercase tracking-wider transition-all hover:scale-105"
                                style={{ 
                                  backgroundColor: formData.accentColor === c.color ? `${c.color}15` : 'rgba(255,255,255,0.02)',
                                  border: `1px solid ${formData.accentColor === c.color ? `${c.color}40` : 'rgba(255,255,255,0.04)'}`,
                                  color: formData.accentColor === c.color ? c.color : '#6B7280'
                                }}
                              >
                                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: c.color }}></div>
                                {c.name}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Live Preview Bar */}
                    <div className="rounded-xl overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.04)' }}>
                      <div className="h-2 w-full transition-all duration-500" style={{ background: `linear-gradient(90deg, ${formData.accentColor}, ${formData.accentColor}60, transparent)` }}></div>
                      <div className="px-4 py-3 flex items-center justify-between" style={{ backgroundColor: 'rgba(15,15,16,0.6)' }}>
                        <span className="text-[8px] font-bold uppercase tracking-widest" style={{ color: '#6B7280' }}>Live Preview</span>
                        <div className="flex items-center gap-2">
                          <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ backgroundColor: formData.accentColor, boxShadow: `0 0 6px ${formData.accentColor}` }}></div>
                          <span className="text-[8px] font-bold uppercase" style={{ color: formData.accentColor }}>Active</span>
                        </div>
                      </div>
                    </div>
                  </div>
               </div>
            </div>

            <div className="pt-8 space-y-4">
              <button 
                onClick={() => handleAction(false)} 
                disabled={isDeploying || isSavingDraft || !formData.name} 
                className="w-full py-5 rounded-[20px] font-bold text-xs tracking-[0.2em] uppercase transition-all shadow-2xl disabled:opacity-50 flex items-center justify-center gap-3 active:scale-95 group"
                style={{ backgroundColor: '#CFFF04', color: '#0F0F10' }}
              >
                {isDeploying ? <Loader2 size={18} className="animate-spin" /> : <Zap size={18} className="group-hover:animate-pulse" />}
                {isDeploying ? (editId ? 'SAVING...' : 'LAUNCHING...') : (editId ? 'Update Session' : 'Launch Session')}
              </button>
              
              {!editId && (
                <button 
                  onClick={() => handleAction(true)} 
                  disabled={isDeploying || isSavingDraft || !formData.name} 
                  className="w-full py-5 rounded-[20px] font-bold text-xs tracking-[0.2em] uppercase transition-all flex items-center justify-center gap-3 disabled:opacity-50 active:scale-95"
                  style={{ backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)', color: '#A0A0A0' }}
                >
                  {isSavingDraft ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                  Save Blueprint
                </button>
              )}

              {generatedRoom && (
                <div ref={resultsRef} className="mt-8 pt-8 animate-in slide-in-from-bottom-8 fade-in duration-700" style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }}>
                  <div className="p-6 rounded-[20px] flex flex-col items-center text-center gap-2" style={{ backgroundColor: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.15)', color: '#10B981' }}>
                     <CheckCircle2 size={24} />
                     <p className="text-[10px] font-bold uppercase tracking-[0.2em]">Ready for Liftoff</p>
                  </div>
                  
                  <div className="mt-6 space-y-4">
                    <p className="text-[10px] font-bold tracking-[0.2em] uppercase text-center" style={{ color: '#6B7280' }}>Room ID</p>
                    <div className="rounded-[20px] px-6 py-4 flex justify-between items-center group" style={{ backgroundColor: 'rgba(15,15,16,0.6)', border: '1px solid rgba(255,255,255,0.04)' }}>
                       <span className="text-xl font-mono font-bold tracking-widest" style={{ color: '#CFFF04' }}>{generatedRoom.id}</span>
                       <button 
                        onClick={() => {
                          navigator.clipboard.writeText(generatedRoom.id);
                          setIsCopied(true);
                          setTimeout(() => setIsCopied(false), 2000);
                        }} 
                        className="p-2 transition-all" 
                        style={{ color: isCopied ? '#10B981' : '#6B7280' }}
                       >
                          {isCopied ? <CheckCircle2 size={16} /> : <Copy size={16} />}
                       </button>
                    </div>
                  </div>
                  
                  <Link href="/dashboard" className="block mt-8 text-center text-[10px] font-bold uppercase tracking-[0.3em] hover:text-white transition-all" style={{ color: '#6B7280' }}>
                    Return to Overview <ChevronRight size={10} className="inline ml-1" />
                  </Link>
                </div>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

export default function FlowPage() {
  return (
    <Suspense fallback={
      <div className="h-screen flex flex-col items-center justify-center gap-4">
        <Loader2 className="animate-spin" size={32} style={{ color: '#FF2E9A' }} />
        <p className="font-medium animate-pulse uppercase tracking-[0.2em] text-[10px]" style={{ color: '#6B7280' }}>Initializing Builder...</p>
      </div>
    }>
      <FlowForm />
    </Suspense>
  );
}
