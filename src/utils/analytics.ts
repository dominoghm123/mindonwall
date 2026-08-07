/**
 * v0.4: Lightweight analytics SDK — fire-and-forget POST to /api/event.
 * All tracking calls are non-blocking; failures are silently ignored.
 */

/** Known event names (extend as needed) */
export type AnalyticsEvent =
  | 'wall_created'
  | 'wall_deleted'
  | 'wall_shared'
  | 'wall_shared_opened'
  | 'wall_duplicated'
  | 'item_added'
  | 'rope_created'
  | 'project_created'
  | 'wall_moved_to_project'
  | 'export_png'
  | 'export_pdf'
  | 'language_changed'
  | 'wallpaper_changed'
  | 'map_node_edited';

/**
 * Send an analytics event. Non-blocking — never throws.
 * @example track('wall_shared', { method: 'shortlink' });
 */
export function track(
  event: AnalyticsEvent | string,
  properties?: Record<string, unknown>,
  wallId?: string,
): void {
  // Skip in SSR / test environments
  if (typeof window === 'undefined') return;
  // Skip when offline
  if (!navigator.onLine) return;

  const payload = { event, properties, wallId: wallId ?? null, ts: Date.now() };

  // Use sendBeacon for reliability during page unload, fallback to fetch
  if (navigator.sendBeacon) {
    const blob = new Blob([JSON.stringify(payload)], { type: 'application/json' });
    const sent = navigator.sendBeacon('/api/event', blob);
    if (sent) return;
  }

  // Fallback: fire-and-forget fetch with keepalive
  fetch('/api/event', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    keepalive: true,
  }).catch(() => {/* silent */});
}
