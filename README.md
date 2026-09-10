# Audit Express — AlexBuild

Outil local de prospection : audite rapidement un site (performance, SEO, accessibilité, bonnes pratiques), génère un angle d'approche commercial, et garde la trace des prospects contactés/relancés.

**Nouveauté** : Recherche de prospects en masse via l'API Google Places.

Usage strictement local, mono-utilisateur, sans base de données (un simple `data.json`).

## Prérequis

- Node.js ≥ 18 (fetch natif)

## Installation

1. Cloner / placer le dossier.
2. Installer les dépendances :
   ```
   npm install
   ```
3. Créer le fichier `.env` à la racine (copie de `.env.example`) et y mettre ta clé API :
   ```
   PAGESPEED_API_KEY=AIza...
   ```

## Obtenir une clé API PageSpeed Insights (gratuite)

1. Va sur https://console.cloud.google.com
2. Crée un projet (ou sélectionne le tien).
3. Menu : **APIs & Services → Enable APIs and Services** → recherche **PageSpeed Insights API** → **Enable**.
4. Menu : **APIs & Services → Credentials → Create Credentials → API key**.
5. Copie la clé dans `.env`. La clé reste côté serveur, jamais exposée au navigateur.

## Recherche de prospects en masse (optionnel)

La fonctionnalité de recherche utilise l'**API Google Places (New)** pour trouver automatiquement des commerces et artisans locaux.

### Prérequis

- **Clé API Google Places** (en plus de la clé PageSpeed)
- **Facturation activée** sur le projet Google Cloud (requis même pour le free tier)

### Obtenir une clé API Places

1. Va sur https://console.cloud.google.com
2. Sélectionne ou crée un projet.
3. Menu : **APIs & Services → Enable APIs and Services** → recherche **Places API (New)** → **Enable**.
4. **Important** : active la facturation (**Billing**) dans le projet.
5. Menu : **APIs & Services → Credentials → Create Credentials → API key**.
6. (Recommandé) Restreint la clé aux seules APIs **PageSpeed Insights API** et **Places API (New)**.
7. Ajoute la clé dans ton fichier `.env` :
   ```
   PLACES_API_KEY=AIza...
   ```

### Utilisation

1. Onglet **Recherche** dans l'interface.
2. Sélectionne une catégorie de métier (plombier, électricien, etc.).
3. Entrez une ville.
4. Clique sur **Rechercher**.
5. Les commerces trouvés sont classés en 3 groupes :
   - **Pas de site** (priorité maximale)
   - **Site à mauvais score** (à contacter en priorité)
   - **Site correct** (moins prioritaire)
6. Les sites avec une URL sont automatiquement auditées via PageSpeed.
7. Sélectionne les prospects à sauvegarder.
8. Clique sur **Ajouter la sélection aux prospects**.

### Coût

- Free tier : ~1000 recherches/mois incluses
- Coût supplémentaire : ~$0.032 par recherche au-delà du free tier

## Lancer

```
npm start
```

Ouvre http://localhost:3000

## Usage

- **Nouvel audit** : colle une URL, clique « Lancer l'audit », puis « Enregistrer dans mes prospects ».
- **Historique** : liste des prospects, triés par score croissant (les pires en premier). Clique sur une ligne pour voir l'historique des audits, changer le statut, ou relancer un audit.
- Statuts : À contacter / Contacté / Relancé / Pas intéressé / Client.

## Fichiers

- `server.js` — point d'entrée Express + fichiers statiques
- `src/routes/audit.js` — proxy API PageSpeed
- `src/routes/prospects.js` — CRUD prospects + re-audit
- `src/routes/prospecting.js` — recherche de prospects via Google Places
- `src/lib/pagespeed.js` — appel + normalisation PageSpeed
- `src/lib/places.js` — appel API Google Places (New)
- `src/lib/normalize.js` — extraction scores/vitals/issues/pitch
- `src/lib/store.js` — lecture/écriture atomique de `data.json`
- `public/` — frontend vanilla (index.html, styles.css, app.js, report.js)
- `data.json` — données (créé automatiquement, ne pas committer)
