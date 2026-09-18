'use client';

/** Typed client-side API helpers. UI components call these, never fetch inline. */
import { YatraView } from '@/lib/domain/types';

async function getJSON<T>(url: string): Promise<T> {
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) throw new Error(`Request failed: ${res.status}`);
  return (await res.json()) as T;
}

export async function fetchYatras(filter: 'upcoming' | 'past' | 'all' = 'upcoming'): Promise<YatraView[]> {
  const data = await getJSON<{ yatras: YatraView[] }>(`/api/yatras?filter=${filter}`);
  return data.yatras ?? [];
}

export async function fetchYatra(slug: string): Promise<YatraView | null> {
  try {
    const data = await getJSON<{ yatra: YatraView }>(`/api/yatras/${slug}`);
    return data.yatra ?? null;
  } catch {
    return null;
  }
}
