import { useState } from 'react'
import { Sparkles, PanelLeft, Type, Palette, Upload, Download, Printer, FileDown, FileText } from 'lucide-react'
import Resume from './components/Resume'
import ResumeATS from './components/ResumeATS'
import Editor from './components/Editor'
import ATSOptimizer from './components/ATSOptimizer'
import initialData from './data/resumeData.json'
import './App.css'

function App() {
  const [data, setData] = useState(initialData);
  const [fontScale, setFontScale] = useState(0.8);
  const [primaryColor, setPrimaryColor] = useState('#2563eb');
  const [sidebarBg, setSidebarBg] = useState('#f9fafb');
  const [textColor, setTextColor] = useState('#111827');
  const [showEditor, setShowEditor] = useState(true);
  const [atsMode, setAtsMode] = useState(false);
  const [showATSOptimizer, setShowATSOptimizer] = useState(false);

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPDF = () => {
    const element = document.querySelector('.resume-container');

    // Injecter les variables CSS directement pour que html2canvas les lise
    element.style.setProperty('--font-scale', fontScale);
    element.style.setProperty('--primary-color', primaryColor);
    element.style.setProperty('--sidebar-bg', sidebarBg);
    element.style.setProperty('--text-dark', textColor);

    const generatePDF = async () => {
      const SCALE     = 4;
      const PDF_W_MM  = 210;
      const PDF_H_MM  = 297;
      const MARGIN_MM = 10;

      // ── 1. Mesurer les bounds DOM avant le rendu canvas ──────────────────
      // On collecte top/bottom de chaque élément de contenu (CSS pixels relatifs
      // au container) pour savoir où il est safe de couper.
      const containerRect = element.getBoundingClientRect();
      const contentEls = element.querySelectorAll(
        'p, li, h1, h2, h3, .tag, .exp-details li, .sidebar-section, .experience-item, .formation-item'
      );
      const domBounds = Array.from(contentEls).map(el => {
        const r = el.getBoundingClientRect();
        return {
          top:    r.top    - containerRect.top,
          bottom: r.bottom - containerRect.top,
        };
      }).filter(b => b.bottom > 0);

      // ── 2. Générer le canvas ─────────────────────────────────────────────
      const canvas = await window.html2canvas(element, {
        scale: SCALE,
        useCORS: true,
        allowTaint: true,
        logging: false,
        imageTimeout: 0,
        backgroundColor: '#ffffff',
      });

      // ── 3. Convertir les bounds en pixels canvas ─────────────────────────
      const boundsCanvas = domBounds.map(b => ({
        top:    Math.round(b.top    * SCALE),
        bottom: Math.round(b.bottom * SCALE),
      }));

      // ── 4. Trouver le meilleur point de coupe (pas au milieu d'un élément) ─
      // Remonte depuis la coupe idéale jusqu'à trouver un espace libre.
      // Limite de recul = 20 mm pour ne pas créer de pages déséquilibrées.
      const pxPerMm = canvas.width / PDF_W_MM;
      const maxBacktrackPx = Math.round(20 * pxPerMm);

      const findSafeCut = (idealCutPx) => {
        if (idealCutPx >= canvas.height) return canvas.height;
        for (let y = idealCutPx; y > idealCutPx - maxBacktrackPx; y--) {
          const blocked = boundsCanvas.some(b => b.top < y && b.bottom > y);
          if (!blocked) return y;
        }
        return idealCutPx; // fallback : on coupe quand même
      };

      // ── 5. Générer les pages ─────────────────────────────────────────────
      const { jsPDF } = window.jspdf;
      const pdf = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });

      const fullPageHPx    = Math.round(PDF_H_MM  * pxPerMm);
      const marginPx       = Math.round(MARGIN_MM * pxPerMm);
      const page1ContentPx = Math.round((PDF_H_MM - MARGIN_MM)     * pxPerMm);
      const pageNContentPx = Math.round((PDF_H_MM - 2 * MARGIN_MM) * pxPerMm);

      const sidebarWidthPx = Math.round(canvas.width * 0.32);

      let srcY = 0;
      let page = 0;

      while (srcY < canvas.height) {
        if (page > 0) pdf.addPage();

        const isFirst    = page === 0;
        const destY      = isFirst ? 0 : marginPx;
        const nominalPx  = isFirst ? page1ContentPx : pageNContentPx;
        const safeCutPx  = findSafeCut(srcY + nominalPx);
        const srcH       = Math.min(safeCutPx - srcY, canvas.height - srcY);

        // Fond pleine page (sidebar + blanc)
        const slice = document.createElement('canvas');
        slice.width  = canvas.width;
        slice.height = fullPageHPx;
        const ctx = slice.getContext('2d');
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, slice.width, slice.height);
        ctx.fillStyle = sidebarBg;
        ctx.fillRect(0, 0, sidebarWidthPx, fullPageHPx);
        ctx.fillStyle = '#eeeeee';
        ctx.fillRect(sidebarWidthPx, 0, 1, fullPageHPx);

        // Contenu par-dessus
        ctx.drawImage(canvas, 0, srcY, canvas.width, srcH, 0, destY, canvas.width, srcH);

        pdf.addImage(slice.toDataURL('image/jpeg', 0.97), 'JPEG', 0, 0, PDF_W_MM, PDF_H_MM);

        srcY += srcH;
        page++;
      }

      pdf.save('mon_cv.pdf');
    };

    const loadScript = (src) =>
      new Promise((resolve) => {
        if (document.querySelector(`script[src="${src}"]`)) { resolve(); return; }
        const s = document.createElement('script');
        s.src = src;
        s.onload = resolve;
        document.head.appendChild(s);
      });

    Promise.all([
      window.html2canvas
        ? Promise.resolve()
        : loadScript('https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js'),
      window.jspdf
        ? Promise.resolve()
        : loadScript('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js'),
    ]).then(generatePDF);
  };

  const handleExport = () => {
    const jsonString = `data:text/json;chatset=utf-8,${encodeURIComponent(
      JSON.stringify(data, null, 2)
    )}`;
    const link = document.createElement("a");
    link.href = jsonString;
    link.download = "cv_data.json";
    link.click();
  };

  const handleImport = (e) => {
    const fileReader = new FileReader();
    fileReader.readAsText(e.target.files[0], "UTF-8");
    fileReader.onload = (e) => {
      try {
        const json = JSON.parse(e.target.result);
        setData(json);
      } catch (err) {
        alert("Erreur lors de la lecture du fichier JSON");
      }
    };
  };

  return (
    <div 
      className={`app-container ${showEditor ? 'with-editor' : ''}`} 
      style={{ 
        '--font-scale': fontScale,
        '--primary-color': primaryColor,
        '--sidebar-bg': sidebarBg,
        '--text-dark': textColor
      }}
    >
      <div className="controls no-print">

        {/* Brand */}
        <div className="ctrl-brand">
          <FileText size={16} />
          <span>CV Builder</span>
        </div>

        <span className="ctrl-sep" />

        {/* Groupe Vue */}
        <div className="ctrl-group">
          <span className="ctrl-group-label">Vue</span>
          <div className="ctrl-group-actions">
            <button
              onClick={() => setShowEditor(!showEditor)}
              className={`ctrl-btn ${showEditor ? 'active' : ''}`}
              title={showEditor ? "Masquer l'éditeur" : "Afficher l'éditeur"}
            >
              <PanelLeft size={14} />
              <span>Éditeur</span>
            </button>
            <button
              onClick={() => setAtsMode(!atsMode)}
              className={`ctrl-btn ${atsMode ? 'active' : ''}`}
              title="Mode ATS (Texte brut, sans icônes)"
            >
              <FileDown size={14} />
              <span>Mode ATS</span>
            </button>
            <div className="ctrl-slider">
              <Type size={13} className="ctrl-slider-icon" />
              <input
                id="fontScale"
                type="range"
                min="0.5"
                max="1.5"
                step="0.01"
                value={fontScale}
                onChange={(e) => setFontScale(parseFloat(e.target.value))}
              />
              <span className="ctrl-slider-val">{(fontScale * 100).toFixed(0)}%</span>
            </div>
          </div>
        </div>

        <span className="ctrl-sep" />

        {/* Groupe Thème */}
        <div className="ctrl-group">
          <span className="ctrl-group-label">Thème</span>
          <div className="ctrl-group-actions">
            <Palette size={14} className="ctrl-palette-icon" />
            <div className="color-pickers">
              <div className="color-item" title="Couleur primaire">
                <input type="color" value={primaryColor} onChange={(e) => setPrimaryColor(e.target.value)} />
              </div>
              <div className="color-item" title="Fond latéral">
                <input type="color" value={sidebarBg} onChange={(e) => setSidebarBg(e.target.value)} />
              </div>
              <div className="color-item" title="Couleur texte">
                <input type="color" value={textColor} onChange={(e) => setTextColor(e.target.value)} />
              </div>
            </div>
          </div>
        </div>

        <span className="ctrl-sep" />

        {/* Groupe Fichier */}
        <div className="ctrl-group">
          <span className="ctrl-group-label">Fichier</span>
          <div className="ctrl-group-actions">
            <input
              type="file"
              id="json-import"
              accept=".json"
              style={{ display: 'none' }}
              onChange={handleImport}
            />
            <button
              onClick={() => document.getElementById('json-import').click()}
              className="ctrl-btn"
              title="Importer un fichier JSON"
            >
              <Upload size={14} />
              <span>Import</span>
            </button>
            <button
              onClick={handleExport}
              className="ctrl-btn"
              title="Exporter les données en JSON"
            >
              <Download size={14} />
              <span>Export</span>
            </button>
          </div>
        </div>

        <span className="ctrl-sep" />

        {/* Groupe Export */}
        <div className="ctrl-group">
          <span className="ctrl-group-label">Export</span>
          <div className="ctrl-group-actions">
            <button onClick={handlePrint} className="ctrl-btn" title="Imprimer en A4">
              <Printer size={14} />
              <span>Impr.</span>
            </button>
            <button onClick={handleDownloadPDF} className="ctrl-btn-primary" title="Télécharger en PDF">
              <FileDown size={14} />
              <span>PDF</span>
            </button>
          </div>
        </div>

        {/* Spacer */}
        <div className="ctrl-spacer" />

        {/* IA — action principale */}
        <button
          onClick={() => setShowATSOptimizer(true)}
          className="ats-trigger-btn"
          title="Optimiser le CV pour une offre d'emploi via IA"
        >
          <Sparkles size={15} />
          Optimiser ATS
        </button>

      </div>

      {showATSOptimizer && (
        <ATSOptimizer
          data={data}
          setData={setData}
          onClose={() => setShowATSOptimizer(false)}
        />
      )}

      <div className="main-layout">
        {showEditor && (
          <Editor data={data} setData={setData} />
        )}
        {atsMode ? <ResumeATS data={data} /> : <Resume data={data} />}
      </div>
    </div>
  )
}

export default App
