import React from 'react';
import { useI18n } from '../i18n';

const Skeleton = ({ className = '' }) => <div className={`shimmer rounded-md ${className}`} aria-hidden="true" />;

export const NearestStationsDropdownSkeleton = () => (
  <div className="py-2" aria-hidden="true">
    {[1, 2, 3].map((i) => (
      <div key={i} className="flex items-start gap-2 border-b border-line-100 px-4 py-2.5 last:border-b-0">
        <Skeleton className="mt-0.5 h-4 w-4 shrink-0 rounded-full" />
        <Skeleton className="h-4 flex-1" />
      </div>
    ))}
  </div>
);

export const NearestStationsSectionSkeleton = () => {
  const { t } = useI18n();
  return (
  <div className="grid grid-cols-1 gap-6 lg:grid-cols-2" role="status" aria-label={t('loading.nearest')}>
    <div>
      <Skeleton className="mb-4 h-6 w-40" />
      <div className="grid gap-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="rounded-lg border border-line-200 bg-surface-1 p-5">
            <div className="flex gap-4">
              <Skeleton className="h-8 w-8 shrink-0 rounded-full" />
              <div className="min-w-0 flex-1">
                <Skeleton className="h-5 w-48" />
                <Skeleton className="mt-3 h-4 w-24" />
                <Skeleton className="mt-2 h-4 w-40" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>

    <div className="rounded-lg border border-line-200 bg-surface-1 p-5">
      <Skeleton className="mb-4 h-6 w-32" />
      <Skeleton className="h-[420px] w-full" />
    </div>
  </div>
  );
};

export const RouteDetailsSkeleton = () => {
  const { t } = useI18n();
  return (
  <div className="space-y-6" role="status" aria-label={t('loading.route')}>
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="rounded-lg border border-line-200 bg-surface-1 p-5">
          <Skeleton className="mb-2 h-3 w-20" />
          <Skeleton className="h-8 w-24" />
        </div>
      ))}
    </div>

    <div className="grid gap-6 lg:grid-cols-2">
      {[1, 2].map((i) => (
        <div key={i} className="overflow-hidden rounded-lg border border-line-200 bg-surface-1">
          <div className="border-b border-line-200 bg-surface-0 px-4 py-3">
            <Skeleton className="h-5 w-32" />
          </div>
          <Skeleton className="h-[440px] w-full rounded-none" />
        </div>
      ))}
    </div>
  </div>
  );
};

export default Skeleton;
