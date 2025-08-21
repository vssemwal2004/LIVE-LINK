import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import '/src/App.css'

export default function Register() {
  const [role, setRole] = useState('patient')
  const [form, setForm] = useState({ name: '', phone: '', email: '', password: '', confirmPassword: '', medicalId: '' })
  const [toast, setToast] = useState({ type: '', message: '' })
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const handleChange = (e) => {
    const { name, value } = e.target
    setForm((p) => ({ ...p, [name]: value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setToast({})
    if (!form.name || !form.phone || !form.email || !form.password) {
      setToast({ type: 'error', message: 'Please fill required fields' })
      return
    }
    if (form.password !== form.confirmPassword) {
      setToast({ type: 'error', message: 'Passwords do not match' })
      return
    }
    setLoading(true)
    try {
      const endpoint = role === 'patient' ? 'register/patient' : 'register/doctor'
      const body = role === 'patient' ? { name: form.name, phone: form.phone, email: form.email, password: form.password } : { name: form.name, phone: form.phone, medicalId: form.medicalId, email: form.email, password: form.password }
      const res = await fetch(`http://localhost:5000/api/auth/${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok) setToast({ type: 'error', message: data.message || 'Registration failed' })
      else {
        setToast({ type: 'success', message: data.message || 'Registered' })
        setTimeout(() => navigate('/login'), 900)
      }
    } catch (err) {
      setToast({ type: 'error', message: 'Server error' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
      <div className="w-full max-w-3xl bg-white rounded-lg shadow p-6">
        <h2 className="text-2xl font-bold mb-4">Create Account</h2>
        <div className="flex gap-2 mb-4">
          <button onClick={() => setRole('patient')} className={`px-3 py-2 rounded ${role === 'patient' ? 'bg-blue-600 text-white' : 'bg-gray-100'}`}>Patient</button>
          <button onClick={() => setRole('doctor')} className={`px-3 py-2 rounded ${role === 'doctor' ? 'bg-blue-600 text-white' : 'bg-gray-100'}`}>Doctor</button>
        </div>

        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm">Full Name</label>
            <input name="name" value={form.name} onChange={handleChange} className="w-full border px-3 py-2 rounded" />
          </div>
          <div>
            <label className="block text-sm">Phone</label>
            <input name="phone" value={form.phone} onChange={handleChange} className="w-full border px-3 py-2 rounded" />
          </div>
          {role === 'doctor' && (
            <div>
              <label className="block text-sm">Medical ID</label>
              <input name="medicalId" value={form.medicalId} onChange={handleChange} className="w-full border px-3 py-2 rounded" />
            </div>
          )}
          <div>
            <label className="block text-sm">Email</label>
            <input name="email" value={form.email} onChange={handleChange} className="w-full border px-3 py-2 rounded" />
          </div>
          <div>
            <label className="block text-sm">Password</label>
            <input name="password" type="password" value={form.password} onChange={handleChange} className="w-full border px-3 py-2 rounded" />
          </div>
          <div>
            <label className="block text-sm">Confirm Password</label>
            <input name="confirmPassword" type="password" value={form.confirmPassword} onChange={handleChange} className="w-full border px-3 py-2 rounded" />
          </div>

          <div className="col-span-1 md:col-span-2">
            {toast.message && <div className={`p-2 rounded ${toast.type === 'error' ? 'bg-red-200 text-red-800' : 'bg-green-200 text-green-800'}`}>{toast.message}</div>}
            <div className="flex items-center justify-between mt-4">
              <button type="submit" disabled={loading} className="bg-blue-600 text-white px-4 py-2 rounded">{loading ? 'Registering...' : 'Register'}</button>
              <button type="button" onClick={() => navigate('/login')} className="text-blue-600 underline">Back to Login</button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}
