import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  CheckCircle2,
  Clock,
  LayoutGrid,
  Megaphone,
  MonitorPlay,
  ShieldCheck,
  Sparkles,
  Users,
} from "lucide-react";

const siteUrl = "https://hacktime.githubsrmist.in";

const keyFeatures = [
  {
    title: "Organizer dashboard",
    description:
      "Build and run a hackathon control room with live state, announcement tools, and session management.",
    icon: LayoutGrid,
  },
  {
    title: "Multi-phase event flows",
    description:
      "Set phases for kickoff, hacking, submissions, and judging so every transition stays on schedule.",
    icon: Clock,
  },
  {
    title: "Fullscreen stage view",
    description:
      "Show a clean, browser-based countdown on projector screens or confidence monitors without extra hardware.",
    icon: MonitorPlay,
  },
  {
    title: "Guest room access",
    description:
      "Share a six-character room code so participants can join the live clock without creating an account.",
    icon: Users,
  },
  {
    title: "Broadcast announcements",
    description:
      "Send timed messages to everyone in a room when judging starts, submissions close, or the schedule changes.",
    icon: Megaphone,
  },
  {
    title: "Open-source friendly",
    description:
      "Designed for hackathon organizers who need a lightweight control room that is easy to deploy and extend.",
    icon: ShieldCheck,
  },
] as const;

const workflow = [
  {
    step: "01",
    title: "Create the flow",
    body: "Define your event start, end, and phase durations inside the organizer dashboard.",
  },
  {
    step: "02",
    title: "Share the room code",
    body: "Launch a room and give participants a 6-character code for instant guest access.",
  },
  {
    step: "03",
    title: "Drive the live event",
    body: "Use the stage screen and broadcast tools to keep the whole room synchronized in real time.",
  },
] as const;

const faq = [
  {
    question: "What does hackTime replace?",
    answer:
      "hackTime replaces scattered spreadsheets, manual timers, and disconnected announcement tools with one synchronized hackathon control room.",
  },
  {
    question: "Can participants join without an account?",
    answer:
      "Yes. Participants can join a room with a guest name and a six-character code to follow the live countdown immediately.",
  },
  {
    question: "Is there a stage screen for AV teams?",
    answer:
      "Yes. The stage view is built for fullscreen display on projector screens and confidence monitors in live venues.",
  },
] as const;

export const metadata: Metadata = {
  title: "Hackathon Control Room, Countdown Timer & Stage View",
  description:
    "Run hackathons with live countdowns, multi-phase event flows, broadcast announcements, and room-code access for participants.",
  keywords: [
    "hackathon timer",
    "hackathon control room",
    "event countdown",
    "stage timer",
    "hackathon software",
    "conference countdown",
    "room code timer",
  ],
  alternates: {
    canonical: "/",
  },
  creator: "GitHub Community SRM",
  publisher: "GitHub Community SRM",
  openGraph: {
    title: "Hackathon Control Room, Countdown Timer & Stage View",
    description:
      "A synchronized control room for organizers, AV teams, and participants running hackathons and live event timelines.",
    url: siteUrl,
    siteName: "hackTime",
    images: [
      {
        url: "/og-image.JPG",
        width: 1200,
        height: 630,
        alt: "hackTime Open Graph social frame",
      },
    ],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Hackathon Control Room, Countdown Timer & Stage View",
    description:
      "A synchronized hackathon control room with live countdowns, stage screens, and room-code access.",
    images: ["/og-image.JPG"],
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function Home() {
  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "WebApplication",
      name: "hackTime",
      url: siteUrl,
      description:
        "An all-in-one hackathon control room for organizers, stage screens, and participants.",
      applicationCategory: "BusinessApplication",
      operatingSystem: "All",
      browserRequirements: "Requires a modern web browser with JavaScript enabled.",
      offers: {
        "@type": "Offer",
        price: "0",
        priceCurrency: "USD",
      },
      creator: {
        "@type": "Organization",
        name: "GitHub Community SRM",
        url: "https://githubsrmist.in",
      },
      featureList: [
        "Organizer dashboard",
        "Multi-phase event flows",
        "Fullscreen stage view",
        "Six-character room codes",
        "Broadcast announcements",
      ],
    },
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: faq.map((item) => ({
        "@type": "Question",
        name: item.question,
        acceptedAnswer: {
          "@type": "Answer",
          text: item.answer,
        },
      })),
    },
  ];

  return (
    <main className="relative overflow-hidden">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <header className="sticky top-0 z-20 border-b border-white/8 bg-[#0F0F10]/85 backdrop-blur-xl">
        <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link href="/" className="group inline-flex items-center gap-2">
            <Image src="/logo.svg" alt="hackTime logo" width={28} height={28} className="rounded-md" priority />
            <span className="text-sm font-semibold tracking-tight text-white group-hover:text-[#CFFF04] transition-colors">
              hackTime
            </span>
          </Link>

          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="hidden sm:inline-flex rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-[#E6E6E6] transition-colors hover:bg-white/10"
            >
              Organizer Login
            </Link>
            <Link
              href="/login?tab=create"
              className="inline-flex rounded-full bg-[#CFFF04] px-4 py-2 text-xs font-bold uppercase tracking-[0.16em] text-[#0F0F10] transition-transform hover:-translate-y-0.5"
            >
              Join Platform
            </Link>
          </div>
        </div>
      </header>

      <section className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-7xl flex-col justify-center px-4 py-16 sm:px-6 lg:px-8">

        <div className="grid gap-14 lg:grid-cols-[1.2fr_0.8fr] lg:items-center">
          <div>
            <h1 className="max-w-4xl text-5xl font-semibold tracking-tight text-white sm:text-6xl lg:text-7xl">
              Run live hackathons without schedule drift or stage chaos.
            </h1>
            <p className="mt-6 max-w-2xl text-base leading-7 text-[#A0A0A0] sm:text-lg">
              hackTime gives hackathon organizers one synchronized place to build
              event flows, launch fullscreen countdowns, broadcast announcements,
              and share room codes so participants can follow the live timeline
              instantly.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/login?tab=create"
                className="inline-flex items-center justify-center gap-2 rounded-full bg-[#CFFF04] px-6 py-3 text-sm font-bold text-[#0F0F10] transition-transform hover:-translate-y-0.5"
              >
                Join Platform
                <ArrowRight size={16} />
              </Link>
              <Link
                href="/login?tab=guest"
                className="inline-flex items-center justify-center rounded-full border border-white/10 bg-white/5 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-white/10"
              >
                Join as Participant
              </Link>
            </div>

            <p className="mt-5 text-xs text-[#A0A0A0]">
              Created by{" "}
              <a
                href="https://githubsrmist.in"
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold text-[#E6E6E6] underline-offset-4 transition-colors hover:text-[#CFFF04] hover:underline"
              >
                GitHub Community SRM
              </a>
              .
            </p>

            <div className="mt-10 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {[
                "6-character room codes",
                "Multi-phase event flows",
                "Fullscreen stage timer",
                "Timed broadcast announcements",
              ].map((item) => (
                <div
                  key={item}
                  className="flex items-center gap-3 rounded-2xl border border-white/8 bg-white/5 px-4 py-3 text-sm text-[#E6E6E6] backdrop-blur"
                >
                  <CheckCircle2 size={16} className="shrink-0 text-[#CFFF04]" />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-3xl border border-white/8 bg-[#1C1C1C]/80 p-5 shadow-[0_32px_80px_rgba(0,0,0,0.45)] backdrop-blur">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-[#A0A0A0]">
                  Live control room
                </p>
                <p className="mt-1 text-lg font-semibold text-white">
                  Built for fast event transitions
                </p>
              </div>
              <div className="rounded-full bg-[#FF2E9A]/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.24em] text-[#FF2E9A]">
                Synchronized
              </div>
            </div>

            <div className="space-y-4">
              {keyFeatures.slice(0, 3).map((feature) => {
                const Icon = feature.icon;
                return (
                  <div
                    key={feature.title}
                    className="rounded-2xl border border-white/8 bg-black/20 p-4"
                  >
                    <div className="flex items-start gap-3">
                      <div className="rounded-xl bg-white/5 p-2 text-[#CFFF04]">
                        <Icon size={18} />
                      </div>
                      <div>
                        <h2 className="text-sm font-semibold text-white">
                          {feature.title}
                        </h2>
                        <p className="mt-1 text-sm leading-6 text-[#A0A0A0]">
                          {feature.description}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 pb-16 sm:px-6 lg:px-8">
        <div className="grid gap-6 md:grid-cols-3">
          {workflow.map((item) => (
            <article
              key={item.step}
              className="rounded-[1.75rem] border border-white/8 bg-[#1C1C1C]/70 p-6"
            >
              <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-[#CFFF04]">
                Step {item.step}
              </p>
              <h2 className="mt-4 text-xl font-semibold text-white">
                {item.title}
              </h2>
              <p className="mt-3 text-sm leading-7 text-[#A0A0A0]">{item.body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 pb-16 sm:px-6 lg:px-8">
        <div className="rounded-3xl border border-white/8 bg-[#1C1C1C]/80 p-6 sm:p-8">
          <div className="max-w-3xl">
            <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-[#A0A0A0]">
              Frequently asked questions
            </p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-white">
              Answers for organizers, AV teams, and participants
            </h2>
          </div>

          <div className="mt-8 grid gap-4 lg:grid-cols-3">
            {faq.map((item) => (
              <article
                key={item.question}
                className="rounded-2xl border border-white/8 bg-black/20 p-5"
              >
                <h3 className="text-base font-semibold text-white">{item.question}</h3>
                <p className="mt-3 text-sm leading-7 text-[#A0A0A0]">
                  {item.answer}
                </p>
              </article>
            ))}
          </div>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-[#A0A0A0]">
              Start with the organizer dashboard, then move into a room code,
              stage screen, or participant clock as the event begins.
            </p>
            <Link
              href="/login?tab=create"
              className="inline-flex items-center justify-center gap-2 rounded-full bg-[#FF2E9A] px-5 py-3 text-sm font-bold text-white transition-transform hover:-translate-y-0.5"
            >
              Get started
              <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
