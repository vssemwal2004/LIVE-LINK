import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'

export default function Patient() {
  const [user, setUser] = useState(null)
  const [showAdd, setShowAdd] = useState(false)
  const [medicalId, setMedicalId] = useState('')
  const [searchResult, setSearchResult] = useState(null)
  const [toast, setToast] = useState({ type: '', message: '' })
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const token = localStorage.getItem('token')

  const loadMe = async () => {
    if (!token) return navigate('/login')
    try {
      const r = await fetch('http://localhost:5000/api/auth/me', { headers: { Authorization: `Bearer ${token}` } })
      const d = await r.json()
      if (!r.ok) throw new Error(d.message || 'Auth failed')
      if (d.user?.role !== 'patient') {
        // if a doctor tries to open patient page, bounce
        return navigate('/doctor')
      }
      setUser(d.user)
    } catch (e) {
      navigate('/login')
    }
  }

  useEffect(() => {
    loadMe()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const logout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    navigate('/login')
  }

  const searchDoctor = async () => {
    setSearchResult(null)
    setToast({})
    if (!medicalId.trim()) return setToast({ type: 'error', message: 'Enter medical ID' })
    setLoading(true)
    try {
      const r = await fetch(`http://localhost:5000/api/auth/doctor/by-medical/${encodeURIComponent(medicalId.trim())}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const d = await r.json()
      if (!r.ok) return setToast({ type: 'error', message: d.message || 'Doctor not found' })
      setSearchResult(d.doctor)
    } catch (e) {
      setToast({ type: 'error', message: 'Server error' })
    } finally {
      setLoading(false)
    }
  }

  const addPrimaryDoctor = async () => {
    if (!searchResult) return
    setLoading(true)
    setToast({})
    try {
      const r = await fetch('http://localhost:5000/api/auth/patient/add-primary-doctor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ medicalId: searchResult.medicalId }),
      })
      const d = await r.json()
      if (!r.ok) return setToast({ type: 'error', message: d.message || 'Unable to add doctor' })
      setToast({ type: 'success', message: 'Doctor added' })
      // refresh list
      setUser((prev) => ({ ...prev, primaryDoctors: d.primaryDoctors }))
      setShowAdd(false)
      setMedicalId('')
      setSearchResult(null)
    } catch (e) {
      setToast({ type: 'error', message: 'Server error' })
    } finally {
      setLoading(false)
    }
  }

  if (!user) return null
  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Patient dashboard</h1>
        <button onClick={logout} className="bg-red-500 text-white px-3 py-1 rounded">Logout</button>
      </div>
      <p>Welcome, {user.name}</p>

      <div className="bg-white rounded border p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold">Primary Doctors</h2>
          <button
            onClick={() => setShowAdd((v) => !v)}
            disabled={Array.isArray(user.primaryDoctors) && user.primaryDoctors.length >= 1}
            className={`px-3 py-1 rounded ${Array.isArray(user.primaryDoctors) && user.primaryDoctors.length >= 1 ? 'bg-gray-300 text-gray-600 cursor-not-allowed' : 'bg-blue-600 text-white'}`}
          >
            {showAdd ? 'Close' : 'Add Doctor'}
          </button>
        </div>

        {Array.isArray(user.primaryDoctors) && user.primaryDoctors.length > 0 ? (
          <ul className="space-y-2">
            {user.primaryDoctors.map((d) => (
              <li key={d._id} className="border rounded p-2 flex items-center justify-between">
                <div>
                  <div className="font-medium">Dr. {d.name}</div>
                  <div className="text-sm text-gray-600">Medical ID: {d.medicalId}</div>
                </div>
                <button
                  onClick={async () => {
                    setLoading(true)
                    setToast({})
                    try {
                      const r = await fetch(`http://localhost:5000/api/auth/patient/primary-doctor/${encodeURIComponent(d.medicalId)}`, {
                        method: 'DELETE',
                        headers: { Authorization: `Bearer ${token}` },
                      })
                      const resp = await r.json()
                      if (!r.ok) return setToast({ type: 'error', message: resp.message || 'Unable to remove' })
                      setUser((prev) => ({ ...prev, primaryDoctors: resp.primaryDoctors }))
                      setToast({ type: 'success', message: 'Primary doctor removed' })
                    } catch (e) {
                      setToast({ type: 'error', message: 'Server error' })
                    } finally {
                      setLoading(false)
                    }
                  }}
                  className="bg-red-500 text-white px-3 py-1 rounded"
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <div className="text-gray-600">No primary doctors added yet.</div>
        )}

  {showAdd && (!Array.isArray(user.primaryDoctors) || user.primaryDoctors.length === 0) && (
          <div className="mt-4 space-y-3">
            <div className="flex gap-2">
              <input
                className="border rounded px-3 py-2 flex-1"
                placeholder="Enter doctor's medical ID"
                value={medicalId}
                onChange={(e) => setMedicalId(e.target.value)}
              />
              <button onClick={searchDoctor} disabled={loading} className="bg-gray-800 text-white px-3 py-2 rounded">
                {loading ? 'Searching...' : 'Search'}
              </button>
            </div>
            {toast.message && (
              <div className={`p-2 rounded ${toast.type === 'error' ? 'bg-red-200 text-red-800' : 'bg-green-200 text-green-800'}`}>{toast.message}</div>
            )}
            {searchResult && (
              <div className="border rounded p-3 flex items-center justify-between">
                <div>
                  <div className="font-medium">Dr. {searchResult.name}</div>
                  <div className="text-sm text-gray-600">Medical ID: {searchResult.medicalId}</div>
                </div>
                <button onClick={addPrimaryDoctor} className="bg-blue-600 text-white px-3 py-1 rounded">Add as Primary</button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
