import PropTypes from 'prop-types'

export default function Stat({ label, value, badge }) {
  return (
    <div className="rounded-3xl border border-white bg-white/80 p-5 shadow-card">
      <p className="stat-label">{label}</p>
      <p className="stat-value mt-2">{value}</p>
      {badge && <p className="text-xs font-medium text-emerald-600">{badge}</p>}
    </div>
  )
}

Stat.propTypes = {
  label: PropTypes.string.isRequired,
  value: PropTypes.string.isRequired,
  badge: PropTypes.string,
}

