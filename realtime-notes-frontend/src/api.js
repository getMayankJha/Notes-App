import axios from 'axios'

const api = axios.create({
  baseURL: '/api', // vite proxy routes this to http://localhost:4000/api
  withCredentials: true
})

// helper to set Authorization header
export function setAuthToken(token) {
  if (token) api.defaults.headers.common['Authorization'] = `Bearer ${token}`
  else delete api.defaults.headers.common['Authorization']
}

export default api
