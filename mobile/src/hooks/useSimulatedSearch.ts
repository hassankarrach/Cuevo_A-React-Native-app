import { useEffect, useState } from 'react';

// Temporary preview delay; replace with request readiness when data is remote.
export function useSimulatedSearch(delay = 2000) {
  const [search, setSearch] = useState({ query: '', revision: 0 });
  const [readyRevision, setReadyRevision] = useState(-1);
  useEffect(() => {
    const timer = setTimeout(() => setReadyRevision(search.revision), delay);
    return () => clearTimeout(timer);
  }, [search.revision, delay]);
  function changeQuery(query: string) {
    setSearch(current => current.query === query ? current : { query, revision: current.revision + 1 });
  }
  return { query: search.query, changeQuery, loading: readyRevision !== search.revision };
}
