import React, { useState } from 'react';
import '../App.css';
import '../styles/station-map.css';

const Stations = () => {
  const [activeTab, setActiveTab] = useState('map');
  const [showInfo, setShowInfo] = useState(true);

  const handleDownloadPDF = (filePath, fileName) => {
    const link = document.createElement('a');
    link.href = filePath;
    link.download = fileName;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="stations-container">
      <div className="stations-header">
        <div className="header-content">
          <h1>Ahmedabad Metro Map</h1>
          <p>Interactive map of all metro stations and lines</p>
        </div>
        <div className="metro-icon">
          <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="2" y="2" width="20" height="16" rx="2" />
            <path d="M12 18v-6" />
            <circle cx="8.5" cy="10.5" r="1.5" />
            <circle cx="15.5" cy="10.5" r="1.5" />
            <path d="M6 22h12" />
          </svg>
        </div>
      </div>
      
      <div className="stations-controls">
        <button 
          className={`info-toggle ${showInfo ? 'active' : ''}`}
          onClick={() => setShowInfo(!showInfo)}
        >
          {showInfo ? 'Hide Info' : 'Show Info'}
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="12" y1="16" x2="12" y2="12"></line>
            <line x1="12" y1="8" x2="12.01" y2="8"></line>
          </svg>
        </button>

        <div className="download-buttons">
          <button 
            className="download-btn"
            onClick={() => handleDownloadPDF('/Route.pdf', 'Ahmedabad_Metro_Route_Guide.pdf')}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
              <polyline points="7,10 12,15 17,10"></polyline>
              <line x1="12" y1="15" x2="12" y2="3"></line>
            </svg>
            Download Route Guide
          </button>

          <button 
            className="download-btn"
            onClick={() => handleDownloadPDF('/Map.pdf', 'Ahmedabad_Metro_Map.pdf')}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
              <polyline points="7,10 12,15 17,10"></polyline>
              <line x1="12" y1="15" x2="12" y2="3"></line>
            </svg>
            Download Metro Map
          </button>
        </div>
      </div>
      
      {showInfo && (
        <div className="map-info">
          <div className="info-card">
            <h3>Metro Lines</h3>
            <div className="metro-lines">
              <div className="line-info">
                <div className="line-color" style={{ backgroundColor: '#3498db' }}></div>
                <div>Line 1: Vastral Gam to Thaltej Gam (EW Corridor)</div>
              </div>
              <div className="line-info">
                <div className="line-color" style={{ backgroundColor: '#c0392b' }}></div>
                <div>Line 2: APMC to Motera Stadium (NS Corridor)</div>
              </div>
              <div className="line-info">
                <div className="line-color" style={{ backgroundColor: '#ffd700' }}></div>
                <div>Line 3: Motera Stadium to Mahatma Mandir (Corridor-1)</div>
              </div>
              <div className="line-info">
                <div className="line-color" style={{ backgroundColor: '#8e44ad' }}></div>
                <div>Line 4: GNLU to GIFT City (Corridor-2)</div>
              </div>
            </div>
          </div>
        </div>
      )}
      
      <div className="map-container">
        <iframe
          src="https://www.google.com/maps/d/u/0/embed?mid=1OiBaXz-gpGhD-bGCv55xJBy-mz6O7R0"
          width="100%"
          height="600"
          style={{ border: 0 }}
          allowFullScreen=""
          loading="lazy"
          title="Ahmedabad Metro Map"
        ></iframe>
      </div>
    </div>
  );
};

export default Stations;
