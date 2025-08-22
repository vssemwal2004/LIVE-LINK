import React, { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'

export default function PatientSearch() {
  const [card, setCard] = useState('')
  const [patient, setPatient] = useState(null)
  const [records, setRecords] = useState([])
  const [toast, setToast] = useState({ type: '', message: '' })
  const [files, setFiles] = useState([])
  const [count, setCount] = useState(0)
  const [viewTier, setViewTier] = useState(null) // 'early' | 'emergency' | null
  const navigate = useNavigate()

  const token = localStorage.getItem('token')
  const addFileInputRef = useRef(null)

  const search = async () => {
    setToast({})
    setPatient(null)
    setRecords([])
    try {
      const r = await fetch(`http://localhost:5000/api/auth/patient/by-card/${encodeURIComponent(card)}`, { headers: { Authorization: `Bearer ${token}` } })
      const d = await r.json()
      if (!r.ok) return setToast({ type: 'error', message: d.message || 'Not found' })
      setPatient(d.patient)
      // load early tier records
      const r2 = await fetch(`http://localhost:5000/api/auth/doctor/patient/${d.patient.id}/records?tier=early`, { headers: { Authorization: `Bearer ${token}` } })
      const data2 = await r2.json()
      if (r2.ok) setRecords(data2.records || [])
    } catch (e) {
      setToast({ type: 'error', message: 'Server error' })
    }
  }

  const requestEmergency = async () => {
    setToast({})
    if (!patient) return
    if (files.length < 3) return setToast({ type: 'error', message: 'Upload minimum 3 documents' })
    try {
      const fd = new FormData()
      fd.append('tier', 'emergency')
      files.forEach((f)=> fd.append('files', f))
      const r = await fetch(`http://localhost:5000/api/auth/doctor/patient/${patient.id}/access-request`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: fd
      })
      const d = await r.json()
      if (!r.ok) return setToast({ type: 'error', message: d.message || 'Failed to request access' })
      setToast({ type: 'success', message: 'Emergency access granted for 10 minutes' })
      // Optionally fetch emergency records now
      const r2 = await fetch(`http://localhost:5000/api/auth/doctor/patient/${patient.id}/records?tier=emergency`, { headers: { Authorization: `Bearer ${token}` } })
      const data2 = await r2.json()
      if (r2.ok) {
        setRecords((prev)=>[...prev, ...(data2.records||[])])
        setViewTier('emergency')
      }
    } catch (e) {
      setToast({ type: 'error', message: 'Server error' })
    }
  }

  const refreshEarly = async () => {
    if (!patient) return
    try {
      const r2 = await fetch(`http://localhost:5000/api/auth/doctor/patient/${patient.id}/records?tier=early`, { headers: { Authorization: `Bearer ${token}` } })
      const data2 = await r2.json()
      if (r2.ok) {
  setRecords(data2.records || [])
  setViewTier('early')
        setToast({ type: 'success', message: 'Early access records refreshed' })
      }
    } catch {}
  }

  const handleAddDocument = (e) => {
    const f = e.target.files && e.target.files[0]
    if (!f) return
    const next = [...files, f]
    setFiles(next)
    setCount(next.length)
    e.target.value = '' // reset so same file can be selected again if needed
  }

  return (
    <div className="p-6 space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Patient Search</h1>
        <button onClick={() => navigate('/doctor')} className="underline">Back</button>
      </div>

      <div className="flex gap-2">
        <input className="border rounded px-3 py-2 flex-1" placeholder="Enter patient card number" value={card} onChange={(e)=>setCard(e.target.value)} />
        <button className="bg-blue-600 text-white px-4 py-2 rounded" onClick={search}>Search</button>
      </div>

      {toast.message && (
        <div className={`p-2 rounded ${toast.type==='error'?'bg-red-200 text-red-800':'bg-green-200 text-green-800'}`}>{toast.message}</div>
      )}

      {patient && (
        <div className="bg-white border rounded p-4">
          <div className="font-semibold mb-2">{patient.name}</div>
          <div className="text-sm text-gray-700 mb-4">Card: {patient.cardNumber}</div>

          <div className="flex flex-wrap gap-2 mb-3">
            <button className="bg-blue-600 text-white px-3 py-1 rounded" onClick={refreshEarly}>Get Early Access</button>
            <button className="bg-gray-900 text-white px-3 py-1 rounded" onClick={() => addFileInputRef.current?.click()}>Add Document</button>
            <button className="bg-gray-200 text-gray-800 px-3 py-1 rounded" onClick={() => { setFiles([]); setCount(0) }}>Clear</button>
            <input ref={addFileInputRef} type="file" accept="image/jpeg,image/png,application/pdf" className="hidden" onChange={handleAddDocument} />
            <span className="self-center text-xs text-gray-600">Selected: {count} / 3 required</span>
          </div>
          <button disabled={count<3} className={`px-3 py-1 rounded ${count<3?'bg-gray-300 text-gray-600 cursor-not-allowed':'bg-orange-600 text-white'}`} onClick={requestEmergency}>Request Emergency Access (10 min)</button>

          {files.length>0 && (
            <ul className="mt-2 text-xs text-gray-700 list-disc pl-5">
              {files.map((f,i)=>(<li key={i}>{f.name}</li>))}
            </ul>
          )}

          <div className="mt-4">
            <h3 className="font-semibold">Records</h3>
      {(viewTier ? (records.filter((r)=> r.accessTier===viewTier)).length===0 : records.length===0) ? (
              <div className="text-gray-600">No records visible.</div>
            ) : (
              <ul className="space-y-2">
        {(viewTier ? records.filter((r)=> r.accessTier===viewTier) : records).map((r)=> (
                  <li key={r.id} className="border rounded p-2">
                    <div className="text-sm text-gray-600">Tier: {r.accessTier} • {new Date(r.createdAt).toLocaleString()}</div>
                    <pre className="whitespace-pre-wrap text-sm mt-2">{JSON.stringify(r.data, null, 2)}</pre>
                    {Array.isArray(r.files) && r.files.length>0 && (
                      <div className="mt-2 space-y-1">
                        {r.files.map((f,idx)=> (
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
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  )
}