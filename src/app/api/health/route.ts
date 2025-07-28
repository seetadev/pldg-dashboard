import { NextRequest, NextResponse } from 'next/server';
import { Logger } from '@/lib/logger';

const logger = Logger.getInstance();

interface HealthStatus {
  status: 'healthy' | 'unhealthy' | 'degraded';
  timestamp: string;
  uptime: number;
  environment: string;
  version: string;
  services: {
    database: 'healthy' | 'unhealthy' | 'degraded';
    external_apis: 'healthy' | 'unhealthy' | 'degraded';
    ai_service: 'healthy' | 'unhealthy' | 'degraded';
  };
  memory: {
    used: number;
    total: number;
    percentage: number;
  };
  performance: {
    avgResponseTime: number;
    requestsPerSecond: number;
  };
}

async function checkDatabaseHealth(): Promise<'healthy' | 'unhealthy' | 'degraded'> {
  try {
    // Basic MongoDB connection check would go here
    // For now, we'll just check if the connection string exists
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
      return 'unhealthy';
    }
    
    // In a real implementation, you would test the actual connection
    // const client = new MongoClient(mongoUri);
    // await client.connect();
    // await client.close();
    
    return 'healthy';
  } catch (error) {
    logger.error('Database health check failed', error as Error);
    return 'unhealthy';
  }
}

async function checkExternalAPIsHealth(): Promise<'healthy' | 'unhealthy' | 'degraded'> {
  const services = {
    github: !!process.env.GITHUB_TOKEN,
    airtable: !!(process.env.AIRTABLE_API_KEY && process.env.AIRTABLE_BASE_ID),
    anthropic: !!process.env.ANTHROPIC_API_KEY,
  };
  
  const healthyServices = Object.values(services).filter(Boolean).length;
  const totalServices = Object.values(services).length;
  
  if (healthyServices === totalServices) return 'healthy';
  if (healthyServices > 0) return 'degraded';
  return 'unhealthy';
}

async function checkAIServiceHealth(): Promise<'healthy' | 'unhealthy' | 'degraded'> {
  try {
    if (!process.env.ANTHROPIC_API_KEY) {
      return 'unhealthy';
    }
    
    // In a real implementation, you might make a small test request
    // For now, we'll just check configuration
    return 'healthy';
  } catch (error) {
    logger.error('AI service health check failed', error as Error);
    return 'unhealthy';
  }
}

async function handleGET(request: NextRequest) {
  const startTime = Date.now();
  const requestId = request.headers.get('x-request-id') || 'health-check';
  
  try {
    // Run health checks in parallel
    const [databaseHealth, externalApisHealth, aiServiceHealth] = await Promise.all([
      checkDatabaseHealth(),
      checkExternalAPIsHealth(),
      checkAIServiceHealth(),
    ]);
    
    const memoryUsage = process.memoryUsage();
    const memoryUsedMB = Math.round(memoryUsage.heapUsed / 1024 / 1024);
    const memoryTotalMB = Math.round(memoryUsage.heapTotal / 1024 / 1024);
    
    const healthData: HealthStatus = {
      status: determineOverallStatus([databaseHealth, externalApisHealth, aiServiceHealth]),
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'development',
      version: process.env.npm_package_version || 'unknown',
      services: {
        database: databaseHealth,
        external_apis: externalApisHealth,
        ai_service: aiServiceHealth,
      },
      memory: {
        used: memoryUsedMB,
        total: memoryTotalMB,
        percentage: Math.round((memoryUsedMB / memoryTotalMB) * 100),
      },
      performance: {
        avgResponseTime: Date.now() - startTime,
        requestsPerSecond: 0, // This would be calculated from metrics
      },
    };
    
    const statusCode = healthData.status === 'healthy' ? 200 : 
                      healthData.status === 'degraded' ? 200 : 503;
    
    logger.info('Health check completed', {
      requestId,
      status: healthData.status,
      duration: Date.now() - startTime,
      services: healthData.services,
    });
    
    return NextResponse.json(healthData, { 
      status: statusCode,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Content-Type': 'application/json',
      }
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    logger.error('Health check failed', error as Error, {
      requestId,
      duration,
    });
    
    return NextResponse.json(
      {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: 'Health check failed',
      },
      { 
        status: 503,
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Content-Type': 'application/json',
        }
      }
    );
  }
}

function determineOverallStatus(
  serviceStatuses: Array<'healthy' | 'unhealthy' | 'degraded'>
): 'healthy' | 'unhealthy' | 'degraded' {
  if (serviceStatuses.every(status => status === 'healthy')) {
    return 'healthy';
  }
  
  if (serviceStatuses.some(status => status === 'unhealthy')) {
    return 'unhealthy';
  }
  
  return 'degraded';
}

// Health check should be lightweight and not use all middleware
export async function GET(request: NextRequest) {
  return handleGET(request);
}