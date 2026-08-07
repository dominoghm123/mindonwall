import type { VercelRequest, VercelResponse } from '@vercel/node';
import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

/** Event list TTL: 90 days */
const EVENT_TTL = 90 * 24 * 60 * 60;
/** Max events per day-key list (safety cap) */
const MAX_EVENTS_PER_DAY = 100_000;

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'application/json',
};

interface EventPayload {
  event: string;
  properties?: Record<string, unknown>;
  wallId?: string;
  ts?: number;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'OPTIONS') {
    return res.status(204).setHeader('Access-Control-Allow-Origin', '*').end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' }).setHeaders(CORS_HEADERS);
  }

  try {
    const body = (typeof req.body === 'string' ? JSON.parse(req.body) : req.body) as EventPayload;
    if (!body?.event) {
      return res.status(400).json({ error: 'Missing event name' }).setHeaders(CORS_HEADERS);
    }

    // Build enriched event record
    const record = {
      event: body.event,
      properties: body.properties ?? {},
      wallId: body.wallId ?? null,
      ts: body.ts ?? Date.now(),
      ua: req.headers['user-agent']?.slice(0, 200) ?? '',
      ref: req.headers['referer']?.slice(0, 200) ?? '',
    };

    // Date-based key: events:analytics:2026-08-08
    const dayKey = `events:analytics:${new Date().toISOString().slice(0, 10)}`;

    await redis.rpush(dayKey, JSON.stringify(record));
    // Set/refresh TTL on the day key
    await redis.expire(dayKey, EVENT_TTL);

    // Also increment per-event counter for quick dashboard stats
    const counterKey = `events:count:${body.event}:${new Date().toISOString().slice(0, 10)}`;
    await redis.incr(counterKey);
    await redis.expire(counterKey, EVENT_TTL);

    return res.status(200).json({ ok: true }).setHeaders(CORS_HEADERS);
  } catch (err) {
    console.error('[api/event]', err);
    return res.status(500).json({ error: 'Internal error' }).setHeaders(CORS_HEADERS);
  }
}
