import axios from './axios'

export const getSettings = () => {
  return axios.get('/settings')
}

export const updateSettings = (data) => {
  return axios.put('/settings', data)
}

