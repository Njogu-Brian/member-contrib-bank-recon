import api from './axios'

export const login = async (email, password) => {
  try {
    const response = await api.post('/login', { email, password })
    if (response.data.token) {
      localStorage.setItem('token', response.data.token)
    }
    return response.data
  } catch (error) {
    console.error('Login error:', error)
    throw error
  }
}

export const register = async (name, email, password, password_confirmation) => {
  try {
    const response = await api.post('/register', { name, email, password, password_confirmation })
    if (response.data.token) {
      localStorage.setItem('token', response.data.token)
    }
    return response.data
  } catch (error) {
    console.error('Register error:', error)
    throw error
  }
}

export const logout = async () => {
  await api.post('/logout')
  localStorage.removeItem('token')
}

export const getUser = async () => {
  const response = await api.get('/user')
  return response.data
}

