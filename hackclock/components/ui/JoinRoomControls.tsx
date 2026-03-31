"use client";

import { FormEvent, useMemo, useState, CSSProperties } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { ArrowRight, Loader2 } from "lucide-react";
import Modal from "@/components/ui/Modal";

interface JoinRoomControlsProps {
  mode?: "inline" | "modal";
  title?: string;
  description?: string;
  buttonLabel?: string;
  className?: string;
  style?: CSSProperties;
  onSuccess?: () => void;
}

export default function JoinRoomControls({
  mode = "inline",
  title = "Connect Terminal",
  description = "Enter a room ID to join the active hackathon terminal.",
  buttonLabel = "Join",
  className = "",
  style,
  onSuccess,
}: JoinRoomControlsProps) {
  const router = useRouter();
  const { data: session } = useSession();
  const [roomId, setRoomId] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const [error, setError] = useState("");

  const fallbackTeamName = useMemo(() => {
    const sessionName = session?.user?.name?.trim();
    if (sessionName) return sessionName;

    const email = session?.user?.email;
    if (email) return email.split("@")[0];

    return "Guest Terminal";
  }, [session]);

  const submitJoin = async (event?: FormEvent<HTMLFormElement>) => {
    event?.preventDefault();

    const normalizedRoomId = roomId.trim().toUpperCase();
    if (!normalizedRoomId) {
      setError("Enter a valid room ID.");
      return;
    }

    setIsJoining(true);
    setError("");

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/hackathons/${normalizedRoomId}/join`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ teamName: fallbackTeamName }),
      });

      if (!res.ok) {
        setError("Room not found or unavailable.");
        return;
      }

      localStorage.setItem("hackclock_guest", JSON.stringify({
        teamName: fallbackTeamName,
        roomId: normalizedRoomId,
      }));

      onSuccess?.();
      setIsOpen(false);
      router.push(`/room/${normalizedRoomId}/clock`);
      router.refresh();
    } catch {
      setError("Network connection failed.");
    } finally {
      setIsJoining(false);
    }
  };

  const form = (
    <form onSubmit={submitJoin} className="space-y-5">
      <div className="space-y-2">
        <p className="text-[10px] font-bold uppercase tracking-[0.2em]" style={{ color: '#A0A0A0' }}>
          Room ID
        </p>
        <input
          type="text"
          value={roomId}
          onChange={(e) => {
            setRoomId(e.target.value.toUpperCase());
            if (error) setError("");
          }}
          placeholder="EX: AB12CD"
          autoCapitalize="characters"
          autoCorrect="off"
          className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 sm:px-5 py-3.5 sm:py-4 text-sm font-mono tracking-[0.12em] sm:tracking-[0.25em] text-white uppercase outline-none transition-all focus:border-blue-500/50 focus:bg-black/40"
        />
      </div>

      {error && (
        <p className="text-xs" style={{ color: '#F43F5E' }}>{error}</p>
      )}

      <button
        type="submit"
        disabled={isJoining}
        className="w-full inline-flex items-center justify-center gap-2 rounded-2xl bg-blue-600 px-6 py-3.5 sm:py-4 text-[11px] sm:text-xs font-bold uppercase tracking-[0.16em] sm:tracking-[0.2em] text-white transition-all hover:bg-blue-500 disabled:opacity-60"
      >
        {isJoining ? <Loader2 size={16} className="animate-spin" /> : <ArrowRight size={16} />}
        {isJoining ? "Joining..." : buttonLabel}
      </button>
    </form>
  );

  if (mode === "modal") {
    return (
      <>
        <button
          onClick={() => setIsOpen(true)}
          className={className || "w-full py-3 rounded-xl font-bold text-[10px] transition-all flex justify-center items-center gap-2 tracking-[0.1em] uppercase shadow-lg active:scale-95"}
          style={style || { backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)', color: '#A0A0A0' }}
          onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.08)'; e.currentTarget.style.color = '#E6E6E6'; }}
          onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = style?.backgroundColor as string || 'rgba(255,255,255,0.04)'; e.currentTarget.style.color = style?.color as string || '#A0A0A0'; }}
        >
          {buttonLabel}
        </button>

        <Modal
          isOpen={isOpen}
          onClose={() => setIsOpen(false)}
          title={title}
        >
          <div className="space-y-5">
            <p className="text-sm leading-relaxed" style={{ color: '#A0A0A0' }}>{description}</p>
            {form}
          </div>
        </Modal>
      </>
    );
  }

  return (
    <div className={className}>
      <div className="space-y-5">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] mb-2" style={{ color: '#A0A0A0' }}>
            Join Hackathon
          </p>
          <p className="text-sm leading-relaxed" style={{ color: '#A0A0A0' }}>
            Enter a room ID to connect this terminal instantly.
          </p>
        </div>
        {form}
      </div>
    </div>
  );
}
