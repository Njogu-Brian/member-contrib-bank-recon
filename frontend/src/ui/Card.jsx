import PropTypes from 'prop-types'

export default function Card({ title, badge, footer, children }) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-card">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-base font-semibold text-slate-900">{title}</h3>
        {badge && (
          <span className="rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-700">
            {badge}
          </span>
        )}
      </div>
      <div className="mt-4 text-sm text-slate-600">{children}</div>
      {footer && <p className="mt-4 text-xs uppercase tracking-wide text-slate-400">{footer}</p>}
    </div>
  )
}

Card.propTypes = {
  title: PropTypes.string.isRequired,
  badge: PropTypes.string,
  footer: PropTypes.string,
  children: PropTypes.node.isRequired,
}

