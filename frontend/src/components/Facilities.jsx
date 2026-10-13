import React, { useState } from 'react';
import {
  Users, Accessibility, TriangleAlert, TrendingUp, SignpostBig, CreditCard, TicketCheck, Droplets,
  HeartPulse, Armchair, ArrowUpDown, MonitorPlay, Toilet, Tv, Megaphone, DoorOpen, Route, HandHelping,
  Info, LifeBuoy, Flame, FireExtinguisher, Map, Phone, Bell, Siren,
} from 'lucide-react';
import PageHeader from './PageHeader';
import { useI18n } from '../i18n';

const categories = [
  { id: 'passengers', icon: Users },
  { id: 'differently-abled', icon: Accessibility },
  { id: 'emergency', icon: TriangleAlert },
];

const facilitiesData = {
  passengers: [
    { key: 'escalators', icon: TrendingUp },
    { key: 'signage', icon: SignpostBig },
    { key: 'smartCard', icon: CreditCard },
    { key: 'tvm', icon: TicketCheck },
    { key: 'water', icon: Droplets },
    { key: 'firstAid', icon: HeartPulse },
    { key: 'seating', icon: Armchair },
    { key: 'lifts', icon: ArrowUpDown },
    { key: 'displays', icon: MonitorPlay },
    { key: 'washrooms', icon: Toilet },
    { key: 'tv', icon: Tv },
    { key: 'pa', icon: Megaphone },
  ],
  'differently-abled': [
    { key: 'wideGates', icon: DoorOpen },
    { key: 'tactile', icon: Route },
    { key: 'ramps', icon: TrendingUp },
    { key: 'wheelchairs', icon: Accessibility },
    { key: 'braille', icon: ArrowUpDown },
    { key: 'wheelchairSpace', icon: Accessibility },
    { key: 'accessibleWashrooms', icon: Toilet },
    { key: 'lowCounters', icon: Info },
    { key: 'assistance', icon: HandHelping },
  ],
  emergency: [
    { key: 'stopPlunger', described: true, icon: LifeBuoy },
    { key: 'tripSystem', described: true, icon: TriangleAlert },
    { key: 'fireAlarm', described: true, icon: Flame },
    { key: 'extinguishers', described: true, icon: FireExtinguisher },
    { key: 'hose', described: true, icon: Flame },
    { key: 'detrainment', described: true, icon: Route },
    { key: 'exitSignage', described: true, icon: SignpostBig },
    { key: 'evacuationMaps', described: true, icon: Map },
    { key: 'stretchers', described: true, icon: HeartPulse },
    { key: 'alarm', described: true, icon: Phone },
    { key: 'callPoint', described: true, icon: Bell },
    { key: 'smoke', described: true, icon: Siren },
  ],
};

const Facilities = () => {
  const { t } = useI18n();
  const [selected, setSelected] = useState('passengers');
  const isEmergency = selected === 'emergency';

  return (
    <div className="min-h-screen bg-surface-0 pb-10">
      <PageHeader title={t('fac.title')} subtitle={t('fac.subtitle')} />

      <div className="mx-auto mt-6 max-w-7xl px-5">
        <div className="flex flex-col gap-3 sm:flex-row" role="tablist" aria-label={t('fac.tabs')}>
          {categories.map(({ id, icon: Icon }) => {
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
                {t(`fac.cat.${id}`)}
              </button>
            );
          })}
        </div>

        <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {facilitiesData[selected].map(({ key, described, icon: Icon }) => (
            <li
              key={key}
              className={
                'flex items-start gap-4 rounded-lg border border-line-200 bg-surface-1 p-5 ' +
                (isEmergency ? 'border-l-4 border-l-alert-600' : '')
              }
            >
              <Icon strokeWidth={1.75} size={26} className={`shrink-0 ${isEmergency ? 'text-alert-600' : 'text-accent'}`} />
              <div>
                <h3 className="font-sans text-sm font-semibold leading-snug text-ink-900">{t(`fac.${key}`)}</h3>
                {described && <p className="mt-1 text-sm leading-relaxed text-ink-600">{t(`fac.${key}Text`)}</p>}
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default Facilities;
