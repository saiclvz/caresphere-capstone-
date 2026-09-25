import React, { useEffect, useState } from 'react';
import api from '../api/axios';

export default function QRResolver() {
  const [token, setToken] = useState('');
  const [child, setChild] = useState(null);
  const [error, setError] = useState('');
  const [scanStatus, setScanStatus] = useState('Ready to scan');

  useEffect(() => {
    let scanner;
    let disposed = false;
    import('html5-qrcode').then(({ Html5QrcodeScanner }) => {
      if (disposed) return;
      scanner = new Html5QrcodeScanner('qr-reader', { fps: 10, qrbox: { width: 220, height: 220 } }, false);
      scanner.render((decodedText) => {
        setToken(decodedText);
        setScanStatus('QR captured');
        resolveToken(decodedText);
        scanner.clear().catch(() => {});
      }, () => {});
    });
    return () => {
      disposed = true;
      scanner?.clear().catch(() => {});
    };
  }, []);

  function extractToken(value) {
    try {
      const url = new URL(value);
      return url.searchParams.get('token') || value;
    } catch {
      return value;
    }
  }

  async function resolveToken(value) {
    const resolvedToken = extractToken(value.trim());
    if (!resolvedToken) return;
    try {
      setError('');
      const localRecord = sessionStorage.getItem(`cs_qr:${resolvedToken}`);
      if (localRecord) {
        const parsed = JSON.parse(localRecord);
        if (new Date(parsed.expiresAt) > new Date()) {
          setChild({
            child: { id: parsed.child.id, code: parsed.child.id, name: parsed.child.name, room: parsed.child.room, status: parsed.child.status },
            healthProfile: parsed.child.health,
            expiresAt: parsed.expiresAt,
          });
          return;
        }
        sessionStorage.removeItem(`cs_qr:${resolvedToken}`);
      }
      const { data } = await api.post('/qr/child/scan', { token: resolvedToken });
      setChild(data);
    } catch (requestError) {
      setChild(null);
      setError(requestError.response?.data?.error || 'Unable to resolve QR token.');
    }
  }

  const resultChild = child?.child || child;
  const health = child?.healthProfile;

  function submitToken(event) {
    event.preventDefault();
    resolveToken(token);
  }

  return (
    <section className="qr-resolver max-w-xl rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
      <h1 className="text-xl font-semibold text-slate-900">Resolve Protected QR</h1>
      <p className="mt-1 text-sm text-slate-500">Scan a protected child QR code or enter its resolver URL.</p>
      <div className="qr-reader-wrap">
        <div id="qr-reader" />
        <span>{scanStatus}</span>
      </div>
      <form className="mt-5 flex gap-3" onSubmit={submitToken}>
        <input className="min-w-0 flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm" onChange={(event) => setToken(event.target.value)} placeholder="Paste QR token" value={token} />
        <button className="rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white" type="submit">Resolve</button>
      </form>
      {error && <p className="mt-4 text-sm text-red-700">{error}</p>}
      {child && <div className="qr-result mt-5 rounded-md bg-slate-50 p-4 text-sm text-slate-700">
        <p className="font-semibold">{resultChild.name || `${resultChild.FirstName} ${resultChild.LastName}`}</p>
        <p>{resultChild.code || resultChild.id || resultChild.ChildCode} · {resultChild.room || resultChild.Room || 'No room assigned'}</p>
        {health && <div className="qr-health-summary">
          <strong>Authorized health information</strong>
          <span>Health status: {health.Conditions || health.conditions || 'No condition recorded'}</span>
          <span>Allergies: {health.Allergies || health.allergies || 'None recorded'}</span>
          <span>Medications: {health.Medications || health.medications || 'None recorded'}</span>
          {child.medicalHistory?.length > 0 && <span>Medical history: {child.medicalHistory.length} record(s)</span>}
          {child.immunizations?.length > 0 && <span>Immunizations: {child.immunizations.length} record(s)</span>}
          {child.medicalVisits?.length > 0 && <span>Medical visits: {child.medicalVisits.length} record(s)</span>}
          {child.dentalRecords?.length > 0 && <span>Dental records: {child.dentalRecords.length} record(s)</span>}
          {child.growthRecords?.length > 0 && <span>Growth records: {child.growthRecords.length} record(s)</span>}
          {child.emergencyRecords?.length > 0 && <span>Emergency information: available</span>}
          {child.healthDocuments?.length > 0 && <span>Health documents: {child.healthDocuments.length} protected document(s)</span>}
          {child.careNotes?.length > 0 && <span>Care notes: {child.careNotes.length} protected note(s)</span>}
        </div>}
        <p className="mt-2 text-xs text-slate-500">Token expires {new Date(child.expiresAt || child.ExpiresAt || Date.now()).toLocaleString()}</p>
      </div>}
    </section>
  );
}
