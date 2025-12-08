import { useState, useEffect, useRef, useCallback } from 'react'
import { HiXMark } from 'react-icons/hi2'

// Kenya is the only allowed country code
const KENYA_CODE = '+254'

export default function ProfileUpdateModal({ isOpen, onClose, onUpdate, token, initialData = {} }) {
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
  const [phoneCountryCode, setPhoneCountryCode] = useState('+254')
  const [whatsappCountryCode, setWhatsappCountryCode] = useState('+254')
  const [nextOfKinCountryCode, setNextOfKinCountryCode] = useState('+254')
  const [phoneNumber, setPhoneNumber] = useState('')
  const [whatsappNumber, setWhatsappNumber] = useState('')
  const [nextOfKinNumber, setNextOfKinNumber] = useState('')
  const [errors, setErrors] = useState({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [checkingDuplicates, setCheckingDuplicates] = useState({})

  // Debounce timer ref
  const debounceTimerRef = useRef({})

  // Duplicate checking function for public profile
  const checkDuplicateValue = useCallback(async (field, value) => {
    if (!value || value.trim() === '') {
      setErrors(prev => {
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
      // Use public endpoint for duplicate checking
      const response = await fetch(`/api/v1/public/profile/${token}/check-duplicate?field=${field}&value=${encodeURIComponent(value)}`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
      })

      if (response.ok) {
        const result = await response.json()
        if (result.is_duplicate) {
          setErrors(prev => ({
            ...prev,
            [field]: result.message
          }))
        } else {
          setErrors(prev => {
            const newErrors = { ...prev }
            delete newErrors[field]
            return newErrors
          })
        }
      }
    } catch (error) {
      console.error('Error checking duplicate:', error)
      // Don't show error to user, just silently fail
    } finally {
      setCheckingDuplicates(prev => {
        const newChecking = { ...prev }
        delete newChecking[field]
        return newChecking
      })
    }
  }, [token])

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

  useEffect(() => {
    if (initialData) {
      // Parse phone number to extract country code
      const parsePhone = (fullPhone) => {
        if (!fullPhone) return { code: '+254', number: '' }
        
        // Check if already has country code
        if (fullPhone.startsWith('+')) {
          // For Kenya, check if it starts with +254
          if (fullPhone.startsWith('+254')) {
            return {
              code: '+254',
              number: fullPhone.substring(4)
            }
          }
          // Fallback to Kenya
          const match = { code: '+254', length: 9 }
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
      const parsedWhatsapp = parsePhone(initialData.whatsapp_number)
      const parsedNextOfKin = parsePhone(initialData.next_of_kin_phone)
      
      setPhoneCountryCode(parsedPhone.code)
      setPhoneNumber(parsedPhone.number)
      setWhatsappCountryCode(parsedWhatsapp.code)
      setWhatsappNumber(parsedWhatsapp.number)
      setNextOfKinCountryCode(parsedNextOfKin.code)
      setNextOfKinNumber(parsedNextOfKin.number)
      
      setFormData({
        name: initialData.name || '',
        phone: parsedPhone.code + parsedPhone.number,
        whatsapp_number: parsedWhatsapp.number ? parsedWhatsapp.code + parsedWhatsapp.number : '',
        email: initialData.email || '',
        id_number: initialData.id_number || '',
        church: initialData.church || '',
        next_of_kin_name: initialData.next_of_kin_name || '',
        next_of_kin_phone: parsedNextOfKin.number ? parsedNextOfKin.code + parsedNextOfKin.number : '',
        next_of_kin_relationship: initialData.next_of_kin_relationship || '',
      })
    }
  }, [initialData])

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
    
    // Clear error for this field immediately
    setErrors(prev => {
      const newErrors = { ...prev }
      delete newErrors[name]
      return newErrors
    })

    // Check for duplicates on id_number
    if (name === 'id_number' && value && value.length >= 5) {
      debouncedCheckDuplicate('id_number', value)
    }
  }

  const handlePhoneNumberChange = (e) => {
    const value = e.target.value.replace(/\D/g, '') // Only digits
    setPhoneNumber(value)
    const fullPhone = phoneCountryCode + value
    setFormData((prev) => ({ ...prev, phone: fullPhone }))
    
    // Clear error immediately
    setErrors(prev => {
      const newErrors = { ...prev }
      delete newErrors.phone
      return newErrors
    })

    // Check for duplicates
    if (fullPhone && fullPhone.length >= 10) {
      debouncedCheckDuplicate('phone', fullPhone)
    }
  }

  const handleWhatsappNumberChange = (e) => {
    const value = e.target.value.replace(/\D/g, '') // Only digits
    setWhatsappNumber(value)
    const fullWhatsapp = value ? whatsappCountryCode + value : ''
    setFormData((prev) => ({ ...prev, whatsapp_number: fullWhatsapp }))
    
    // Clear error immediately
    setErrors(prev => {
      const newErrors = { ...prev }
      delete newErrors.whatsapp_number
      return newErrors
    })

    // Check for duplicates if value exists
    if (fullWhatsapp && fullWhatsapp.length >= 10) {
      debouncedCheckDuplicate('whatsapp_number', fullWhatsapp)
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
    setFormData((prev) => ({ ...prev, whatsapp_number: whatsappNumber ? code + whatsappNumber : '' }))
  }

  const handleNextOfKinNumberChange = (e) => {
    const value = e.target.value.replace(/\D/g, '') // Only digits
    setNextOfKinNumber(value)
    setFormData((prev) => ({ ...prev, next_of_kin_phone: value ? nextOfKinCountryCode + value : '' }))
    if (errors.next_of_kin_phone) {
      setErrors((prev) => {
        const newErrors = { ...prev }
        delete newErrors.next_of_kin_phone
        return newErrors
      })
    }
  }

  const handleNextOfKinCountryCodeChange = (e) => {
    const code = e.target.value
    setNextOfKinCountryCode(code)
    setFormData((prev) => ({ ...prev, next_of_kin_phone: nextOfKinNumber ? code + nextOfKinNumber : '' }))
  }

  const validate = () => {
    const newErrors = {}

    if (!formData.name.trim()) {
      newErrors.name = 'Name is required'
    }
    
    if (!formData.phone.trim()) {
      newErrors.phone = 'Phone number is required'
    } else if (!/^\+254[17]\d{8}$/.test(formData.phone)) {
      newErrors.phone = 'Phone number must be a valid Kenyan number starting with +2547 or +2541 followed by 8 digits'
    } else if (!phoneNumber.trim()) {
      newErrors.phone = 'Please enter the phone number after selecting country code'
    }
    
    if (formData.whatsapp_number) {
      if (!/^\+254[17]\d{8}$/.test(formData.whatsapp_number)) {
        newErrors.whatsapp_number = 'WhatsApp number must be a valid Kenyan number starting with +2547 or +2541 followed by 8 digits'
      } else if (!whatsappNumber.trim()) {
        newErrors.whatsapp_number = 'Please enter the number after selecting country code'
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
    
    // Next of kin validation (all required)
    if (!formData.next_of_kin_name.trim()) {
      newErrors.next_of_kin_name = 'Next of kin name is required'
    }
    
    if (!formData.next_of_kin_phone.trim()) {
      newErrors.next_of_kin_phone = 'Next of kin phone number is required'
    } else if (!/^\+254[17]\d{8}$/.test(formData.next_of_kin_phone)) {
      newErrors.next_of_kin_phone = 'Next of kin phone number must be a valid Kenyan number starting with +2547 or +2541 followed by 8 digits'
    } else if (!nextOfKinNumber.trim()) {
      newErrors.next_of_kin_phone = 'Please enter the number after selecting country code'
    }
    
    if (!formData.next_of_kin_relationship) {
      newErrors.next_of_kin_relationship = 'Next of kin relationship is required'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  // Check if form is valid and can be submitted
  const isFormValid = () => {
    // Check for duplicate errors
    const hasDuplicateErrors = Object.keys(errors).some(key => 
      ['phone', 'whatsapp_number', 'id_number'].includes(key) && errors[key]
    )
    
    if (hasDuplicateErrors) {
      return false
    }

    // Check if all required fields are filled
    const requiredFields = [
      'name',
      'phone',
      'email',
      'id_number',
      'church',
      'next_of_kin_name',
      'next_of_kin_phone',
      'next_of_kin_relationship'
    ]

    for (const field of requiredFields) {
      if (!formData[field] || !formData[field].toString().trim()) {
        return false
      }
    }

    // Check phone format
    if (!/^\+254[17]\d{8}$/.test(formData.phone) || !phoneNumber.trim()) {
      return false
    }

    // Check email format
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      return false
    }

    // Check ID number format
    if (!/^\d+$/.test(formData.id_number) || formData.id_number.length < 5) {
      return false
    }

    // Check next of kin phone format
    if (!/^\+254[17]\d{8}$/.test(formData.next_of_kin_phone) || !nextOfKinNumber.trim()) {
      return false
    }

    return true
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!validate()) {
      return
    }

    // Double check for duplicate errors before submitting
    const hasDuplicateErrors = Object.keys(errors).some(key => 
      ['phone', 'whatsapp_number', 'id_number'].includes(key) && errors[key]
    )
    
    if (hasDuplicateErrors) {
      alert('Please fix the duplicate field errors before submitting.')
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
          // Handle duplicate errors specially
          if (data.errors.duplicate && Array.isArray(data.errors.duplicate)) {
            // Show duplicate errors as alert
            alert(data.errors.duplicate.join('\n'))
            setErrors({})
          } else {
            setErrors(data.errors)
          }
        } else {
          alert(data.message || 'Failed to update profile')
        }
        setIsSubmitting(false)
        return
      } else {
        // Show success message
        const message = data.message || 'Profile updated successfully.'
        
        // If auto-approved (first-time update), close modal and refresh
        if (data.auto_approved) {
          onClose()
          setTimeout(() => {
            alert(message)
            if (onUpdate) {
              onUpdate({ ...formData, auto_approved: true })
            }
          }, 100)
          setIsSubmitting(false)
          return
        }
        
        // For pending changes (edit from statement view)
        if (data.pending) {
          // Close modal first
          onClose()
          
          // Show alert after a brief delay to allow modal to close
          setTimeout(() => {
            alert(message)
          }, 100)
          
          // For pending changes, we still call onUpdate but with a flag to indicate pending
          if (onUpdate) {
            onUpdate({ ...formData, pending: true })
          }
          setIsSubmitting(false)
          return
        }

        // Success! (fallback case)
        onClose()
        if (onUpdate) {
          onUpdate(data)
        }
      }
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
                  <option value="+254">🇰🇪 +254</option>
                </select>
                <input
                  type="tel"
                  id="phone"
                  name="phone_number"
                  value={phoneNumber}
                  onChange={handlePhoneNumberChange}
                  className={`flex-1 px-4 py-3 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors ${
                    errors.phone ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : 'border-gray-300'
                  }`}
                  placeholder="712345678"
                />
              </div>
              {checkingDuplicates.phone && (
                <p className="mt-1 text-xs text-blue-500">Checking availability...</p>
              )}
              {errors.phone && !checkingDuplicates.phone && (
                <p className="mt-1 text-sm text-red-600">{errors.phone}</p>
              )}
              {!errors.phone && !checkingDuplicates.phone && (
                <p className="mt-1 text-xs text-gray-500">
                  Full number: <strong>{phoneCountryCode}{phoneNumber || '...'}</strong>
                </p>
              )}
            </div>

            <div>
              <label htmlFor="whatsapp_number" className="block text-sm font-semibold text-gray-700 mb-2">
                WhatsApp Number <span className="text-gray-400 text-xs">(Optional)</span>
              </label>
              <div className="flex gap-2">
                <select
                  value={whatsappCountryCode}
                  onChange={handleWhatsappCountryCodeChange}
                  className="px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white text-sm font-medium"
                  style={{ minWidth: '140px' }}
                >
                  <option value="+254">🇰🇪 +254</option>
                </select>
                <input
                  type="tel"
                  id="whatsapp_number"
                  name="whatsapp_number"
                  value={whatsappNumber}
                  onChange={handleWhatsappNumberChange}
                  className={`flex-1 px-4 py-3 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors ${
                    errors.whatsapp_number ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : 'border-gray-300'
                  }`}
                  placeholder="723456789"
                />
              </div>
              {checkingDuplicates.whatsapp_number && (
                <p className="mt-1 text-xs text-blue-500">Checking availability...</p>
              )}
              {errors.whatsapp_number && !checkingDuplicates.whatsapp_number && (
                <p className="mt-1 text-sm text-red-600">{errors.whatsapp_number}</p>
              )}
              {!errors.whatsapp_number && !checkingDuplicates.whatsapp_number && (
                <p className="mt-1 text-xs text-gray-500">
                  {whatsappNumber ? (
                    <>Full number: <strong>{whatsappCountryCode}{whatsappNumber}</strong></>
                  ) : (
                    'Optional field'
                  )}
                </p>
              )}
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
            {checkingDuplicates.id_number && (
              <p className="mt-1 text-xs text-blue-500">Checking availability...</p>
            )}
            {errors.id_number && !checkingDuplicates.id_number && (
              <p className="mt-1 text-sm text-red-600">{errors.id_number}</p>
            )}
            {!errors.id_number && !checkingDuplicates.id_number && (
              <p className="mt-1 text-xs text-gray-500">Digits only, minimum 5 digits</p>
            )}
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

          {/* Next of Kin Section */}
          <div className="border-t pt-6 mt-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Next of Kin Information</h3>
            <p className="text-sm text-gray-500 mb-4">Required: Please provide emergency contact information</p>
            
            <div className="space-y-4">
              {/* Next of Kin Name */}
              <div>
                <label htmlFor="next_of_kin_name" className="block text-sm font-semibold text-gray-700 mb-2">
                  Next of Kin Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="next_of_kin_name"
                  name="next_of_kin_name"
                  value={formData.next_of_kin_name}
                  onChange={handleChange}
                  className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors ${
                    errors.next_of_kin_name ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="Enter next of kin full name"
                />
                {errors.next_of_kin_name && <p className="mt-1 text-sm text-red-600">{errors.next_of_kin_name}</p>}
              </div>

              {/* Next of Kin Contact */}
              <div>
                <label htmlFor="next_of_kin_phone" className="block text-sm font-semibold text-gray-700 mb-2">
                  Next of Kin Contact <span className="text-red-500">*</span>
                </label>
                <div className="flex gap-2">
                  <select
                    value={nextOfKinCountryCode}
                    onChange={handleNextOfKinCountryCodeChange}
                    className="px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white text-sm font-medium"
                    style={{ minWidth: '140px' }}
                  >
                    <option value="+254">🇰🇪 +254</option>
                  </select>
                  <input
                    type="tel"
                    id="next_of_kin_phone"
                    name="next_of_kin_phone_number"
                    value={nextOfKinNumber}
                    onChange={handleNextOfKinNumberChange}
                    className={`flex-1 px-4 py-3 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors ${
                      errors.next_of_kin_phone ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="712345678"
                  />
                </div>
                {errors.next_of_kin_phone && <p className="mt-1 text-sm text-red-600">{errors.next_of_kin_phone}</p>}
                <p className="mt-1 text-xs text-gray-500">
                  {nextOfKinNumber ? (
                    <>Full number: <strong>{nextOfKinCountryCode}{nextOfKinNumber}</strong></>
                  ) : (
                    'Optional field'
                  )}
                </p>
              </div>

              {/* Next of Kin Relationship */}
              <div>
                <label htmlFor="next_of_kin_relationship" className="block text-sm font-semibold text-gray-700 mb-2">
                  Relationship <span className="text-red-500">*</span>
                </label>
                <select
                  id="next_of_kin_relationship"
                  name="next_of_kin_relationship"
                  value={formData.next_of_kin_relationship}
                  onChange={handleChange}
                  className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors ${
                    errors.next_of_kin_relationship ? 'border-red-500' : 'border-gray-300'
                  }`}
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
                {errors.next_of_kin_relationship && <p className="mt-1 text-sm text-red-600">{errors.next_of_kin_relationship}</p>}
              </div>
            </div>
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
              disabled={isSubmitting || !isFormValid()}
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

