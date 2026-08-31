"use client";

import { memberColor, memberInitial } from "@/lib/member-colors";

export interface FilterableMember {
  id: string;
  display_name: string;
}

/**
 * Un élément correspond au filtre s'il est assigné à la personne sélectionnée
 * OU s'il n'est assigné à personne (tâches/to do partagés, toujours visibles
 * quelle que soit la personne choisie) — "Tous" (selected = null) fait tout
 * passer.
 */
export function matchesMemberFilter(
  assigneeMemberId: string | null,
  selected: string | null
): boolean {
  return selected === null || assigneeMemberId === selected || assigneeMemberId === null;
}

export function PersonFilter({
  members,
  selected,
  onChange,
}: {
  members: FilterableMember[];
  selected: string | null;
  onChange: (memberId: string | null) => void;
}) {
  if (members.length < 2) return null;

  return (
    <div className="mb-5 flex flex-wrap gap-2">
      <button
        onClick={() => onChange(null)}
        className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
          selected === null
            ? "bg-primary text-primary-foreground"
            : "border border-border bg-surface text-muted"
        }`}
      >
        Tous
      </button>
      {members.map((m) => {
        const color = memberColor(m.id);
        const isSelected = selected === m.id;
        return (
          <button
            key={m.id}
            onClick={() => onChange(isSelected ? null : m.id)}
            className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition ${
              isSelected ? "border-transparent" : "border-border bg-surface text-muted"
            }`}
            style={isSelected ? { backgroundColor: color.bg, color: color.fg } : undefined}
          >
            <span
              className="inline-flex h-4 w-4 items-center justify-center rounded-full text-[9px] font-bold"
              style={{ backgroundColor: color.bg, color: color.fg }}
              aria-hidden
            >
              {memberInitial(m.display_name)}
            </span>
            {m.display_name}
          </button>
        );
      })}
    </div>
  );
}
