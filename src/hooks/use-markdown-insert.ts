import { useCallback, useRef } from 'react';

export function useMarkdownInsert(
  content: string,
  setContent: (text: string) => void,
  onInsert?: () => void,
) {
  const selectionRef = useRef({ start: 0, end: 0 });

  const handleSelectionChange = useCallback(
    (e: any) => {
      selectionRef.current = e.nativeEvent.selection;
    },
    [],
  );

  const insertMarkdown = useCallback(
    (prefix: string, suffix: string) => {
      const { start, end } = selectionRef.current;
      const selected = content.substring(start, end);
      const newText = content.substring(0, start) + prefix + selected + suffix + content.substring(end);
      setContent(newText);
      onInsert?.();
      const newPos = start + prefix.length + selected.length + suffix.length;
      selectionRef.current = { start: newPos, end: newPos };
    },
    [content, setContent, onInsert],
  );

  return { handleSelectionChange, insertMarkdown };
}
