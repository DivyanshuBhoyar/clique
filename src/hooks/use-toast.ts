import { useCallback } from 'react';

import { useToastStore } from '@/components/ui/toast';

export function useToast() {
  const show = useToastStore((s) => s.show);

  const success = useCallback((msg: string) => show(msg, 'success'), [show]);
  const error = useCallback((msg: string) => show(msg, 'error'), [show]);
  const info = useCallback((msg: string) => show(msg, 'info'), [show]);

  return { show, success, error, info };
}
