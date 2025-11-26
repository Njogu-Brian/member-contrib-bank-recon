import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { changePassword } from '../api/auth'

export default function ChangePassword() {
  const navigate = useNavigate()
  const location = useLocation()
  const isFirstLogin = location.state?.firstLogin || false

  const [formData, setFormData] = useState({
    current_password: '',
    password: '',
    password_confirmation: '',
  })
  const [error, setError] = useState('')

  const changePasswordMutation = useMutation({
    mutationFn: () => changePassword(
      formData.current_password,
      formData.password,
      formData.password_confirmation
    ),
    onSuccess: () => {
      navigate('/', { replace: true })
    },
    onError: (err) => {
      setError(err.response?.data?.message ?? 'Failed to change password. Please try again.')
    },
  })

  const handleSubmit = (event) => {
    event.preventDefault()
    setError('')

    if (formData.password !== formData.password_confirmation) {
      setError('New passwords do not match.')
      return
    }

    if (formData.password.length < 8) {
      setError('Password must be at least 8 characters long.')
      return
    }

    if (!isFirstLogin && !formData.current_password) {
      setError('Please enter your current password.')
      return
    }

    changePasswordMutation.mutate()
  }

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-lg p-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">
            {isFirstLogin ? 'Create Your Password' : 'Change Password'}
          </h1>
          <p className="mt-2 text-sm text-gray-600">
            {isFirstLogin 
              ? 'This is your first login. Please create a new password for your account.'
              : 'Enter your current password and choose a new one.'
            }
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
              {error}
            </div>
          )}

          {!isFirstLogin && (
            <div>
              <label htmlFor="current_password" className="block text-sm font-medium text-gray-700 mb-1">
                Current Password
              </label>
              <input
                id="current_password"
                name="current_password"
                type="password"
                required={!isFirstLogin}
                className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-gray-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
                placeholder="Enter current password"
                value={formData.current_password}
                onChange={(e) => setFormData({ ...formData, current_password: e.target.value })}
              />
            </div>
          )}

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
              {isFirstLogin ? 'New Password' : 'New Password'}
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              minLength={8}
              className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-gray-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
              placeholder="Enter new password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
            />
            <p className="mt-1 text-xs text-gray-500">Must be at least 8 characters</p>
          </div>

          <div>
            <label htmlFor="password_confirmation" className="block text-sm font-medium text-gray-700 mb-1">
              Confirm New Password
            </label>
            <input
              id="password_confirmation"
              name="password_confirmation"
              type="password"
              required
              minLength={8}
              className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-gray-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
              placeholder="Confirm new password"
              value={formData.password_confirmation}
              onChange={(e) => setFormData({ ...formData, password_confirmation: e.target.value })}
            />
          </div>

          <button
            type="submit"
            disabled={changePasswordMutation.isPending}
            className="w-full rounded-2xl bg-brand-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-brand-600/30 hover:bg-brand-700 disabled:opacity-60"
          >
            {changePasswordMutation.isPending ? 'Updating...' : isFirstLogin ? 'Create Password' : 'Change Password'}
          </button>
        </form>
      </div>
    </div>
  )
}

