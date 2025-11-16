import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getStatements, uploadStatement, deleteStatement, reanalyzeStatement, reanalyzeAllStatements } from '../api/statements'
import Pagination from '../components/Pagination'

export default function Statements() {
  const navigate = useNavigate()
  const [uploading, setUploading] = useState(false)
  const [page, setPage] = useState(1)
  const queryClient = useQueryClient()

  const { data, isLoading, error } = useQuery({
    queryKey: ['statements', page],
    queryFn: () => getStatements({ page }),
    retry: 1,
  })

  const deleteMutation = useMutation({
    mutationFn: deleteStatement,
    onSuccess: () => {
      queryClient.invalidateQueries(['statements'])
    },
  })

  const reanalyzeMutation = useMutation({
    mutationFn: reanalyzeStatement,
    onSuccess: () => {
      queryClient.invalidateQueries(['statements'])
      alert('Statement queued for re-analysis. Please wait for processing to complete.')
    },
    onError: (error) => {
      alert('Failed to re-analyze statement: ' + (error.response?.data?.message || error.message))
    },
  })

  const reanalyzeAllMutation = useMutation({
    mutationFn: reanalyzeAllStatements,
    onSuccess: (data) => {
      queryClient.invalidateQueries(['statements'])
      alert(`${data.count} statements queued for re-analysis. Please wait for processing to complete.`)
    },
    onError: (error) => {
      alert('Failed to re-analyze statements: ' + (error.response?.data?.message || error.message))
    },
  })

  const handleUpload = async (e) => {
    const file = e.target.files[0]
    if (file) {
      setUploading(true)
      try {
        await uploadStatement(file)
        queryClient.invalidateQueries(['statements'])
        alert('Statement uploaded successfully!')
      } catch (error) {
        alert('Upload failed: ' + error.message)
      } finally {
        setUploading(false)
        e.target.value = ''
      }
    }
  }

  if (isLoading) {
    return <div className="text-center py-12">Loading...</div>
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600 mb-4">Error loading statements: {error.message}</p>
        <button
          onClick={() => queryClient.invalidateQueries(['statements'])}
          className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"
        >
          Retry
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">Bank Statements</h1>
        <div className="flex space-x-3">
          <button
            onClick={() => {
              if (confirm('This will re-analyze all completed and failed statements. Continue?')) {
                reanalyzeAllMutation.mutate()
              }
            }}
            disabled={reanalyzeAllMutation.isPending}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 disabled:opacity-50"
          >
            {reanalyzeAllMutation.isPending ? 'Processing...' : 'Re-analyze All'}
          </button>
          <label className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 cursor-pointer disabled:opacity-50">
            <input
              type="file"
              accept=".pdf"
              className="hidden"
              onChange={handleUpload}
              disabled={uploading}
            />
            {uploading ? 'Uploading...' : 'Upload Statement'}
          </label>
        </div>
      </div>

      <div className="bg-white shadow rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Filename</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Transactions</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Uploaded</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {data?.data?.map((statement) => (
              <tr key={statement.id}>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  <button
                    onClick={() => navigate(`/statements/${statement.id}`)}
                    className="text-indigo-600 hover:text-indigo-900 hover:underline"
                  >
                    {statement.filename}
                  </button>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                    statement.status === 'completed' ? 'bg-green-100 text-green-800' :
                    statement.status === 'processing' ? 'bg-yellow-100 text-yellow-800' :
                    statement.status === 'failed' ? 'bg-red-100 text-red-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {statement.status}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{statement.transactions_count || 0}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {new Date(statement.created_at).toLocaleDateString()}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                  {statement.error_message && (
                    <span className="text-red-600 text-xs" title={statement.error_message}>
                      Error
                    </span>
                  )}
                  <button
                    onClick={() => navigate(`/statements/${statement.id}/transactions`)}
                    className="text-indigo-600 hover:text-indigo-900"
                  >
                    View Transactions
                  </button>
                  <button
                    onClick={() => {
                      if (confirm('Re-analyze this statement? Existing transactions will be deleted and re-processed.')) {
                        reanalyzeMutation.mutate(statement.id)
                      }
                    }}
                    disabled={reanalyzeMutation.isPending || statement.status === 'processing'}
                    className="text-purple-600 hover:text-purple-900 disabled:opacity-50"
                    title="Re-analyze statement"
                  >
                    Re-analyze
                  </button>
                  <button
                    onClick={() => {
                      if (confirm('Are you sure you want to delete this statement?')) {
                        deleteMutation.mutate(statement.id)
                      }
                    }}
                    className="text-red-600 hover:text-red-900"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {data && (
          <Pagination
            pagination={{
              current_page: data.current_page || 1,
              last_page: data.last_page || 1,
              per_page: data.per_page || 20,
              total: data.total || 0,
            }}
            onPageChange={(newPage) => setPage(newPage)}
          />
        )}
      </div>
    </div>
  )
}

