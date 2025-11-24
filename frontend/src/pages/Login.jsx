import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { login } from '../api/auth'

export default function Login() {
  const [formData, setFormData] = useState({ email: '', password: '' })
  const [error, setError] = useState('')
  const navigate = useNavigate()

  const loginMutation = useMutation({
    mutationFn: () => login(formData.email, formData.password),
    onSuccess: () => {
      setError('')
      navigate('/')
    },
    onError: (err) => {
      setError(err.response?.data?.message ?? 'Invalid credentials. Please try again.')
    },
  })

  const handleSubmit = (event) => {
    event.preventDefault()
    loginMutation.mutate()
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <div className="grid min-h-screen gap-0 lg:grid-cols-2">
        <div className="relative hidden flex-col justify-between bg-gradient-to-br from-brand-600 via-indigo-700 to-slate-900 px-10 py-12 lg:flex">
          <div>
            <p className="text-sm uppercase tracking-widest text-white/60">Evimeria Group</p>
            <h1 className="mt-4 text-4xl font-semibold leading-tight">
              Finance & governance portal for modern chamas.
            </h1>
            <p className="mt-4 text-white/80">
              Reconcile statements, approve payouts, and keep your members informed in real time.
            </p>
          </div>
          <div className="rounded-3xl bg-white/10 p-6 backdrop-blur">
            <p className="text-sm uppercase tracking-widest text-white/70">Live snapshot</p>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <div>
                <p className="text-xs text-white/60">Pending approvals</p>
                <p className="text-2xl font-semibold">8</p>
              </div>
              <div>
                <p className="text-xs text-white/60">Today’s inflow</p>
                <p className="text-2xl font-semibold">KES 1.2M</p>
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col justify-center px-6 py-12 sm:px-12 lg:px-16">
          <div className="mx-auto w-full max-w-md space-y-8">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-brand-600">
                Staff access
              </p>
              <h2 className="mt-2 text-3xl font-semibold text-slate-900">
                Sign in to Evimeria Portal
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Enter the administrator credentials assigned to you. Need help? Contact Super Admin.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="glass space-y-5 rounded-3xl border px-6 py-8">
              {error && (
                <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600">
                  {error}
                </div>
              )}

              <div className="space-y-2">
                <label htmlFor="email" className="text-sm font-medium text-slate-700">
                  Work email
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 placeholder:text-slate-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
                  placeholder="you@evimeria.africa"
                  value={formData.email}
                  onChange={(e) => setFormData((prev) => ({ ...prev, email: e.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="password" className="text-sm font-medium text-slate-700">
                  Password
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 placeholder:text-slate-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={(e) => setFormData((prev) => ({ ...prev, password: e.target.value }))}
                />
              </div>

              <div className="flex items-center justify-between text-sm text-slate-500">
                <span>Protected with MFA</span>
                <button type="button" className="font-medium text-brand-600 hover:text-brand-700">
                  Forgot access?
                </button>
              </div>

              <button
                type="submit"
                disabled={loginMutation.isPending}
                className="w-full rounded-2xl bg-brand-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-brand-600/30 transition hover:bg-brand-700 disabled:opacity-60"
              >
                {loginMutation.isPending ? 'Signing in…' : 'Sign in'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}
