import React from 'react';
import { MapPin, Phone, Mail, Clock } from 'lucide-react';

const Contact = () => (
  <div className="mx-auto max-w-6xl px-5 pb-10">
    <div className="rounded-2xl bg-gradient-to-br from-brand-900 to-brand-700 text-white shadow-[0_10px_30px_rgba(26,42,108,0.2)] px-6 py-6 md:px-10 md:py-8 flex items-center justify-between gap-6">
      <div>
        <h1 className="text-2xl md:text-[2.2rem] font-bold tracking-tight">Contact Ahmedabad Metro</h1>
        <p className="mt-2 text-white/90 max-w-2xl">Get in touch with us for inquiries, feedback, or assistance</p>
      </div>
      <div className="hidden md:flex h-16 w-16 items-center justify-center rounded-full bg-white/15">
        <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="2" width="20" height="16" rx="2" />
          <path d="M12 18v-6" />
          <circle cx="8.5" cy="10.5" r="1.5" />
          <circle cx="15.5" cy="10.5" r="1.5" />
          <path d="M6 22h12" />
        </svg>
      </div>
    </div>

    <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-full bg-white shadow flex items-center justify-center border border-slate-100">
            <MapPin className="h-6 w-6 text-brand-600" />
          </div>
          <h2 className="text-lg font-bold text-slate-900">Corporate Office</h2>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="font-bold text-slate-900">Gujarat Metro Rail Corporation (GMRC) Limited</p>
          <p className="mt-1 text-sm text-slate-500">CIN NO. U60200GJ20105GC059CO407</p>

          <div className="mt-4 flex items-start gap-3 text-slate-700">
            <MapPin className="h-5 w-5 text-brand-600 mt-0.5" />
            <span className="text-sm leading-relaxed">Block No. 1, First Floor, Karmayogi Bhavan, Sector 10/A, Gandhinagar – 382010</span>
          </div>

          <a
            href="https://maps.app.goo.gl/VYHpGS55k5hDJ5fL9"
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 inline-block text-sm font-semibold text-brand-800 underline"
          >
            View on Google Maps
          </a>
        </div>
      </div>

      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-full bg-white shadow flex items-center justify-center border border-slate-100">
            <Phone className="h-6 w-6 text-brand-600" />
          </div>
          <h2 className="text-lg font-bold text-slate-900">Contact Information</h2>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="text-base font-bold text-slate-900 border-b border-slate-200 pb-3">Passenger Correspondence</h3>
          <div className="mt-4 space-y-3 text-sm text-slate-700">
            <div className="flex items-start gap-3">
              <Phone className="h-5 w-5 text-brand-600 mt-0.5" />
              <span>+91-79-22960123</span>
            </div>
            <div className="flex items-start gap-3">
              <Mail className="h-5 w-5 text-brand-600 mt-0.5" />
              <a className="font-semibold text-brand-600 hover:underline" href="mailto:care@gujaratmetrorail.com">care@gujaratmetrorail.com</a>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="text-base font-bold text-slate-900 border-b border-slate-200 pb-3">General Correspondence</h3>
          <div className="mt-4 space-y-3 text-sm text-slate-700">
            <div className="flex items-start gap-3">
              <Phone className="h-5 w-5 text-brand-600 mt-0.5" />
              <span>+91-79-23248572</span>
            </div>
            <div className="flex items-start gap-3">
              <Mail className="h-5 w-5 text-brand-600 mt-0.5" />
              <a className="font-semibold text-brand-600 hover:underline" href="mailto:info@gujaratmetrorail.com">info@gujaratmetrorail.com</a>
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-full bg-white shadow flex items-center justify-center border border-slate-100">
            <Clock className="h-6 w-6 text-brand-600" />
          </div>
          <h2 className="text-lg font-bold text-slate-900">Lost &amp; Found</h2>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="space-y-3 text-sm text-slate-700">
            <div className="flex items-start gap-3">
              <MapPin className="h-5 w-5 text-brand-600 mt-0.5" />
              <span>Lost &amp; Found Office, Apparel Park Depot</span>
            </div>
            <div className="flex items-start gap-3">
              <Phone className="h-5 w-5 text-brand-600 mt-0.5" />
              <span>079-22960123</span>
            </div>
            <div className="flex items-start gap-3">
              <Mail className="h-5 w-5 text-brand-600 mt-0.5" />
              <a className="font-semibold text-brand-600 hover:underline" href="mailto:care@gujaratmetrorail.com">care@gujaratmetronal.com</a>
            </div>
            <div className="flex items-start gap-3">
              <Clock className="h-5 w-5 text-brand-600 mt-0.5" />
              <span>Office timing: 10:30 to 18:10 hrs</span>
            </div>
          </div>

          <div className="mt-5 rounded-xl bg-slate-50 border-l-4 border-brand-600 p-4">
            <h4 className="font-bold text-slate-900">Important Information</h4>
            <ul className="mt-3 list-disc pl-5 text-sm text-slate-700 space-y-2">
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