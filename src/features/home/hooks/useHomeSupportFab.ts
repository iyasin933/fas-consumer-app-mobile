import { useCallback } from 'react';

/** Wire in help / chat SDK when product is ready. */
export function useHomeSupportFab() {
  const onPress = useCallback(() => {
    // noop — replace with navigation or chat modal
  }, []);
  return { onPress };
}
