# Audit Express — AlexBuild

Outil local de prospection : audite rapidement un site (performance, SEO, accessibilité, bonnes pratiques), génère un angle d'approche commercial, et garde la trace des prospects contactés/relancés.

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
- `src/lib/pagespeed.js` — appel + normalisation PageSpeed
- `src/lib/normalize.js` — extraction scores/vitals/issues/pitch
- `src/lib/store.js` — lecture/écriture atomique de `data.json`
- `public/` — frontend vanilla (index.html, styles.css, app.js, report.js)
- `data.json` — données (créé automatiquement, ne pas committer)
