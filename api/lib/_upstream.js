/* Bounded transport for dependencies. Retries are opt-in and ONLY for
   read-only operations, including explicitly identified read-only RPCs.
   Never replay a write whose response may have been lost after commit. */
const TRANSIENT = new Set([408, 429, 502, 503, 504]);

export function retryAfterMs(value, now = Date.now()) {
  if (!value) return null;
  const seconds = Number(value);
  if (Number.isFinite(seconds)) return Math.max(0, seconds * 1000);
  const date = Date.parse(value);
  return Number.isFinite(date) ? Math.max(0, date - now) : null;
}

export async function upstreamRequest(url, init = {}, {
  readOnly = false, timeoutMs = 4000, decode = response => response.json(),
} = {}) {
  for (let attempt = 0; ; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    let failure;
    try {
      const response = await fetch(url, { ...init, signal: controller.signal });
      if (response.ok) return await decode(response);
      const text = await response.text();
      let detail;
      try { detail = JSON.parse(text); } catch { /* gateways can return HTML */ }
      const transient = TRANSIENT.has(response.status) || detail?.code === '57014';
      failure = Object.assign(new Error(transient ? 'upstream_temporarily_unavailable' :
        (detail?.message || `upstream_http_${response.status}`)), {
        status: transient ? 503 : response.status === 403 ? 403 : 500,
        upstreamStatus: response.status,
        code: detail?.code || 'upstream_error',
        transient,
        retryAfterMs: retryAfterMs(response.headers?.get?.('retry-after')),
      });
    } catch (error) {
      // Abort covers response-body consumption as well as connection setup.
      failure = Object.assign(new Error('upstream_temporarily_unavailable'), {
        status: 503, code: controller.signal.aborted ? 'upstream_timeout' : 'upstream_network_error',
        transient: true, cause: error,
      });
    } finally {
      clearTimeout(timer);
    }
    // Don't ignore a provider's long Retry-After or sleep through our budget.
    if (!readOnly || attempt >= 1 || !failure.transient || failure.retryAfterMs > 500) throw failure;
    await new Promise(resolve => setTimeout(resolve, failure.retryAfterMs ?? 200));
  }
}

export async function optionalJson(response) {
  const text = await response.text();
  return text ? JSON.parse(text) : null;
}
