# CV Builder

Éditeur de CV interactif en temps réel avec export PDF, personnalisation visuelle et optimisation IA pour les systèmes ATS.

---

## Fonctionnalités

### Édition en temps réel
- Panneau éditeur latéral avec aperçu immédiat du rendu final
- Sections éditables : informations personnelles, compétences techniques par catégorie, soft skills, liens sociaux, langues, expériences professionnelles, formations
- Ajout / suppression dynamique de chaque entrée

### Personnalisation visuelle
- Couleur primaire (titres, tags, icônes)
- Couleur de fond de la sidebar
- Couleur du texte
- Curseur d'échelle typographique (50 % → 150 %)

### Export
| Mode | Comportement |
|---|---|
| **Impression A4** | Dialogue d'impression natif du navigateur |
| **Direct PDF** | Génération client-side via html2canvas + jsPDF — découpage multi-page intelligent, marges de 10 mm haut/bas, fond sidebar continu |
| **Exporter JSON** | Sauvegarde de toutes les données du CV dans un fichier `.json` |
| **Importer JSON** | Rechargement d'un CV précédemment exporté |

### Support multi-page
- Le CV s'étend naturellement au-delà d'une page A4
- Indicateur visuel de coupure de page dans l'aperçu (zone grisée à 10 mm de la limite)
- Le PDF détecte les éléments DOM pour ne jamais couper une ligne de texte à mi-hauteur

### Optimisation ATS par IA
Colle le texte d'une offre d'emploi et l'IA réécrit automatiquement ton CV pour maximiser le score ATS :
- Résumé professionnel réécrit avec les mots-clés de l'offre
- Compétences réordonnées par pertinence
- Bullet points d'expérience reformulés avec le vocabulaire de l'offre
- Aperçu des modifications avant application (diff avant / après)
- Choix du modèle IA : **Claude** (Anthropic) ou **Gemini** (Google)
- Clés API stockées localement dans le navigateur (`localStorage`), jamais transmises ailleurs

---

## Stack technique

- **React 18** + **Vite 5**
- **Lucide React** — icônes SVG
- **html2canvas** + **jsPDF** — génération PDF client-side (chargés dynamiquement depuis CDN)
- **Anthropic Messages API** / **Google Gemini API** — optimisation ATS (optionnel)

---

## Installation

```bash
git clone <url-du-repo>
cd cv-builder
npm install
npm run dev
```

L'application est disponible sur `http://localhost:5173`.

---

## Structure du projet

```
src/
├── components/
│   ├── Editor.jsx        # Panneau éditeur (formulaires, CRUD)
│   ├── Resume.jsx        # Aperçu du CV (rendu final)
│   └── ATSOptimizer.jsx  # Modal d'optimisation IA
├── data/
│   └── resumeData.json   # Données initiales de démonstration
├── images/
│   └── photo-cv.jpg      # Photo de profil par défaut
├── App.jsx               # Composant racine, état global, export PDF/JSON
└── App.css               # Tous les styles (UI + CV + print)
```

---

## Format des données

Le CV est entièrement décrit par un objet JSON. Vous pouvez l'éditer directement ou l'importer via l'interface.

```json
{
  "personalInfo": {
    "name": "Prénom Nom",
    "title": "Titre du poste",
    "email": "email@exemple.com",
    "phone": "06 00 00 00 00",
    "location": "Ville, Pays",
    "objective": "Résumé professionnel..."
  },
  "mainSkills": [
    { "category": "Langages", "skills": ["JavaScript", "Python"] }
  ],
  "softSkills": ["Communication", "Travail en équipe"],
  "socialLinks": [
    { "name": "LinkedIn", "url": "https://...", "label": "linkedin.com/in/...", "icon": "Link" }
  ],
  "languages": [
    { "name": "Français", "level": "Natif" }
  ],
  "experiences": [
    {
      "title": "Développeur Front-end",
      "company": "Entreprise",
      "location": "Paris",
      "period": "2022 – Aujourd'hui",
      "details": ["Réalisation de...", "Mise en place de..."]
    }
  ],
  "education": [
    {
      "title": "Titre de la formation",
      "school": "École",
      "degree": "Diplôme",
      "period": "2020 – 2022",
      "objectives": ["Objectif 1"],
      "tools": ["Outil 1"],
      "link": "https://..."
    }
  ]
}
```

---

## Utilisation de l'optimisation ATS

1. Obtenir une clé API :
   - **Anthropic (Claude)** → [console.anthropic.com/settings/keys](https://console.anthropic.com/settings/keys)
   - **Google (Gemini)** → [aistudio.google.com/app/apikey](https://aistudio.google.com/app/apikey)
2. Cliquer sur **Optimiser ATS** dans la barre d'outils
3. Choisir le modèle, coller la clé API et le texte de l'offre d'emploi
4. Vérifier l'aperçu des modifications, puis appliquer ou annuler

> La clé API est stockée dans le `localStorage` du navigateur. Elle n'est jamais envoyée à un serveur tiers — les appels sont effectués directement depuis le navigateur vers l'API choisie.

---

## Build de production

```bash
npm run build
```

Les fichiers statiques sont générés dans `dist/`. Le projet peut être hébergé sur n'importe quel serveur statique (Netlify, Vercel, GitHub Pages, etc.).
