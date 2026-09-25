/**
 * GifPickerModal — GIPHY-powered GIF search & select sheet.
 *
 * Design: same bottom-sheet pattern as EmojiPickerModal.
 * Neo-brutalist: warm cream bg, black outlines, golden accent, hard shadows.
 *
 * GIPHY Terms: "Powered by GIPHY" badge is required and rendered in the header.
 * Analytics: pingGiphy("onclick") is called on gif select.
 */
import { Image } from 'expo-image';
import { Search, X } from 'lucide-react-native';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { LineHeight, Radius, Spacing, Typography, Weight } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { type GiphyGif, isGiphyConfigured, pingGiphy, searchGifs, trendingGifs } from '@/lib/giphy';

interface GifPickerModalProps {
  visible: boolean;
  onClose: () => void;
  onSelect: (gif: GiphyGif) => void;
}

const COLUMN_COUNT = 2;
const GRID_GAP = Spacing.sm;

export function GifPickerModal({ visible, onClose, onSelect }: GifPickerModalProps) {
  const theme = useTheme();
  const [query, setQuery] = useState('');
  const [gifs, setGifs] = useState<GiphyGif[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = useCallback(async (q: string) => {
    if (!isGiphyConfigured()) {
      setLoading(false);
      setGifs([]);
      setErrorMessage('GIF search is not configured in this build.');
      return;
    }

    setLoading(true);
    setErrorMessage(null);
    try {
      const results = q.trim() ? await searchGifs(q) : await trendingGifs();
      setGifs(results);
    } catch {
      setErrorMessage('Couldn’t load GIFs. Check your connection and try again.');
      setGifs([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Load trending when modal opens
  useEffect(() => {
    if (!visible) return;
    setQuery('');
    load('');
  }, [load, visible]);

  const handleQueryChange = (text: string) => {
    setQuery(text);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => load(text), 300);
  };

  const handleSelect = (gif: GiphyGif) => {
    pingGiphy('onclick', gif);
    onSelect(gif);
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.sheet, { backgroundColor: theme.surface, borderColor: theme.outline }]}>
          {/* Header */}
          <View style={[styles.header, { borderBottomColor: theme.outlineLight }]}>
            <View style={styles.headerLeft}>
              <ThemedText type="bodyBold">GIF</ThemedText>
              {/* GIPHY attribution — required by GIPHY Terms */}
              <View style={[styles.poweredBadge, { borderColor: theme.outlineLight, backgroundColor: theme.accentSoft }]}>
                <ThemedText
                  style={[styles.poweredText, { color: theme.textSecondary }]}
                >
                  Powered by GIPHY
                </ThemedText>
              </View>
            </View>
            <Pressable
              onPress={onClose}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel="Close GIF picker"
            >
              <X size={20} color={theme.textSecondary} strokeWidth={2} />
            </Pressable>
          </View>

          {/* Search input */}
          <View style={[styles.searchRow, { borderBottomColor: theme.outlineLight }]}>
            <View style={[styles.searchInput, { backgroundColor: theme.backgroundElement, borderColor: theme.outlineLight }]}>
              <Search size={15} color={theme.placeholder} strokeWidth={2} style={styles.searchIcon} />
              <TextInput
                value={query}
                onChangeText={handleQueryChange}
                placeholder="Search GIFs…"
                placeholderTextColor={theme.placeholder}
                autoCorrect={false}
                autoCapitalize="none"
                returnKeyType="search"
                style={[styles.searchText, { color: theme.text }]}
                accessibilityLabel="Search GIFs"
              />
              {query.length > 0 && (
                <Pressable onPress={() => handleQueryChange('')} hitSlop={6}>
                  <X size={14} color={theme.textTertiary} strokeWidth={2} />
                </Pressable>
              )}
            </View>
          </View>

          {/* Grid */}
          {loading ? (
            <View style={styles.centerState}>
              <ActivityIndicator size="large" color={theme.accent} />
            </View>
          ) : errorMessage ? (
            <View style={styles.centerState}>
              <ThemedText type="small" themeColor="textSecondary">{errorMessage}</ThemedText>
              {isGiphyConfigured() ? (
                <Pressable
                  onPress={() => load(query)}
                  style={[styles.retryBtn, { backgroundColor: theme.accent, borderColor: theme.outline }]}
                  accessibilityRole="button"
                >
                  <ThemedText type="small" style={[styles.retryBtnText, { color: theme.text }]}>Retry</ThemedText>
                </Pressable>
              ) : null}
            </View>
          ) : gifs.length === 0 ? (
            <View style={styles.centerState}>
              <ThemedText style={styles.emptyEmoji}>🔍</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                {query ? `No GIFs for "${query}"` : 'No trending GIFs right now'}
              </ThemedText>
            </View>
          ) : (
            <FlatList
              data={gifs}
              keyExtractor={(item) => item.id}
              numColumns={COLUMN_COUNT}
              contentContainerStyle={styles.gridContent}
              columnWrapperStyle={styles.gridRow}
              showsVerticalScrollIndicator={false}
              renderItem={({ item }) => (
                <GifThumbnail gif={item} onPress={() => handleSelect(item)} />
              )}
            />
          )}
        </View>
      </View>
    </Modal>
  );
}

// ---------------------------------------------------------------------------
// Thumbnail cell
// ---------------------------------------------------------------------------

interface GifThumbnailProps {
  gif: GiphyGif;
  onPress: () => void;
}

function GifThumbnail({ gif, onPress }: GifThumbnailProps) {
  const theme = useTheme();
  const aspectRatio = gif.width > 0 && gif.height > 0 ? gif.width / gif.height : 1;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.thumb,
        { borderColor: theme.outlineLight },
        pressed && styles.thumbPressed,
      ]}
      accessibilityRole="button"
      accessibilityLabel={gif.title || 'GIF'}
    >
      <Image
        source={{ uri: gif.previewUrl }}
        style={[styles.thumbImage, { aspectRatio }]}
        contentFit="cover"
        autoplay
        accessibilityLabel={gif.title}
      />
    </Pressable>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  sheet: {
    height: '72%',
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    borderTopWidth: 2,
    borderLeftWidth: 2,
    borderRightWidth: 2,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  poweredBadge: {
    borderWidth: 1,
    borderRadius: Radius.sm,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
  },
  poweredText: {
    fontSize: 10,
    lineHeight: 14,
    fontWeight: Weight.semibold,
  },
  searchRow: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
  },
  searchInput: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: Radius.full,
    borderWidth: 1.5,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    gap: Spacing.xs,
    minHeight: 40,
  },
  searchIcon: {
    flexShrink: 0,
  },
  searchText: {
    flex: 1,
    fontSize: Typography.small,
    lineHeight: LineHeight.small,
    padding: 0,
  },
  centerState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.md,
    padding: Spacing.xxl,
  },
  retryBtn: {
    marginTop: Spacing.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.md,
    borderWidth: 2,
  },
  retryBtnText: {
    fontWeight: Weight.bold,
  },
  emptyEmoji: {
    fontSize: 32,
  },
  gridContent: {
    padding: GRID_GAP,
    gap: GRID_GAP,
  },
  gridRow: {
    gap: GRID_GAP,
  },
  thumb: {
    flex: 1,
    borderRadius: Radius.md,
    borderWidth: 1,
    overflow: 'hidden',
    backgroundColor: '#EDE8DF',
  },
  thumbPressed: {
    opacity: 0.75,
  },
  thumbImage: {
    width: '100%',
  },
});
