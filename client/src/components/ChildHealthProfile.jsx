import React, { useEffect, useState } from 'react';
import api from '../api/axios';

const tabs = ['general', 'health', 'qr'];

export default function ChildHealthProfile({ childId }) {
  const [activeTab, setActiveTab] = useState('general');
  const [child, setChild] = useState(null);
  const [qr, setQr] = useState(null);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get(`/children/${childId}`)
      .then(({ data }) => setChild(data))
      .catch(() => setError('Unable to load this child profile.'));
  }, [childId]);

  useEffect(() => {
    if (!qr?.expiresAt) return undefined;
    const update = () => setSecondsLeft(Math.max(0, Math.ceil((new Date(qr.expiresAt) - Date.now()) / 1000)));
    update();
    const timer = setInterval(update, 1000);
    return () => clearInterval(timer);
  }, [qr]);

  async function generateQR() {
    try {
      setError('');
      const { data } = await api.post(`/children/${childId}/qr`);
      setQr(data);
      setActiveTab('qr');
    } catch {
      setError('Unable to generate a protected QR code.');
    }
  }

  if (!child) return <p className="text-sm text-slate-500">{error || 'Loading profile...'}</p>;

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-teal-700">{child.ChildCode}</p>
          <h1 className="mt-1 text-2xl font-semibold text-slate-900">{child.FirstName} {child.LastName}</h1>
        </div>
        <button className="rounded-md bg-teal-700 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-800" onClick={generateQR} type="button">
          Generate Protected QR
        </button>
      </header>
      {error && <p className="mt-4 text-sm text-red-700">{error}</p>}
      <nav className="mt-6 flex gap-5 border-b border-slate-200" aria-label="Child profile sections">
        {tabs.map((tab) => (
          <button className={`border-b-2 px-1 pb-3 text-sm font-medium capitalize ${activeTab === tab ? 'border-teal-700 text-teal-700' : 'border-transparent text-slate-500'}`} key={tab} onClick={() => setActiveTab(tab)} type="button">
            {tab === 'qr' ? 'Protected QR' : tab}
          </button>
        ))}
      </nav>
      <div className="pt-5 text-sm text-slate-700">
        {activeTab === 'general' && <dl className="grid gap-4 sm:grid-cols-2"><div><dt className="text-slate-500">Birth date</dt><dd>{child.BirthDate || 'Not recorded'}</dd></div><div><dt className="text-slate-500">Gender</dt><dd>{child.Gender || 'Not recorded'}</dd></div><div><dt className="text-slate-500">Room</dt><dd>{child.Room || 'Not assigned'}</dd></div><div><dt className="text-slate-500">Status</dt><dd>{child.Status}</dd></div></dl>}
        {activeTab === 'health' && <dl className="grid gap-4 sm:grid-cols-2"><div><dt className="text-slate-500">Blood type</dt><dd>{child.BloodType || 'Not recorded'}</dd></div><div><dt className="text-slate-500">Allergies</dt><dd>{child.Allergies || 'None recorded'}</dd></div><div><dt className="text-slate-500">Conditions</dt><dd>{child.Conditions || 'None recorded'}</dd></div><div><dt className="text-slate-500">Medications</dt><dd>{child.Medications || 'None recorded'}</dd></div></dl>}
        {activeTab === 'qr' && (qr ? <div className="flex flex-wrap items-start gap-6"><img alt="Protected child profile QR code" className="h-56 w-56" src={qr.dataUrl} /><p className="font-medium text-slate-700">Expires in {Math.floor(secondsLeft / 60)}:{String(secondsLeft % 60).padStart(2, '0')}</p></div> : <p>Generate a QR code to create a three-minute protected access token.</p>)}
      </div>
    </section>
  );
}
