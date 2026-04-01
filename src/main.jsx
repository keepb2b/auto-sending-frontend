import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import axios from 'axios'
import App from './App'
import './index.css'

const rawApi = import.meta.env.VITE_API_BASE_URL
const apiBase = typeof rawApi === 'string' ? rawApi.trim() : ''
if (apiBase) {
  axios.defaults.baseURL = apiBase
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>,
)
