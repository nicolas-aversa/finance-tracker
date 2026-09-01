/**
 * fetch() with a hard timeout. A stalling upstream (Yahoo, data912, dolarapi)
 * must never hang a whole page render — better to fail fast so the orchestrator's
 * Promise.allSettled records a warning and moves on.
 */
export async function fetchWithTimeout(
  url: string,
  init: RequestInit = {},
  timeoutMs = 6000
): Promise<Response> {
  return fetch(url, { ...init, signal: AbortSignal.timeout(timeoutMs) });
}
