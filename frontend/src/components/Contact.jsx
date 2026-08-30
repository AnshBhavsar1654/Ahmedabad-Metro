import React from 'react';
import { MapPin, Phone, Mail, Clock } from 'lucide-react';

const Contact = () => (
  <div className="bg-surface-0 min-h-screen pb-10">
    <div className="mx-auto max-w-7xl px-5 pt-8 mb-8 pb-6 border-b border-line-200">
      <h1 className="text-3xl font-bold font-sans text-navy-900 tracking-tight">Contact Ahmedabad Metro</h1>
      <p className="text-base text-ink-600 mt-2">Get in touch with us for inquiries, feedback, or assistance</p>
    </div>

    <div className="mx-auto max-w-7xl px-5 mt-6">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
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
  </div>
);

export default Contact;