import { useCallback, useState } from 'react';

import { EmojiPickerModal } from '@/components/ui/emoji-picker-modal';

interface UseReactionPickerReturn {
  targetId: string | null;
  openPicker: (id: string) => void;
  closePicker: () => void;
  pickerProps: {
    visible: boolean;
    title: string;
    onClose: () => void;
    onSelect: (emoji: string) => Promise<void>;
  };
}

export function useReactionPicker(
  onReact: (id: string, emoji: string) => void | Promise<void>,
  title = 'Pick a reaction',
): UseReactionPickerReturn {
  const [targetId, setTargetId] = useState<string | null>(null);

  const openPicker = useCallback((id: string) => setTargetId(id), []);
  const closePicker = useCallback(() => setTargetId(null), []);

  const handleSelect = useCallback(
    async (emoji: string) => {
      if (!targetId) return;
      await onReact(targetId, emoji);
      setTargetId(null);
    },
    [targetId, onReact],
  );

  return {
    targetId,
    openPicker,
    closePicker,
    pickerProps: {
      visible: targetId !== null,
      title,
      onClose: closePicker,
      onSelect: handleSelect,
    },
  };
}
