import { normalizeUrl, normalizeLighthouse } from './normalize.js';
import { analyzeContent } from './content.js';

const API_BASE = 'https://www.googleapis.com/pagespeedonline/v5/runPagespeed';

function isPublicHost(rawUrl) {
  try {
    const host = new URL(rawUrl).hostname.toLowerCase();
    if (host === 'localhost') return false;
    if (/\.local$/i.test(host)) return false;
    if (/^(?:10|127)\./.test(host)) return false;
    if (/^192\.168\./.test(host)) return false;
    if (/^172\.(1[6-9]|2\d|3[01])\./.test(host)) return false;
    if (/^\[?::1\]?$/.test(host)) return false;
    if (/^\d{1,3}(?:\.\d{1,3}){3}$/.test(host)) return false;
    return true;
  } catch {
    return false;
  }
}

export async function runAudit(rawUrl, apiKey, options = {}) {
  if (!apiKey) {
    const err = new Error('PAGESPEED_API_KEY manquant dans .env');
    err.code = 'NO_KEY';
    throw err;
  }
  const url = normalizeUrl(rawUrl);
  if (!url) {
    const err = new Error('URL invalide');
    err.code = 'BAD_URL';
    throw err;
  }
  if (!isPublicHost(url)) {
    const err = new Error('URL non publique (adresse locale ou privée refusée)');
    err.code = 'BAD_URL';
    throw err;
  }

const params = new URLSearchParams({ url, strategy: options.strategy || 'mobile', locale: 'fr', key: apiKey });
  for (const cat of ['performance', 'seo', 'accessibility', 'best-practices']) {
    params.append('category', cat);
  }

  const endpoint = `${API_BASE}?${params.toString()}`;
  const res = await fetch(endpoint, { signal: AbortSignal.timeout(60000) });
  if (!res.ok) {
    let msg = `Erreur HTTP ${res.status}`;
    try {
      const errData = await res.json();
      if (errData && errData.error && errData.error.message) msg = errData.error.message;
    } catch {}
    const err = new Error(msg);
    err.code = 'API_ERROR';
    err.status = res.status;
    throw err;
  }

const data = await res.json();
  const norm = normalizeLighthouse(data);
  if (!norm) {
    const err = new Error('Reponse PageSpeed inattendue (pas de lighthouseResult)');
    err.code = 'BAD_RESPONSE';
    throw err;
  }
  const content = await analyzeContent(url);
  return { url, ...norm, content };
}

export async function runAuditParallel(urls, apiKey, options = {}) {
  const results = await Promise.allSettled(
    urls.map((u) => runAudit(u, apiKey, options))
  );
  return results.map((r) => (r.status === 'fulfilled' ? r.value : null));
}
