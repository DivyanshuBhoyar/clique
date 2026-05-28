/**
 * Thin GIPHY REST API client.
 *
 * No SDK dependency — just fetch() + env var.
 * GIPHY Terms require:
 *  - "Powered by GIPHY" attribution (see gif-picker-modal)
 *  - pingback calls on onload / onclick / onsent events
 */

const API_KEY = process.env.EXPO_PUBLIC_GIPHY_API_KEY ?? '';
const BASE = 'https://api.giphy.com/v1/gifs';
const LIMIT = 25;
const RATING = 'pg-13';
const BUNDLE = 'messaging_non_clips';

export interface GiphyGif {
  id: string;
  title: string;
  /** Full-size animated CDN URL (use for sending + rendering in bubble) */
  url: string;
  /** Smaller preview CDN URL (use for picker grid thumbnails) */
  previewUrl: string;
  width: number;
  height: number;
  /** GIPHY permalink — used for analytics pingbacks */
  attributionUrl: string;
}

// ---------------------------------------------------------------------------
// Mappers
// ---------------------------------------------------------------------------

function pickRendition(gif: any, key: string): { url: string; width: number; height: number } {
  const r = gif.images?.[key];
  return {
    url: r?.url ?? '',
    width: parseInt(r?.width ?? '0', 10),
    height: parseInt(r?.height ?? '0', 10),
  };
}

function mapGif(raw: any): GiphyGif {
  const display = pickRendition(raw, 'fixed_width');
  const preview = pickRendition(raw, 'fixed_width_small');
  return {
    id: raw.id,
    title: raw.title ?? '',
    url: display.url,
    previewUrl: preview.url || display.url,
    width: display.width || 200,
    height: display.height || 200,
    attributionUrl: raw.url ?? `https://giphy.com/gifs/${raw.id}`,
  };
}

// ---------------------------------------------------------------------------
// API calls
// ---------------------------------------------------------------------------

async function giphyFetch(path: string, params: Record<string, string>): Promise<GiphyGif[]> {
  if (!API_KEY) {
    console.warn('[giphy] EXPO_PUBLIC_GIPHY_API_KEY is not set');
    return [];
  }
  const qs = new URLSearchParams({ api_key: API_KEY, limit: String(LIMIT), rating: RATING, bundle: BUNDLE, ...params });
  const resp = await fetch(`${BASE}${path}?${qs}`);
  if (!resp.ok) {
    console.warn('[giphy] fetch error', resp.status);
    return [];
  }
  const json = await resp.json();
  return (json.data as any[]).map(mapGif);
}

/** Trending GIFs. Call on picker open with no search text. */
export async function trendingGifs(offset = 0): Promise<GiphyGif[]> {
  return giphyFetch('/trending', { offset: String(offset) });
}

/** Search GIFs. Debounce the call site (~300 ms). */
export async function searchGifs(query: string, offset = 0): Promise<GiphyGif[]> {
  const q = query.trim().slice(0, 50);
  if (!q) return trendingGifs(offset);
  return giphyFetch('/search', { q, offset: String(offset) });
}

// ---------------------------------------------------------------------------
// Analytics pingbacks (GIPHY Terms requirement)
// Each GIF impression/click/send must ping the GIPHY attribution URL.
// Fire-and-forget — failures are silently ignored.
// ---------------------------------------------------------------------------

type PingEvent = 'onload' | 'onclick' | 'onsent';

export function pingGiphy(event: PingEvent, gif: GiphyGif): void {
  // GIPHY Analytics endpoint format:
  // https://api.giphy.com/v1/gifs/<id>/related?api_key=KEY&random_id=...&ts=...&type=<event>
  if (!API_KEY || !gif.id) return;
  const url = `https://api.giphy.com/v1/gifs/${gif.id}/related?api_key=${encodeURIComponent(API_KEY)}&ts=${Date.now()}&type=${event}`;
  fetch(url).catch(() => { /* fire-and-forget */ });
}
