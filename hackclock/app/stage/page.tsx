import type { Metadata } from "next";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { redirect } from "next/navigation";
import Link from "next/link";
import { MonitorPlay, LayoutGrid, ArrowRight } from "lucide-react";

export const metadata: Metadata = {
  title: "Stage Standby for Live Hackathon Events",
  description:
    "Open the stage standby view for an active hackathon room and route directly into the fullscreen presentation countdown.",
  robots: {
    index: false,
    follow: false,
  },
  alternates: {
    canonical: "/stage",
  },
};

export default async function StageHubPage() {
  const session = await getServerSession(authOptions);
  const activeRoomId = session?.user && "activeRoomId" in session.user
    ? session.user.activeRoomId
    : undefined;

  // If user is authenticated and has an active room, direct them to that room's stage
  if (activeRoomId) {
    redirect(`/room/${activeRoomId}/stage`);
  }

  return (
    <div className="flex flex-col min-h-screen items-center md:justify-center p-4 sm:p-6 stagger-in bg-[#0F0F10] text-[#E6E6E6] overflow-y-auto">
      <div className="glass rounded-[2.1rem] sm:rounded-[3rem] p-6 sm:p-8 md:p-12 max-w-xl w-full text-center border-white/5 shadow-[0_64px_128px_rgba(0,0,0,0.6)] relative z-10 overflow-hidden my-4 sm:my-6 md:my-0">
        <div className="inline-flex p-4 sm:p-5 rounded-3xl bg-[#CFFF04]/10 border border-[#CFFF04]/20 mb-6 sm:mb-8 md:mb-10 shadow-2xl group transition-all hover:scale-110 duration-500">
          <MonitorPlay size={34} className="text-[#CFFF04] group-hover:rotate-3 transition-transform duration-500 sm:size-10" />
        </div>

        <h1 className="text-3xl sm:text-4xl md:text-5xl font-semibold tracking-tight text-white mb-4 sm:mb-6">
          Stage Standby
        </h1>

        <p className="text-[#A0A0A0] text-base sm:text-lg font-medium leading-relaxed mb-8 sm:mb-10 md:mb-12">
          No active presentation flow detected. Link a stage endpoint from the command center to activate the immersive broadcast view.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center">
          <Link
            href="/dashboard"
            className="w-full sm:w-auto px-6 sm:px-8 py-3.5 sm:py-4 bg-[#CFFF04] text-black rounded-2xl font-bold text-[11px] sm:text-xs uppercase tracking-[0.16em] sm:tracking-[0.2em] hover:bg-[#CFFF04]/80 transition-all shadow-xl active:scale-95 flex items-center justify-center gap-2"
          >
            <LayoutGrid size={16} /> Home
          </Link>
          <Link
            href="/flow"
            className="w-full sm:w-auto px-6 sm:px-8 py-3.5 sm:py-4 bg-white/5 text-slate-300 border border-white/5 rounded-2xl font-bold text-[11px] sm:text-xs uppercase tracking-[0.16em] sm:tracking-[0.2em] hover:bg-white/10 hover:text-white transition-all active:scale-95 flex items-center justify-center gap-2"
          >
            Create Flow <ArrowRight size={14} />
          </Link>
        </div>

        <div className="mt-10 sm:mt-12 md:mt-16 pt-6 sm:pt-8 border-t border-white/5 flex items-center justify-center gap-2 opacity-40">
          <div className="w-1.5 h-1.5 rounded-full bg-[#CFFF04]"></div>
          <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-[0.22em] sm:tracking-[0.3em]">Projection Offline</span>
        </div>
      </div>
    </div>
  );
}
