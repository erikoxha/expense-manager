import { useCallback, useEffect, useRef, useState } from "react";
export function useResource(load, deps = []) {
  const [data, setData] = useState(null),
    [error, setError] = useState(null),
    [loading, setLoading] = useState(true),
    [version, setVersion] = useState(0);
  const fn = useRef(load);
  fn.current = load;
  const reload = useCallback(() => setVersion((v) => v + 1), []);
  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    Promise.resolve()
      .then(() => fn.current())
      .then((v) => {
        if (active) setData(v);
      })
      .catch((e) => {
        if (active) setError(e);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [...deps, version]);
  return { data, error, loading, reload };
}
