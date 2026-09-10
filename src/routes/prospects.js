import { Router } from 'express';
import { loadStore, saveStore, nowISO, withStoreLock } from '../lib/store.js';
import { normalizeUrl } from '../lib/normalize.js';
import { runAudit } from '../lib/pagespeed.js';

const router = Router();

export const STATUSES = ['a contacter', 'contacte', 'relance', 'devis envoye', 'pas interesse', 'a relancer', 'client'];
const MAX_AUDITS = 12;

const AUDIT_STRING_FIELDS = ['url', 'pitch', 'impact', 'device'];
const AUDIT_SCORE_FIELDS = ['performance', 'seo', 'accessibility', 'bestPractices'];

function capStr(v, max) {
  if (v == null) return null;
  return String(v).slice(0, max);
}

function sanitizeAudit(audit) {
  const out = {};
  if (!audit || typeof audit !== 'object') return out;
  for (const f of AUDIT_STRING_FIELDS) {
    const v = audit[f];
    if (typeof v === 'string') out[f] = capStr(v, 2000);
    else if (f === 'url' && typeof v === 'string') out[f] = capStr(v, 2000);
  }
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
      if (typeof v === 'string') vitals[k] = capStr(v, 40);
    }
  }
  if (Object.keys(vitals).length) out.vitals = vitals;
  return out;
}

function toSummary(p) {
  const last = p.audits.length ? p.audits[p.audits.length - 1] : null;
  return {
    id: p.id,
    url: p.url,
    name: p.name,
    contact: p.contact,
    status: p.status,
    notes: p.notes || null,
    nextContact: p.nextContact || null,
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
    score: last ? last.scores.performance : null,
    auditCount: p.audits.length,
    lastAuditDate: last ? last.date : null,
    categorie: p.categorie || null,
    ville: p.ville || null,
    source: p.source || 'manual',
  };
}

function findProspect(store, id) {
  return store.prospects.find((p) => p.id === id);
}

function saveAuditOn(p, audit, stamp) {
  p.audits.push({ id: crypto.randomUUID(), date: stamp, ...audit });
  if (p.audits.length > MAX_AUDITS) p.audits = p.audits.slice(-MAX_AUDITS);
  p.updatedAt = stamp;
}

router.get('/', async (_req, res, next) => {
  try {
    const store = await loadStore();
    const list = store.prospects
      .map(toSummary)
      .sort((a, b) => (a.score ?? 999) - (b.score ?? 999));
    res.json(list);
  } catch (err) { next(err); }
});

router.get('/:id', async (req, res, next) => {
  try {
    const store = await loadStore();
    const p = findProspect(store, req.params.id);
    if (!p) return res.status(404).json({ error: 'Prospect introuvable' });
    res.json(p);
  } catch (err) { next(err); }
});

router.post('/', async (req, res, next) => {
  try {
    const { url, name, contact, audit, notes, nextContact, categorie, ville, source, place_id } = req.body || {};
    const normUrl = normalizeUrl(url);
    if (!normUrl) return res.status(400).json({ error: 'URL invalide ou manquante' });
    if (!audit) return res.status(400).json({ error: 'Audit manquant' });

    const stamp = nowISO();
    const prospect = {
      id: crypto.randomUUID(),
      url: normUrl,
      name: capStr(name, 200) || null,
      contact: capStr(contact, 200) || null,
      status: 'a contacter',
      notes: capStr(notes, 4000) || null,
      nextContact: validDate(nextContact),
      categorie: capStr(categorie, 100) || null,
      ville: capStr(ville, 100) || null,
      source: capStr(source, 50) || 'manual',
      place_id: capStr(place_id, 200) || null,
      createdAt: stamp,
      updatedAt: stamp,
      audits: [{ id: crypto.randomUUID(), date: stamp, ...sanitizeAudit(audit) }]
    };

    const result = await withStoreLock(async () => {
      const store = await loadStore();
      store.prospects.push(prospect);
      await saveStore(store);
      return toSummary(prospect);
    });
    res.status(201).json(result);
  } catch (err) { next(err); }
});

function validDate(v) {
  if (typeof v !== 'string' || !v) return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

router.patch('/:id', async (req, res, next) => {
  try {
    const { status, notes, nextContact } = req.body || {};
    if (!status && notes === undefined && nextContact === undefined) {
      return res.status(400).json({ error: 'Aucun champ à mettre à jour' });
    }
    if (status && !STATUSES.includes(status)) {
      return res.status(400).json({ error: `Statut invalide. Valeurs: ${STATUSES.join(', ')}` });
    }
    const result = await withStoreLock(async () => {
      const store = await loadStore();
      const p = findProspect(store, req.params.id);
      if (!p) return null;
      if (status) p.status = status;
      if (notes !== undefined) p.notes = capStr(notes, 4000) || null;
      if (nextContact !== undefined) p.nextContact = validDate(nextContact);
      p.updatedAt = nowISO();
      await saveStore(store);
      return toSummary(p);
    });
    if (!result) return res.status(404).json({ error: 'Prospect introuvable' });
    res.json(result);
  } catch (err) { next(err); }
});

router.post('/:id/audit', async (req, res, next) => {
  try {
    const apiKey = process.env.PAGESPEED_API_KEY;
    if (!apiKey || apiKey === 'AIza...remplacer-par-ta-cle') {
      return res.status(500).json({ error: 'PAGESPEED_API_KEY non configure dans .env' });
    }
    const { id } = req.params;
    const result = await withStoreLock(async () => {
      const store = await loadStore();
      const p = findProspect(store, id);
      if (!p) return null;
      const audit = await runAudit(p.url, apiKey);
      const stamp = nowISO();
      saveAuditOn(p, audit, stamp);
      await saveStore(store);
      return { prospect: toSummary(p), audit: { id: p.audits[p.audits.length - 1].id, date: stamp, ...audit } };
    });
    if (!result) return res.status(404).json({ error: 'Prospect introuvable' });
    res.status(201).json(result);
  } catch (err) {
    if (err.code === 'API_ERROR' || err.code === 'BAD_URL') return res.status(502).json({ error: err.message });
    next(err);
  }
});

export default router;
