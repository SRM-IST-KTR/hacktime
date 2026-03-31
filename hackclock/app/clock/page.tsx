import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { redirect } from "next/navigation";
import Link from "next/link";
import Sidebar from "@/components/ui/Sidebar";
import JoinRoomControls from "@/components/ui/JoinRoomControls";
import { Clock, LayoutGrid, ArrowRight } from "lucide-react";

export default async function ClockInitialPage() {
  const session = await getServerSession(authOptions);
  const activeRoomId = session?.user && "activeRoomId" in session.user
    ? session.user.activeRoomId
    : undefined;
  
  // If user is authenticated and has an active room, direct them to that room's clock
  if (activeRoomId) {
    redirect(`/room/${activeRoomId}/clock`);
  }

  return (
    <div className="flex min-h-screen" style={{ backgroundColor: '#0F0F10', color: '#E6E6E6' }}>
      <div className="hidden lg:block w-72 shrink-0">
        <Sidebar />
      </div>

      <main className="relative flex-1 flex items-start md:items-center justify-center overflow-y-auto p-4 sm:p-6 md:p-10 stagger-in">
        {/* Background Glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[320px] h-[320px] sm:w-[500px] sm:h-[500px] bg-[#FF2E9A]/5 blur-[110px] sm:blur-[120px] rounded-full pointer-events-none" />

        <div className="glass rounded-[2.1rem] sm:rounded-[3rem] p-6 sm:p-8 md:p-12 max-w-xl w-full text-center border-white/5 shadow-[0_64px_128px_rgba(0,0,0,0.6)] relative z-10 overflow-hidden my-4 sm:my-6 md:my-0">
          <div className="inline-flex p-4 sm:p-5 rounded-3xl bg-[#FF2E9A]/10 border border-[#FF2E9A]/20 mb-6 sm:mb-8 md:mb-10 shadow-2xl group transition-all hover:scale-110 duration-500">
            <Clock size={34} className="text-[#FF2E9A] group-hover:rotate-12 transition-transform duration-500 sm:size-10" />
          </div>

          <h1 className="text-3xl sm:text-4xl md:text-5xl font-semibold tracking-tight text-white mb-4 sm:mb-6">
            Station Standby
          </h1>
          
          <p className="text-slate-400 text-base sm:text-lg font-medium leading-relaxed mb-8 sm:mb-10 md:mb-12">
            No active hackathon timeline detected. Initialize a sequence from the command center to activate the global terminal.
          </p>
          
          <div className="mb-6 sm:mb-8">
            <JoinRoomControls />
          </div>

          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center">
            <Link 
              href="/dashboard" 
              className="w-full sm:w-auto px-6 sm:px-8 py-3.5 sm:py-4 bg-[#FF2E9A] text-white rounded-2xl font-bold text-[11px] sm:text-xs uppercase tracking-[0.16em] sm:tracking-[0.2em] hover:bg-[#FF2E9A]/80 transition-all shadow-xl active:scale-95 flex items-center justify-center gap-2"
            >
              <LayoutGrid size={16} /> Home
            </Link>
            <Link 
              href="/flow" 
              className="w-full sm:w-auto px-6 sm:px-8 py-3.5 sm:py-4 bg-white/5 text-slate-300 border border-white/5 rounded-2xl font-bold text-[11px] sm:text-xs uppercase tracking-[0.16em] sm:tracking-[0.2em] hover:bg-white/10 hover:text-white transition-all active:scale-95 flex items-center justify-center gap-2"
            >
              Launch Builder <ArrowRight size={14} />
            </Link>
          </div>

          {/* Footer Status */}
          <div className="mt-10 sm:mt-12 md:mt-16 pt-6 sm:pt-8 border-t border-white/5 flex items-center justify-center gap-2 opacity-40">
             <div className="w-1.5 h-1.5 rounded-full bg-[#FF2E9A]"></div>
             <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-[0.22em] sm:tracking-[0.3em]">Node Offline</span>
          </div>
        </div>
      </main>
    </div>
  );
}
