export default function PageHeader({ 
  title, 
  description, 
  metric, 
  metricLabel,
  gradient = 'from-indigo-600 to-purple-600',
  children 
}) {
  return (
    <div className={`bg-gradient-to-r ${gradient} rounded-2xl shadow-xl p-8 text-white`}>
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <h1 className="text-3xl font-bold mb-2">{title}</h1>
          {description && (
            <p className="text-white/90 text-lg">{description}</p>
          )}
        </div>
        {(metric !== undefined || children) && (
          <div className="hidden lg:block text-right">
            {children || (
              <>
                {metricLabel && <div className="text-sm text-white/70">{metricLabel}</div>}
                {metric !== undefined && <div className="text-4xl font-bold">{metric}</div>}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

