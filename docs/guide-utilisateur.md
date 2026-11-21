# Guide d’utilisation

CV Builder sert à rédiger son CV, à en faire une version adaptée à chaque candidature, à écrire la lettre de
motivation qui va avec et à suivre ses candidatures. Il fonctionne dans le navigateur, sans compte : vos données
restent sur votre ordinateur.

Ce guide s’adresse aux personnes qui utilisent l’application. Pour l’installer, la modifier ou la mettre en ligne,
voir le [README](../README.md).

- [Démarrer](#démarrer)
- [Où sont mes données ?](#où-sont-mes-données-)
- [Faire une sauvegarde (à faire régulièrement)](#faire-une-sauvegarde-à-faire-régulièrement)
- [Une version de CV par candidature](#une-version-de-cv-par-candidature)
- [Apparence](#apparence)
- [Télécharger son CV : quel PDF choisir ?](#télécharger-son-cv--quel-pdf-choisir-)
- [Lettre de motivation](#lettre-de-motivation)
- [Suivi des candidatures](#suivi-des-candidatures)
- [L’intelligence artificielle (optionnelle)](#lintelligence-artificielle-optionnelle)
- [Raccourcis clavier](#raccourcis-clavier)
- [En cas de problème](#en-cas-de-problème)

## Démarrer

Ouvrez l’adresse du site (par exemple `https://mon-cv.netlify.app`). Au premier lancement, trois choix s’affichent :

- **Commencer de zéro** : un CV vierge, à remplir section par section ;
- **Charger l’exemple** : le CV fictif de Camille Martin, pour voir le rendu et s’en inspirer ;
- **Importer un fichier JSON** : une sauvegarde faite avec CV Builder, sur cet ordinateur ou un autre.

L’écran se divise en deux : le formulaire à gauche, l’aperçu du CV à droite. Sur un petit écran (tablette,
téléphone), deux onglets **Éditer** et **Aperçu** permettent de passer de l’un à l’autre.

Sur un grand écran, faites glisser la **poignée** entre le formulaire et l’aperçu pour élargir l’un ou l’autre ;
au clavier, sélectionnez-la avec `Tab` puis utilisez les flèches (`Maj` pour aller plus vite). Un double-clic
rend la largeur par défaut. Le panneau **Apparence**, à droite de l’aperçu, a la sienne. Les largeurs choisies sont
retenues par ce navigateur, pour le CV comme pour la lettre ; l’aperçu garde toujours une largeur lisible.

L’aperçu s’ajuste à la largeur de sa colonne. Les boutons **−** et **+** au-dessus le réduisent ou l’agrandissent
(de 50 à 150 %), **Taille réelle** l’affiche à 100 % (faites défiler pour voir le reste) et **Adapter** le
réajuste à sa colonne. Ce zoom ne change que l’affichage à l’écran, jamais le PDF ni l’impression ; il est retenu
par ce navigateur.

Sous le **Titre visé**, un **Sous-titre** facultatif ajoute une ligne plus discrète : contrat recherché, disponibilité,
spécialité (« CDI · Disponible immédiatement »). Il s’affiche sous le poste sur tous les modèles et dans le PDF direct,
et l’IA le traduit avec le reste du CV.

Chaque expérience peut recevoir une **stack technique** (bouton **+ Stack technique** sous ses missions) : cliquez
sur les technologies proposées (celles déjà présentes dans votre CV, puis, dès les premières lettres, un catalogue de
technologies courantes) ou tapez-en une autre puis `Entrée`. Elle s’affiche sous les missions, en étiquettes sur le
modèle Design et en ligne « Stack technique : … » sur les modèles Classique, Expert et ATS et le PDF direct.

Sous les sections, **Ajouter une section libre** crée une rubrique à votre titre (centres d’intérêt, bénévolat,
publications…) et **Ajouter une ligne de texte** une phrase seule, sans titre (« Disponible immédiatement,
permis B »), sans puce. Pour l’une comme pour l’autre, **Emplacement** la place dans la colonne latérale ou la colonne
principale (modèles Design, Classique et Focus ; les modèles ATS et Expert suivent l’ordre des sections), et les
flèches de son panneau la déplacent parmi les sections. Une ligne de texte peut en compter plusieurs (`Entrée` en
ajoute une) et recevoir un titre ; sa **Présentation** peut aussi passer en liste à puces ou « sur une ligne ».

## Où sont mes données ?

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

## Faire une sauvegarde (à faire régulièrement)

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

## Une version de CV par candidature

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

## Apparence

Le bouton **Apparence** ouvre (ou ferme) un panneau à droite de l’aperçu : il reste ouvert pendant que vous
éditez, et chaque réglage s’y voit aussitôt sur le CV. `Échap` ou la croix le ferment ; ouvert ou fermé, il est
retrouvé tel quel à la visite suivante. Sur un petit écran, il s’affiche par-dessus le contenu. Il règle, pour la
version en cours :

- le **modèle** : *Design*, *Classique* ou *Focus* (deux colonnes, couleurs), *Expert* (une colonne, couleurs) ou
  *ATS* (une colonne sobre). Chaque modèle est présenté par la **miniature** de la première page de votre CV dans ce
  modèle, avec les couleurs qu’il aurait (le CV d’exemple tant que le vôtre est vide) : un clic sur la carte l’affiche
  dans l’aperçu. *Classique* a une colonne pleine hauteur (vert foncé et texte blanc par défaut) avec la photo, le
  nom, les coordonnées et les liens, puis les sections de la colonne, titrées d’un filet ; le poste visé ouvre la
  page, les dates sont alignées à droite et les mots-clés s’écrivent à la suite (« Backend : Java, Spring Boot »).
  *Focus* met l’expérience au premier plan : un en-tête sur toute la largeur (nom, poste, sous-titre, coordonnées et
  liens), puis la **formation dans la colonne de gauche**, avec les compétences, les langues et les certifications,
  pour laisser tout le corps de la page au profil et aux expériences (vert d’eau par défaut). *Expert* est pensé pour
  un long parcours, souvent sur deux pages : un en-tête sur toute la largeur (nom, poste, sous-titre, coordonnées et
  liens, sur un filet ou un bandeau de couleur au choix), puis les sections les unes sous les autres dans l’ordre de
  la liste, avec les **dates et lieux dans la marge de gauche** pour lire la chronologie d’un coup d’œil, les
  compétences clés sur deux ou trois colonnes et les langues côte à côte (bleu marine par défaut). Un modèle s’affiche
  dans ses propres couleurs et sa police (Open Sans pour *Classique*) tant que vous n’en avez pas choisi d’autres :
  passer de l’un à l’autre garde vos couleurs et votre police si vous les avez changées. Le modèle en couleur choisi
  reste retenu quand le modèle ATS est affiché : c’est lui que donne le **PDF design** ;
- la **police**, parmi seize, rangées en deux familles : *sans empattement* (Inter, Open Sans, Roboto, Montserrat,
  Raleway, Nunito, Work Sans, IBM Plex Sans, Helvetica / Arial) et *avec empattement* (Georgia, Lora, Merriweather,
  Source Serif 4, PT Serif, Libre Baskerville, IBM Plex Serif). Elle est gardée dans le PDF imprimé ; le PDF ATS en
  téléchargement direct utilise toujours Helvetica ;
- la **taille du texte** (la taille en points est affichée ; en dessous de 9,5 pt, le texte devient difficile à
  lire) ;
- les **couleurs** : couleur principale, **texte du corps** (colonne principale, et tout le CV au modèle ATS comme
  dans le PDF direct), **fond** et **texte de la colonne** (modèles Design, Classique et Focus ; sur *Classique*, une
  colonne foncée colore aussi les titres de la page, et la couleur principale ses filets et ses icônes). **Couleurs
  par défaut** remet celles du modèle. Chaque couleur de texte est déclinée en nuances plus douces pour les dates et
  les petites mentions. Une couleur qui se confondrait avec son fond (texte foncé sur une colonne foncée, couleur
  principale jaune sur la page blanche…) est automatiquement assombrie ou éclaircie sur le CV, dans la même teinte ;
  l’Apparence indique lesquelles et la teinte utilisée. Le bandeau coloré des modèles ATS, Expert et Focus garde la
  couleur principale exacte ;
- la présentation des **compétences et mots-clés** du modèle Design : en **étiquettes** encadrées, ou en **liste à
  puces**, à la suite sur la ligne, plus sobre et plus compacte. Le choix vaut pour les compétences, la stack
  technique des expériences et les objectifs et outils des formations (le modèle ATS garde ses lignes
  « Catégorie : a, b, c ») ;
- l’affichage de la **photo** (vous pouvez la masquer sans la supprimer) ;
- la **langue des titres** (Français ou English).

Dans la vue **Lettre**, le panneau ne montre que ce qui concerne la lettre : la **police**, la **couleur principale**,
la couleur du **texte** et la **langue** (date, « Objet : », formule d’appel). Ces réglages sont ceux de la version de
CV : les changer depuis la lettre les change aussi sur le CV.

Au-dessus de l’aperçu, le **nombre de pages** est indiqué. S’il dépasse 1, le bouton **Ajuster à 1 page** réduit la
taille du texte juste assez pour tenir sur une page ; avec le modèle ATS, il vérifie aussi que le PDF ATS en
téléchargement direct tient sur une page. Si même la plus petite taille ne suffit pas, il vaut mieux raccourcir le
contenu.

La **photo** est recadrée en carré (vers le haut pour une photo prise en hauteur, où se trouve le visage) ; juste
après l’avoir choisie, le curseur **Cadrage de la photo** permet de la déplacer.

## Télécharger son CV : quel PDF choisir ?

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

## Lettre de motivation

L’onglet **Lettre** affiche la lettre de la version en cours, dans le même style que le CV : destinataire, lieu et
date, objet, corps, signature. Elle se télécharge avec **Télécharger** (fichier `LM_Prénom_Nom_Entreprise.pdf`, ou
`Cover_Letter_Prénom_Nom_Entreprise.pdf` pour une version en anglais). Un
**brouillon IA** est proposé en option (voir plus bas) : relisez-le toujours. Pendant sa rédaction, vous pouvez
passer à la vue CV : un message prévient quand il est prêt.

Une lettre déjà rédigée (dans Word, par exemple) peut être collée telle quelle dans **Corps de la lettre** : sa
formule d’appel, sa formule de politesse et sa signature sont placées dans leurs propres champs, pour ne pas être
imprimées deux fois.

## Suivi des candidatures

L’onglet **Candidatures** liste vos candidatures : entreprise, poste, lien de l’offre, date, statut (à envoyer,
envoyée, relancée, entretien…), date de relance, version du CV envoyée et notes. Une relance est proposée quelques
jours après l’envoi, et le tableau s’exporte en CSV pour Excel ou LibreOffice. Le bouton **Ouvrir** d’une ligne
affiche la version du CV envoyée à cette entreprise.

## L’intelligence artificielle (optionnelle)

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

## Raccourcis clavier

| Action                    | Windows / Linux          | Mac           |
| ------------------------- | ------------------------ | ------------- |
| Annuler                   | `Ctrl` + `Z`             | `⌘` + `Z`     |
| Rétablir                  | `Ctrl` + `Y`             | `⌘` + `⇧` + `Z` |
| Imprimer le document affiché | `Ctrl` + `P`          | `⌘` + `P`     |

## En cas de problème

- **« Oups, quelque chose s’est mal passé »** : cliquez sur **Télécharger mes données (JSON)**, puis rechargez la
  page. Si l’erreur revient, repartez d’un CV vierge et réimportez le fichier téléchargé.
- **« Les données enregistrées étaient illisibles »** : un CV vierge a été ouvert et les anciennes données mises de
  côté. Importez votre dernière sauvegarde, ou téléchargez les données illisibles pour les faire examiner.
