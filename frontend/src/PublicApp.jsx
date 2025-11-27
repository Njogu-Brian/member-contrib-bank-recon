import { Routes, Route } from 'react-router-dom'
import PublicStatement from './pages/PublicStatement'

/**
 * Standalone app for public routes - completely bypasses authentication
 * This is used when the route starts with /s/ or /public/
 */
export default function PublicApp() {
  return (
    <Routes>
      <Route path="/s/:token" element={<PublicStatement />} />
      <Route path="*" element={
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center p-6 bg-white rounded-lg shadow-md">
            <h2 className="text-2xl font-bold text-gray-800">Invalid Link</h2>
            <p className="mt-2 text-gray-700">The statement link is invalid or has expired.</p>
          </div>
        </div>
      } />
    </Routes>
  )
}

