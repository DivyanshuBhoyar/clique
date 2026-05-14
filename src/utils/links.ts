const URL_REGEX = /(https?:\/\/[^\s<>()]+|www\.[^\s<>()]+)/gi;
const TRAILING_PUNCTUATION = /[.,!?;:)\]]+$/;

export interface DetectedUrl {
  raw: string;
  url: string;
}

export function normalizeUrl(rawUrl: string) {
  return rawUrl.startsWith('http://') || rawUrl.startsWith('https://') ? rawUrl : `https://${rawUrl}`;
}

export function cleanUrl(rawUrl: string) {
  return rawUrl.replace(TRAILING_PUNCTUATION, '');
}

export function getDomain(rawUrl: string) {
  try {
    return new URL(normalizeUrl(cleanUrl(rawUrl))).hostname.replace(/^www\./, '');
  } catch {
    return cleanUrl(rawUrl).replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0];
  }
}

export function getUrlLabel(rawUrl: string) {
  const normalized = normalizeUrl(cleanUrl(rawUrl));
  try {
    const url = new URL(normalized);
    const path = url.pathname === '/' ? '' : url.pathname.replace(/\/$/, '');
    return `${url.hostname.replace(/^www\./, '')}${path}`;
  } catch {
    return cleanUrl(rawUrl);
  }
}

export function extractUrls(text: string): DetectedUrl[] {
  URL_REGEX.lastIndex = 0;
  const matches = text.match(URL_REGEX) ?? [];
  const seen = new Set<string>();

  return matches.reduce<DetectedUrl[]>((acc, match) => {
    const url = cleanUrl(match);
    const normalized = normalizeUrl(url);
    if (seen.has(normalized)) return acc;
    seen.add(normalized);
    acc.push({ raw: url, url: normalized });
    return acc;
  }, []);
}

export function splitTextByUrls(text: string) {
  const parts: Array<{ text: string; isUrl: boolean; url?: string; displayText?: string }> = [];
  let lastIndex = 0;
  URL_REGEX.lastIndex = 0;

  for (const match of text.matchAll(URL_REGEX)) {
    const raw = match[0];
    const start = match.index ?? 0;
    const cleaned = cleanUrl(raw);
    const trailing = raw.slice(cleaned.length);

    if (start > lastIndex) {
      parts.push({ text: text.slice(lastIndex, start), isUrl: false });
    }

    parts.push({
      text: raw,
      isUrl: cleaned.length > 0,
      url: cleaned.length > 0 ? normalizeUrl(cleaned) : undefined,
      displayText: cleaned,
    });

    if (trailing) {
      parts.push({ text: trailing, isUrl: false });
    }

    lastIndex = start + raw.length;
  }

  if (lastIndex < text.length) {
    parts.push({ text: text.slice(lastIndex), isUrl: false });
  }

  return parts;
}
