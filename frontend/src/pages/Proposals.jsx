import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { API_BASE } from '../apiBase';

export default function Proposals() {
  const [proposals, setProposals] = useState([])
  const [toast, setToast] = useState({ type:'', message:'' })
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()
  const token = localStorage.getItem('token')

  const formatDataText = (data) => {
    if (data == null) return ''
    if (typeof data === 'string') return data
    if (typeof data === 'object' && typeof data.text === 'string') return data.text
    if (Array.isArray(data)) return data.map((x)=> formatDataText(x)).join(', ')
    if (typeof data === 'object') return Object.entries(data).map(([k,v])=> `${k}: ${formatDataText(v)}`).join('\n')
    return String(data)
  }

  const load = async () => {
    setToast({})
    setLoading(true)
    try{
  const r = await fetch(`${API_BASE}/api/auth/doctor/proposals/pending`, { headers: { Authorization: `Bearer ${token}` } })
  const d = await r.json()
  if (!r.ok) return setToast({ type:'error', message: d.message || 'Failed to load proposals' })
  setProposals(d.proposals || [])
    }catch{
      setToast({ type:'error', message:'Server error' })
    }finally{
      setLoading(false)
    }
  }

  useEffect(()=>{ if(!token) navigate('/login'); else load() }, [token, navigate])

  const act = async (id, action) => {
    try{
      setToast({})
  const r = await fetch(`${API_BASE}/api/auth/doctor/proposals/${id}/${action}`, { method: 'POST', headers: { Authorization: `Bearer ${token}` } })
      const d = await r.json()
      if(!r.ok) return setToast({ type:'error', message: d.message || 'Action failed' })
  await load()
      setToast({ type:'success', message: `Proposal ${action === 'approve' ? 'approved' : 'rejected'}` })
    }catch{
      setToast({ type:'error', message:'Server error' })
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-teal-50 flex items-center justify-center p-6 overflow-hidden relative">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-300/20 rounded-full animate-pulse"></div>
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-teal-300/20 rounded-full animate-pulse animation-delay-1000"></div>
        
        {/* Animated Icons */}
        <div className="absolute top-1/4 left-1/4 animate-float">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-blue-300/30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
        </div>
        
        <div className="absolute bottom-1/3 right-1/3 animate-float animation-delay-1000">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-indigo-300/30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </div>
        
        <div className="absolute top-1/3 right-1/4 animate-float animation-delay-1500">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-blue-400/20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
          </svg>
        </div>
      </div>

      <div className="w-full max-w-4xl bg-white/95 backdrop-blur-xl rounded-2xl shadow-xl shadow-blue-300/20 p-6 border border-blue-100/50 relative z-10">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-teal-500 rounded-lg flex items-center justify-center shadow-md">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-blue-900">Pending Edit Proposals</h1>
          </div>
          <button
            onClick={() => navigate('/doctor')}
            className="bg-gray-600 text-white px-4 py-2 rounded-lg font-medium shadow-md hover:bg-gray-700 transition-all duration-300 flex items-center space-x-2"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            <span>Back</span>
          </button>
        </div>

        {/* Toast Message */}
        {toast.message && (
          <div
            className={`p-3 rounded-lg text-sm mb-6 transition-all duration-300 flex items-center ${
              toast.type === 'error' 
                ? 'bg-red-100 text-red-700 border border-red-200' 
                : 'bg-green-100 text-green-700 border border-green-200'
            }`}
          >
            <div className={`rounded-full p-1 mr-3 ${toast.type === 'error' ? 'bg-red-200' : 'bg-green-200'}`}>
              <svg 
                xmlns="http://www.w3.org/2000/svg" 
                className={`h-4 w-4 ${toast.type === 'error' ? 'text-red-600' : 'text-green-600'}`} 
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

        {/* Loading State */}
        {loading && (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
          </div>
        )}

        {/* Proposals List */}
        {!loading && proposals.length === 0 ? (
          <div className="text-center py-12 border border-dashed border-gray-300 rounded-xl bg-gray-50/50">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-gray-400 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <h3 className="text-lg font-medium text-gray-600 mb-1">No pending proposals</h3>
            <p className="text-gray-500 text-sm">All edit proposals have been processed</p>
          </div>
        ) : (
          <ul className="space-y-4">
            {proposals.map((p) => (
              <li
                key={p.id}
                className="bg-white/90 rounded-lg p-4 shadow-sm border border-blue-100/50 transition-all duration-300 hover:shadow-md"
              >
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <div className="flex items-center mb-2">
                      <div className="w-8 h-8 bg-blue-100 rounded-md flex items-center justify-center mr-2">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-800">{p.patient.name}</h3>
                        <p className="text-xs text-gray-500">Card: {p.patient.cardNumber} • Tier {p.tier}</p>
                      </div>
                    </div>
                    
                    <div className="text-xs text-gray-600 ml-10">
                      <span>{new Date(p.createdAt).toLocaleString()}</span>
                    </div>
                  </div>
                  
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Pending
                  </span>
                </div>
                
                {/* Proposal Data */}
                <div className="mb-3 bg-gray-50 p-3 rounded-md border border-gray-200">
                  <h4 className="text-xs font-medium text-gray-700 mb-1 flex items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 text-blue-500 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                    Proposed Changes
                  </h4>
                  <pre className="whitespace-pre-wrap text-xs text-gray-600 bg-white p-2 rounded border border-gray-200 overflow-x-auto">
                    {formatDataText(p.data)}
                  </pre>
                </div>
                
                {/* Attached Files */}
                {Array.isArray(p.files) && p.files.length > 0 && (
                  <div className="mb-3 bg-gray-50 p-3 rounded-md border border-gray-200">
                    <h4 className="text-xs font-medium text-gray-700 mb-1 flex items-center">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 text-blue-500 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                      </svg>
                      Attached Files
                    </h4>
                    <ul className="text-xs text-gray-600 space-y-1">
                      {p.files.map((f, idx) => (
                        <li key={idx} className="flex items-center justify-between">
                          <div className="flex items-center">
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              className="h-3 w-3 text-blue-500 mr-1"
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
                            <span className="truncate max-w-xs">{f.name}</span>
                          </div>
                          {f.url ? (
                            <a
                              className="text-blue-600 hover:text-blue-800 transition-colors flex items-center bg-blue-50 px-2 py-0.5 rounded text-xs"
                              href={f.url}
                              target="_blank"
                              rel="noreferrer"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                              </svg>
                              View
                            </a>
                          ) : (
                            <a
                              className="text-blue-600 hover:text-blue-800 transition-colors flex items-center bg-blue-50 px-2 py-0.5 rounded text-xs"
                              href={`data:${f.mime};base64,${f.dataBase64}`}
                              download={f.name}
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                              </svg>
                              Download
                            </a>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                
                {/* Action Buttons */}
                <div className="flex gap-2">
                  <button
                    onClick={() => act(p.id, 'approve')}
                    className="bg-green-600 text-white px-3 py-1.5 rounded-lg font-medium text-xs shadow-md hover:bg-green-700 transition-all duration-300 flex items-center space-x-1 group flex-1 justify-center"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-3.5 w-3.5 group-hover:scale-110 transition-transform"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span>Approve</span>
                  </button>
                  <button
                    onClick={() => act(p.id, 'reject')}
                    className="bg-red-600 text-white px-3 py-1.5 rounded-lg font-medium text-xs shadow-md hover:bg-red-700 transition-all duration-300 flex items-center space-x-1 group flex-1 justify-center"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-3.5 w-3.5 group-hover:scale-110 transition-transform"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    <span>Reject</span>
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
      
      {/* Add custom animations */}
      <style>
        {`
          @keyframes float {
            0%, 100% { transform: translateY(0) rotate(0deg); }
            50% { transform: translateY(-10px) rotate(5deg); }
          }
          .animate-float {
            animation: float 8s ease-in-out infinite;
          }
          .animation-delay-1000 {
            animation-delay: 1s;
          }
          .animation-delay-1500 {
            animation-delay: 1.5s;
          }
        `}
      </style>
    </div>
  )
}