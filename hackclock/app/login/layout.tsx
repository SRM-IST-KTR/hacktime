import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "Organizer Sign In & Guest Room Join",
    description:
        "Sign in to manage hackathons or join a live room with a six-character code.",
    robots: {
        index: false,
        follow: false,
    },
    alternates: {
        canonical: "/login",
    },
};

export default function LoginLayout({ children }: { children: React.ReactNode }) {
    return <>{children}</>;
}