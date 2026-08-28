import React from 'react';

const Skeleton = ({ className = '' }) => (
  <div className={`animate-pulse rounded-xl bg-gradient-to-r from-slate-200 via-slate-100 to-slate-200 bg-[length:200%_100%] shimmer ${className}`} />
);

export const StationInfoSkeleton = () => (
  <div className="mx-auto max-w-6xl px-5 pb-10">
    {/* Header banner */}
    <div className="rounded-2xl bg-gradient-to-br from-brand-900 to-brand-700 px-6 py-6 md:px-10 md:py-8">
      <div className="flex items-center justify-between gap-6">
        <div className="flex-1">
          <Skeleton className="h-8 w-64 md:w-80 rounded-lg bg-white/20" />
          <Skeleton className="mt-3 h-4 w-72 md:w-96 rounded-lg bg-white/15" />
        </div>
        <Skeleton className="hidden md:block h-16 w-16 rounded-full bg-white/15" />
      </div>
    </div>

    {/* Search bar + filter tabs */}
    <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <Skeleton className="h-12 w-full max-w-xl rounded-full" />
        <div className="hidden lg:flex items-center gap-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-9 w-24 rounded-lg" />
          ))}
        </div>
      </div>
    </div>

    {/* Count badge */}
    <Skeleton className="mt-4 h-8 w-48 rounded-full" />

    {/* Station cards grid */}
    <div className="mt-6 grid gap-6 md:grid-cols-2">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="bg-slate-50 border-b border-slate-200 p-5 flex items-start justify-between gap-4">
            <Skeleton className="h-6 w-40 rounded-lg" />
            <div className="flex flex-col items-end gap-2">
              <Skeleton className="h-5 w-24 rounded-full" />
              <Skeleton className="h-5 w-24 rounded-full" />
            </div>
          </div>
          <div className="grid gap-5 p-5 sm:grid-cols-2">
            <div>
              <Skeleton className="h-4 w-32 rounded mb-3" />
              <div className="space-y-2">
                {[1, 2].map((j) => (
                  <div key={j} className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                    <Skeleton className="h-8 w-8 rounded-lg" />
                    <Skeleton className="h-4 w-28 rounded" />
                  </div>
                ))}
              </div>
            </div>
            <div>
              <Skeleton className="h-4 w-36 rounded mb-3" />
              <div className="space-y-2">
                {[1, 2].map((j) => (
                  <div key={j} className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                    <Skeleton className="h-8 w-8 rounded-lg" />
                    <Skeleton className="h-4 w-32 rounded" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  </div>
);

export const NearestStationsDropdownSkeleton = () => (
  <div className="py-2">
    {[1, 2, 3].map((i) => (
      <div key={i} className="flex items-start gap-2 px-4 py-2.5 border-b border-slate-100 last:border-b-0">
        <Skeleton className="h-4 w-4 rounded-full mt-0.5 shrink-0" />
        <Skeleton className="h-4 flex-1 rounded" />
      </div>
    ))}
  </div>
);

export const NearestStationsSectionSkeleton = () => (
  <div className="rounded-2xl border border-slate-200 bg-white p-10 shadow-sm">
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      {/* Station list side */}
      <div>
        <Skeleton className="h-6 w-40 rounded-lg mb-4" />
        <div className="grid gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex gap-4">
                <Skeleton className="h-8 w-8 rounded-full shrink-0" />
                <div className="flex-1 min-w-0">
                  <Skeleton className="h-5 w-48 rounded-lg" />
                  <div className="mt-3 space-y-2">
                    <div className="flex items-center gap-2">
                      <Skeleton className="h-4 w-4 rounded-full" />
                      <Skeleton className="h-4 w-24 rounded" />
                    </div>
                    <div className="flex items-center gap-2">
                      <Skeleton className="h-4 w-4 rounded-full" />
                      <Skeleton className="h-4 w-40 rounded" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Map side */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <Skeleton className="h-6 w-32 rounded-lg mb-4" />
        <Skeleton className="h-[420px] w-full rounded-xl" />
      </div>
    </div>
  </div>
);

export const RouteDetailsSkeleton = () => (
  <div className="mt-6 space-y-6">
    {/* Summary cards */}
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {[1, 2, 3].map((i) => (
        <div key={i} className="rounded-2xl border-2 border-slate-200 bg-white p-6 shadow-lg">
          <div className="flex items-center gap-4">
            <Skeleton className="h-14 w-14 rounded-xl shrink-0" />
            <div className="flex-1">
              <Skeleton className="h-3 w-20 rounded mb-2" />
              <Skeleton className="h-8 w-24 rounded-lg" />
            </div>
          </div>
        </div>
      ))}
    </div>

    {/* Map + Route details */}
    <div className="grid gap-6 lg:grid-cols-2">
      {/* Map skeleton */}
      <div className="rounded-2xl border-2 border-slate-200 bg-white shadow-xl overflow-hidden">
        <div className="bg-gradient-to-r from-brand-900 to-brand-700 px-5 py-3">
          <Skeleton className="h-5 w-32 rounded bg-white/20" />
        </div>
        <Skeleton className="h-[500px] w-full rounded-none" />
      </div>

      {/* Route list skeleton */}
      <div className="rounded-2xl border-2 border-slate-200 bg-white shadow-xl overflow-hidden">
        <div className="bg-gradient-to-r from-brand-900 to-brand-700 px-5 py-3">
          <Skeleton className="h-5 w-40 rounded bg-white/20" />
        </div>
        <div className="p-6 space-y-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="flex items-start gap-4 p-4 rounded-xl border-2 border-slate-200 bg-slate-50">
              <Skeleton className="h-10 w-10 rounded-full shrink-0" />
              <div className="flex-1">
                <Skeleton className="h-5 w-40 rounded-lg mb-2" />
                <Skeleton className="h-4 w-28 rounded" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  </div>
);

export default Skeleton;
