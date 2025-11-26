import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getActivityLogs, getActivityLogStatistics } from '../api/activityLogs'
import Pagination from '../components/Pagination'
import useDebounce from '../hooks/useDebounce'
import { HiOutlineMagnifyingGlass } from 'react-icons/hi2'

export default function ActivityLogs() {
  const [searchInput, setSearchInput] = useState('')
  const [actionFilter, setActionFilter] = useState('')
  const [modelFilter, setModelFilter] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [page, setPage] = useState(1)
  const [perPage, setPerPage] = useState(50)
  const debouncedSearch = useDebounce(searchInput, 400)

  const { data: logsResponse, isLoading } = useQuery({
    queryKey: ['activityLogs', { action: actionFilter, model_type: modelFilter, date_from: dateFrom, date_to: dateTo, page, per_page: perPage }],
    queryFn: () => getActivityLogs({ action: actionFilter, model_type: modelFilter, date_from: dateFrom, date_to: dateTo, page, per_page: perPage }),
  })

  const { data: statsResponse } = useQuery({
    queryKey: ['activityLogStatistics', { date_from: dateFrom, date_to: dateTo }],
    queryFn: () => getActivityLogStatistics({ date_from: dateFrom, date_to: dateTo }),
  })

  // Extract data from response
  // getActivityLogs returns response.data, which contains { data: [...], current_page: 1, ... }
  const logsData = logsResponse?.data || logsResponse
  
  // Extract logs array - ensure it's always an array
  const logs = Array.isArray(logsData?.data) 
    ? logsData.data 
    : Array.isArray(logsData) 
      ? logsData 
      : []
  
  // Statistics are returned directly as an object (response.data is the stats object)
  const stats = statsResponse?.data || statsResponse || {}

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Activity Logs</h1>
        <p className="text-sm text-gray-600 mt-1">View system activity and audit trails</p>
      </div>

      {/* Statistics */}
      {stats && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="text-sm text-gray-600">Total Activities</div>
            <div className="text-2xl font-bold text-gray-900 mt-1">{stats.total || 0}</div>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="text-sm text-gray-600">Today</div>
            <div className="text-2xl font-bold text-gray-900 mt-1">{stats.today || 0}</div>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="text-sm text-gray-600">This Week</div>
            <div className="text-2xl font-bold text-gray-900 mt-1">{stats.this_week || 0}</div>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="text-sm text-gray-600">This Month</div>
            <div className="text-2xl font-bold text-gray-900 mt-1">{stats.this_month || 0}</div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="p-4 border-b border-gray-200">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="lg:col-span-2 relative">
              <HiOutlineMagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500"
              />
            </div>
            <select
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500"
            >
              <option value="">All Actions</option>
              <option value="created">Created</option>
              <option value="updated">Updated</option>
              <option value="deleted">Deleted</option>
              <option value="viewed">Viewed</option>
            </select>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              placeholder="From Date"
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500"
            />
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              placeholder="To Date"
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500"
            />
          </div>
        </div>

        {isLoading ? (
          <div className="p-8 text-center text-gray-500">Loading...</div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">User</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Action</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Model</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {logs.length === 0 ? (
                    <tr>
                      <td colSpan="5" className="px-4 py-8 text-center text-gray-500">
                        No activity logs found
                      </td>
                    </tr>
                  ) : (
                    logs.map((log) => (
                      <tr key={log.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm text-gray-900">{log.user?.name || 'System'}</td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${
                            log.action === 'created' ? 'bg-green-100 text-green-700' :
                            log.action === 'updated' ? 'bg-blue-100 text-blue-700' :
                            log.action === 'deleted' ? 'bg-red-100 text-red-700' :
                            'bg-gray-100 text-gray-700'
                          }`}>
                            {log.action}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {log.model_type ? log.model_type.split('\\').pop() : '-'}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">{log.description || '-'}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {new Date(log.created_at).toLocaleString()}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            {logsData && (
              <div className="px-4 py-3 border-t border-gray-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-600">Show</span>
                  <select
                    value={perPage}
                    onChange={(e) => {
                      setPerPage(Number(e.target.value))
                      setPage(1)
                    }}
                    className="px-2 py-1 border border-gray-300 rounded text-sm"
                  >
                    <option value={25}>25</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                    <option value={200}>200</option>
                  </select>
                  <span className="text-sm text-gray-600">entries</span>
                </div>
                <Pagination
                  currentPage={logsData.current_page}
                  totalPages={logsData.last_page}
                  onPageChange={setPage}
                />
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

