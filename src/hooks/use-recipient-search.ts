"use client";

import { useEffect, useRef, useState } from "react";

export type RecipientOption = {
  id: string;
  fullName: string;
  phoneNumber: string;
  email: string;
};

const recipientCache = new Map<string, RecipientOption[]>();
const REQUEST_TIMEOUT_MS = 8000;
const SAFETY_LOADING_TIMEOUT_MS = 9000;
const RECIPIENT_SEARCH_DEBUG = process.env.NODE_ENV !== "production";

function logRecipientSearch(event: string, detail: Record<string, unknown>) {
  if (!RECIPIENT_SEARCH_DEBUG) {
    return;
  }

  console.debug("[recipient-search]", event, detail);
}

export function useRecipientSearch(limit = 50, enabled = true) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<RecipientOption[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const mountedRef = useRef(true);
  const requestSeqRef = useRef(0);

  useEffect(() => {
    // In React Strict Mode (dev), effects run setup/cleanup twice.
    // Always re-arm mountedRef on setup so async state updates are not blocked forever.
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (!enabled) {
      logRecipientSearch("disabled", { query, limit });
      setIsLoading(false);
      return;
    }

    const normalizedQuery = query.trim().toLowerCase();
    const effectiveQuery = normalizedQuery;
    const cacheKey = `${limit}:${effectiveQuery || "__suggested__"}`;
    const requestSeq = requestSeqRef.current + 1;
    requestSeqRef.current = requestSeq;

    const cached = recipientCache.get(cacheKey);
    if (cached) {
      logRecipientSearch("cache-hit", {
        requestSeq,
        query: effectiveQuery,
        limit,
        size: cached.length,
      });
      setResults(cached);
      setIsLoading(false);
      return;
    }

    let cancelled = false;
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      logRecipientSearch("fetch-start", {
        requestSeq,
        query: effectiveQuery,
        limit,
      });
      setIsLoading(true);
      let timeoutId: number | null = null;
      let safetyStopId: number | null = null;
      try {
        const params = new URLSearchParams({
          search: effectiveQuery,
          limit: String(limit),
        });

        timeoutId = window.setTimeout(() => {
          controller.abort();
        }, REQUEST_TIMEOUT_MS);

        // Safety valve: if fetch hangs unexpectedly, never keep spinner forever.
        safetyStopId = window.setTimeout(() => {
          if (!cancelled && mountedRef.current) {
            setIsLoading(false);
          }
          controller.abort();
        }, SAFETY_LOADING_TIMEOUT_MS);

        const res = await fetch(`/api/contacts/recipients?${params.toString()}`, {
          signal: controller.signal,
        });

        window.clearTimeout(timeoutId);
        timeoutId = null;

        const payload = await res.json();
        const nextResults = !res.ok || !payload.success
          ? []
          : ((payload.data ?? []) as RecipientOption[]);

        if (!cancelled && mountedRef.current && requestSeqRef.current === requestSeq) {
          recipientCache.set(cacheKey, nextResults);
          setResults(nextResults);
          logRecipientSearch("fetch-success", {
            requestSeq,
            query: effectiveQuery,
            size: nextResults.length,
            status: res.status,
          });
        }
      } catch (error) {
        if (!cancelled && mountedRef.current && requestSeqRef.current === requestSeq && (error as Error).name !== "AbortError") {
          setResults([]);
        }

        logRecipientSearch("fetch-error", {
          requestSeq,
          query: effectiveQuery,
          error: (error as Error).name,
          message: (error as Error).message,
        });
      } finally {
        if (timeoutId !== null) {
          window.clearTimeout(timeoutId);
        }
        if (safetyStopId !== null) {
          window.clearTimeout(safetyStopId);
        }

        if (mountedRef.current && requestSeqRef.current === requestSeq) {
          setIsLoading(false);
        }

        logRecipientSearch("fetch-finish", {
          requestSeq,
          query: effectiveQuery,
          cancelled,
          stillLatest: requestSeqRef.current === requestSeq,
        });
      }
    }, effectiveQuery ? 220 : 0);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
      controller.abort();

      if (mountedRef.current && requestSeqRef.current === requestSeq) {
        setIsLoading(false);
      }

      logRecipientSearch("cleanup", {
        requestSeq,
        query: effectiveQuery,
      });
    };
  }, [query, limit, enabled]);

  return {
    query,
    setQuery,
    results,
    isLoading,
  };
}
