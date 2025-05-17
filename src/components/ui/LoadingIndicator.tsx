export function LoadingIndicator({
  type = 'overlay',
  message = 'Updating...',
  showStale = false,
}: {
  type?: 'overlay' | 'inline';
  message?: string;
  showStale?: boolean;
}) {
  if (type === 'inline') {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <div className="animate-spin w-4 h-4 border-2 border-current border-t-transparent rounded-full" />
        <span>{message}</span>
        {showStale && (
          <span className="text-yellow-500">(showing cached data)</span>
        )}
      </div>
    );
  }

  return (
    <div className="absolute inset-0 bg-background/50 backdrop-blur-sm flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
        <span className="text-sm text-muted-foreground">{message}</span>
      </div>
    </div>
  );
}
