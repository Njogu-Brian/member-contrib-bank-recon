import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import api from '../api/axios'

export default function MfaSetup() {
  const [code, setCode] = useState('')
  const [step, setStep] = useState('setup') // 'setup', 'verify'
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const { data: mfaData, isLoading } = useQuery({
    queryKey: ['mfa-setup'],
    queryFn: async () => {
      const response = await api.get('/auth/mfa/setup')
      return response.data
    },
    enabled: step === 'setup',
  })

  const enableMutation = useMutation({
    mutationFn: async (code) => {
      const response = await api.post('/auth/mfa/enable', { code })
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['auth', 'user'])
      alert('MFA enabled successfully!')
      navigate('/settings')
    },
    onError: (error) => {
      alert(error?.response?.data?.message || 'Failed to enable MFA. Please check your code.')
    },
  })

  const disableMutation = useMutation({
    mutationFn: async (code) => {
      const response = await api.post('/auth/mfa/disable', { code })
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['auth', 'user'])
      alert('MFA disabled successfully!')
      navigate('/settings')
    },
    onError: (error) => {
      alert(error?.response?.data?.message || 'Failed to disable MFA.')
    },
  })

  const handleEnable = (e) => {
    e.preventDefault()
    if (code.length !== 6) {
      alert('Please enter a valid 6-digit code')
      return
    }
    enableMutation.mutate(code)
  }

  if (isLoading) {
    return <div className="text-center py-12">Loading...</div>
  }

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h1 className="text-3xl font-bold text-gray-900 mb-6">Two-Factor Authentication Setup</h1>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 space-y-6">
        <div>
          <h2 className="text-xl font-semibold mb-4">Step 1: Scan QR Code</h2>
          <p className="text-sm text-gray-600 mb-4">
            Use your authenticator app (Google Authenticator, Authy, etc.) to scan this QR code:
          </p>
          
          {mfaData?.qr_code && (
            <div className="flex flex-col items-center space-y-4">
              <img 
                src={`data:image/png;base64,${mfaData.qr_code}`}
                alt="MFA QR Code"
                className="border border-gray-300 rounded-lg p-4 bg-white"
              />
              <div className="text-center">
                <p className="text-sm font-medium text-gray-700 mb-2">Or enter this code manually:</p>
                <code className="text-lg font-mono bg-gray-100 px-4 py-2 rounded">
                  {mfaData.manual_entry_key}
                </code>
              </div>
            </div>
          )}
        </div>

        <div>
          <h2 className="text-xl font-semibold mb-4">Step 2: Verify Code</h2>
          <p className="text-sm text-gray-600 mb-4">
            Enter the 6-digit code from your authenticator app to enable MFA:
          </p>
          
          <form onSubmit={handleEnable} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Verification Code
              </label>
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]{6}"
                maxLength="6"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 text-center text-2xl tracking-widest font-mono"
                placeholder="000000"
                required
              />
            </div>
            
            <div className="flex gap-3">
              <button
                type="submit"
                disabled={enableMutation.isPending || code.length !== 6}
                className="flex-1 px-4 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 disabled:opacity-50"
              >
                {enableMutation.isPending ? 'Enabling...' : 'Enable MFA'}
              </button>
              <button
                type="button"
                onClick={() => navigate('/settings')}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>

        <div className="border-t pt-4">
          <p className="text-xs text-gray-500">
            Once enabled, you'll need to enter a code from your authenticator app every time you log in.
          </p>
        </div>
      </div>
    </div>
  )
}

