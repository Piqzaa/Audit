const API_BASE = 'https://places.googleapis.com/v1/places:searchText';
const FIELDS = [
  'places.displayName',
  'places.formattedAddress',
  'places.nationalPhoneNumber',
  'places.websiteUri',
  'places.id',
  'places.rating',
  'places.userRatingCount',
  'nextPageToken',
].join(',');

const MAX_PAGES = 3;
const PAGE_SIZE = 20;

function normalizePlace(place) {
  return {
    nom: place.displayName?.text || null,
    adresse: place.formattedAddress || null,
    telephone: place.nationalPhoneNumber || null,
    websiteUri: place.websiteUri || null,
    place_id: place.id || null,
    rating: place.rating ?? null,
    userRatingCount: place.userRatingCount ?? 0,
  };
}

async function fetchPage(apiKey, textQuery, pageToken) {
  const body = { textQuery, maxResultCount: PAGE_SIZE };
  if (pageToken) body.pageToken = pageToken;

  const res = await fetch(API_BASE, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': apiKey,
      'X-Goog-FieldMask': FIELDS,
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(30000),
  });

  if (!res.ok) {
    let msg = `Erreur HTTP ${res.status}`;
    try {
      const errData = await res.json();
      if (errData?.error?.message) msg = errData.error.message;
      if (errData?.error?.status === 'BILLING_DISABLED') {
        const billingErr = new Error(
          'La facturation Google Cloud n\'est pas activée. ' +
          'Activez la facturation dans Google Cloud Console pour utiliser l\'API Places.'
        );
        billingErr.code = 'BILLING_DISABLED';
        throw billingErr;
      }
    } catch (e) {
      if (e.code === 'BILLING_DISABLED') throw e;
    }
    const err = new Error(msg);
    err.code = 'API_ERROR';
    err.status = res.status;
    throw err;
  }

  return res.json();
}

export async function searchPlaces({ categorie, ville }) {
  const apiKey = process.env.PLACES_API_KEY;
  if (!apiKey) {
    const err = new Error(
      'PLACES_API_KEY manquant dans .env. ' +
      'Veuillez configurer une clé API Google Places (voir README).'
    );
    err.code = 'NO_KEY';
    throw err;
  }

  const textQuery = `${categorie} ${ville}`;
  const allPlaces = [];
  let pageToken = null;

  for (let page = 0; page < MAX_PAGES; page++) {
    const data = await fetchPage(apiKey, textQuery, pageToken);
    const places = data.places || [];
    allPlaces.push(...places);

    pageToken = data.nextPageToken;
    if (!pageToken || places.length === 0) break;

    if (page < MAX_PAGES - 1) {
      await new Promise((r) => setTimeout(r, 200));
    }
  }

  return allPlaces.map(normalizePlace);
}
