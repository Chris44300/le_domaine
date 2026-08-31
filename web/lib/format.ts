export function formatMinutes(totalMinutes: number): string {
  if (totalMinutes <= 0) return "0 min";
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours === 0) return `${minutes} min`;
  if (minutes === 0) return `${hours} h`;
  return `${hours} h ${minutes}`;
}

export function sumEstimatedMinutes(items: { estimated_minutes: number | null }[]): number {
  return items.reduce((sum, item) => sum + (item.estimated_minutes ?? 0), 0);
}
