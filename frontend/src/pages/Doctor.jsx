import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'

export default function Doctor() {
  const [user, setUser] = useState(null)
  const [selectedPatient, setSelectedPatient] = useState(null)
  const [tier, setTier] = useState('early')
  const [form, setForm] = useState({})
  const [files, setFiles] = useState([])
  const [toast, setToast] = useState({ type: '', message: '' })
  const [section, setSection] = useState({ label: '', data: '' })
  const [existing, setExisting] = useState(null)
  const [sectionEdits, setSectionEdits] = useState({}) // id -> { label, data, files }
  const navigate = useNavigate()

  const formatDataText = (data) => {
    if (data == null) return ''
    if (typeof data === 'string') return data
    if (typeof data === 'object' && typeof data.text === 'string') return data.text
    if (Array.isArray(data)) return data.map((x)=> formatDataText(x)).join(', ')
    if (typeof data === 'object') return Object.entries(data).map(([k,v])=> `${k}: ${formatDataText(v)}`).join('\n')
    return String(data)
  }

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
      <div className="mt-2 flex items-center justify-between">
        <p>Welcome, Dr. {user.name}</p>
        <button onClick={() => navigate('/doctor/patient-search')} className="bg-gray-900 text-white px-3 py-1 rounded">Patient Search</button>
      </div>

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
                  onClick={async () => {
          setSelectedPatient(p)
                    // load existing record for default tier
                    try{
                      const token = localStorage.getItem('token')
                      const r = await fetch(`http://localhost:5000/api/auth/doctor/patient/${p._id}/record/${tier}`, { headers: { Authorization: `Bearer ${token}` } })
                      const d = await r.json()
                      if(r.ok && d.record){
                        setExisting(d.record)
                        setForm(d.record.data || {})
            // initialize section edits
                        const edits = {}
                        ;(d.record.sections||[]).forEach((s)=>{ edits[s.id] = { label: s.label || '', data: (s?.data && typeof s.data.text==='string') ? s.data.text : JSON.stringify(s.data ?? {}, null, 2), files: [] } })
            setSectionEdits(edits)
                      } else {
                        setExisting(null)
                        setForm({})
            setSectionEdits({})
                      }
                    } catch{}
                  }}
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
            {['early','emergency','critical'].map((t)=> (
              <button key={t} onClick={async ()=>{
                setTier(t)
                try{
                  const token = localStorage.getItem('token')
                  const r = await fetch(`http://localhost:5000/api/auth/doctor/patient/${selectedPatient._id}/record/${t}`, { headers: { Authorization: `Bearer ${token}` } })
                  const d = await r.json()
                  if(r.ok && d.record){
                    setExisting(d.record)
                    setForm(d.record.data || {})
                    const edits = {}
                    ;(d.record.sections||[]).forEach((s)=>{ edits[s.id] = { label: s.label || '', data: (s?.data && typeof s.data.text==='string') ? s.data.text : JSON.stringify(s.data ?? {}, null, 2), files: [] } })
                    setSectionEdits(edits)
                  } else {
                    setExisting(null)
                    setForm({})
                    setSectionEdits({})
                  }
                }catch{}
              }} className={`px-3 py-1 rounded ${tier===t?'bg-gray-900 text-white':'bg-gray-100'}`}>{t.charAt(0).toUpperCase()+t.slice(1)} Access</button>
            ))}
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

          {existing && (
            <div className="mb-3 text-sm text-gray-600">Editing existing {tier} record from {new Date(existing.createdAt).toLocaleString()}</div>
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
                  const method = 'PUT'
                  const endpoint = `http://localhost:5000/api/auth/doctor/patient/${selectedPatient._id}/records/${tier}`
                  const r = await fetch(endpoint, {
                    method,
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

          {/* Add extra box */}
          <div className="mt-6 border-t pt-4">
            <h4 className="font-semibold mb-2">Add Box (Section) to this {tier} record</h4>
            <div className="grid md:grid-cols-2 gap-3">
              <Input label="Section Label" name="label" form={section} setForm={setSection} />
              <div>
                <label className="block text-sm font-medium">Section Data (JSON or text)</label>
                <textarea className="w-full border px-3 py-2 rounded" rows={4} value={section.data} onChange={(e)=>setSection((p)=>({...p, data: e.target.value}))} />
              </div>
            </div>
            <div className="mt-2">
              <input type="file" multiple accept="image/jpeg,image/png,application/pdf" onChange={(e)=>setFiles(Array.from(e.target.files||[]))} />
            </div>
            <button
              className="mt-2 bg-gray-800 text-white px-3 py-1 rounded"
              onClick={async ()=>{
                try{
                  setToast({})
                  const fd = new FormData()
                  fd.append('label', section.label)
                  fd.append('data', section.data)
                  files.forEach((f)=> fd.append('files', f))
                  const token = localStorage.getItem('token')
                  const r = await fetch(`http://localhost:5000/api/auth/doctor/patient/${selectedPatient._id}/records/${tier}/sections`, {
                    method: 'POST',
                    headers: { Authorization: `Bearer ${token}` },
                    body: fd
                  })
                  const d = await r.json()
                  if(!r.ok) return setToast({ type:'error', message: d.message || 'Failed to add section' })
                  setToast({ type:'success', message:'Section added' })
                }catch(e){
                  setToast({ type:'error', message:'Server error' })
                }
              }}
            >
              Add Box
            </button>
          </div>

          {/* Existing sections list + edit */}
          {existing && Array.isArray(existing.sections) && existing.sections.length>0 && (
            <div className="mt-6 border-t pt-4">
              <h4 className="font-semibold mb-2">Existing Sections</h4>
              <ul className="space-y-4">
                {existing.sections.map((s)=>{
                  const edit = sectionEdits[s.id] || { label: s.label||'', data: JSON.stringify(s.data ?? {}, null, 2), files: [] }
                  return (
                    <li key={s.id} className="border rounded p-3">
                      <div className="text-sm text-gray-600 mb-2">{new Date(s.updatedAt||s.createdAt).toLocaleString()}</div>
                      <div className="grid md:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-sm font-medium">Label</label>
                          <input className="w-full border px-3 py-2 rounded" value={edit.label}
                                 onChange={(e)=> setSectionEdits((p)=>({ ...p, [s.id]: { ...edit, label: e.target.value } })) } />
                        </div>
                        <div>
                          <label className="block text-sm font-medium">Data (JSON or text)</label>
                          <textarea rows={4} className="w-full border px-3 py-2 rounded" value={edit.data}
                                    onChange={(e)=> setSectionEdits((p)=>({ ...p, [s.id]: { ...edit, data: e.target.value } })) } />
                        </div>
                      </div>
                      {Array.isArray(s.files) && s.files.length>0 && (
                        <div className="mt-2 space-y-1">
                          {s.files.map((f, idx)=> (
                            <div key={idx} className="text-sm">
                              {f.url ? (
                                <a className="text-blue-600 underline" href={f.url} target="_blank" rel="noreferrer">Download {f.name}</a>
                              ) : (
                                <a className="text-blue-600 underline" href={`data:${f.mime};base64,${f.dataBase64}`} download={f.name}>Download {f.name}</a>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                      <div className="mt-2">
                        <label className="block text-sm font-medium">Replace files (optional)</label>
                        <input type="file" multiple accept="image/jpeg,image/png,application/pdf" onChange={(e)=>{
                          const fs = Array.from(e.target.files||[])
                          setSectionEdits((p)=>({ ...p, [s.id]: { ...edit, files: fs } }))
                        }} />
                      </div>
                      <div className="mt-2">
                        <button className="bg-green-600 text-white px-3 py-1 rounded" onClick={async ()=>{
                          try{
                            setToast({})
                            const fd = new FormData()
                            fd.append('label', edit.label)
                            fd.append('data', edit.data)
                            ;(edit.files||[]).forEach((f)=> fd.append('files', f))
                            const token = localStorage.getItem('token')
                            const r = await fetch(`http://localhost:5000/api/auth/doctor/patient/${selectedPatient._id}/records/${tier}/sections/${s.id}`, {
                              method: 'PUT',
                              headers: { Authorization: `Bearer ${token}` },
                              body: fd
                            })
                            const d = await r.json()
                            if(!r.ok) return setToast({ type:'error', message: d.message || 'Failed to update section' })
                            // refresh
                            const rr = await fetch(`http://localhost:5000/api/auth/doctor/patient/${selectedPatient._id}/record/${tier}`, { headers: { Authorization: `Bearer ${token}` } })
                            const dd = await rr.json()
                            if(rr.ok && dd.record){
                              setExisting(dd.record)
                              const edits2 = {}
                              ;(dd.record.sections||[]).forEach((sx)=>{ edits2[sx.id] = { label: sx.label || '', data: (sx?.data && typeof sx.data.text==='string') ? sx.data.text : JSON.stringify(sx.data ?? {}, null, 2), files: [] } })
                              setSectionEdits(edits2)
                            }
                            setToast({ type:'success', message:'Section updated' })
                          }catch{
                            setToast({ type:'error', message:'Server error' })
                          }
                        }}>Save Changes</button>
                      </div>
                      <div className="mt-2">
                        <details>
                          <summary className="cursor-pointer text-sm text-gray-700">Current data preview</summary>
                          <pre className="whitespace-pre-wrap text-xs mt-1">{formatDataText(s.data)}</pre>
                        </details>
                      </div>
                    </li>
                  )
                })}
              </ul>
            </div>
          )}
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
