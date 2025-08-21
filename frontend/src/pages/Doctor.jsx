import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'

export default function Doctor() {
  const [user, setUser] = useState(null)
  const [selectedPatientId, setSelectedPatientId] = useState('')
  const [tab, setTab] = useState('early')
  const [form, setForm] = useState({})
  const [files, setFiles] = useState([])
  const [toast, setToast] = useState({ type: '', message: '' })
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
              <li key={p._id} className="border rounded p-2 flex items-center justify-between">
                <div>
                  <div className="font-medium">{p.name}</div>
                  <div className="text-sm text-gray-600">{p.email}</div>
                </div>
                <button
                  className="bg-blue-600 text-white px-3 py-1 rounded"
                  onClick={() => {
                    setSelectedPatientId(p._id)
                    setToast({})
                  }}
                >
                  Add Details
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <div className="text-gray-600">No primary patients yet.</div>
        )}
      </div>

      {selectedPatientId && (
        <div className="mt-6 bg-white border rounded p-4">
          <h3 className="text-lg font-semibold mb-3">Add Patient Details</h3>
          <div className="flex gap-2 mb-4">
            {['early', 'emergency', 'critical'].map((t) => (
              <button key={t} onClick={() => setTab(t)} className={`px-3 py-1 rounded ${tab === t ? 'bg-gray-900 text-white' : 'bg-gray-200'}`}>
                {t.charAt(0).toUpperCase() + t.slice(1)} Access
              </button>
            ))}
          </div>

          {/* Dynamic form */}
          {tab === 'early' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Input label="Name" name="name" form={form} setForm={setForm} />
              <Input label="Age" name="age" form={form} setForm={setForm} />
              <Input label="Blood Group" name="bloodGroup" form={form} setForm={setForm} />
              <Input label="Known Allergies" name="allergies" form={form} setForm={setForm} />
              <Input label="BP/Diabetes status" name="conditions" form={form} setForm={setForm} />
              <Input label="Emergency contacts" name="emergencyContacts" form={form} setForm={setForm} />
            </div>
          )}
          {tab === 'emergency' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Input label="Current medications" name="medications" form={form} setForm={setForm} />
              <Input label="Critical notes" name="notes" form={form} setForm={setForm} />
              <Input label="Recent surgeries" name="recentSurgeries" form={form} setForm={setForm} />
              <Input label="Accidents" name="accidents" form={form} setForm={setForm} />
              <Input label="History summary" name="historySummary" form={form} setForm={setForm} />
            </div>
          )}
          {tab === 'critical' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Input label="Full EHR" name="fullEhr" form={form} setForm={setForm} />
              <Input label="Chronic conditions" name="chronicConditions" form={form} setForm={setForm} />
              <Input label="Lab reports" name="labs" form={form} setForm={setForm} />
              <Input label="Imaging" name="imaging" form={form} setForm={setForm} />
              <Input label="Past admissions" name="admissions" form={form} setForm={setForm} />
              <Input label="Long-term treatments" name="longTermTreatments" form={form} setForm={setForm} />
            </div>
          )}

          <div className="mt-4">
            <label className="block text-sm font-medium mb-1">Attach files (jpg, pdf)</label>
            <input type="file" multiple accept=".jpg,.jpeg,.png,.pdf" onChange={(e) => setFiles(Array.from(e.target.files || []))} />
          </div>

          {toast.message && (
            <div className={`mt-3 p-2 rounded ${toast.type === 'error' ? 'bg-red-200 text-red-800' : 'bg-green-200 text-green-800'}`}>{toast.message}</div>
          )}

          <div className="mt-4 flex gap-2">
            <button
              className="bg-blue-600 text-white px-4 py-2 rounded"
              onClick={async () => {
                try {
                  const token = localStorage.getItem('token')
                  const fd = new FormData()
                  Object.entries(form).forEach(([k, v]) => fd.append(k, v || ''))
                  files.forEach((f) => fd.append('files', f))
                  const r = await fetch(`http://localhost:5000/api/records/${selectedPatientId}/${tab}`, {
                    method: 'POST',
                    headers: { Authorization: `Bearer ${token}` },
                    body: fd,
                  })
                  const d = await r.json()
                  if (!r.ok) return setToast({ type: 'error', message: d.message || 'Failed to save' })
                  setToast({ type: 'success', message: 'Saved' })
                  setForm({})
                  setFiles([])
                } catch (e) {
                  setToast({ type: 'error', message: 'Server error' })
                }
              }}
            >
              Save
            </button>
            <button className="bg-gray-300 px-4 py-2 rounded" onClick={() => { setSelectedPatientId(''); setForm({}); setFiles([]); setToast({}) }}>Cancel</button>
          </div>
        </div>
      )}
    </div>
  )
}

function Input({ label, name, form, setForm }) {
  return (
    <div>
      <label className="block text-sm">{label}</label>
      <input className="w-full border px-3 py-2 rounded" value={form[name] || ''} onChange={(e) => setForm((p) => ({ ...p, [name]: e.target.value }))} />
    </div>
  )
}
