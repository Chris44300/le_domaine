function SkeletonCard() {
  return (
    <div className="animate-pulse rounded-2xl border border-border bg-surface p-4 shadow-card">
      <div className="h-3 w-24 rounded-full bg-border" />
      <div className="mt-2 h-4 w-40 rounded-full bg-border" />
      <div className="mt-4 flex gap-2">
        <div className="h-9 flex-1 rounded-xl bg-border" />
        <div className="h-9 w-16 rounded-xl bg-border" />
      </div>
    </div>
  );
}

export default function Loading() {
  return (
    <div className="space-y-3 px-4 pt-6">
      <div className="mb-3 h-7 w-40 animate-pulse rounded-full bg-border" />
      <SkeletonCard />
      <SkeletonCard />
      <SkeletonCard />
    </div>
  );
}
