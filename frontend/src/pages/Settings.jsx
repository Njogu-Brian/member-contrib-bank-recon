import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getSettings, updateSettings } from '../api/settings'
import { getMfaSetup, enableMfa, disableMfa } from '../api/mfa'
import { useAuthContext } from '../context/AuthContext'
import {
  getContributionStatuses,
  createContributionStatus,
  updateContributionStatus,
  deleteContributionStatus,
  reorderContributionStatuses,
} from '../api/contributionStatuses'

export default function Settings() {
  const [activeTab, setActiveTab] = useState('branding')
  const [formData, setFormData] = useState({
    contribution_start_date: '',
    weekly_contribution_amount: 1000,
    contact_phone: '',
    logo: null,
    favicon: null,
  })
  const [logoPreview, setLogoPreview] = useState(null)
  const [faviconPreview, setFaviconPreview] = useState(null)
  const [mfaCode, setMfaCode] = useState('')
  const [showMfaSetup, setShowMfaSetup] = useState(false)
  const queryClient = useQueryClient()
  const { user } = useAuthContext()

  const { data: settings, isLoading } = useQuery({
    queryKey: ['settings'],
    queryFn: getSettings,
  })

  // Helper to normalize storage URLs for dev server
  const normalizeUrl = (url) => {
    if (!url) return null
    // Convert absolute localhost URLs to relative for Vite proxy
    if (url.startsWith('http://localhost/storage/') || url.startsWith('http://localhost:8000/storage/')) {
      return url.replace(/^https?:\/\/[^/]+/, '')
    }
    return url
  }

  // Update form when settings load
  useEffect(() => {
    if (settings) {
      setFormData({
        contribution_start_date: settings.contribution_start_date || '',
        weekly_contribution_amount: parseFloat(settings.weekly_contribution_amount) || 1000,
        contact_phone: settings.contact_phone || '',
        logo: null,
        favicon: null,
        invoice_reminder_enabled: settings.invoice_reminder_enabled || 'true',
        invoice_reminder_frequency: settings.invoice_reminder_frequency || 'daily',
        invoice_reminder_time: settings.invoice_reminder_time || '09:00',
        invoice_reminder_days_before_due: settings.invoice_reminder_days_before_due || '2',
        invoice_reminder_overdue_message: settings.invoice_reminder_overdue_message || '',
        invoice_reminder_due_soon_message: settings.invoice_reminder_due_soon_message || '',
      })
      // Update previews with URLs (try both lowercase and capitalized versions, normalize for dev server)
      setLogoPreview(normalizeUrl(settings.logo_url || settings.Logo_url))
      setFaviconPreview(normalizeUrl(settings.favicon_url || settings.Favicon_url))
    }
  }, [settings])

  // Favicon is handled by SettingsContext

  const [adminSettings, setAdminSettings] = useState({})

  const updateMutation = useMutation({
    mutationFn: updateSettings,
    onSuccess: (response) => {
      console.log('Settings saved successfully:', response.data)
      
      // Update previews with new URLs from response immediately (normalize for dev server)
      const logoUrl = response?.data?.logo_url || response?.data?.Logo_url
      if (logoUrl) {
        const normalizedLogoUrl = normalizeUrl(logoUrl)
        console.log('Setting logo preview:', normalizedLogoUrl)
        setLogoPreview(normalizedLogoUrl)
      }
      
      const faviconUrl = response?.data?.favicon_url || response?.data?.Favicon_url
      if (faviconUrl) {
        const normalizedFaviconUrl = normalizeUrl(faviconUrl)
        console.log('Setting favicon preview:', normalizedFaviconUrl)
        setFaviconPreview(normalizedFaviconUrl)
      }
      
      // Update admin settings if colors were saved
      if (response?.data?.theme_primary_color || response?.data?.theme_secondary_color || 
          response?.data?.login_background_color || response?.data?.login_text_color) {
        setAdminSettings(prev => ({
          ...prev,
          theme_primary_color: response.data.theme_primary_color || prev.theme_primary_color || settings?.theme_primary_color,
          theme_secondary_color: response.data.theme_secondary_color || prev.theme_secondary_color || settings?.theme_secondary_color,
          login_background_color: response.data.login_background_color || prev.login_background_color || settings?.login_background_color,
          login_text_color: response.data.login_text_color || prev.login_text_color || settings?.login_text_color,
        }))
        
        // Immediately update CSS variables
        const root = document.documentElement
        if (response.data.theme_primary_color) {
          root.style.setProperty('--color-brand-600', response.data.theme_primary_color)
          root.style.setProperty('--color-brand-700', response.data.theme_primary_color)
        }
        if (response.data.theme_secondary_color) {
          root.style.setProperty('--color-brand-500', response.data.theme_secondary_color)
        }
        if (response.data.login_background_color) {
          root.style.setProperty('--login-bg-color', response.data.login_background_color)
        }
        if (response.data.login_text_color) {
          root.style.setProperty('--login-text-color', response.data.login_text_color)
        }
        
        // Update favicon immediately (also normalize URL)
        const faviconUrl = response?.data?.favicon_url || response?.data?.Favicon_url
        if (faviconUrl) {
          let normalizedFaviconUrl = faviconUrl
          if (faviconUrl.startsWith('http://localhost/storage/') || faviconUrl.startsWith('http://localhost:8000/storage/')) {
            normalizedFaviconUrl = faviconUrl.replace(/^https?:\/\/[^/]+/, '')
          }
          
          const existingLinks = document.querySelectorAll("link[rel*='icon']")
          existingLinks.forEach(link => link.remove())
          const link = document.createElement('link')
          link.rel = 'icon'
          link.type = 'image/x-icon'
          link.href = normalizedFaviconUrl
          document.head.appendChild(link)
        }
      }
      
      // Invalidate and refetch settings to update UI immediately
      queryClient.invalidateQueries({ queryKey: ['settings'] })
      queryClient.refetchQueries({ queryKey: ['settings'] })
      
      // Reset file inputs after successful save
      setFormData(prev => ({
        ...prev,
        logo: null,
        favicon: null,
      }))
      
      alert('Settings saved successfully!')
    },
    onError: (error) => {
      console.error('Settings save error:', error)
      console.error('Error response:', error?.response)
      const errorMessage = error?.response?.data?.message || 
                          error?.response?.data?.error || 
                          (error?.response?.data?.errors ? JSON.stringify(error.response.data.errors) : null) ||
                          'Failed to save settings. Please try again.'
      alert(errorMessage)
    },
  })

  // Update admin settings when settings load
  useEffect(() => {
    if (settings && settings.categories) {
      const adminData = {}
      Object.keys(settings.categories).forEach(category => {
        settings.categories[category].forEach(key => {
          if (settings[key] !== undefined) {
            adminData[key] = settings[key]
          }
        })
      })
      setAdminSettings(adminData)
    }
  }, [settings])

  const handleSubmit = (e) => {
    e.preventDefault()
    if (activeTab === 'admin') {
      // Submit admin settings
      updateMutation.mutate({ settings: adminSettings })
    } else {
      // Submit branding/contribution settings
      updateMutation.mutate(formData)
    }
  }

  const handleAdminSettingChange = (key, value) => {
    setAdminSettings(prev => ({ ...prev, [key]: value }))
  }

  const handleLogoChange = (e) => {
    const file = e.target.files?.[0]
    if (file) {
      setFormData({ ...formData, logo: file })
      const reader = new FileReader()
      reader.onloadend = () => {
        setLogoPreview(reader.result)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleFaviconChange = (e) => {
    const file = e.target.files?.[0]
    if (file) {
      setFormData({ ...formData, favicon: file })
      const reader = new FileReader()
      reader.onloadend = () => {
        setFaviconPreview(reader.result)
      }
      reader.readAsDataURL(file)
    }
  }

  if (isLoading) {
    return <div className="text-center py-12">Loading...</div>
  }

  const categories = settings?.categories || {}
  const currentAdminSettings = { ...settings, ...adminSettings }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
        <p className="text-sm text-gray-600 mt-1">Configure system settings and preferences</p>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="border-b border-gray-200">
          <nav className="flex -mb-px px-6">
            <button
              onClick={() => setActiveTab('branding')}
              className={`px-6 py-3 text-sm font-medium border-b-2 ${
                activeTab === 'branding'
                  ? 'border-brand-500 text-brand-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Branding
            </button>
            <button
              onClick={() => setActiveTab('statuses')}
              className={`px-6 py-3 text-sm font-medium border-b-2 ${
                activeTab === 'statuses'
                  ? 'border-brand-500 text-brand-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Status Rules
            </button>
            <button
              onClick={() => setActiveTab('invoices')}
              className={`px-6 py-3 text-sm font-medium border-b-2 ${
                activeTab === 'invoices'
                  ? 'border-brand-500 text-brand-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Invoices
            </button>
            {Object.keys(categories).length > 0 && (
              <>
                {Object.keys(categories)
                  .filter(category => category !== 'branding') // Exclude branding - it has its own dedicated tab
                  .map((category) => (
                  <button
                    key={category}
                    onClick={() => setActiveTab(category)}
                    className={`px-6 py-3 text-sm font-medium border-b-2 ${
                      activeTab === category
                        ? 'border-brand-500 text-brand-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    {category.charAt(0).toUpperCase() + category.slice(1)}
                  </button>
                ))}
              </>
            )}
          </nav>
        </div>

        <div className="p-6">
          {/* Branding Tab */}
          {activeTab === 'branding' && (
            <div className="space-y-6">
              <h2 className="text-xl font-semibold mb-4">Branding</h2>
              
              {/* Logo and Favicon */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Logo
                  </label>
                  {logoPreview && (
                    <div className="mb-3">
                      <img 
                        src={logoPreview} 
                        alt="Logo preview" 
                        className="h-20 object-contain border border-gray-200 rounded p-2 bg-gray-50"
                      />
                    </div>
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleLogoChange}
                    className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-semibold file:bg-brand-50 file:text-brand-700 hover:file:bg-brand-100"
                  />
                  <p className="mt-1 text-xs text-gray-500">Recommended: PNG, JPG or SVG. Max 2MB</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Favicon
                  </label>
                  {faviconPreview && (
                    <div className="mb-3">
                      <img 
                        src={faviconPreview} 
                        alt="Favicon preview" 
                        className="h-16 w-16 object-contain border border-gray-200 rounded p-2 bg-gray-50"
                      />
                    </div>
                  )}
                  <input
                    type="file"
                    accept="image/*,.ico"
                    onChange={handleFaviconChange}
                    className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-semibold file:bg-brand-50 file:text-brand-700 hover:file:bg-brand-100"
                  />
                  <p className="mt-1 text-xs text-gray-500">Recommended: ICO, PNG. Max 512KB</p>
                </div>
              </div>

                    {/* Branding Colors */}
                    <div className="border-t pt-6">
                      <h3 className="text-lg font-medium text-gray-900 mb-4">Branding Colors</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {categories.branding?.map((key) => {
                          if (key.includes('color') || key.includes('Color')) {
                            // Set default color based on the setting type
                            let defaultValue = '#6366f1'
                            if (key === 'navbar_background_color') {
                              defaultValue = '#1e293b' // Default dark blue
                            } else if (key === 'login_background_color') {
                              defaultValue = '#ffffff'
                            } else if (key === 'login_text_color') {
                              defaultValue = '#1e293b'
                            }
                            
                            return (
                              <div key={key}>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                  {key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                                </label>
                                <input
                                  type="color"
                                  value={adminSettings[key] || settings?.[key] || defaultValue}
                                  onChange={(e) => handleAdminSettingChange(key, e.target.value)}
                                  className="h-12 w-full rounded-lg border border-gray-300 focus:ring-2 focus:ring-brand-500 cursor-pointer"
                                />
                                <p className="text-xs text-gray-500 mt-1">
                                  {key === 'navbar_background_color' && 'Background color for the sidebar/navbar'}
                                  {key === 'theme_primary_color' && 'Primary brand color (buttons, links)'}
                                  {key === 'theme_secondary_color' && 'Secondary brand color'}
                                  {key === 'login_background_color' && 'Login page background color'}
                                  {key === 'login_text_color' && 'Login page text color'}
                                </p>
                              </div>
                            )
                          }
                          return null
                        })}
                      </div>
                    </div>

              <div className="flex gap-3 pt-6 mt-6 border-t border-gray-200">
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault()
                    console.log('Save Branding clicked', {
                      formData,
                      logo: formData.logo instanceof File ? formData.logo.name : formData.logo,
                      favicon: formData.favicon instanceof File ? formData.favicon.name : formData.favicon,
                      adminSettings,
                    })
                    // Include both files and branding colors
                    const brandingData = {
                      ...formData,
                      // Include all branding color settings
                      theme_primary_color: adminSettings.theme_primary_color || settings?.theme_primary_color || null,
                      theme_secondary_color: adminSettings.theme_secondary_color || settings?.theme_secondary_color || null,
                      login_background_color: adminSettings.login_background_color || settings?.login_background_color || null,
                      login_text_color: adminSettings.login_text_color || settings?.login_text_color || null,
                      navbar_background_color: adminSettings.navbar_background_color || settings?.navbar_background_color || null,
                    }
                    // Remove null values to avoid sending them
                    Object.keys(brandingData).forEach(key => {
                      if (brandingData[key] === null) {
                        delete brandingData[key]
                      }
                    })
                    updateMutation.mutate(brandingData)
                  }}
                  disabled={updateMutation.isPending}
                  className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50"
                >
                  {updateMutation.isPending ? 'Saving...' : 'Save Branding'}
                </button>
              </div>
            </div>
          )}


          {/* Status Rules Tab */}
          {activeTab === 'statuses' && (
            <div>
              <StatusRulesSection />
            </div>
          )}

          {/* Invoice Reminders Tab */}
          {activeTab === 'invoices' && (
            <div className="p-6">
              <h2 className="text-xl font-semibold mb-6">Invoice & Contribution Settings</h2>
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Invoice Generation Settings */}
                <div className="border-b pb-6">
                  <h3 className="text-lg font-medium mb-4">Invoice Generation</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Invoice Start Date *
                      </label>
                      <input
                        type="date"
                        required
                        value={formData.contribution_start_date}
                        onChange={(e) => setFormData({ ...formData, contribution_start_date: e.target.value })}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                      />
                      <p className="mt-1 text-sm text-gray-500">
                        <strong>All members</strong> will be invoiced from this date forward, regardless of when they joined.
                      </p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Weekly Invoice Amount (KES) *
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        required
                        value={formData.weekly_contribution_amount}
                        onChange={(e) => setFormData({ ...formData, weekly_contribution_amount: parseFloat(e.target.value) || 0 })}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                      />
                      <p className="mt-1 text-sm text-gray-500">
                        Weekly invoice amount per member (default: 1000). Annual total: KES {(formData.weekly_contribution_amount || 1000) * 52}
                      </p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Contact Phone Number
                      </label>
                      <input
                        type="text"
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                        placeholder="e.g., +254 700 000 000"
                        value={formData.contact_phone}
                        onChange={(e) => setFormData({ ...formData, contact_phone: e.target.value })}
                      />
                      <p className="mt-1 text-sm text-gray-500">
                        Contact number for member inquiries (appears on statements).
                      </p>
                    </div>
                  </div>
                </div>

                {/* Invoice Reminder Settings */}
                <div className="border-b pb-6">
                  <h3 className="text-lg font-medium mb-4">Automated Reminders</h3>
                <div>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={formData.invoice_reminder_enabled === 'true'}
                      onChange={(e) => setFormData({ ...formData, invoice_reminder_enabled: e.target.checked ? 'true' : 'false' })}
                      className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    <span className="ml-2 text-sm font-medium text-gray-700">Enable Invoice Reminders</span>
                  </label>
                  <p className="mt-1 text-sm text-gray-500">Send automated SMS reminders for pending and overdue invoices</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Reminder Frequency</label>
                    <select
                      value={formData.invoice_reminder_frequency || 'daily'}
                      onChange={(e) => setFormData({ ...formData, invoice_reminder_frequency: e.target.value })}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                    >
                      <option value="daily">Daily</option>
                      <option value="weekly">Weekly (Mondays)</option>
                      <option value="bi_weekly">Bi-Weekly (Every 2 weeks)</option>
                      <option value="monthly">Monthly (1st of month)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">Reminder Time</label>
                    <input
                      type="time"
                      value={formData.invoice_reminder_time || '09:00'}
                      onChange={(e) => setFormData({ ...formData, invoice_reminder_time: e.target.value })}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">Days Before Due (for "Due Soon" reminders)</label>
                    <input
                      type="number"
                      min="1"
                      max="30"
                      value={formData.invoice_reminder_days_before_due || '2'}
                      onChange={(e) => setFormData({ ...formData, invoice_reminder_days_before_due: e.target.value })}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Overdue Invoice Message Template
                  </label>
                  <div className="mb-2 flex flex-wrap gap-2">
                    <span className="text-xs text-gray-600">Available placeholders:</span>
                    <code className="text-xs bg-gray-100 px-2 py-0.5 rounded">{'{{member_name}}'}</code>
                    <code className="text-xs bg-gray-100 px-2 py-0.5 rounded">{'{{invoice_number}}'}</code>
                    <code className="text-xs bg-gray-100 px-2 py-0.5 rounded">{'{{invoice_amount}}'}</code>
                    <code className="text-xs bg-gray-100 px-2 py-0.5 rounded">{'{{days_overdue}}'}</code>
                    <code className="text-xs bg-gray-100 px-2 py-0.5 rounded">{'{{total_outstanding}}'}</code>
                    <code className="text-xs bg-gray-100 px-2 py-0.5 rounded">{'{{app_name}}'}</code>
                  </div>
                  <textarea
                    value={formData.invoice_reminder_overdue_message || ''}
                    onChange={(e) => setFormData({ ...formData, invoice_reminder_overdue_message: e.target.value })}
                    rows={4}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                    placeholder="OVERDUE INVOICE: Invoice #{{invoice_number}} for KES {{invoice_amount}} is {{days_overdue}} days overdue..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Due Soon Invoice Message Template
                  </label>
                  <div className="mb-2 flex flex-wrap gap-2">
                    <span className="text-xs text-gray-600">Available placeholders:</span>
                    <code className="text-xs bg-gray-100 px-2 py-0.5 rounded">{'{{member_name}}'}</code>
                    <code className="text-xs bg-gray-100 px-2 py-0.5 rounded">{'{{invoice_number}}'}</code>
                    <code className="text-xs bg-gray-100 px-2 py-0.5 rounded">{'{{invoice_amount}}'}</code>
                    <code className="text-xs bg-gray-100 px-2 py-0.5 rounded">{'{{days_until_due}}'}</code>
                    <code className="text-xs bg-gray-100 px-2 py-0.5 rounded">{'{{due_date}}'}</code>
                    <code className="text-xs bg-gray-100 px-2 py-0.5 rounded">{'{{total_pending}}'}</code>
                    <code className="text-xs bg-gray-100 px-2 py-0.5 rounded">{'{{app_name}}'}</code>
                  </div>
                  <textarea
                    value={formData.invoice_reminder_due_soon_message || ''}
                    onChange={(e) => setFormData({ ...formData, invoice_reminder_due_soon_message: e.target.value })}
                    rows={4}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                    placeholder="REMINDER: Invoice #{{invoice_number}} for KES {{invoice_amount}} is due in {{days_until_due}} days..."
                  />
                </div>
                </div>

                <div className="pt-4 border-t">
                  <button
                    type="submit"
                    disabled={updateMutation.isPending}
                    className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50"
                  >
                    {updateMutation.isPending ? 'Saving...' : 'Save Invoice Settings'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Admin Settings Tabs */}
          {Object.keys(categories)
            .filter(category => category !== 'branding') // Exclude branding - it has its own dedicated tab
            .map((category) => {
            if (activeTab === category) {
              return (
                <form key={category} onSubmit={handleSubmit} className="space-y-6">
                  <h2 className="text-xl font-semibold mb-4">
                    {category.charAt(0).toUpperCase() + category.slice(1)} Settings
                  </h2>
                  {categories[category]?.map((key) => {
                    // Special handling for specific fields
                    if (category === 'general') {
                      if (key === 'currency' || key === 'default_currency') {
                        return (
                          <div key={key}>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              {key === 'default_currency' ? 'Default Currency' : 'Currency'}
                            </label>
                            <select
                              value={currentAdminSettings[key] || 'KES'}
                              onChange={(e) => handleAdminSettingChange(key, e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500"
                            >
                              <option value="KES">KES - Kenyan Shilling</option>
                              <option value="USD">USD - US Dollar</option>
                              <option value="EUR">EUR - Euro</option>
                              <option value="GBP">GBP - British Pound</option>
                              <option value="UGX">UGX - Ugandan Shilling</option>
                              <option value="TZS">TZS - Tanzanian Shilling</option>
                            </select>
                          </div>
                        )
                      }
                      if (key === 'date_format') {
                        return (
                          <div key={key}>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Date Format
                            </label>
                            <select
                              value={currentAdminSettings[key] || 'Y-m-d'}
                              onChange={(e) => handleAdminSettingChange(key, e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500"
                            >
                              <option value="Y-m-d">YYYY-MM-DD (2024-12-25)</option>
                              <option value="d/m/Y">DD/MM/YYYY (25/12/2024)</option>
                              <option value="m/d/Y">MM/DD/YYYY (12/25/2024)</option>
                              <option value="d-M-Y">DD-MMM-YYYY (25-Dec-2024)</option>
                              <option value="F j, Y">Month DD, YYYY (December 25, 2024)</option>
                            </select>
                          </div>
                        )
                      }
                      if (key === 'timezone') {
                        return (
                          <div key={key}>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Timezone
                            </label>
                            <select
                              value={currentAdminSettings[key] || 'Africa/Nairobi'}
                              onChange={(e) => handleAdminSettingChange(key, e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500"
                            >
                              <option value="Africa/Nairobi">Africa/Nairobi (EAT)</option>
                              <option value="Africa/Kampala">Africa/Kampala (EAT)</option>
                              <option value="Africa/Dar_es_Salaam">Africa/Dar_es_Salaam (EAT)</option>
                              <option value="UTC">UTC</option>
                            </select>
                          </div>
                        )
                      }
                    }
                    
                    if (category === 'branding' && (key.includes('color') || key.includes('Color'))) {
                      return (
                        <div key={key}>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            {key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                          </label>
                          <input
                            type="color"
                            value={currentAdminSettings[key] || '#6366f1'}
                            onChange={(e) => handleAdminSettingChange(key, e.target.value)}
                            className="h-10 w-full rounded-lg border border-gray-300 focus:ring-2 focus:ring-brand-500"
                          />
                        </div>
                      )
                    }
                    
                    // Default handling
                    return (
                      <div key={key}>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          {key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                        </label>
                        {key.includes('enabled') || key.includes('require') || key.includes('multi_currency') ? (
                          <label className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={currentAdminSettings[key] === '1' || currentAdminSettings[key] === 'true' || currentAdminSettings[key] === true}
                              onChange={(e) => handleAdminSettingChange(key, e.target.checked ? '1' : '0')}
                              className="rounded border-gray-300 text-brand-600 focus:ring-brand-500"
                            />
                            <span className="text-sm text-gray-700">Enable</span>
                          </label>
                        ) : (
                          <input
                            type="text"
                            value={currentAdminSettings[key] || ''}
                            onChange={(e) => handleAdminSettingChange(key, e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500"
                          />
                        )}
                      </div>
                    )
                  })}
                  <div className="flex gap-3 pt-6 mt-6 border-t border-gray-200">
                    <button
                      type="submit"
                      disabled={updateMutation.isPending}
                      className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50"
                    >
                      {updateMutation.isPending ? 'Saving...' : 'Save Settings'}
                    </button>
                  </div>
                </form>
              )
            }
            return null
          })}
        </div>
      </div>
    </div>
  )
}

const defaultStatusForm = {
  name: '',
  description: '',
  type: 'percentage',
  min_percentage: '',
  max_percentage: '',
  min_amount: '',
  max_amount: '',
  color: '#0ea5e9',
  is_default: false,
}

function StatusRulesSection() {
  const queryClient = useQueryClient()
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingRule, setEditingRule] = useState(null)
  const [formState, setFormState] = useState(() => ({ ...defaultStatusForm }))

  const { data: statuses, isLoading } = useQuery({
    queryKey: ['contribution-statuses'],
    queryFn: getContributionStatuses,
  })

  const statusList = statuses || []

  const createMutation = useMutation({
    mutationFn: createContributionStatus,
    onSuccess: () => {
      queryClient.invalidateQueries(['contribution-statuses'])
      closeModal()
    },
    onError: (error) => {
      alert(error?.response?.data?.message || 'Failed to create status')
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }) => updateContributionStatus(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries(['contribution-statuses'])
      closeModal()
    },
    onError: (error) => {
      alert(error?.response?.data?.message || 'Failed to update status')
    },
  })

  const deleteMutation = useMutation({
    mutationFn: deleteContributionStatus,
    onSuccess: () => {
      queryClient.invalidateQueries(['contribution-statuses'])
    },
    onError: (error) => {
      alert(error?.response?.data?.message || 'Failed to delete status')
    },
  })

  const reorderMutation = useMutation({
    mutationFn: reorderContributionStatuses,
    onSuccess: () => {
      queryClient.invalidateQueries(['contribution-statuses'])
    },
    onError: (error) => {
      alert(error?.response?.data?.message || 'Failed to reorder statuses')
    },
  })

  const openModal = (rule = null) => {
    if (rule) {
      setEditingRule(rule)
      setFormState({
        name: rule.name || '',
        description: rule.description || '',
        type: rule.type || 'percentage',
        min_percentage: typeof rule.min_percentage === 'number' ? rule.min_percentage : '',
        max_percentage: typeof rule.max_percentage === 'number' ? rule.max_percentage : '',
        min_amount: typeof rule.min_amount === 'number' ? rule.min_amount : '',
        max_amount: typeof rule.max_amount === 'number' ? rule.max_amount : '',
        color: rule.color || '#0ea5e9',
        is_default: !!rule.is_default,
      })
    } else {
      setEditingRule(null)
      setFormState({ ...defaultStatusForm })
    }
    setIsModalOpen(true)
  }

  const closeModal = () => {
    setIsModalOpen(false)
    setEditingRule(null)
    setFormState({ ...defaultStatusForm })
  }

  const handleDelete = (rule) => {
    if (!window.confirm(`Delete the "${rule.name}" status? This cannot be undone.`)) {
      return
    }
    deleteMutation.mutate(rule.id)
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    const payload = {
      name: formState.name.trim(),
      description: formState.description?.trim() || null,
      color: formState.color || null,
      is_default: formState.is_default,
      type: formState.type,
      min_ratio:
        formState.type === 'percentage' && formState.min_percentage !== ''
          ? Number(formState.min_percentage) / 100
          : null,
      max_ratio:
        formState.type === 'percentage' && formState.max_percentage !== ''
          ? Number(formState.max_percentage) / 100
          : null,
      min_amount:
        formState.type === 'amount' && formState.min_amount !== ''
          ? Number(formState.min_amount)
          : null,
      max_amount:
        formState.type === 'amount' && formState.max_amount !== ''
          ? Number(formState.max_amount)
          : null,
    }

    if (editingRule) {
      updateMutation.mutate({ id: editingRule.id, payload })
    } else {
      createMutation.mutate(payload)
    }
  }

  const handleMove = (index, direction) => {
    if (!statusList?.length) return
    const targetIndex = index + direction
    if (targetIndex < 0 || targetIndex >= statusList.length) return

    const reordered = [...statusList]
    const temp = reordered[index]
    reordered[index] = reordered[targetIndex]
    reordered[targetIndex] = temp

    reorderMutation.mutate(reordered.map((rule) => rule.id))
  }

  const formatKes = (value) => {
    if (value === null || value === '' || typeof value === 'undefined') {
      return null
    }
    return new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES' }).format(Number(value))
  }

  const toNumberOrNull = (value) => {
    if (value === null || typeof value === 'undefined' || value === '') {
      return null
    }
    return Number(value)
  }

  const formatRange = (rule) => {
    const type = rule.type || 'percentage'
    if (type === 'amount') {
      const min = toNumberOrNull(rule.min_amount)
      const max = toNumberOrNull(rule.max_amount)
      const minLabel = formatKes(min)
      const maxLabel = formatKes(max)
      if (!minLabel && !maxLabel) {
        return 'Any amount'
      }
      if (minLabel && !maxLabel) {
        return `≥ ${minLabel}`
      }
      if (!minLabel && maxLabel) {
        return `< ${maxLabel}`
      }
      return `${minLabel} – ${maxLabel}`
    }

    const min = toNumberOrNull(rule.min_percentage)
    const max = toNumberOrNull(rule.max_percentage)

    if (min === null && max === null) return 'Any progress'
    if (min !== null && max === null) return `≥ ${min}%`
    if (min === null && max !== null) return `< ${max}%`
    return `${min}% – ${max}%`
  }

  const isSaving = createMutation.isPending || updateMutation.isPending
  const isPercentageRule = formState.type === 'percentage'

  return (
    <div className="bg-white shadow rounded-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-xl font-semibold">Contribution Statuses</h2>
          <p className="text-sm text-gray-500">
            Define how members are classified (active, dormant, ahead, behind, etc.) based on how much of their goal
            they have invested. Ranges are based on the percentage of a member&rsquo;s goal achieved.
          </p>
        </div>
        <button
          onClick={() => openModal()}
          className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700"
        >
          Add Status
        </button>
      </div>

      {isLoading ? (
        <div className="text-sm text-gray-500">Loading statuses...</div>
      ) : statusList.length === 0 ? (
        <div className="text-sm text-gray-500">No statuses configured yet.</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left font-medium text-gray-500 uppercase tracking-wider">Order</th>
                <th className="px-4 py-2 text-left font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-4 py-2 text-left font-medium text-gray-500 uppercase tracking-wider">Metric</th>
                <th className="px-4 py-2 text-left font-medium text-gray-500 uppercase tracking-wider">Range</th>
                <th className="px-4 py-2 text-left font-medium text-gray-500 uppercase tracking-wider">Default</th>
                <th className="px-4 py-2 text-right font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {statusList.map((rule, index) => (
                <tr key={rule.id}>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleMove(index, -1)}
                        disabled={index === 0 || reorderMutation.isPending}
                        className="p-1 text-gray-500 hover:text-gray-700 disabled:opacity-40"
                        title="Move up"
                      >
                        ↑
                      </button>
                      <button
                        type="button"
                        onClick={() => handleMove(index, 1)}
                        disabled={index === statusList.length - 1 || reorderMutation.isPending}
                        className="p-1 text-gray-500 hover:text-gray-700 disabled:opacity-40"
                        title="Move down"
                      >
                        ↓
                      </button>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <span
                        className="h-3 w-3 rounded-full border"
                        style={{ backgroundColor: rule.color, borderColor: rule.color || '#d1d5db' }}
                      />
                      <div>
                        <p className="font-medium text-gray-900">{rule.name}</p>
                        {rule.description && <p className="text-xs text-gray-500">{rule.description}</p>}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-700">
                    {rule.type === 'amount' ? 'Total Amount (KES)' : 'Percentage of Goal'}
                  </td>
                  <td className="px-4 py-3 text-gray-700">{formatRange(rule)}</td>
                  <td className="px-4 py-3">
                    {rule.is_default ? (
                      <span className="inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full bg-indigo-100 text-indigo-700">
                        Default
                      </span>
                    ) : (
                      <span className="text-xs text-gray-400">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => openModal(rule)}
                        className="text-indigo-600 hover:text-indigo-900 text-sm font-medium"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(rule)}
                        disabled={deleteMutation.isPending}
                        className="text-red-600 hover:text-red-800 text-sm font-medium disabled:opacity-50"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-gray-900/50 p-4">
          <div className="w-full max-w-xl bg-white rounded-lg shadow-xl p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">
                {editingRule ? 'Edit Contribution Status' : 'Add Contribution Status'}
              </h3>
              <button onClick={closeModal} className="text-gray-500 hover:text-gray-700">
                ✕
              </button>
            </div>
            <form className="space-y-4" onSubmit={handleSubmit}>
              <div>
                <label className="block text-sm font-medium text-gray-700">Status Name *</label>
                <input
                  type="text"
                  required
                  value={formState.name}
                  onChange={(e) => setFormState({ ...formState, name: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Description</label>
                <textarea
                  rows={2}
                  value={formState.description}
                  onChange={(e) => setFormState({ ...formState, description: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  placeholder="Explain what qualifies a member for this status"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Rule Metric *</label>
                <select
                  value={formState.type}
                  onChange={(e) => {
                    const nextType = e.target.value
                    setFormState((prev) => ({
                      ...prev,
                      type: nextType,
                      ...(nextType === 'percentage'
                        ? { min_amount: '', max_amount: '' }
                        : { min_percentage: '', max_percentage: '' }),
                    }))
                  }}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                >
                  <option value="percentage">Percentage of target goal</option>
                  <option value="amount">Total contributed amount (KES)</option>
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  Choose whether this status is evaluated by % of the member&rsquo;s goal or by the actual amount invested.
                </p>
              </div>
              {isPercentageRule ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Minimum % of goal</label>
                    <input
                      type="number"
                      min="0"
                      max="1000"
                      step="0.1"
                      value={formState.min_percentage}
                      onChange={(e) => setFormState({ ...formState, min_percentage: e.target.value })}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                      placeholder="e.g. 80"
                    />
                    <p className="text-xs text-gray-500 mt-1">Leave blank for no minimum.</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Maximum % of goal</label>
                    <input
                      type="number"
                      min="0"
                      max="1000"
                      step="0.1"
                      value={formState.max_percentage}
                      onChange={(e) => setFormState({ ...formState, max_percentage: e.target.value })}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                      placeholder="e.g. 100"
                    />
                    <p className="text-xs text-gray-500 mt-1">Leave blank for no maximum.</p>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Minimum amount (KES)</label>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={formState.min_amount}
                      onChange={(e) => setFormState({ ...formState, min_amount: e.target.value })}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                      placeholder="e.g. 50000"
                    />
                    <p className="text-xs text-gray-500 mt-1">Leave blank for no minimum amount.</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Maximum amount (KES)</label>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={formState.max_amount}
                      onChange={(e) => setFormState({ ...formState, max_amount: e.target.value })}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                      placeholder="e.g. 100000"
                    />
                    <p className="text-xs text-gray-500 mt-1">Leave blank for no maximum amount.</p>
                  </div>
                </div>
              )}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Accent Color</label>
                  <input
                    type="color"
                    value={formState.color}
                    onChange={(e) => setFormState({ ...formState, color: e.target.value })}
                    className="mt-1 h-10 w-full rounded border border-gray-300"
                  />
                </div>
                <div className="flex items-center">
                  <input
                    id="default-status"
                    type="checkbox"
                    checked={formState.is_default}
                    onChange={(e) => setFormState({ ...formState, is_default: e.target.checked })}
                    className="h-4 w-4 text-indigo-600 border-gray-300 rounded"
                  />
                  <label htmlFor="default-status" className="ml-2 block text-sm text-gray-700">
                    Use as fallback status (members who don&rsquo;t match another range)
                  </label>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-4 py-2 rounded-md border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50"
                >
                  {isSaving ? 'Saving...' : editingRule ? 'Update Status' : 'Create Status'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
