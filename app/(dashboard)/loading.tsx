export default function Loading() {
  return (
    <div className="flex-1 p-4 md:p-8 animate-pulse">
      {/* Header skeleton */}
      <div className="mb-8">
        <div className="h-7 w-48 bg-muted rounded-md mb-2" />
        <div className="h-4 w-64 bg-muted/60 rounded-md" />
      </div>

      {/* Cards skeleton */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="border rounded-lg p-5 space-y-2">
            <div className="h-3 w-20 bg-muted rounded" />
            <div className="h-8 w-16 bg-muted rounded" />
            <div className="h-3 w-24 bg-muted/60 rounded" />
          </div>
        ))}
      </div>

      {/* Table / list skeleton */}
      <div className="border rounded-lg overflow-hidden">
        <div className="bg-muted/50 px-4 py-3 flex gap-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-4 bg-muted rounded" style={{ width: `${[120, 80, 80, 80, 60][i]}px` }} />
          ))}
        </div>
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="px-4 py-3.5 border-t flex gap-4 items-center">
            <div className="h-4 w-32 bg-muted/60 rounded" />
            <div className="h-4 w-20 bg-muted/40 rounded" />
            <div className="h-4 w-20 bg-muted/40 rounded" />
            <div className="h-4 w-20 bg-muted/40 rounded" />
            <div className="h-5 w-12 bg-muted/40 rounded-full" />
          </div>
        ))}
      </div>
    </div>
  );
}
