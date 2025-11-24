import { Fragment, useMemo, useState } from 'react'
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom'
import { Dialog, Transition } from '@headlessui/react'
import {
  HiOutlineBars3,
  HiOutlineXMark,
  HiOutlineMagnifyingGlass,
  HiOutlineBellAlert,
  HiOutlineArrowRightCircle,
  HiOutlineChevronDown,
  HiOutlineChevronRight,
} from 'react-icons/hi2'
import MemberSearchModal from './MemberSearchModal'
import { NAVIGATION } from '../config/navigation'
import { featureFlags } from '../config/featureFlags'
import { useAuthContext } from '../context/AuthContext'
import { hasRole, ROLE_LABELS, useRoleBadge } from '../lib/rbac'

const quickActions = [
  { label: 'Record contribution', path: '/manual-contributions' },
  { label: 'Upload statement', path: '/statements' },
  { label: 'Schedule meeting', path: '/meetings' },
]

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [showMemberStatementModal, setShowMemberStatementModal] = useState(false)
  const [expandedMenus, setExpandedMenus] = useState({})
  const location = useLocation()
  const navigate = useNavigate()
  const { user, roles, logout } = useAuthContext()

  const initials = user?.name
    ? user.name
        .split(' ')
        .slice(0, 2)
        .map((part) => part[0])
        .join('')
        .toUpperCase()
    : 'EV'

  const navigation = useMemo(
    () =>
      NAVIGATION.map((section) => ({
        ...section,
        items: section.items.filter((item) => hasRole(user, item.roles ?? [])),
      })).filter((section) => section.items.length > 0),
    [user]
  )

  const activePath = location.pathname

  const toggleSubmenu = (itemPath) => {
    setExpandedMenus((prev) => ({
      ...prev,
      [itemPath]: !prev[itemPath],
    }))
  }

  const renderNavItems = (onNavigate) =>
    navigation.map((section) => (
      <div key={section.title} className="mb-6">
        <p className="px-4 text-xs font-semibold uppercase tracking-widest text-slate-300">
          {section.title}
        </p>
        <div className="mt-3 space-y-1">
          {section.items.map((item) => {
            const isActive =
              item.path === '/'
                ? activePath === '/'
                : activePath === item.path || activePath.startsWith(`${item.path}/`)
            const hasSubmenu = item.submenu && item.submenu.length > 0
            const isExpanded = expandedMenus[item.path] ?? (hasSubmenu && isActive)
            const Icon = item.icon
            
            // Check if any submenu item is active
            const hasActiveSubmenu = hasSubmenu && item.submenu.some(
              (sub) => activePath === sub.path || activePath.startsWith(`${sub.path}/`)
            )
            
            return (
              <div key={item.path}>
                <div className="flex items-center">
                  <Link
                    to={item.path}
                    onClick={() => {
                      if (hasSubmenu) {
                        toggleSubmenu(item.path)
                      } else {
                        onNavigate?.()
                      }
                    }}
                    className={`group flex flex-1 items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-medium transition-all ${
                      isActive || hasActiveSubmenu
                        ? 'bg-white text-brand-600 shadow-sm'
                        : 'text-slate-200 hover:bg-white/10 hover:text-white'
                    }`}
                  >
                    <Icon className="h-5 w-5" />
                    <span>{item.label}</span>
                    {hasSubmenu ? (
                      isExpanded ? (
                        <HiOutlineChevronDown className="ml-auto h-4 w-4" />
                      ) : (
                        <HiOutlineChevronRight className="ml-auto h-4 w-4" />
                      )
                    ) : (
                      <HiOutlineArrowRightCircle
                        className={`ml-auto h-4 w-4 transition-opacity ${
                          isActive ? 'text-brand-500 opacity-60' : 'text-slate-400 opacity-0 group-hover:opacity-60'
                        }`}
                      />
                    )}
                  </Link>
                </div>
                {hasSubmenu && isExpanded && (
                  <div className="mt-1 ml-4 space-y-1 border-l-2 border-white/10 pl-2">
                    {item.submenu.map((subItem) => {
                      const isSubActive = activePath === subItem.path || activePath.startsWith(`${subItem.path}/`)
                      return (
                        <Link
                          key={subItem.path}
                          to={subItem.path}
                          onClick={() => onNavigate?.()}
                          className={`block rounded-lg px-4 py-2 text-sm transition-all ${
                            isSubActive
                              ? 'bg-white/20 text-white font-medium'
                              : 'text-slate-300 hover:bg-white/10 hover:text-white'
                          }`}
                        >
                          {subItem.label}
                        </Link>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    ))

  return (
    <div className="min-h-screen bg-slate-100">
      {/* Mobile sidebar */}
      <Transition.Root show={sidebarOpen} as={Fragment}>
        <Dialog as="div" className="relative z-40 lg:hidden" onClose={setSidebarOpen}>
          <Transition.Child
            as={Fragment}
            enter="transition-opacity ease-linear duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="transition-opacity ease-linear duration-300"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-slate-900/70" />
          </Transition.Child>

          <div className="fixed inset-0 z-40 flex">
            <Transition.Child
              as={Fragment}
              enter="transition ease-in-out duration-300 transform"
              enterFrom="-translate-x-full"
              enterTo="translate-x-0"
              leave="transition ease-in-out duration-300 transform"
              leaveFrom="translate-x-0"
              leaveTo="-translate-x-full"
            >
              <Dialog.Panel className="relative mr-16 flex w-full max-w-xs flex-1 flex-col bg-slate-900 px-4 pb-6 pt-6 shadow-xl">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-lg font-semibold text-white">Evimeria Portal</p>
                    <p className="text-xs text-slate-400">Admin Console</p>
                  </div>
                  <button
                    type="button"
                    className="rounded-md p-2 text-slate-400 hover:text-white focus:outline-none"
                    onClick={() => setSidebarOpen(false)}
                  >
                    <span className="sr-only">Close sidebar</span>
                    <HiOutlineXMark className="h-6 w-6" aria-hidden="true" />
                  </button>
                </div>
                <div className="mt-8 flex-1 overflow-y-auto">
                  {renderNavItems(() => setSidebarOpen(false))}
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </Dialog>
      </Transition.Root>

      {/* Desktop sidebar */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:z-30 lg:flex lg:w-72">
        <div className="flex h-screen w-full flex-col border-r border-slate-800 bg-slate-900 text-white shadow-2xl">
          <div className="flex h-20 items-center gap-3 border-b border-white/10 px-6">
            <div className="rounded-2xl bg-white/10 p-3 text-white">
              <span className="text-xl font-bold">EV</span>
            </div>
            <div>
              <p className="text-sm font-semibold text-white">Evimeria Group</p>
              <p className="text-xs text-slate-300">Management Portal</p>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto px-3 pb-6 pt-6">{renderNavItems()}</div>
          <div className="border-t border-white/10 px-6 py-4">
            <div className="flex items-center gap-3 rounded-2xl bg-white/10 px-4 py-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/20 text-white">
                {initials}
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-white">{user?.name}</p>
                <div className="flex flex-wrap items-center gap-1 text-xs text-slate-200">
                  {roles.map((role) => (
                    <span
                      key={role}
                      className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${useRoleBadge(role)}`}
                    >
                      {ROLE_LABELS[role] ?? role}
                    </span>
                  ))}
                </div>
              </div>
            </div>
            <button
              onClick={logout}
              className="mt-3 w-full rounded-xl border border-white/30 px-4 py-2 text-sm font-medium text-white hover:bg-white/10"
            >
              Sign out
            </button>
          </div>
        </div>
      </div>

      <div className="lg:pl-72">
        <div className="sticky top-0 z-20 flex items-center justify-between border-b border-slate-200 bg-white/90 px-4 py-4 shadow-sm backdrop-blur lg:px-10">
          <div className="flex items-center gap-2 lg:hidden">
            <button
              type="button"
              className="rounded-xl border border-slate-200 p-2 text-slate-600"
              onClick={() => setSidebarOpen(true)}
            >
              <HiOutlineBars3 className="h-6 w-6" />
            </button>
            <div>
              <p className="text-sm font-semibold text-slate-900">Evimeria Portal</p>
              <p className="text-xs text-slate-500">Admin Console</p>
            </div>
          </div>
          <div className="hidden lg:flex items-center gap-3">
            <div className="relative">
              <HiOutlineMagnifyingGlass className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
              <input
                type="search"
                placeholder="Search members, wallets, reports..."
                className="w-80 rounded-2xl border border-slate-200 bg-white px-10 py-2 text-sm placeholder:text-slate-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
                onFocus={() => setShowMemberStatementModal(true)}
                readOnly
              />
            </div>
            <button
              onClick={() => setShowMemberStatementModal(true)}
              className="hidden rounded-2xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 xl:block"
            >
              Quick member lookup
            </button>
          </div>
          <div className="flex items-center gap-3">
            <button className="rounded-full border border-slate-200 p-2 text-slate-500 hover:text-brand-600">
              <HiOutlineBellAlert className="h-5 w-5" />
            </button>
            <div className="hidden text-right lg:block">
              <p className="text-sm font-semibold text-slate-900">{user?.name}</p>
              <p className="text-xs text-slate-500">{ROLE_LABELS[roles?.[0]] ?? 'Team member'}</p>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-600/10 text-sm font-semibold text-brand-700">
              {initials}
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-r from-brand-600 to-indigo-600 px-4 py-8 text-white shadow-lg lg:px-10">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-sm uppercase tracking-widest text-white/70">Today’s status</p>
              <h1 className="mt-2 text-2xl font-semibold leading-tight">
                Welcome back, {user?.first_name ?? user?.name?.split(' ')[0] ?? 'team'} 👋
              </h1>
              <p className="mt-1 text-white/80">
                Track contributions, reconcile statements, and manage governance from one command
                center.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              {quickActions.map((action) => (
                <button
                  key={action.label}
                  onClick={() => navigate(action.path)}
                  className="rounded-2xl bg-white/10 px-4 py-2 text-sm font-medium backdrop-blur hover:bg-white/20"
                >
                  {action.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {!featureFlags.mpesa || !featureFlags.sms || !featureFlags.fcm ? (
          <div className="border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700 lg:mx-10 lg:rounded-2xl">
            <p className="font-semibold">Sand-box mode</p>
            <p>
              Live integrations disabled:{' '}
              {[
                !featureFlags.mpesa && 'MPESA',
                !featureFlags.sms && 'Bulk SMS',
                !featureFlags.fcm && 'Push notifications',
              ]
                .filter(Boolean)
                .join(', ')}
              . Provide credentials in `.env` to unlock full workflow.
            </p>
          </div>
        ) : null}

        <main className="px-4 py-6 lg:px-10 lg:py-10">
          <Outlet />
        </main>
      </div>

      <MemberSearchModal
        isOpen={showMemberStatementModal}
        onClose={() => setShowMemberStatementModal(false)}
        onSelect={(member) => {
          setShowMemberStatementModal(false)
          if (member?.id) {
            navigate(`/members/${member.id}`)
          }
        }}
        title="Quick member lookup"
      />
    </div>
  )
}
