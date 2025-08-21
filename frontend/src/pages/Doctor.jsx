import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'

export default function Doctor() {
  const [user, setUser] = useState(null)
  const navigate = useNavigate()

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) return navigate('/login')
    fetch('http://localhost:5000/api/auth/me', { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((d) => {
        if (d.user?.role !== 'doctor') return navigate('/patient')
        setUser(d.user)
      })
      .catch(() => navigate('/login'))
  }, [])

  const logout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    navigate('/login')
  }

  if (!user) return null
  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Doctor dashboard</h1>
        <button onClick={logout} className="bg-red-500 text-white px-3 py-1 rounded">Logout</button>
      </div>
      <p className="mt-2">Welcome, Dr. {user.name}</p>

      <div className="mt-6 bg-white border rounded p-4">
        <h2 className="text-lg font-semibold mb-2">Primary Patients</h2>
        {Array.isArray(user.primaryPatients) && user.primaryPatients.length > 0 ? (
          <ul className="space-y-2">
            {user.primaryPatients.map((p) => (
              <li key={p._id} className="border rounded p-2">
                <div className="font-medium">{p.name}</div>
                <div className="text-sm text-gray-600">{p.email}</div>
              </li>
            ))}
          </ul>
        ) : (
          <div className="text-gray-600">No primary patients yet.</div>
        )}
      </div>
    </div>
  )
}
