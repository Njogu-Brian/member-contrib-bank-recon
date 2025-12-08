import { useEffect, useState, useRef, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  getMembers,
  createMember,
  updateMember,
  deleteMember,
  bulkUploadMembers,
  exportAllMemberStatements,
  checkDuplicate,
} from '../api/members'
import Pagination from '../components/Pagination'
import useDebounce from '../hooks/useDebounce'

export default function Members() {
  const [searchInput, setSearchInput] = useState('')
  const debouncedSearch = useDebounce(searchInput, 400)
  const [page, setPage] = useState(1)
  const [showModal, setShowModal] = useState(false)
  const [editingMember, setEditingMember] = useState(null)
  const [bulkExportingFormat, setBulkExportingFormat] = useState(null)
  const [isExportModalOpen, setIsExportModalOpen] = useState(false)
  const [pendingExportFormat, setPendingExportFormat] = useState('pdf')
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    whatsapp_number: '',
    email: '',
    id_number: '',
    church: '',
    next_of_kin_name: '',
    next_of_kin_phone: '',
    next_of_kin_relationship: '',
    member_number: '',
    notes: '',
    is_active: true,
  })
  const [fieldErrors, setFieldErrors] = useState({})
  const [checkingDuplicates, setCheckingDuplicates] = useState({})
  const queryClient = useQueryClient()

  useEffect(() => {
    setPage(1)
  }, [debouncedSearch])

  const { data, isLoading } = useQuery({
    queryKey: ['members', { search: debouncedSearch, page }],
    queryFn: () => getMembers({ search: debouncedSearch, page }),
  })

  const createMutation = useMutation({
    mutationFn: createMember,
    onSuccess: () => {
      queryClient.invalidateQueries(['members'])
      setShowModal(false)
      resetForm()
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => updateMember(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['members'])
      setShowModal(false)
      setEditingMember(null)
      resetForm()
    },
  })

  const deleteMutation = useMutation({
    mutationFn: deleteMember,
    onSuccess: () => {
      queryClient.invalidateQueries(['members'])
    },
  })

  const resetForm = () => {
    setFormData({
      name: '',
      phone: '',
      whatsapp_number: '',
      email: '',
      id_number: '',
      church: '',
      next_of_kin_name: '',
      next_of_kin_phone: '',
      next_of_kin_relationship: '',
      member_number: '',
      notes: '',
      is_active: true,
    })
  }

  const handleEdit = (member) => {
    setEditingMember(member)
    setFormData({
      name: member.name || '',
      phone: member.phone || '',
      whatsapp_number: member.whatsapp_number || '',
      email: member.email || '',
      id_number: member.id_number || '',
      church: member.church || '',
      next_of_kin_name: member.next_of_kin_name || '',
      next_of_kin_phone: member.next_of_kin_phone || '',
      next_of_kin_relationship: member.next_of_kin_relationship || '',
      member_number: member.member_number || '',
      notes: member.notes || '',
      is_active: member.is_active ?? true,
    })
    setShowModal(true)
    setFieldErrors({}) // Clear errors when opening modal
  }

  // Debounce timer ref
  const debounceTimerRef = useRef({})

  // Duplicate checking function
  const checkDuplicateValue = useCallback(async (field, value) => {
    if (!value || value.trim() === '') {
      setFieldErrors(prev => {
        const newErrors = { ...prev }
        delete newErrors[field]
        return newErrors
      })
      setCheckingDuplicates(prev => {
        const newChecking = { ...prev }
        delete newChecking[field]
        return newChecking
      })
      return
    }

    // Only check phone, whatsapp_number, and id_number
    if (!['phone', 'whatsapp_number', 'id_number'].includes(field)) {
      return
    }

    setCheckingDuplicates(prev => ({ ...prev, [field]: true }))

    try {
      const result = await checkDuplicate(field, value, editingMember?.id || null)
      if (result.is_duplicate) {
        setFieldErrors(prev => ({
          ...prev,
          [field]: result.message
        }))
      } else {
        setFieldErrors(prev => {
          const newErrors = { ...prev }
          delete newErrors[field]
          return newErrors
        })
      }
    } catch (error) {
      console.error('Error checking duplicate:', error)
    } finally {
      setCheckingDuplicates(prev => {
        const newChecking = { ...prev }
        delete newChecking[field]
        return newChecking
      })
    }
  }, [editingMember?.id])

  // Debounced duplicate checking
  const debouncedCheckDuplicate = useCallback((field, value) => {
    // Clear existing timer for this field
    if (debounceTimerRef.current[field]) {
      clearTimeout(debounceTimerRef.current[field])
    }

    // Set new timer
    debounceTimerRef.current[field] = setTimeout(() => {
      checkDuplicateValue(field, value)
      delete debounceTimerRef.current[field]
    }, 500)
  }, [checkDuplicateValue])

  // Handle field changes with duplicate checking
  const handleFieldChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    
    // Clear error for this field immediately
    setFieldErrors(prev => {
      const newErrors = { ...prev }
      delete newErrors[field]
      return newErrors
    })

    // Check for duplicates on phone, whatsapp_number, and id_number
    if (['phone', 'whatsapp_number', 'id_number'].includes(field)) {
      debouncedCheckDuplicate(field, value)
    }
  }

  // Helper function to format phone numbers to Kenya format
  const formatPhoneNumber = (phone) => {
    if (!phone || phone.trim() === '') return null
    // Remove any existing + or spaces
    let cleaned = phone.toString().replace(/[\s+]/g, '')
    
    // If it starts with 254, add +
    if (cleaned.startsWith('254')) {
      const number = cleaned.substring(3) // Get digits after 254
      // Ensure it starts with 7 or 1 and has exactly 9 digits total (254 + 9 = 12)
      if ((number.startsWith('7') || number.startsWith('1')) && number.length === 9) {
        return '+' + cleaned
      }
      // If it's 12 digits total (254 + 9), it might be valid
      if (cleaned.length === 12 && (cleaned[3] === '7' || cleaned[3] === '1')) {
        return '+' + cleaned
      }
    }
    // If it starts with 0, replace with +254
    if (cleaned.startsWith('0')) {
      const number = cleaned.substring(1)
      if ((number.startsWith('7') || number.startsWith('1')) && number.length === 9) {
        return '+254' + number
      }
    }
    // If it already has +, validate format
    if (cleaned.startsWith('+')) {
      cleaned = cleaned.substring(1) // Remove + for processing
    }
    // If it starts with 254, validate
    if (cleaned.startsWith('254')) {
      const number = cleaned.substring(3)
      if ((number.startsWith('7') || number.startsWith('1')) && number.length === 9) {
        return '+' + cleaned
      }
    }
    // If it's a 9-digit number starting with 7 or 1, add +254
    if ((cleaned.startsWith('7') || cleaned.startsWith('1')) && cleaned.length === 9) {
      return '+254' + cleaned
    }
    // Return null if format is invalid
    return null
  }

  // Check if form is valid and can be submitted
  const isFormValid = () => {
    // Check for duplicate errors
    if (Object.keys(fieldErrors).length > 0) {
      return false
    }

    // Check if required fields are filled
    if (!formData.name || !formData.name.trim()) {
      return false
    }

    // Check phone format if provided
    if (formData.phone && !/^\+254[17]\d{8}$/.test(formData.phone)) {
      return false
    }

    // Check email format if provided
    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      return false
    }

    // Check ID number format if provided
    if (formData.id_number && (!/^\d+$/.test(formData.id_number) || formData.id_number.length < 5)) {
      return false
    }

    return true
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    
    // Check if there are any duplicate errors
    if (Object.keys(fieldErrors).length > 0) {
      alert('Please fix the duplicate field errors before submitting.')
      return
    }
    
    // Format phone numbers before submission
    const formattedData = {
      ...formData,
      phone: formatPhoneNumber(formData.phone),
      whatsapp_number: formData.whatsapp_number ? formatPhoneNumber(formData.whatsapp_number) : null,
      next_of_kin_phone: formatPhoneNumber(formData.next_of_kin_phone),
    }
    
    // Remove member_code if it exists
    delete formattedData.member_code
    
    // Validate phone number format before submission
    if (formattedData.phone && !/^\+254[17]\d{8}$/.test(formattedData.phone)) {
      alert('Phone number must be in format +254712345678 (Kenya format)')
      return
    }
    
    if (formattedData.whatsapp_number && !/^\+254[17]\d{8}$/.test(formattedData.whatsapp_number)) {
      alert('WhatsApp number must be in format +254712345678 (Kenya format)')
      return
    }
    
    if (formattedData.next_of_kin_phone && !/^\+254[17]\d{8}$/.test(formattedData.next_of_kin_phone)) {
      alert('Next of kin phone must be in format +254712345678 (Kenya format)')
      return
    }
    
    // Log for debugging
    console.log('Formatted data before submission:', formattedData)
    
    if (editingMember) {
      updateMutation.mutate({ id: editingMember.id, data: formattedData })
    } else {
      createMutation.mutate(formattedData)
    }
  }

  const handleBulkUpload = async (e) => {
    const file = e.target.files[0]
    if (file) {
      try {
        await bulkUploadMembers(file)
        queryClient.invalidateQueries(['members'])
        alert('Bulk upload completed!')
      } catch (error) {
        alert('Upload failed: ' + error.message)
      }
    }
  }

  const openExportModal = (format) => {
    setPendingExportFormat(format)
    setIsExportModalOpen(true)
  }

  const handleBulkExport = async (format, memberIds = []) => {
    try {
      setBulkExportingFormat(format)
      const params = { format }
      if (memberIds.length) {
        params.member_ids = memberIds.join(',')
      }
      const response = await exportAllMemberStatements(params)
      const blob = new Blob([response.data], {
        type:
          response.headers['content-type'] ||
          (format === 'excel'
            ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
            : 'application/pdf'),
      })
      let filename = `member-statements.${format === 'excel' ? 'xlsx' : 'pdf'}`
      const disposition = response.headers['content-disposition']
      if (disposition) {
        const match = /filename="?([^"]+)"?/i.exec(disposition)
        if (match?.[1]) {
          filename = match[1]
        }
      }
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = filename
      link.click()
      window.URL.revokeObjectURL(url)
      return true
    } catch (error) {
      alert(error.response?.data?.message || 'Bulk export failed')
      return false
    } finally {
      setBulkExportingFormat(null)
    }
  }

  if (isLoading) {
    return <div className="text-center py-12">Loading...</div>
  }

  return (
    <div className="space-y-6">
      {/* Modern Header */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl shadow-xl p-8 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">Members</h1>
            <p className="text-blue-100 text-lg">
              Manage your organization's members and track their contributions
            </p>
          </div>
          <div className="hidden lg:block text-right">
            <div className="text-sm text-blue-200">Total Active</div>
            <div className="text-4xl font-bold">{data?.total || 0}</div>
          </div>
        </div>
      </div>

      {/* Actions Bar */}
      <div className="bg-white rounded-xl shadow-sm p-4">
        <div className="flex flex-wrap gap-3 justify-between items-center">
          <div className="flex space-x-2">
            <button
              onClick={() => openExportModal('pdf')}
              disabled={!!bulkExportingFormat}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-lg text-sm font-medium text-white bg-red-600 hover:bg-red-700 disabled:opacity-60 transition-colors"
            >
              {bulkExportingFormat === 'pdf' ? 'Exporting PDF…' : 'Export All (PDF)'}
            </button>
            <button
              onClick={() => openExportModal('excel')}
              disabled={!!bulkExportingFormat}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-lg text-sm font-medium text-white bg-green-600 hover:bg-green-700 disabled:opacity-60 transition-colors"
            >
              {bulkExportingFormat === 'excel' ? 'Exporting Excel…' : 'Export All (Excel)'}
            </button>
          </div>
          <label className="inline-flex items-center px-4 py-2 border border-transparent rounded-lg text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 cursor-pointer transition-colors">
            <input type="file" accept=".csv" className="hidden" onChange={handleBulkUpload} />
            📤 Bulk Upload
          </label>
          <button
            onClick={() => {
              setEditingMember(null)
              resetForm()
              setShowModal(true)
            }}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-lg shadow-lg text-sm font-medium text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 transition-all"
          >
            + Add Member
          </button>
        </div>
      </div>

      {/* Search */}
      <input
        type="text"
        placeholder="🔍 Search members by name, phone, or email..."
        value={searchInput}
        onChange={(e) => setSearchInput(e.target.value)}
        className="w-full px-6 py-4 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all text-lg bg-white shadow-sm"
      />

      <div className="bg-white rounded-xl shadow-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Phone</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Member Code</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {data?.data?.map((member) => (
                <tr key={member.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{member.name}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{member.phone || '-'}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{member.email || '-'}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      member.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                    }`}>
                      {member.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <Link
                      to={`/members/${member.id}`}
                      className="text-indigo-600 hover:text-indigo-900 mr-4"
                    >
                      View Profile
                    </Link>
                    <button onClick={() => handleEdit(member)} className="text-indigo-600 hover:text-indigo-900 mr-4">
                      Edit
                    </button>
                    <button
                      onClick={() => {
                        if (confirm('Are you sure you want to delete this member?')) {
                          deleteMutation.mutate(member.id)
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
        </div>
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

      {showModal && (
        <div className="fixed z-10 inset-0 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={() => setShowModal(false)} />
            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-2xl sm:w-full">
              <form onSubmit={handleSubmit} className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                  {editingMember ? 'Edit Member' : 'Add Member'}
                </h3>
                <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Name *</label>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Phone Number *</label>
                    <input
                      type="text"
                      value={formData.phone}
                      onChange={(e) => handleFieldChange('phone', e.target.value)}
                      className={`mt-1 block w-full rounded-md shadow-sm focus:ring-indigo-500 sm:text-sm ${
                        fieldErrors.phone 
                          ? 'border-red-500 focus:border-red-500 focus:ring-red-500' 
                          : 'border-gray-300 focus:border-indigo-500'
                      }`}
                      placeholder="+254712345678"
                    />
                    {checkingDuplicates.phone && (
                      <p className="mt-1 text-xs text-blue-500">Checking availability...</p>
                    )}
                    {fieldErrors.phone && !checkingDuplicates.phone && (
                      <p className="mt-1 text-xs text-red-600">{fieldErrors.phone}</p>
                    )}
                    {!fieldErrors.phone && !checkingDuplicates.phone && (
                      <p className="mt-1 text-xs text-gray-500">Format: +254712345678 (with country code)</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">WhatsApp Number</label>
                    <input
                      type="text"
                      value={formData.whatsapp_number || ''}
                      onChange={(e) => handleFieldChange('whatsapp_number', e.target.value)}
                      className={`mt-1 block w-full rounded-md shadow-sm focus:ring-indigo-500 sm:text-sm ${
                        fieldErrors.whatsapp_number 
                          ? 'border-red-500 focus:border-red-500 focus:ring-red-500' 
                          : 'border-gray-300 focus:border-indigo-500'
                      }`}
                      placeholder="+254723456789 (optional)"
                    />
                    {checkingDuplicates.whatsapp_number && (
                      <p className="mt-1 text-xs text-blue-500">Checking availability...</p>
                    )}
                    {fieldErrors.whatsapp_number && !checkingDuplicates.whatsapp_number && (
                      <p className="mt-1 text-xs text-red-600">{fieldErrors.whatsapp_number}</p>
                    )}
                    {!fieldErrors.whatsapp_number && !checkingDuplicates.whatsapp_number && (
                      <p className="mt-1 text-xs text-gray-500">Optional, with country code</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Email *</label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                      placeholder="email@example.com"
                    />
                    <p className="mt-1 text-xs text-gray-500">Valid email format required</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">ID Number *</label>
                    <input
                      type="text"
                      value={formData.id_number || ''}
                      onChange={(e) => handleFieldChange('id_number', e.target.value)}
                      className={`mt-1 block w-full rounded-md shadow-sm focus:ring-indigo-500 sm:text-sm ${
                        fieldErrors.id_number 
                          ? 'border-red-500 focus:border-red-500 focus:ring-red-500' 
                          : 'border-gray-300 focus:border-indigo-500'
                      }`}
                      placeholder="12345678"
                    />
                    {checkingDuplicates.id_number && (
                      <p className="mt-1 text-xs text-blue-500">Checking availability...</p>
                    )}
                    {fieldErrors.id_number && !checkingDuplicates.id_number && (
                      <p className="mt-1 text-xs text-red-600">{fieldErrors.id_number}</p>
                    )}
                    {!fieldErrors.id_number && !checkingDuplicates.id_number && (
                      <p className="mt-1 text-xs text-gray-500">Digits only, minimum 5 characters</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Church *</label>
                    <input
                      type="text"
                      value={formData.church || ''}
                      onChange={(e) => setFormData({ ...formData, church: e.target.value })}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                      placeholder="Church name"
                    />
                    <p className="mt-1 text-xs text-gray-500">Required for profile completion</p>
                  </div>
                  
                  {/* Next of Kin Section */}
                  <div className="border-t border-gray-200 pt-4 mt-4">
                    <h4 className="text-sm font-semibold text-gray-700 mb-3">Next of Kin Information</h4>
                    <p className="text-xs text-gray-500 mb-3">Required: All next of kin fields must be filled for profile completion</p>
                    
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Next of Kin Name <span className="text-red-500">*</span></label>
                        <input
                          type="text"
                          required
                          value={formData.next_of_kin_name || ''}
                          onChange={(e) => setFormData({ ...formData, next_of_kin_name: e.target.value })}
                          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                          placeholder="Enter next of kin full name"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Next of Kin Contact <span className="text-red-500">*</span></label>
                        <input
                          type="text"
                          required
                          value={formData.next_of_kin_phone || ''}
                          onChange={(e) => setFormData({ ...formData, next_of_kin_phone: e.target.value })}
                          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                          placeholder="+254712345678"
                        />
                        <p className="mt-1 text-xs text-gray-500">Format: +254712345678 (with country code)</p>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Relationship <span className="text-red-500">*</span></label>
                        <select
                          required
                          value={formData.next_of_kin_relationship || ''}
                          onChange={(e) => setFormData({ ...formData, next_of_kin_relationship: e.target.value })}
                          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                        >
                          <option value="">Select relationship</option>
                          <option value="wife">Wife</option>
                          <option value="husband">Husband</option>
                          <option value="brother">Brother</option>
                          <option value="sister">Sister</option>
                          <option value="father">Father</option>
                          <option value="mother">Mother</option>
                          <option value="son">Son</option>
                          <option value="daughter">Daughter</option>
                          <option value="cousin">Cousin</option>
                          <option value="friend">Friend</option>
                          <option value="other">Other</option>
                        </select>
                      </div>
                    </div>
                  </div>
                  
                  {/* Divider */}
                  <div className="border-t border-gray-200 pt-4 mt-4">
                    <h4 className="text-sm font-semibold text-gray-700 mb-3">System Information</h4>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Member Number</label>
                    <input
                      type="text"
                      value={formData.member_number}
                      onChange={(e) => setFormData({ ...formData, member_number: e.target.value })}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Admin Notes</label>
                    <textarea
                      value={formData.notes || ''}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      rows={3}
                      placeholder="Internal notes visible only to administrators"
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                    />
                  </div>
                  <div>
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={formData.is_active}
                        onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                        className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                      />
                      <span className="ml-2 text-sm text-gray-700">Active</span>
                    </label>
                  </div>
                </div>
                <div className="mt-5 sm:mt-6 sm:grid sm:grid-cols-2 sm:gap-3 sm:grid-flow-row-dense">
                  <button
                    type="submit"
                    disabled={createMutation.isPending || updateMutation.isPending || !isFormValid()}
                    className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-indigo-600 text-base font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:col-start-2 sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {createMutation.isPending || updateMutation.isPending ? 'Saving...' : 'Save'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowModal(false)
                      setEditingMember(null)
                      resetForm()
                    }}
                    className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:col-start-1 sm:text-sm"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
      {isExportModalOpen && (
        <BulkExportModal
          format={pendingExportFormat}
          isSubmitting={bulkExportingFormat === pendingExportFormat}
          onClose={() => {
            if (!bulkExportingFormat) {
              setIsExportModalOpen(false)
            }
          }}
          onSubmit={async (memberIds) => {
            const ok = await handleBulkExport(pendingExportFormat, memberIds)
            if (ok) {
              setIsExportModalOpen(false)
            }
          }}
        />
      )}
    </div>
  )
}

function BulkExportModal({ format, onClose, onSubmit, isSubmitting }) {
  const [mode, setMode] = useState('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedMembers, setSelectedMembers] = useState([])
  const debouncedSearch = useDebounce(searchTerm, 300)

  const { data: searchResults, isLoading: isSearching } = useQuery({
    queryKey: ['bulk-export-member-search', debouncedSearch],
    queryFn: () => getMembers({ search: debouncedSearch, per_page: 10 }),
    enabled: mode === 'custom',
  })

  const resultItems = searchResults?.data ?? []
  const formatLabel = format === 'excel' ? 'Excel (.xlsx)' : 'PDF (.pdf)'
  const disableClose = isSubmitting

  const addMember = (member) => {
    if (selectedMembers.find((item) => item.id === member.id)) {
      return
    }
    setSelectedMembers((prev) => [...prev, member])
  }

  const removeMember = (memberId) => {
    setSelectedMembers((prev) => prev.filter((member) => member.id !== memberId))
  }

  const handleConfirm = async () => {
    if (mode === 'custom' && selectedMembers.length === 0) {
      alert('Select at least one member or switch back to "All members".')
      return
    }
    await onSubmit(mode === 'all' ? [] : selectedMembers.map((member) => member.id))
  }

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-gray-900 bg-opacity-60 p-4">
      <div className="bg-white rounded-lg shadow-2xl w-full max-w-3xl">
        <div className="flex justify-between items-center px-6 py-4 border-b">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Bulk Export — {formatLabel}</h3>
            <p className="text-sm text-gray-500">Choose who should be included in this export.</p>
          </div>
          <button
            onClick={() => {
              if (!disableClose) onClose()
            }}
            className="text-gray-400 hover:text-gray-600"
            disabled={disableClose}
          >
            ✕
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input
                type="radio"
                value="all"
                checked={mode === 'all'}
                onChange={() => setMode('all')}
                className="text-indigo-600 focus:ring-indigo-500"
              />
              Export every member
            </label>
            <label className="flex items-start gap-2 text-sm text-gray-700">
              <input
                type="radio"
                value="custom"
                checked={mode === 'custom'}
                onChange={() => setMode('custom')}
                className="mt-1 text-indigo-600 focus:ring-indigo-500"
              />
              <span>Select specific members</span>
            </label>
          </div>

          {mode === 'custom' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Search members</label>
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Start typing a name, phone or member code..."
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                />
              </div>

              <div className="border rounded-lg max-h-52 overflow-y-auto">
                {isSearching ? (
                  <p className="p-4 text-sm text-gray-500">Searching...</p>
                ) : resultItems.length === 0 ? (
                  <p className="p-4 text-sm text-gray-500">No members found.</p>
                ) : (
                  <ul className="divide-y divide-gray-100">
                    {resultItems.map((member) => {
                      const alreadyAdded = selectedMembers.some((item) => item.id === member.id)
                      return (
                        <li key={member.id} className="flex items-center justify-between px-4 py-3 text-sm">
                          <div>
                            <p className="font-medium text-gray-900">{member.name}</p>
                            <p className="text-xs text-gray-500">
                              {member.phone || '-'}
                            </p>
                          </div>
                          <button
                            onClick={() => addMember(member)}
                            disabled={alreadyAdded}
                            className="px-3 py-1 text-xs font-semibold rounded-md border border-indigo-200 text-indigo-700 disabled:opacity-40"
                          >
                            {alreadyAdded ? 'Added' : 'Add'}
                          </button>
                        </li>
                      )
                    })}
                  </ul>
                )}
              </div>

              <div>
                <p className="text-sm font-medium text-gray-700 mb-2">Selected members</p>
                {selectedMembers.length === 0 ? (
                  <p className="text-xs text-gray-500">No members selected yet.</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {selectedMembers.map((member) => (
                      <span
                        key={member.id}
                        className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 text-xs font-medium"
                      >
                        {member.name}
                        <button
                          type="button"
                          onClick={() => removeMember(member.id)}
                          className="text-indigo-500 hover:text-indigo-800"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="px-6 py-4 bg-gray-50 flex justify-end gap-3 rounded-b-lg">
          <button
            onClick={() => {
              if (!disableClose) onClose()
            }}
            className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800"
            disabled={disableClose}
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={isSubmitting}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60"
          >
            {isSubmitting ? 'Preparing export…' : `Export ${format === 'excel' ? 'Excel' : 'PDF'}`}
          </button>
        </div>
      </div>
    </div>
  )
}

