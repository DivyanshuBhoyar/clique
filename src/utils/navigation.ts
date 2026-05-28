type RouterLike = {
  canGoBack?: () => boolean;
  back: () => void;
  replace: (href: any) => void;
};

/**
 * Expo Router warns when `back()` is called without a navigation history.
 * Use a concrete fallback for screens that can be deep-linked or refreshed.
 */
export function backOrReplace(router: RouterLike, fallbackHref: string) {
  if (router.canGoBack?.()) {
    router.back();
    return;
  }

  router.replace(fallbackHref as any);
}