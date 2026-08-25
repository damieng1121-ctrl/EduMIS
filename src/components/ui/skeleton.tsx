/** Shimmer placeholder — used wherever a page currently shows nothing (or stale data) while its first fetch is in flight. */
export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-md bg-slate-200 ${className}`} />;
}

/** Placeholder rows for a <table> whose data is `null` (not yet loaded) rather than `[]` (loaded, empty). */
export function TableSkeleton({ rows = 5, cols = 4 }: { rows?: number; cols?: number }) {
  return (
    <>
      {Array.from({ length: rows }).map((_, r) => (
        <tr key={r}>
          {Array.from({ length: cols }).map((_, c) => (
            <td key={c} className="p-4">
              <Skeleton className="h-4 w-full max-w-[160px]" />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}
