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
  const [viewTier, setViewTier] = useState(null); // 'early' | 'emergency' | 'critical' | null
  const [isPrimary, setIsPrimary] = useState(false);
  const [activeTab, setActiveTab] = useState(null); // null | 'emergency' | 'critical'
  const [emergencyUnlocked, setEmergencyUnlocked] = useState(false); // ephemeral: only true after uploading 3 docs this session
  const [criticalUnlocked, setCriticalUnlocked] = useState(false); // ephemeral: only true after primary approval is observed in this session
  const [refreshingCritical, setRefreshingCritical] = useState(false); // spinner state for manual refresh
  const navigate = useNavigate();
  const addFileInputRef = useRef(null);
  const animationRef = useRef(null);
  const [isAnimating, setIsAnimating] = useState(true);
  const criticalPollTokenRef = useRef(0);
  const criticalPollIntervalRef = useRef(null);

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
      try {
        const meR = await fetch('http://localhost:5000/api/auth/me', { headers: { Authorization: `Bearer ${token}` } });
        const meD = await meR.json();
        const primaries = (meD?.user?.primaryPatients || []);
        setIsPrimary(Array.isArray(primaries) && primaries.some(pp => pp._id === d.patient.id));
      } catch {}
      setViewTier('early');
    } catch (e) {
      setToast({ type: 'error', message: 'Server error, please try again' });
    }
  };

  const getRecords = async (tier, opts = {}) => {
    if (!patient) return;
    const force = opts && opts.force === true;
    // Frontend security: only allow showing emergency-tier records if doctor has uploaded 3 docs in this browser session
    if (tier === 'emergency' && !emergencyUnlocked && !force) {
      setToast({ type: 'error', message: 'Upload at least 3 documents to view emergency records in this session' });
      // ensure emergency records are hidden
      setRecords([]);
      setViewTier(null);
      return;
    }
    // Frontend security: critical-tier should only be visible to primary doctors or after the primary approved and the doctor observed the approval in this session
    if (tier === 'critical' && !isPrimary && !criticalUnlocked && !force) {
      setToast({ type: 'error', message: 'Critical records require approval by the patient\'s primary doctor' });
      setRecords([]);
      setViewTier(null);
      return;
    }
    try {
      const r = await fetch(`http://localhost:5000/api/auth/doctor/patient/${patient.id}/records?tier=${tier}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await r.json();
      // Debug: surface server responses for troubleshooting approval flows
      console.debug('[PatientSearch] GET records', { tier, status: r.status, body: data });
      if (r.ok) {
        setRecords(data.records || []);
        setViewTier(tier);
        // If we successfully retrieved critical records as a non-primary, mark ephemeral unlock so they remain visible until navigation/refresh
        if (tier === 'critical' && !isPrimary) {
          if (Array.isArray(data.records) && data.records.length > 0) setCriticalUnlocked(true);
        }
        setToast({ type: 'success', message: `${tier.charAt(0).toUpperCase() + tier.slice(1)} access records loaded` });
        return Array.isArray(data.records) && data.records.length > 0;
      } else {
        setToast({ type: 'error', message: data.message || `Failed to load ${tier} records` });
        return false;
      }
    } catch (e) {
      setToast({ type: 'error', message: 'Server error, please try again' });
      return false;
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
  // mark emergency as unlocked for this session only
  setEmergencyUnlocked(true);
  setToast({ type: 'success', message: 'Emergency access granted for 10 minutes (this session)' });
  // fetch emergency records now that frontend allows viewing
  // bypass ephemeral check because server already approved; avoid race with setState
  await getRecords('emergency', { force: true });
    } catch (e) {
      setToast({ type: 'error', message: 'Server error, please try again' });
    }
  };

  const requestCritical = async () => {
    setToast({});
    if (!patient) return;
    try {
      const fd = new FormData();
      fd.append('tier', 'critical');
      critFiles.forEach((f) => fd.append('files', f));
  const r = await fetch(`http://localhost:5000/api/auth/doctor/patient/${patient.id}/access-request`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      });
      const d = await r.json();
  // Debug: show create access-request response
  console.debug('[PatientSearch] POST create access-request', { status: r.status, body: d });
  if (!r.ok) return setToast({ type: 'error', message: d.message || 'Failed to request critical access' });
      // Backend now triggers n8n; no client-side webhook
      // Inspect returned request status. If already approved, fetch records.
      setToast({ type: 'success', message: 'Critical access request created — waiting for primary doctor approval' });
      const reqStatus = d?.request?.status;
      // Cancel any previous polling interval and create a new one for this request
      const myToken = (criticalPollTokenRef.current += 1);
      if (criticalPollIntervalRef.current) {
        clearInterval(criticalPollIntervalRef.current);
        criticalPollIntervalRef.current = null;
      }

      // If server already marked this request as approved (rare), fetch once and return
      if (reqStatus === 'approved') {
        const gotNow = await getRecords('critical', { force: true });
        if (gotNow) {
          setToast({ type: 'success', message: 'Critical access approved — records loaded (this session)' });
          return;
        }
      }

      // Start interval polling every 5s; stop after 10 minutes if still pending
      const startedAt = Date.now();
      criticalPollIntervalRef.current = setInterval(async () => {
        // Stop if another poll superseded this one
        if (criticalPollTokenRef.current !== myToken) {
          clearInterval(criticalPollIntervalRef.current);
          criticalPollIntervalRef.current = null;
          return;
        }
        // Timeout after 10 minutes
        if (Date.now() - startedAt > 10 * 60 * 1000) {
          clearInterval(criticalPollIntervalRef.current);
          criticalPollIntervalRef.current = null;
          setToast({ type: 'info', message: 'Still pending approval from primary doctor. Please check back later.' });
          return;
        }
        const got = await getRecords('critical', { force: true });
        if (got) {
          clearInterval(criticalPollIntervalRef.current);
          criticalPollIntervalRef.current = null;
          setToast({ type: 'success', message: 'Critical access approved — records loaded (this session)' });
        }
      }, 5000);
    } catch (e) {
      setToast({ type: 'error', message: 'Server error, please try again' });
    }
  };

  const refreshCritical = async () => {
    setToast({});
    if (!patient || refreshingCritical) return;
    setRefreshingCritical(true);
    try {
      const ok = await getRecords('critical', { force: true });
      if (!ok) {
        setToast({ type: 'info', message: 'Still pending approval or no critical records available yet.' });
      }
    } finally {
      setRefreshingCritical(false);
    }
  };

  const handleAddDocument = (e, type) => {
    const f = e.target.files && e.target.files[0];
    if (!f) return;

    if (type === 'emergency') {
      const next = [...files, f];
      setFiles(next);
      setCount(next.length);
    } else if (type === 'critical') {
      const next = [...critFiles, f].slice(0, 3);
      setCritFiles(next);
      setCritCount(next.length);
    }

    e.target.value = '';
  };

  // Cleanup any pending critical polling on unmount
  useEffect(() => {
    return () => {
      if (criticalPollIntervalRef.current) {
        clearInterval(criticalPollIntervalRef.current);
        criticalPollIntervalRef.current = null;
      }
    };
  }, []);

  const handleDrop = (e, type) => {
    e.preventDefault();
    e.stopPropagation();
    const droppedFiles = Array.from(e.dataTransfer.files).filter(
      (f) => f.type === 'image/jpeg' || f.type === 'image/png' || f.type === 'application/pdf'
    );
    if (droppedFiles.length === 0) {
      setToast({ type: 'error', message: 'Only JPEG, PNG, or PDF files are allowed' });
      return;
    }

    if (type === 'emergency') {
      const next = [...files, ...droppedFiles];
      setFiles(next);
      setCount(next.length);
    } else if (type === 'critical') {
      const next = [...critFiles, ...droppedFiles].slice(0, 3);
      setCritFiles(next);
      setCritCount(next.length);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
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
            <div className="flex items-center space-x-4 mb-6">
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
            <div className="mb-8">
              <h3 className="text-lg font-semibold text-blue-800 mb-4">Access Level</h3>
              <div className="flex flex-wrap gap-4">
                <button
                  onClick={() => {
                    // switching away clears any ephemeral emergency unlock
                    setEmergencyUnlocked(false);
                    // also clear any ephemeral critical unlock and cancel polling
                    setCriticalUnlocked(false);
                    criticalPollTokenRef.current += 1;
                    setActiveTab(null); // Hide document upload section
                    getRecords('early');
                  }}
                  className={`px-6 py-3 rounded-xl font-semibold shadow-lg transition-all duration-300 flex items-center space-x-2 ${
                    viewTier === 'early'
                      ? 'bg-gradient-to-r from-blue-700 to-teal-600 text-white shadow-blue-500/40 transform -translate-y-1'
                      : 'bg-white text-blue-800 border border-blue-200 hover:shadow-xl hover:-translate-y-1'
                  }`}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>Early Access</span>
                </button>
                
                <button
                  onClick={() => {
                    // Show upload UI first. Only fetch emergency records if already unlocked this session.
                    // switching to emergency should hide any critical records and stop polling
                    setCriticalUnlocked(false);
                    criticalPollTokenRef.current += 1;
                    setActiveTab('emergency'); // Show emergency document upload
                    if (emergencyUnlocked) {
                      getRecords('emergency');
                    } else {
                      // Ensure no emergency records are visible until user requests and unlocks
                      setRecords([]);
                      setViewTier(null);
                    }
                  }}
                  className={`px-6 py-3 rounded-xl font-semibold shadow-lg transition-all duration-300 flex items-center space-x-2 ${
                    viewTier === 'emergency'
                      ? 'bg-gradient-to-r from-orange-600 to-orange-700 text-white shadow-orange-500/40 transform -translate-y-1'
                      : 'bg-white text-orange-800 border border-orange-200 hover:shadow-xl hover:-translate-y-1'
                  }`}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <span>Emergency Access</span>
                </button>
                
                <button
                  onClick={() => {
                    // switching away clears ephemeral emergency unlock
                    setEmergencyUnlocked(false);
                    // also stop any existing critical polling
                    criticalPollTokenRef.current += 1;
                    setActiveTab('critical'); // Show critical document upload
                    // Do NOT fetch critical records yet unless primary — just show the request UI
                    // Also ensure any previously visible records are cleared from view
                    setRecords([]);
                    setViewTier(null);
                    if (isPrimary) {
                      getRecords('critical');
                    } else {
                      setToast({ type: 'info', message: 'Request critical access and wait for primary approval.' });
                    }
                  }}
                  className={`px-6 py-3 rounded-xl font-semibold shadow-lg transition-all duration-300 flex items-center space-x-2 ${
                    viewTier === 'critical'
                      ? 'bg-gradient-to-r from-red-600 to-red-700 text-white shadow-red-500/40 transform -translate-y-1'
                      : 'bg-white text-red-800 border border-red-200 hover:shadow-xl hover:-translate-y-1'
                  }`}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                  <span>Critical Access</span>
                </button>
              </div>
            </div>

            {/* Document Upload Section */}
            {activeTab && (
              <div className="mb-8">
                <h3 className="text-lg font-semibold text-blue-800 mb-4">Add Documents</h3>
                
                {/* Emergency Documents */}
                {activeTab === 'emergency' && (
                  <div className="bg-blue-50/50 p-4 rounded-lg">
                    
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                      <div className="bg-white p-4 rounded-lg shadow-sm border border-blue-100">
                        <h4 className="font-medium text-blue-800 text-sm mb-2">Provisional Patent File</h4>
                        <label className="block bg-blue-600 text-white text-center py-2 px-3 rounded-lg text-xs cursor-pointer hover:bg-blue-700 transition-colors">
                          <input
                            type="file"
                            accept="image/jpeg,image/png,application/pdf"
                            className="hidden"
                            onChange={(e) => handleAddDocument(e, 'emergency')}
                          />
                          Upload File
                        </label>
                      </div>
                      
                      <div className="bg-white p-4 rounded-lg shadow-sm border border-blue-100">
                        <h4 className="font-medium text-blue-800 text-sm mb-2">MLC Report</h4>
                        <label className="block bg-blue-600 text-white text-center py-2 px-3 rounded-lg text-xs cursor-pointer hover:bg-blue-700 transition-colors">
                          <input
                            type="file"
                            accept="image/jpeg,image/png,application/pdf"
                            className="hidden"
                            onChange={(e) => handleAddDocument(e, 'emergency')}
                          />
                          Upload File
                        </label>
                      </div>
                      
                      <div className="bg-white p-4 rounded-lg shadow-sm border border-blue-100">
                        <h4 className="font-medium text-blue-800 text-sm mb-2">Implied Content</h4>
                        <label className="block bg-blue-600 text-white text-center py-2 px-3 rounded-lg text-xs cursor-pointer hover:bg-blue-700 transition-colors">
                          <input
                            type="file"
                            accept="image/jpeg,image/png,application/pdf"
                            className="hidden"
                            onChange={(e) => handleAddDocument(e, 'emergency')}
                          />
                          Upload File
                        </label>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-blue-600">
                        Selected: {count} / 3 required for emergency access
                      </span>
                      
                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            setFiles([]);
                            setCount(0);
                          }}
                          className="bg-gray-200 text-gray-800 px-4 py-2 rounded-lg font-medium text-sm shadow-md hover:shadow-lg transition-all"
                        >
                          Clear All
                        </button>
                        
                        <button
                          disabled={count < 3}
                          onClick={requestEmergency}
                          className={`px-4 py-2 rounded-lg font-medium text-sm transition-all ${
                            count < 3
                              ? 'bg-gray-300 text-gray-600 cursor-not-allowed'
                              : 'bg-gradient-to-r from-orange-600 to-orange-700 text-white shadow-xl shadow-orange-500/30 hover:shadow-2xl hover:shadow-orange-500/40 transform hover:-translate-y-1'
                          }`}
                        >
                          Request Emergency Access
                        </button>
                      </div>
                    </div>
                    
                    {files.length > 0 && (
                      <div className="mt-4">
                        <h4 className="text-sm font-semibold text-blue-800 mb-2">Uploaded Documents</h4>
                        <ul className="text-sm text-blue-600 space-y-1">
                          {files.map((f, i) => (
                            <li key={i} className="flex items-center space-x-2 bg-white/80 p-2 rounded-lg">
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
                              <span>{f.name}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
                
                {/* Critical Documents */}
                {activeTab === 'critical' && !isPrimary && (
                  <div className="bg-red-50/50 p-4 rounded-lg">
                    <div
                      className="border-2 border-dashed border-red-300 p-6 mb-4 rounded-lg text-center"
                      onDrop={(e) => handleDrop(e, 'critical')}
                      onDragOver={handleDragOver}
                    >
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                      <div className="bg-white p-4 rounded-lg shadow-sm border border-red-100">
                        <h4 className="font-medium text-red-800 text-sm mb-2">Provisional Patent File</h4>
                        <label className="block bg-red-600 text-white text-center py-2 px-3 rounded-lg text-xs cursor-pointer hover:bg-red-700 transition-colors">
                          <input
                            type="file"
                            accept="image/jpeg,image/png,application/pdf"
                            className="hidden"
                            onChange={(e) => handleAddDocument(e, 'critical')}
                          />
                          Upload File
                        </label>
                      </div>
                      
                      <div className="bg-white p-4 rounded-lg shadow-sm border border-red-100">
                        <h4 className="font-medium text-red-800 text-sm mb-2">MLC Report</h4>
                        <label className="block bg-red-600 text-white text-center py-2 px-3 rounded-lg text-xs cursor-pointer hover:bg-red-700 transition-colors">
                          <input
                            type="file"
                            accept="image/jpeg,image/png,application/pdf"
                            className="hidden"
                            onChange={(e) => handleAddDocument(e, 'critical')}
                          />
                          Upload File
                        </label>
                      </div>
                      
                      <div className="bg-white p-4 rounded-lg shadow-sm border border-red-100">
                        <h4 className="font-medium text-red-800 text-sm mb-2">Implied Content</h4>
                        <label className="block bg-red-600 text-white text-center py-2 px-3 rounded-lg text-xs cursor-pointer hover:bg-red-700 transition-colors">
                          <input
                            type="file"
                            accept="image/jpeg,image/png,application/pdf"
                            className="hidden"
                            onChange={(e) => handleAddDocument(e, 'critical')}
                          />
                          Upload File
                        </label>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-red-600">
                        Selected: {critCount} / 3 required for critical access
                      </span>
                      <div className="flex items-center gap-2">
                        <button
                          disabled={critCount !== 3}
                          onClick={requestCritical}
                          className={`px-4 py-2 rounded-lg font-medium text-sm transition-all ${
                            critCount !== 3
                              ? 'bg-gray-300 text-gray-600 cursor-not-allowed'
                              : 'bg-gradient-to-r from-red-600 to-red-700 text-white shadow-xl shadow-red-500/30 hover:shadow-2xl hover:shadow-red-500/40 transform hover:-translate-y-1'
                          }`}
                        >
                          Request Critical Access
                        </button>
                        <button
                          onClick={refreshCritical}
                          disabled={refreshingCritical}
                          className={`px-4 py-2 rounded-lg font-medium text-sm transition-all flex items-center gap-2 ${refreshingCritical ? 'bg-blue-200 text-blue-600 cursor-wait' : 'bg-blue-100 text-blue-800 hover:bg-blue-200'}`}
                          aria-busy={refreshingCritical}
                          aria-live="polite"
                        >
                          {refreshingCritical && (
                            <svg className="animate-spin h-4 w-4 text-blue-700" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" aria-hidden="true">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
                            </svg>
                          )}
                          {refreshingCritical ? 'Refreshing…' : 'Refresh Critical'}
                        </button>
                      </div>
                    </div>
                    
                    {critFiles.length > 0 && (
                      <div className="mt-4">
                        <h4 className="text-sm font-semibold text-red-800 mb-2">Uploaded Documents</h4>
                        <ul className="text-sm text-red-600 space-y-1">
                          {critFiles.map((f, i) => (
                            <li key={i} className="flex items-center space-x-2 bg-white/80 p-2 rounded-lg">
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                className="h-4 w-4 text-red-500"
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
                              <span>{f.name}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
                
                {activeTab === 'critical' && isPrimary && (
                  <div className="bg-green-50/50 p-4 rounded-lg text-center">
                    <p className="text-green-700">You are the primary doctor for this patient and have full access to critical records.</p>
                    <button
                      onClick={() => getRecords('critical')}
                      className="mt-3 bg-gradient-to-r from-green-600 to-green-700 text-white px-4 py-2 rounded-lg font-medium text-sm shadow-lg hover:shadow-xl transition-all"
                    >
                      View Critical Records
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Records Section */}
            <div>
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-blue-800 flex items-center space-x-2">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                  <span>Patient Records ({viewTier || 'none'})</span>
                </h3>
                
                <div className="text-sm font-medium px-3 py-1 rounded-full bg-blue-100 text-blue-800">
                  {records.length} records found
                </div>
              </div>
              
              {records.length === 0 ? (
                <div className="text-blue-600 text-center py-8 text-sm bg-blue-50/50 rounded-lg">
                  No records available for {viewTier || 'this'} access level.
                </div>
              ) : (
                <ul className="space-y-4">
                  {records.map((r) => (
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
                          <span
                            className={`px-2 py-1 rounded-full text-xs font-medium ${
                              r.accessTier === 'early'
                                ? 'bg-blue-100 text-blue-800'
                                : r.accessTier === 'emergency'
                                ? 'bg-orange-100 text-orange-800'
                                : 'bg-red-100 text-red-800'
                            }`}
                          >
                            {r.accessTier}
                          </span>
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