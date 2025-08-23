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
  }, [token, navigate]);

  // Animation for floating elements
  useEffect(() => {
    const startAnimation = () => {
      if (animationRef.current) {
        const elements = animationRef.current.querySelectorAll('[data-animate]');
        elements.forEach((el, index) => {
          el.style.animation = 'none';
          setTimeout(() => {
            el.style.animation = `float 6s ease-in-out ${index * 0.5}s infinite`;
          }, 10);
        });
      }
    };

    startAnimation();
    const interval = setInterval(startAnimation, 12000);
    return () => clearInterval(interval);
  }, []);

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

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-teal-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-teal-50 p-6 overflow-hidden relative">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-blue-400/20 rounded-full animate-pulse"></div>
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-teal-400/20 rounded-full animate-pulse animation-delay-2000"></div>
        <div className="absolute top-1/3 left-1/4 w-64 h-64 bg-indigo-400/15 rounded-full animate-pulse animation-delay-4000"></div>
      </div>

      {/* Floating medical icons */}
      <div ref={animationRef} className="absolute inset-0 pointer-events-none">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div
            key={i}
            data-animate
            className="absolute"
            style={{
              top: `${20 + (i * 12) % 70}%`,
              left: `${5 + (i * 15) % 85}%`,
              animationDelay: `${i * 0.5}s`
            }}
          >
            <div className="w-10 h-10 bg-white/80 backdrop-blur-md rounded-xl flex items-center justify-center shadow-lg hover:scale-110 transition-transform duration-300">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        ))}
      </div>

      <div className="max-w-6xl mx-auto relative z-10">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 p-6 bg-white/90 backdrop-blur-lg rounded-2xl shadow-lg border border-blue-100/50">
          <div className="flex items-center space-x-4 mb-4 md:mb-0">
            <div className="w-14 h-14 bg-gradient-to-r from-blue-600 to-teal-500 rounded-xl flex items-center justify-center shadow-lg animate-pulse-slow">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-blue-900">Patient Dashboard</h1>
              <p className="text-blue-700 mt-1">Welcome back, {user.name}</p>
            </div>
          </div>
          <button
            onClick={logout}
            className="bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white px-5 py-2.5 rounded-xl font-medium shadow-md hover:shadow-lg transition-all duration-300 flex items-center space-x-2 group"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 group-hover:scale-110 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            <span>Logout</span>
          </button>
        </div>

        {/* Toast Message */}
        {toast.message && (
          <div
            className={`p-4 rounded-xl mb-6 transition-all duration-300 flex items-center ${
              toast.type === 'error' 
                ? 'bg-red-50 text-red-800 border border-red-200' 
                : 'bg-green-50 text-green-800 border border-green-200'
            }`}
          >
            <div className={`rounded-full p-1.5 mr-3 ${toast.type === 'error' ? 'bg-red-100' : 'bg-green-100'}`}>
              <svg 
                xmlns="http://www.w3.org/2000/svg" 
                className={`h-5 w-5 ${toast.type === 'error' ? 'text-red-600' : 'text-green-600'}`} 
                fill="none" 
                viewBox="0 0 24 24" 
                stroke="currentColor"
              >
                {toast.type === 'error' ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                )}
              </svg>
            </div>
            {toast.message}
          </div>
        )}

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          <div 
            onClick={() => navigate('/patient/records')}
            className="bg-gradient-to-r from-blue-500 to-teal-400 text-white rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer transform hover:-translate-y-1 group"
          >
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-white/20 rounded-xl group-hover:scale-110 transition-transform duration-300">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div>
                <h3 className="text-xl font-bold">Medical Records</h3>
                <p className="text-white/90 mt-1">Access your health records</p>
              </div>
            </div>
          </div>

          <div 
            onClick={() => navigate('/patient/appointments')}
            className="bg-gradient-to-r from-indigo-500 to-purple-400 text-white rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer transform hover:-translate-y-1 group"
          >
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-white/20 rounded-xl group-hover:scale-110 transition-transform duration-300">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <div>
                <h3 className="text-xl font-bold">Appointments</h3>
                <p className="text-white/90 mt-1">Schedule and manage visits</p>
              </div>
            </div>
          </div>

          <div 
            onClick={() => navigate('/patient/prescriptions')}
            className="bg-gradient-to-r from-teal-500 to-cyan-400 text-white rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer transform hover:-translate-y-1 group"
          >
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-white/20 rounded-xl group-hover:scale-110 transition-transform duration-300">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
              <div>
                <h3 className="text-xl font-bold">Prescriptions</h3>
                <p className="text-white/90 mt-1">View your medications</p>
              </div>
            </div>
          </div>
        </div>
        
        {/* Primary Doctors Section */}
        <div className="bg-white/90 backdrop-blur-lg rounded-2xl p-6 border border-blue-100/50 shadow-lg">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-6">
            <div className="flex items-center space-x-3 mb-4 md:mb-0">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <h2 className="text-xl font-semibold text-blue-800">Your Primary Doctors</h2>
            </div>
            <button
              onClick={() => setShowAdd((v) => !v)}
              disabled={Array.isArray(user.primaryDoctors) && user.primaryDoctors.length >= 3}
              className={`flex items-center space-x-2 px-5 py-2.5 rounded-xl font-medium text-sm transition-all duration-300 ${
                Array.isArray(user.primaryDoctors) && user.primaryDoctors.length >= 3
                  ? 'bg-gray-200 text-gray-600 cursor-not-allowed'
                  : 'bg-gradient-to-r from-blue-600 to-teal-500 text-white hover:shadow-md'
              }`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              <span>{showAdd ? 'Close' : 'Add Doctor'}</span>
            </button>
          </div>

          {Array.isArray(user.primaryDoctors) && user.primaryDoctors.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {user.primaryDoctors.map((d) => (
                <div
                  key={d._id}
                  className="relative bg-white rounded-xl p-5 border border-blue-100 transition-all duration-300 hover:shadow-md hover:-translate-y-1 group"
                >
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-blue-900 truncate">Dr. {d.name}</div>
                      <div className="text-sm text-blue-600 truncate">ID: {d.medicalId}</div>
                    </div>
                    <button
                      onClick={() => removePrimaryDoctor(d.medicalId)}
                      disabled={loading}
                      className="bg-gradient-to-r from-red-500 to-red-600 text-white px-4 py-2 rounded-lg font-medium hover:shadow-md transition-all duration-300 flex items-center space-x-2 text-sm"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                      <span>{loading ? 'Removing...' : 'Remove'}</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 border border-dashed border-blue-200 rounded-xl bg-blue-50/50">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-blue-400 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <h3 className="text-lg font-medium text-blue-600 mb-1">No doctors added yet</h3>
              <p className="text-blue-500 text-sm">Add your primary care physicians to get started</p>
            </div>
          )}

          {showAdd && (!Array.isArray(user.primaryDoctors) || user.primaryDoctors.length < 3) && (
            <div className="mt-6 bg-blue-50/50 rounded-xl p-5 border border-blue-200">
              <h3 className="text-lg font-semibold text-blue-800 mb-4 flex items-center space-x-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <span>Find a Doctor</span>
              </h3>
              <div className="flex flex-col sm:flex-row gap-3 mb-4">
                <div className="relative flex-1">
                  <input
                    className="w-full px-4 py-3 pl-10 rounded-xl border border-blue-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-300 text-blue-900 bg-white"
                    placeholder="Enter doctor's medical ID"
                    value={medicalId}
                    onChange={(e) => setMedicalId(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && searchDoctor()}
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
                  className="bg-gradient-to-r from-blue-600 to-teal-500 text-white px-5 py-3 rounded-xl font-medium hover:shadow-md transition-all duration-300 flex items-center space-x-2 justify-center"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <span>{loading ? 'Searching...' : 'Search'}</span>
                </button>
              </div>
              
              {searchResult && (
                <div className="bg-white rounded-xl p-4 flex flex-col sm:flex-row items-center justify-between border border-blue-200">
                  <div className="flex items-center space-x-4 mb-3 sm:mb-0">
                    <div className="w-12 h-12 bg-teal-100 rounded-full flex items-center justify-center">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-teal-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    </div>
                    <div>
                      <div className="font-semibold text-blue-900">Dr. {searchResult.name}</div>
                      <div className="text-sm text-blue-600">Medical ID: {searchResult.medicalId}</div>
                    </div>
                  </div>
                  <button
                    onClick={addPrimaryDoctor}
                    disabled={loading}
                    className="bg-gradient-to-r from-green-500 to-green-600 text-white px-5 py-2 rounded-lg font-medium hover:shadow-md transition-all duration-300 flex items-center space-x-2"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    <span>{loading ? 'Adding...' : 'Add Doctor'}</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Add custom animations */}
      <style>
        {`
          @keyframes float {
            0%, 100% { transform: translateY(0) rotate(0deg); }
            50% { transform: translateY(-15px) rotate(5deg); }
          }
          .animation-delay-2000 {
            animation-delay: 2s;
          }
          .animation-delay-4000 {
            animation-delay: 4s;
          }
        `}
      </style>
    </div>
  );
}