import React from 'react'
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom'
import Dashboard from './pages/Dashboard'
import EditorPage from './pages/EditorPage'

export default function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen">
        <header className="bg-white shadow p-4 flex items-center gap-4">
          <h1 className="text-xl font-semibold">Realtime Notes</h1>
          <nav className="ml-auto flex gap-2">
            <Link to="/" className="text-sm text-slate-600">Dashboard</Link>
          </nav>
        </header>

        <main className="p-6">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/notes/:id" element={<EditorPage />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  )
}
