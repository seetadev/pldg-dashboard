import React from 'react';
import { AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ErrorMessageProps {
  message: string | null;
  className?: string;
}

export function ErrorMessage({ message, className }: ErrorMessageProps) {
  if (!message) {
    return null;
  }

  return (
    <div className={cn("flex items-center gap-2 text-sm text-red-500", className)}>
      <AlertCircle className="w-4 h-4" />
      <span>{message}</span>
    </div>
  );
}