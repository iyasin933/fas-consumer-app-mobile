import { useCallback, useState } from 'react';

export function useHomeSearch() {
  const [query, setQuery] = useState('');
  const clear = useCallback(() => setQuery(''), []);
  return { query, setQuery, clear };
}
