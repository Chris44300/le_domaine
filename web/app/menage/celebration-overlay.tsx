"use client";

import { useEffect, useState } from "react";
import { APP_FEEDBACK_EVENT, type AppFeedbackDetail } from "@/lib/celebrate";

export function CelebrationOverlay() {
  const [visible, setVisible] = useState(false);
  const [detail, setDetail] = useState<AppFeedbackDetail | null>(null);

  useEffect(() => {
    function handle(event: Event) {
      setDetail((event as CustomEvent<AppFeedbackDetail>).detail);
      setVisible(true);
      const timer = setTimeout(() => setVisible(false), 1800);
      return () => clearTimeout(timer);
    }
    window.addEventListener(APP_FEEDBACK_EVENT, handle);
    return () => window.removeEventListener(APP_FEEDBACK_EVENT, handle);
  }, []);

  if (!visible || !detail) return null;

  return (
    <div
      className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center"
      aria-live="polite"
    >
      <div className="animate-celebrate-pop rounded-3xl bg-foreground/85 px-8 py-6 text-center shadow-xl backdrop-blur-sm">
        <p className="text-5xl">{detail.emoji}</p>
        <p className="mt-2 text-sm font-semibold text-white">{detail.message}</p>
        <p className="text-xs text-white/70">{detail.subtext}</p>
      </div>
    </div>
  );
}
