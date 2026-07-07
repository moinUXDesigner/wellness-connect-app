import { useCallback, useEffect, useRef, useState } from 'react';

declare global {
  interface Window {
    google?: {
      accounts?: {
        id?: {
          initialize: (config: {
            client_id: string;
            callback: (response: { credential: string }) => void;
          }) => void;
          renderButton: (parent: HTMLElement, options: Record<string, unknown>) => void;
        };
      };
    };
  }
}

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID ?? '';

/**
 * Renders the Google Identity Services button into the element passed to `buttonRef`
 * and calls `onCredential` with the ID token JWT once the trainer completes the Google
 * consent flow. No-ops (isConfigured: false) until VITE_GOOGLE_CLIENT_ID is set.
 *
 * `buttonRef` is a callback ref rather than a plain ref because the button's container
 * div can mount after the GIS script has already finished loading (e.g. it only exists
 * on one step of a multi-step form) -- a callback ref lets us render into it whenever it
 * actually appears, instead of only on the hook's first effect run.
 */
export function useGoogleIdentity(onCredential: (idToken: string) => void) {
  const callbackRef = useRef(onCredential);
  callbackRef.current = onCredential;
  const initializedRef = useRef(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!GOOGLE_CLIENT_ID) return;

    let cancelled = false;
    let attempts = 0;
    let timer: number | undefined;

    function tryInitialize() {
      if (cancelled) return;

      if (window.google?.accounts?.id) {
        if (!initializedRef.current) {
          window.google.accounts.id.initialize({
            client_id: GOOGLE_CLIENT_ID,
            callback: (response) => callbackRef.current(response.credential),
          });
          initializedRef.current = true;
        }
        setReady(true);
        return;
      }

      attempts += 1;
      if (attempts < 40) {
        timer = window.setTimeout(tryInitialize, 250);
      }
    }

    tryInitialize();

    return () => {
      cancelled = true;
      if (timer) window.clearTimeout(timer);
    };
  }, []);

  const buttonRef = useCallback(
    (node: HTMLDivElement | null) => {
      if (node && ready && window.google?.accounts?.id) {
        node.innerHTML = '';
        window.google.accounts.id.renderButton(node, {
          theme: 'outline',
          size: 'large',
          width: 320,
          text: 'continue_with',
        });
      }
    },
    [ready],
  );

  return { buttonRef, isConfigured: Boolean(GOOGLE_CLIENT_ID), ready };
}
