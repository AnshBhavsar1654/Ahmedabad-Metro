import React, { useState } from 'react';
import { FaUsers, FaExclamationTriangle, FaDoorOpen, FaHandsHelping, FaFire, FaLifeRing, FaRoute, FaPhoneAlt} from 'react-icons/fa';
import { FaSortAmountUpAlt, FaSortAmountDownAlt, FaMapSigns, FaIdCard, FaTicketAlt, FaTint, FaMedkit, FaChair, FaInfoCircle, FaToilet, FaUserFriends, FaTv, FaWheelchair} from "react-icons/fa";
import { MdElevator, MdOutlineSmartDisplay } from "react-icons/md";
import { GiCardExchange } from "react-icons/gi";
import { FaBell} from 'react-icons/fa';
import '../styles/facilities.css';

const Facilities = () => {
  const [selectedCategory, setSelectedCategory] = useState('passengers');

  const categories = [
    {
      id: 'passengers',
      title: 'Facilities for Passengers',
      icon: <FaUsers />,
      color: '#4f46e5'
    },
    {
      id: 'differently-abled',
      title: 'Facilities for Differently Abled',
      icon: <FaWheelchair />,
      color: '#059669'
    },
    {
      id: 'emergency',
      title: 'Emergency Facilities',
      icon: <FaExclamationTriangle />,
      color: '#dc2626'
    }
  ];

  const facilitiesData = {
    passengers: [
      { name: "Escalators", icon: <FaSortAmountUpAlt /> }, // Upward movement
      { name: "Guiding Signage", icon: <FaMapSigns /> },
      { name: "Contactless Smart Card", icon: <FaIdCard /> },
      { name: "Token Vending & Card Recharge Machines", icon: <GiCardExchange /> },
      { name: "Drinking Water", icon: <FaTint /> },
      { name: "First Aid Assistance", icon: <FaMedkit /> },
      { name: "Passenger Seating Areas", icon: <FaChair /> },
      { name: "Lifts & Elevators", icon: <MdElevator /> },
      { name: "Information Display Boards", icon: <MdOutlineSmartDisplay /> },
      { name: "Washrooms", icon: <FaToilet /> }

    ],
    'differently-abled': [
      { name: "Wide Automatic Fare Gates", icon: <FaDoorOpen /> },
      { name: "Tactile Path for Visually Impaired", icon: <FaRoute /> },
      { name: "Passenger Ramps", icon: <FaHandsHelping /> },
      { name: "Wheelchair Availability at Stations", icon: <FaWheelchair /> },
      { name: "Braille Call Buttons & Handrails in Lifts", icon: <FaSortAmountUpAlt /> },
      { name: "Reserved Wheelchair Space in Trains", icon: <FaWheelchair /> },
      { name: "Accessible Washrooms", icon: <FaHandsHelping /> },
      { name: "Low Height Ticket Counters", icon: <FaInfoCircle /> }
    ],
    emergency: [
      {
        facility: "Emergency Stop Plunger",
        description: "It is provided at platforms to stop trains approaching stations.",
        icon: <FaLifeRing />
      },
      {
        facility: "Emergency Trip System",
        description: "It is provided at Platforms to cut off 750 V Power supply during emergency.",
        icon: <FaExclamationTriangle />
      },
      {
        facility: "Fire Alarm & Suppression System",
        description: "Fire Alarm & Suppression system is available to detect and deal with Fire.",
        icon: <FaFire />
      },
      {
        facility: "Fire Extinguishers",
        description: "Portable Fire Extinguishers are available at Stations & inside trains to handle small fire.",
        icon: <FaFire />
      },
      {
        facility: "Fire Hose Cabinets",
        description: "Fire Hose cabinet is available at stations to handle big fires.",
        icon: <FaFire />
      },
      {
        facility: "Emergency Detrainment Ramp",
        description: "It is available in trains to evacuate passengers safely during emergency.",
        icon: <FaRoute />
      },
      {
        facility: "Emergency Exit Signage",
        description: "Illuminated signage to guide passengers towards exits during emergencies.",
        icon: <FaMapSigns />
      },
      {
        facility: "Emergency Evacuation Maps",
        description: "Evacuation route maps provided at prominent locations in stations.",
        icon: <FaRoute />
      },
      {
        facility: "Medical Stretchers",
        description: "Stretcher is available at stations for emergency rescue of passengers.",
        icon: <FaMedkit />
      },
      {
        facility: "Passenger Emergency Alarm & Passenger Helpline",
        description: "Passenger Emergency Alarm is provided in trains & Passenger helpline is provided at stations for passengers to communicate with officials during emergency.",
        icon: <FaPhoneAlt />
      },
      {
        facility: "Manual Call Point",
        description: "Manual Call Point is provided to trigger alarm in station in case of Fire.",
        icon: <FaBell />
      }
    ]
  };

  const renderFacilityCards = () => {
    if (selectedCategory === 'emergency') {
      return (
        <div className="emergency-grid">
          {facilitiesData.emergency.map((item, index) => (
            <div key={index} className="emergency-card">
              <div className="emergency-icon">
                {item.icon}
              </div>
              <div className="emergency-content">
                <h3 className="emergency-title">{item.facility}</h3>
                <p className="emergency-description">{item.description}</p>
              </div>
            </div>
          ))}
        </div>
      );
    }

    return (
      <div className="facilities-grid">
        {facilitiesData[selectedCategory].map((facility, index) => (
          <div key={index} className="facility-card">
            <div className="facility-icon">
              {facility.icon}
            </div>
            <div className="facility-name">{facility.name}</div>
          </div>
        ))}
      </div>
    );
  };

  const getCurrentCategory = () => {
    return categories.find(cat => cat.id === selectedCategory);
  };

  return (
    <div className="facilities-container">
      {/* Header Section */}
      <div className="facilities-header">
        <h1>Facilities at Ahmedabad Metro</h1>
        <p>Explore the various passenger amenities available across our metro network</p>
      </div>

      {/* Category Selection Menu */}
      <div className="category-menu">
        {categories.map((category) => (
          <button
            key={category.id}
            className={`category-btn ${selectedCategory === category.id ? 'active' : ''}`}
            onClick={() => setSelectedCategory(category.id)}
            style={{
              '--category-color': category.color
            }}
          >
            <span className="category-icon">{category.icon}</span>
            <span className="category-title">{category.title}</span>
          </button>
        ))}
      </div>

      <section className="facilities-section">
        {renderFacilityCards()}
      </section>
    </div>
  );
};

export default Facilities;