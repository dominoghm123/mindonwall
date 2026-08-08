import type { VercelRequest, VercelResponse } from '@vercel/node';
import { Redis } from '@upstash/redis';
import { nanoid } from 'nanoid';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_REDIS_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_KV_REST_API_TOKEN!,
});

/** Share ID length (6 chars → ~56 billion combos with nanoid alphabet) */
const ID_LEN = 6;
/** Wall data TTL: 30 days */
const TTL_SECONDS = 30 * 24 * 60 * 60;
/** Max payload size: 2 MB JSON */
const MAX_BODY = 2 * 1024 * 1024;

const CORS_HEADERS = new Headers({
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'application/json',
});

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return res.status(204).setHeader('Access-Control-Allow-Origin', '*').end();
  }

  try {
    if (req.method === 'POST') {
      // ── Create share ──
      const body = req.body;
      if (!body || typeof body !== 'object') {
        return res.status(400).json({ error: 'Invalid body' }).setHeaders(CORS_HEADERS);
      }
      const json = typeof body === 'string' ? body : JSON.stringify(body);
      if (json.length > MAX_BODY) {
        return res.status(413).json({ error: 'Payload too large' }).setHeaders(CORS_HEADERS);
      }

      const id = nanoid(ID_LEN);
      await redis.setex(`share:${id}`, TTL_SECONDS, json);
      await redis.set(`share:${id}:views`, '0');

      return res.status(201).json({ id, url: `/s/${id}` }).setHeaders(CORS_HEADERS);
    }

    if (req.method === 'GET') {
      // ── Retrieve share ──
      const id = req.query.id as string;
      if (!id || id.length !== ID_LEN) {
        return res.status(400).json({ error: 'Invalid id' }).setHeaders(CORS_HEADERS);
      }

      const data = await redis.get<string>(`share:${id}`);
      if (!data) {
        return res.status(404).json({ error: 'Share not found or expired' }).setHeaders(CORS_HEADERS);
      }

      // Increment view count (non-blocking)
      redis.incr(`share:${id}:views`).catch(() => {});

      const payload = typeof data === 'string' ? JSON.parse(data) : data;
      return res.status(200).json(payload).setHeaders(CORS_HEADERS);
    }

    return res.status(405).json({ error: 'Method not allowed' }).setHeaders(CORS_HEADERS);
  } catch (err) {
    console.error('[api/share]', err);
    return res.status(500).json({ error: 'Internal error' }).setHeaders(CORS_HEADERS);
  }
}
