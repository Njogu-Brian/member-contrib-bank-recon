import { useMemo, useRef, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  getAttendanceUploads,
  uploadAttendance,
  deleteAttendanceUpload,
  downloadAttendanceUpload,
} from '../api/attendance'
import Pagination from '../components/Pagination'

const formatBytes = (bytes) => {
  if (!bytes && bytes !== 0) return '—'
  if (bytes === 0) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB']
  const index = Math.floor(Math.log(bytes) / Math.log(1024))
  const value = bytes / Math.pow(1024, index)
  return `${value.toFixed(1)} ${units[index]}`
}

export default function AttendanceUploads() {
  const queryClient = useQueryClient()
  const [page, setPage] = useState(1)
  const [meetingDate, setMeetingDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [notes, setNotes] = useState('')
  const [selectedFile, setSelectedFile] = useState(null)
  const fileInputRef = useRef(null)

  const { data, isLoading, error } = useQuery({
    queryKey: ['attendance-uploads', page],
    queryFn: () => getAttendanceUploads({ page }),
  })

  const uploadMutation = useMutation({
    mutationFn: uploadAttendance,
    onSuccess: () => {
      queryClient.invalidateQueries(['attendance-uploads'])
      setSelectedFile(null)
      setNotes('')
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
      alert('Upload saved. You can now transcribe the sheet when ready.')
    },
    onError: (err) => {
      alert(err.response?.data?.message || err.message || 'Upload failed')
    },
  })

  const deleteMutation = useMutation({
    mutationFn: deleteAttendanceUpload,
    onSuccess: () => {
      queryClient.invalidateQueries(['attendance-uploads'])
    },
    onError: (err) => {
      alert(err.response?.data?.message || err.message || 'Delete failed')
    },
  })

  const uploads = data?.data ?? []
  const pagination = useMemo(() => {
    if (!data) return null
    return {
      current_page: data.current_page ?? 1,
      last_page: data.last_page ?? 1,
      per_page: data.per_page ?? 20,
      total: data.total ?? 0,
    }
  }, [data])

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!selectedFile) {
      alert('Please choose a file to upload.')
      return
    }
    uploadMutation.mutate({
      file: selectedFile,
      meeting_date: meetingDate,
      notes: notes.trim() || undefined,
    })
  }

  const handleDownload = async (upload) => {
    try {
      const response = await downloadAttendanceUpload(upload.id)
      const blob = new Blob([response.data], { type: response.headers['content-type'] })
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')

      const disposition = response.headers['content-disposition']
      let filename = upload.original_filename
      if (disposition) {
        const match = disposition.match(/filename="?(.+?)"?$/)
        if (match && match[1]) {
          filename = match[1]
        }
      }

      link.href = url
      link.setAttribute('download', filename)
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
    } catch (err) {
      alert(err.response?.data?.message || err.message || 'Download failed')
    }
  }

  if (isLoading) {
    return <div className="text-center py-12">Loading...</div>
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600 mb-4">Error loading uploads: {error.message}</p>
        <button
          onClick={() => queryClient.invalidateQueries(['attendance-uploads'])}
          className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"
        >
          Retry
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <h1 className="text-3xl font-bold text-gray-900">Meeting Attendance Uploads</h1>
        <div className="bg-white shadow rounded-lg p-4 w-full md:w-auto">
          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="meetingDate">
                Meeting date
              </label>
              <input
                id="meetingDate"
                type="date"
                value={meetingDate}
                onChange={(e) => setMeetingDate(e.target.value)}
                className="w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="notes">
                Notes (optional)
              </label>
              <textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                placeholder="e.g. AGM 2025 physical register"
                className="w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="file">
                Attendance sheet (PDF / image)
              </label>
              <input
                id="file"
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={(e) => setSelectedFile(e.target.files?.[0] ?? null)}
                ref={fileInputRef}
                className="w-full"
              />
            </div>
            <button
              type="submit"
              disabled={uploadMutation.isPending}
              className="w-full inline-flex justify-center items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50"
            >
              {uploadMutation.isPending ? 'Uploading...' : 'Upload'}
            </button>
          </form>
        </div>
      </div>

      <div className="bg-white shadow rounded-lg p-4">
        <h2 className="text-lg font-semibold text-gray-900 mb-2">How this works</h2>
        <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
          <li>Upload clear scans or photos of the signed attendance sheets.</li>
          <li>Use the meeting date field to keep records organised.</li>
          <li>Once uploaded, we can run OCR and attach the attendees to their member profiles.</li>
        </ul>
      </div>

      <div className="bg-white shadow rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                File
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Meeting Date
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Uploaded By
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Size
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Notes
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Uploaded At
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {uploads.length === 0 && (
              <tr>
                <td colSpan={7} className="px-6 py-8 text-center text-sm text-gray-500">
                  No attendance uploads yet. Use the form above to add one.
                </td>
              </tr>
            )}
            {uploads.map((upload) => (
              <tr key={upload.id}>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  {upload.original_filename}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {upload.meeting_date ? new Date(upload.meeting_date).toLocaleDateString() : '—'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {upload.uploader?.name || '—'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {formatBytes(upload.file_size)}
                </td>
                <td className="px-6 py-4 text-sm text-gray-500 max-w-xs">
                  {upload.notes || '—'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {upload.created_at ? new Date(upload.created_at).toLocaleString() : '—'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-3">
                  <button
                    onClick={() => handleDownload(upload)}
                    className="text-indigo-600 hover:text-indigo-900"
                  >
                    Download
                  </button>
                  <button
                    onClick={() => {
                      if (confirm('Delete this upload? This cannot be undone.')) {
                        deleteMutation.mutate(upload.id)
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
        <Pagination pagination={pagination} onPageChange={setPage} />
      </div>
    </div>
  )
}


