import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';

export default function PublicEarly() {
  const { cardNumber } = useParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [patient, setPatient] = useState(null);
  const [records, setRecords] = useState([]);

  useEffect(() => {
    let alive = true;
    const run = async () => {
      setLoading(true);
      setError('');
      try {
        const r = await fetch(`http://localhost:5000/api/auth/public/patient/${encodeURIComponent(cardNumber)}/early`);
        const d = await r.json();
        if (!r.ok) throw new Error(d.message || 'Failed to load');
        if (!alive) return;
        setPatient(d.patient);
        setRecords(d.records || []);
      } catch (e) {
        if (!alive) return;
        setError(e.message || 'Error');
      } finally {
        if (alive) setLoading(false);
      }
    };
    run();
    return () => { alive = false; };
  }, [cardNumber]);

  const format = (data) => {
    if (data == null) return '';
    if (typeof data === 'string') return data;
    if (Array.isArray(data)) return data.map(format).join(', ');
    if (typeof data === 'object') return Object.entries(data).map(([k,v])=>`${k}: ${format(v)}`).join('\n');
    return String(data);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-teal-50 p-6">
      <div className="max-w-3xl mx-auto bg-white/90 backdrop-blur rounded-2xl shadow-xl border border-blue-100 p-6">
        <h1 className="text-2xl font-bold text-blue-900 mb-2">Public Early Access</h1>
        <p className="text-blue-700 mb-6 text-sm">Scan link displays early medical details for this card.</p>

        {loading && <div className="text-blue-700">Loading…</div>}
        {error && <div className="text-red-700 bg-red-100 p-3 rounded">{error}</div>}

        {!loading && !error && (
          <div>
            {patient && (
              <div className="mb-4">
                <div className="text-blue-900 font-semibold">{patient.name || 'Patient'}</div>
                <div className="text-blue-700 text-sm">Card: {patient.cardNumber}</div>
              </div>
            )}

            {records.length === 0 ? (
              <div className="text-blue-700 bg-blue-50 p-4 rounded">No early records available.</div>
            ) : (
              <ul className="space-y-4">
                {records.map((r) => (
                  <li key={r.id} className="bg-white border border-blue-100 rounded-xl p-4 shadow">
                    <div className="text-sm text-blue-600 mb-2">Updated: {new Date(r.createdAt).toLocaleString()}</div>
                    <pre className="whitespace-pre-wrap text-sm text-blue-900 bg-blue-50/50 p-3 rounded">{format(r.data)}</pre>
                    {Array.isArray(r.sections) && r.sections.length > 0 && (
                      <div className="mt-3">
                        <div className="text-sm font-semibold text-blue-800">Sections</div>
                        <ul className="space-y-2 mt-1">
                          {r.sections.map((s) => (
                            <li key={s.id} className="bg-white border border-blue-100 rounded p-2">
                              <div className="text-xs text-blue-600">{s.label}</div>
                              <pre className="whitespace-pre-wrap text-xs text-blue-900 bg-blue-50/50 p-2 rounded mt-1">{format(s.data)}</pre>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
