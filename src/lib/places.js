const API_BASE = 'https://places.googleapis.com/v1/places:searchText';
const FIELDS = [
  'places.displayName',
  'places.formattedAddress',
  'places.nationalPhoneNumber',
  'places.websiteUri',
  'places.id',
  'places.rating',
  'places.userRatingCount',
].join(',');

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

  const textQuery = `${categorie} à ${ville}`;

  const res = await fetch(API_BASE, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': apiKey,
      'X-Goog-FieldMask': FIELDS,
    },
    body: JSON.stringify({
      textQuery,
      maxResultCount: 20,
    }),
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

  const data = await res.json();
  const places = data.places || [];
  return places.map(normalizePlace);
}
