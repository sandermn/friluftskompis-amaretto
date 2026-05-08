"use client";

import { useEffect, useRef, useState, useMemo } from "react";

interface Comment {
  id: number;
  authorName: string;
  body: string;
  createdAt: string | Date;
}

interface Props {
  tripId: string;
  participantNames: string[];
  tripDate: string;
  routeName: string;
  initialComments: Comment[];
}

function formatTime(iso: string | Date) {
  return new Date(iso).toLocaleDateString("nb-NO", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function buildContextPattern(
  participantNames: string[],
  tripDate: string,
  routeName: string,
): RegExp | null {
  const parts: string[] = [];

  // Date patterns: "15. juni", "15/6", the raw ISO date
  if (tripDate) {
    parts.push(tripDate.replace(/[-/]/g, "[-./]"));
    const d = new Date(tripDate);
    if (!isNaN(d.getTime())) {
      const day = d.getDate();
      const monthNames = [
        "januar",
        "februar",
        "mars",
        "april",
        "mai",
        "juni",
        "juli",
        "august",
        "september",
        "oktober",
        "november",
        "desember",
      ];
      parts.push(`${day}\\.?\\s*${monthNames[d.getMonth()]}`);
    }
  }

  // Route name
  if (routeName && routeName.length > 2) {
    parts.push(routeName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  }

  // Participant names
  for (const name of participantNames) {
    if (name.length > 1) {
      parts.push(name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
    }
  }

  // Common discussion keywords
  parts.push(
    "dato",
    "hytte",
    "rute",
    "tidspunkt",
    "klokkeslett",
    "starttid",
    "oppmøte",
  );

  if (parts.length === 0) return null;
  return new RegExp(`(${parts.join("|")})`, "gi");
}

function HighlightedBody({
  body,
  pattern,
}: {
  body: string;
  pattern: RegExp | null;
}) {
  if (!pattern) return <>{body}</>;

  const parts = body.split(pattern);
  return (
    <>
      {parts.map((part, i) =>
        pattern.test(part) ? (
          <span
            key={i}
            className="bg-[#3d5a3e]/10 text-[#3d5a3e] rounded px-0.5"
          >
            {part}
          </span>
        ) : (
          <span key={i}>{part}</span>
        ),
      )}
    </>
  );
}

export default function CommentThread({
  tripId,
  participantNames,
  tripDate,
  routeName,
  initialComments,
}: Props) {
  const [comments, setComments] = useState<Comment[]>(initialComments);
  const [authorName, setAuthorName] = useState(() => {
    if (typeof window === "undefined") return "";
    return sessionStorage.getItem(`friluftskompis:commentName:${tripId}`) ?? "";
  });
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Poll for new comments every 8s
  useEffect(() => {
    const interval = setInterval(async () => {
      if (document.hidden) return;
      const lastId = comments.length > 0 ? comments[comments.length - 1].id : 0;
      try {
        const res = await fetch(
          `/api/trips/${tripId}/comments?since=${lastId}`,
        );
        if (res.ok) {
          const newComments: Comment[] = await res.json();
          if (newComments.length > 0) {
            setComments((prev) => {
              const ids = new Set(prev.map((c) => c.id));
              return [...prev, ...newComments.filter((c) => !ids.has(c.id))];
            });
          }
        }
      } catch {
        // ignore poll errors
      }
    }, 8_000);
    return () => clearInterval(interval);
  }, [tripId, comments]);

  // Auto-scroll on new comments
  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [comments.length]);

  const contextPattern = useMemo(
    () => buildContextPattern(participantNames, tripDate, routeName),
    [participantNames, tripDate, routeName],
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!authorName.trim() || !body.trim()) return;
    setError(null);
    setSending(true);
    try {
      const res = await fetch(`/api/trips/${tripId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          authorName: authorName.trim(),
          body: body.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Noe gikk galt");
        return;
      }
      setComments((prev) => [...prev, data]);
      setBody("");
      sessionStorage.setItem(
        `friluftskompis:commentName:${tripId}`,
        authorName.trim(),
      );
    } catch {
      setError("Kunne ikke sende kommentar");
    } finally {
      setSending(false);
    }
  }

  return (
    <div>
      <div className="px-5 pt-4 pb-2 border-b border-[#f3f1ec]">
        <p className="text-[11px] font-semibold text-[#8a8a80] uppercase tracking-[0.1em]">
          Diskusjon
        </p>
      </div>

      {/* Comment list */}
      <div ref={scrollRef} className="max-h-80 overflow-y-auto px-5 py-3">
        {comments.length === 0 ? (
          <p className="text-[13px] text-[#b0b0a8] py-4 text-center">
            Ingen kommentarer enda. Start diskusjonen!
          </p>
        ) : (
          <div className="space-y-4">
            {comments.map((c) => (
              <div key={c.id}>
                <div className="flex items-baseline gap-2 mb-0.5">
                  <span className="text-[13px] font-medium text-[#2c2c2c]">
                    {c.authorName}
                  </span>
                  <span className="text-[11px] text-[#b0b0a8]">
                    {formatTime(c.createdAt)}
                  </span>
                </div>
                <p className="text-[13px] text-[#5a5a52] leading-relaxed">
                  <HighlightedBody body={c.body} pattern={contextPattern} />
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Post form */}
      <form
        onSubmit={handleSubmit}
        className="px-5 py-3 border-t border-[#f3f1ec] space-y-2.5"
      >
        <input
          type="text"
          value={authorName}
          onChange={(e) => setAuthorName(e.target.value)}
          maxLength={40}
          required
          placeholder="Ditt navn"
          aria-label="Ditt navn"
          className="w-full border border-[#e8e5dd] rounded-xl px-3 py-2 text-[13px] text-[#2c2c2c] placeholder:text-[#b0b0a8] outline-none focus:ring-2 focus:ring-[#3d5a3e]/30 bg-[#faf9f6]"
        />
        <div className="flex gap-2">
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            maxLength={500}
            required
            rows={2}
            placeholder="Skriv en kommentar..."
            aria-label="Kommentar"
            className="flex-1 border border-[#e8e5dd] rounded-xl px-3 py-2 text-[13px] text-[#2c2c2c] placeholder:text-[#b0b0a8] outline-none focus:ring-2 focus:ring-[#3d5a3e]/30 bg-[#faf9f6] resize-none"
          />
          <button
            type="submit"
            disabled={sending}
            className="self-end px-4 py-2 rounded-xl bg-[#3d5a3e] text-white text-[13px] font-medium hover:bg-[#4a6b4b] transition-colors disabled:opacity-50 shrink-0"
          >
            {sending ? "Sender..." : "Send"}
          </button>
        </div>
        {error && <p className="text-[11px] text-[#8a3a30]">{error}</p>}
      </form>
    </div>
  );
}
