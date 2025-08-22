import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'

export default function CriticalRequests() {
  const [items, setItems] = useState([])
  const [toast, setToast] = useState({ type:'', message:'' })
  const navigate = useNavigate()
  const token = localStorage.getItem('token')

  const load = async () => {
    setToast({})
    try{
      const r = await fetch('http://localhost:5000/api/auth/doctor/critical-requests/pending', { headers: { Authorization: `Bearer ${token}` } })
      const d = await r.json()
      if (!r.ok) return setToast({ type:'error', message: d.message || 'Failed to load requests' })
      setItems(d.requests || [])
    }catch{
      setToast({ type:'error', message:'Server error' })
    }
  }

  useEffect(()=>{ if(!token) navigate('/login'); else load() }, [])

  const act = async (id, action) => {
    try{
      setToast({})
      const r = await fetch(`http://localhost:5000/api/auth/doctor/access-request/${id}/${action}`, { method:'POST', headers: { Authorization: `Bearer ${token}` } })
      const d = await r.json()
      if (!r.ok) return setToast({ type:'error', message: d.message || 'Action failed' })
      await load()
      setToast({ type:'success', message: `Request ${action}d` })
    }catch{
      setToast({ type:'error', message:'Server error' })
    }
  }

  return (
    <div className="p-6 space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Critical Access Requests</h1>
        <button onClick={()=> navigate('/doctor')} className="underline">Back</button>
      </div>
      {toast.message && (
        <div className={`p-2 rounded ${toast.type==='error'?'bg-red-200 text-red-800':'bg-green-200 text-green-800'}`}>{toast.message}</div>
      )}
      {items.length===0 ? (
        <div className="text-gray-600">No pending requests.</div>
      ) : (
        <ul className="space-y-3">
          {items.map((it)=> (
            <li key={it.id} className="border rounded p-3">
              <div className="text-sm text-gray-600">{it.patient.name} • Card {it.patient.cardNumber} • by Dr. {it.requester.name} • {new Date(it.createdAt).toLocaleString()}</div>
              {Array.isArray(it.proofs) && it.proofs.length>0 && (
                <div className="mt-2 space-y-1">
                  {it.proofs.map((f,idx)=> (
                    <div key={idx} className="text-sm">
                      {f.url ? (
                        <a className="text-blue-600 underline" href={f.url} target="_blank" rel="noreferrer">Download {f.name}</a>
                      ) : (
                        <span>{f.name}</span>
                      )}
                    </div>
                  ))}
                </div>
              )}
              <div className="mt-2 flex gap-2">
                <button onClick={()=> act(it.id, 'approve')} className="bg-green-600 text-white px-3 py-1 rounded">Approve</button>
                <button onClick={()=> act(it.id, 'reject')} className="bg-red-600 text-white px-3 py-1 rounded">Reject</button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
