/**
 * Visual health score indicator (0–100) with three colour bands:
 *   0–49   red    (AT_RISK / INACTIVE)
 *   50–79  amber  (AT_RISK)
 *  80–100  green  (HEALTHY / HIGH_VALUE)
 */
export function HealthScoreGauge({ score }: { score: number }) {
  const clampedScore = Math.max(0, Math.min(100, score))

  const color =
    clampedScore >= 80
      ? { track: '#dcfce7', fill: '#22c55e', text: '#16a34a' }
      : clampedScore >= 50
        ? { track: '#fef9c3', fill: '#eab308', text: '#a16207' }
        : { track: '#fee2e2', fill: '#ef4444', text: '#dc2626' }

  const radius = 42
  const circumference = 2 * Math.PI * radius
  // We use 270° of arc (leaving a 90° gap at the bottom) for a more gauge-like look.
  const arcFraction = 0.75
  const dashArray = circumference * arcFraction
  const dashOffset = dashArray - (clampedScore / 100) * dashArray
  const rotation = 135 // rotate so the gap sits at the bottom

  return (
    <div className="flex flex-col items-center gap-2">
      <svg width={120} height={120} viewBox="0 0 100 100" aria-label={`Health score: ${clampedScore}`}>
        {/* Track */}
        <circle
          cx={50}
          cy={50}
          r={radius}
          fill="none"
          stroke={color.track}
          strokeWidth={10}
          strokeDasharray={`${dashArray} ${circumference - dashArray}`}
          strokeDashoffset={0}
          strokeLinecap="round"
          transform={`rotate(${rotation} 50 50)`}
        />
        {/* Filled arc */}
        <circle
          cx={50}
          cy={50}
          r={radius}
          fill="none"
          stroke={color.fill}
          strokeWidth={10}
          strokeDasharray={`${dashArray} ${circumference - dashArray}`}
          strokeDashoffset={dashOffset}
          strokeLinecap="round"
          transform={`rotate(${rotation} 50 50)`}
          style={{ transition: 'stroke-dashoffset 0.6s ease' }}
        />
        {/* Score label */}
        <text
          x={50}
          y={54}
          textAnchor="middle"
          fontSize={22}
          fontWeight={700}
          fill={color.text}
          fontFamily="inherit"
        >
          {clampedScore}
        </text>
        <text x={50} y={68} textAnchor="middle" fontSize={9} fill="#6b7280" fontFamily="inherit">
          / 100
        </text>
      </svg>

      {/* Band legend */}
      <div className="flex gap-3 text-xs text-muted-foreground">
        <span className="flex items-center gap-1">
          <span className="inline-block w-2 h-2 rounded-full bg-destructive-solid" />
          0–49
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block w-2 h-2 rounded-full bg-warning" />
          50–79
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block w-2 h-2 rounded-full bg-success" />
          80–100
        </span>
      </div>
    </div>
  )
}
