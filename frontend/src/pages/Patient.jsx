import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

export default function Patient() {
  const [user, setUser] = useState(null);
  const [showAdd, setShowAdd] = useState(false);
  const [medicalId, setMedicalId] = useState('');
  const [searchResult, setSearchResult] = useState(null);
  const [toast, setToast] = useState({ type: '', message: '' });
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const animationRef = useRef(null);
  const [isAnimating, setIsAnimating] = useState(true);

  const token = localStorage.getItem('token');

  const loadMe = async () => {
    if (!token) return navigate('/login');
    try {
      const r = await fetch('http://localhost:5000/api/auth/me', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.message || 'Auth failed');
      if (d.user?.role !== 'patient') {
        return navigate('/doctor');
      }
      setUser(d.user);
    } catch (e) {
      navigate('/login');
    }
  };

  useEffect(() => {
    loadMe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Animation loop for floating icons and cards
  useEffect(() => {
    if (!isAnimating) return;

    const startAnimation = () => {
      if (animationRef.current) {
        const elements = animationRef.current.querySelectorAll('[data-animate-icon], [data-animate-card]');
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

  const searchDoctor = async () => {
    setSearchResult(null);
    setToast({});
    if (!medicalId.trim()) return setToast({ type: 'error', message: 'Enter a valid medical ID' });
    setLoading(true);
    try {
      const r = await fetch(`http://localhost:5000/api/auth/doctor/by-medical/${encodeURIComponent(medicalId.trim())}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const d = await r.json();
      if (!r.ok) return setToast({ type: 'error', message: d.message || 'Doctor not found' });
      setSearchResult(d.doctor);
    } catch (e) {
      setToast({ type: 'error', message: 'Server error, please try again' });
    } finally {
      setLoading(false);
    }
  };

  const addPrimaryDoctor = async () => {
    if (!searchResult) return;
    setLoading(true);
    setToast({});
    try {
      const r = await fetch('http://localhost:5000/api/auth/patient/add-primary-doctor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ medicalId: searchResult.medicalId }),
      });
      const d = await r.json();
      if (!r.ok) return setToast({ type: 'error', message: d.message || 'Unable to add doctor' });
      setToast({ type: 'success', message: 'Doctor added successfully' });
      setUser((prev) => ({ ...prev, primaryDoctors: d.primaryDoctors }));
      setShowAdd(false);
      setMedicalId('');
      setSearchResult(null);
    } catch (e) {
      setToast({ type: 'error', message: 'Server error, please try again' });
    } finally {
      setLoading(false);
    }
  };

  const removePrimaryDoctor = async (medicalId) => {
    setLoading(true);
    setToast({});
    try {
      const r = await fetch(`http://localhost:5000/api/auth/patient/primary-doctor/${encodeURIComponent(medicalId)}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      const resp = await r.json();
      if (!r.ok) return setToast({ type: 'error', message: resp.message || 'Unable to remove doctor' });
      setUser((prev) => ({ ...prev, primaryDoctors: resp.primaryDoctors }));
      setToast({ type: 'success', message: 'Doctor removed successfully' });
    } catch (e) {
      setToast({ type: 'error', message: 'Server error, please try again' });
    } finally {
      setLoading(false);
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
              <h1 className="text-3xl font-bold text-blue-900 animate-gradient-text">LifeLink Patient Dashboard</h1>
              <p className="text-blue-700 text-sm mt-1">Welcome, {user.name}. Manage your healthcare with ease.</p>
            </div>
          </div>
          <button
            onClick={logout}
            className="bg-gradient-to-r from-red-600 to-red-700 text-white px-5 py-2 rounded-lg font-semibold hover:-translate-y-1 transition-all duration-300 transform text-sm flex items-center space-x-2"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            <span>Logout</span>
          </button>
        </div>

        {/* Primary Doctors Section */}
        <div className="bg-white/80 backdrop-blur-lg rounded-2xl p-6 border border-blue-100/50">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-3">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              <h2 className="text-xl font-semibold text-blue-800">Your Primary Doctors</h2>
            </div>
            <button
              onClick={() => setShowAdd((v) => !v)}
              disabled={Array.isArray(user.primaryDoctors) && user.primaryDoctors.length >= 1}
              className={`flex items-center space-x-2 px-5 py-2 rounded-lg font-semibold text-sm transition-all duration-300 ${
                Array.isArray(user.primaryDoctors) && user.primaryDoctors.length >= 1
                  ? 'bg-gray-200 text-gray-600 cursor-not-allowed'
                  : 'bg-gradient-to-r from-blue-700 to-teal-600 text-white transform hover:-translate-y-1'
              }`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              <span>{showAdd ? 'Close' : 'Add New Doctor'}</span>
            </button>
          </div>

          {Array.isArray(user.primaryDoctors) && user.primaryDoctors.length > 0 ? (
            <ul className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {user.primaryDoctors.map((d) => (
                <li
                  key={d._id}
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
                      <div className="font-semibold text-blue-900 text-lg">Dr. {d.name}</div>
                      <div className="text-sm text-blue-600">Medical ID: {d.medicalId}</div>
                    </div>
                    <button
                      onClick={() => removePrimaryDoctor(d.medicalId)}
                      disabled={loading}
                      className="bg-gradient-to-r from-red-600 to-red-700 text-white px-4 py-2 rounded-lg font-semibold hover:-translate-y-0.5 transition-all duration-300 transform text-sm flex items-center space-x-2"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                      <span>{loading ? 'Removing...' : 'Remove'}</span>
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <div className="text-blue-600 text-center py-6 text-sm">
              No primary doctors added yet. Start by adding a trusted healthcare provider.
            </div>
          )}

          {showAdd && (!Array.isArray(user.primaryDoctors) || user.primaryDoctors.length === 0) && (
            <div className="mt-8 bg-white/50 backdrop-blur-sm rounded-xl p-6 border border-blue-100/50 animate-fade-in">
              <h3 className="text-lg font-semibold text-blue-800 mb-4 flex items-center space-x-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <span>Find a Doctor</span>
              </h3>
              <div className="flex gap-4 mb-4">
                <div className="relative flex-1">
                  <input
                    className="w-full px-4 py-3 pl-10 rounded-lg border-2 border-blue-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-300 text-blue-900 text-sm bg-white/80"
                    placeholder="Enter doctor's medical ID"
                    value={medicalId}
                    onChange={(e) => setMedicalId(e.target.value)}
                  />
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 text-blue-500">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>
                </div>
                <button
                  onClick={searchDoctor}
                  disabled={loading}
                  className="bg-gradient-to-r from-blue-700 to-teal-600 text-white px-5 py-3 rounded-lg font-semibold hover:-translate-y-1 transition-all duration-300 transform text-sm flex items-center space-x-2"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <span>{loading ? 'Searching...' : 'Search Doctor'}</span>
                </button>
              </div>
              {toast.message && (
                <div
                  className={`p-3 rounded-lg text-sm transition-all duration-300 animate-slide-in ${
                    toast.type === 'error' ? 'bg-red-200 text-red-800' : 'bg-green-200 text-green-800'
                  }`}
                >
                  {toast.message}
                </div>
              )}
              {searchResult && (
                <div
                  data-animate-card
                  className="bg-white/90 backdrop-blur-md rounded-xl p-5 flex items-center justify-between border border-blue-100/50 transition-all duration-500 hover:-translate-y-1"
                >
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 bg-teal-100 rounded-full flex items-center justify-center">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-teal-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    </div>
                    <div>
                      <div className="font-semibold text-blue-900 text-lg">Dr. {searchResult.name}</div>
                      <div className="text-sm text-blue-600">Medical ID: {searchResult.medicalId}</div>
                    </div>
                  </div>
                  <button
                    onClick={addPrimaryDoctor}
                    disabled={loading}
                    className="bg-gradient-to-r from-blue-700 to-teal-600 text-white px-5 py-2 rounded-lg font-semibold hover:-translate-y-1 transition-all duration-300 transform text-sm flex items-center space-x-2"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    <span>{loading ? 'Adding...' : 'Add as Primary'}</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}