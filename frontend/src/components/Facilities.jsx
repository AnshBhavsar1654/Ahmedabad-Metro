import React, { useState } from 'react';
import {
  FaUsers, FaExclamationTriangle, FaDoorOpen, FaHandsHelping, FaFire,
  FaLifeRing, FaRoute, FaPhoneAlt, FaSortAmountUpAlt,
  FaMapSigns, FaIdCard, FaTint, FaMedkit, FaChair,
  FaInfoCircle, FaToilet, FaUserFriends, FaTv, FaWheelchair, FaBell
} from 'react-icons/fa';
import { MdElevator, MdOutlineSmartDisplay } from 'react-icons/md';
import { GiCardExchange } from 'react-icons/gi';

const Facilities = () => {
  const [selectedCategory, setSelectedCategory] = useState('passengers');

  const categories = [
    {
      id: 'passengers',
      title: 'Facilities for Passengers',
      icon: <FaUsers />,
      cssClass: 'passengers'
    },
    {
      id: 'differently-abled',
      title: 'Facilities for Differently Abled',
      icon: <FaWheelchair />,
      cssClass: 'differently-abled'
    },
    {
      id: 'emergency',
      title: 'Emergency Facilities',
      icon: <FaExclamationTriangle />,
      cssClass: 'emergency'
    }
  ];

  const facilitiesData = {
    passengers: [
      { name: "Escalators", icon: <FaSortAmountUpAlt /> },
      { name: "Guiding Signage", icon: <FaMapSigns /> },
      { name: "Contactless Smart Card", icon: <FaIdCard /> },
      { name: "Token Vending & Card Recharge Machines", icon: <GiCardExchange /> },
      { name: "Drinking Water", icon: <FaTint /> },
      { name: "First Aid Assistance", icon: <FaMedkit /> },
      { name: "Passenger Seating Areas", icon: <FaChair /> },
      { name: "Lifts & Elevators", icon: <MdElevator /> },
      { name: "Information Display Boards", icon: <MdOutlineSmartDisplay /> },
      { name: "Washrooms", icon: <FaToilet /> },
      // ✅ New additions
      { name: "Digital TV Screens", icon: <FaTv /> },
      { name: "Public Announcement System", icon: <FaBell /> }
    ],
    'differently-abled': [
      { name: "Wide Automatic Fare Gates", icon: <FaDoorOpen /> },
      { name: "Tactile Path for Visually Impaired", icon: <FaRoute /> },
      { name: "Passenger Ramps", icon: <FaHandsHelping /> },
      { name: "Wheelchair Availability at Stations", icon: <FaWheelchair /> },
      { name: "Braille Call Buttons & Handrails in Lifts", icon: <FaSortAmountUpAlt /> },
      { name: "Reserved Wheelchair Space in Trains", icon: <FaWheelchair /> },
      { name: "Accessible Washrooms", icon: <FaHandsHelping /> },
      { name: "Low Height Ticket Counters", icon: <FaInfoCircle /> },
      // ✅ New addition
      { name: "Assistance Staff Support", icon: <FaUserFriends /> }
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
      },
      // ✅ New addition
      {
        facility: "Smoke Detectors",
        description: "Installed at various locations to detect early signs of fire.",
        icon: <FaFire />
      }
    ]
  };

  const renderFacilityCards = () => {
    if (selectedCategory === 'emergency') {
      return (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {facilitiesData.emergency.map((item, index) => (
            <div
              key={index}
              className="relative overflow-hidden rounded-2xl bg-white border border-slate-100 shadow-sm p-5 transition hover:-translate-y-1 hover:shadow-md"
            >
              <div className="absolute left-0 top-0 h-full w-1 bg-gradient-to-b from-red-600 to-red-800" />
              <div className="text-red-600 text-3xl mb-3">{item.icon}</div>
              <div>
                <h3 className="font-bold text-slate-900 mb-2">{item.facility}</h3>
                <p className="text-sm text-slate-600 leading-relaxed">{item.description}</p>
              </div>
            </div>
          ))}
        </div>
      );
    }

    return (
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {facilitiesData[selectedCategory].map((facility, index) => (
          <div
            key={index}
            className="relative overflow-hidden rounded-2xl bg-white border border-slate-100 shadow-sm p-5 flex items-center gap-4 transition hover:-translate-y-1 hover:shadow-md"
          >
            <div className="absolute left-0 top-0 h-full w-1 bg-gradient-to-b from-brand-500 to-brand-800" />
            <div className="text-brand-600 text-3xl min-w-12 flex items-center justify-center">
              {facility.icon}
            </div>
            <div className="font-semibold text-slate-700 leading-snug">{facility.name}</div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="mx-auto max-w-6xl px-5 pb-10">
      <div className="rounded-2xl bg-gradient-to-br from-brand-900 to-brand-700 text-white shadow-[0_10px_30px_rgba(26,42,108,0.2)] px-6 py-6 md:px-10 md:py-8">
        <h1 className="text-2xl md:text-[2.2rem] font-bold tracking-tight">Facilities at Ahmedabad Metro</h1>
        <p className="mt-2 text-white/90 max-w-2xl">Explore the various passenger amenities available across our metro network</p>
      </div>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-stretch sm:gap-4">
        {categories.map((category) => {
          const isActive = selectedCategory === category.id;
          const activeColors =
            category.id === 'passengers'
              ? 'bg-indigo-600 border-indigo-600'
              : category.id === 'differently-abled'
                ? 'bg-emerald-600 border-emerald-600'
                : 'bg-red-600 border-red-600';

          const hoverBorder =
            category.id === 'passengers'
              ? 'hover:border-indigo-600'
              : category.id === 'differently-abled'
                ? 'hover:border-emerald-600'
                : 'hover:border-red-600';

          return (
            <button
              key={category.id}
              type="button"
              className={
                `flex items-center gap-3 rounded-2xl border-2 px-4 py-3 text-left transition shadow-sm ` +
                (isActive
                  ? `${activeColors} text-white shadow-md`
                  : `bg-white border-slate-200 text-slate-800 hover:-translate-y-0.5 hover:shadow-md ${hoverBorder}`)
              }
              onClick={() => setSelectedCategory(category.id)}
            >
              <span className={isActive ? 'text-2xl' : 'text-2xl text-slate-700'}>{category.icon}</span>
              <span className="font-semibold text-sm sm:text-base leading-snug">{category.title}</span>
            </button>
          );
        })}
      </div>

      <section className="mt-8">
        {renderFacilityCards()}
      </section>
    </div>
  );
};

export default Facilities;