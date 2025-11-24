import { Link } from 'react-router-dom'

export default function Unauthorized() {
  return (
    <div className="mx-auto max-w-lg py-24 text-center">
      <div className="mb-6 inline-flex h-16 w-16 items-center justify-center rounded-full bg-rose-50 text-rose-500">
        <span className="text-2xl font-semibold">!</span>
      </div>
      <h1 className="text-2xl font-semibold text-slate-900 mb-2">Insufficient permissions</h1>
      <p className="text-slate-600 mb-6">
        Your current role does not allow access to this section. Please contact a Super Admin if you
        believe this is in error.
      </p>
      <Link
        to="/"
        className="inline-flex items-center justify-center rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
      >
        Go back to dashboard
      </Link>
    </div>
  )
}

