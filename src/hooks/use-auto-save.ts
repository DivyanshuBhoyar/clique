import { useCallback, useEffect, useRef, useState } from 'react';

type SaveStatus = 'idle' | 'saving' | 'saved';

export function useAutoSave(
  saveFn: (title: string, content: string) => Promise<void>,
  titleRef: React.RefObject<string>,
  contentRef: React.RefObject<string>,
  delayMs = 500,
) {
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const scheduleSave = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setSaveStatus('saving');
    timerRef.current = setTimeout(async () => {
      await saveFn(titleRef.current ?? '', contentRef.current ?? '');
      setSaveStatus('saved');
    }, delayMs);
  }, [saveFn, titleRef, contentRef, delayMs]);

  useEffect(() => {
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, []);

  return { saveStatus, scheduleSave };
}
