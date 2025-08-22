import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function PatientRecords() {
  const [user, setUser] = useState(null);
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('all'); // 'all', 'early', 'emergency', 'critical'
  const navigate = useNavigate();

  const token = localStorage.getItem('token');

  // Load user data
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

  // Load patient records
  const loadRecords = async () => {
    setLoading(true);
    setError(null);
    try {
      const r = await fetch('http://localhost:5000/api/auth/patient/my-records', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.message || 'Failed to load records');
      setRecords(d.records || []);
    } catch (e) {
      setError(e.message || 'Error loading records');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (user) {
      loadRecords();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // Filter records based on active tab
  const filteredRecords = activeTab === 'all' 
    ? records 
    : records.filter(record => record.accessTier === activeTab);

  // Format date
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Navigate back to dashboard
  const goToDashboard = () => {
    navigate('/patient');
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

      <div className="w-full max-w-5xl bg-white/95 backdrop-blur-xl rounded-3xl p-8 border border-blue-100/50 relative z-10">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-gradient-to-r from-blue-600 to-teal-500 rounded-xl flex items-center justify-center animate-pulse-slow">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div>
              <h1 className="text-3xl font-bold text-blue-900 animate-gradient-text">My Medical Records</h1>
              <p className="text-blue-700 text-sm mt-1">View your medical records by access tier</p>
            </div>
          </div>
          <button
            onClick={goToDashboard}
            className="bg-gradient-to-r from-blue-600 to-teal-500 text-white px-5 py-2 rounded-lg font-semibold hover:-translate-y-1 transition-all duration-300 transform text-sm flex items-center space-x-2"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            <span>Back to Dashboard</span>
          </button>
        </div>

        {/* Tabs */}
        <div className="flex space-x-2 mb-6">
          <button
            onClick={() => setActiveTab('all')}
            className={`px-4 py-2 rounded-lg font-medium text-sm transition-all duration-300 ${activeTab === 'all' ? 'bg-blue-600 text-white' : 'bg-blue-100 text-blue-800 hover:bg-blue-200'}`}
          >
            All Records
          </button>
          <button
            onClick={() => setActiveTab('early')}
            className={`px-4 py-2 rounded-lg font-medium text-sm transition-all duration-300 ${activeTab === 'early' ? 'bg-green-600 text-white' : 'bg-green-100 text-green-800 hover:bg-green-200'}`}
          >
            Early Access
          </button>
          <button
            onClick={() => setActiveTab('emergency')}
            className={`px-4 py-2 rounded-lg font-medium text-sm transition-all duration-300 ${activeTab === 'emergency' ? 'bg-yellow-600 text-white' : 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200'}`}
          >
            Emergency Access
          </button>
          <button
            onClick={() => setActiveTab('critical')}
            className={`px-4 py-2 rounded-lg font-medium text-sm transition-all duration-300 ${activeTab === 'critical' ? 'bg-red-600 text-white' : 'bg-red-100 text-red-800 hover:bg-red-200'}`}
          >
            Critical Access
          </button>
        </div>

        {/* Records Content */}
        <div className="bg-white/80 backdrop-blur-lg rounded-2xl p-6 border border-blue-100/50">
          {loading ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
            </div>
          ) : error ? (
            <div className="text-center text-red-600 p-4 bg-red-50 rounded-xl">
              <p>{error}</p>
            </div>
          ) : filteredRecords.length === 0 ? (
            <div className="text-center text-gray-600 p-8">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mx-auto text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p className="text-lg font-medium">No records found</p>
              <p className="text-sm mt-2">
                {activeTab === 'all' 
                  ? 'You don\'t have any medical records yet.'
                  : `You don\'t have any ${activeTab} tier records.`}
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {filteredRecords.map((record) => (
                <div key={record.id} className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm hover:shadow-md transition-shadow duration-300">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className={
                          `px-2 py-1 text-xs font-medium rounded-full ${
                            record.accessTier === 'early' ? 'bg-green-100 text-green-800' :
                            record.accessTier === 'emergency' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-red-100 text-red-800'
                          }`
                        }>
                          {record.accessTier.charAt(0).toUpperCase() + record.accessTier.slice(1)} Access
                        </span>
                        <span className="text-gray-500 text-sm">{formatDate(record.createdAt)}</span>
                      </div>
                      <h3 className="text-lg font-semibold mt-2">{record.data?.title || 'Medical Record'}</h3>
                    </div>
                  </div>
                  
                  {/* Record Content */}
                  <div className="prose prose-sm max-w-none">
                    <p>{record.data?.description || 'No description provided.'}</p>
                    
                    {/* Display record fields */}
                    {record.data?.fields && Object.entries(record.data.fields).length > 0 && (
                      <div className="mt-4 grid grid-cols-2 gap-4">
                        {Object.entries(record.data.fields).map(([key, value]) => (
                          <div key={key} className="bg-gray-50 p-3 rounded-lg">
                            <p className="text-xs text-gray-500 font-medium">{key}</p>
                            <p className="font-medium">{value}</p>
                          </div>
                        ))}
                      </div>
                    )}
                    
                    {/* Files */}
                    {record.files && record.files.length > 0 && (
                      <div className="mt-4">
                        <h4 className="text-sm font-semibold mb-2">Attached Files</h4>
                        <div className="flex flex-wrap gap-2">
                          {record.files.map((file, idx) => (
                            <a
                              key={idx}
                              href={file.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center space-x-1 bg-blue-50 hover:bg-blue-100 text-blue-700 px-3 py-1 rounded-lg text-sm transition-colors duration-200"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                              </svg>
                              <span>{file.name}</span>
                            </a>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                  
                  {/* Sections */}
                  {record.sections && record.sections.length > 0 && (
                    <div className="mt-6 space-y-4">
                      <h4 className="text-md font-semibold">Additional Sections</h4>
                      {record.sections.map((section) => (
                        <div key={section.id} className="bg-gray-50 p-4 rounded-xl">
                          <div className="flex justify-between items-center mb-2">
                            <h5 className="font-medium">{section.label}</h5>
                            <span className="text-xs text-gray-500">{formatDate(section.updatedAt || section.createdAt)}</span>
                          </div>
                          
                          <div className="prose prose-sm max-w-none">
                            <p>{section.data?.description || 'No description provided.'}</p>
                            
                            {/* Display section fields */}
                            {section.data?.fields && Object.entries(section.data.fields).length > 0 && (
                              <div className="mt-3 grid grid-cols-2 gap-3">
                                {Object.entries(section.data.fields).map(([key, value]) => (
                                  <div key={key} className="bg-white p-2 rounded-lg border border-gray-100">
                                    <p className="text-xs text-gray-500 font-medium">{key}</p>
                                    <p className="font-medium">{value}</p>
                                  </div>
                                ))}
                              </div>
                            )}
                            
                            {/* Section Files */}
                            {section.files && section.files.length > 0 && (
                              <div className="mt-3">
                                <h6 className="text-xs font-semibold mb-2">Attached Files</h6>
                                <div className="flex flex-wrap gap-2">
                                  {section.files.map((file, idx) => (
                                    <a
                                      key={idx}
                                      href={file.url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="flex items-center space-x-1 bg-blue-50 hover:bg-blue-100 text-blue-700 px-2 py-1 rounded-lg text-xs transition-colors duration-200"
                                    >
                                      <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                                      </svg>
                                      <span>{file.name}</span>
                                    </a>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}