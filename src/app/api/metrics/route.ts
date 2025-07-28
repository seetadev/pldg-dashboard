import { NextRequest, NextResponse } from 'next/server';
import { metricsCollector, getHealthWithMetrics } from '@/lib/monitoring';
import { Logger } from '@/lib/logger';

const logger = Logger.getInstance();

export async function GET(request: NextRequest) {
  const startTime = Date.now();
  const acceptHeader = request.headers.get('accept') || '';
  
  try {
    // Return Prometheus format if requested
    if (acceptHeader.includes('text/plain') || request.nextUrl.searchParams.get('format') === 'prometheus') {
      const metrics = metricsCollector.getPrometheusMetrics();
      
      logger.info('Metrics requested in Prometheus format', {
        duration: Date.now() - startTime,
        format: 'prometheus',
      });
      
      return new NextResponse(metrics, {
        status: 200,
        headers: {
          'Content-Type': 'text/plain; charset=utf-8',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
        },
      });
    }
    
    // Return JSON format by default
    const healthWithMetrics = await getHealthWithMetrics();
    
    logger.info('Metrics requested in JSON format', {
      duration: Date.now() - startTime,
      format: 'json',
    });
    
    return NextResponse.json(healthWithMetrics, {
      status: 200,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    });
    
  } catch (error) {
    const duration = Date.now() - startTime;
    logger.error('Metrics endpoint error', error as Error, {
      duration,
    });
    
    return NextResponse.json(
      { error: 'Failed to retrieve metrics' },
      { status: 500 }
    );
  }
}