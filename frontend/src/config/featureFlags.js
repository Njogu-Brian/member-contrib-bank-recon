const flag = (value, fallback = true) => {
  if (value === undefined || value === null) return fallback
  return value === 'true' || value === true || value === 1 || value === '1'
}

export const featureFlags = {
  mpesa: flag(import.meta.env.VITE_MPESA_ENABLED, false),
  sms: flag(import.meta.env.VITE_SMS_ENABLED, false),
  fcm: flag(import.meta.env.VITE_FCM_ENABLED, false),
  pdfService: flag(import.meta.env.VITE_PDF_SERVICE_ENABLED, true),
  bankFeeds: flag(import.meta.env.VITE_BANK_FEEDS_ENABLED, false),
}

