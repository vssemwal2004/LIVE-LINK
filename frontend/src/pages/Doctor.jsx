import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'

export default function Doctor() {
  const [user, setUser] = useState(null)
  const [selectedPatient, setSelectedPatient] = useState(null)
  const [tier, setTier] = useState('early')
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
                  onClick={() => setSelectedPatient(p)}
                  className="bg-blue-600 text-white px-3 py-1 rounded"
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

      {selectedPatient && (
        <div className="mt-6 bg-white border rounded p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-semibold">Add Details for {selectedPatient.name}</h3>
            <button onClick={() => { setSelectedPatient(null); setForm({}); setFiles([]); setTier('early'); setToast({}) }} className="text-sm underline">Close</button>
          </div>
          <div className="flex gap-2 mb-3">
            <button onClick={() => setTier('early')} className={`px-3 py-1 rounded ${tier==='early'?'bg-gray-900 text-white':'bg-gray-100'}`}>Early Access</button>
            <button onClick={() => setTier('emergency')} className={`px-3 py-1 rounded ${tier==='emergency'?'bg-gray-900 text-white':'bg-gray-100'}`}>Emergency Access</button>
            <button onClick={() => setTier('critical')} className={`px-3 py-1 rounded ${tier==='critical'?'bg-gray-900 text-white':'bg-gray-100'}`}>Critical Access</button>
          </div>

          {/* Tier-specific fields */}
          {tier === 'early' && (
            <div className="grid md:grid-cols-2 gap-3">
              <Input label="Name" name="name" form={form} setForm={setForm} />
              <Input label="Age" name="age" form={form} setForm={setForm} />
              <Input label="Blood Group" name="bloodGroup" form={form} setForm={setForm} />
              <Input label="Allergies" name="allergies" form={form} setForm={setForm} />
              <Input label="Conditions (BP/Diabetes)" name="conditions" form={form} setForm={setForm} />
              <Input label="Emergency Contacts" name="emergencyContacts" form={form} setForm={setForm} />
            </div>
          )}
          {tier === 'emergency' && (
            <div className="grid md:grid-cols-2 gap-3">
              <Input label="Current Medications" name="medications" form={form} setForm={setForm} />
              <Input label="Critical Notes" name="criticalNotes" form={form} setForm={setForm} />
              <Input label="Recent Surgeries/Accidents" name="surgeries" form={form} setForm={setForm} />
              <Input label="History Summary" name="historySummary" form={form} setForm={setForm} />
            </div>
          )}
          {tier === 'critical' && (
            <div className="grid md:grid-cols-2 gap-3">
              <Input label="Full Medications" name="medications" form={form} setForm={setForm} />
              <Input label="Critical Notes" name="criticalNotes" form={form} setForm={setForm} />
              <Input label="Surgeries/Admissions" name="surgeries" form={form} setForm={setForm} />
              <Input label="Long-term History" name="historySummary" form={form} setForm={setForm} />
            </div>
          )}

          <div className="mt-3">
            <label className="block text-sm font-medium">Attach JPG/PDF (optional)</label>
            <input type="file" accept="image/jpeg,image/png,application/pdf" multiple onChange={(e) => setFiles(Array.from(e.target.files || []))} />
          </div>

          {toast.message && (
            <div className={`mt-3 p-2 rounded ${toast.type==='error'?'bg-red-200 text-red-800':'bg-green-200 text-green-800'}`}>{toast.message}</div>
          )}

          <div className="mt-3">
            <button
              className="bg-blue-600 text-white px-4 py-2 rounded"
              onClick={async () => {
                try {
                  setToast({})
                  const fd = new FormData()
                  fd.append('accessTier', tier)
                  Object.entries(form).forEach(([k,v]) => fd.append(k, v ?? ''))
                  files.forEach((f) => fd.append('files', f))
                  const token = localStorage.getItem('token')
                  const r = await fetch(`http://localhost:5000/api/auth/doctor/patient/${selectedPatient._id}/records`, {
                    method: 'POST',
                    headers: { Authorization: `Bearer ${token}` },
                    body: fd
                  })
                  const d = await r.json()
                  if (!r.ok) return setToast({ type: 'error', message: d.message || 'Failed to save' })
                  setToast({ type: 'success', message: 'Record added' })
                } catch (e) {
                  setToast({ type: 'error', message: 'Server error' })
                }
              }}
            >
              Save Details
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function Input({ label, name, form, setForm }) {
  return (
    <div>
      <label className="block text-sm font-medium">{label}</label>
      <input className="w-full border px-3 py-2 rounded" value={form[name]||''} onChange={(e)=>setForm((p)=>({...p,[name]:e.target.value}))} />
    </div>
  )
}
