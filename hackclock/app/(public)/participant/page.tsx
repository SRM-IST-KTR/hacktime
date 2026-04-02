import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Clock, Hash, ShieldCheck, Users } from "lucide-react";

const siteUrl = "https://hacktime.githubsrmist.in";

export const metadata: Metadata = {
    title: "Join a Live Hackathon Countdown Room",
    description:
        "Join a hackathon room with a 6-character code, follow the live countdown, and receive announcements without creating an account.",
    alternates: {
        canonical: "/participant",
    },
    openGraph: {
        title: "Join a Live Hackathon Countdown Room",
        description:
            "Enter a room code to follow the live hackathon schedule and countdown on your device.",
        url: `${siteUrl}/participant`,
        siteName: "hackTime",
        type: "website",
    },
    twitter: {
        card: "summary",
        title: "Join a Live Hackathon Countdown Room",
        description:
            "Enter a room code to follow the live hackathon schedule and countdown on your device.",
    },
    robots: {
        index: true,
        follow: true,
    },
};

const steps = [
    "Ask the organizer for the room code.",
    "Open the live participant view.",
    "Follow the countdown and announcements in real time.",
];

export default function ParticipantPage() {
    return (
        <main className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-5xl items-center px-4 py-16 sm:px-6 lg:px-8">
            <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
                <section>
                    <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-[10px] font-bold uppercase tracking-[0.3em] text-[#A0A0A0]">
                        <Users size={12} className="text-[#CFFF04]" />
                        Participant access
                    </div>

                    <h1 className="text-4xl font-semibold tracking-tight text-white sm:text-5xl">
                        Join the live hackathon countdown in seconds.
                    </h1>

                    <p className="mt-6 max-w-2xl text-base leading-7 text-[#A0A0A0] sm:text-lg">
                        hackTime gives participants a fast way to follow the active hackathon
                        schedule, see remaining time for each phase, and receive organizer
                        announcements without creating an account.
                    </p>

                    <div className="mt-8 space-y-3">
                        {steps.map((step, index) => (
                            <div
                                key={step}
                                className="flex items-center gap-3 rounded-2xl border border-white/8 bg-[#1C1C1C]/70 px-4 py-3 text-sm text-[#E6E6E6]"
                            >
                                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/5 text-xs font-bold text-[#CFFF04]">
                                    {index + 1}
                                </div>
                                <span>{step}</span>
                            </div>
                        ))}
                    </div>

                    <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                        <Link
                            href="/login?tab=guest"
                            className="inline-flex items-center justify-center gap-2 rounded-full bg-[#CFFF04] px-6 py-3 text-sm font-bold text-[#0F0F10] transition-transform hover:-translate-y-0.5"
                        >
                            Join a room to join a hack
                            <ArrowRight size={16} />
                        </Link>
                        <Link
                            href="/clock"
                            className="inline-flex items-center justify-center gap-2 rounded-full border border-white/10 bg-white/5 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-white/10"
                        >
                            Open clock view
                        </Link>
                    </div>
                </section>

                <aside className="rounded-3xl border border-white/8 bg-[#1C1C1C]/80 p-6 shadow-[0_32px_80px_rgba(0,0,0,0.4)]">
                    <div className="space-y-4">
                        <div className="rounded-2xl border border-white/8 bg-black/20 p-4">
                            <div className="flex items-start gap-3">
                                <div className="rounded-xl bg-white/5 p-2 text-[#FF2E9A]">
                                    <Hash size={18} />
                                </div>
                                <div>
                                    <h2 className="text-sm font-semibold text-white">Room code access</h2>
                                    <p className="mt-1 text-sm leading-6 text-[#A0A0A0]">
                                        Enter the 6-character code shared by the organizer to join the
                                        live event stream.
                                    </p>
                                </div>
                            </div>
                        </div>
                        <div className="rounded-2xl border border-white/8 bg-black/20 p-4">
                            <div className="flex items-start gap-3">
                                <div className="rounded-xl bg-white/5 p-2 text-[#CFFF04]">
                                    <Clock size={18} />
                                </div>
                                <div>
                                    <h2 className="text-sm font-semibold text-white">Live countdown</h2>
                                    <p className="mt-1 text-sm leading-6 text-[#A0A0A0]">
                                        Stay aligned with the current phase and see time remaining at a
                                        glance.
                                    </p>
                                </div>
                            </div>
                        </div>
                        <div className="rounded-2xl border border-white/8 bg-black/20 p-4">
                            <div className="flex items-start gap-3">
                                <div className="rounded-xl bg-white/5 p-2 text-[#10B981]">
                                    <ShieldCheck size={18} />
                                </div>
                                <div>
                                    <h2 className="text-sm font-semibold text-white">No account required</h2>
                                    <p className="mt-1 text-sm leading-6 text-[#A0A0A0]">
                                        Guest access keeps participant onboarding quick and friction-free.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </aside>
            </div>
        </main>
    );
}