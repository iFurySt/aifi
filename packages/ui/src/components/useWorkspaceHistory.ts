import { useEffect, useRef, useState } from "react";

/** Limit desktop back/forward to routes visited in this app session. */
export function useWorkspaceHistory() {
  const session = useRef(crypto.randomUUID());
  const position = useRef(0);
  const length = useRef(1);
  const lastUrl = useRef(location.href);
  const [bounds, setBounds] = useState({ back: false, forward: false });
  useEffect(() => {
    const stamp = () =>
      history.replaceState(
        {
          ...history.state,
          aifiNavigation: {
            session: session.current,
            position: position.current,
          },
        },
        "",
      );
    stamp();
    const changed = () => {
      const entry = history.state?.aifiNavigation;
      const traversing =
        entry?.session === session.current &&
        entry.position !== position.current;
      if (location.href === lastUrl.current && !traversing) return;
      if (
        entry?.session === session.current &&
        Number.isInteger(entry.position) &&
        entry.position !== position.current &&
        entry.position >= 0 &&
        entry.position < length.current
      ) {
        position.current = entry.position;
      } else {
        position.current += 1;
        length.current = position.current + 1;
        stamp();
      }
      lastUrl.current = location.href;
      setBounds({
        back: position.current > 0,
        forward: position.current < length.current - 1,
      });
    };
    window.addEventListener("hashchange", changed);
    window.addEventListener("popstate", changed);
    return () => {
      window.removeEventListener("hashchange", changed);
      window.removeEventListener("popstate", changed);
    };
  }, []);
  return {
    canGoBack: bounds.back,
    canGoForward: bounds.forward,
    back: () => {
      if (bounds.back) history.back();
    },
    forward: () => {
      if (bounds.forward) history.forward();
    },
  };
}
