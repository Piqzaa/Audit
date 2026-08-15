const CTA_WORDS = [
  'devis', 'contact', 'appeler', 'appelez', 'appel', 'reserver', 'réserver',
  'rendez-vous', 'commander', 'acheter', 's\'inscrire', 'inscription', 'demander',
  'gratuit', 'profil', 'souscrire', 'selon'
];

const CTA_PATTERNS = [
  /tel:[\d+\s.-]+/i,
  /mailto:/i,
  /wa\.me\/|whatsapp/i
];

const TRUST_WORDS = ['avis', 'témoignage', 'temoignage', 'références', 'references', 'nos clients', 'satisfaits', 'garantie', 'satisfaction'];
const OFFER_WORDS = ['tarif', 'prix', 'devis gratuit', 'nos prestations', 'nos services', 'prestation', 'forfait'];
const SOCIAL_PATTERNS = [/facebook\.com\//i, /instagram\.com\//i, /linkedin\.com\//i, /x\.com\//i, /twitter\.com\//i, /youtube\.com\//i];

export async function analyzeContent(rawUrl) {
  const result = emptyResult();
  let html = '';
  try {
    const res = await fetch(rawUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; AuditExpress/1.0)' },
      redirect: 'follow',
      signal: AbortSignal.timeout(8000)
    });
    if (res.ok) html = await res.text();
  } catch {
    return { ...result, fetchFailed: true };
  }
  if (!html) return { ...result, fetchFailed: true };

  const doc = parse(html);
  result.title = doc.title || null;
  result.lang = doc.lang || null;
  result.hasViewport = doc.hasViewport;
  result.hasFavicon = doc.hasFavicon;
  result.metaDescription = doc.metaDescription || null;
  result.h1Count = doc.h1Count;

  const cta = findCTA(html);
  result.hasCTA = Boolean(cta);
  result.cta = cta;
  result.hasDirectContact = CTA_PATTERNS.some((re) => re.test(html.toLowerCase()));
  result.hasForm = /<\/form>/i.test(html) || /type=["']submit["']/i.test(html);
  result.hasStructuredData = /application\/ld\+json|itemscope|itemtype=/i.test(html);
  result.hasLocalSchema = /"@type"\s*:\s*"(?:LocalBusiness|Organization|Store|Restaurant|AutoRepair|HVACContractor)"/i.test(html);
  result.hasAggregateRating = /"aggregateRating"/i.test(html);
  result.hasSocial = SOCIAL_PATTERNS.some((re) => re.test(html));
  result.hasTrust = foundWords(html, TRUST_WORDS);
  result.hasOffer = foundWords(html, OFFER_WORDS);
  result.ctaAboveFold = isAboveFold(html, cta);
  result.formFieldCount = countFormFields(html);

  result.findings = buildFindings(result);
  const angle = buildConversionAngle(result);
  result.conversionAngle = angle;
  return result;
}

function emptyResult() {
  return {
    fetchFailed: false,
    title: null,
    lang: null,
    hasViewport: null,
    hasFavicon: null,
    metaDescription: null,
    h1Count: null,
    hasCTA: null,
    cta: null,
    hasDirectContact: null,
    hasForm: null,
    hasStructuredData: null,
    hasLocalSchema: null,
    hasAggregateRating: null,
    hasSocial: null,
    hasTrust: null,
    hasOffer: null,
    ctaAboveFold: null,
    formFieldCount: null,
    conversionAngle: null,
    findings: []
  };
}

function parse(html) {
  const title = (html.match(/<title[^>]*>([\s\S]*?)<\/title>/i) || [])[1];
  const lang = (html.match(/<html[^>]*\blang=["']([^"']+)["']/i) || [])[1] || null;
  const metaDesc = (html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']*)["']/i) ||
                    html.match(/<meta[^>]+content=["']([^"']*)["']+[^>]+name=["']description["']/i) || [])[1];
  const h1Matches = (html.match(/<h1[\s>]/gi) || []).length;
  const hasViewport = /name=["']viewport["']/i.test(html);
  const hasFavicon = /rel=["'](?:shortcut[ ]+)?icon["']/i.test(html);
  return {
    title: stripTags(title || '').trim() || null,
    lang,
    metaDescription: stripTags(metaDesc || '').trim() || null,
    h1Count: h1Matches,
    hasViewport,
    hasFavicon
  };
}

function findCTA(html) {
  const lower = html.toLowerCase();
  if (CTA_PATTERNS.some((re) => re.test(lower))) return 'pris de contact direct (tel / mail / WhatsApp)';
  const links = (lower.match(/<a[^>]*>([\s\S]*?)<\/a>/gi) || []);
  for (const link of links) {
    const text = stripTags(link).toLowerCase().trim();
    for (const word of CTA_WORDS) {
      if (text.includes(word)) return `CTA « ${text.slice(0, 40)} »`;
    }
  }
  return null;
}

function stripTags(text) {
  return String(text).replace(/<[^>]*>/g, ' ').replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/gi, ' ').replace(/\s+/g, ' ').trim();
}

function foundWords(html, words) {
  const h = html.toLowerCase();
  return words.some((w) => h.includes(w));
}

function isAboveFold(html, cta) {
  if (!cta) return false;
  const idx = html.toLowerCase().search(/<a[^>]*>/i);
  const ctaIdx = html.toLowerCase().search(/cta/i);
  return idx !== -1 && idx < html.length * 0.35;
}

function countFormFields(html) {
  const forms = (html.match(/<form[\s\S]*?<\/form>/gi) || []);
  return forms.reduce((n, f) => n + (f.match(/<input[^>]*>/gi) || []).length + (f.match(/<textarea[^>]*>/gi) || []).length + (f.match(/<select[^>]*>/gi) || []).length, 0);
}

function buildConversionAngle(r) {
  const missing = [];
  if (!r.hasTrust) missing.push('preuves de confiance (avis, références)');
  if (!r.hasOffer) missing.push('une offre / des tarifs clairs');
  if (r.hasCTA && !r.ctaAboveFold) missing.push('un appel à l\'action visible dès le premier écran');
  if (r.hasForm && r.formFieldCount != null && r.formFieldCount > 5) missing.push('un formulaire allégé (' + r.formFieldCount + ' champs)');
  if (!r.hasSocial) missing.push('une présence réseaux sociaux');
  if (!r.hasLocalSchema) missing.push('un balisage local (Google Business / schema local)');
  if (!missing.length) return 'La structure de conversion et de présence en ligne est globalement en place.';
  return 'Leviers de conversion et de présence identifiés : ' + missing.join(', ') + '.';
}

function buildFindings(r) {
  const f = [];
  if (r.title && r.title.length > 60) {
    f.push({ ok: false, label: 'Titre de page trop long', why: 'Un titre trop long peut être tronqué dans les résultats de recherche.', recommendation: 'Raccourcir le titre autour de 50 à 60 caractères.', detail: `${r.title.length} caractères.` });
  } else if (!r.title) {
    f.push({ ok: false, label: 'Balise de titre absente', why: 'Chaque page doit avoir un titre pour être identifiée dans les recherches.', recommendation: 'Ajouter un titre clair et unique à la page.', detail: 'Non renseigné.' });
  } else {
    f.push({ ok: true, label: 'Titre de page présent', why: null, recommendation: null, detail: `${r.title.length} caractères.` });
  }

  if (!r.metaDescription) {
    f.push({ ok: false, label: 'Description de page absente', why: 'Sans description, le résumé affiché dans les résultats Google est moins pertinents pour un clic.', recommendation: 'Écrire une description de 120 à 160 caractères.', detail: 'Non renseignée.' });
  } else if (r.metaDescription.length < 70 || r.metaDescription.length > 160) {
    f.push({ ok: false, label: 'Description de page mal calibrée', why: 'Une description trop courte ou trop longue est moins efficace dans les résultats de recherche.', recommendation: 'Visé 120 à 160 caractères à valeur argumentative.', detail: `${r.metaDescription.length} caractères.` });
  } else {
    f.push({ ok: true, label: 'Description de page présente', why: null, recommendation: null, detail: `${r.metaDescription.length} caractères.` });
  }

  if (r.h1Count === 0) f.push({ ok: false, label: 'Structure de titre principale absente', why: 'Le titre principal aide Google et les visiteurs à comprendre le sujet de la page.', recommendation: 'Ajouter un titre principal explicite.', detail: 'Aucun titre principal détecté.' });
  else if (r.h1Count > 1) f.push({ ok: false, label: 'Plusieurs titres principaux', why: 'Une hiérarchie trop éparpillée rend le message moins clair.', recommendation: 'Reserver un seul titre principal par page.', detail: `${r.h1Count} détectés.` });
  else f.push({ ok: true, label: 'Structure de titre correcte', why: null, recommendation: null, detail: 'Un seul titre principal.' });

  if (!r.hasViewport) f.push({ ok: false, label: 'Adaptation mobile non déclarée', why: 'Sans cela, la page peut mal s’afficher sur smartphone.', recommendation: 'Activer la configuration d’affichage mobile.', detail: 'Non détectée.' });
  else f.push({ ok: true, label: 'Adaptation mobile', why: null, recommendation: null, detail: 'Configuration détectée.' });

  if (!r.hasFavicon) f.push({ ok: false, label: 'Icône du site manquante', why: 'Une icône renforce la crédibilité dans les onglets et favoris.', recommendation: 'Ajouter un favicon.', detail: 'Non détectée.' });
  else f.push({ ok: true, label: 'Icône du site présente', why: null, recommendation: null, detail: 'Détectée.' });

  if (!r.hasCTA) {
    f.push({ ok: false, label: 'Aucun appel à l’action visible', why: 'Sans invitation claire, le visiteur ne sait pas toujours quoi faire après avoir vu le contenu.', recommendation: 'Proposer un bouton devis, contact ou appel bien visible.', detail: 'Non détecté.' });
  } else {
    f.push({ ok: true, label: 'Appel à l’action présent', why: null, recommendation: null, detail: r.cta });
  }

  if (r.hasForm) {
    f.push({ ok: true, label: 'Formulaire de contact', why: null, recommendation: null, detail: 'Détecté.' });
  } else if (r.hasDirectContact) {
    f.push({ ok: true, label: 'Moyen de contact direct présent', why: null, recommendation: null, detail: r.cta });
  } else {
    f.push({ ok: false, label: 'Pas de formulaire de contact', why: 'Un formulaire facilite la prise de contact depuis les pages commerciales.', recommendation: 'Ajouter un formulaire simple sur une page dédiée.', detail: 'Non détecté.' });
  }

  if (!r.hasStructuredData) {
    f.push({ ok: false, label: 'Données structurées absentes', why: 'Ces données aident Google à afficher des informations utiles (horaires, avis, coordonnées).', recommendation: 'Ajouter un balisage JSON-LD (entreprise, avis, horaires).', detail: 'Non détectées.' });
  } else {
    f.push({ ok: true, label: 'Données structurées', why: null, recommendation: null, detail: 'JSON-LD / schema détecté.' });
  }

  if (!r.hasLocalSchema) {
    f.push({ ok: false, label: 'Balisage local absent (fiche d\'entreprise)', why: 'Un balisage local aide Google à comprendre localisation et horaires, bénéfique pour la recherche locale.', recommendation: 'Ajouter un schema LocalBusiness / Organization.', detail: 'Non détecté.' });
  } else if (!r.hasAggregateRating) {
    f.push({ ok: false, label: 'Balisage local présent, sans avis', why: 'L\'affichage d\'avis étoilés en recherche renforce la confiance et le clic.', recommendation: 'Ajouter des avis structurés (aggregateRating).', detail: 'Schema local sans avis.' });
  } else {
    f.push({ ok: true, label: 'Présence locale & avis', why: null, recommendation: null, detail: 'Schema local + avis détectés.' });
  }

  if (!r.hasSocial) {
    f.push({ ok: false, label: 'Aucune présence réseaux sociaux détectée', why: 'Les réseaux sociaux renforcent la visibilité et la confiance, mais aussi l\'image de marque.', recommendation: 'Ajouter des liens vers Facebook / Instagram / LinkedIn.', detail: 'Mobile détecté.' });
  } else {
    f.push({ ok: true, label: 'Présence réseaux sociaux', why: null, recommendation: null, detail: 'Liens sociaux détectés.' });
  }

  if (!r.hasTrust) {
    f.push({ ok: false, label: 'Peu d\'éléments de confiance', why: 'Avis clients, références ou garanties rassurent et font beaucoup pour la décision d\'achat.', recommendation: 'Mettre en avant avis, références et garanties.', detail: 'Non détectés.' });
  } else {
    f.push({ ok: true, label: 'Éléments de confiance', why: null, recommendation: null, detail: 'Avis / références / garanties détectés.' });
  }

  if (!r.hasOffer) {
    f.push({ ok: false, label: 'Offre ou grille tarifaire peu visible', why: 'Un visiteur a besoin de comprendre l\'offre et l\'ordre de prix pour passer à l\'action.', recommendation: 'Présenter clairement l\'offre et les tarifs.', detail: 'Non détectés.' });
  } else {
    f.push({ ok: true, label: 'Offre / tarifs présents', why: null, recommendation: null, detail: 'Détectés.' });
  }

  if (r.hasCTA) {
    f.push(r.ctaAboveFold
      ? { ok: true, label: 'Appel à l\'action visible dès le premier écran', why: null, recommendation: null, detail: r.cta }
      : { ok: false, label: 'Appel à l\'action en dessous du premier écran', why: 'Un CTA visible dès le début capte le visiteur avant qu\'il ne parte.', recommendation: 'Rapprocher le CTA du haut de page.', detail: r.cta });
  }

  if (r.hasForm && r.formFieldCount != null && r.formFieldCount > 5) {
    f.push({ ok: false, label: 'Formulaire long (' + r.formFieldCount + ' champs)', why: 'Trop de champs augmentent la friction et font abandonner.', recommendation: 'Réduire le nombre de champs demandés.', detail: r.formFieldCount + ' champs détectés.' });
  }

  return f;
}