import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'

export default function Proposals() {
  const [proposals, setProposals] = useState([])
  const [toast, setToast] = useState({ type:'', message:'' })
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
    try{
      const r = await fetch('http://localhost:5000/api/auth/doctor/proposals/pending', { headers: { Authorization: `Bearer ${token}` } })
      const d = await r.json()
      if (!r.ok) return setToast({ type:'error', message: d.message || 'Failed to load proposals' })
      setProposals(d.proposals || [])
    }catch{
      setToast({ type:'error', message:'Server error' })
    }
  }

  useEffect(()=>{ if(!token) navigate('/login'); else load() }, [])

  const act = async (id, action) => {
    try{
      setToast({})
      const r = await fetch(`http://localhost:5000/api/auth/doctor/proposals/${id}/${action}`, { method: 'POST', headers: { Authorization: `Bearer ${token}` } })
      const d = await r.json()
      if(!r.ok) return setToast({ type:'error', message: d.message || 'Action failed' })
      await load()
      setToast({ type:'success', message: `Proposal ${action}d` })
    }catch{
      setToast({ type:'error', message:'Server error' })
    }
  }

  return (
    <div className="p-6 space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Pending Edit Proposals</h1>
        <button onClick={()=> navigate('/doctor')} className="underline">Back</button>
      </div>
      {toast.message && (
        <div className={`p-2 rounded ${toast.type==='error'?'bg-red-200 text-red-800':'bg-green-200 text-green-800'}`}>{toast.message}</div>
      )}
      {proposals.length===0 ? (
        <div className="text-gray-600">No pending proposals.</div>
      ) : (
        <ul className="space-y-3">
          {proposals.map((p)=> (
            <li key={p.id} className="border rounded p-3">
              <div className="text-sm text-gray-600">{p.patient.name} • Card {p.patient.cardNumber} • Tier {p.tier} • {new Date(p.createdAt).toLocaleString()}</div>
              <pre className="whitespace-pre-wrap text-sm mt-2">{formatDataText(p.data)}</pre>
              {Array.isArray(p.files) && p.files.length>0 && (
                <div className="mt-2 space-y-1">
                  {p.files.map((f,idx)=> (
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
              <div className="mt-2 flex gap-2">
                <button onClick={()=> act(p.id,'approve')} className="bg-green-600 text-white px-3 py-1 rounded">Approve</button>
                <button onClick={()=> act(p.id,'reject')} className="bg-red-600 text-white px-3 py-1 rounded">Reject</button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
