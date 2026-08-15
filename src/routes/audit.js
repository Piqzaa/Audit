import { Router } from 'express';
import { runAudit, runAuditParallel } from '../lib/pagespeed.js';

const router = Router();

function buildCompare(mine, theirs) {
  const metrics = [
    { key: 'performance', label: 'Performance mobile' },
    { key: 'seo', label: 'SEO' },
    { key: 'accessibility', label: 'Accessibilité' },
    { key: 'bestPractices', label: 'Bonnes pratiques' }
  ];
  const rows = metrics.map(({ key, label }) => {
    const a = mine.scores[key];
    const b = theirs.scores[key];
    let winner = 'equal';
    if (a != null && b != null && a !== b) winner = a > b ? 'mine' : 'theirs';
    return { label, mine: a, theirs: b, winner };
  });
  rows.push({
    label: 'LCP (contenu principal)',
    mine: mine.vitals.lcp,
    theirs: theirs.vitals.lcp,
    winner: 'na'
  });
  return {
    competitorUrl: theirs.url,
    rows,
    summary: (mine.scores.performance ?? 0) >= (theirs.scores.performance ?? 0)
      ? 'Votre site est au niveau, voire meilleur, sur les critères mesurés.'
      : 'Le concurrent obtient un meilleur score de performance — un point d\'appui pour vous différencier.'
  };
}

router.post('/', async (req, res, next) => {
  try {
    const { url, competitor } = req.body || {};
    if (!url) return res.status(400).json({ error: 'URL manquante' });
    const apiKey = process.env.PAGESPEED_API_KEY;
    if (!apiKey || apiKey === 'AIza...remplacer-par-ta-cle') {
      return res.status(500).json({ error: 'PAGESPEED_API_KEY non configure dans .env' });
    }
    if (competitor) {
      const results = await runAuditParallel([url, competitor], apiKey);
      const mine = results[0];
      const theirs = results[1];
      if (!mine) {
        const err = new Error('Échec de l\'audit du site principal');
        err.code = 'API_ERROR';
        throw err;
      }
      res.json({ ...mine, compare: theirs ? buildCompare(mine, theirs) : null });
    } else {
      const result = await runAudit(url, apiKey);
      res.json(result);
    }
  } catch (err) {
    if (err.code === 'BAD_URL') return res.status(400).json({ error: err.message });
    if (err.code === 'API_ERROR') return res.status(502).json({ error: err.message });
    next(err);
  }
});

export default router;
