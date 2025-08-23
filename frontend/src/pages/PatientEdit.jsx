import React, { useEffect, useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { API_BASE } from '../apiBase'

export default function PatientEdit() {
  const [card, setCard] = useState('')
  const [patient, setPatient] = useState(null)
  const [tier, setTier] = useState('early')
  const [form, setForm] = useState({})
  const [files, setFiles] = useState([])
  const [toast, setToast] = useState({ type: '', message: '' })
  const [isPrimary, setIsPrimary] = useState(false)
  const navigate = useNavigate()
  const token = localStorage.getItem('token')
  const addFileInputRef = useRef(null)

  useEffect(()=>{
    if(!token) navigate('/login')
  }, [token, navigate])

  const formatDataText = (data) => {
    if (data == null) return ''
    if (typeof data === 'string') return data
    if (typeof data === 'object' && typeof data.text === 'string') return data.text
    if (Array.isArray(data)) return data.map((x)=> formatDataText(x)).join(', ')
    if (typeof data === 'object') return Object.entries(data).map(([k,v])=> `${k}: ${formatDataText(v)}`).join('\n')
    return String(data)
  }

  const search = async () => {
    setToast({})
    setPatient(null)
    try {
      const r = await fetch(`${API_BASE}/api/auth/patient/by-card/${encodeURIComponent(card)}`, { headers: { Authorization: `Bearer ${token}` } })
      const d = await r.json()
      if(!r.ok) return setToast({ type:'error', message: d.message || 'Patient not found' })
      setPatient(d.patient)
      // check if current doctor is primary of this patient via /me data
      try {
        const meR = await fetch(`${API_BASE}/api/auth/me`, { headers: { Authorization: `Bearer ${token}` } })
        const meD = await meR.json()
        const primaries = (meD?.user?.primaryPatients || [])
        setIsPrimary(Array.isArray(primaries) && primaries.some(pp => pp._id === d.patient.id))
      } catch {}
      // try loading my latest proposal for this tier
      await loadMyProposal(d.patient.id, tier)
    } catch {
      setToast({ type:'error', message: 'Server error' })
    }
  }

  const loadMyProposal = async (patientId, t) => {
    try{
      const r = await fetch(`${API_BASE}/api/auth/doctor/patient/${patientId}/proposals/me?tier=${encodeURIComponent(t)}`, { headers: { Authorization: `Bearer ${token}` } })
      const d = await r.json()
      if (r.ok && d.proposal) {
        setForm(d.proposal.data || {})
      } else {
        setForm({})
      }
    }catch{}
  }

  const saveProposal = async () => {
    if (!patient) return
    try{
      setToast({})
      const fd = new FormData()
      fd.append('tier', tier)
      // send structured JSON
      fd.append('data', JSON.stringify(form))
      files.forEach((f)=> fd.append('files', f))
      const r = await fetch(`${API_BASE}/api/auth/doctor/patient/${patient.id}/proposals`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: fd
      })
      const d = await r.json()
      if(!r.ok) return setToast({ type:'error', message: d.message || 'Failed to save proposal' })
      setToast({ type:'success', message:'Changes submitted for primary doctor approval' })
    } catch {
      setToast({ type:'error', message:'Server error' })
    }
  }

  return (
    <div className="p-6 space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Edit Patient (Propose Changes)</h1>
        <button onClick={()=> navigate('/doctor')} className="underline">Back</button>
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

          <div className="flex gap-2 mb-3">
            {['early','emergency', ...(isPrimary?['critical']:[])].map((t)=> (
              <button key={t} onClick={async ()=>{ setTier(t); await loadMyProposal(patient.id, t) }} className={`px-3 py-1 rounded ${tier===t?'bg-gray-900 text-white':'bg-gray-100'}`}>{t.charAt(0).toUpperCase()+t.slice(1)} Access</button>
            ))}
          </div>

          <div className="grid md:grid-cols-2 gap-3">
            {tier === 'early' && (
              <>
                <Input label="Name" name="name" form={form} setForm={setForm} />
                <Input label="Age" name="age" form={form} setForm={setForm} />
                <Input label="Blood Group" name="bloodGroup" form={form} setForm={setForm} />
                <Input label="Allergies" name="allergies" form={form} setForm={setForm} />
                <Input label="Conditions (BP/Diabetes)" name="conditions" form={form} setForm={setForm} />
                <Input label="Emergency Contacts" name="emergencyContacts" form={form} setForm={setForm} />
              </>
            )}
            {tier === 'emergency' && (
              <>
                <Input label="Current Medications" name="medications" form={form} setForm={setForm} />
                <Input label="Critical Notes" name="criticalNotes" form={form} setForm={setForm} />
                <Input label="Recent Surgeries/Accidents" name="surgeries" form={form} setForm={setForm} />
                <Input label="History Summary" name="historySummary" form={form} setForm={setForm} />
              </>
            )}
            {tier === 'critical' && (
              <>
                <Input label="Full Medications" name="medications" form={form} setForm={setForm} />
                <Input label="Critical Notes" name="criticalNotes" form={form} setForm={setForm} />
                <Input label="Surgeries/Admissions" name="surgeries" form={form} setForm={setForm} />
                <Input label="Long-term History" name="historySummary" form={form} setForm={setForm} />
              </>
            )}
          </div>

          <div className="mt-3">
            <label className="block text-sm font-medium">Attach JPG/PDF (optional)</label>
            <input type="file" accept="image/jpeg,image/png,application/pdf" multiple onChange={(e)=> setFiles(Array.from(e.target.files||[]))} />
          </div>

          <div className="mt-4 flex gap-2">
            <button className="bg-blue-600 text-white px-4 py-2 rounded" onClick={saveProposal}>Submit for Approval</button>
            <button className="bg-gray-200 text-gray-800 px-4 py-2 rounded" onClick={()=>{ setForm({}); setFiles([]) }}>Clear</button>
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
