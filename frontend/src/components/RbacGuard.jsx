import PropTypes from 'prop-types'
import { hasRole } from '../lib/rbac'
import { useAuthContext } from '../context/AuthContext'

export default function RbacGuard({ roles, children, fallback = null }) {
  const { user } = useAuthContext()
  if (!hasRole(user, roles)) {
    return fallback
  }
  return children
}

RbacGuard.propTypes = {
  roles: PropTypes.arrayOf(PropTypes.string),
  children: PropTypes.node.isRequired,
  fallback: PropTypes.node,
}

RbacGuard.defaultProps = {
  roles: [],
  fallback: null,
}

