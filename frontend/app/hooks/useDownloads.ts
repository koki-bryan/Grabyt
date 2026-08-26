import { useState, useEffect, useCallback, useRef } from "react";
import type { Download, CreateDownloadRequest } from "~/types/download";
import { createDownload, getDownloads } from "~/services/api";

export function useDownloads() {
  const [downloads, setDownloads] = useState<Download[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mountedRef = useRef(false);

  // Fetch downloads on mount (browser only)
  useEffect(() => {
    if (typeof window === "undefined") return;
    mountedRef.current = true;

    async function fetchInitial() {
      try {
        const data = await getDownloads();
        if (mountedRef.current) {
          setDownloads(data);
        }
      } catch (err) {
        if (mountedRef.current) {
          setError(
            err instanceof Error ? err.message : "Failed to load downloads"
          );
        }
      } finally {
        if (mountedRef.current) {
          setIsLoading(false);
        }
      }
    }

    fetchInitial();

    return () => {
      mountedRef.current = false;
    };
  }, []);

  // Poll when any download is in a non-terminal state
  useEffect(() => {
    if (typeof window === "undefined") return;

    const hasActive = downloads.some(
      (d) => d.status === "queued" || d.status === "downloading"
    );

    if (!hasActive) return;

    const interval = setInterval(async () => {
      try {
        const data = await getDownloads();
        if (mountedRef.current) {
          setDownloads(data);
        }
      } catch {
        // Silently ignore polling errors to avoid UI noise
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [downloads]);

  const submitDownload = useCallback(
    async (req: CreateDownloadRequest) => {
      setIsSubmitting(true);
      setError(null);
      try {
        const newDownload = await createDownload(req);
        setDownloads((prev) => [newDownload, ...prev]);
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to create download";
        setError(message);
        throw err;
      } finally {
        setIsSubmitting(false);
      }
    },
    []
  );

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    downloads,
    isLoading,
    isSubmitting,
    error,
    submitDownload,
    clearError,
  };
}
