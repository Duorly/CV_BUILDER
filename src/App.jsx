import { useState } from 'react'
import Resume from './components/Resume'
import './App.css'

function App() {
  const [fontScale, setFontScale] = useState(0.8);
  const [primaryColor, setPrimaryColor] = useState('#2563eb');
  const [sidebarBg, setSidebarBg] = useState('#f9fafb');
  const [textColor, setTextColor] = useState('#111827');

  const handlePrint = () => {
    window.print();
  };

  return (
    <div 
      className="app-container" 
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

        <button onClick={handlePrint} className="print-btn">
          Exporter en PDF
        </button>
      </div>
      
      <Resume />
    </div>
  )
}

export default App
