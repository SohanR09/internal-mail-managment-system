import { NextResponse } from 'next/server';
import { cache, isRedisConnected } from '@/lib/redis';

export async function GET() {
  await cache.get('__health_check__');
  return NextResponse.json({
    status: 'ok',
    redisConnected: isRedisConnected(),
    timestamp: new Date().toISOString(),
  });
}
