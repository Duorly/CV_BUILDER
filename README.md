# CV Builder

Un outil pour rédiger son CV, en faire une version adaptée à chaque candidature, écrire la lettre de motivation qui
va avec et suivre ses candidatures. Il fonctionne dans le navigateur, sans compte : vos données restent sur votre
ordinateur.

- [Guide d’utilisation](#guide-dutilisation)
- [Mettre l’application en ligne](#mettre-lapplication-en-ligne)
- [Pour les développeurs](#pour-les-développeurs)

---

## Guide d’utilisation

### Démarrer

Ouvrez l’adresse du site (par exemple `https://mon-cv.netlify.app`). Au premier lancement, trois choix s’affichent :

- **Commencer de zéro** : un CV vierge, à remplir section par section ;
- **Charger l’exemple** : le CV fictif de Camille Martin, pour voir le rendu et s’en inspirer ;
- **Importer un fichier JSON** : une sauvegarde faite avec CV Builder, sur cet ordinateur ou un autre.

L’écran se divise en deux : le formulaire à gauche, l’aperçu du CV à droite. Sur un petit écran (tablette,
téléphone), deux onglets **Éditer** et **Aperçu** permettent de passer de l’un à l’autre.

### Où sont mes données ?

Tout est **enregistré automatiquement dans ce navigateur**, sur cet appareil. En haut à droite, l’indication
« Enregistré à 14:32 » confirme la dernière sauvegarde (sur un petit écran, elle se réduit à « Enregistré » sous
l’icône de nuage ; survolez-la pour lire le détail). Il n’y a pas de bouton Enregistrer.

À savoir :

- vos CV ne vous suivent pas d’un ordinateur à l’autre, ni de Chrome à Firefox : utilisez toujours le même
  navigateur ;
- la navigation privée, ou un nettoyage des « données de navigation », efface tout ;
- **Safari (Mac, iPhone, iPad) efface les données d’un site que vous n’ouvrez pas pendant 7 jours** : sous Safari,
  exportez une sauvegarde à la fin de chaque séance (l’écran d’accueil le rappelle) ;
- si l’application est ouverte dans deux onglets, un onglet sans modification en cours reprend simplement celles
  de l’autre (un onglet resté sur l’écran d’accueil ouvre les CV enregistrés par l’autre) ; si les deux ont été
  modifiés en même temps, un bandeau met l’enregistrement en pause et vous laisse choisir la version à garder, pour
  ne rien écraser ;
- si le navigateur interdit aux sites d’enregistrer des données, l’application fonctionne quand même, mais
  l’indicateur affiche « Enregistrement impossible » : exportez une sauvegarde avant de fermer l’onglet ;
- si le message rouge « Stockage plein : exportez une sauvegarde » apparaît, cliquez dessus pour télécharger vos
  données, puis supprimez les versions dont vous n’avez plus besoin.

### Faire une sauvegarde (à faire régulièrement)

**Fichier → Tout exporter** télécharge un fichier `CV_Builder_sauvegarde_AAAA-MM-JJ.json` qui contient toutes vos
versions de CV, vos lettres et vos candidatures. Rangez-le dans vos Documents ou sur un cloud. Le menu **Fichier**
indique la date de la dernière sauvegarde exportée ; au-delà d’une semaine (trois jours sous Safari) avec des
modifications non sauvegardées, un bandeau propose d’en refaire une.

Pour le récupérer, sur ce navigateur ou un autre : **Fichier → Importer…**, puis choisissez

- **Ajouter à ma bibliothèque** pour garder vos CV actuels et ajouter ceux du fichier. Si le fichier contient des
  versions ou des candidatures déjà présentes (une sauvegarde déjà importée, ou faite sur ce navigateur), la fenêtre
  l’indique et propose **Mettre à jour ma bibliothèque** : rien n’est ajouté en double, et pour un élément présent
  des deux côtés, la version la plus récente est gardée. Le message qui suit propose **Annuler** quelques secondes ;
- ou **Tout remplacer** pour revenir exactement à l’état de la sauvegarde.

**Fichier → Exporter ce CV** n’exporte que la version affichée (pratique pour l’envoyer à quelqu’un qui utilise aussi
CV Builder).

### Une version de CV par candidature

Gardez une version **de base** complète, et créez une copie pour chaque offre :

1. ouvrez le menu des versions, en haut à gauche (il affiche le nom du CV en cours) ;
2. choisissez **Dupliquer pour une candidature…** ;
3. indiquez l’**entreprise** et le **poste** : la version s’appelle « CV – Poste – Entreprise » ;
4. laissez cochée **Ajouter au suivi des candidatures** : la candidature apparaît dans l’onglet **Candidatures**,
   « À envoyer », liée à cette version (il faut au moins l’entreprise ou le poste) ;
5. adaptez cette copie à l’offre. La version de base ne bouge pas.

Si vous supprimez une version dont d’autres ont été copiées, ces copies sont rattachées à la version d’où venait
celle supprimée : l’IA repart toujours de votre version de base.

La nouvelle version commence avec une lettre de motivation vide ; cochez **Reprendre la lettre de motivation** dans
la même fenêtre si vous préférez partir de celle de la version d’origine (vérifiez alors le destinataire et l’objet).

Le même menu permet de passer d’une version à l’autre, de créer un CV vierge, de **renommer** une version (avec son
entreprise et son poste) ou de la **supprimer** (après confirmation ; un bouton « Annuler » reste proposé quelques
secondes).

Le nom de l’entreprise sert aussi au nom des fichiers : `CV_Camille_Martin_Decathlon.pdf`.

Chaque version est une **copie indépendante** : si vous corrigez votre nom, votre e-mail, votre téléphone, votre
ville ou votre photo dans une version, un message propose **Mettre à jour partout**, qui reporte la correction dans
les autres versions qui avaient encore l’ancienne valeur (et peut être annulé).

**Annuler / Rétablir** : les flèches de la barre d’outils, ou `Ctrl` + `Z` / `Ctrl` + `Y` (sur Mac : `⌘` + `Z` /
`⌘` + `⇧` + `Z`). L’historique concerne la version affichée, CV et lettre compris : si l’étape annulée concerne
l’autre vue (le CV alors que la lettre est affichée, par exemple), cette vue s’affiche avec un message.

### Apparence

Le bouton **Apparence** règle, pour la version en cours :

- le **modèle** : *Design* (deux colonnes, couleurs) ou *ATS* (une colonne sobre) ;
- la **police** et la **taille du texte** (la taille en points est affichée ; en dessous de 9,5 pt, le texte devient
  difficile à lire) ;
- les trois **couleurs** du modèle Design ;
- l’affichage de la **photo** (vous pouvez la masquer sans la supprimer) ;
- la **langue des titres** (Français ou English).

Au-dessus de l’aperçu, le **nombre de pages** est indiqué. S’il dépasse 1, le bouton **Ajuster à 1 page** réduit la
taille du texte juste assez pour tenir sur une page ; avec le modèle ATS, il vérifie aussi que le PDF ATS en
téléchargement direct tient sur une page. Si même la plus petite taille ne suffit pas, il vaut mieux raccourcir le
contenu.

La **photo** est recadrée en carré (vers le haut pour une photo prise en hauteur, où se trouve le visage) ; juste
après l’avoir choisie, le curseur **Cadrage de la photo** permet de la déplacer.

### Télécharger son CV : quel PDF choisir ?

Cliquez sur **Télécharger** :

| Vous postulez…                                          | Choisissez                                         |
| ------------------------------------------------------- | -------------------------------------------------- |
| sur un site carrières, un job board, un formulaire en ligne | **PDF ATS — téléchargement direct** (recommandé) |
| par e-mail, directement à un recruteur                  | **PDF design via l’impression**                    |
| si le téléchargement direct ne fonctionne pas           | **PDF ATS via l’impression**                       |

Les sites carrières passent les CV dans un logiciel (ATS) qui extrait le texte : la version ATS, en une colonne, est
lue sans erreur. La version design est plus belle pour un humain.

Le PDF ATS n’est **pas** la mise en page Design affichée par défaut : une seule colonne, sans photo, donc souvent un
nombre de pages différent. La fenêtre **Télécharger** indique le nombre de pages réel de ce PDF, et **Voir l’aperçu
ATS** affiche une mise en page proche (même contenu, une colonne) : ses sauts de page peuvent différer de ceux du
PDF, dont le nombre de pages exact reste celui indiqué dans **Télécharger**. Le PDF direct n’écrit que l’alphabet latin
d’Europe de l’Ouest : si votre CV contient d’autres lettres (« Ș », « Ł », cyrillique, chinois…), la fenêtre les
signale et recommande **PDF ATS via l’impression**, qui les garde. Les emoji (✅, 🚀…) sont simplement retirés du PDF
direct, ce qui convient aux logiciels de recrutement : la fenêtre le signale, sans changer sa recommandation. Si le PDF
direct fait plus de pages que l’aperçu ATS affiché, la fenêtre recommande aussi **PDF ATS via l’impression**, fidèle à
l’aperçu.

Pour les versions « via l’impression », la fenêtre d’impression du navigateur s’ouvre. Réglez :

1. **Destination : Enregistrer au format PDF** (et non votre imprimante) ;
2. **Marges : Par défaut** ;
3. décochez **En-têtes et pieds de page** (dans « Plus de paramètres »), sinon l’adresse de la page et la date
   s’impriment dans les marges ;
4. pour la version design, cochez **Graphiques d’arrière-plan** (« Imprimer les arrière-plans » dans Safari et
   Firefox) pour garder les couleurs.

Le nom de fichier proposé est déjà le bon : `CV_Prénom_Nom_Entreprise.pdf` pour la version ATS,
`CV_Prénom_Nom_Entreprise_couleur.pdf` pour la version design (`_colour` pour un CV en anglais), pour ne pas les
confondre. La fenêtre « Télécharger » indique le nom de chaque option.

**Quel navigateur ?** Pour la version design via l’impression, utilisez **Chrome** ou **Edge** : Safari ne répète pas
la marge du haut sur les pages 2 et suivantes, et la mise en page est réglée sur le moteur de Chrome. La fenêtre
« Télécharger » vous prévient si vous êtes sous Safari, Firefox, iPhone ou iPad. Le **PDF ATS — téléchargement
direct** fonctionne dans tous les navigateurs.

**Sur iPhone et iPad**, la fenêtre d’impression n’a ni « Destination » ni « Marges » : touchez l’icône **Partager**
en haut de l’aperçu d’impression, puis **Enregistrer dans Fichiers**. La fenêtre « Télécharger » donne ces étapes,
y compris pour la lettre.

**Sur Android**, la fenêtre d’impression est celle du téléphone : choisissez l’imprimante **Enregistrer au format
PDF**, touchez le bouton **PDF**, puis choisissez un dossier. La fenêtre « Télécharger » donne ces étapes.

### Lettre de motivation

L’onglet **Lettre** affiche la lettre de la version en cours, dans le même style que le CV : destinataire, lieu et
date, objet, corps, signature. Elle se télécharge avec **Télécharger** (fichier `LM_Prénom_Nom_Entreprise.pdf`, ou
`Cover_Letter_Prénom_Nom_Entreprise.pdf` pour une version en anglais). Un
**brouillon IA** est proposé en option (voir plus bas) : relisez-le toujours. Pendant sa rédaction, vous pouvez
passer à la vue CV : un message prévient quand il est prêt.

Une lettre déjà rédigée (dans Word, par exemple) peut être collée telle quelle dans **Corps de la lettre** : sa
formule d’appel, sa formule de politesse et sa signature sont placées dans leurs propres champs, pour ne pas être
imprimées deux fois.

### Suivi des candidatures

L’onglet **Candidatures** liste vos candidatures : entreprise, poste, lien de l’offre, date, statut (à envoyer,
envoyée, relancée, entretien…), date de relance, version du CV envoyée et notes. Une relance est proposée quelques
jours après l’envoi, et le tableau s’exporte en CSV pour Excel ou LibreOffice. Le bouton **Ouvrir** d’une ligne
affiche la version du CV envoyée à cette entreprise.

### L’intelligence artificielle (optionnelle)

Le menu **IA** propose :

- **Adapter à une offre** : l’IA relève les mots-clés de l’offre présents ou absents de votre CV. Vous cochez ceux
  que vous possédez vraiment (l’IA n’invente rien), puis elle propose des modifications que vous acceptez une par
  une. Le résultat devient une **nouvelle version** : votre CV d’origine ne change pas. Le champ **À partir de**
  choisit la version de départ : par défaut, la **version de base** (celle dont la version affichée est issue),
  pour ne pas reprendre les ajustements faits pour une autre offre ;
- **Traduire en anglais / en français** : crée une version traduite ;
- **Clé API et fournisseur** : le réglage nécessaire avant tout usage.

Il faut une **clé API personnelle** de l’un des deux fournisseurs :

- **Claude** (Anthropic) : créez un compte sur la console Anthropic, ajoutez un moyen de paiement, puis créez une
  clé ;
- **Gemini** (Google) : ouvrez Google AI Studio avec votre compte Google, puis créez une clé (elle commence par
  `AQ.` ; les clés créées avant mai 2026 commencent par `AIza`).

**Sans clé**, la fenêtre **Adapter à une offre** propose **Créer la version sans IA** : la version dédiée à l’offre
est créée avec le poste, l’entreprise, le texte et le lien de l’offre (et ajoutée au suivi), à adapter vous-même.

Pour une nouvelle offre, la fenêtre part de champs vides (**Reprendre son offre** recopie celle de la version
affichée, pour l’adapter à nouveau à la même offre). Si l’analyse lit dans l’offre une autre entreprise que celle
indiquée, la fenêtre le signale. Une lettre déjà commencée dans la version affichée peut être reprise dans la
nouvelle version (case cochée d’office pour la même entreprise).

Les propositions de l’IA qui changent ou ajoutent un **chiffre**, ajoutent des **puces**, ajoutent une
compétence que votre CV ne cite pas mot pour mot (« synonyme repéré par l’IA »), ou citent un mot-clé de l’offre
que votre CV ne cite pas mot pour mot et que vous n’avez pas coché (y compris un mot-clé que l’IA a rapproché d’un
synonyme), sont signalées et **ne sont pas cochées** : ne les cochez que si elles sont exactes. Pour une traduction,
les éléments dont les **chiffres** ou les niveaux de langue diffèrent de l’original sont listés sous « Chiffres à
vérifier ».

**Coût** : facturé à l’usage par le fournisseur, de moins d’un centime à quelques dizaines de centimes par
optimisation selon le modèle choisi (le détail s’affiche dans les réglages). Fixez un plafond de dépense dans la
console du fournisseur.

**Confidentialité** : le contenu du CV, **sans photo ni coordonnées**, et le texte de l’offre sont envoyés au
fournisseur choisi. La clé reste dans ce navigateur ; sur un ordinateur partagé, utilisez **Oublier la clé** (ou
**Oublier toutes mes clés** si vous en avez enregistré deux). Une clé collée dans le champ de l’autre fournisseur
est reconnue et rangée au bon endroit : elle n’est jamais envoyée au mauvais fournisseur. Avec
l’offre gratuite de Gemini, Google peut réutiliser les contenus envoyés : les réglages IA le précisent.

### Raccourcis clavier

| Action                    | Windows / Linux          | Mac           |
| ------------------------- | ------------------------ | ------------- |
| Annuler                   | `Ctrl` + `Z`             | `⌘` + `Z`     |
| Rétablir                  | `Ctrl` + `Y`             | `⌘` + `⇧` + `Z` |
| Imprimer le document affiché | `Ctrl` + `P`          | `⌘` + `P`     |

### En cas de problème

- **« Oups, quelque chose s’est mal passé »** : cliquez sur **Télécharger mes données (JSON)**, puis rechargez la
  page. Si l’erreur revient, repartez d’un CV vierge et réimportez le fichier téléchargé.
- **« Les données enregistrées étaient illisibles »** : un CV vierge a été ouvert et les anciennes données mises de
  côté. Importez votre dernière sauvegarde, ou téléchargez les données illisibles pour les faire examiner.

---

## Mettre l’application en ligne

L’application est un site statique : un hébergement gratuit suffit, et chaque modification poussée sur GitHub est
publiée automatiquement.

> **Avant de commencer — données personnelles du développeur** : le dossier `examples/` contient l’ancien CV du
> développeur (nom, e-mail, téléphone, photo). Il n’est **pas** publié sur le site, et il est ignoré par git
> (`.gitignore`) : il n’a jamais été versionné et reste sur votre ordinateur. En revanche, le dépôt GitHub **est
> public**, et son **historique** contient encore ces données : anciens fichiers `src/data/resumeData.json` et
> `src/images/photo-cv.jpg`, nom complet dans le titre de l’ancien `index.html`, et adresse e-mail de l’auteur de
> chaque commit. Aucun test n’a besoin de `examples/` ; s’il est présent, les tests vérifient qu’aucune de ces
> données n’apparaît dans l’application livrée. Supprimez aussi l’ancien dossier `dist/` local, construit avant
> ces changements : il contient encore ces données.

**Le plus simple** : passer le dépôt en privé (GitHub → *Settings* → *General* → *Change repository
visibility*). Netlify et Vercel publient aussi un dépôt privé.

**Pour garder le dépôt public**, réécrivez l’historique. La procédure ci-dessous a été vérifiée de bout en bout
avec git-filter-repo 2.47 ; faites-la depuis un **clone neuf** (sur votre copie de travail, `git filter-repo`
refuse de s’exécuter) :

1. validez et poussez d’abord toutes vos modifications (`git push`) ;
2. installez l’outil : `brew install git-filter-repo` (version 2.47 ou plus récente) ;
3. dans un autre dossier : `git clone https://github.com/Duorly/CV_BUILDER.git cv-nettoyage && cd cv-nettoyage` ;
4. retirez les anciens fichiers :
   `git filter-repo --sensitive-data-removal --invert-paths --path src/data/resumeData.json --path src/images/photo-cv.jpg`
   (`--sensitive-data-removal` garde le dépôt distant `origin`, que filter-repo retirerait sinon) ;
5. remplacez le titre de l’ancien `index.html` (votre nom) par « CV Builder » :
   `printf 'regex:<title>[^<]*</title>==><title>CV Builder</title>\n' > ../remplacements.txt`, puis
   `git filter-repo --sensitive-data-removal --replace-text ../remplacements.txt` ;
6. facultatif, pour retirer aussi votre adresse e-mail des commits : écrivez dans `../auteurs.txt` une ligne
   `Votre nom <identifiant@users.noreply.github.com> <adresse-a-retirer@exemple.fr>` (adresse « noreply » donnée par
   GitHub dans *Settings* → *Emails*), puis `git filter-repo --sensitive-data-removal --mailmap ../auteurs.txt` ;
7. publiez la réécriture : `git push --force --mirror origin` ;
8. demandez au support GitHub de purger les vues en cache et les références des *pull requests* (formulaire
   « Remove sensitive data » de GitHub Support) ;
9. ensuite, **ne poussez plus depuis l’ancienne copie** (l’ancien historique reviendrait) : clonez à nouveau le
   dépôt, puis remettez-y votre dossier `examples/` si vous en avez besoin pour les tests.

### Avec Netlify

1. Poussez le projet sur GitHub.
2. Sur [app.netlify.com](https://app.netlify.com), cliquez sur **Add new project → Import an existing project**, puis
   choisissez **GitHub** et le dépôt.
3. Les réglages sont lus dans `netlify.toml` (commande `npm run build`, dossier `dist`, Node 22, en-têtes de
   sécurité) : cliquez sur le bouton de publication (**Deploy** ou **Publish**, selon l’écran).
4. Après une minute, le site est en ligne sur une adresse `xxx.netlify.app`. Vous pouvez la renommer depuis la page
   du projet : **Customize → Manage project name and cover image** (l’adresse devient `nom-choisi.netlify.app` ;
   lisez d’abord le paragraphe « Important : l’adresse du site » ci-dessous).

### Avec Vercel

1. Poussez le projet sur GitHub.
2. Sur [vercel.com/new](https://vercel.com/new), importez le dépôt.
3. Vercel reconnaît **Vite** : laissez la commande `npm run build` et le dossier `dist`, puis cliquez sur **Deploy**.
   Les en-têtes de sécurité sont lus dans `vercel.json`.

### Important : l’adresse du site

Les données sont rangées par adresse de site. Si l’adresse change (nouveau nom Netlify, nom de domaine personnel…),
le navigateur affiche un CV vide : faites **Fichier → Tout exporter** sur l’ancienne adresse, puis **Importer** sur
la nouvelle. Le fichier `dist/` ne s’ouvre pas par un double-clic : il faut passer par un hébergement, ou
lancer **`npm run build` puis `npm run preview`** (`preview` sert le dossier `dist/` tel quel, sans le reconstruire :
un ancien `dist/` montrerait une ancienne version de l’application). Déployez toujours depuis GitHub (Netlify ou
Vercel reconstruisent le site) et jamais en déposant à la main un dossier `dist/` ancien.

---

## Pour les développeurs

Prérequis : Node.js 20 ou plus récent.

```bash
npm install
npm run dev        # http://localhost:5173
npm test           # tests unitaires (Vitest)
npm run e2e        # tests de bout en bout (Playwright, dans Google Chrome)
npm run build      # version de production dans dist/
npm run preview    # sert dist/ localement, tel quel : lancez npm run build avant
```

### Tests de bout en bout

`npm run e2e` construit l’application (dans un dossier temporaire, jamais dans `dist/`), la sert avec
`vite preview` sur le port 4300 et la pilote dans le **Google Chrome installé** : aucun navigateur n’est téléchargé.
Les PDF sont contrôlés avec **poppler** (`pdftotext`, `pdfinfo` : `brew install poppler` ou
`apt install poppler-utils`) ; sans lui, les tests de téléchargement et de lettre sont ignorés.

- Un fichier par thème dans `e2e/` (accueil, saisie, historique, photo, sections, versions, import-export,
  téléchargement, IA, lettre, candidatures, responsive) ; les outils communs sont dans `e2e/support/`.
- Chaque test part d’un navigateur neuf (localStorage vide) et échoue si la page écrit une erreur dans la console
  ou contacte un serveur extérieur.
- Les API Claude et Gemini sont simulées (`e2e/support/ai-mock.js`) : aucune clé réelle, aucun appel facturé.
- `npm run e2e -- e2e/photo.spec.js` lance un seul fichier, `npm run e2e -- --headed` montre le navigateur ;
  après un échec, `npx playwright show-report` ouvre le rapport avec la trace de chaque test.
- `vite preview` sert les mêmes en-têtes de sécurité que Netlify et Vercel (`SECURITY_HEADERS` dans
  `vite.config.js`, recopiés dans `netlify.toml` et `vercel.json` ; un test unitaire vérifie qu’ils concordent) :
  une ressource bloquée par la Content-Security-Policy fait échouer les tests.
- Variables utiles : `E2E_PORT` (autre port), `E2E_DIST_DIR` (dossier du build de test).

### Structure

```
src/
├── main.jsx                 # point d’entrée, ErrorBoundary autour de <App/>
├── App.jsx                  # bibliothèque, vues CV / Lettre / Candidatures, impression, import/export
├── components/
│   ├── shell/               # barre d’outils, versions, apparence, aperçu, fenêtres, sauvegarde auto
│   ├── editor/              # formulaire d’édition du CV
│   ├── templates/           # modèles Design et ATS, styles d’impression
│   ├── letter/              # lettre de motivation (éditeur + rendu A4)
│   ├── tracker/             # suivi des candidatures
│   ├── ai/                  # adaptation à une offre, traduction, réglages IA
│   ├── pdf/                 # document PDF texte (@react-pdf/renderer)
│   └── ErrorBoundary.jsx    # écran de secours
├── lib/
│   ├── schema.js            # forme des données, normalizeData / normalizeSettings
│   ├── storage.js           # bibliothèque, localStorage, formats d’import / export
│   ├── libraryActions.js    # opérations sur les versions (ajout, duplication, fusion…)
│   ├── useHistory.js        # annuler / rétablir
│   ├── labels.js            # libellés du CV en français et en anglais
│   ├── pageGeometry.js      # géométrie A4 partagée par l’aperçu et l’impression
│   ├── files.js             # noms de fichiers, téléchargements, compression de la photo
│   ├── backup.js            # date du dernier export, rappel de sauvegarde
│   ├── typography.js        # espaces insécables à la française (affichage et PDF)
│   ├── pdfExport.js         # téléchargement direct du PDF ATS
│   ├── ai.js                # appels Claude / Gemini
│   └── csv.js               # export CSV du suivi
├── data/exampleResume.json  # CV fictif (Camille Martin)
└── styles/                  # une feuille par domaine ; app.css porte les classes génériques (.btn, .modal…)
```

### Données

- Tout est stocké dans `localStorage`, sous la clé `cv-builder:library:v2` :
  `{ version, currentId, cvs: [...], applications: [...] }`. Chaque version contient `data` (le CV), `settings`
  (apparence) et `coverLetter`.
- Toute donnée externe (localStorage, import, réponse de l’IA) passe par `normalizeData` : le rendu peut supposer que
  chaque champ existe.
- L’import accepte une sauvegarde complète, une version exportée, ou l’ancien format (l’objet CV brut). La photo
  n’est acceptée que sous forme d’image intégrée (`data:image/…`) ; une photo importée est recadrée et réencodée
  comme une photo choisie dans l’éditeur (métadonnées EXIF retirées), sauf si elle sort déjà de ce traitement.
- Une sauvegarde importée dans une bibliothèque existante est fusionnée par identifiant (`mergeLibraries`) : une
  version ou une candidature déjà présente n’est pas dupliquée, et la plus récente des deux (`updatedAt`) est gardée.
- La date du dernier « Tout exporter » est gardée à part, sous la clé `cv-builder:backup`.
- Les tests utilisent un CV fictif à l’ancien format (`src/lib/__tests__/fixtures/legacy-v1.json`), jamais les
  données du développeur.
- La sauvegarde automatique a lieu 500 ms après la dernière modification, et immédiatement quand l’onglet est masqué
  ou fermé.

### Polices et PDF

- La police Inter est livrée avec l’application (`@fontsource/inter`, un fichier statique par graisse, importés dans
  `main.jsx`) : aucune requête vers Google Fonts. Chrome l’intègre ainsi en **TrueType** dans les PDF imprimés ; la
  police variable de Google Fonts y devenait du Type 3, que certains ATS lisent mal. Vérification :
  `pdffonts CV.pdf` ne doit lister aucune police « Type 3 ».
- Il n’y a pas d’option « Police système » : sur Mac, Chrome intègre San Francisco en Type 3, sans espaces entre
  les mots pour les ATS. Une ancienne sauvegarde qui l’utilisait passe en Inter, et aucune police proposée ne
  retombe sur la police système (`e2e/telechargement.spec.js` vérifie l’absence de Type 3 pour chacune).
- Le PDF ATS direct (`lib/pdfExport.js`) utilise les polices standard du PDF (Helvetica) : il ne dépend pas du
  navigateur.
