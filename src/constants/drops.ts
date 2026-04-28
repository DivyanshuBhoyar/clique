export const DROP_CATEGORIES = [
    { key: 'song', label: '🎵 Song' },
    { key: 'movie', label: '🎬 Movie' },
    { key: 'book', label: '📖 Book' },
    { key: 'lifehack', label: '💡 Life hack' },
    { key: 'quote', label: '💬 Quote' },
    { key: 'random', label: '🌀 Random' },
] as const;

export type DropCategoryKey = (typeof DROP_CATEGORIES)[number]['key'];

const categoryMap = Object.fromEntries(
    DROP_CATEGORIES.map((c) => [c.key, c.label]),
) as Record<string, string>;

export function getCategoryLabel(key: string): string {
    return categoryMap[key] ?? key;
}
