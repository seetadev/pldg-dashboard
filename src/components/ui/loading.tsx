'use client';

import { Loader2Icon } from 'lucide-react';

export function LoadingSpinner({ message }: { message?: string }) {
  return (
    <div className="flex items-center justify-center gap-3">
      <Loader2Icon className="animate-spin" />
      <span className="text-indigo-600 font-medium">
        {message || 'Loading dashboard...'}
      </span>
    </div>
  );
}
