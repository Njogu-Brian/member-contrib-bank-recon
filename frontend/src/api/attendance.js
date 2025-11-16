import api from './axios'

export const getAttendanceUploads = async (params = {}) => {
  const cleanParams = Object.fromEntries(
    Object.entries(params).filter(([_, value]) => value !== '' && value !== null && value !== undefined)
  )
  const response = await api.get('/attendance-uploads', { params: cleanParams })
  return response.data
}

export const uploadAttendance = async ({ file, meeting_date, notes }) => {
  const formData = new FormData()
  formData.append('file', file)
  if (meeting_date) {
    formData.append('meeting_date', meeting_date)
  }
  if (notes) {
    formData.append('notes', notes)
  }

  const response = await api.post('/attendance-uploads', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return response.data
}

export const deleteAttendanceUpload = async (id) => {
  const response = await api.delete(`/attendance-uploads/${id}`)
  return response.data
}

export const downloadAttendanceUpload = async (id) => {
  const response = await api.get(`/attendance-uploads/${id}/download`, {
    responseType: 'blob',
  })
  return response
}


