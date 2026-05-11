import { useEffect, useRef } from 'react';
import { FlatList } from 'react-native';

export function useAutoScroll(flatListRef: React.RefObject<FlatList | null>, itemCount: number) {
    const prevCount = useRef(0);

    useEffect(() => {
        if (itemCount > prevCount.current) {
            flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
        }
        prevCount.current = itemCount;
    }, [itemCount, flatListRef]);
}
