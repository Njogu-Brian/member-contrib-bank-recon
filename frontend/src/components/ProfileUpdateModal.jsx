import { useState, useEffect } from 'react'
import { HiXMark } from 'react-icons/hi2'

// Common country codes (with Kenya first as default)
const COUNTRY_CODES = [
  { code: '+254', country: 'Kenya', flag: '🇰🇪', length: 9 },
  { code: '+1', country: 'USA/Canada', flag: '🇺🇸', length: 10 },
  { code: '+44', country: 'UK', flag: '🇬🇧', length: 10 },
  { code: '+256', country: 'Uganda', flag: '🇺🇬', length: 9 },
  { code: '+255', country: 'Tanzania', flag: '🇹🇿', length: 9 },
  { code: '+250', country: 'Rwanda', flag: '🇷🇼', length: 9 },
  { code: '+27', country: 'South Africa', flag: '🇿🇦', length: 9 },
  { code: '+234', country: 'Nigeria', flag: '🇳🇬', length: 10 },
  { code: '+91', country: 'India', flag: '🇮🇳', length: 10 },
  { code: '+86', country: 'China', flag: '🇨🇳', length: 11 },
]

export default function ProfileUpdateModal({ isOpen, onClose, onUpdate, token, initialData = {} }) {
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    secondary_phone: '',
    email: '',
    id_number: '',
    church: '',
  })
  const [phoneCountryCode, setPhoneCountryCode] = useState('+254')
  const [whatsappCountryCode, setWhatsappCountryCode] = useState('+254')
  const [phoneNumber, setPhoneNumber] = useState('')
  const [whatsappNumber, setWhatsappNumber] = useState('')
  const [errors, setErrors] = useState({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (initialData) {
      // Parse phone number to extract country code
      const parsePhone = (fullPhone) => {
        if (!fullPhone) return { code: '+254', number: '' }
        
        // Check if already has country code
        if (fullPhone.startsWith('+')) {
          const match = COUNTRY_CODES.find(c => fullPhone.startsWith(c.code))
          if (match) {
            return {
              code: match.code,
              number: fullPhone.substring(match.code.length)
            }
          }
        }
        
        // Kenya numbers starting with 254 or 0
        if (fullPhone.startsWith('254')) {
          return { code: '+254', number: fullPhone.substring(3) }
        }
        if (fullPhone.startsWith('0')) {
          return { code: '+254', number: fullPhone.substring(1) }
        }
        
        return { code: '+254', number: fullPhone }
      }
      
      const parsedPhone = parsePhone(initialData.phone)
      const parsedWhatsapp = parsePhone(initialData.secondary_phone)
      
      setPhoneCountryCode(parsedPhone.code)
      setPhoneNumber(parsedPhone.number)
      setWhatsappCountryCode(parsedWhatsapp.code)
      setWhatsappNumber(parsedWhatsapp.number)
      
      setFormData({
        name: initialData.name || '',
        phone: parsedPhone.code + parsedPhone.number,
        secondary_phone: parsedWhatsapp.number ? parsedWhatsapp.code + parsedWhatsapp.number : '',
        email: initialData.email || '',
        id_number: initialData.id_number || '',
        church: initialData.church || '',
      })
    }
  }, [initialData])

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
    // Clear error for this field
    if (errors[name]) {
      setErrors((prev) => {
        const newErrors = { ...prev }
        delete newErrors[name]
        return newErrors
      })
    }
  }

  const handlePhoneNumberChange = (e) => {
    const value = e.target.value.replace(/\D/g, '') // Only digits
    setPhoneNumber(value)
    setFormData((prev) => ({ ...prev, phone: phoneCountryCode + value }))
    if (errors.phone) {
      setErrors((prev) => {
        const newErrors = { ...prev }
        delete newErrors.phone
        return newErrors
      })
    }
  }

  const handleWhatsappNumberChange = (e) => {
    const value = e.target.value.replace(/\D/g, '') // Only digits
    setWhatsappNumber(value)
    setFormData((prev) => ({ ...prev, secondary_phone: value ? whatsappCountryCode + value : '' }))
    if (errors.secondary_phone) {
      setErrors((prev) => {
        const newErrors = { ...prev }
        delete newErrors.secondary_phone
        return newErrors
      })
    }
  }

  const handlePhoneCountryCodeChange = (e) => {
    const code = e.target.value
    setPhoneCountryCode(code)
    setFormData((prev) => ({ ...prev, phone: code + phoneNumber }))
  }

  const handleWhatsappCountryCodeChange = (e) => {
    const code = e.target.value
    setWhatsappCountryCode(code)
    setFormData((prev) => ({ ...prev, secondary_phone: whatsappNumber ? code + whatsappNumber : '' }))
  }

  const validate = () => {
    const newErrors = {}

    if (!formData.name.trim()) {
      newErrors.name = 'Name is required'
    }
    
    if (!formData.phone.trim()) {
      newErrors.phone = 'Phone number is required'
    } else if (!/^\+\d{1,4}\d{6,14}$/.test(formData.phone)) {
      newErrors.phone = 'Please enter a valid international phone number'
    } else if (!phoneNumber.trim()) {
      newErrors.phone = 'Please enter the phone number after selecting country code'
    }
    
    if (formData.secondary_phone) {
      if (!/^\+\d{1,4}\d{6,14}$/.test(formData.secondary_phone)) {
        newErrors.secondary_phone = 'Please enter a valid international phone number'
      } else if (!whatsappNumber.trim()) {
        newErrors.secondary_phone = 'Please enter the number after selecting country code'
      }
    }
    
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address'
    }
    
    if (!formData.id_number.trim()) {
      newErrors.id_number = 'ID Number is required'
    } else if (!/^\d+$/.test(formData.id_number)) {
      newErrors.id_number = 'ID Number must contain only digits'
    } else if (formData.id_number.length < 5) {
      newErrors.id_number = 'ID Number must be at least 5 digits'
    }
    
    if (!formData.church.trim()) {
      newErrors.church = 'Church is required'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!validate()) {
      return
    }

    setIsSubmitting(true)

    try {
      const response = await fetch(`/api/v1/public/profile/${token}/update`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      })

      const data = await response.json()

      if (!response.ok) {
        if (data.errors) {
          setErrors(data.errors)
        } else {
          alert(data.message || 'Failed to update profile')
        }
        setIsSubmitting(false)
        return
      }

      // Success!
      onUpdate(data)
      onClose()
    } catch (error) {
      console.error('Error updating profile:', error)
      alert('An error occurred while updating your profile. Please try again.')
      setIsSubmitting(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-6 py-4 flex justify-between items-center rounded-t-2xl">
          <div>
            <h2 className="text-2xl font-bold">Complete Your Profile</h2>
            <p className="text-indigo-100 text-sm mt-1">
              Please provide your information to view your statement
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-white hover:bg-white hover:bg-opacity-20 rounded-full p-2 transition-colors"
            aria-label="Close"
          >
            <HiXMark className="w-6 h-6" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded">
            <p className="text-sm text-blue-800">
              <strong>Required:</strong> All fields marked with <span className="text-red-500">*</span> must be filled to access your statement.
            </p>
          </div>

          {/* Name */}
          <div>
            <label htmlFor="name" className="block text-sm font-semibold text-gray-700 mb-2">
              Full Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors ${
                errors.name ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="Enter your full name"
            />
            {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name}</p>}
          </div>

          {/* Phone */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="phone" className="block text-sm font-semibold text-gray-700 mb-2">
                Phone Number <span className="text-red-500">*</span>
              </label>
              <div className="flex gap-2">
                <select
                  value={phoneCountryCode}
                  onChange={handlePhoneCountryCodeChange}
                  className="px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white text-sm font-medium"
                  style={{ minWidth: '140px' }}
                >
                  {COUNTRY_CODES.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.flag} {c.code}
                    </option>
                  ))}
                </select>
                <input
                  type="tel"
                  id="phone"
                  name="phone_number"
                  value={phoneNumber}
                  onChange={handlePhoneNumberChange}
                  className={`flex-1 px-4 py-3 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors ${
                    errors.phone ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="712345678"
                />
              </div>
              {errors.phone && <p className="mt-1 text-sm text-red-600">{errors.phone}</p>}
              <p className="mt-1 text-xs text-gray-500">
                Full number: <strong>{phoneCountryCode}{phoneNumber || '...'}</strong>
              </p>
            </div>

            <div>
              <label htmlFor="secondary_phone" className="block text-sm font-semibold text-gray-700 mb-2">
                WhatsApp Number <span className="text-gray-400 text-xs">(Optional)</span>
              </label>
              <div className="flex gap-2">
                <select
                  value={whatsappCountryCode}
                  onChange={handleWhatsappCountryCodeChange}
                  className="px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white text-sm font-medium"
                  style={{ minWidth: '140px' }}
                >
                  {COUNTRY_CODES.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.flag} {c.code}
                    </option>
                  ))}
                </select>
                <input
                  type="tel"
                  id="secondary_phone"
                  name="whatsapp_number"
                  value={whatsappNumber}
                  onChange={handleWhatsappNumberChange}
                  className={`flex-1 px-4 py-3 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors ${
                    errors.secondary_phone ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="723456789"
                />
              </div>
              {errors.secondary_phone && <p className="mt-1 text-sm text-red-600">{errors.secondary_phone}</p>}
              <p className="mt-1 text-xs text-gray-500">
                {whatsappNumber ? (
                  <>Full number: <strong>{whatsappCountryCode}{whatsappNumber}</strong></>
                ) : (
                  'Optional field'
                )}
              </p>
            </div>
          </div>

          {/* Email */}
          <div>
            <label htmlFor="email" className="block text-sm font-semibold text-gray-700 mb-2">
              Email Address <span className="text-red-500">*</span>
            </label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors ${
                errors.email ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="your.email@example.com"
            />
            {errors.email && <p className="mt-1 text-sm text-red-600">{errors.email}</p>}
          </div>

          {/* ID Number */}
          <div>
            <label htmlFor="id_number" className="block text-sm font-semibold text-gray-700 mb-2">
              ID Number <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="id_number"
              name="id_number"
              value={formData.id_number}
              onChange={handleChange}
              className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors ${
                errors.id_number ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="12345678"
              maxLength="20"
            />
            {errors.id_number && <p className="mt-1 text-sm text-red-600">{errors.id_number}</p>}
            <p className="mt-1 text-xs text-gray-500">Digits only, minimum 5 digits</p>
          </div>

          {/* Church */}
          <div>
            <label htmlFor="church" className="block text-sm font-semibold text-gray-700 mb-2">
              Church <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="church"
              name="church"
              value={formData.church}
              onChange={handleChange}
              className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors ${
                errors.church ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="Enter your church name"
            />
            {errors.church && <p className="mt-1 text-sm text-red-600">{errors.church}</p>}
          </div>

          {/* Actions */}
          <div className="flex flex-col-reverse sm:flex-row gap-3 pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-3 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-medium rounded-lg hover:from-indigo-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg"
            >
              {isSubmitting ? 'Saving...' : 'Save & Continue'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

