/**
 * Shared utility functions used across the application
 */

/**
 * Format number as currency
 */
export const currency = (value = 0, currency = 'KES') => {
  const numeric = Number(value ?? 0)
  return numeric.toLocaleString('en-KE', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  })
}

/**
 * Format number with thousand separators
 */
export const number = (value = 0) => {
  const numeric = Number(value ?? 0)
  return numeric.toLocaleString()
}

/**
 * Build badge style from hex color
 */
export const buildBadgeStyle = (hex) => {
  if (!hex) return {}
  let normalized = hex.trim()
  if (!normalized.startsWith('#')) {
    normalized = `#${normalized}`
  }
  if (normalized.length === 4) {
    normalized = `#${normalized[1]}${normalized[1]}${normalized[2]}${normalized[2]}${normalized[3]}${normalized[3]}`
  }
  if (normalized.length !== 7) {
    return { color: normalized }
  }
  const r = parseInt(normalized.slice(1, 3), 16)
  const g = parseInt(normalized.slice(3, 5), 16)
  const b = parseInt(normalized.slice(5, 7), 16)
  return {
    color: `rgb(${r}, ${g}, ${b})`,
    backgroundColor: `rgba(${r}, ${g}, ${b}, 0.12)`,
    borderColor: `rgba(${r}, ${g}, ${b}, 0.2)`,
  }
}

/**
 * Download blob as file
 */
export const downloadBlob = (blob, filename) => {
  const url = window.URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  window.URL.revokeObjectURL(url)
}

/**
 * Format date for display
 */
export const formatDate = (date, format = 'YYYY-MM-DD') => {
  if (!date) return ''
  const d = new Date(date)
  if (isNaN(d.getTime())) return ''
  
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  const hours = String(d.getHours()).padStart(2, '0')
  const minutes = String(d.getMinutes()).padStart(2, '0')
  const seconds = String(d.getSeconds()).padStart(2, '0')
  
  return format
    .replace('YYYY', year)
    .replace('MM', month)
    .replace('DD', day)
    .replace('HH', hours)
    .replace('mm', minutes)
    .replace('ss', seconds)
}

/**
 * Format date time for display
 */
export const formatDateTime = (date) => {
  return formatDate(date, 'YYYY-MM-DD HH:mm:ss')
}

/**
 * Get file extension from filename
 */
export const getFileExtension = (filename) => {
  return filename?.split('.').pop()?.toLowerCase() || ''
}

/**
 * Get MIME type from file extension
 */
export const getMimeType = (extension) => {
  const mimeTypes = {
    pdf: 'application/pdf',
    xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    xls: 'application/vnd.ms-excel',
    csv: 'text/csv',
    json: 'application/json',
  }
  return mimeTypes[extension.toLowerCase()] || 'application/octet-stream'
}

