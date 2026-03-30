import type { FirebaseMessagingTypes } from '@react-native-firebase/messaging';

/**
 * FCM `data` values are strings. Coerce into JSON / numbers where possible for {@link normalizeNotificationFromApi}.
 */
export function remoteMessageDataToNotificationRaw(
  remoteMessage: FirebaseMessagingTypes.RemoteMessage
): Record<string, unknown> {
  const data = remoteMessage.data || {};
  const out: Record<string, unknown> = {};

  for (const [k, v] of Object.entries(data)) {
    if (v == null) continue;
    const s = String(v).trim();
    if (s === '') continue;
    if ((s.startsWith('{') && s.endsWith('}')) || (s.startsWith('[') && s.endsWith(']'))) {
      try {
        out[k] = JSON.parse(s);
        continue;
      } catch {
        /* keep string */
      }
    }
    if (/^-?\d+$/.test(s)) {
      const n = Number(s);
      out[k] = Number.isFinite(n) ? n : s;
      continue;
    }
    if (s === 'true' || s === 'false') {
      out[k] = s === 'true';
      continue;
    }
    out[k] = s;
  }

  const n = remoteMessage.notification;
  if (n?.title != null && out.title == null) out.title = n.title;
  if (n?.body != null && out.message == null) out.message = n.body;

  // Some pipelines send a single JSON blob (merge on top of flattened keys).
  for (const key of ['payload', 'body', 'notification', 'meta'] as const) {
    const v = out[key];
    if (typeof v === 'string' && v.trim().startsWith('{')) {
      try {
        const inner = JSON.parse(v) as Record<string, unknown>;
        if (inner && typeof inner === 'object') {
          Object.assign(out, inner);
        }
      } catch {
        /* ignore */
      }
    }
  }

  return out;
}
