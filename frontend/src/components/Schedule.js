import React, { useState } from 'react';
import '../styles/schedule.css';

const Schedule = () => {
  const [isZoomed, setIsZoomed] = useState(false);
  
  const scheduleImage = "https://www.gujaratmetrorail.com/ahmedabad/wp-content/uploads/HomePageImage/Revised-Time-Table-w.e.f-13.05.2025.jpg";
  
  const toggleZoom = () => {
    setIsZoomed(!isZoomed);
  };

  return (
    <div className="schedule-container">
      <div className="schedule-header">
        <div className="header-content">
          <h1>Ahmedabad Metro Schedule</h1>
        </div>
        <div className="schedule-icon">
          <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
            <line x1="16" y1="2" x2="16" y2="6"></line>
            <line x1="8" y1="2" x2="8" y2="6"></line>
            <line x1="3" y1="10" x2="21" y2="10"></line>
          </svg>
        </div>
      </div>
      
      <div className="schedule-actions">
        <button className={`zoom-btn ${isZoomed ? 'active' : ''}`} onClick={toggleZoom}>
          {isZoomed ? (
            <>
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8"></circle>
                <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                <line x1="8" y1="11" x2="14" y2="11"></line>
              </svg>
              Zoom Out
            </>
          ) : (
            <>
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8"></circle>
                <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                <line x1="11" y1="8" x2="11" y2="14"></line>
                <line x1="8" y1="11" x2="14" y2="11"></line>
              </svg>
              Zoom In
            </>
          )}
        </button>
        
        <div className="effective-date">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"></circle>
            <polyline points="12 6 12 12 16 14"></polyline>
          </svg>
          Effective from 13th May 2025
        </div>
      </div>
      
      <div className={`schedule-image-container ${isZoomed ? 'zoomed' : ''}`}>
        <img 
          src={scheduleImage} 
          alt="Ahmedabad Metro Schedule" 
          className="schedule-image"
        />
      </div>
    </div>
  );
};

export default Schedule;