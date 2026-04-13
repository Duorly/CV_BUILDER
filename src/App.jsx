import { useState } from 'react'
import { Sparkles } from 'lucide-react'
import Resume from './components/Resume'
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
  const [showATSOptimizer, setShowATSOptimizer] = useState(false);

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPDF = () => {
    const element = document.querySelector('.resume-container');
    
    // Inject current variable values DIRECTLY into the element style so html2canvas sees them
    element.style.setProperty('--font-scale', fontScale);
    element.style.setProperty('--primary-color', primaryColor);
    element.style.setProperty('--sidebar-bg', sidebarBg);
    element.style.setProperty('--text-dark', textColor);

    const opt = {
      margin: 0,
      filename: 'mon_cv.pdf',
      image: { type: 'png', quality: 1 },
      html2canvas: { 
        scale: 5, 
        useCORS: true,
        letterRendering: true,
        allowTaint: true,
        logging: false,
        imageTimeout: 0
      },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };

    // Charger dynamiquement html2pdf si non présent
    const generate = (lib) => {
      lib().set(opt).from(element).save().then(() => {
        // Optionnel: nettoyer les styles injectés si nécessaire
      });
    };

    if (window.html2pdf) {
      generate(window.html2pdf);
    } else {
      const script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js';
      script.onload = () => {
        generate(window.html2pdf);
      };
      document.head.appendChild(script);
    }
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
        <div className="control-group">
          <label htmlFor="fontScale">Taille : {(fontScale * 100).toFixed(0)}%</label>
          <input 
            id="fontScale"
            type="range" 
            min="0.5" 
            max="1.5" 
            step="0.01" 
            value={fontScale} 
            onChange={(e) => setFontScale(parseFloat(e.target.value))} 
          />
        </div>

        <div className="control-group mini">
          <label>Couleurs</label>
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

        <div className="action-buttons">
          <input
            type="file"
            id="json-import"
            accept=".json"
            style={{ display: 'none' }}
            onChange={handleImport}
          />
          <button onClick={() => document.getElementById('json-import').click()} className="secondary-btn icon-btn" title="Importer un fichier JSON">
            <span>Importer JSON</span>
          </button>
          
          <button onClick={handleExport} className="secondary-btn icon-btn" title="Exporter les données en JSON">
             <span>Exporter JSON</span>
          </button>
        </div>

        <button onClick={() => setShowEditor(!showEditor)} className="secondary-btn">
          {showEditor ? 'Masquer éditeur' : 'Afficher éditeur'}
        </button>

        <button onClick={handlePrint} className="secondary-btn">
          Impression A4
        </button>

        <button onClick={handleDownloadPDF} className="print-btn">
          Direct PDF
        </button>

        <button
          onClick={() => setShowATSOptimizer(true)}
          className="ats-trigger-btn"
          title="Optimiser le CV pour une offre d'emploi via IA"
        >
          <Sparkles size={15} />
          Optimiser pour l'offre
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
        <Resume data={data} />
      </div>
    </div>
  )
}

export default App
