"use client";

import { useState, type ReactNode } from "react";

export function CollapsibleSection({
  title,
  count,
  colorClass = "text-foreground",
  defaultOpen = false,
  children,
}: {
  title: string;
  count: number;
  colorClass?: string;
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);

  if (count === 0) return null;

  return (
    <section>
      <button
        onClick={() => setOpen((v) => !v)}
        className={`flex w-full items-center justify-between text-sm font-semibold ${colorClass}`}
      >
        <span>
          {title} ({count})
        </span>
        <span aria-hidden>{open ? "▲" : "▼"}</span>
      </button>
      {open && <div className="mt-2 space-y-3">{children}</div>}
    </section>
  );
}
