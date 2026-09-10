import { Router } from 'express';
import { searchPlaces } from '../lib/places.js';
import { runAudit } from '../lib/pagespeed.js';
import { loadStore, saveStore, nowISO, withStoreLock } from '../lib/store.js';
import { normalizeUrl } from '../lib/normalize.js';

const router = Router();

function capStr(v, max) {
  if (v == null) return null;
  return String(v).slice(0, max);
}

const auditQueues = new Map();
const QUEUE_TTL = 30 * 60 * 1000;

function generateQueueId() {
  return crypto.randomUUID().slice(0, 12);
}

function tagResult(place) {
  if (!place.websiteUri) {
    return { ...place, tag: 'no-site', priority: 1 };
  }
  return { ...place, tag: 'to-audit', priority: 2 };
}

async function processAuditQueue(queueId, places, apiKey) {
  const queue = auditQueues.get(queueId);
  if (!queue) return;

  for (let i = 0; i < places.length; i++) {
    const place = places[i];
    if (place.tag !== 'to-audit' || !place.websiteUri) continue;

    try {
      const audit = await runAudit(place.websiteUri, apiKey);
      queue.results[i] = { ...queue.results[i], audit, status: 'done' };
    } catch {
      queue.results[i] = { ...queue.results[i], audit: null, status: 'error' };
    }
    queue.completed++;

    if (i < places.length - 1) {
      await new Promise((r) => setTimeout(r, 1500));
    }
  }

  queue.done = true;
}

function scheduleCleanup(queueId) {
  setTimeout(() => {
    auditQueues.delete(queueId);
  }, QUEUE_TTL);
}

router.post('/search', async (req, res, next) => {
  try {
    const { categorie, ville } = req.body || {};
    if (!categorie || !ville) {
      return res.status(400).json({ error: 'categorie et ville sont requis' });
    }

    const placesApiKey = process.env.PLACES_API_KEY;
    if (!placesApiKey) {
      return res.status(500).json({
        error: 'PLACES_API_KEY non configure dans .env. Voir README pour la configuration.',
      });
    }

    const places = await searchPlaces({ categorie, ville });
    const results = places.map(tagResult);

    const queueId = generateQueueId();
    const toAudit = results.filter((r) => r.tag === 'to-audit');

    if (toAudit.length > 0) {
      const pagespeedKey = process.env.PAGESPEED_API_KEY;
      if (pagespeedKey && pagespeedKey !== 'AIza...remplacer-par-ta-cle') {
        auditQueues.set(queueId, {
          results,
          total: toAudit.length,
          completed: 0,
          done: false,
        });
        processAuditQueue(queueId, results, pagespeedKey);
        scheduleCleanup(queueId);
      }
    }

    res.json({
      results,
      auditQueueId: toAudit.length > 0 ? queueId : null,
    });
  } catch (err) {
    if (err.code === 'NO_KEY') return res.status(500).json({ error: err.message });
    if (err.code === 'BILLING_DISABLED') return res.status(500).json({ error: err.message });
    if (err.code === 'API_ERROR') return res.status(502).json({ error: err.message });
    next(err);
  }
});

router.get('/audit-progress/:queueId', (req, res) => {
  const queue = auditQueues.get(req.params.queueId);
  if (!queue) {
    return res.status(404).json({ error: 'File d\'attente introuvable ou expiree' });
  }
  res.json({
    total: queue.total,
    completed: queue.completed,
    done: queue.done,
    results: queue.results,
  });
});

router.post('/save', async (req, res, next) => {
  try {
    const { prospects } = req.body || {};
    if (!Array.isArray(prospects) || prospects.length === 0) {
      return res.status(400).json({ error: 'Tableau de prospects requis' });
    }

    const stamp = nowISO();

    const saved = await withStoreLock(async () => {
      const store = await loadStore();
      let count = 0;

      for (const p of prospects) {
        if (!p || typeof p !== 'object') continue;

        const url = normalizeUrl(p.websiteUri || p.url);
        if (!url) continue;

        const existing = store.prospects.find(
          (ep) => ep.url === url || (p.place_id && ep.place_id === p.place_id)
        );
        if (existing) continue;

        const prospect = {
          id: crypto.randomUUID(),
          url,
          name: capStr(p.nom || p.name, 200) || null,
          contact: capStr(p.telephone || p.contact, 200) || null,
          status: 'a contacter',
          notes: null,
          nextContact: null,
          categorie: capStr(p.categorie, 100) || null,
          ville: capStr(p.ville, 100) || null,
          source: 'places',
          place_id: capStr(p.place_id, 200) || null,
          createdAt: stamp,
          updatedAt: stamp,
          audits: [],
        };

        if (p.audit) {
          prospect.audits.push({
            id: crypto.randomUUID(),
            date: stamp,
            ...sanitizeAuditForPlaces(p.audit),
          });
        }

        store.prospects.push(prospect);
        count++;
      }

      await saveStore(store);
      return count;
    });

    res.status(201).json({ saved });
  } catch (err) {
    next(err);
  }
});

const AUDIT_SCORE_FIELDS = ['performance', 'seo', 'accessibility', 'bestPractices'];

function sanitizeAuditForPlaces(audit) {
  if (!audit || typeof audit !== 'object') return {};
  const out = {};

  if (typeof audit.url === 'string') out.url = audit.url.slice(0, 2000);
  if (typeof audit.pitch === 'string') out.pitch = audit.pitch.slice(0, 2000);

  const scores = {};
  if (audit.scores && typeof audit.scores === 'object') {
    for (const f of AUDIT_SCORE_FIELDS) {
      const s = audit.scores[f];
      if (typeof s === 'number' && Number.isFinite(s)) scores[f] = s;
    }
  }
  if (Object.keys(scores).length) out.scores = scores;

  const vitals = {};
  if (audit.vitals && typeof audit.vitals === 'object') {
    for (const [k, v] of Object.entries(audit.vitals)) {
      if (typeof v === 'string') vitals[k] = v.slice(0, 40);
    }
  }
  if (Object.keys(vitals).length) out.vitals = vitals;

  return out;
}

export default router;
