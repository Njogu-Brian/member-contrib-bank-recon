import { useState } from 'react'
import { HiOutlineArrowDownTray, HiOutlineDocumentArrowDown } from 'react-icons/hi2'
import { exportReport } from '../api/reports'

export default function ReportExportButton({ reportType, filters = {}, className = '' }) {
  const [exporting, setExporting] = useState(false)
  const [exportFormat, setExportFormat] = useState(null)

  const handleExport = async (format) => {
    setExporting(true)
    setExportFormat(format)
    try {
      await exportReport(reportType, format, filters)
    } catch (error) {
      alert('Failed to export report: ' + (error.response?.data?.message || error.message))
    } finally {
      setExporting(false)
      setExportFormat(null)
    }
  }

  return (
    <div className={`relative ${className}`}>
      <div className="inline-flex rounded-md shadow-sm">
        <button
          onClick={() => handleExport('pdf')}
          disabled={exporting}
          className="inline-flex items-center px-3 py-2 border border-gray-300 text-sm leading-4 font-medium rounded-l-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
        >
          {exporting && exportFormat === 'pdf' ? (
            'Exporting...'
          ) : (
            <>
              <HiOutlineDocumentArrowDown className="w-4 h-4 mr-2" />
              PDF
            </>
          )}
        </button>
        <button
          onClick={() => handleExport('excel')}
          disabled={exporting}
          className="inline-flex items-center px-3 py-2 border border-gray-300 border-l-0 text-sm leading-4 font-medium rounded-r-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
        >
          {exporting && exportFormat === 'excel' ? (
            'Exporting...'
          ) : (
            <>
              <HiOutlineArrowDownTray className="w-4 h-4 mr-2" />
              Excel
            </>
          )}
        </button>
      </div>
    </div>
  )
}

