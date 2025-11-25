import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getAdminSettings, updateAdminSettings } from '../api/adminSettings'

export default function AdminSettings() {
  const [activeTab, setActiveTab] = useState('general')
  const [settings, setSettings] = useState({})
  const queryClient = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['adminSettings'],
    queryFn: () => getAdminSettings(),
  })

  const updateMutation = useMutation({
    mutationFn: updateAdminSettings,
    onSuccess: () => {
      queryClient.invalidateQueries(['adminSettings'])
      alert('Settings updated successfully')
    },
  })

  const handleChange = (key, value) => {
    setSettings({ ...settings, [key]: value })
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    updateMutation.mutate({ settings })
  }

  if (isLoading) {
    return <div className="p-6">Loading...</div>
  }

  const currentSettings = { ...data?.data?.settings, ...settings }
  const categories = data?.data?.categories || {}

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Admin Settings</h1>
        <p className="text-sm text-gray-600 mt-1">Configure system settings and preferences</p>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="border-b border-gray-200">
          <nav className="flex -mb-px">
            {Object.keys(categories).map((category) => (
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
          </nav>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          <div className="space-y-6">
            {categories[activeTab]?.map((key) => (
              <div key={key}>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                </label>
                {key.includes('enabled') || key.includes('require') ? (
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={currentSettings[key] === '1' || currentSettings[key] === 'true' || currentSettings[key] === true}
                      onChange={(e) => handleChange(key, e.target.checked ? '1' : '0')}
                      className="rounded border-gray-300 text-brand-600 focus:ring-brand-500"
                    />
                    <span className="text-sm text-gray-700">Enable</span>
                  </label>
                ) : (
                  <input
                    type="text"
                    value={currentSettings[key] || ''}
                    onChange={(e) => handleChange(key, e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500"
                  />
                )}
              </div>
            ))}
          </div>

          <div className="flex gap-3 pt-6 mt-6 border-t border-gray-200">
            <button
              type="submit"
              className="px-6 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700"
            >
              Save Settings
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

