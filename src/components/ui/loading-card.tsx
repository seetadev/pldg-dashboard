'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export function LoadingCard() {
  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Loading...</CardTitle>
      </CardHeader>
      <CardContent className="h-[300px] flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500" />
      </CardContent>
    </Card>
  );
}
