export const RELEVANT_AUDITS = [
  'largest-contentful-paint', 'cumulative-layout-shift', 'total-blocking-time',
  'interactive-to-next-paint', 'speed-index', 'first-contentful-paint',
  'render-blocking-resources', 'unused-css-rules', 'unused-javascript',
  'uses-responsive-images', 'uses-optimized-images', 'viewport',
  'image-alt', 'meta-description', 'document-title', 'color-contrast',
  'tap-targets', 'font-display', 'uses-text-compression', 'server-response-time',
  'link-text', 'crawlable-anchors', 'is-on-https', 'offscreen-images',
  'unminified-css', 'unminified-javascript', 'modern-image-formats', 'uses-http2',
  'canonical', 'robots-txt', 'no-vulnerable-libraries', 'errors-in-console',
  'external-anchors-use-rel-noopener', 'uses-long-cache-ttl', 'uses-passive-event-listeners',
  'dom-size', 'non-composited-animations', 'font-size', 'aria-allowed-attr',
  'html-has-lang', 'button-name', 'link-name', 'meta-viewport', 'content-width',
  'duplicated-javascript', 'efficient-animated-content', 'third-party-facades',
  'password-inputs-can-be-pasted-into', 'deprecations', 'csp-xss'
];

export const VITAL_DEFS = [
  ['largest-contentful-paint', 'lcp'],
  ['cumulative-layout-shift', 'cls'],
  ['total-blocking-time', 'tbt'],
  ['first-contentful-paint', 'fcp'],
  ['interactive-to-next-paint', 'inp']
];

const SCORE_KEYS = [
  ['performance', 'performance'],
  ['seo', 'seo'],
  ['accessibility', 'accessibility'],
  ['best-practices', 'bestPractices']
];

const CATEGORY_KEYS = ['performance', 'seo', 'accessibility', 'best-practices'];

const PRIO_RANK = { 'Élevée': 0, 'Moyenne': 1, 'Faible': 2 };

function fmtKb(bytes) {
  return bytes ? `${Math.round(bytes / 1024)} Ko` : '';
}

function formatSec(ms) {
  return ms >= 1000 ? `${(ms / 1000).toFixed(1)} s` : `${Math.round(ms)} ms`;
}

function fileFigure(a) {
  const items = (a.details && Array.isArray(a.details.items)) ? a.details.items : [];
  if (!items.length) return a.displayValue ? a.displayValue : null;
  const bytes = items.reduce((s, it) => s + (it.wastedBytes || 0), 0);
  return `${items.length} fichier${items.length > 1 ? 's' : ''}${bytes ? ` · ${fmtKb(bytes)} à retirer` : ''}`;
}

function imagesFigure(a) {
  const items = (a.details && Array.isArray(a.details.items)) ? a.details.items : [];
  if (!items.length) return a.displayValue ? a.displayValue : null;
  const waste = items.reduce((s, it) => s + (it.wastedBytes || 0), 0);
  return `${items.length} image${items.length > 1 ? 's' : ''}${waste ? ` · ${fmtKb(waste)} économisables` : ''}`;
}

function countFigure(a, noun) {
  const items = (a.details && Array.isArray(a.details.items)) ? a.details.items : [];
  if (!items.length) return a.displayValue ? a.displayValue : null;
  return `${items.length} ${noun}${items.length > 1 ? 's' : ''}`;
}

const CLIENT_PROBLEMS = {
  'largest-contentful-paint': {
    prio: 'Élevée',
    label: 'Le contenu principal apparaît trop lentement sur mobile',
    impact: 'Sur mobile, l’essentiel de la page se montre trop tard, ce qui peut décourager un visiteur avant même le premier contact.',
    fig: (a) => a.displayValue ? `LCP : ${a.displayValue}` : null
  },
  'first-contentful-paint': {
    prio: 'Élevée',
    label: 'Le premier affichage de la page est lent',
    impact: 'Les premières informations prennent du temps à apparaître, ce qui donne une impression de lenteur dès l’ouverture.',
    fig: (a) => a.displayValue ? `FCP : ${a.displayValue}` : null
  },
  'speed-index': {
    prio: 'Moyenne',
    label: 'L’affichage complet de la page est lent',
    impact: 'La page met du temps à sembler entièrement chargée.',
    fig: (a) => a.displayValue ? `Affichage complet : ${a.displayValue}` : null
  },
  'render-blocking-resources': {
    prio: 'Élevée',
    label: 'Des ressources retardent l’affichage du contenu',
    impact: 'Ces fichiers doivent finir de charger avant que le contenu principal ne s’affiche.',
    fig: (a) => {
      const items = (a.details && Array.isArray(a.details.items)) ? a.details.items : [];
      if (!items.length) return a.displayValue ? `${a.displayValue} concernées` : null;
      const ms = items.reduce((s, it) => s + (it.wastedMs || 0), 0);
      return `${items.length} ressource${items.length > 1 ? 's' : ''}${ms ? ` · ${formatSec(ms)} de retard` : ''}`;
    }
  },
  'unused-javascript': {
    prio: 'Élevée',
    label: 'Des scripts inutiles sont chargés au démarrage',
    impact: 'Réduire les ressources chargées avant l’affichage du contenu principal accélère l’ouverture de la page.',
    fig: fileFigure
  },
  'unused-css-rules': {
    prio: 'Élevée',
    label: 'Des styles inutiles sont chargés',
    impact: 'Alléger ce qui est chargé avant l’affichage accélère la mise en page initiale.',
    fig: fileFigure
  },
  'uses-optimized-images': {
    prio: 'Élevée',
    label: 'Certaines images sont trop lourdes',
    impact: 'Des images plus légères réduiraient nettement le temps de chargement sur mobile.',
    fig: imagesFigure
  },
  'modern-image-formats': {
    prio: 'Moyenne',
    label: 'Certaines images utilisent un format ancien',
    impact: 'Un format d’image plus récent allégerait le chargement sans perte de qualité visible.',
    fig: imagesFigure
  },
  'offscreen-images': {
    prio: 'Moyenne',
    label: 'Des images hors de l’écran initial sont chargées immédiatement',
    impact: 'Les charger seulement au moment de l’affichage accélère l’ouverture de la page.',
    fig: imagesFigure
  },
  'uses-responsive-images': {
    prio: 'Moyenne',
    label: 'Des images trop grandes pour l’écran mobile sont chargées',
    impact: 'Afficher une image adaptée à chaque écran évite de télécharger des données inutiles.',
    fig: imagesFigure
  },
  'uses-text-compression': {
    prio: 'Moyenne',
    label: 'Le contenu texte n’est pas compressé',
    impact: 'Compresser le texte réduit le volume de données à transférer aux visiteurs.',
    fig: fileFigure
  },
  'uses-long-cache-ttl': {
    prio: 'Moyenne',
    label: 'La mémoire de navigation (cache) est peu exploitée',
    impact: 'Les visiteurs qui reviennent rechargent des éléments qu’ils pourraient retrouver en cache, ce qui ralentit leur visite.',
    fig: (a) => countFigure(a, 'ressource')
  },
  'server-response-time': {
    prio: 'Élevée',
    label: 'Le serveur répond lentement',
    impact: 'Ce délai s’ajoute avant le début du chargement et retarde tout le reste.',
    fig: (a) => a.displayValue ? `Temps de réponse : ${a.displayValue}` : null
  },
  'uses-http2': {
    prio: 'Faible',
    label: 'Des optimisations réseau sont manquantes',
    impact: 'Un protocole de transfert plus récent accélérerait le chargement des ressources.',
    fig: null
  },
  'color-contrast': {
    prio: 'Moyenne',
    label: 'Certains textes manquent de contraste',
    impact: 'Des textes trop peu contrastés sont difficiles à lire pour certains visiteurs.',
    fig: (a) => countFigure(a, 'élément')
  },
  'image-alt': {
    prio: 'Faible',
    label: 'Certaines images manquent de description',
    impact: 'Une description favorise la compréhension et un meilleur référencement des images.',
    fig: (a) => countFigure(a, 'image')
  },
  'meta-description': {
    prio: 'Moyenne',
    label: 'Une description de page est absente ou insuffisante',
    impact: 'Cela peut réduire la pertinence du résumé affiché dans les résultats de recherche.',
    fig: null
  },
  'crawlable-anchors': {
    prio: 'Faible',
    label: 'Certains liens ne sont pas exploités efficacement par Google',
    impact: 'Des liens mal exploités peuvent limiter la découverte d’autres pages du site.',
    fig: (a) => countFigure(a, 'lien')
  }
};

export function normalizeUrl(input) {
  if (!input || typeof input !== 'string') return null;
  let url = input.trim();
  if (!url) return null;
  if (!/^https?:\/\//i.test(url)) url = 'https://' + url;
  try {
    new URL(url);
    return url;
  } catch {
    return null;
  }
}

function toInt(score) {
  if (score == null) return null;
  return Math.round(score * 100);
}

function stripMdLinks(text) {
  if (!text) return '';
  return text.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');
}

function buildOpportunity(a) {
  const def = CLIENT_PROBLEMS[a.id];
  if (!def) {
    const label = a.title;
    const figure = a.displayValue || null;
    return { id: a.id, prio: 'Faible', label, title: label, metric: figure, figure, impact: null };
  }
  let figure = null;
  try { figure = def.fig ? def.fig(a) : null; } catch { figure = null; }
  const label = def.label;
  return { id: a.id, prio: def.prio, label, title: label, metric: figure, figure, impact: def.impact };
}

function extractOpportunities(cats, audits) {
  const byId = new Map();
  for (const key of CATEGORY_KEYS) {
    const cat = cats[key];
    if (!cat || !Array.isArray(cat.auditRefs)) continue;
    for (const ref of cat.auditRefs) {
      const a = audits[ref.id];
      if (!a || a.score === null || a.score >= 0.9 || !a.title) continue;
      if (!byId.has(ref.id)) byId.set(ref.id, { weight: ref.weight || 0, op: buildOpportunity(a) });
      else byId.get(ref.id).weight = Math.max(byId.get(ref.id).weight, ref.weight || 0);
    }
  }
  return [...byId.entries()]
    .map(([id, { weight, op }]) => ({ ...op, weight }))
    .sort((x, y) => PRIO_RANK[x.prio] - PRIO_RANK[y.prio] || y.weight - x.weight || (y.figure ? 1 : 0) - (x.figure ? 1 : 0))
    .slice(0, 6)
    .map((op, i) => ({ ...op, index: i + 1 }));
}

const SECTION_AUDITS = {
  performance: [
    'render-blocking-resources', 'unused-javascript', 'unused-css-rules',
    'uses-optimized-images', 'uses-text-compression', 'server-response-time',
    'uses-long-cache-ttl', 'unminified-css', 'unminified-javascript',
    'duplicated-javascript', 'efficient-animated-content', 'uses-http2',
    'offscreen-images', 'modern-image-formats', 'uses-responsive-images'
  ],
  mobile: [
    'viewport', 'meta-viewport', 'content-width', 'font-size',
    'uses-responsive-images', 'uses-optimized-images', 'modern-image-formats',
    'offscreen-images', 'uses-text-compression', 'uses-http2'
  ],
  'seo-technique': [
    'document-title', 'meta-description', 'link-text', 'crawlable-anchors',
    'canonical', 'robots-txt', 'html-has-lang'
  ],
  ux: [
    'tap-targets', 'color-contrast', 'errors-in-console', 'non-composited-animations',
    'dom-size', 'uses-passive-event-listeners', 'font-size', 'uses-http2',
    'render-blocking-resources'
  ],
  accessibilite: [
    'image-alt', 'color-contrast', 'link-name', 'button-name', 'tap-targets',
    'html-has-lang', 'aria-allowed-attr', 'meta-viewport', 'font-size'
  ],
  securite: [
    'is-on-https', 'no-vulnerable-libraries', 'external-anchors-use-rel-noopener',
    'csp-xss', 'deprecations', 'password-inputs-can-be-pasted-into', 'uses-http2'
  ]
};

export const CATEGORY_ORDER = [
  'performance', 'mobile', 'seo-technique', 'ux', 'accessibilite', 'securite'
];

export const CATEGORY_META = {
  performance: { label: 'Performance', desc: 'Vitesse de chargement et réactivité de la page.' },
  mobile: { label: 'Mobile', desc: 'Confort et adaptation de la page sur smartphone.' },
  'seo-technique': { label: 'SEO technique', desc: 'Fondations visibles et indexables par Google.' },
  ux: { label: 'UX', desc: 'Expérience de navigation et de lecture.' },
  accessibilite: { label: 'Accessibilité', desc: 'Lisibilité et utilisation pour tous.' },
  securite: { label: 'Sécurité & Bonnes pratiques', desc: 'Confiance, conformité et fiabilité.' }
};

function sectionIssues(cats, audits, ids) {
  const issues = [];
  const seen = new Set();
  for (const id of ids) {
    if (seen.has(id)) continue;
    seen.add(id);
    const a = audits[id];
    if (!a || a.score === null || a.score >= 0.9 || !a.title) continue;
    const def = CLIENT_PROBLEMS[id];
    let prio = 'Faible';
    let impact = null;
    if (def) {
      prio = def.prio;
      impact = def.impact;
    } else {
      const refs = catRefsFor(cats, id);
      if (refs.length) prio = refs[0].weight >= 3 ? 'Élevée' : refs[0].weight >= 1 ? 'Moyenne' : 'Faible';
    }
    let figure = null;
    try { figure = def && def.fig ? def.fig(a) : null; } catch { figure = null; }
    issues.push({
      id,
      title: def ? def.label : a.title,
      description: stripMdLinks(a.description),
      impact: impact || null,
      figure: figure || a.displayValue || null,
      prio
    });
  }
  return issues.sort((x, y) => PRIO_RANK[x.prio] - PRIO_RANK[y.prio]);
}

function catRefsFor(cats, id) {
  const refs = [];
  for (const key of CATEGORY_KEYS) {
    const cat = cats[key];
    if (!cat || !Array.isArray(cat.auditRefs)) continue;
    const ref = cat.auditRefs.find((r) => r.id === id);
    if (ref) refs.push(ref);
  }
  return refs;
}

function sectionScore(cats, audits, ids) {
  const vals = [];
  for (const id of ids) {
    const a = audits[id];
    if (a && a.score !== null && a.score !== undefined) vals.push(a.score);
  }
  if (!vals.length) return null;
  return Math.round((vals.reduce((s, v) => s + v, 0) / vals.length) * 100);
}

function buildCategorySections(cats, audits) {
  return CATEGORY_ORDER.map((id) => {
    const ids = SECTION_AUDITS[id];
    const issues = sectionIssues(cats, audits, ids);
    return {
      id,
      label: CATEGORY_META[id].label,
      desc: CATEGORY_META[id].desc,
      score: sectionScore(cats, audits, ids),
      issueCount: issues.length,
      issues
    };
  });
}

const MONTHLY_VISITS = 1000;
const CONVERSION_RATE = 0.02;

const FAMILY_MAP = {
  'vitesse-mobile': { id: 'vitesse-mobile', label: 'Vitesse & mobile', color: 'performance', catIds: ['performance', 'mobile'] },
  'visibilite': { id: 'visibilite', label: 'Visibilité Google', color: 'seo', catIds: ['seo-technique'] },
  'confiance': { id: 'confiance', label: 'Expérience & confiance', color: 'trust', catIds: ['ux', 'accessibilite', 'securite'] }
};

function noteFromScore(score) {
  if (score == null) return { note: 'non évalué', color: 'na' };
  if (score >= 85) return { note: 'bon', color: 'good' };
  if (score >= 60) return { note: 'à améliorer', color: 'mid' };
  return { note: 'critique', color: 'bad' };
}

function familyScore(issues) {
  if (!issues.length) return null;
  return Math.round(issues.reduce((s, i) => s + (i.score || 0), 0) / issues.length);
}

function lostLeadsEstimate({ performance, vitals = {} }) {
  const lcpSec = parseFloat(String(vitals.lcp || '').replace(',', '.'));
  let lostRate = 0.05;
  if (!Number.isNaN(lcpSec)) {
    if (lcpSec >= 4) lostRate = 0.4;
    else if (lcpSec >= 2.5) lostRate = 0.2;
    else lostRate = 0.05;
  } else if (performance != null && performance < 50) {
    lostRate = 0.3;
  } else if (performance != null && performance < 80) {
    lostRate = 0.15;
  }
  const estLost = Math.round(MONTHLY_VISITS * CONVERSION_RATE * lostRate);
  return {
    enabled: true,
    monthlyVisits: MONTHLY_VISITS,
    conversionRate: CONVERSION_RATE,
    lostRate,
    estLostPerMonth: estLost
  };
}

function buildBusiness({ scores = {}, categories = [], vitals = {}, content = {} }) {
  const byId = {};
  for (const cat of categories) byId[cat.id] = cat;

  const families = Object.values(FAMILY_MAP).map((fam) => {
    const issues = fam.catIds.flatMap((cid) => {
      const c = byId[cid];
      return (c && c.issues ? c.issues : []).map((i) => ({ ...i, score: c.score }));
    });
    const score = familyScore(issues);
    const note = noteFromScore(score);
    return {
      id: fam.id,
      label: fam.label,
      score,
      note: note.note,
      color: note.color,
      issueCount: issues.length,
      topIssue: issues.sort((a, b) => (a.prio === 'Élevée' ? -1 : a.prio === 'Moyenne' ? 0 : 1))[0] || null
    };
  });

  const worst = families.reduce((a, b) => (b.score != null && (a.score == null || b.score < a.score) ? b : a), { score: null });
  let businessScore = 'faible';
  if (worst.score != null) {
    if (worst.score >= 85 && families.every((f) => f.score == null || f.score >= 75)) businessScore = 'faible';
    else if (worst.score < 60) businessScore = 'eleve';
    else businessScore = 'moyen';
  }
  if (worst.score != null && worst.score < 40) businessScore = 'eleve';

  return {
    families,
    businessScore,
    lostLeads: lostLeadsEstimate({ ...scores, vitals })
  };
}

export function buildSummary({ scores = {}, vitals = {}, categories = [], issues = [], opportunities = [] }) {
  const points = [];
  const v = vitals;
  if (v.lcp) {
    const sec = parseFloat(String(v.lcp).replace(',', '.'));
    if (!Number.isNaN(sec) && sec >= 4) points.push({ severity: 'high', text: `Contenu principal visible après ${v.lcp} (seuil conseillé < 2,5 s)` });
    else if (!Number.isNaN(sec) && sec >= 2.5) points.push({ severity: 'mid', text: `Contenu principal affiché après ${v.lcp} — à surveiller` });
  }
  if (scores.performance != null && scores.performance < 50) points.push({ severity: 'high', text: `Performance mobile faible (${scores.performance}/100)` });
  else if (scores.performance != null && scores.performance < 80) points.push({ severity: 'mid', text: `Performance mobile perfectible (${scores.performance}/100)` });
  if (scores.accessibility != null && scores.accessibility < 80) points.push({ severity: 'mid', text: `Accessibilité à renforcer (${scores.accessibility}/100)` });
  if (scores.seo != null && scores.seo < 80) points.push({ severity: 'mid', text: `SEO technique à améliorer (${scores.seo}/100)` });
  if (scores.bestPractices != null && scores.bestPractices < 80) points.push({ severity: 'mid', text: `Bonnes pratiques / sécurité à fiabiliser (${scores.bestPractices}/100)` });

  for (const cat of categories) {
    if (cat.score != null && cat.score < 70 && !points.some((p) => p.text.includes(cat.label))) {
      points.push({ severity: 'mid', text: `${cat.label} : ${cat.issueCount} point(s) à corriger` });
    }
  }

  const worst = opportunities[0];
  if (worst) points.push({ severity: 'action', text: `Priorité : ${worst.label || worst.title}${worst.figure ? ` (${worst.figure})` : ''}` });

  const topIssue = issues[0];
  if (!points.length) {
    if (topIssue) points.push({ severity: 'mid', text: topIssue.title });
    else points.push({ severity: 'ok', text: 'Aucun frein technique majeur détecté.' });
  }
  return points.slice(0, 6);
}

export function normalizeLighthouse(data) {
  const lh = data && data.lighthouseResult;
  if (!lh || !lh.categories || !lh.audits) return null;

  const cats = lh.categories;
  const audits = lh.audits;

  const scores = {};
  for (const [key, dest] of SCORE_KEYS) {
    scores[dest] = cats[key] ? toInt(cats[key].score) : null;
  }

  const vitals = {};
  for (const [auditId, vitalKey] of VITAL_DEFS) {
    const a = audits[auditId];
    vitals[vitalKey] = a && a.displayValue ? a.displayValue : null;
  }

  const issues = RELEVANT_AUDITS
    .map((id) => audits[id])
    .filter((a) => a && a.score !== null && a.score < 0.9 && a.title)
    .sort((a, b) => a.score - b.score)
    .slice(0, 6)
    .map((a) => ({ title: a.title, description: stripMdLinks(a.description) }));

  const opportunities = extractOpportunities(cats, audits);
  const categories = buildCategorySections(cats, audits);
  const pitch = buildPitch({ ...scores, vitals });
  const impact = buildImpactText({ ...scores, vitals });
  const summary = buildSummary({ scores, vitals, categories, issues, opportunities });
  const business = buildBusiness({ scores, categories, vitals });

  return {
    scores,
    vitals,
    categories,
    business,
    summary,
    issues,
    opportunities,
    pitch,
    impact,
    device: lh.configSettings && lh.configSettings.formFactor ? lh.configSettings.formFactor : 'mobile'
  };
}

export function buildPitch({ performance, seo, accessibility, bestPractices, vitals = {} }) {
  const perf = performance != null ? performance : null;
  const seoS = seo != null ? seo : null;
  const acc = accessibility != null ? accessibility : null;
  const lcp = vitals.lcp || null;

  if (perf !== null && perf < 50) {
    return `Ce site charge lentement sur mobile : score de performance à ${perf}/100${lcp ? `, contenu principal visible après ${lcp}` : ''}. Chaque seconde de plus fait fuir des visiteurs avant le premier contact — du chiffre d'affaires perdu chaque jour. Optimiser le poids des images et la gestion du cache est la priorité.`;
  }
  if (perf !== null && perf < 80) {
    return `Le site est correct mais perd des points sur mobile (performance ${perf}/100${lcp ? `, LCP ${lcp}` : ''}). Google en tient compte dans le classement. Quelques optimisations ciblées (images, cache, JS inutilisé) peuvent le faire monter rapidement.`;
  }
  if (seoS !== null && seoS < 80) {
    return `Le référencement a des lacunes (SEO ${seoS}/100) : le site est probablement moins bien classé que ses concurrents sur Google. Hors optimisation technique et balisage, il manque surtout une vraie stratégie de mots-clés et de contenus pour attirer des demandes.`;
  }
  if (acc !== null && acc < 80) {
    return `Le site présente des problèmes d'accessibilité (${acc}/100), ce qui exclut certains visiteurs et peut peser sur le référencement. Les corriger améliore l'image de l'entreprise et la portée.`;
  }
  if (bestPractices !== null && bestPractices < 90) {
    return `Sur le fond, le site est sain (bonnes pratiques ${bestPractices}/100), mais quelques conformités (HTTPS, headers, APIs dépréciées) restent à fiabiliser pour asseoir la confiance et le référencement.`;
  }
  if (perf !== null && perf < 90) {
    return `Le site est globalement bon (performance ${perf}/100) mais pas optimal. L'angle le plus rentable n'est plus la technique : c'est le contenu, la conversion et le design qui feront la différence face aux concurrents.`;
  }
  return `Techniquement, ce site est sain (performance ${perf != null ? `${perf}/100` : 'n.d.'}, SEO ${seoS != null ? `${seoS}/100` : 'n.d.'}). La vraie marge se situe sur le contenu, la conversion et le design : améliorer l'accroche, les appels à l'action et l'expérience mobile pour transformer plus de visiteurs en clients.`;
}

export function buildImpactText({ performance, seo, accessibility, vitals = {} }) {
  const lcp = vitals.lcp || null;
  if (performance != null && performance < 80) {
    return `Le principal frein identifié concerne les performances sur mobile (${performance}/100${lcp ? `, contenu principal visible après ${lcp}` : ''}). Réduire les ressources chargées avant l’affichage du contenu principal pourrait améliorer le temps d’affichage initial.`;
  }
  if (performance != null && performance < 90) {
    return `La performance mobile reste un levier (${performance}/100), même si le site est correct. Une optimisation ciblée des éléments les plus lourds peut améliorer l’affichage initial.`;
  }
  if (seo != null && seo < 80) {
    return `Le principal frein identifié concerne le référencement (SEO ${seo}/100). Certaines pages du site sont peut-être moins bien visibles que celles des concurrents sur les recherches locales.`;
  }
  if (accessibility != null && accessibility < 80) {
    return `Des points d’accessibilité (${accessibility}/100) sont à corriger pour que le site reste lisible et navigable par tous les visiteurs.`;
  }
  return `Aucun frein technique majeur n’a été relevé pendant l’audit. Les différences se joueront surtout sur le contenu, la conversion et l’expérience mobile.`;
}