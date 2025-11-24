export const ROLES = {
  SUPER_ADMIN: 'super_admin',
  CHAIRMAN: 'chairman',
  SECRETARY: 'secretary',
  TREASURER: 'treasurer',
  GROUP_TREASURER: 'group_treasurer',
  ACCOUNTANT: 'accountant',
  IT_SUPPORT: 'it_support',
  MEMBER: 'member',
  GUEST: 'guest',
}

export const ROLE_LABELS = {
  [ROLES.SUPER_ADMIN]: 'Super Admin',
  [ROLES.CHAIRMAN]: 'Chairman',
  [ROLES.SECRETARY]: 'Secretary',
  [ROLES.TREASURER]: 'Treasurer',
  [ROLES.GROUP_TREASURER]: 'Group Treasurer',
  [ROLES.ACCOUNTANT]: 'Accountant',
  [ROLES.IT_SUPPORT]: 'IT & Support',
  [ROLES.MEMBER]: 'Member',
  [ROLES.GUEST]: 'Guest / Auditor',
}

export const ROLE_PRIORITY = [
  ROLES.SUPER_ADMIN,
  ROLES.CHAIRMAN,
  ROLES.TREASURER,
  ROLES.GROUP_TREASURER,
  ROLES.ACCOUNTANT,
  ROLES.SECRETARY,
  ROLES.IT_SUPPORT,
  ROLES.MEMBER,
  ROLES.GUEST,
]

export const hasRole = (user, allowedRoles = []) => {
  if (!allowedRoles.length) return true
  const roles = user?.roles ?? []
  return roles.some((role) => allowedRoles.includes(role))
}

export const useRoleBadge = (role) => {
  switch (role) {
    case ROLES.SUPER_ADMIN:
      return 'bg-brand-100 text-brand-700'
    case ROLES.CHAIRMAN:
      return 'bg-amber-100 text-amber-700'
    case ROLES.TREASURER:
    case ROLES.GROUP_TREASURER:
      return 'bg-emerald-100 text-emerald-700'
    case ROLES.ACCOUNTANT:
      return 'bg-sky-100 text-sky-700'
    case ROLES.SECRETARY:
      return 'bg-fuchsia-100 text-fuchsia-700'
    case ROLES.IT_SUPPORT:
      return 'bg-slate-200 text-slate-800'
    default:
      return 'bg-slate-100 text-slate-600'
  }
}

