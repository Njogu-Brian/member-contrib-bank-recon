import api from './axios'

export const getSettings = async () => {
  const response = await api.get('/admin/settings')
  return response.data
}

export const updateSettings = (data) => {
  const formData = new FormData()
  
  console.log('Creating FormData with data:', {
    hasLogo: data.logo instanceof File,
    hasFavicon: data.favicon instanceof File,
    logoName: data.logo instanceof File ? data.logo.name : null,
    faviconName: data.favicon instanceof File ? data.favicon.name : null,
  })
  
  // Add contribution settings directly
  if (data.contribution_start_date !== undefined) {
    formData.append('contribution_start_date', data.contribution_start_date || '')
  }
  if (data.weekly_contribution_amount !== undefined) {
    formData.append('weekly_contribution_amount', String(data.weekly_contribution_amount || ''))
  }
  
  // Add file uploads - MUST come after other fields for proper FormData handling
  if (data.logo instanceof File) {
    formData.append('logo', data.logo, data.logo.name)
    console.log('Added logo to FormData:', data.logo.name, data.logo.size, 'bytes')
  }
  if (data.favicon instanceof File) {
    formData.append('favicon', data.favicon, data.favicon.name)
    console.log('Added favicon to FormData:', data.favicon.name, data.favicon.size, 'bytes')
  }
  
  // Add other settings as nested object if provided
  if (data.settings && typeof data.settings === 'object') {
    Object.keys(data.settings).forEach(key => {
      if (data.settings[key] !== undefined && data.settings[key] !== null) {
        formData.append(`settings[${key}]`, data.settings[key])
      }
    })
  }
  
  // Also add direct fields for app_name, currency, etc. (for backward compatibility)
  const directFields = ['app_name', 'app_description', 'timezone', 'date_format', 'currency', 
                       'default_currency', 'multi_currency_enabled', 'theme_primary_color',
                       'theme_secondary_color', 'login_background_color', 'login_text_color']
  
  directFields.forEach(field => {
    if (data[field] !== undefined && data[field] !== null && data[field] !== '') {
      formData.append(field, String(data[field]))
      console.log(`Added ${field} to FormData:`, data[field])
    }
  })
  
  // Add boolean fields
  const booleanFields = ['mpesa_enabled', 'sms_enabled', 'fcm_enabled', 'pdf_service_enabled',
                        'bulk_bank_enabled', 'ocr_matching_enabled', 'require_mfa']
  
  booleanFields.forEach(field => {
    if (data[field] !== undefined) {
      formData.append(field, data[field] ? '1' : '0')
    }
  })
  
  // Debug: Log FormData contents
  console.log('FormData entries:')
  for (let pair of formData.entries()) {
    if (pair[1] instanceof File) {
      console.log(`  ${pair[0]}: [File] ${pair[1].name} (${pair[1].size} bytes)`)
    } else {
      console.log(`  ${pair[0]}: ${pair[1]}`)
    }
  }
  
  // Use POST instead of PUT for file uploads (better compatibility)
  // Don't set Content-Type header - let browser set it with boundary
  // This is critical for multipart/form-data uploads
  return api.post('/admin/settings', formData, {
    headers: {
      'Accept': 'application/json',
      // Explicitly don't set Content-Type for FormData
    },
    // Ensure axios processes FormData correctly
    transformRequest: [(data) => data], // Don't transform FormData
  })
}

