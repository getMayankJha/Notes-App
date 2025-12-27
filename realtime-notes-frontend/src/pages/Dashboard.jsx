import React, { useEffect, useState } from 'react'
import api, { setAuthToken } from '../api'
import { Link } from 'react-router-dom'

export default function Dashboard() {
  const [notes, setNotes] = useState([])
  const [token, setToken] = useState('') // for demo only; store carefully in prod

  useEffect(() => {
    // if you already have an accessToken in localStorage:
    const t = localStorage.getItem('accessToken')
    if (t) {
      setAuthToken(t)
      setToken(t)
    }
    fetchNotes()
  }, [])

  async function fetchNotes() {
    try {
      const res = await api.get('/notes')
      setNotes([...res.data.owned, ...res.data.shared])
    } catch (err) {
      console.error(err)
    }
  }

  async function createNote() {
    try {
      const res = await api.post('/notes', { title: 'Untitled', content: '' })
      const note = res.data
      window.location.href = `/notes/${note._id}`
    } catch (err) {
      console.error(err)
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">Your Notes</h2>
        <button className="btn bg-blue-600 text-white px-3 py-1 rounded" onClick={createNote}>New Note</button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {notes.map(n => (
          <Link to={`/notes/${n._id}`} key={n._id} className="block bg-white p-4 rounded shadow">
            <h3 className="font-medium">{n.title}</h3>
            <p className="text-sm text-slate-500 mt-2">Last updated: {new Date(n.updatedAt).toLocaleString()}</p>
          </Link>
        ))}
      </div>
    </div>
  )
}
