"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import {
  Upload, Search, FileText, Trash2, Loader2, CheckCircle2,
  AlertCircle, Clock, X, ChevronDown
} from "lucide-react"
import { cn } from "@/lib/utils"
import type { Document } from "@/types/database"

function formatBytes(bytes: number | null) {
  if (!bytes) return "—"
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return "just now"
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

function StatusBadge({ status }: { status: Document["status"] }) {
  if (status === "ready") return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-500/15 text-green-400">
      <CheckCircle2 className="w-3 h-3" /> Ready
    </span>
  )
  if (status === "processing") return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-500/15 text-yellow-400">
      <Clock className="w-3 h-3" /> Processing
    </span>
  )
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-500/15 text-red-400">
      <AlertCircle className="w-3 h-3" /> Error
    </span>
  )
}

export default function DocumentsPage() {
  const [documents, setDocuments] = useState<Document[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [searchResults, setSearchResults] = useState<{ content: string; document_title?: string }[] | null>(null)
  const [searching, setSearching] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState<string | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const fetchDocuments = useCallback(async () => {
    setLoading(true)
    const res = await fetch("/api/documents")
    if (res.ok) {
      const data = await res.json()
      setDocuments(data.documents ?? [])
    }
    setLoading(false)
  }, [])

  useEffect(() => { fetchDocuments() }, [fetchDocuments])

  // Poll for processing docs every 3s
  useEffect(() => {
    const hasProcessing = documents.some((d) => d.status === "processing")
    if (!hasProcessing) return
    const interval = setInterval(fetchDocuments, 3000)
    return () => clearInterval(interval)
  }, [documents, fetchDocuments])

  async function uploadFile(file: File) {
    const allowed = ["application/pdf", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"]
    if (!allowed.includes(file.type)) {
      setUploadProgress("Only PDF and DOCX files are supported.")
      return
    }

    setUploading(true)
    setUploadProgress(`Uploading ${file.name}…`)

    const formData = new FormData()
    formData.append("file", file)
    formData.append("title", file.name.replace(/\.[^.]+$/, ""))

    const res = await fetch("/api/documents/upload", { method: "POST", body: formData })

    if (res.ok) {
      setUploadProgress(null)
      fetchDocuments()
    } else {
      const data = await res.json()
      setUploadProgress(`Error: ${data.error ?? "Upload failed"}`)
    }
    setUploading(false)
  }

  function handleFiles(files: FileList | null) {
    if (!files?.length) return
    uploadFile(files[0])
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragOver(false)
    handleFiles(e.dataTransfer.files)
  }

  async function handleSearch(q: string) {
    setSearch(q)
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current)

    if (!q.trim()) {
      setSearchResults(null)
      return
    }

    searchTimeoutRef.current = setTimeout(async () => {
      setSearching(true)
      const res = await fetch("/api/documents/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: q, topK: 5 }),
      })
      if (res.ok) {
        const data = await res.json()
        setSearchResults(data.results ?? [])
      }
      setSearching(false)
    }, 500)
  }

  async function deleteDocument(id: string) {
    setDeletingId(id)
    await fetch(`/api/documents/${id}`, { method: "DELETE" })
    setDocuments((prev) => prev.filter((d) => d.id !== id))
    setDeletingId(null)
  }

  const filtered = search && !searchResults
    ? documents.filter((d) => d.title.toLowerCase().includes(search.toLowerCase()))
    : documents

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Document Library</h1>
          <p className="text-gray-400 text-sm mt-0.5">
            Upload PDFs and DOCX files — agents can search them with RAG
          </p>
        </div>
        <button
          onClick={() => fileInputRef.current?.click()}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium rounded-lg transition-colors"
        >
          <Upload className="w-4 h-4" />
          Upload
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.docx"
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />
      </div>

      {/* Upload feedback */}
      {uploadProgress && (
        <div className={cn(
          "flex items-center gap-2 px-4 py-3 rounded-lg mb-4 text-sm",
          uploadProgress.startsWith("Error") ? "bg-red-500/15 text-red-400" : "bg-blue-500/15 text-blue-400"
        )}>
          {uploading && <Loader2 className="w-4 h-4 animate-spin shrink-0" />}
          {uploadProgress}
          {!uploading && (
            <button onClick={() => setUploadProgress(null)} className="ml-auto">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      )}

      {/* Search */}
      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
        <input
          value={search}
          onChange={(e) => handleSearch(e.target.value)}
          placeholder="Semantic search across all documents…"
          className="w-full pl-10 pr-4 py-2.5 bg-gray-800 border border-gray-700 rounded-xl text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        {searching && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 animate-spin" />
        )}
      </div>

      {/* Semantic search results */}
      {searchResults !== null && (
        <div className="mb-6 bg-gray-800/60 rounded-xl border border-gray-700 divide-y divide-gray-700/50">
          <div className="flex items-center justify-between px-4 py-2.5">
            <p className="text-xs font-medium text-gray-400">
              {searchResults.length} result{searchResults.length !== 1 ? "s" : ""} for &ldquo;{search}&rdquo;
            </p>
            <button onClick={() => { setSearchResults(null); setSearch("") }} className="text-gray-500 hover:text-gray-300">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          {searchResults.length === 0 ? (
            <p className="px-4 py-3 text-sm text-gray-500">No relevant passages found.</p>
          ) : (
            searchResults.map((r, i) => (
              <div key={i} className="px-4 py-3">
                {r.document_title && (
                  <p className="text-xs font-medium text-blue-400 mb-1">{r.document_title}</p>
                )}
                <p className="text-sm text-gray-300 leading-relaxed line-clamp-3">{r.content}</p>
              </div>
            ))
          )}
        </div>
      )}

      {/* Drop zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        className={cn(
          "border-2 border-dashed rounded-xl p-8 text-center mb-6 transition-colors cursor-pointer",
          dragOver ? "border-blue-500 bg-blue-500/10" : "border-gray-700 hover:border-gray-600"
        )}
        onClick={() => fileInputRef.current?.click()}
      >
        <Upload className="w-8 h-8 text-gray-600 mx-auto mb-2" />
        <p className="text-gray-400 text-sm font-medium">Drop a PDF or DOCX here</p>
        <p className="text-gray-600 text-xs mt-1">or click to browse · max 20MB</p>
      </div>

      {/* Document list */}
      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-6 h-6 text-gray-500 animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12">
          <FileText className="w-10 h-10 text-gray-700 mx-auto mb-3" />
          <p className="text-gray-500 text-sm">No documents yet. Upload your first file.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((doc) => (
            <div
              key={doc.id}
              className="flex items-center gap-4 px-4 py-3.5 bg-gray-800/60 border border-gray-700/50 rounded-xl hover:border-gray-600 transition-colors"
            >
              <div className="flex items-center justify-center w-9 h-9 bg-gray-700 rounded-lg shrink-0">
                <FileText className="w-4 h-4 text-gray-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">{doc.title}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-xs text-gray-500 uppercase">{doc.file_type}</span>
                  <span className="text-gray-700">·</span>
                  <span className="text-xs text-gray-500">{formatBytes(doc.file_size)}</span>
                  {doc.page_count && (
                    <>
                      <span className="text-gray-700">·</span>
                      <span className="text-xs text-gray-500">~{doc.page_count} pages</span>
                    </>
                  )}
                  <span className="text-gray-700">·</span>
                  <span className="text-xs text-gray-500">{timeAgo(doc.created_at)}</span>
                </div>
              </div>
              <StatusBadge status={doc.status} />
              <button
                onClick={() => deleteDocument(doc.id)}
                disabled={deletingId === doc.id}
                className="p-1.5 text-gray-600 hover:text-red-400 transition-colors disabled:opacity-40"
              >
                {deletingId === doc.id
                  ? <Loader2 className="w-4 h-4 animate-spin" />
                  : <Trash2 className="w-4 h-4" />
                }
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
