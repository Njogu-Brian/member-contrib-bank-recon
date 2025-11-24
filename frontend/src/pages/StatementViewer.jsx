import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Document, Page, pdfjs } from 'react-pdf'
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.min.js?url'
import { getStatementDocumentMetadata } from '../api/statements'
import 'react-pdf/dist/esm/Page/AnnotationLayer.css'
import 'react-pdf/dist/esm/Page/TextLayer.css'

pdfjs.GlobalWorkerOptions.workerSrc = pdfjsWorker

const STATUS_META = {
  auto_assigned: {
    label: 'Auto-assigned',
    pillClass: 'bg-green-600 text-white',
    textClass: 'text-green-700',
    highlightClass: 'pdf-text-auto',
  },
  manual_assigned: {
    label: 'Manual',
    pillClass: 'bg-blue-600 text-white',
    textClass: 'text-blue-700',
    highlightClass: 'pdf-text-manual',
  },
  draft: {
    label: 'Draft',
    pillClass: 'bg-yellow-500 text-gray-900',
    textClass: 'text-yellow-700',
    highlightClass: 'pdf-text-draft',
  },
  unassigned: {
    label: 'Unassigned',
    pillClass: 'bg-gray-600 text-white',
    textClass: 'text-gray-700',
    highlightClass: 'pdf-text-unassigned',
  },
  archived: {
    label: 'Archived',
    pillClass: 'bg-slate-500 text-white',
    textClass: 'text-slate-600',
    highlightClass: 'pdf-text-archived',
  },
  duplicate: {
    label: 'Duplicate',
    pillClass: 'bg-red-600 text-white',
    textClass: 'text-red-700',
    highlightClass: 'pdf-text-duplicate',
  },
}

const STATUS_ORDER = ['auto_assigned', 'manual_assigned', 'draft', 'unassigned', 'archived', 'duplicate']

const formatCurrency = (value) =>
  Number(value ?? 0).toLocaleString('en-KE', {
    style: 'currency',
    currency: 'KES',
    minimumFractionDigits: 2,
  })

function SummaryCard({ label, value, helper }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">{label}</p>
      <p className="mt-2 text-2xl font-bold text-gray-900">{value}</p>
      {helper && <p className="mt-1 text-xs text-gray-500">{helper}</p>}
    </div>
  )
}

function normalizeText(value) {
  return (value || '').toString().replace(/\s+/g, ' ').trim().toLowerCase()
}

function buildSearchTokens(entry) {
  const tokens = []
  if (entry.transaction_code) {
    tokens.push(entry.transaction_code)
  }
  if (entry.credit) {
    const amount = Number(entry.credit).toLocaleString('en-KE', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
    tokens.push(amount)
    tokens.push(amount.replace(/,/g, ''))
  }
  if (entry.debit) {
    const amount = Number(entry.debit).toLocaleString('en-KE', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
    tokens.push(amount)
    tokens.push(amount.replace(/,/g, ''))
  }
  if (entry.particulars) {
    const cleaned = entry.particulars.replace(/\s+/g, ' ').trim()
    const words = cleaned.split(' ')
    if (words.length >= 3) {
      tokens.push(words.slice(0, 4).join(' '))
      tokens.push(words.slice(-4).join(' '))
    } else {
      tokens.push(cleaned)
    }
  }
  if (entry.metadata?.phones?.length) {
    tokens.push(...entry.metadata.phones)
  }
  return Array.from(new Set(tokens.filter(Boolean)))
}

function getStatusKey(entry) {
  if (entry.status === 'duplicate') {
    return 'duplicate'
  }
  if (entry.is_archived) {
    return 'archived'
  }
  return entry.assignment_status || 'unassigned'
}

function groupEntriesByPage(transactions, duplicates) {
  const entriesByPage = new Map()
  const fallbackEntries = []

  const addEntry = (entry, pageNumber) => {
    if (pageNumber !== null && pageNumber !== undefined) {
      if (!entriesByPage.has(pageNumber)) {
        entriesByPage.set(pageNumber, [])
      }
      entriesByPage.get(pageNumber).push(entry)
    } else {
      fallbackEntries.push(entry)
    }
  }

  transactions.forEach((tx) => {
    const pageNumber = tx.metadata?.page_number ?? null
    const entry = {
      id: `tx-${tx.id}`,
      type: 'transaction',
      original: tx,
      pageNumber,
      rowIndex: tx.metadata?.row_index ?? null,
      label: tx.member?.name || 'Unassigned',
      summary: tx.particulars,
      amount: tx.credit || tx.debit || 0,
      status: getStatusKey({
        assignment_status: tx.assignment_status,
        is_archived: tx.is_archived,
      }),
      transaction_code: tx.transaction_code,
      credit: tx.credit,
      debit: tx.debit,
      particulars: tx.particulars,
      metadata: tx.metadata,
    }

    addEntry(entry, pageNumber)
  })

  duplicates.forEach((dup) => {
    const pageNumber = dup.page_number ?? dup.metadata?.raw_transaction?.page_number ?? null
    const entry = {
      id: `dup-${dup.id}`,
      type: 'duplicate',
      original: dup,
      pageNumber,
      rowIndex: dup.metadata?.raw_transaction?.row_index ?? null,
      label: 'Duplicate',
      summary: dup.particulars_snapshot,
      amount: dup.credit || dup.debit || 0,
      status: 'duplicate',
      transaction_code: dup.transaction_code,
      credit: dup.credit,
      debit: dup.debit,
      particulars: dup.particulars_snapshot,
      metadata: dup.metadata ?? dup.original?.metadata ?? {},
    }

    addEntry(entry, pageNumber)
  })

  return { entriesByPage, fallbackEntries }
}

function StatementPdfPage({
  pageNumber,
  pageEntries,
  statusMeta,
  selectedId,
  onEntryClick,
  registerMatchState,
  width,
  scaleKey,
}) {
  const containerRef = useRef(null)
  const [overlays, setOverlays] = useState([])

  const clearHighlights = useCallback(() => {
    if (!containerRef.current) return
    const spans = containerRef.current.querySelectorAll('.react-pdf__Page__textContent span')
    spans.forEach((span) => {
      span.classList.remove(
        'pdf-text-auto',
        'pdf-text-manual',
        'pdf-text-draft',
        'pdf-text-unassigned',
        'pdf-text-archived',
        'pdf-text-duplicate'
      )
      delete span.dataset.statusId
    })
  }, [])

  const computeOverlays = useCallback(() => {
    const container = containerRef.current
    if (!container) return
    const textLayer = container.querySelector('.react-pdf__Page__textContent')
    if (!textLayer) return

    const spans = Array.from(textLayer.querySelectorAll('span'))
    if (!spans.length) return

    const newOverlays = []

    pageEntries.forEach((entry) => {
      let matched = false
      const tokens = buildSearchTokens(entry)
      for (const token of tokens) {
        const normalizedToken = normalizeText(token)
        if (!normalizedToken || normalizedToken.length < 3) continue
        const span = spans.find((spanEl) => normalizeText(spanEl.textContent).includes(normalizedToken))
        if (span) {
          const rect = span.getBoundingClientRect()
          const containerRect = container.getBoundingClientRect()
          span.classList.add(statusMeta[entry.status]?.highlightClass || 'pdf-text-unassigned')
          span.dataset.statusId = entry.id

          newOverlays.push({
            id: entry.id,
            top: rect.top - containerRect.top - 18,
            left: rect.left - containerRect.left,
            width: rect.width,
            status: entry.status,
            label: statusMeta[entry.status]?.label || entry.status,
          })

          matched = true
          break
        }
      }

      registerMatchState(entry.id, matched)
    })

    setOverlays(newOverlays)
  }, [pageEntries, registerMatchState, statusMeta, scaleKey, width])

  const handleRenderSuccess = useCallback(() => {
    setTimeout(() => {
      clearHighlights()
      computeOverlays()
    }, 50)
  }, [clearHighlights, computeOverlays])

  useEffect(() => {
    computeOverlays()
  }, [computeOverlays])

  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    const handleResize = () => {
      computeOverlays()
    }
    window.addEventListener('resize', handleResize)
    return () => {
      window.removeEventListener('resize', handleResize)
    }
  }, [computeOverlays])

  return (
    <div ref={containerRef} className="relative mb-8">
      <Page
        pageNumber={pageNumber}
        width={width}
        renderAnnotationLayer={false}
        onRenderSuccess={handleRenderSuccess}
      />
      <div className="pointer-events-none absolute inset-0">
        {overlays.map((overlay) => (
          <div
            key={overlay.id}
            className="absolute"
            style={{
              top: Math.max(6, overlay.top),
              left: overlay.left,
            }}
          >
            <button
              type="button"
              data-status-id={overlay.id}
              onClick={() => onEntryClick?.(overlay.id)}
              className={`pointer-events-auto inline-flex items-center space-x-2 rounded-full px-3 py-1 shadow-md ring-1 ring-black/5 transition ${
                statusMeta[overlay.status]?.pillClass || 'bg-gray-600 text-white'
              } ${selectedId === overlay.id ? 'ring-2 ring-yellow-300' : ''}`}
            >
              <span className="text-xs font-semibold uppercase tracking-wide">{overlay.label}</span>
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function StatementViewer() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [numPages, setNumPages] = useState(null)
  const [selectedEntryId, setSelectedEntryId] = useState(null)
  const [filter, setFilter] = useState('all')
  const [matchState, setMatchState] = useState({})
  const containerRef = useRef(null)
  const [pageWidth, setPageWidth] = useState(820)
  const [zoom, setZoom] = useState(1)

  const { data, isLoading, error } = useQuery({
    queryKey: ['statement-document', id],
    queryFn: () => getStatementDocumentMetadata(id),
    enabled: Boolean(id),
    retry: 1,
  })

  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
  const [pdfUrl, setPdfUrl] = useState(null)
  const [pdfFetchError, setPdfFetchError] = useState(null)
  const metrics = data?.metrics || {}
  const assignmentBreakdown = metrics.assignment_breakdown || {}

  useEffect(() => {
    let isActive = true
    let objectUrl = null

    const loadPdf = async () => {
      const documentUrl = data?.statement?.document_absolute_url ?? data?.statement?.document_url

      if (!documentUrl) {
        setPdfUrl(null)
        setPdfFetchError('Statement document is not available.')
        return
      }

      try {
        setPdfFetchError(null)
        setPdfUrl(null)

        const response = await fetch(documentUrl, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          credentials: 'include',
        })

        if (!response.ok) {
          throw new Error(`Request failed with status ${response.status}`)
        }

        const blob = await response.blob()
        if (!isActive) {
          return
        }

        objectUrl = URL.createObjectURL(blob)
        setPdfUrl(objectUrl)
      } catch (err) {
        if (!isActive) {
          return
        }
        setPdfFetchError(err.message || 'Failed to load PDF.')
      }
    }

    if (data?.statement) {
      loadPdf()
    }

    return () => {
      isActive = false
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl)
      }
    }
  }, [data, token])

  useEffect(() => {
    const handleResize = () => {
      if (!containerRef.current) return
      const nextWidth = Math.min(900, containerRef.current.clientWidth - 24)
      if (nextWidth > 400) {
        setPageWidth(nextWidth)
      }
    }
    handleResize()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  useEffect(() => {
    setMatchState({})
    setSelectedEntryId(null)
  }, [pdfUrl])

  const { entriesByPage, fallbackEntries } = useMemo(() => {
    if (!data) {
      return { entriesByPage: new Map(), fallbackEntries: [] }
    }
    return groupEntriesByPage(data.transactions || [], data.duplicates || [])
  }, [data])

  useEffect(() => {
    if (!selectedEntryId) return
    const container = containerRef.current
    if (!container) return
    const target = container.querySelector(`[data-status-id="${selectedEntryId}"]`)
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' })
    }
  }, [selectedEntryId, zoom, pdfUrl])

  const registerMatchState = useCallback((entryId, matched) => {
    setMatchState((prev) => {
      if (prev[entryId] === matched) {
        return prev
      }
      return { ...prev, [entryId]: matched }
    })
  }, [])

  useEffect(() => {
    if (!fallbackEntries.length) return
    setMatchState((prev) => {
      const next = { ...prev }
      let changed = false
      fallbackEntries.forEach((entry) => {
        if (next[entry.id] !== null) {
          next[entry.id] = null
          changed = true
        }
      })
      return changed ? next : prev
    })
  }, [fallbackEntries])

  const flatEntries = useMemo(() => {
    const entries = []
    entriesByPage.forEach((list, pageKey) => {
      list.forEach((entry) => {
        entries.push({ ...entry, pageKey })
      })
    })
    fallbackEntries.forEach((entry) => {
      entries.push({ ...entry, pageKey: null })
    })
    return entries.sort((a, b) => {
      const statusWeight = STATUS_ORDER.indexOf(a.status) - STATUS_ORDER.indexOf(b.status)
      if (statusWeight !== 0) return statusWeight
      const dateA = a.original?.tran_date || ''
      const dateB = b.original?.tran_date || ''
      return dateA.localeCompare(dateB)
    })
  }, [entriesByPage, fallbackEntries])

  const filteredEntries = useMemo(() => {
    if (filter === 'all') return flatEntries
    return flatEntries.filter((entry) => entry.status === filter)
  }, [flatEntries, filter])

  const unmatchedEntries = flatEntries.filter(
    (entry) => entry.pageNumber !== null && entry.pageNumber !== undefined && matchState[entry.id] === false
  )

  const zoomConfig = useMemo(() => ({ min: 0.6, max: 2, step: 0.2 }), [])

  const handleZoomIn = () => {
    setZoom((prev) => {
      const next = Math.min(zoomConfig.max, prev + zoomConfig.step)
      return Math.round(next * 100) / 100
    })
  }

  const handleZoomOut = () => {
    setZoom((prev) => {
      const next = Math.max(zoomConfig.min, prev - zoomConfig.step)
      return Math.round(next * 100) / 100
    })
  }

  const handleZoomReset = () => setZoom(1)

  const onDocumentLoadSuccess = ({ numPages: nextNumPages }) => {
    setNumPages(nextNumPages)
  }

  if (isLoading) {
    return <div className="py-12 text-center">Loading statement...</div>
  }

  if (error) {
    return (
      <div className="py-12 text-center space-y-4">
        <p className="text-red-600 text-lg font-medium">Failed to load statement</p>
        <p className="text-sm text-gray-600">{error.message}</p>
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center px-4 py-2 rounded-md bg-indigo-600 text-white hover:bg-indigo-700"
        >
          Go Back
        </button>
      </div>
    )
  }

  if (pdfFetchError) {
    return (
      <div className="py-12 text-center space-y-4">
        <p className="text-red-600 text-lg font-medium">Unable to display PDF.</p>
        <p className="text-sm text-gray-600">{pdfFetchError}</p>
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center px-4 py-2 rounded-md bg-indigo-600 text-white hover:bg-indigo-700"
        >
          Go Back
        </button>
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">{data.statement.filename}</h1>
          <p className="text-sm text-gray-600">
            Uploaded {data.statement.uploaded_at ? new Date(data.statement.uploaded_at).toLocaleString() : 'n/a'}
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2">
            <div className="inline-flex items-center overflow-hidden rounded-md border border-gray-300 bg-white shadow-sm">
              <button
                type="button"
                onClick={handleZoomOut}
                disabled={zoom <= zoomConfig.min + 0.01}
                className="px-2 py-1 text-sm font-medium text-gray-700 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50"
              >
                −
              </button>
              <span className="px-3 py-1 text-sm font-semibold text-gray-700">
                {Math.round(zoom * 100)}%
              </span>
              <button
                type="button"
                onClick={handleZoomIn}
                disabled={zoom >= zoomConfig.max - 0.01}
                className="px-2 py-1 text-sm font-medium text-gray-700 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50"
              >
                +
              </button>
            </div>
            <button
              type="button"
              onClick={handleZoomReset}
              className="inline-flex items-center rounded-md border border-gray-300 px-2 py-1 text-xs font-medium text-gray-600 hover:bg-gray-100"
            >
              Reset
            </button>
          </div>
          <button
            onClick={() => navigate(`/statements/${id}/transactions`)}
            className="inline-flex items-center rounded-md border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50"
          >
            View Transactions List
          </button>
          <button
            onClick={() => navigate(-1)}
            className="inline-flex items-center rounded-md bg-indigo-600 px-3 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700"
          >
            Back
          </button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <SummaryCard label="Total Credit" value={formatCurrency(metrics.total_credit)} />
        <SummaryCard label="Total Debit" value={formatCurrency(metrics.total_debit)} />
        <SummaryCard
          label="Transactions"
          value={metrics.total_transactions ?? data?.transactions?.length ?? 0}
          helper={
            metrics.first_transaction_date && metrics.last_transaction_date
              ? `${new Date(metrics.first_transaction_date).toLocaleDateString()} – ${new Date(
                  metrics.last_transaction_date
                ).toLocaleDateString()}`
              : undefined
          }
        />
        <SummaryCard
          label="Duplicates"
          value={metrics.duplicates ?? data?.duplicates?.length ?? 0}
          helper={`Archived: ${metrics.archived_transactions ?? 0}`}
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <div ref={containerRef} className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
          {pdfUrl ? (
            <Document
              key={pdfUrl}
              file={pdfUrl}
              onLoadSuccess={onDocumentLoadSuccess}
              loading={<div className="py-8 text-center text-sm text-gray-600">Loading PDF...</div>}
              error={<div className="py-8 text-center text-sm text-red-600">Unable to display PDF.</div>}
              renderMode="canvas"
            >
              {Array.from(new Array(numPages), (_, idx) => {
                const pageNumber = idx + 1
                const entries = entriesByPage.get(pageNumber) || []
                return (
                  <StatementPdfPage
                    key={`page-${pageNumber}`}
                    pageNumber={pageNumber}
                    pageEntries={entries}
                    statusMeta={STATUS_META}
                    selectedId={selectedEntryId}
                    onEntryClick={(entryId) => setSelectedEntryId(entryId)}
                    registerMatchState={registerMatchState}
                    width={Math.max(320, Math.round(pageWidth * zoom))}
                    scaleKey={`${zoom}-${pageWidth}`}
                  />
                )
              })}
            </Document>
          ) : (
            <div className="py-12 text-center text-sm text-gray-600">Preparing PDF…</div>
          )}
        </div>

        <div className="flex h-full flex-col space-y-4">
          <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
            <h2 className="text-lg font-semibold text-gray-900">Legend</h2>
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setFilter('all')}
                className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide ring-1 ring-offset-1 transition ${
                  filter === 'all'
                    ? 'bg-gray-900 text-white ring-gray-900'
                    : 'bg-gray-100 text-gray-700 ring-gray-200 hover:bg-gray-200'
                }`}
              >
                All ({flatEntries.length})
              </button>
              {STATUS_ORDER.map((statusKey) => (
                <button
                  key={statusKey}
                  type="button"
                  onClick={() => setFilter(statusKey)}
                  className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide ring-1 ring-offset-1 transition ${
                    filter === statusKey
                      ? 'ring-gray-900 text-white'
                      : 'bg-gray-100 text-gray-700 ring-gray-200 hover:bg-gray-200'
                  } ${STATUS_META[statusKey]?.pillClass || ''}`}
                >
                  {STATUS_META[statusKey]?.label || statusKey} (
                  {flatEntries.filter((entry) => entry.status === statusKey).length})
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
            <h2 className="text-lg font-semibold text-gray-900">Assignment Breakdown</h2>
            <dl className="mt-3 grid grid-cols-2 gap-3 text-sm text-gray-700">
              {['auto_assigned', 'manual_assigned', 'draft', 'unassigned', 'duplicate'].map((key) => (
                <div key={key} className="flex items-center justify-between">
                  <dt className="capitalize">{key.replace('_', ' ')}</dt>
                  <dd className="font-semibold">{assignmentBreakdown[key] ?? 0}</dd>
                </div>
              ))}
            </dl>
          </div>

          <div className="flex-1 overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
            <div className="border-b border-gray-200 px-4 py-2">
              <h2 className="text-lg font-semibold text-gray-900">Transactions &amp; Duplicates</h2>
              {unmatchedEntries.length > 0 && (
                <p className="mt-1 text-xs text-red-600">
                  {unmatchedEntries.length} entries not highlighted (PDF text did not contain their anchor text).
                </p>
              )}
              {fallbackEntries.length > 0 && (
                <p className="mt-1 text-xs text-amber-600">
                  {fallbackEntries.length} entries lack page metadata. They are still listed below and can be inspected
                  manually.
                </p>
              )}
            </div>
            <div className="max-h-[calc(100vh-280px)] overflow-y-auto divide-y divide-gray-100">
              {filteredEntries.length === 0 && (
                <div className="px-4 py-6 text-sm text-gray-500">No entries for this filter.</div>
              )}
              {filteredEntries.map((entry) => {
                const status = STATUS_META[entry.status] || STATUS_META.unassigned
                const isSelected = selectedEntryId === entry.id
                const hasKnownPage = entry.pageNumber !== null && entry.pageNumber !== undefined
                const unmatched = hasKnownPage && matchState[entry.id] === false
                return (
                  <button
                    key={entry.id}
                    onClick={() => setSelectedEntryId(entry.id)}
                    className={`w-full text-left px-4 py-3 transition ${
                      isSelected ? 'bg-indigo-50' : 'hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center space-x-2">
                          <span
                            className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold uppercase tracking-wide ${status.pillClass}`}
                          >
                            {status.label}
                          </span>
                          {unmatched && (
                            <span className="text-xs font-medium text-red-500">Not highlighted</span>
                          )}
                          {!hasKnownPage && (
                            <span className="text-xs font-medium text-amber-600">Page metadata unavailable</span>
                          )}
                        </div>
                        <p className="mt-2 text-sm font-medium text-gray-900 overflow-hidden text-ellipsis">
                          {entry.summary || 'No particulars available'}
                        </p>
                        {entry.original?.member?.name && (
                          <p className="mt-1 text-xs text-gray-600">
                            Member: <span className="font-medium text-gray-800">{entry.original.member.name}</span>
                          </p>
                        )}
                        <p className="mt-1 text-xs text-gray-500">
                          Page {entry.pageNumber ?? 'Unknown'} •{' '}
                          {entry.original?.tran_date
                            ? new Date(entry.original.tran_date).toLocaleDateString()
                            : 'Date unavailable'}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold text-gray-900">
                          {entry.amount
                            ? Number(entry.amount).toLocaleString('en-KE', {
                                style: 'currency',
                                currency: 'KES',
                              })
                            : '—'}
                        </p>
                        {entry.transaction_code && (
                          <p className="mt-1 text-xs text-gray-500">Code: {entry.transaction_code}</p>
                        )}
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

