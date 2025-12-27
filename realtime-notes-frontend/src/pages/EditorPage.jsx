import React from 'react'
import { useParams } from 'react-router-dom'
import Editor from '../components/Editor'

export default function EditorPage() {
  const { id } = useParams()
  return <Editor noteId={id} />
}
