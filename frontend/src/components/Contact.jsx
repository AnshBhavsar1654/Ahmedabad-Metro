import React from 'react';
import { MapPin, Phone, Mail, Clock } from 'lucide-react';
import PageHeader from './PageHeader';

const iconProps = { strokeWidth: 1.75, size: 18, className: 'mt-0.5 shrink-0 text-accent' };

const SectionTitle = ({ icon: Icon, children }) => (
  <div className="flex items-center gap-3">
    <div className="flex h-10 w-10 items-center justify-center rounded-md bg-navy-100 text-accent">
      <Icon strokeWidth={1.75} size={20} />
    </div>
    <h2 className="font-sans text-lg font-semibold text-ink-900">{children}</h2>
  </div>
);

const Row = ({ icon: Icon, children }) => (
  <div className="flex items-start gap-3">
    <Icon {...iconProps} />
    <div>{children}</div>
  </div>
);

const Card = ({ title, children }) => (
  <div className="rounded-lg border border-line-200 bg-surface-1 p-6">
    {title && <h3 className="border-b border-line-200 pb-3 font-sans text-base font-semibold text-ink-900">{title}</h3>}
    <div className={`space-y-3 text-sm text-ink-900 ${title ? 'mt-4' : ''}`}>{children}</div>
  </div>
);

const emailClass = 'font-semibold text-accent underline-offset-2 hover:underline';

const Contact = () => (
  <div className="min-h-screen bg-surface-0 pb-10">
    <PageHeader title="Contact" subtitle="Reach Gujarat Metro Rail Corporation for enquiries, feedback or lost property" />

    <div className="mx-auto mt-6 max-w-7xl px-5">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <section className="flex flex-col gap-4">
          <SectionTitle icon={MapPin}>Corporate office</SectionTitle>
          <Card>
            <p className="font-semibold">Gujarat Metro Rail Corporation (GMRC) Limited</p>
            <p className="font-mono text-xs text-ink-600">CIN U60200GJ20105GC059CO407</p>
            <Row icon={MapPin}>
              <span className="leading-relaxed">Block No. 1, First Floor, Karmayogi Bhavan, Sector 10/A, Gandhinagar – 382010</span>
            </Row>
            <a
              href="https://maps.app.goo.gl/VYHpGS55k5hDJ5fL9"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block font-semibold text-accent underline underline-offset-2"
            >
              View on Google Maps
            </a>
          </Card>
        </section>

        <section className="flex flex-col gap-4">
          <SectionTitle icon={Phone}>Contact information</SectionTitle>
          <Card title="Passenger correspondence">
            <Row icon={Phone}><span className="font-mono tabular-nums">+91-79-22960123</span></Row>
            <Row icon={Mail}><a className={emailClass} href="mailto:care@gujaratmetrorail.com">care@gujaratmetrorail.com</a></Row>
          </Card>
          <Card title="General correspondence">
            <Row icon={Phone}><span className="font-mono tabular-nums">+91-79-23248572</span></Row>
            <Row icon={Mail}><a className={emailClass} href="mailto:info@gujaratmetrorail.com">info@gujaratmetrorail.com</a></Row>
          </Card>
        </section>

        <section className="flex flex-col gap-4">
          <SectionTitle icon={Clock}>Lost &amp; found</SectionTitle>
          <Card>
            <Row icon={MapPin}><span>Lost &amp; Found Office, Apparel Park Depot</span></Row>
            <Row icon={Phone}><span className="font-mono tabular-nums">079-22960123</span></Row>
            <Row icon={Mail}><a className={emailClass} href="mailto:care@gujaratmetrorail.com">care@gujaratmetrorail.com</a></Row>
            <Row icon={Clock}><span>Office hours: <span className="font-mono tabular-nums">10:30–18:10</span></span></Row>

            <div className="mt-2 rounded-md border-l-4 border-accent bg-navy-100 p-4">
              <h4 className="font-semibold text-ink-900">Important information</h4>
              <ul className="mt-3 list-disc space-y-2 pl-5 text-ink-900">
                <li>If you lost an article in GMRCL premises or in a train, report at any station, or mail or call Customer Care with full details, your address and contact numbers.</li>
                <li>Perishable and soiled items are discarded at stations.</li>
                <li>Bring a valid government ID with your address to claim an item.</li>
                <li>Unclaimed items are disposed of after six months.</li>
              </ul>
            </div>
          </Card>
        </section>
      </div>
    </div>
  </div>
);

export default Contact;
