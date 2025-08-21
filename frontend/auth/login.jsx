import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import '/src/App.css'

export default function Login() {
  const [role, setRole] = useState('patient')
  const [form, setForm] = useState({ email: '', password: '' })
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
    setLoading(true)
    try {
      const url = `http://localhost:5000/api/auth/login/${role}`
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) {
        setToast({ type: 'error', message: data.message || 'Login failed' })
      } else {
        localStorage.setItem('token', data.token)
        localStorage.setItem('user', JSON.stringify(data.user))
        setToast({ type: 'success', message: 'Login successful' })
        setTimeout(() => {
          if (role === 'patient') navigate('/patient')
          else navigate('/doctor')
        }, 700)
      }
    } catch (err) {
      setToast({ type: 'error', message: 'Server error' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
      <div className="w-full max-w-2xl bg-white rounded-lg shadow p-6 grid md:grid-cols-2 gap-6">
        <div className="col-span-1">
          <h2 className="text-2xl font-bold mb-4">Login</h2>
          <p className="text-sm text-gray-600 mb-4">Select role and enter credentials</p>
          <div className="flex gap-2 mb-4">
            <button onClick={() => setRole('patient')} className={`px-3 py-2 rounded ${role === 'patient' ? 'bg-blue-600 text-white' : 'bg-gray-100'}`}>Patient</button>
            <button onClick={() => setRole('doctor')} className={`px-3 py-2 rounded ${role === 'doctor' ? 'bg-blue-600 text-white' : 'bg-gray-100'}`}>Doctor</button>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium">Email</label>
              <input name="email" value={form.email} onChange={handleChange} required className="w-full border px-3 py-2 rounded" />
            </div>
            <div>
              <label className="block text-sm font-medium">Password</label>
              <input name="password" type="password" value={form.password} onChange={handleChange} required className="w-full border px-3 py-2 rounded" />
            </div>
            {toast.message && <div className={`p-2 rounded ${toast.type === 'error' ? 'bg-red-200 text-red-800' : 'bg-green-200 text-green-800'}`}>{toast.message}</div>}
            <div className="flex items-center justify-between">
              <button type="submit" disabled={loading} className="bg-blue-600 text-white px-4 py-2 rounded">{loading ? 'Logging...' : 'Login'}</button>
              <button type="button" onClick={() => navigate('/register')} className="text-blue-600 underline">Register</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
