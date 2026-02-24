function StatCard({ title, value, icon, trend, trendLabel, color = "blue" }) {
  const colors = {
    blue:   { bg: "bg-blue-50",   icon: "text-blue-500",   trend: "text-blue-600"   },
    emerald:{ bg: "bg-emerald-50",icon: "text-emerald-500",trend: "text-emerald-600" },
    red:    { bg: "bg-red-50",    icon: "text-red-500",    trend: "text-red-600"     },
    amber:  { bg: "bg-amber-50",  icon: "text-amber-500",  trend: "text-amber-600"   },
    purple: { bg: "bg-purple-50", icon: "text-purple-500", trend: "text-purple-600"  },
    gray:   { bg: "bg-gray-100",  icon: "text-gray-500",   trend: "text-gray-600"   },
  };

  const c = colors[color] || colors.blue;

  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-5 flex flex-col gap-3 hover:shadow-sm transition-shadow">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">{title}</p>
        {icon && (
          <div className={`w-8 h-8 rounded-xl ${c.bg} flex items-center justify-center shrink-0`}>
            <svg className={`w-4 h-4 ${c.icon}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d={icon} />
            </svg>
          </div>
        )}
      </div>

      <p className="text-3xl font-bold text-gray-800 leading-none">{value}</p>

      {(trend !== undefined || trendLabel) && (
        <p className={`text-xs font-medium ${c.trend}`}>
          {trend !== undefined && (
            <span className="mr-1">{trend >= 0 ? "↑" : "↓"} {Math.abs(trend)}%</span>
          )}
          {trendLabel && <span className="text-gray-400">{trendLabel}</span>}
        </p>
      )}
    </div>
  );
}

export default StatCard;