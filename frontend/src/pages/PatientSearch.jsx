import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export default function PatientSearch() {
  const [card, setCard] = useState('');
  const [patient, setPatient] = useState(null);
  const [records, setRecords] = useState([]);
  const [toast, setToast] = useState({ type: '', message: '' });
  const [files, setFiles] = useState([]);
  const [count, setCount] = useState(0);
  const [critFiles, setCritFiles] = useState([]);
  const [critCount, setCritCount] = useState(0);
  const [viewTier, setViewTier] = useState(null); // 'early' | 'emergency' | null
  const [isPrimary, setIsPrimary] = useState(false);
  const navigate = useNavigate();
  const addFileInputRef = useRef(null);
  const animationRef = useRef(null);
  const [isAnimating, setIsAnimating] = useState(true);

  const token = localStorage.getItem('token');

  const formatDataText = (data) => {
    if (data == null) return '';
    if (typeof data === 'string') return data;
    if (typeof data === 'object' && typeof data.text === 'string') return data.text;
    if (Array.isArray(data)) return data.map((x) => formatDataText(x)).join(', ');
    if (typeof data === 'object')
      return Object.entries(data)
        .map(([k, v]) => `${k}: ${formatDataText(v)}`)
        .join('\n');
    return String(data);
  };

  // Animation loop for floating icons
  useEffect(() => {
    if (!isAnimating) return;

    const startAnimation = () => {
      if (animationRef.current) {
        const elements = animationRef.current.querySelectorAll('[data-animate-icon], [data-animate-record]');
        elements.forEach((el) => {
          el.style.animation = 'none';
          setTimeout(() => {
            el.style.animation = '';
          }, 10);
        });
      }
    };

    const interval = setInterval(startAnimation, 6000);
    return () => clearInterval(interval);
  }, [isAnimating]);

  const search = async () => {
    setToast({});
    setPatient(null);
    setRecords([]);
    if (!card.trim()) return setToast({ type: 'error', message: 'Enter a valid patient card number' });
    try {
      const r = await fetch(`http://localhost:5000/api/auth/patient/by-card/${encodeURIComponent(card)}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const d = await r.json();
      if (!r.ok) return setToast({ type: 'error', message: d.message || 'Patient not found' });
      setPatient(d.patient);
      // determine if current doctor is primary for this patient
      try{
        const meR = await fetch('http://localhost:5000/api/auth/me', { headers: { Authorization: `Bearer ${token}` } })
        const meD = await meR.json()
        const primaries = (meD?.user?.primaryPatients || [])
        setIsPrimary(Array.isArray(primaries) && primaries.some(pp => pp._id === d.patient.id))
      }catch{}
      const r2 = await fetch(`http://localhost:5000/api/auth/doctor/patient/${d.patient.id}/records?tier=early`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data2 = await r2.json();
      if (r2.ok) setRecords(data2.records || []);
      setViewTier('early');
    } catch (e) {
      setToast({ type: 'error', message: 'Server error, please try again' });
    }
  };

  const requestEmergency = async () => {
    setToast({});
    if (!patient) return;
    if (files.length < 3) return setToast({ type: 'error', message: 'Upload at least 3 documents' });
    try {
      const fd = new FormData();
      fd.append('tier', 'emergency');
      files.forEach((f) => fd.append('files', f));
      const r = await fetch(`http://localhost:5000/api/auth/doctor/patient/${patient.id}/access-request`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      });
      const d = await r.json();
      if (!r.ok) return setToast({ type: 'error', message: d.message || 'Failed to request emergency access' });
      setToast({ type: 'success', message: 'Emergency access granted for 10 minutes' });
      const r2 = await fetch(`http://localhost:5000/api/auth/doctor/patient/${patient.id}/records?tier=emergency`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data2 = await r2.json();
      if (r2.ok) {
        setRecords((prev) => [...prev, ...(data2.records || [])]);
        setViewTier('emergency');
      }
    } catch (e) {
      setToast({ type: 'error', message: 'Server error, please try again' });
    }
  };

  const requestCritical = async () => {
    setToast({})
    if (!patient) return
    try {
      const fd = new FormData()
      fd.append('tier', 'critical')
  critFiles.forEach((f) => fd.append('files', f))
      const r = await fetch(`http://localhost:5000/api/auth/doctor/patient/${patient.id}/access-request`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      })
      const d = await r.json()
      if (!r.ok) return setToast({ type: 'error', message: d.message || 'Failed to request critical access' })
      setToast({ type: 'success', message: 'Critical access request sent to primary doctor for approval' })
    } catch (e) {
      setToast({ type: 'error', message: 'Server error, please try again' })
    }
  }

  const refreshEarly = async () => {
    if (!patient) return;
    try {
      const r2 = await fetch(`http://localhost:5000/api/auth/doctor/patient/${patient.id}/records?tier=early`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data2 = await r2.json();
      if (r2.ok) {
        setRecords(data2.records || []);
        setViewTier('early');
        setToast({ type: 'success', message: 'Early access records refreshed' });
      }
    } catch {
      setToast({ type: 'error', message: 'Failed to refresh records' });
    }
  };

  const handleAddDocument = (e) => {
    const f = e.target.files && e.target.files[0];
    if (!f) return;
    const next = [...files, f];
    setFiles(next);
    setCount(next.length);
    e.target.value = '';
  };

  const handleAddCriticalDocument = (e) => {
    const f = e.target.files && e.target.files[0];
    if (!f) return;
    const next = [...critFiles, f].slice(0, 3);
    setCritFiles(next);
    setCritCount(next.length);
    e.target.value = '';
  };

  const refreshCritical = async () => {
    if (!patient) return;
    try {
      const r2 = await fetch(`http://localhost:5000/api/auth/doctor/patient/${patient.id}/records?tier=critical`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data2 = await r2.json();
      if (r2.ok) {
        // merge early/emergency already loaded with new critical
        const nonCritical = (records || []).filter((r) => r.accessTier !== 'critical');
        setRecords([...nonCritical, ...(data2.records || [])]);
        setViewTier('critical');
        setToast({ type: 'success', message: 'Critical records refreshed' });
      } else if (data2?.message) {
        setToast({ type: 'error', message: data2.message });
      }
    } catch {
      setToast({ type: 'error', message: 'Failed to refresh critical records' });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-teal-50 flex items-center justify-center p-6 overflow-hidden relative">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-blue-400/20 rounded-full animate-pulse"></div>
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-teal-400/20 rounded-full animate-pulse animation-delay-1000"></div>
        <div className="absolute top-1/3 left-1/4 w-64 h-64 bg-blue-600/10 rounded-full animate-pulse animation-delay-2000"></div>
        <div className="absolute top-1/2 right-1/4 w-48 h-48 bg-teal-600/15 rounded-full animate-pulse animation-delay-1500"></div>
      </div>

      {/* Floating medical icons */}
      <div ref={animationRef} className="absolute inset-0 pointer-events-none">
        <div data-animate-icon className="absolute top-20 left-16 animate-float">
          <div className="w-12 h-12 bg-blue-200/80 backdrop-blur-md rounded-2xl flex items-center justify-center shadow-xl hover:scale-110 transition-transform duration-300">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-blue-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
          </div>
        </div>
        <div data-animate-icon className="absolute bottom-24 right-20 animate-float animation-delay-1000">
          <div className="w-12 h-12 bg-teal-200/80 backdrop-blur-md rounded-2xl flex items-center justify-center shadow-xl hover:scale-110 transition-transform duration-300">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-teal-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>
        </div>
        <div data-animate-icon className="absolute top-1/3 left-1/2 animate-float animation-delay-2000">
          <div className="w-10 h-10 bg-blue-300/60 backdrop-blur-md rounded-2xl flex items-center justify-center shadow-xl hover:scale-110 transition-transform duration-300">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-800" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          </div>
        </div>
        <div data-animate-icon className="absolute top-48 right-32 animate-float animation-delay-1500">
          <div className="w-10 h-10 bg-teal-300/60 backdrop-blur-md rounded-xl flex items-center justify-center shadow-lg hover:scale-110 transition-transform duration-300">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-teal-800" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.121 14.121L19 19m-7-7l7-7m-7 7l-2.879 2.879M12 12L9.121 9.121m0 5.758a3 3 0 10-4.243 4.243 3 3 0 004.243-4.243zm0-5.758a3 3 0 10-4.243-4.243 3 3 0 004.243 4.243z" />
            </svg>
          </div>
        </div>
      </div>

      <div className="w-full max-w-5xl bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl shadow-blue-500/20 p-8 border border-blue-100/50 relative z-10">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-gradient-to-r from-blue-600 to-teal-500 rounded-xl flex items-center justify-center shadow-lg animate-pulse-slow">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <div>
              <h1 className="text-3xl font-bold text-blue-900 animate-gradient-text">Patient Search Dashboard</h1>
              <p className="text-blue-700 text-sm mt-1">Search and manage patient records securely.</p>
            </div>
          </div>
          <button
            onClick={() => navigate('/doctor')}
            className="bg-gradient-to-r from-gray-600 to-gray-700 text-white px-5 py-2 rounded-lg font-semibold shadow-xl shadow-gray-500/30 hover:shadow-2xl hover:shadow-gray-500/40 transition-all duration-300 transform hover:-translate-y-1 text-sm flex items-center space-x-2"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            <span>Back to Dashboard</span>
          </button>
        </div>

        {/* Search Section */}
        <div className="bg-white/80 backdrop-blur-lg rounded-2xl shadow-lg p-6 border border-blue-100/50 mb-6">
          <h2 className="text-lg font-semibold text-blue-800 mb-4 flex items-center space-x-2">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <span>Search Patient</span>
          </h2>
          <div className="flex gap-4">
            <div className="relative flex-1">
              <input
                className="w-full px-4 py-3 pl-10 rounded-lg border-2 border-blue-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-300 text-blue-900 text-sm bg-white/80"
                placeholder="Enter patient card number"
                value={card}
                onChange={(e) => setCard(e.target.value)}
              />
              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-blue-500">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
            </div>
            <button
              onClick={search}
              className="bg-gradient-to-r from-blue-700 to-teal-600 text-white px-5 py-3 rounded-lg font-semibold shadow-xl shadow-blue-500/30 hover:shadow-2xl hover:shadow-blue-500/40 transition-all duration-300 transform hover:-translate-y-1 text-sm flex items-center space-x-2"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <span>Search</span>
            </button>
          </div>
        </div>

        {/* Toast Message */}
        {toast.message && (
          <div
            className={`p-3 rounded-lg text-sm transition-all duration-300 animate-slide-in ${
              toast.type === 'error' ? 'bg-red-200 text-red-800' : 'bg-green-200 text-green-800'
            }`}
          >
            {toast.message}
          </div>
        )}

        {/* Patient Details */}
        {patient && (
          <div className="bg-white/80 backdrop-blur-lg rounded-2xl shadow-lg p-6 border border-blue-100/50">
            <div className="flex items-center space-x-4 mb-4">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center shadow-md">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <div>
                <div className="font-semibold text-blue-900 text-lg">{patient.name}</div>
                <div className="text-sm text-blue-600">Card: {patient.cardNumber}</div>
              </div>
            </div>

            {/* Access Controls */}
            <div className="flex flex-wrap gap-3 mb-6">
              <button
                onClick={refreshEarly}
                className="bg-gradient-to-r from-blue-700 to-teal-600 text-white px-5 py-2 rounded-lg font-semibold shadow-xl shadow-blue-500/30 hover:shadow-2xl hover:shadow-blue-500/40 transition-all duration-300 transform hover:-translate-y-1 text-sm flex items-center space-x-2"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                <span>Get Early Access</span>
              </button>
              <button
                onClick={() => addFileInputRef.current?.click()}
                className="bg-gradient-to-r from-gray-800 to-gray-900 text-white px-5 py-2 rounded-lg font-semibold shadow-xl shadow-gray-500/30 hover:shadow-2xl hover:shadow-gray-500/40 transition-all duration-300 transform hover:-translate-y-1 text-sm flex items-center space-x-2"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                <span>Add Document</span>
              </button>
              <button
                onClick={() => {
                  setFiles([]);
                  setCount(0);
                }}
                className="bg-gray-200 text-gray-800 px-5 py-2 rounded-lg font-semibold shadow-md hover:shadow-lg transition-all duration-300 text-sm flex items-center space-x-2"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                <span>Clear Documents</span>
              </button>
              <input
                ref={addFileInputRef}
                type="file"
                accept="image/jpeg,image/png,application/pdf"
                className="hidden"
                onChange={handleAddDocument}
              />
              <span className="self-center text-sm text-blue-600">
                Selected: {count} / 3 required
              </span>
              <button
                disabled={count < 3}
                onClick={requestEmergency}
                className={`px-5 py-2 rounded-lg font-semibold text-sm transition-all duration-300 flex items-center space-x-2 ${
                  count < 3
                    ? 'bg-gray-200 text-gray-600 cursor-not-allowed'
                    : 'bg-gradient-to-r from-orange-600 to-orange-700 text-white shadow-xl shadow-orange-500/30 hover:shadow-2xl hover:shadow-orange-500/40 transform hover:-translate-y-1'
                }`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v3m0 0v3m0-3h-3m3 0h3m-9 6h12a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                <span>Request Emergency Access (10 min)</span>
              </button>
              {!isPrimary && (
                <div className="flex items-center gap-3">
                  <label className="bg-gradient-to-r from-gray-800 to-gray-900 text-white px-4 py-2 rounded-lg font-semibold shadow-md cursor-pointer text-sm">
                    <input type="file" accept="image/jpeg,image/png,application/pdf" className="hidden" onChange={handleAddCriticalDocument} />
                    Add Critical Proof
                  </label>
                  <span className="self-center text-sm text-blue-600">Critical Proofs: {critCount} / 3 required</span>
                  <button
                    disabled={critCount !== 3}
                    onClick={requestCritical}
                    className={`px-5 py-2 rounded-lg font-semibold text-sm transition-all duration-300 ${
                      critCount !== 3
                        ? 'bg-gray-200 text-gray-600 cursor-not-allowed'
                        : 'bg-gradient-to-r from-red-600 to-red-700 text-white shadow-xl shadow-red-500/30 hover:shadow-2xl hover:shadow-red-500/40 transform hover:-translate-y-1'
                    }`}
                  >
                    Request Critical Access (Primary Approval)
                  </button>
                  <button onClick={refreshCritical} className="px-4 py-2 rounded-lg font-semibold text-sm bg-gray-100">Refresh Critical</button>
                </div>
              )}
            </div>

            {/* Uploaded Files */}
            {files.length > 0 && (
              <div className="mb-6">
                <h3 className="text-sm font-semibold text-blue-800 mb-2">Uploaded Documents</h3>
                <ul className="text-sm text-blue-600 list-disc pl-5 space-y-1">
                  {files.map((f, i) => (
                    <li key={i} className="flex items-center space-x-2">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                      </svg>
                      <span>{f.name}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Records Section */}
            <div>
              <h3 className="text-lg font-semibold text-blue-800 mb-4 flex items-center space-x-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                <span>Patient Records ({viewTier || 'all'})</span>
              </h3>
              {(viewTier ? records.filter((r) => r.accessTier === viewTier).length === 0 : records.length === 0) ? (
                <div className="text-blue-600 text-center py-6 text-sm">
                  No records visible for {viewTier || 'this'} access tier.
                </div>
              ) : (
                <ul className="space-y-4">
                  {(viewTier ? records.filter((r) => r.accessTier === viewTier) : records).map((r) => (
                    <li
                      key={r.id}
                      data-animate-record
                      className="bg-white/90 backdrop-blur-md rounded-xl p-5 shadow-lg border border-blue-100/50 transition-all duration-500 hover:shadow-xl hover:-translate-y-1 group relative"
                    >
                      <div className="absolute inset-0 bg-gradient-to-r from-blue-100/20 to-teal-100/20 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                      <div className="relative z-10">
                        <div className="flex items-center justify-between mb-2">
                          <div className="text-sm text-blue-600">
                            Tier: {r.accessTier} • {new Date(r.createdAt).toLocaleString()}
                          </div>
                        </div>
                        <pre className="whitespace-pre-wrap text-sm text-blue-900 bg-blue-50/50 p-3 rounded-lg">{formatDataText(r.data)}</pre>
                        {Array.isArray(r.files) && r.files.length > 0 && (
                          <div className="mt-3">
                            <h4 className="text-sm font-semibold text-blue-800">Attached Files</h4>
                            <div className="mt-2 space-y-2">
                              {r.files.map((f, idx) => (
                                <div key={idx} className="text-sm flex items-center space-x-2">
                                  <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    className="h-4 w-4 text-blue-500"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor"
                                  >
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      strokeWidth={2}
                                      d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
                                    />
                                  </svg>
                                  {f.url ? (
                                    <a
                                      className="text-blue-600 underline hover:text-blue-800 transition-colors"
                                      href={f.url}
                                      target="_blank"
                                      rel="noreferrer"
                                    >
                                      Download {f.name}
                                    </a>
                                  ) : (
                                    <a
                                      className="text-blue-600 underline hover:text-blue-800 transition-colors"
                                      href={`data:${f.mime};base64,${f.dataBase64}`}
                                      download={f.name}
                                    >
                                      Download {f.name}
                                    </a>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        {Array.isArray(r.sections) && r.sections.length > 0 && (
                          <div className="mt-4 border-t pt-3">
                            <h4 className="text-sm font-semibold text-blue-800">Sections</h4>
                            <ul className="space-y-3 mt-2">
                              {r.sections.map((s) => (
                                <li
                                  key={s.id}
                                  className="bg-white/50 backdrop-blur-sm rounded-lg p-3 border border-blue-100/50"
                                >
                                  <div className="text-sm text-blue-600">
                                    {s.label} • {new Date(s.updatedAt || s.createdAt).toLocaleString()}
                                  </div>
                                  <pre className="whitespace-pre-wrap text-xs text-blue-900 bg-blue-50/50 p-2 rounded-lg mt-1">
                                    {formatDataText(s.data)}
                                  </pre>
                                  {Array.isArray(s.files) && s.files.length > 0 && (
                                    <div className="mt-2 space-y-2">
                                      {s.files.map((f, idx) => (
                                        <div key={idx} className="text-xs flex items-center space-x-2">
                                          <svg
                                            xmlns="http://www.w3.org/2000/svg"
                                            className="h-3 w-3 text-blue-500"
                                            fill="none"
                                            viewBox="0 0 24 24"
                                            stroke="currentColor"
                                          >
                                            <path
                                              strokeLinecap="round"
                                              strokeLinejoin="round"
                                              strokeWidth={2}
                                              d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
                                            />
                                          </svg>
                                          {f.url ? (
                                            <a
                                              className="text-blue-600 underline hover:text-blue-800 transition-colors"
                                              href={f.url}
                                              target="_blank"
                                              rel="noreferrer"
                                            >
                                              Download {f.name}
                                            </a>
                                          ) : (
                                            <a
                                              className="text-blue-600 underline hover:text-blue-800 transition-colors"
                                              href={`data:${f.mime};base64,${f.dataBase64}`}
                                              download={f.name}
                                            >
                                              Download {f.name}
                                            </a>
                                          )}
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}