import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { QUICK_REACTION_EMOJIS } from '@/constants/emojis';

const STORAGE_KEY = 'homie:most-used-emojis:v1';

type EmojiUsageMap = Record<string, number>;

export function useMostUsedEmojis(limit = 12) {
	const [usageMap, setUsageMap] = useState<EmojiUsageMap>({});

	useEffect(() => {
		let cancelled = false;

		const loadUsage = async () => {
			try {
				const raw = await AsyncStorage.getItem(STORAGE_KEY);
				if (!raw || cancelled) return;

				const parsed = JSON.parse(raw) as EmojiUsageMap;
				if (parsed && typeof parsed === 'object') {
					setUsageMap(parsed);
				}
			} catch {
				// Ignore corrupted local usage and keep defaults.
			}
		};

		loadUsage();
		return () => {
			cancelled = true;
		};
	}, []);

	const mostUsedEmojis = useMemo(() => {
		const ranked = Object.entries(usageMap)
			.sort((a, b) => b[1] - a[1])
			.map(([emoji]) => emoji);

		const merged = [...ranked, ...QUICK_REACTION_EMOJIS];
		return Array.from(new Set(merged)).slice(0, limit);
	}, [limit, usageMap]);

	const recordEmojiUsage = useCallback((emoji: string) => {
		setUsageMap((prev) => {
			const next: EmojiUsageMap = {
				...prev,
				[emoji]: (prev[emoji] ?? 0) + 1,
			};

			AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next)).catch(() => {
				// Failing to persist should not block reaction UX.
			});

			return next;
		});
	}, []);

	return {
		mostUsedEmojis,
		recordEmojiUsage,
	};
}

