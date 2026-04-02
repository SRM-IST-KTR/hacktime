"use client";

import { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';
import { signIn } from 'next-auth/react';
import { Clock, AtSign, Lock, LogIn, Users, Hash, UserPlus, ArrowRight, ShieldCheck, User, Image as ImageIcon } from 'lucide-react';
import { PRESET_AVATARS } from '@/lib/constants';

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const defaultTab = useMemo<'LOG IN' | 'CREATE' | 'GUEST'>(() => {
    const tab = searchParams.get('tab')?.toLowerCase();
    if (tab === 'create') return 'CREATE';
    if (tab === 'guest') return 'GUEST';
    return 'LOG IN';
  }, [searchParams]);

  const [activeTab, setActiveTab] = useState<'LOG IN' | 'CREATE' | 'GUEST'>(defaultTab);

  // Form States
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [teamName, setTeamName] = useState('');
  const [roomId, setRoomId] = useState('');
  const [selectedAvatar, setSelectedAvatar] = useState(PRESET_AVATARS[0]);

  // Loading & Error States
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    setActiveTab(defaultTab);
    setError('');
  }, [defaultTab]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    // --- GUEST FLOW ---
    if (activeTab === 'GUEST') {
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/hackathons/${roomId.toUpperCase()}/join`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ teamName }),
        });

        if (!res.ok) {
          const data = await res.json();
          setError(`CONNECTION FAULT: ${data.error || 'Could not join room'}`);
          setIsLoading(false);
          return;
        }

        // Save local session to keep them connected
        localStorage.setItem('hackclock_guest', JSON.stringify({
          teamName,
          roomId: roomId.toUpperCase(),
          joinedAt: new Date().toISOString()
        }));

        // Route directly to the clock UI
        router.push(`/room/${roomId.toUpperCase()}/clock`);
      } catch {
        setError('CONNECTION FAULT: Unable to reach server.');
      }
      setIsLoading(false);
      return;
    }

    // --- CREATE ACCOUNT FLOW ---
    if (activeTab === 'CREATE') {
      if (password !== confirmPassword) {
        setError('SECURITY FAULT: Passkeys do not match.');
        setIsLoading(false);
        return;
      }
      if (password.length < 8) {
        setError('SECURITY FAULT: Passkey must be at least 8 characters.');
        setIsLoading(false);
        return;
      }

      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/auth/register`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, email, password, profilePic: selectedAvatar }),
        });

        const data = await res.json();

        if (!res.ok) {
          setError(`SECURITY FAULT: ${data.error || 'Registration failed'}`);
          setIsLoading(false);
          return;
        }

        const result = await signIn('credentials', {
          redirect: false,
          email,
          password,
        });

        if (result?.error) {
          setError('SECURITY FAULT: Login failed after registration.');
        } else {
          router.push('/dashboard');
        }
      } catch {
        setError('SECURITY FAULT: Unable to reach server.');
      }
      setIsLoading(false);
      return;
    }

    // --- LOG IN FLOW ---
    if (activeTab === 'LOG IN') {
      const result = await signIn('credentials', {
        redirect: false,
        email,
        password,
      });

      if (result?.error) {
        setError('SECURITY FAULT: Invalid credentials.');
        setIsLoading(false);
      } else {
        router.push('/dashboard');
      }
    }
  };

  return (
    <div className="min-h-screen flex flex-col relative overflow-hidden" style={{ backgroundColor: '#0F0F10', color: '#E6E6E6' }}>

      {/* Ambient glow */}
      <div className="absolute top-1/2 left-1/2 h-150 w-150 -translate-x-1/2 -translate-y-1/2 rounded-full pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(93,0,255,0.08) 0%, rgba(255,46,154,0.04) 40%, transparent 70%)' }} />

      {/* Side decorations */}
      <div className="absolute left-4 top-32 text-[10px] tracking-[0.3em] uppercase rotate-180" style={{ writingMode: 'vertical-rl', color: '#6B7280' }}>
        SYS_SECURE_AUTH_LAYER // ACTIVE
      </div>
      <div className="absolute right-4 bottom-32 text-[10px] tracking-[0.3em] uppercase" style={{ writingMode: 'vertical-rl', color: '#6B7280' }}>
        ENCRYPTION_MODE // AES_256_GCM
      </div>

      <header className="h-16 flex justify-between items-center px-8 border-b" style={{ borderColor: 'rgba(255,255,255,0.06)', backgroundColor: 'rgba(28,28,28,0.5)' }}>
        <div className="flex items-center gap-3">
          <Image src="/logo.svg" alt="hackTime logo" width={24} height={24} className="rounded" priority />
          <h2 className="text-lg font-bold tracking-tight" style={{ color: '#E6E6E6' }}>hackTime</h2>
        </div>
        <div className="flex items-center gap-6 text-sm font-medium" style={{ color: '#A0A0A0' }}>
          <span className="cursor-pointer hover:text-white transition">Docs</span>
          <span className="cursor-pointer hover:text-white transition">Support</span>
          <button
            type="button"
            onClick={() => {
              setActiveTab('CREATE');
              setError('');
            }}
            className="text-black px-4 py-1.5 rounded font-semibold transition hover:opacity-90"
            style={{ backgroundColor: '#CFFF04' }}
          >
            Join Platform
          </button>
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center p-4 z-10">

        <div className="flex flex-col items-center mb-8">
          <Image src="/logo.svg" alt="hackTime logo" width={48} height={48} className="mb-4 rounded-xl border shadow-lg" style={{ borderColor: 'rgba(255,255,255,0.06)' }} priority />
          <h1 className="text-3xl font-black tracking-tight mb-2" style={{ color: '#E6E6E6' }}>hackTime</h1>
          <p className="text-[10px] font-bold tracking-[0.2em] uppercase" style={{ color: '#A0A0A0' }}>Terminal Session Authentication</p>
        </div>

        <div className="w-full max-w-md rounded-xl shadow-2xl overflow-hidden transition-all duration-300" style={{ backgroundColor: '#1C1C1C', border: '1px solid rgba(255,255,255,0.06)' }}>

          {error && (
            <div className="border-b p-3 text-center" style={{ backgroundColor: 'rgba(244,63,94,0.08)', borderColor: 'rgba(244,63,94,0.2)' }}>
              <p className="text-xs font-bold tracking-wider uppercase animate-pulse" style={{ color: '#F43F5E' }}>{error}</p>
            </div>
          )}

          <div className="flex border-b" style={{ borderColor: 'rgba(255,255,255,0.06)', backgroundColor: '#0F0F10' }}>
            {['LOG IN', 'CREATE', 'GUEST'].map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => {
                  setActiveTab(tab as 'LOG IN' | 'CREATE' | 'GUEST');
                  setPassword('');
                  setConfirmPassword('');
                  setError('');
                }}
                className={`flex-1 py-4 text-xs font-bold tracking-wider uppercase transition-colors border-t-2 ${activeTab === tab
                  ? ''
                  : 'hover:bg-[#1C1C1C]/50 hover:text-white'
                  }`}
                style={activeTab === tab
                  ? { color: '#FF2E9A', backgroundColor: '#1C1C1C', borderColor: '#FF2E9A' }
                  : { color: '#A0A0A0', borderColor: 'transparent' }
                }
              >
                {tab}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="p-8 space-y-6">

            {activeTab === 'GUEST' && (
              <>
                <div className="animate-in fade-in slide-in-from-right-4 duration-300">
                  <label className="block text-[10px] font-bold mb-2 uppercase tracking-wider" style={{ color: '#A0A0A0' }}>Identity // Team Name</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Users size={16} style={{ color: '#A0A0A0' }} />
                    </div>
                    <input
                      type="text"
                      value={teamName}
                      onChange={(e) => setTeamName(e.target.value)}
                      placeholder="e.g. The Syntax Sorcerers"
                      className="w-full rounded-md py-3 pl-10 pr-4 placeholder-[#6B7280] focus:outline-none transition-colors font-mono text-sm"
                      style={{ backgroundColor: '#0F0F10', border: '1px solid rgba(255,255,255,0.06)', color: '#E6E6E6' }}
                      onFocus={(e) => e.target.style.borderColor = 'rgba(255,46,154,0.4)'}
                      onBlur={(e) => e.target.style.borderColor = 'rgba(255,255,255,0.06)'}
                      required={activeTab === 'GUEST'}
                    />
                  </div>
                </div>

                <div className="animate-in fade-in slide-in-from-right-4 duration-300">
                  <label className="block text-[10px] font-bold mb-2 uppercase tracking-wider" style={{ color: '#A0A0A0' }}>Target // Room ID</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Hash size={16} style={{ color: '#A0A0A0' }} />
                    </div>
                    <input
                      type="text"
                      value={roomId}
                      onChange={(e) => setRoomId(e.target.value.toUpperCase())}
                      maxLength={6}
                      placeholder="AA3892"
                      className="w-full rounded-md py-3 pl-10 pr-4 placeholder-[#6B7280] focus:outline-none transition-colors font-mono text-sm uppercase tracking-widest"
                      style={{ backgroundColor: '#0F0F10', border: '1px solid rgba(255,255,255,0.06)', color: '#E6E6E6' }}
                      onFocus={(e) => e.target.style.borderColor = 'rgba(255,46,154,0.4)'}
                      onBlur={(e) => e.target.style.borderColor = 'rgba(255,255,255,0.06)'}
                      required={activeTab === 'GUEST'}
                    />
                  </div>
                </div>
              </>
            )}

            {(activeTab === 'LOG IN' || activeTab === 'CREATE') && (
              <div className="space-y-6 animate-in fade-in slide-in-from-left-4 duration-300">

                {activeTab === 'CREATE' && (
                  <>
                    <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                      <label className="block text-[10px] font-bold mb-3 uppercase tracking-wider" style={{ color: '#A0A0A0' }}>Identity // Avatar Selection</label>
                      <div className="flex gap-3 justify-between">
                        {PRESET_AVATARS.map((avatar, index) => (
                          <div
                            key={index}
                            onClick={() => setSelectedAvatar(avatar)}
                            className="w-12 h-12 rounded-lg cursor-pointer flex items-center justify-center overflow-hidden transition-all duration-200 border-2"
                            style={{
                              backgroundColor: '#232323',
                              borderColor: selectedAvatar === avatar ? '#FF2E9A' : 'rgba(255,255,255,0.06)',
                              boxShadow: selectedAvatar === avatar ? '0 0 10px rgba(255,46,154,0.3)' : 'none'
                            }}
                          >
                            <img
                              src={avatar}
                              alt={`Preset ${index + 1}`}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                (e.target as HTMLImageElement).style.display = 'none';
                                (e.target as HTMLImageElement).parentElement?.classList.add('fallback-icon');
                              }}
                            />
                            <ImageIcon size={20} className="absolute -z-10" style={{ color: '#A0A0A0' }} />
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                      <label className="block text-[10px] font-bold mb-2 uppercase tracking-wider" style={{ color: '#A0A0A0' }}>Identity // Organizer Name</label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <User size={16} style={{ color: '#A0A0A0' }} />
                        </div>
                        <input
                          type="text"
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          placeholder="e.g. Alex Chen"
                          className="w-full rounded-md py-3 pl-10 pr-4 placeholder-[#6B7280] focus:outline-none transition-colors font-mono text-sm"
                          style={{ backgroundColor: '#0F0F10', border: '1px solid rgba(255,255,255,0.06)', color: '#E6E6E6' }}
                          onFocus={(e) => e.target.style.borderColor = 'rgba(255,46,154,0.4)'}
                          onBlur={(e) => e.target.style.borderColor = 'rgba(255,255,255,0.06)'}
                          required={activeTab === 'CREATE'}
                        />
                      </div>
                    </div>
                  </>
                )}

                <div>
                  <label className="block text-[10px] font-bold mb-2 uppercase tracking-wider" style={{ color: '#A0A0A0' }}>Identity // Email</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <AtSign size={16} style={{ color: '#A0A0A0' }} />
                    </div>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="architect@hacktime.dev"
                      className="w-full rounded-md py-3 pl-10 pr-4 placeholder-[#6B7280] focus:outline-none transition-colors font-mono text-sm"
                      style={{ backgroundColor: '#0F0F10', border: '1px solid rgba(255,255,255,0.06)', color: '#E6E6E6' }}
                      onFocus={(e) => e.target.style.borderColor = 'rgba(255,46,154,0.4)'}
                      onBlur={(e) => e.target.style.borderColor = 'rgba(255,255,255,0.06)'}
                      required={(activeTab as string) !== 'GUEST'}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="block text-[10px] font-bold uppercase tracking-wider" style={{ color: '#A0A0A0' }}>Security // Passkey</label>
                    {activeTab === 'LOG IN' && (
                      <span className="text-[10px] font-bold uppercase tracking-wider cursor-pointer hover:underline" style={{ color: '#FF2E9A' }}>Forgot Password?</span>
                    )}
                  </div>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Lock size={16} style={{ color: '#A0A0A0' }} />
                    </div>
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full rounded-md py-3 pl-10 pr-4 placeholder-[#6B7280] focus:outline-none transition-colors font-mono text-sm tracking-widest"
                      style={{ backgroundColor: '#0F0F10', border: '1px solid rgba(255,255,255,0.06)', color: '#E6E6E6' }}
                      onFocus={(e) => e.target.style.borderColor = 'rgba(255,46,154,0.4)'}
                      onBlur={(e) => e.target.style.borderColor = 'rgba(255,255,255,0.06)'}
                      required={(activeTab as string) !== 'GUEST'}
                    />
                  </div>
                </div>

                {activeTab === 'CREATE' && (
                  <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                    <label className="block text-[10px] font-bold mb-2 uppercase tracking-wider" style={{ color: '#A0A0A0' }}>Security // Confirm Passkey</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Lock size={16} style={{ color: '#A0A0A0' }} />
                      </div>
                      <input
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full rounded-md py-3 pl-10 pr-4 placeholder-[#6B7280] focus:outline-none transition-colors font-mono text-sm tracking-widest"
                        style={{ backgroundColor: '#0F0F10', border: '1px solid rgba(255,255,255,0.06)', color: '#E6E6E6' }}
                        onFocus={(e) => e.target.style.borderColor = 'rgba(255,46,154,0.4)'}
                        onBlur={(e) => e.target.style.borderColor = 'rgba(255,255,255,0.06)'}
                        required={activeTab === 'CREATE'}
                      />
                    </div>
                  </div>
                )}
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 mt-4 rounded-md font-bold text-sm transition-colors flex justify-center items-center gap-2 disabled:opacity-50"
              style={{
                backgroundColor: '#CFFF04',
                color: '#0F0F10',
                boxShadow: '0 0 20px rgba(207,255,4,0.25)'
              }}
            >
              {isLoading ? "AUTHENTICATING..." : (
                <>
                  {activeTab === 'LOG IN' && <>Sign In <LogIn size={16} /></>}
                  {activeTab === 'CREATE' && <>Initialize Account <UserPlus size={16} /></>}
                  {activeTab === 'GUEST' && <>Join Session <ArrowRight size={16} /></>}
                </>
              )}
            </button>

            {activeTab !== 'GUEST' && (
              <>
                <div className="relative flex items-center py-2">
                  <div className="grow border-t" style={{ borderColor: 'rgba(255,255,255,0.06)' }}></div>
                  <span className="shrink-0 mx-4 text-[10px] font-bold tracking-wider uppercase" style={{ color: '#A0A0A0' }}>Or Authenticate Via</span>
                  <div className="grow border-t" style={{ borderColor: 'rgba(255,255,255,0.06)' }}></div>
                </div>

                <div className="flex gap-4">
                  <button
                    type="button"
                    onClick={() => signIn('github', { callbackUrl: '/dashboard' })}
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-md transition-colors text-xs font-bold uppercase tracking-wider"
                    style={{ backgroundColor: '#0F0F10', border: '1px solid rgba(255,255,255,0.06)', color: '#A0A0A0' }}
                    onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#232323'; e.currentTarget.style.color = '#E6E6E6'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#0F0F10'; e.currentTarget.style.color = '#A0A0A0'; }}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 22v-4a4.8 4.8 0 0 0-1-3.02c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A4.8 4.8 0 0 0 8 18v4"></path><path d="M12 18v4"></path></svg>
                    GitHub
                  </button>
                </div>
              </>
            )}
          </form>

          {activeTab !== 'GUEST' && (
            <div className="border-t p-4 flex items-center justify-center gap-2 text-[10px] font-bold tracking-wider uppercase" style={{ backgroundColor: '#0F0F10', borderColor: 'rgba(255,255,255,0.06)', color: '#10B981' }}>
              <ShieldCheck size={14} /> End-to-end encrypted session keys active.
            </div>
          )}
        </div>

        <p className="mt-8 text-[10px] font-mono tracking-widest uppercase" style={{ color: '#6B7280' }}>
          Running V2.4.0 Stable Build
        </p>
      </main>

    </div>
  );
}
