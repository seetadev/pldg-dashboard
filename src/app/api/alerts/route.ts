import { NextResponse } from 'next/server';
import { kv } from '@vercel/kv';
import { EngagementAlert } from '@/types/dashboard';
import { ENGAGEMENT_ALERT_CONFIG } from '@/lib/constants';
import { engagementAlertSchema } from '@/lib/validation';
import { z } from 'zod';

const ALERT_KEY_PREFIX = 'engagement_alert:';
const ALERT_LIST_KEY = 'engagement_alerts';

export async function GET() {
  try {
    const alertIds: string[] = await kv.smembers(ALERT_LIST_KEY);
    
    const alerts = await Promise.all(
      alertIds.map(async (id: string) => {
        const alert = await kv.get<EngagementAlert>(`${ALERT_KEY_PREFIX}${id}`);
        return alert;
      })
    );

    const validAlerts = alerts.filter((alert: EngagementAlert | null): alert is EngagementAlert => {
      if (!alert) return false;
      
      if (alert.status === 'resolved' || alert.status === 'dismissed') {
        const resolvedAt = new Date(alert.updatedAt).getTime();
        const now = Date.now();
        return (now - resolvedAt) <= ENGAGEMENT_ALERT_CONFIG.retentionPeriod;
      }
      
      return true;
    });

    return NextResponse.json(validAlerts);
  } catch (error) {
    console.error('Failed to fetch alerts:', error);
    return NextResponse.json({ error: 'Failed to fetch alerts' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    

    const validatedAlert = engagementAlertSchema.parse(body);

 
    await kv.set(`${ALERT_KEY_PREFIX}${validatedAlert.id}`, validatedAlert);
    await kv.sadd(ALERT_LIST_KEY, validatedAlert.id);

    return NextResponse.json(validatedAlert);
  } catch (error) {
    console.error('Failed to create alert:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid alert data', details: error.errors }, { status: 400 });
    }
    return NextResponse.json({ error: 'Failed to create alert' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    
   
    const updateSchema = z.object({
      id: z.string().min(1),
      status: z.enum(['active', 'resolved', 'dismissed']),
      resolution: z.object({
        resolvedAt: z.string().datetime(),
        resolvedBy: z.string(),
        reason: z.string().min(1)
      }).optional()
    });
    
    const { id, status, resolution } = updateSchema.parse(body);
    
    const alert = await kv.get<EngagementAlert>(`${ALERT_KEY_PREFIX}${id}`);
    if (!alert) {
      return NextResponse.json({ error: 'Alert not found' }, { status: 404 });
    }

    const updatedAlert: EngagementAlert = {
      ...alert,
      status,
      resolution: resolution || alert.resolution,
      updatedAt: new Date().toISOString()
    };

    const validatedAlert = engagementAlertSchema.parse(updatedAlert);

    await kv.set(`${ALERT_KEY_PREFIX}${id}`, validatedAlert);

    return NextResponse.json(validatedAlert);
  } catch (error) {
    console.error('Failed to update alert:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid alert data', details: error.errors }, { status: 400 });
    }
    return NextResponse.json({ error: 'Failed to update alert' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const body = await request.json();
    
    const deleteSchema = z.object({
      id: z.string().min(1)
    });
    
    const { id } = deleteSchema.parse(body);
    
  
    await kv.del(`${ALERT_KEY_PREFIX}${id}`);
    await kv.srem(ALERT_LIST_KEY, id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete alert:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid request data', details: error.errors }, { status: 400 });
    }
    return NextResponse.json({ error: 'Failed to delete alert' }, { status: 500 });
  }
} 