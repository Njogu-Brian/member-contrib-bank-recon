import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { deleteAuditRun, getAuditRun, getAuditRuns, reanalyzeAuditRun, uploadAuditWorkbook } from '../api/audit'

const currency = (value = 0) => new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES' }).format(value || 0)

export default function Audit() {
  const [selectedFile, setSelectedFile] = useState(null)
  const [year, setYear] = useState(new Date().getFullYear())
  const [selectedRunId, setSelectedRunId] = useState(null)
  const [viewKey, setViewKey] = useState('selected_year')
  const queryClient = useQueryClient()

  const runsQuery = useQuery({
    queryKey: ['audit-runs'],
    queryFn: getAuditRuns,
  })

  const runQuery = useQuery({
    queryKey: ['audit-run', selectedRunId],
    queryFn: () => getAuditRun(selectedRunId),
    enabled: !!selectedRunId,
  })

  useEffect(() => {
    if (!selectedRunId && runsQuery.data?.runs?.length) {
      setSelectedRunId(runsQuery.data.runs[0].id)
    }
  }, [runsQuery.data, selectedRunId])

  const auditMutation = useMutation({
    mutationFn: ({ file, year }) => uploadAuditWorkbook(file, year),
    onSuccess: (data) => {
      queryClient.invalidateQueries(['audit-runs'])
      queryClient.setQueryData(['audit-run', data.run.id], data)
      setSelectedRunId(data.run.id)
      setViewKey('selected_year')
    },
    onError: (error) => {
      const message = error.response?.data?.message || error.response?.data?.file?.[0] || 'Failed to process audit file.'
      alert(message)
    },
  })

  const reanalyzeMutation = useMutation({
    mutationFn: (id) => reanalyzeAuditRun(id),
    onSuccess: (data) => {
      queryClient.invalidateQueries(['audit-runs'])
      queryClient.setQueryData(['audit-run', data.run.id], data)
      setViewKey('selected_year')
      alert('Audit reanalyzed successfully.')
    },
    onError: () => alert('Failed to reanalyze audit.'),
  })

  const deleteMutation = useMutation({
    mutationFn: (id) => deleteAuditRun(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['audit-runs'])
      if (selectedRunId) {
        queryClient.removeQueries(['audit-run', selectedRunId])
      }
      setSelectedRunId(null)
      alert('Audit deleted.')
    },
    onError: () => alert('Failed to delete audit.'),
  })

  const handleSubmit = (event) => {
    event.preventDefault()
    if (!selectedFile) {
      alert('Please select an Excel file first.')
      return
    }
    auditMutation.mutate({ file: selectedFile, year })
  }

  const currentRun = runQuery.data?.run
  const rows = runQuery.data?.rows || []
  const viewEntries = useMemo(() => {
    if (!currentRun?.views) return []
    const order = currentRun.view_order?.length ? currentRun.view_order : Object.keys(currentRun.views)
    return order
      .map((key) => [key, currentRun.views[key]])
      .filter(([, value]) => Boolean(value))
  }, [currentRun])

  useEffect(() => {
    if (viewEntries.length && !viewEntries.find(([key]) => key === viewKey)) {
      setViewKey(viewEntries[0][0])
    }
  }, [viewEntries, viewKey])

  const mismatches = useMemo(() => rows.filter((row) => row.status === 'fail'), [rows])
  const missingMembers = useMemo(() => rows.filter((row) => row.status === 'missing_member'), [rows])
  const passes = useMemo(() => rows.filter((row) => row.status === 'pass'), [rows])
  const viewSummary = currentRun?.views?.[viewKey]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Audit Members Contributions</h1>
        <p className="text-sm text-gray-500 mt-1">
          Upload the Excel workbook exported from your audit to compare it against the system totals.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="bg-white shadow rounded-lg p-6 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Year</label>
            <input
              type="number"
              min="2000"
              max="2100"
              value={year}
              onChange={(e) => setYear(e.target.value)}
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Excel File</label>
            <input
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
              className="w-full text-sm text-gray-700"
            />
          </div>
        </div>
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={auditMutation.isPending}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50"
          >
            {auditMutation.isPending ? 'Processing...' : 'Run Audit'}
          </button>
        </div>
      </form>

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
        <div className="space-y-6">
          <section className="bg-white shadow rounded-lg">
            <div className="border-b px-6 py-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold">Audit Runs</h3>
              {selectedRunId && (
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => reanalyzeMutation.mutate(selectedRunId)}
                    disabled={reanalyzeMutation.isPending}
                    className="text-xs text-indigo-600 hover:text-indigo-800 disabled:opacity-50"
                  >
                    {reanalyzeMutation.isPending ? 'Reanalyzing…' : 'Reanalyze'}
                  </button>
                  <button
                    onClick={() => {
                      if (confirm('Delete this audit run permanently?')) {
                        deleteMutation.mutate(selectedRunId)
                      }
                    }}
                    disabled={deleteMutation.isPending}
                    className="text-xs text-red-600 hover:text-red-800 disabled:opacity-50"
                  >
                    {deleteMutation.isPending ? 'Deleting…' : 'Delete'}
                  </button>
                </div>
              )}
            </div>
            <div className="divide-y">
              {runsQuery.data?.runs?.length ? (
                runsQuery.data.runs.map((run) => (
                  <button
                    key={run.id}
                    onClick={() => setSelectedRunId(run.id)}
                    className={`w-full text-left px-6 py-4 text-sm ${
                      selectedRunId === run.id ? 'bg-indigo-50 text-indigo-700' : 'hover:bg-gray-50'
                    }`}
                  >
                    <div className="font-semibold">Year {run.year}</div>
                    <div className="text-xs text-gray-500">{run.original_filename}</div>
                    <div className="text-xs text-gray-400 mt-1">{run.created_at}</div>
                  </button>
                ))
              ) : (
                <p className="px-6 py-4 text-sm text-gray-500">No runs yet.</p>
              )}
            </div>
          </section>
        </div>

        <div className="space-y-6 xl:col-span-3">
          {currentRun ? (
            <>
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-semibold">Audit for {currentRun.year}</h2>
                  <p className="text-sm text-gray-500">
                    File: {currentRun.original_filename} • Created {currentRun.created_at}
                  </p>
                </div>
                <div className="flex gap-2 flex-wrap justify-end">
                  {viewEntries.map(([key, view]) => (
                    <button
                      key={key}
                      onClick={() => setViewKey(key)}
                      className={`px-3 py-1 rounded-full text-sm ${
                        viewKey === key ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {view.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <SummaryCard label="Rows Processed" value={currentRun.summary.rows} />
                <SummaryCard label="Pass" value={currentRun.summary.pass} accent="text-green-600" />
                <SummaryCard label="Fail" value={currentRun.summary.fail} accent="text-red-600" />
                <SummaryCard label="Missing Members" value={currentRun.summary.missing_member} accent="text-yellow-600" />
              </div>

              {viewSummary && (
                <div className="bg-white shadow rounded-lg p-4">
                  <h3 className="text-sm font-semibold text-gray-700 mb-2">
                    {viewSummary.label} totals
                  </h3>
                  <div className="flex items-center gap-6 text-sm">
                    <div>
                      <p className="text-gray-500">Expected</p>
                      <p className="font-semibold text-gray-900">{currency(viewSummary.expected)}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Actual</p>
                      <p className="font-semibold text-gray-900">{currency(viewSummary.actual)}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Difference</p>
                      <p className={`font-semibold ${viewSummary.difference >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {currency(viewSummary.difference)}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <AuditTable
                title="Members with mismatched totals"
                rows={mismatches}
                viewKey={viewKey}
                emptyMessage="All members aligned."
              />

              {missingMembers.length > 0 && (
                <section className="bg-white shadow rounded-lg">
                  <div className="border-b px-6 py-4">
                    <h3 className="text-lg font-semibold">Rows without matching members</h3>
                  </div>
                  <div className="relative max-h-[40vh] overflow-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50 sticky top-0 z-10">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Phone</th>
                          <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Expected Total</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {missingMembers.map((row, idx) => (
                          <tr key={`${row.name}-${idx}`}>
                            <td className="px-6 py-4 text-sm text-gray-900">{row.member_name || row.name || '-'}</td>
                            <td className="px-6 py-4 text-sm text-gray-600">{row.phone || '-'}</td>
                            <td className="px-6 py-4 text-sm text-gray-900 text-right">{currency(row.expected_total)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </section>
              )}

              {passes.length > 0 && (
                <details className="bg-white shadow rounded-lg" open>
                  <summary className="px-6 py-4 cursor-pointer select-none text-sm text-gray-700 font-medium border-b">
                    View members that passed the audit ({passes.length})
                  </summary>
                  <div className="relative max-h-[40vh] overflow-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50 sticky top-0 z-10">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Member</th>
                          <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Expected</th>
                          <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">System</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {passes.map((row) => (
                          <tr key={row.id}>
                            <td className="px-6 py-4 text-sm text-gray-900">
                              <div className="font-medium">
                                {row.member_id ? (
                                  <Link to={`/members/${row.member_id}`} className="text-indigo-600 hover:underline">
                                    {row.member_name || row.name}
                                  </Link>
                                ) : (
                                  row.member_name || row.name
                                )}
                              </div>
                              <div className="text-xs text-gray-500">{row.phone || '—'}</div>
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-900 text-right">{currency(row.expected_total)}</td>
                            <td className="px-6 py-4 text-sm text-gray-900 text-right">{currency(row.system_total)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </details>
              )}
            </>
          ) : (
            <div className="bg-white shadow rounded-lg p-6 text-center text-sm text-gray-500">
              Select or upload an audit run to view details.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function SummaryCard({ label, value, accent = 'text-gray-900' }) {
  return (
    <div className="bg-white shadow rounded-lg p-4">
      <p className="text-sm text-gray-500">{label}</p>
      <p className={`text-2xl font-semibold mt-2 ${accent}`}>{value}</p>
    </div>
  )
}

function AuditTable({ title, rows, viewKey, emptyMessage }) {
  return (
    <section className="bg-white shadow rounded-lg">
      <div className="border-b px-6 py-4 flex items-center justify-between">
        <h3 className="text-lg font-semibold">{title}</h3>
      </div>
      {rows.length === 0 ? (
        <p className="p-6 text-sm text-gray-500">{emptyMessage}</p>
      ) : (
        <div className="relative max-h-[60vh] overflow-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50 sticky top-0 z-10">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Member</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Phone</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Expected</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actual</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Mismatched Months</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {rows.map((row) => {
                const view = row.monthly?.[viewKey]
                const expected = view?.months?.reduce((sum, month) => sum + (month.expected || 0), 0) ?? row.expected_total
                const actual = view?.months?.reduce((sum, month) => sum + (month.actual || 0), 0) ?? row.system_total
                const mismatchedMonths =
                  viewKey === 'selected_year'
                    ? row.mismatched_months || []
                    : (view?.months?.filter((m) => !m.matches).map((m) => m.month) ?? [])

                return (
                  <tr key={row.id}>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {row.member_id ? (
                        <Link to={`/members/${row.member_id}`} className="text-indigo-600 hover:underline">
                          {row.member_name || row.name}
                        </Link>
                      ) : (
                        row.member_name || row.name
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">{row.phone || '—'}</td>
                    <td className="px-6 py-4 text-sm text-gray-900 text-right">{currency(expected)}</td>
                    <td className="px-6 py-4 text-sm text-gray-900 text-right">{currency(actual)}</td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {mismatchedMonths.length ? mismatchedMonths.join(', ') : '—'}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}

