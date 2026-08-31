import { memberColor, memberInitial } from "@/lib/member-colors";

export function MemberBadge({
  memberId,
  displayName,
  size = "sm",
}: {
  memberId: string;
  displayName: string;
  size?: "sm" | "xs";
}) {
  const color = memberColor(memberId);
  const dimension = size === "sm" ? "h-5 w-5 text-[11px]" : "h-4 w-4 text-[9px]";

  return (
    <span className="inline-flex items-center gap-1.5">
      <span
        className={`inline-flex ${dimension} shrink-0 items-center justify-center rounded-full font-bold`}
        style={{ backgroundColor: color.bg, color: color.fg }}
        aria-hidden
      >
        {memberInitial(displayName)}
      </span>
      {displayName}
    </span>
  );
}
