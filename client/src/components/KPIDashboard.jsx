import React, { useEffect, useState } from 'react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import api from '../api/axios';

const emptyMetrics = { totalChildren: 0, lowStockAlerts: 0, monthlyDonations: 0, activity: [] };

export default function KPIDashboard() {
  const [metrics, setMetrics] = useState(emptyMetrics);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    api.get('/dashboard')
      .then(({ data }) => { if (active) setMetrics(data); })
      .catch(() => { if (active) setError('Live dashboard data is unavailable.'); });
    return () => { active = false; };
  }, []);

  const cards = [
    ['Total Children', metrics.totalChildren],
    ['Low Stock Alerts', metrics.lowStockAlerts],
    ['Monthly Donations', `₱${Number(metrics.monthlyDonations).toLocaleString()}`],
  ];
  const chartData = [
    { name: 'Children', value: Number(metrics.totalChildren) },
    { name: 'Low stock', value: Number(metrics.lowStockAlerts) },
    { name: 'Donations', value: Number(metrics.monthlyDonations) },
  ];

  return (
    <section className="space-y-6" aria-label="Executive dashboard">
      {error && <p className="text-sm text-red-700">{error}</p>}
      <div className="grid gap-4 md:grid-cols-3">
        {cards.map(([label, value]) => (
          <article className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm" key={label}>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
            <p className="mt-2 text-3xl font-semibold text-slate-900">{value}</p>
          </article>
        ))}
      </div>
      <article className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">Operations Snapshot</h2>
        <div className="mt-4 h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
              <Tooltip />
              <Bar dataKey="value" fill="#0f766e" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </article>
      <article className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-lg font-semibold text-slate-900">Live Activity</h2>
          <span className="text-xs text-slate-500">Most recent successful actions</span>
        </div>
        <div className="mt-4 divide-y divide-slate-100">
          {metrics.activity.map((entry) => (
            <div className="flex flex-wrap justify-between gap-2 py-3 text-sm" key={entry.ActivityLogId}>
              <span className="text-slate-700">{entry.Action}</span>
              <time className="text-slate-500">{new Date(entry.CreatedAt).toLocaleString()}</time>
            </div>
          ))}
          {!metrics.activity.length && <p className="py-3 text-sm text-slate-500">No activity recorded yet.</p>}
        </div>
      </article>
    </section>
  );
}
