import React from 'react';
import { MapPin, Phone, Mail, Clock } from 'lucide-react';
import '../styles/contact.css';

const Contact = () => (
  <div className="contact-container">
    <div className="contact-header">
      <div className="header-content">
        <h1>Contact Ahmedabad Metro</h1>
        <p>Get in touch with us for inquiries, feedback, or assistance</p>
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

    <div className="contact-grid">
      <div className="contact-section">
        <h2>
          <div className="icon-wrapper">
            <MapPin className="section-icon" />
          </div>
          Corporate Office
        </h2>
        <div className="contact-card">
          <p className="company-name">Gujarat Metro Rail Corporation (GMRC) Limited</p>
          <p className="cin">CIN NO. U60200GJ20105GC059CO407</p>
          <div className="contact-info">
            <MapPin className="icon" />
            <span>Block No. 1, First Floor, Karmayogi Bhavan, Sector 10/A, Gandhinagar – 382010</span>
          </div>
          <div className='map-link'>
            <a href='https://maps.app.goo.gl/VYHpGS55k5hDJ5fL9' target='_blank' rel="noopener noreferrer">
              View on Google Maps
            </a>
          </div>
        </div>
      </div>

      <div className="contact-section">
        <h2>
          <div className="icon-wrapper">
            <Phone className="section-icon" />
          </div>
          Contact Information
        </h2>
        <div className="contact-card">
          <h3>Passenger Correspondence</h3>
          <div className="contact-info">
            <Phone className="icon" />
            <span>+91-79-22960123</span>
          </div>
          <div className="contact-info">
            <Mail className="icon" />
            <a href="mailto:care@gujaratmetrorail.com">care@gujaratmetrorail.com</a>
          </div>
        </div>

        <div className="contact-card">
          <h3>General Correspondence</h3>
          <div className="contact-info">
            <Phone className="icon" />
            <span>+91-79-23248572</span>
          </div>
          <div className="contact-info">
            <Mail className="icon" />
            <a href="mailto:info@gujaratmetrorail.com">info@gujaratmetrorail.com</a>
          </div>
        </div>
      </div>

      <div className="contact-section">
        <h2>
          <div className="icon-wrapper">
            <Clock className="section-icon" />
          </div>
          Lost & Found
        </h2>
        <div className="contact-card">
          <div className="contact-info">
            <MapPin className="icon" />
            <span>Lost & Found Office, Apparel Park Depot</span>
          </div>
          <div className="contact-info">
            <Phone className="icon" />
            <span>079-22960123</span>
          </div>
          <div className="contact-info">
            <Mail className="icon" />
            <a href="mailto:care@gujaratmetrorail.com">care@gujaratmetrorail.com</a>
          </div>
          <div className="contact-info">
            <Clock className="icon" />
            <span>Office timing: 10:30 to 18:10 hrs</span>
          </div>

          <div className="important-info">
            <h4>Important Information</h4>
            <ul>
              <li>Passengers who have lost an article in GMRCL premises or in trains can report at any station, or directly mail/call Customer Care with all details including address and contact numbers</li>
              <li>All perishable food items and soiled items will be discarded at stations</li>
              <li>Passengers claiming lost items must bring a valid government ID with address</li>
              <li>Unclaimed items will be disposed of after six months</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  </div>
);

export default Contact;
