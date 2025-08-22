import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

export default function Doctor() {
  const [user, setUser] = useState(null);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [tier, setTier] = useState('early');
  const [form, setForm] = useState({});
  const [files, setFiles] = useState([]);
  const [toast, setToast] = useState({ type: '', message: '' });
  const [section, setSection] = useState({ label: '', data: '' });
  const [existing, setExisting] = useState(null);
  const [sectionEdits, setSectionEdits] = useState({});
  const navigate = useNavigate();
  const animationRef = useRef(null);
  const [isAnimating, setIsAnimating] = useState(true);

  const tierLabels = {
    early: 'Basic Information',
    emergency: 'Urgent Access',
    critical: 'Sensitive Records',
  };

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

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return navigate('/login');
    fetch('http://localhost:5000/api/auth/me', { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((d) => {
        if (d.user?.role !== 'doctor') return navigate('/patient');
        setUser(d.user);
      })
      .catch(() => navigate('/login'));
  }, [navigate]);

  // Animation loop for floating icons and cards
  useEffect(() => {
    if (!isAnimating) return;

    const startAnimation = () => {
      if (animationRef.current) {
        const elements = animationRef.current.querySelectorAll('[data-animate-icon], [data-animate-card], [data-animate-section]');
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

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  const selectPatient = async (p) => {
    setSelectedPatient(p);
    try {
      const token = localStorage.getItem('token');
      const r = await fetch(`http://localhost:5000/api/auth/doctor/patient/${p._id}/record/${tier}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const d = await r.json();
      if (r.ok && d.record) {
        setExisting(d.record);
        setForm(d.record.data || {});
        const edits = {};
        (d.record.sections || []).forEach((s) => {
          edits[s.id] = {
            label: s.label || '',
            data: s?.data && typeof s.data.text === 'string' ? s.data.text : JSON.stringify(s.data ?? {}, null, 2),
            files: [],
          };
        });
        setSectionEdits(edits);
      } else {
        setExisting(null);
        setForm({});
        setSectionEdits({});
      }
    } catch {
      setToast({ type: 'error', message: 'Failed to load patient record' });
    }
  };

  const saveRecord = async () => {
    try {
      setToast({});
      const fd = new FormData();
      fd.append('accessTier', tier);
      Object.entries(form).forEach(([k, v]) => fd.append(k, v ?? ''));
      files.forEach((f) => fd.append('files', f));
      const token = localStorage.getItem('token');
      const r = await fetch(`http://localhost:5000/api/auth/doctor/patient/${selectedPatient._id}/records/${tier}`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      });
      const d = await r.json();
      if (!r.ok) return setToast({ type: 'error', message: d.message || 'Failed to save record' });
      setToast({ type: 'success', message: 'Record saved successfully' });
    } catch (e) {
      setToast({ type: 'error', message: 'Server error, please try again' });
    }
  };

  const addSection = async () => {
    try {
      setToast({});
      const fd = new FormData();
      fd.append('label', section.label);
      fd.append('data', section.data);
      files.forEach((f) => fd.append('files', f));
      const token = localStorage.getItem('token');
      const r = await fetch(`http://localhost:5000/api/auth/doctor/patient/${selectedPatient._id}/records/${tier}/sections`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      });
      const d = await r.json();
      if (!r.ok) return setToast({ type: 'error', message: d.message || 'Failed to add section' });
      setToast({ type: 'success', message: 'Section added successfully' });
      setSection({ label: '', data: '' });
      setFiles([]);
      const rr = await fetch(`http://localhost:5000/api/auth/doctor/patient/${selectedPatient._id}/record/${tier}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const dd = await rr.json();
      if (rr.ok && dd.record) {
        setExisting(dd.record);
        const edits = {};
        (dd.record.sections || []).forEach((sx) => {
          edits[sx.id] = {
            label: sx.label || '',
            data: sx?.data && typeof sx.data.text === 'string' ? sx.data.text : JSON.stringify(sx.data ?? {}, null, 2),
            files: [],
          };
        });
        setSectionEdits(edits);
      }
    } catch (e) {
      setToast({ type: 'error', message: 'Server error, please try again' });
    }
  };

  const updateSection = async (sectionId) => {
    try {
      setToast({});
      const edit = sectionEdits[sectionId] || {};
      const fd = new FormData();
      fd.append('label', edit.label);
      fd.append('data', edit.data);
      (edit.files || []).forEach((f) => fd.append('files', f));
      const token = localStorage.getItem('token');
      const r = await fetch(
        `http://localhost:5000/api/auth/doctor/patient/${selectedPatient._id}/records/${tier}/sections/${sectionId}`,
        {
          method: 'PUT',
          headers: { Authorization: `Bearer ${token}` },
          body: fd,
        }
      );
      const d = await r.json();
      if (!r.ok) return setToast({ type: 'error', message: d.message || 'Failed to update section' });
      const rr = await fetch(`http://localhost:5000/api/auth/doctor/patient/${selectedPatient._id}/record/${tier}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const dd = await rr.json();
      if (rr.ok && dd.record) {
        setExisting(dd.record);
        const edits = {};
        (dd.record.sections || []).forEach((sx) => {
          edits[sx.id] = {
            label: sx.label || '',
            data: sx?.data && typeof sx.data.text === 'string' ? sx.data.text : JSON.stringify(sx.data ?? {}, null, 2),
            files: [],
          };
        });
        setSectionEdits(edits);
      }
      setToast({ type: 'success', message: 'Section updated successfully' });
    } catch {
      setToast({ type: 'error', message: 'Server error, please try again' });
    }
  };

  if (!user) return null;

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
          <div className="w-12 h-12 bg-blue-200/80 backdrop-blur-md rounded-2xl flex items-center justify-center hover:scale-110 transition-transform duration-300">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-blue-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
          </div>
        </div>
        <div data-animate-icon className="absolute bottom-24 right-20 animate-float animation-delay-1000">
          <div className="w-12 h-12 bg-teal-200/80 backdrop-blur-md rounded-2xl flex items-center justify-center hover:scale-110 transition-transform duration-300">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-teal-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>
        </div>
        <div data-animate-icon className="absolute top-1/3 left-1/2 animate-float animation-delay-2000">
          <div className="w-10 h-10 bg-blue-300/60 backdrop-blur-md rounded-2xl flex items-center justify-center hover:scale-110 transition-transform duration-300">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-800" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          </div>
        </div>
        <div data-animate-icon className="absolute top-48 right-32 animate-float animation-delay-1500">
          <div className="w-10 h-10 bg-teal-300/60 backdrop-blur-md rounded-xl flex items-center justify-center hover:scale-110 transition-transform duration-300">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-teal-800" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.121 14.121L19 19m-7-7l7-7m-7 7l-2.879 2.879M12 12L9.121 9.121m0 5.758a3 3 0 10-4.243 4.243 3 3 0 004.243-4.243zm0-5.758a3 3 0 10-4.243-4.243 3 3 0 004.243 4.243z" />
            </svg>
          </div>
        </div>
      </div>

      <div className="w-full max-w-5xl bg-white/95 backdrop-blur-xl rounded-3xl p-8 border border-blue-100/50 relative z-10">
        {/* Header */}
  <div className="flex justify-between items-center mb-8">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-gradient-to-r from-blue-600 to-teal-500 rounded-xl flex items-center justify-center animate-pulse-slow">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <div>
              <h1 className="text-3xl font-bold text-blue-900 animate-gradient-text">LifeLink Doctor Dashboard</h1>
              <p className="text-blue-700 text-sm mt-1">Welcome, Dr. {user.name}. Manage your patients efficiently.</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/doctor/patient-edit')}
              className="bg-gradient-to-r from-blue-600 to-teal-600 text-white px-4 py-2 rounded-lg font-semibold transition-all duration-300 transform hover:-translate-y-1 text-sm"
            >
              Edit Patient
            </button>
            <button
              onClick={() => navigate('/doctor/proposals')}
              className="bg-gradient-to-r from-indigo-600 to-indigo-700 text-white px-4 py-2 rounded-lg font-semibold transition-all duration-300 transform hover:-translate-y-1 text-sm"
            >
              Review Proposals
            </button>
            <button
              onClick={() => navigate('/doctor/critical-requests')}
              className="bg-gradient-to-r from-red-600 to-red-700 text-white px-4 py-2 rounded-lg font-semibold transition-all duration-300 transform hover:-translate-y-1 text-sm"
            >
              Critical Requests
            </button>
            <button
              onClick={logout}
              className="bg-gradient-to-r from-red-600 to-red-700 text-white px-5 py-2 rounded-lg font-semibold transition-all duration-300 transform hover:-translate-y-1 text-sm flex items-center space-x-2"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              <span>Logout</span>
            </button>
          </div>
        </div>

        {/* Primary Patients Section */}
        <div className="bg-white/80 backdrop-blur-lg rounded-2xl p-6 border border-blue-100/50">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-3">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              <h2 className="text-lg font-semibold text-blue-800">Primary Patients</h2>
            </div>
            <button
              onClick={() => navigate('/doctor/patient-search')}
              className="bg-gradient-to-r from-gray-800 to-gray-900 text-white px-5 py-2 rounded-lg font-semibold transition-all duration-300 transform hover:-translate-y-1 text-sm flex items-center space-x-2"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <span>Patient Search</span>
            </button>
          </div>

          {Array.isArray(user.primaryPatients) && user.primaryPatients.length > 0 ? (
            <ul className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {user.primaryPatients.map((p) => (
                <li
                  key={p._id}
                  data-animate-card
                  className="relative bg-white/90 backdrop-blur-md rounded-xl p-5 border border-blue-100/50 transition-all duration-500 hover:-translate-y-1 group"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-blue-100/20 to-teal-100/20 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                  <div className="flex items-center space-x-4 relative z-10">
                    <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <div className="font-semibold text-blue-900 text-lg">{p.name}</div>
                      <div className="text-sm text-blue-600">{p.email}</div>
                    </div>
                    <button
                      onClick={() => selectPatient(p)}
                      className="bg-gradient-to-r from-blue-700 to-teal-600 text-white px-4 py-2 rounded-lg font-semibold transition-all duration-300 transform hover:-translate-y-0.5 text-sm flex items-center space-x-2"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                      <span>Add Details</span>
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <div className="text-blue-600 text-center py-6 text-sm">
              No primary patients yet. Use the Patient Search to add patients.
            </div>
          )}
        </div>

        {/* Patient Details Form */}
        {selectedPatient && (
          <div className="mt-8 bg-white/80 backdrop-blur-lg rounded-2xl p-6 border border-blue-100/50 animate-fade-in">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-3">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                <h3 className="text-lg font-semibold text-blue-800">Manage Records for {selectedPatient.name}</h3>
              </div>
              <button
                onClick={() => {
                  setSelectedPatient(null);
                  setForm({});
                  setFiles([]);
                  setTier('early');
                  setToast({});
                  setSection({ label: '', data: '' });
                  setExisting(null);
                  setSectionEdits({});
                }}
                className="text-sm text-blue-600 underline hover:text-blue-800 transition-colors"
              >
                Close
              </button>
            </div>

            {/* Access Tier Selection */}
            <div className="flex gap-3 mb-6 flex-wrap">
              {['early', 'emergency', 'critical'].map((t) => (
                <button
                  key={t}
                  onClick={async () => {
                    setTier(t);
                    try {
                      const token = localStorage.getItem('token');
                      const r = await fetch(`http://localhost:5000/api/auth/doctor/patient/${selectedPatient._id}/record/${t}`, {
                        headers: { Authorization: `Bearer ${token}` },
                      });
                      const d = await r.json();
                      if (r.ok && d.record) {
                        setExisting(d.record);
                        setForm(d.record.data || {});
                        const edits = {};
                        (d.record.sections || []).forEach((s) => {
                          edits[s.id] = {
                            label: s.label || '',
                            data: s?.data && typeof s.data.text === 'string' ? s.data.text : JSON.stringify(s.data ?? {}, null, 2),
                            files: [],
                          };
                        });
                        setSectionEdits(edits);
                      } else {
                        setExisting(null);
                        setForm({});
                        setSectionEdits({});
                      }
                    } catch {
                      setToast({ type: 'error', message: 'Failed to load record' });
                    }
                  }}
                  className={`px-4 py-2 rounded-lg font-semibold text-sm transition-all duration-300 flex items-center space-x-2 ${
                    tier === t
                      ? 'bg-gradient-to-r from-blue-700 to-teal-600 text-white'
                      : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                  }`}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                  <span>{tierLabels[t]}</span>
                </button>
              ))}
            </div>

            {/* Tier-specific Form Fields */}
            <div className="grid md:grid-cols-2 gap-4 mb-6">
              {tier === 'early' && (
                <>
                  <Input label="Name" name="name" form={form} setForm={setForm} />
                  <Input label="Age" name="age" form={form} setForm={setForm} />
                  <Input label="Blood Group" name="bloodGroup" form={form} setForm={setForm} />
                  <Input label="Allergies" name="allergies" form={form} setForm={setForm} />
                  <Input label="Conditions (BP/Diabetes)" name="conditions" form={form} setForm={setForm} />
                  <Input label="Emergency Contacts" name="emergencyContacts" form={form} setForm={setForm} />
                </>
              )}
              {tier === 'emergency' && (
                <>
                  <Input label="Current Medications" name="medications" form={form} setForm={setForm} />
                  <Input label="Critical Notes" name="criticalNotes" form={form} setForm={setForm} />
                  <Input label="Recent Surgeries/Accidents" name="surgeries" form={form} setForm={setForm} />
                  <Input label="History Summary" name="historySummary" form={form} setForm={setForm} />
                </>
              )}
              {tier === 'critical' && (
                <>
                  <Input label="Full Medications" name="medications" form={form} setForm={setForm} />
                  <Input label="Critical Notes" name="criticalNotes" form={form} setForm={setForm} />
                  <Input label="Surgeries/Admissions" name="surgeries" form={form} setForm={setForm} />
                  <Input label="Long-term History" name="historySummary" form={form} setForm={setForm} />
                </>
              )}
            </div>

            {existing && (
              <div className="mb-4 text-sm text-blue-600">
                Editing existing {tierLabels[tier]} record from {new Date(existing.createdAt).toLocaleString()}
              </div>
            )}

            {/* File Upload */}
            <div className="mb-6">
              <label className="block text-sm font-semibold text-blue-800 mb-2">Attach JPG/PDF (optional)</label>
              <input
                type="file"
                accept="image/jpeg,image/png,application/pdf"
                multiple
                className="w-full text-sm text-blue-600 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-blue-100 file:text-blue-700 hover:file:bg-blue-200"
                onChange={(e) => setFiles(Array.from(e.target.files || []))}
              />
              {files.length > 0 && (
                <ul className="mt-2 text-sm text-blue-600 list-disc pl-5 space-y-1">
                  {files.map((f, i) => (
                    <li key={i} className="flex items-center space-x-2">
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
              )}
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

            {/* Save Button */}
            <div className="mt-4">
              <button
                onClick={saveRecord}
                className="bg-gradient-to-r from-blue-700 to-teal-600 text-white px-5 py-2 rounded-lg font-semibold transition-all duration-300 transform hover:-translate-y-1 text-sm flex items-center space-x-2"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                </svg>
                <span>Save Details</span>
              </button>
            </div>

            {/* Add Section */}
            <div className="mt-8 border-t pt-6">
              <h4 className="text-lg font-semibold text-blue-800 mb-4 flex items-center space-x-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                <span>Add Section to {tierLabels[tier]} Record</span>
              </h4>
              <div className="grid md:grid-cols-2 gap-4 mb-4">
                <Input label="Section Label" name="label" form={section} setForm={setSection} />
                <div>
                  <label className="block text-sm font-semibold text-blue-800 mb-2">Section Data (JSON or text)</label>
                  <textarea
                    className="w-full border-2 border-blue-200 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-300 text-blue-900 text-sm bg-white/80"
                    rows={4}
                    value={section.data}
                    onChange={(e) => setSection((p) => ({ ...p, data: e.target.value }))}
                  />
                </div>
              </div>
              <div className="mb-4">
                <label className="block text-sm font-semibold text-blue-800 mb-2">Attach JPG/PDF (optional)</label>
                <input
                  type="file"
                  accept="image/jpeg,image/png,application/pdf"
                  multiple
                  className="w-full text-sm text-blue-600 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-blue-100 file:text-blue-700 hover:file:bg-blue-200"
                  onChange={(e) => setFiles(Array.from(e.target.files || []))}
                />
                {files.length > 0 && (
                  <ul className="mt-2 text-sm text-blue-600 list-disc pl-5 space-y-1">
                    {files.map((f, i) => (
                      <li key={i} className="flex items-center space-x-2">
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
                )}
              </div>
              <button
                onClick={addSection}
                className="bg-gradient-to-r from-gray-800 to-gray-900 text-white px-5 py-2 rounded-lg font-semibold transition-all duration-300 transform hover:-translate-y-1 text-sm flex items-center space-x-2"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                <span>Add Section</span>
              </button>
            </div>

            {/* Existing Sections */}
            {existing && Array.isArray(existing.sections) && existing.sections.length > 0 && (
              <div className="mt-8 border-t pt-6">
                <h4 className="text-lg font-semibold text-blue-800 mb-4 flex items-center space-x-2">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-600" fill="none" viewBox="0 0 24 31" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                  <span>Existing Sections</span>
                </h4>
                <ul className="space-y-4">
                  {existing.sections.map((s) => {
                    const edit = sectionEdits[s.id] || {
                      label: s.label || '',
                      data: s?.data && typeof s.data.text === 'string' ? s.data.text : JSON.stringify(s.data ?? {}, null, 2),
                      files: [],
                    };
                    return (
                      <li
                        key={s.id}
                        data-animate-section
                        className="bg-white/90 backdrop-blur-md rounded-xl p-5 border border-blue-100/50 transition-all duration-500 hover:-translate-y-1 group"
                      >
                        <div className="absolute inset-0 bg-gradient-to-r from-blue-100/20 to-teal-100/20 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                        <div className="relative z-10">
                          <div className="text-sm text-blue-600 mb-2">{new Date(s.updatedAt || s.createdAt).toLocaleString()}</div>
                          <div className="grid md:grid-cols-2 gap-4 mb-4">
                            <div>
                              <label className="block text-sm font-semibold text-blue-800 mb-2">Label</label>
                              <input
                                className="w-full border-2 border-blue-200 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-300 text-blue-900 text-sm bg-white/80"
                                value={edit.label}
                                onChange={(e) => setSectionEdits((p) => ({ ...p, [s.id]: { ...edit, label: e.target.value } }))}
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-semibold text-blue-800 mb-2">Data (JSON or text)</label>
                              <textarea
                                className="w-full border-2 border-blue-200 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-300 text-blue-900 text-sm bg-white/80"
                                rows={4}
                                value={edit.data}
                                onChange={(e) => setSectionEdits((p) => ({ ...p, [s.id]: { ...edit, data: e.target.value } }))}
                              />
                            </div>
                          </div>
                          {Array.isArray(s.files) && s.files.length > 0 && (
                            <div className="mb-4">
                              <h5 className="text-sm font-semibold text-blue-800">Current Files</h5>
                              <div className="mt-2 space-y-2">
                                {s.files.map((f, idx) => (
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
                                        href={f.url}
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
                          <div className="mb-4">
                            <label className="block text-sm font-semibold text-blue-800 mb-2">Replace Files (optional)</label>
                            <input
                              type="file"
                              multiple
                              accept="image/jpeg,image/png,application/pdf"
                              className="w-full text-sm text-blue-600 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-blue-100 file:text-blue-700 hover:file:bg-blue-200"
                              onChange={(e) => {
                                const fs = Array.from(e.target.files || []);
                                setSectionEdits((p) => ({ ...p, [s.id]: { ...edit, files: fs } }));
                              }}
                            />
                            {edit.files.length > 0 && (
                              <ul className="mt-2 text-sm text-blue-600 list-disc pl-5 space-y-1">
                                {edit.files.map((f, i) => (
                                  <li key={i} className="flex items-center space-x-2">
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
                            )}
                          </div>
                          <button
                            onClick={() => updateSection(s.id)}
                            className="bg-gradient-to-r from-green-600 to-green-700 text-white px-4 py-2 rounded-lg font-semibold transition-all duration-300 transform hover:-translate-y-0.5 text-sm flex items-center space-x-2"
                          >
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              className="h-4 w-4"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4"
                              />
                            </svg>
                            <span>Save Changes</span>
                          </button>
                          <div className="mt-3">
                            <details>
                              <summary className="cursor-pointer text-sm text-blue-600 hover:text-blue-800 transition-colors">
                                Current Data Preview
                              </summary>
                              <pre className="whitespace-pre-wrap text-xs text-blue-900 bg-blue-50/50 p-3 rounded-lg mt-1">
                                {formatDataText(s.data)}
                              </pre>
                            </details>
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function Input({ label, name, form, setForm }) {
  return (
    <div>
      <label className="block text-sm font-semibold text-blue-800 mb-2">{label}</label>
      <input
        className="w-full border-2 border-blue-200 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-300 text-blue-900 text-sm bg-white/80"
        value={form[name] || ''}
        onChange={(e) => setForm((p) => ({ ...p, [name]: e.target.value }))}
      />
    </div>
  );
}