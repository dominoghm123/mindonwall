import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Content-Type': 'application/json',
};

/** Max payload: 5 MB */
const MAX_BODY = 5 * 1024 * 1024;

function supabaseAdmin() {
  const url = process.env.VITE_SUPABASE_URL!;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient(url, serviceKey);
}

/**
 * Verify user JWT and return userId, or null if invalid.
 */
async function verifyAuth(req: VercelRequest): Promise<string | null> {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) return null;

  const url = process.env.VITE_SUPABASE_URL;
  const anonKey = process.env.VITE_SUPABASE_ANON_KEY;
  if (!url || !anonKey) return null;

  const token = authHeader.slice(7);
  const supabase = createClient(url, anonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
  const { data: { user } } = await supabase.auth.getUser();
  return user?.id ?? null;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'OPTIONS') {
    return res.status(204).setHeaders(CORS_HEADERS).end();
  }

  try {
    const userId = await verifyAuth(req);
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' }).setHeaders(CORS_HEADERS);
    }

    const admin = supabaseAdmin();

    if (req.method === 'POST') {
      // Upload / sync wall data to cloud
      const body = req.body;
      if (!body || typeof body !== 'object') {
        return res.status(400).json({ error: 'Invalid body' }).setHeaders(CORS_HEADERS);
      }
      const json = typeof body === 'string' ? body : JSON.stringify(body);
      if (json.length > MAX_BODY) {
        return res.status(413).json({ error: 'Payload too large' }).setHeaders(CORS_HEADERS);
      }

      // Upsert into user_data table
      const { error } = await admin.from('user_data').upsert({
        user_id: userId,
        data: body,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id' });

      if (error) {
        console.error('[api/sync] upsert error:', error);
        return res.status(500).json({ error: 'Sync failed' }).setHeaders(CORS_HEADERS);
      }

      return res.status(200).json({ ok: true }).setHeaders(CORS_HEADERS);
    }

    if (req.method === 'GET') {
      // Download / load wall data from cloud
      const { data, error } = await admin
        .from('user_data')
        .select('data, updated_at')
        .eq('user_id', userId)
        .single();

      if (error && error.code !== 'PGRST116') {
        // PGRST116 = no rows returned (first time user)
        console.error('[api/sync] select error:', error);
        return res.status(500).json({ error: 'Load failed' }).setHeaders(CORS_HEADERS);
      }

      if (!data) {
        return res.status(200).json({ data: null }).setHeaders(CORS_HEADERS);
      }

      return res.status(200).json({
        data: data.data,
        updatedAt: data.updated_at,
      }).setHeaders(CORS_HEADERS);
    }

    return res.status(405).json({ error: 'Method not allowed' }).setHeaders(CORS_HEADERS);
  } catch (err) {
    console.error('[api/sync]', err);
    return res.status(500).json({ error: 'Internal error' }).setHeaders(CORS_HEADERS);
  }
}
