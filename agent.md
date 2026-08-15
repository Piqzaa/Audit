# Agent.md — Outil d'audit prospection (AlexBuild)

## Contexte

Freelance dev web (AlexBuild). Besoin d'un outil perso, en local, pour :
1. Auditer rapidement un site de prospect (performance, SEO, accessibilité)
2. Garder une trace de qui a été audité / contacté / relancé, pour piloter la prospection

Usage strictement local, un seul utilisateur, pas de déploiement, pas d'auth.

## Stack imposée (rester simple)

- Node.js + Express pour le serveur local
- Vanilla JS / HTML / CSS pour le frontend (pas de framework, pas de build step)
- Stockage : un simple fichier `data.json` sur disque (pas de base de données)
- Clé API PageSpeed Insights dans un fichier `.env` (jamais exposée au navigateur)
- Lancement via `npm start`, tourne sur `http://localhost:3000`

## Fonctionnalités

### 1. Nouvel audit
- Formulaire : URL du site + nom du prospect (facultatif) + contact (facultatif, email ou tél)
- Le serveur appelle l'API PageSpeed Insights côté back (jamais côté front, pour cacher la clé)
- Affiche : scores (performance / SEO / accessibilité / bonnes pratiques), Core Web Vitals (LCP, CLS, TBT, FCP), liste des 5-6 problèmes les plus impactants, un paragraphe "angle d'approche" généré selon le score le plus faible (réutiliser la logique déjà écrite dans le prototype HTML fourni en pièce jointe)
- Bouton "enregistrer dans mes prospects" qui sauvegarde l'audit dans `data.json` avec statut initial "à contacter"

### 2. Historique / suivi
- Liste de tous les prospects audités : nom, URL, score global, statut, date du dernier audit
- Statuts possibles : à contacter / contacté / relancé / pas intéressé / client
- Un clic sur une ligne change le statut (menu déroulant simple)
- Possibilité de relancer un audit sur une URL déjà présente (garde l'historique des scores dans le temps, utile pour montrer une progression si le prospect devient client)
- Tri par score (les pires scores en premier = les meilleurs prospects à approcher)

### 3. Export
- Bouton pour copier le résumé d'un audit (texte brut, prêt à coller dans un email) — réutiliser la fonction déjà présente dans le prototype

## Fichiers de référence

Un prototype HTML autonome existe déjà avec la logique d'appel API PageSpeed et le rendu des scores/pitch — le réutiliser comme base pour le composant "affichage d'un rapport" côté frontend plutôt que de tout réécrire.

## Ce qu'on ne fait PAS

- Pas d'authentification, pas de multi-utilisateur
- Pas de déploiement, pas de domaine, pas de HTTPS
- Pas de base de données (SQLite/Postgres seraient overkill ici)
- Pas de design poussé — fonctionnel et lisible suffit
- Pas de gestion d'erreurs exhaustive — juste éviter que le serveur crash si l'API PageSpeed échoue (afficher un message d'erreur simple)

## Definition of done

- `npm install && npm start` lance l'outil sans étape manuelle supplémentaire
- Je peux auditer une URL et voir le rapport en moins de 60 secondes
- Le prospect audité apparaît dans la liste d'historique avec le bon statut
- Je peux changer un statut et ça persiste après redémarrage du serveur
