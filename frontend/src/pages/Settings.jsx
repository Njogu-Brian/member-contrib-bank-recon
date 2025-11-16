import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getSettings, updateSettings } from '../api/settings'
import {
  getContributionStatuses,
  createContributionStatus,
  updateContributionStatus,
  deleteContributionStatus,
  reorderContributionStatuses,
} from '../api/contributionStatuses'

export default function Settings() {
  const [formData, setFormData] = useState({
    contribution_start_date: '',
    weekly_contribution_amount: 1000,
  })
  const queryClient = useQueryClient()

  const { data: settings, isLoading } = useQuery({
    queryKey: ['settings'],
    queryFn: getSettings,
    onSuccess: (data) => {
      setFormData({
        contribution_start_date: data.contribution_start_date || '',
        weekly_contribution_amount: parseFloat(data.weekly_contribution_amount) || 1000,
      })
    },
  })

  const updateMutation = useMutation({
    mutationFn: updateSettings,
    onSuccess: () => {
      queryClient.invalidateQueries(['settings'])
      alert('Settings saved successfully!')
    },
  })

  const handleSubmit = (e) => {
    e.preventDefault()
    updateMutation.mutate(formData)
  }

  if (isLoading) {
    return <div className="text-center py-12">Loading...</div>
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-gray-900">Settings</h1>

      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-xl font-semibold mb-4">Contribution Settings</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Contribution Start Date *
            </label>
            <input
              type="date"
              required
              value={formData.contribution_start_date}
              onChange={(e) => setFormData({ ...formData, contribution_start_date: e.target.value })}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            />
            <p className="mt-1 text-sm text-gray-500">
              The date from which weekly contributions will be calculated
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Weekly Contribution Amount (KES) *
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
              The expected weekly contribution amount per member (default: 1000)
            </p>
          </div>

          <div className="pt-4">
            <button
              type="submit"
              disabled={updateMutation.isPending}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50"
            >
              {updateMutation.isPending ? 'Saving...' : 'Save Settings'}
            </button>
          </div>
        </form>
      </div>

      <StatusRulesSection />
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
