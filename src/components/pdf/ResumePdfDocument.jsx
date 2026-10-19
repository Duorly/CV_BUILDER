import { Document, Font, Link, Page, Text, View } from '@react-pdf/renderer';
import { clean, customSectionKey, isBlankItem, isShownItem, joinNonEmpty, visibleSections } from '../../lib/schema';
import { labelsFor, sectionTitle } from '../../lib/labels';
import { absoluteUrl, prettyUrl, telHref } from '../../lib/files';
import { bodyTextPt } from '../../lib/pageGeometry';
import { WORD_BREAK, pdfText, pdfTexts } from './pdfText';

// Version PDF du template ATS (components/templates/ResumeATS.jsx) : une colonne, même
// ordre, mêmes titres, mêmes séparateurs ; texte extractible et liens cliquables.
// Reçoit des données et réglages déjà normalisés (voir lib/pdfExport.js).

// Pas de césure automatique : un mot-clé coupé en deux n'est plus reconnu par les logiciels de tri.
// Seuls les mots plus larges que la ligne (marqués par pdfText) se coupent, et sans tiret :
// une partie vide entre deux morceaux devient un point de coupure de largeur nulle.
Font.registerHyphenationCallback((word) => word.split(WORD_BREAK).flatMap((part, i) => (i ? ['', part] : [part])));

const MM = 72 / 25.4;
const A4_WIDTH = 595.28;
const MARGIN_X = 16 * MM;
const BULLET_WIDTH = 5 * MM;
const SEP = ' · ';
const NBSP = '\u00A0';
const CONTACT_COLOR = '#374151';
const META_COLOR = '#4b5563';
const RULE_COLOR = '#9ca3af';
const BODY_COLOR = '#1f2937';

// Tailles de police proportionnelles à fontScale ; espacements fixes, comme dans resume-ats.css.
// En-tête centré et texte justifié suivent les options d'apparence (classes is-header-centered
// et is-justified du template HTML).
function createStyles(settings) {
  const base = bodyTextPt(settings.fontScale, 'ats');
  const headerAlign = settings.headerAlign === 'center' ? 'center' : 'left';
  const textAlign = settings.textAlign === 'justify' ? 'justify' : 'left';
  return {
    page: {
      paddingTop: 14 * MM,
      paddingBottom: 14 * MM,
      paddingHorizontal: MARGIN_X,
      fontFamily: 'Helvetica',
      fontSize: base,
      lineHeight: 1.4,
      color: BODY_COLOR,
    },
    header: {
      paddingBottom: 3 * MM,
      borderBottomWidth: 1.1,
      borderBottomStyle: 'solid',
      borderBottomColor: CONTACT_COLOR,
    },
    name: { fontSize: base * 1.8, fontWeight: 'bold', lineHeight: 1.15, color: settings.textColor, textAlign: headerAlign },
    headline: {
      fontSize: base * 1.15,
      fontWeight: 'bold',
      lineHeight: 1.3,
      marginTop: 1.5,
      color: settings.primaryColor,
      textAlign: headerAlign,
    },
    contactRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: headerAlign === 'center' ? 'center' : 'flex-start',
      marginTop: 3.75,
      fontSize: base * 0.95,
      lineHeight: 1.45,
      color: CONTACT_COLOR,
    },
    contactItem: { flexDirection: 'row' },
    contactSeparator: { marginHorizontal: base * 0.28 },
    contactLink: { color: CONTACT_COLOR, textDecoration: 'none' },
    // Espacements avant une section ou un élément : des blocs vides plutôt que des marges.
    // À un saut de page, la part qui tient reste en bas de page et le bloc suivant démarre
    // en haut de la page suivante, comme à l'impression HTML. Une marge suivrait le bloc
    // reporté et décalerait tout le haut de page.
    sectionGap: { height: 4.5 * MM },
    sectionTitle: {
      fontSize: base * 1.15,
      fontWeight: 'bold',
      lineHeight: 1.3,
      color: settings.primaryColor,
      paddingBottom: 1.5,
      marginBottom: 4.5,
      borderBottomWidth: 0.75,
      borderBottomStyle: 'solid',
      borderBottomColor: RULE_COLOR,
    },
    objective: { fontSize: base * 1.05, lineHeight: 1.45, textAlign },
    entryGap: { height: 3.5 * MM },
    itemHeader: { marginBottom: 2.25 },
    itemTitle: { fontSize: base * 1.1, fontWeight: 'bold', lineHeight: 1.3, color: settings.textColor },
    itemMeta: { fontSize: base * 0.95, lineHeight: 1.35, marginTop: 0.75, color: META_COLOR },
    // Toujours une fontSize à côté d'un lineHeight : sinon react-pdf le calcule sur 18 pt.
    line: { fontSize: base, lineHeight: 1.45, marginTop: 1.5, textAlign },
    label: { fontWeight: 'bold' },
    link: { color: BODY_COLOR, textDecoration: 'none' },
    // Écart entre deux puces (comme li + li en CSS) : pas avant la première, sinon le PDF
    // devient plus haut que l'aperçu ATS et « Ajuster à 1 page » ne suffit plus.
    bulletRow: { flexDirection: 'row', marginTop: 1.5 },
    firstBulletRow: { flexDirection: 'row' },
    bulletMark: { width: BULLET_WIDTH, paddingLeft: 1.6 * MM },
    bulletText: { flex: 1, textAlign },
    // Place minimale sous un titre suivi d'un paragraphe sécable : deux lignes.
    twoLines: base * 1.05 * 1.45 * 2,
    // Largeur (en em) au-delà de laquelle un mot est coupé plutôt que de déborder : ligne la plus
    // étroite (une puce) rapportée au plus grand texte courant (titres, 1,15 × base), gras compris.
    maxWordEm: (A4_WIDTH - 2 * MARGIN_X - BULLET_WIDTH) / (base * 1.2),
  };
}

// « Objectifs : » en français (espace insécable), « Objectives: » en anglais.
const colon = (lang) => (lang === 'en' ? ':' : `${NBSP}:`);

// Lien sûr pour l'annotation PDF (ASCII uniquement).
function safeHref(href) {
  try {
    return encodeURI(decodeURI(href));
  } catch {
    return encodeURI(href);
  }
}

function Bullet({ children, styles, first = false }) {
  return (
    <View style={first ? styles.firstBulletRow : styles.bulletRow} wrap={false}>
      <Text style={styles.bulletMark}>•</Text>
      <Text style={styles.bulletText}>{children}</Text>
    </View>
  );
}

function LabeledLine({ label, lang, children, styles }) {
  return (
    <Text style={styles.line}>
      {label ? <Text style={styles.label}>{`${label}${colon(lang)} `}</Text> : null}
      {children}
    </Text>
  );
}

// ── Contenu des sections ─────────────────────────────────────────────────
// Chaque section produit des « entrées » : un en-tête facultatif et un corps.
// L'en-tête et la première ligne du corps ne sont jamais séparés par un saut de page.

// Intitulé, puis « Entreprise · Lieu · Période » : la période reste attachée au poste à l'extraction.
// null si rien d'affichable (ex. des champs ne contenant qu'un emoji).
function itemEntry(key, [first, second, ...rest], body, styles) {
  const heading = first || second;
  const meta = joinNonEmpty([first ? second : '', ...rest], SEP);
  if (!heading && !meta && !body.length) return null;
  // Sans corps, pas de marge sous l'en-tête : en CSS, elle se confond avec l'écart qui suit
  // (marges fusionnées) ; ici elle s'y ajouterait, et le PDF serait plus haut que l'aperçu.
  const header =
    heading || meta ? (
      <View style={body.length ? styles.itemHeader : undefined}>
        {heading ? <Text style={styles.itemTitle}>{heading}</Text> : null}
        {meta ? <Text style={styles.itemMeta}>{meta}</Text> : null}
      </View>
    ) : null;
  // spaced : écart de 3,5 mm avec l'élément précédent, même sans intitulé (comme .ats-item).
  return { key, header, body, spaced: true };
}

// La période ne se coupe pas en fin de ligne : « 01/2022 - 05/2024 » reste d'un seul tenant.
const unbroken = (value) => value.replace(/ /g, NBSP);

const bullets = (list, styles, prefix = '') =>
  list.map((item, i) => (
    <Bullet key={`${prefix}${i}`} styles={styles} first={i === 0}>
      {item}
    </Bullet>
  ));

function experienceEntries(list, { styles, text, texts }) {
  return list
    .filter((exp) => !isBlankItem(exp))
    .map((exp) =>
      itemEntry(
        exp.id,
        [text(exp.title), text(exp.company), text(exp.location), unbroken(text(exp.period))],
        bullets(texts(exp.details), styles),
        styles,
      ),
    )
    .filter(Boolean);
}

function educationEntries(list, { styles, labels, lang, text, texts }) {
  return list
    .filter(isShownItem)
    .map((edu) => {
      const body = bullets(texts(edu.details), styles, 'd');
      const objectives = texts(edu.objectives);
      if (objectives.length) {
        body.push(
          <LabeledLine key="objectives" label={labels.fields.objectives} lang={lang} styles={styles}>
            {objectives.join(', ')}
          </LabeledLine>,
        );
      }
      const tools = texts(edu.tools);
      if (tools.length) {
        body.push(
          <LabeledLine key="tools" label={labels.fields.tools} lang={lang} styles={styles}>
            {tools.join(', ')}
          </LabeledLine>,
        );
      }
      const linkText = text(prettyUrl(edu.link));
      if (linkText) {
        body.push(
          <LabeledLine key="link" label={labels.fields.programLink} lang={lang} styles={styles}>
            <Link src={safeHref(absoluteUrl(edu.link))} style={styles.link}>
              {linkText}
            </Link>
          </LabeledLine>,
        );
      }
      const fields = [edu.title, edu.school, edu.degree, edu.location].map(text).concat(unbroken(text(edu.period)));
      return itemEntry(edu.id, fields, body, styles);
    })
    .filter(Boolean);
}

function skillEntries(groups, { styles, lang, text, texts }) {
  return groups
    .filter((group) => !group.hidden)
    .map((group) => {
      const skills = texts(group.skills);
      if (!skills.length) return null;
      return {
        key: group.id,
        body: [
          <LabeledLine key="line" label={text(group.category)} lang={lang} styles={styles}>
            {skills.join(', ')}
          </LabeledLine>,
        ],
      };
    })
    .filter(Boolean);
}

// « Français : Langue maternelle · Anglais : C1 », comme dans le template HTML.
function languageEntries(languages, { styles, lang, text }) {
  const parts = languages
    .map((language) => {
      const name = text(language.name);
      const level = text(language.level);
      return name && level ? `${name}${colon(lang)} ${level}` : name || level;
    })
    .filter(Boolean);
  if (!parts.length) return [];
  return [{ key: 'languages', body: [<Text key="line" style={styles.line}>{parts.join(SEP)}</Text>] }];
}

function certificationEntries(certifications, { styles, text }) {
  return certifications
    .filter((cert) => !isBlankItem(cert))
    .map((cert) => {
      const line = joinNonEmpty([cert.name, cert.issuer, cert.date].map(text), SEP);
      return line ? { key: cert.id, body: [<Text key="line" style={styles.line}>{line}</Text>] } : null;
    })
    .filter(Boolean);
}

function customEntries(custom, { styles, texts }) {
  const body = bullets(texts(custom?.items), styles);
  return body.length ? [{ key: custom.id, body }] : [];
}

function profileEntries(objective, { styles, text }) {
  const paragraph = text(objective);
  if (!paragraph) return [];
  // Paragraphe sécable : il peut continuer sur la page suivante (2 lignes minimum de chaque côté).
  return [{ key: 'profile', splittable: true, body: [<Text key="p" style={styles.objective}>{paragraph}</Text>] }];
}

function sectionEntries(id, data, ctx) {
  switch (id) {
    case 'profile':
      return profileEntries(data.personalInfo.objective, ctx);
    case 'skills':
      return skillEntries(data.mainSkills, ctx);
    case 'experiences':
    case 'otherExperiences':
      return experienceEntries(data[id], ctx);
    case 'education':
      return educationEntries(data.education, ctx);
    case 'languages':
      return languageEntries(data.languages, ctx);
    case 'certifications':
      return certificationEntries(data.certifications, ctx);
    default:
      if (id.startsWith('custom:')) {
        return customEntries(data.customSections.find((c) => customSectionKey(c) === id), ctx);
      }
      return [];
  }
}

function Entry({ entry, styles }) {
  const [first, ...rest] = entry.body;
  return (
    <View>
      {entry.spaced ? <View style={styles.entryGap} /> : null}
      <View wrap={false}>
        {entry.header}
        {first}
      </View>
      {rest}
    </View>
  );
}

function Section({ title, entries, styles }) {
  const [first, ...others] = entries;
  const keepFirstLine = !first.splittable;
  return (
    <View>
      <View style={styles.sectionGap} />
      {/* Le titre reste toujours avec le début de son contenu. */}
      <View wrap={false} minPresenceAhead={keepFirstLine ? 0 : styles.twoLines}>
        {title ? <Text style={styles.sectionTitle}>{title}</Text> : null}
        {first.header}
        {keepFirstLine ? first.body[0] : null}
      </View>
      {keepFirstLine ? first.body.slice(1) : first.body}
      {others.map((entry) => (
        <Entry key={entry.key} entry={entry} styles={styles} />
      ))}
    </View>
  );
}

// ── En-tête ───────────────────────────────────────────────────────────────

function contactItems(personalInfo, socialLinks, text) {
  const list = [];
  const email = text(personalInfo.email);
  if (email) {
    list.push({ key: 'email', text: email, href: email.includes('@') ? safeHref(`mailto:${personalInfo.email.trim()}`) : '' });
  }
  const phone = text(personalInfo.phone);
  if (phone) {
    list.push({ key: 'phone', text: phone, href: telHref(personalInfo.phone) });
  }
  const location = text(personalInfo.location);
  if (location) list.push({ key: 'location', text: location, href: '' });
  // L'URL elle-même est affichée (et non le libellé) : elle doit rester lisible une fois imprimée.
  for (const link of socialLinks) {
    const url = text(prettyUrl(link.url));
    if (url) list.push({ key: link.id, text: url, href: safeHref(absoluteUrl(link.url)) });
  }
  return list;
}

// Chaque élément reste entier ; à la coupure de ligne, le séparateur termine la ligne.
function ContactLine({ list, styles }) {
  return (
    <View style={styles.contactRow}>
      {list.map((item, i) => (
        <View key={item.key} style={styles.contactItem}>
          {item.href ? (
            <Link src={item.href} style={styles.contactLink}>
              {item.text}
            </Link>
          ) : (
            <Text>{item.text}</Text>
          )}
          {i < list.length - 1 ? <Text style={styles.contactSeparator}>·</Text> : null}
        </View>
      ))}
    </View>
  );
}

function Header({ data, showLinks, styles, text }) {
  const name = text(data.personalInfo.name);
  const headline = text(data.personalInfo.title);
  const contacts = contactItems(data.personalInfo, showLinks ? data.socialLinks : [], text);
  if (!name && !headline && !contacts.length) return null;
  return (
    <View style={styles.header}>
      {name ? <Text style={styles.name}>{name}</Text> : null}
      {headline ? <Text style={styles.headline}>{headline}</Text> : null}
      {contacts.length ? <ContactLine list={contacts} styles={styles} /> : null}
    </View>
  );
}

export default function ResumePdfDocument({ data, settings, title }) {
  const styles = createStyles(settings);
  const lang = settings.lang;
  const text = (value) => pdfText(value, styles.maxWordEm);
  const texts = (values) => pdfTexts(clean(values), styles.maxWordEm);
  const ctx = { styles, lang, labels: labelsFor(lang), text, texts };
  const sections = visibleSections(data);
  const name = data.personalInfo.name.trim();

  return (
    <Document
      title={title || undefined}
      author={name || undefined}
      subject={joinNonEmpty(['Curriculum vitae', data.personalInfo.title], ' – ')}
      creator="CV Builder"
      language={lang}
    >
      <Page size="A4" style={styles.page}>
        {/* Les liens sont rendus dans la ligne de contact (si la section « Liens » est visible). */}
        <Header data={data} showLinks={sections.includes('links')} styles={styles} text={text} />
        {sections
          .filter((id) => id !== 'links')
          .map((id) => {
            const entries = sectionEntries(id, data, ctx);
            if (!entries.length) return null;
            const heading = text(sectionTitle(data, id, lang).toUpperCase());
            return <Section key={id} title={heading} entries={entries} styles={styles} />;
          })}
      </Page>
    </Document>
  );
}
