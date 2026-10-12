import React, { useState } from 'react';
import {
  Users, Accessibility, TriangleAlert, TrendingUp, SignpostBig, CreditCard, TicketCheck, Droplets,
  HeartPulse, Armchair, ArrowUpDown, MonitorPlay, Toilet, Tv, Megaphone, DoorOpen, Route, HandHelping,
  Info, LifeBuoy, Flame, FireExtinguisher, Map, Phone, Bell, Siren,
} from 'lucide-react';
import PageHeader from './PageHeader';

const categories = [
  { id: 'passengers', title: 'Passengers', icon: Users },
  { id: 'differently-abled', title: 'Differently abled', icon: Accessibility },
  { id: 'emergency', title: 'Emergency', icon: TriangleAlert },
];

const facilitiesData = {
  passengers: [
    { name: 'Escalators', icon: TrendingUp },
    { name: 'Guiding signage', icon: SignpostBig },
    { name: 'Contactless smart card', icon: CreditCard },
    { name: 'Token vending & card recharge machines', icon: TicketCheck },
    { name: 'Drinking water', icon: Droplets },
    { name: 'First aid assistance', icon: HeartPulse },
    { name: 'Passenger seating areas', icon: Armchair },
    { name: 'Lifts & elevators', icon: ArrowUpDown },
    { name: 'Information display boards', icon: MonitorPlay },
    { name: 'Washrooms', icon: Toilet },
    { name: 'Digital TV screens', icon: Tv },
    { name: 'Public announcement system', icon: Megaphone },
  ],
  'differently-abled': [
    { name: 'Wide automatic fare gates', icon: DoorOpen },
    { name: 'Tactile path for visually impaired', icon: Route },
    { name: 'Passenger ramps', icon: TrendingUp },
    { name: 'Wheelchair availability at stations', icon: Accessibility },
    { name: 'Braille call buttons & handrails in lifts', icon: ArrowUpDown },
    { name: 'Reserved wheelchair space in trains', icon: Accessibility },
    { name: 'Accessible washrooms', icon: Toilet },
    { name: 'Low-height ticket counters', icon: Info },
    { name: 'Assistance staff support', icon: HandHelping },
  ],
  emergency: [
    { name: 'Emergency stop plunger', description: 'Provided on platforms to stop trains approaching the station.', icon: LifeBuoy },
    { name: 'Emergency trip system', description: 'Provided on platforms to cut off the 750 V power supply during an emergency.', icon: TriangleAlert },
    { name: 'Fire alarm & suppression system', description: 'Detects and deals with fire.', icon: Flame },
    { name: 'Fire extinguishers', description: 'Portable extinguishers at stations and inside trains for small fires.', icon: FireExtinguisher },
    { name: 'Fire hose cabinets', description: 'Available at stations to handle big fires.', icon: Flame },
    { name: 'Emergency detrainment ramp', description: 'Available in trains to evacuate passengers safely.', icon: Route },
    { name: 'Emergency exit signage', description: 'Illuminated signage that guides passengers to exits.', icon: SignpostBig },
    { name: 'Emergency evacuation maps', description: 'Evacuation route maps at prominent locations in stations.', icon: Map },
    { name: 'Medical stretchers', description: 'Available at stations for emergency rescue of passengers.', icon: HeartPulse },
    { name: 'Passenger emergency alarm & helpline', description: 'An alarm in trains and a helpline at stations to reach officials during an emergency.', icon: Phone },
    { name: 'Manual call point', description: 'Triggers the station alarm in case of fire.', icon: Bell },
    { name: 'Smoke detectors', description: 'Installed at various locations to detect early signs of fire.', icon: Siren },
  ],
};

const Facilities = () => {
  const [selected, setSelected] = useState('passengers');
  const isEmergency = selected === 'emergency';

  return (
    <div className="min-h-screen bg-surface-0 pb-10">
      <PageHeader title="Facilities" subtitle="Passenger amenities available across the metro network" />

      <div className="mx-auto mt-6 max-w-7xl px-5">
        <div className="flex flex-col gap-3 sm:flex-row" role="tablist" aria-label="Facility categories">
          {categories.map(({ id, title, icon: Icon }) => {
            const isActive = selected === id;
            return (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={() => setSelected(id)}
                className={
                  'flex items-center gap-3 rounded-md border px-4 py-3 text-left text-sm font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 ' +
                  (isActive ? 'border-accent bg-navy-900 text-white' : 'border-line-200 bg-surface-1 text-ink-900 hover:border-accent')
                }
              >
                <Icon strokeWidth={1.75} size={20} />
                {title}
              </button>
            );
          })}
        </div>

        <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {facilitiesData[selected].map(({ name, description, icon: Icon }) => (
            <li
              key={name}
              className={
                'flex items-start gap-4 rounded-lg border border-line-200 bg-surface-1 p-5 ' +
                (isEmergency ? 'border-l-4 border-l-alert-600' : '')
              }
            >
              <Icon strokeWidth={1.75} size={26} className={`shrink-0 ${isEmergency ? 'text-alert-600' : 'text-accent'}`} />
              <div>
                <h3 className="font-sans text-sm font-semibold leading-snug text-ink-900">{name}</h3>
                {description && <p className="mt-1 text-sm leading-relaxed text-ink-600">{description}</p>}
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default Facilities;
