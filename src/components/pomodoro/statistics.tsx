'use client'

import { useMemo, useState, useEffect, useCallback } from 'react'
import { usePomodoroStore } from '@/lib/store'
import { cn } from '@/lib/utils'
import { ClockIcon, TomatoIcon, CoffeeIcon, FlameIcon, ShareIcon } from '@/components/icons'
import { useShallow } from 'zustand/react/shallow'

type ChartMode = 'pomodoros' | 'work' | 'break' | 'total'

interface DayData {
  day: string
  date: number
  workMinutes: number
  breakMinutes: number
  pomodoros: number
  isToday: boolean
}

export function Statistics() {
  const { getTodayStats, getWeekStats, displaySettings, sessions } = usePomodoroStore(
    useShallow((state) => ({
      getTodayStats: state.getTodayStats,
      getWeekStats: state.getWeekStats,
      displaySettings: state.displaySettings,
      sessions: state.sessions,
    }))
  )
  const [mounted, setMounted] = useState(false)
  const [weekData, setWeekData] = useState<DayData[]>([])
  const [todayStats, setTodayStats] = useState({ work: 0, breaks: 0, pomodoros: 0 })
  const [chartMode, setChartMode] = useState<ChartMode>('pomodoros')
  const [hoveredDay, setHoveredDay] = useState<number | null>(null)
  const [showShareMenu, setShowShareMenu] = useState(false)

  // Format duration in hours and minutes
  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    if (hours > 0) {
      return `${hours}時間${minutes}分`
    }
    return `${minutes}分`
  }

  // Calculate week data - memoized to avoid recalculation
  const calculateWeekData = useCallback(() => {
    const weekSessions = getWeekStats()
    const days = ['日', '月', '火', '水', '木', '金', '土']
    const today = new Date()
    const data: DayData[] = []

    for (let i = 6; i >= 0; i--) {
      const date = new Date(today)
      date.setDate(date.getDate() - i)
      date.setHours(0, 0, 0, 0)
      const nextDate = new Date(date)
      nextDate.setDate(nextDate.getDate() + 1)

      const daySessions = weekSessions.filter(
        (s) => s.completedAt >= date.getTime() && s.completedAt < nextDate.getTime()
      )

      const workMinutes = daySessions
        .filter((s) => s.mode === 'work')
        .reduce((acc, s) => acc + s.duration / 60, 0)

      const breakMinutes = daySessions
        .filter((s) => s.mode === 'shortBreak' || s.mode === 'longBreak')
        .reduce((acc, s) => acc + s.duration / 60, 0)

      data.push({
        day: days[date.getDay()],
        date: date.getDate(),
        workMinutes,
        breakMinutes,
        pomodoros: daySessions.filter((s) => s.mode === 'work').length,
        isToday: i === 0,
      })
    }

    return data
  }, [getWeekStats])

  // Calculate data only on client side to avoid hydration mismatch
  useEffect(() => {
    setMounted(true)
    setWeekData(calculateWeekData())
    setTodayStats(getTodayStats())
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Update data when sessions change (after mount)
  useEffect(() => {
    if (mounted) {
      setWeekData(calculateWeekData())
      setTodayStats(getTodayStats())
    }
  }, [sessions.length, mounted, calculateWeekData, getTodayStats])

  const chartValues = useMemo(() => {
    return weekData.map((d) => {
      switch (chartMode) {
        case 'pomodoros': return d.pomodoros
        case 'work': return d.workMinutes
        case 'break': return d.breakMinutes
        case 'total': return d.workMinutes + d.breakMinutes
      }
    })
  }, [weekData, chartMode])

  const maxValue = useMemo(() => {
    const max = Math.max(...chartValues, 1)
    return chartMode === 'pomodoros' ? Math.max(max, 4) : Math.max(max, 30)
  }, [chartValues, chartMode])

  const chartColor = chartMode === 'break'
    ? 'var(--timer-break)'
    : chartMode === 'total'
      ? '#f97316' // オレンジ色
      : 'var(--timer-work)'
  const chartGradientId = `areaGradient-${chartMode}`

  // Show placeholder during SSR
  if (!mounted) {
    return (
      <div className="statistics-container liquid-glass rounded-3xl p-6 w-full" suppressHydrationWarning>
        <h2 className="text-lg font-medium mb-5">{"今日の統計"}</h2>
        <div className="grid grid-cols-2 gap-3 mb-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="p-4 rounded-2xl bg-secondary/30 h-20 animate-pulse" />
          ))}
        </div>
        <div>
          <h3 className="text-sm text-muted-foreground mb-3">{"週間レポート"}</h3>
          <div className="flex items-end justify-between gap-2 h-32">
            {[...Array(7)].map((_, i) => (
              <div key={i} className="flex flex-col items-center flex-1 gap-1">
                <div className="relative w-full flex-1 flex items-end justify-center">
                  <div className="w-full max-w-[32px] rounded-t-md bg-secondary/30 h-4" />
                </div>
                <div className="flex flex-col items-center">
                  <span className="text-xs text-muted-foreground">-</span>
                  <span className="text-xs text-muted-foreground/50">-</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  // 共有用テキスト生成
  const getShareText = () => {
    const text = `本日のポモドーロ成果\n\nポモドーロ: ${todayStats.pomodoros}回\n作業時間: ${formatDuration(todayStats.work)}\n休憩時間: ${formatDuration(todayStats.breaks)}\n合計時間: ${formatDuration(todayStats.work + todayStats.breaks)}\n\n#Pomodoro #集中`
    return text
  }

  const shareToTwitter = () => {
    const text = encodeURIComponent(getShareText())
    window.open(`https://twitter.com/intent/tweet?text=${text}`, '_blank')
    setShowShareMenu(false)
  }

  const shareToLine = () => {
    const text = encodeURIComponent(getShareText())
    window.open(`https://social-plugins.line.me/lineit/share?text=${text}`, '_blank')
    setShowShareMenu(false)
  }

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(getShareText())
      alert('クリップボードにコピーしました')
    } catch {
      alert('コピーに失敗しました')
    }
    setShowShareMenu(false)
  }

  return (
    <div className="statistics-container liquid-glass rounded-3xl p-6 w-full" suppressHydrationWarning>
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-lg font-medium">{"今日の統計"}</h2>
        <div className="relative">
          <button
            onClick={() => setShowShareMenu(!showShareMenu)}
            className="p-2 rounded-full hover:bg-secondary/50 transition-colors text-muted-foreground hover:text-foreground"
            aria-label="共有"
          >
            <ShareIcon className="w-4 h-4" />
          </button>
          {showShareMenu && (
            <div className="absolute right-0 top-full mt-1 py-2 px-1 bg-popover border border-border rounded-xl shadow-lg z-50 min-w-[140px]">
              <button
                onClick={shareToTwitter}
                className="w-full px-3 py-2 text-left text-sm hover:bg-secondary/50 rounded-lg transition-colors flex items-center gap-2"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
                Twitter
              </button>
              <button
                onClick={shareToLine}
                className="w-full px-3 py-2 text-left text-sm hover:bg-secondary/50 rounded-lg transition-colors flex items-center gap-2"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63h2.386c.349 0 .63.285.63.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.06-.023.136-.033.194-.033.195 0 .375.104.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63.346 0 .628.285.628.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.348 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.282.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314"/></svg>
                LINE
              </button>
              <button
                onClick={copyToClipboard}
                className="w-full px-3 py-2 text-left text-sm hover:bg-secondary/50 rounded-lg transition-colors flex items-center gap-2"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
                URLをコピー
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Today's stats */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        <div className="p-4 rounded-2xl bg-secondary/30">
          <div className="flex items-center gap-2 text-muted-foreground mb-1">
            <TomatoIcon className="w-4 h-4 text-timer-work" />
            <span className="text-xs">ポモドーロ</span>
          </div>
          <p className="text-2xl font-medium">{todayStats.pomodoros}</p>
        </div>

        <div className="p-4 rounded-2xl bg-secondary/30">
          <div className="flex items-center gap-2 text-muted-foreground mb-1">
            <ClockIcon className="w-4 h-4 text-timer-work" />
            <span className="text-xs">作業時間</span>
          </div>
          <p className="text-2xl font-medium">{formatDuration(todayStats.work)}</p>
        </div>

        <div className="p-4 rounded-2xl bg-secondary/30">
          <div className="flex items-center gap-2 text-muted-foreground mb-1">
            <CoffeeIcon className="w-4 h-4 text-timer-break" />
            <span className="text-xs">休憩時間</span>
          </div>
          <p className="text-2xl font-medium">{formatDuration(todayStats.breaks)}</p>
        </div>

        <div className="p-4 rounded-2xl bg-secondary/30">
          <div className="flex items-center gap-2 text-muted-foreground mb-1">
            <FlameIcon className="w-4 h-4 text-orange-500" />
            <span className="text-xs">合計時間</span>
          </div>
          <p className="text-2xl font-medium">{formatDuration(todayStats.work + todayStats.breaks)}</p>
        </div>
      </div>

      {/* Week chart - smooth line chart */}
      <div className="overflow-hidden">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm text-muted-foreground">{"週間レポート"}</h3>
          <div className="flex gap-1 bg-secondary/30 rounded-lg p-0.5">
            <button
              onClick={() => setChartMode('pomodoros')}
              className={cn(
                'px-2 py-1 text-[10px] rounded-md transition-colors',
                chartMode === 'pomodoros' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
              )}
            >
              回数
            </button>
            <button
              onClick={() => setChartMode('work')}
              className={cn(
                'px-2 py-1 text-[10px] rounded-md transition-colors',
                chartMode === 'work' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
              )}
            >
              作業
            </button>
            <button
              onClick={() => setChartMode('break')}
              className={cn(
                'px-2 py-1 text-[10px] rounded-md transition-colors',
                chartMode === 'break' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
              )}
            >
              休憩
            </button>
            <button
              onClick={() => setChartMode('total')}
              className={cn(
                'px-2 py-1 text-[10px] rounded-md transition-colors',
                chartMode === 'total' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
              )}
            >
              合計
            </button>
          </div>
        </div>
        <div className="relative h-28">
          {/* Hover tooltip */}
          {hoveredDay !== null && weekData[hoveredDay] && (
            <div 
              className="absolute z-[100] px-3 py-2 bg-popover/95 border border-border rounded-xl shadow-xl text-xs pointer-events-none whitespace-nowrap backdrop-blur-md min-w-[120px]"
              style={{
                left: `${(hoveredDay / 6) * 100}%`,
                top: '-10px',
                transform: hoveredDay === 0 ? 'translateX(0%)' : hoveredDay === 6 ? 'translateX(-100%)' : 'translateX(-50%)',
              }}
            >
              <p className="font-medium mb-1">{weekData[hoveredDay].day}曜日 ({weekData[hoveredDay].date}日)</p>
              <p>ポモドーロ: {weekData[hoveredDay].pomodoros}回</p>
              <p>作業: {Math.round(weekData[hoveredDay].workMinutes)}分</p>
              <p>休憩: {Math.round(weekData[hoveredDay].breakMinutes)}分</p>
            </div>
          )}
          {/* Interactive overlay for hover detection */}
          <div className="absolute inset-0 flex z-10">
            {weekData.map((_, i) => (
              <div
                key={i}
                className="flex-1 cursor-pointer"
                onMouseEnter={() => setHoveredDay(i)}
                onMouseLeave={() => setHoveredDay(null)}
                onTouchStart={() => setHoveredDay(i)}
                onTouchEnd={() => setTimeout(() => setHoveredDay(null), 2000)}
              />
            ))}
          </div>
          {/* Line chart SVG - using percentage-based coordinates for full width responsiveness */}
          <svg className="w-full h-full" viewBox="0 0 100 90" preserveAspectRatio="none">
            {/* Grid lines */}
            <line x1="0" y1="20" x2="100" y2="20" stroke="currentColor" strokeOpacity="0.1" strokeDasharray="2 2" vectorEffect="non-scaling-stroke" />
            <line x1="0" y1="45" x2="100" y2="45" stroke="currentColor" strokeOpacity="0.1" strokeDasharray="2 2" vectorEffect="non-scaling-stroke" />
            <line x1="0" y1="70" x2="100" y2="70" stroke="currentColor" strokeOpacity="0.1" strokeDasharray="2 2" vectorEffect="non-scaling-stroke" />
            
            {/* Gradient fill under the line */}
            <defs>
              <linearGradient id={chartGradientId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={chartColor} stopOpacity="0.3" />
                <stop offset="100%" stopColor={chartColor} stopOpacity="0.05" />
              </linearGradient>
            </defs>
            
            {/* Area fill */}
            {weekData.length > 0 && (() => {
              const points = chartValues.map((value, i) => ({
                x: 7.14 + (i * 14.29),
                y: 80 - Math.max((value / maxValue) * 60, 0)
              }))
              return (
                <path
                  d={`
                    M ${points[0].x} ${points[0].y}
                    ${points.map((point, i) => {
                      if (i === 0) return ''
                      const prev = points[i - 1]
                      const cpX = (prev.x + point.x) / 2
                      return `C ${cpX} ${prev.y} ${cpX} ${point.y} ${point.x} ${point.y}`
                    }).join(' ')}
                    L ${points[points.length - 1].x} 90 L ${points[0].x} 90 Z
                  `}
                  fill={`url(#${chartGradientId})`}
                />
              )
            })()}
            
            {/* Smooth line */}
            {weekData.length > 0 && (() => {
              const points = chartValues.map((value, i) => ({
                x: 7.14 + (i * 14.29),
                y: 80 - Math.max((value / maxValue) * 60, 0)
              }))
              return (
                <path
                  d={`
                    M ${points[0].x} ${points[0].y}
                    ${points.map((point, i) => {
                      if (i === 0) return ''
                      const prev = points[i - 1]
                      const cpX = (prev.x + point.x) / 2
                      return `C ${cpX} ${prev.y} ${cpX} ${point.y} ${point.x} ${point.y}`
                    }).join(' ')}
                  `}
                  fill="none"
                  stroke={chartColor}
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  vectorEffect="non-scaling-stroke"
                />
              )
            })()}
          </svg>
          {/* Data points as absolutely positioned divs for perfect circles */}
          <div className="absolute inset-0 pointer-events-none">
            {weekData.map((day, i) => {
              const xPercent = 7.14 + (i * 14.29)
              const value = chartValues[i]
              const yPercent = ((80 - Math.max((value / maxValue) * 60, 0)) / 90) * 100
              const isHovered = hoveredDay === i
              const size = isHovered ? 10 : (day.isToday ? 8 : 6)
              return (
                <div
                  key={i}
                  className="absolute rounded-full"
                  style={{
                    left: `${xPercent}%`,
                    top: `${yPercent}%`,
                    width: size,
                    height: size,
                    transform: 'translate(-50%, -50%)',
                    backgroundColor: isHovered || day.isToday ? chartColor : 'var(--background)',
                    border: isHovered || day.isToday ? 'none' : `1.5px solid ${chartColor}`,
                    transition: 'width 0.15s, height 0.15s',
                  }}
                />
              )
            })}
          </div>
          {/* Value labels positioned absolutely on top */}
          <div className="absolute inset-0 flex pointer-events-none">
            {weekData.map((day, i) => {
              const value = chartValues[i]
              const y = 80 - Math.max((value / maxValue) * 60, 0)
              const displayValue = chartMode === 'pomodoros' 
                ? value 
                : Math.round(value)
              return (
                <div key={i} className="flex-1 relative">
                  {displayValue > 0 && (
                    <span
                      className="absolute left-1/2 -translate-x-1/2 text-[9px] text-muted-foreground whitespace-nowrap"
                      style={{ top: `${(y - 12) / 90 * 100}%` }}
                    >
                      {chartMode === 'pomodoros' ? displayValue : `${(value / 60).toFixed(1)}h`}
                    </span>
                  )}
                </div>
              )
            })}
          </div>
        </div>
        
        {/* Day labels - separate from SVG for better control */}
        <div className="flex justify-between mt-1">
          {weekData.map((day, i) => (
            <div key={i} className="flex flex-col items-center flex-1">
              <span
                className={cn(
                  'text-[10px] leading-tight',
                  day.isToday ? 'text-foreground font-medium' : 'text-muted-foreground'
                )}
              >
                {day.day}
              </span>
              <span className="text-[10px] leading-tight text-muted-foreground/50">{day.date}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
