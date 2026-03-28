/**
 * Normalize technician certificate fields from GET /api/users/profile (and similar).
 * APIs may return string URLs, relative paths, or objects with url/fileUrl/path.
 */
export function collectCertificateRawList(profile: Record<string, unknown> | null | undefined): unknown[] {
  if (!profile || typeof profile !== 'object') return [];

  const candidates = [
    profile.certificates,
    profile.certificateUrls,
    profile.certificateFiles,
    (profile as any).Certificates,
    (profile as any).CertificateUrls,
  ];

  const out: unknown[] = [];
  for (const c of candidates) {
    if (c == null) continue;
    if (Array.isArray(c)) out.push(...c);
    else out.push(c);
  }
  return out;
}

function stringFromItem(item: unknown): string | null {
  if (item == null) return null;
  if (typeof item === 'string') {
    const s = item.trim();
    return s || null;
  }
  if (typeof item === 'object') {
    const o = item as Record<string, unknown>;
    const u =
      o.url ??
      o.fileUrl ??
      o.path ??
      o.imageUrl ??
      o.certificateUrl ??
      o.uri ??
      o.fileName;
    if (typeof u === 'string' && u.trim()) return u.trim();
  }
  return null;
}

export function normalizeCertificateUrlStrings(
  profile: Record<string, unknown> | null | undefined,
  buildAssetUrl: (path: string) => string
): string[] {
  const raw = collectCertificateRawList(profile);
  const seen = new Set<string>();
  const result: string[] = [];

  for (const item of raw) {
    const s = stringFromItem(item);
    if (!s) continue;
    const full =
      s.startsWith('http://') || s.startsWith('https://') ? s : buildAssetUrl(s);
    if (full && !seen.has(full)) {
      seen.add(full);
      result.push(full);
    }
  }
  return result;
}
