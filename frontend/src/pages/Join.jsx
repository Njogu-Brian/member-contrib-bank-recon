import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import api from '../api/axios'

const formatPhone = (value) => {
  if (!value || typeof value !== 'string') return ''
  const cleaned = value.replace(/[\s\-()]/g, '').replace(/^0/, '')
  if (cleaned.startsWith('254') && cleaned.length === 12) return '+' + cleaned
  if (cleaned.startsWith('254')) return '+' + cleaned
  if (cleaned.length === 9 && /^[17]/.test(cleaned)) return '+254' + cleaned
  return value
}

export default function Join() {
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')
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
  })

  const { data: publicSettings } = useQuery({
    queryKey: ['public-settings'],
    queryFn: async () => {
      const response = await api.get('/public/settings')
      return response.data
    },
    staleTime: 5 * 60 * 1000,
    retry: 1,
  })

  const appName = publicSettings?.app_name || 'Member Contributions System'

  const handleChange = (field, value) => {
    if (field === 'phone' || field === 'next_of_kin_phone' || field === 'whatsapp_number') {
      value = formatPhone(value)
    }
    setFormData((prev) => ({ ...prev, [field]: value }))
    setError('')
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    try {
      const baseUrl = import.meta.env.VITE_API_BASE_URL || '/api/v1'
      let url = `${baseUrl}/public/register`
      if (url.startsWith('/')) url = window.location.origin + url

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify(formData),
      })

      const data = await response.json().catch(() => ({}))
      if (!response.ok) {
        const msg = data.message || data.errors
          ? Object.values(data.errors || {}).flat().join(' ')
          : 'Registration failed'
        throw new Error(msg)
      }
      setSubmitted(true)
    } catch (err) {
      setError(err.message || 'Registration failed. Please try again.')
    }
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white shadow-xl rounded-2xl p-8 text-center">
          <div className="text-6xl mb-4">✓</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-3">Application Submitted</h1>
          <p className="text-gray-600">
            Your membership application has been received. An administrator will review it and notify you once approved.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50 flex items-center justify-center p-4">
      <div className="max-w-lg w-full bg-white shadow-xl rounded-2xl p-8">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Join {appName}</h1>
          <p className="mt-2 text-gray-600">Apply for membership. Your application will be reviewed by an administrator.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="p-3 bg-red-50 text-red-700 rounded-lg text-sm">{error}</div>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Full Name *</label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => handleChange('name', e.target.value)}
              className="w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number *</label>
            <input
              type="tel"
              required
              value={formData.phone}
              onChange={(e) => handleChange('phone', e.target.value)}
              placeholder="+254712345678"
              className="w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
            />
            <p className="mt-1 text-xs text-gray-500">Kenya format: +254 followed by 9 digits</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">WhatsApp Number</label>
            <input
              type="tel"
              value={formData.whatsapp_number}
              onChange={(e) => handleChange('whatsapp_number', e.target.value)}
              placeholder="+254723456789 (optional)"
              className="w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
            <input
              type="email"
              required
              value={formData.email}
              onChange={(e) => handleChange('email', e.target.value)}
              className="w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">ID Number *</label>
            <input
              type="text"
              required
              value={formData.id_number}
              onChange={(e) => handleChange('id_number', e.target.value)}
              className="w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Church *</label>
            <input
              type="text"
              required
              value={formData.church}
              onChange={(e) => handleChange('church', e.target.value)}
              className="w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
            />
          </div>
          <div className="border-t pt-4 mt-4">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Next of Kin *</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                <input
                  type="text"
                  required
                  value={formData.next_of_kin_name}
                  onChange={(e) => handleChange('next_of_kin_name', e.target.value)}
                  className="w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone *</label>
                <input
                  type="tel"
                  required
                  value={formData.next_of_kin_phone}
                  onChange={(e) => handleChange('next_of_kin_phone', e.target.value)}
                  placeholder="+254712345678"
                  className="w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Relationship *</label>
                <input
                  type="text"
                  required
                  value={formData.next_of_kin_relationship}
                  onChange={(e) => handleChange('next_of_kin_relationship', e.target.value)}
                  placeholder="e.g. Spouse, Parent, Sibling"
                  className="w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                />
              </div>
            </div>
          </div>
          <div className="pt-4 flex gap-3">
            <button
              type="submit"
              className="flex-1 py-3 px-4 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
            >
              Submit Application
            </button>
            <Link
              to="/login"
              className="py-3 px-4 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50"
            >
              Cancel
            </Link>
          </div>
        </form>
      </div>
    </div>
  )
}
