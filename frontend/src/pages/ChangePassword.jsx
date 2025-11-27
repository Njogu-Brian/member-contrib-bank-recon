import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { changePassword } from '../api/auth'
import { HiEye, HiEyeSlash } from 'react-icons/hi2'
import { HiSparkles } from 'react-icons/hi'

// Password generator function
const generatePassword = (length = 16, includeUppercase = true, includeLowercase = true, includeNumbers = true, includeSymbols = true) => {
  const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
  const lowercase = 'abcdefghijklmnopqrstuvwxyz'
  const numbers = '0123456789'
  const symbols = '!@#$%^&*()_+-=[]{}|;:,.<>?'
  
  let chars = ''
  if (includeUppercase) chars += uppercase
  if (includeLowercase) chars += lowercase
  if (includeNumbers) chars += numbers
  if (includeSymbols) chars += symbols
  
  // Ensure at least one character from each selected type
  let password = ''
  if (includeUppercase) password += uppercase[Math.floor(Math.random() * uppercase.length)]
  if (includeLowercase) password += lowercase[Math.floor(Math.random() * lowercase.length)]
  if (includeNumbers) password += numbers[Math.floor(Math.random() * numbers.length)]
  if (includeSymbols) password += symbols[Math.floor(Math.random() * symbols.length)]
  
  // Fill the rest randomly
  for (let i = password.length; i < length; i++) {
    password += chars[Math.floor(Math.random() * chars.length)]
  }
  
  // Shuffle the password
  return password.split('').sort(() => Math.random() - 0.5).join('')
}

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
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showPasswordConfirmation, setShowPasswordConfirmation] = useState(false)
  const [passwordStrength, setPasswordStrength] = useState({
    score: 0,
    feedback: '',
  })

  // Calculate password strength
  const calculatePasswordStrength = (password) => {
    if (!password) {
      return { score: 0, feedback: '' }
    }
    
    let score = 0
    const feedback = []
    
    if (password.length >= 8) score += 1
    else feedback.push('At least 8 characters')
    
    if (password.length >= 12) score += 1
    
    if (/[a-z]/.test(password)) score += 1
    else feedback.push('lowercase letter')
    
    if (/[A-Z]/.test(password)) score += 1
    else feedback.push('uppercase letter')
    
    if (/[0-9]/.test(password)) score += 1
    else feedback.push('number')
    
    if (/[^a-zA-Z0-9]/.test(password)) score += 1
    else feedback.push('special character')
    
    let strengthText = ''
    if (score <= 2) strengthText = 'Weak'
    else if (score <= 4) strengthText = 'Fair'
    else if (score <= 5) strengthText = 'Good'
    else strengthText = 'Strong'
    
    return {
      score,
      feedback: feedback.length > 0 ? `Add: ${feedback.join(', ')}` : strengthText,
      strength: strengthText,
    }
  }

  const handlePasswordChange = (value) => {
    setFormData({ ...formData, password: value })
    setPasswordStrength(calculatePasswordStrength(value))
  }

  const handleGeneratePassword = () => {
    const generated = generatePassword(16, true, true, true, true)
    setFormData({
      ...formData,
      password: generated,
      password_confirmation: generated,
    })
    setPasswordStrength(calculatePasswordStrength(generated))
    setShowPassword(true)
    setShowPasswordConfirmation(true)
  }

  const changePasswordMutation = useMutation({
    mutationFn: () => changePassword(
      formData.current_password || undefined, // Only send if not first login
      formData.password,
      formData.password_confirmation
    ),
    onSuccess: () => {
      navigate('/', { replace: true })
    },
    onError: (err) => {
      // Show all validation errors if available
      const errors = err.response?.data?.errors
      if (errors) {
        // Collect all error messages
        const errorMessages = []
        if (errors.password) errorMessages.push(...errors.password)
        if (errors.password_confirmation) errorMessages.push(...errors.password_confirmation)
        if (errors.current_password) errorMessages.push(...errors.current_password)
        
        if (errorMessages.length > 0) {
          setError(errorMessages.join('. '))
          return
        }
      }
      
      // Fallback to general error message
      const errorMessage = err.response?.data?.message || 
                          'Failed to change password. Please try again.'
      setError(errorMessage)
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

  const getStrengthColor = () => {
    if (passwordStrength.score <= 2) return 'bg-red-500'
    if (passwordStrength.score <= 4) return 'bg-yellow-500'
    if (passwordStrength.score <= 5) return 'bg-blue-500'
    return 'bg-green-500'
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
              <div className="relative">
                <input
                  id="current_password"
                  name="current_password"
                  type={showCurrentPassword ? 'text' : 'password'}
                  required={!isFirstLogin}
                  className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 pr-10 text-gray-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
                  placeholder="Enter current password"
                  value={formData.current_password}
                  onChange={(e) => setFormData({ ...formData, current_password: e.target.value })}
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                >
                  {showCurrentPassword ? <HiEyeSlash className="h-5 w-5" /> : <HiEye className="h-5 w-5" />}
                </button>
              </div>
            </div>
          )}

          <div>
            <div className="flex items-center justify-between mb-1">
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                {isFirstLogin ? 'New Password' : 'New Password'}
              </label>
              <button
                type="button"
                onClick={handleGeneratePassword}
                className="flex items-center gap-1 text-xs text-brand-600 hover:text-brand-700 font-medium"
              >
                <HiSparkles className="h-4 w-4" />
                Generate Strong Password
              </button>
            </div>
            <div className="relative">
              <input
                id="password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                required
                minLength={8}
                className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 pr-10 text-gray-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
                placeholder="Enter new password"
                value={formData.password}
                onChange={(e) => handlePasswordChange(e.target.value)}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
              >
                {showPassword ? <HiEyeSlash className="h-5 w-5" /> : <HiEye className="h-5 w-5" />}
              </button>
            </div>
            {formData.password && (
              <div className="mt-2">
                <div className="flex items-center gap-2 mb-1">
                  <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all duration-300 ${getStrengthColor()}`}
                      style={{ width: `${(passwordStrength.score / 6) * 100}%` }}
                    />
                  </div>
                  <span className={`text-xs font-medium ${
                    passwordStrength.score <= 2 ? 'text-red-600' :
                    passwordStrength.score <= 4 ? 'text-yellow-600' :
                    passwordStrength.score <= 5 ? 'text-blue-600' :
                    'text-green-600'
                  }`}>
                    {passwordStrength.strength || ''}
                  </span>
                </div>
                {passwordStrength.feedback && passwordStrength.feedback !== passwordStrength.strength && (
                  <p className="text-xs text-gray-500">{passwordStrength.feedback}</p>
                )}
              </div>
            )}
            <p className="mt-1 text-xs text-gray-500">Must be at least 8 characters</p>
          </div>

          <div>
            <label htmlFor="password_confirmation" className="block text-sm font-medium text-gray-700 mb-1">
              Confirm New Password
            </label>
            <div className="relative">
              <input
                id="password_confirmation"
                name="password_confirmation"
                type={showPasswordConfirmation ? 'text' : 'password'}
                required
                minLength={8}
                className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 pr-10 text-gray-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
                placeholder="Confirm new password"
                value={formData.password_confirmation}
                onChange={(e) => setFormData({ ...formData, password_confirmation: e.target.value })}
              />
              <button
                type="button"
                onClick={() => setShowPasswordConfirmation(!showPasswordConfirmation)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
              >
                {showPasswordConfirmation ? <HiEyeSlash className="h-5 w-5" /> : <HiEye className="h-5 w-5" />}
              </button>
            </div>
            {formData.password_confirmation && formData.password !== formData.password_confirmation && (
              <p className="mt-1 text-xs text-red-600">Passwords do not match</p>
            )}
            {formData.password_confirmation && formData.password === formData.password_confirmation && formData.password.length >= 8 && (
              <p className="mt-1 text-xs text-green-600">✓ Passwords match</p>
            )}
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
