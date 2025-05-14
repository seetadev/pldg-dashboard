"use client";

import * as React from "react";

export function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center gap-3">
      <div className="animate-spin rounded-full h-8 w-8 border-4 border-indigo-500 border-t-transparent" />
      <span className="text-indigo-600 font-medium">Loading dashboard...</span>
    </div>
  );
}
