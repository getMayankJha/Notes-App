import React, { useEffect, useRef, useState } from 'react'
import ReactQuill from 'react-quill'
import 'react-quill/dist/quill.snow.css'
import api, { setAuthToken } from '../api'
import { io } from 'socket.io-client'

export default function Editor({ noteId }) {
  const [content, setContent] = useState('')
  const [title, setTitle] = useState('')
  const socketRef = useRef(null)
  const saveTimer = useRef(null)

  useEffect(() => {
    // load note content from API
    let cancelled = false
    async function load() {
      try {
        const res = await api.get(`/notes/${noteId}`)
        if (cancelled) return
        setContent(res.data.content || '')
        setTitle(res.data.title || '')
      } catch (err) {
        console.error(err)
      }
    }
    load()
    return () => { cancelled = true }
  }, [noteId])

  useEffect(() => {
    // connect socket after component mounted
    const accessToken = localStorage.getItem('accessToken')
    if (!accessToken) console.warn('No access token; login first for socket auth')

    const socket = io('/', {
      path: '/socket.io',
      auth: { token: accessToken }
    })

    socketRef.current = socket

    socket.on('connect', () => {
      console.log('socket connected', socket.id)
      socket.emit('join-note', { noteId })
    })

    socket.on('init-content', ({ content }) => {
      setContent(content || '')
    })

    socket.on('remote-op', ({ content: remoteContent }) => {
      // naive: replace content with remote content
      setContent(remoteContent)
    })

    socket.on('collaborators', ({ active }) => {
      console.log('active collaborators', active)
    })

    socket.on('error', (err) => console.error('socket error', err))

    return () => {
      socket.emit('leave-note', { noteId })
      socket.disconnect()
    }
  }, [noteId])

  // debounce save & emit
  function onChange(value) {
    setContent(value)

    // emit op to socket (naive full content)
    if (socketRef.current && socketRef.current.connected) {
      socketRef.current.emit('op', { noteId, content: value })
    }

    // debounce autosave to API (10s)
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => {
      api.patch(`/notes/${noteId}`, { content: value, title }).catch(console.error)
    }, 10000)
  }

  async function saveNow() {
    try {
      await api.patch(`/notes/${noteId}`, { content, title })
      alert('Saved')
    } catch (err) {
      console.error(err)
      alert('Save failed')
    }
  }

  return (
    <div className="max-w-4xl mx-auto bg-white p-4 rounded shadow">
      <input
        className="w-full mb-3 text-lg font-semibold border-b pb-2"
        value={title}
        onChange={e => setTitle(e.target.value)}
        placeholder="Note title"
      />

      <ReactQuill value={content} onChange={onChange} />

      <div className="flex justify-between mt-3">
        <div className="text-sm text-slate-500">Auto-save every 10s</div>
        <div>
          <button onClick={saveNow} className="px-3 py-1 rounded bg-blue-600 text-white">Save now</button>
        </div>
      </div>
    </div>
  )
}
