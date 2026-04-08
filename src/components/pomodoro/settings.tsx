'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useTheme } from 'next-themes'
import { usePomodoroStore } from '@/lib/store'
import { cn } from '@/lib/utils'
import { usePWA } from '@/hooks/use-pwa'
import {
  SettingsIcon,
  XIcon,
  SunIcon,
  MoonIcon,
  VolumeIcon,
  VolumeOffIcon,
  StarIcon,
  DownloadIcon,
  InfoIcon,
  BellIcon,
} from '@/components/icons'
import { useResetPanelPositions } from '@/components/pomodoro/draggable-panel'
import { useNotifications } from '@/hooks/use-notifications'
import { useShallow } from 'zustand/react/shallow'

// Available colors for presets
// Dark mode presets (softer, pastel) - RESTORED
const DARK_PRESETS = [
  { name: 'Red', value: '#f87171' },
  { name: 'Orange', value: '#fb923c' },
  { name: 'Amber', value: '#fcd34d' },
  { name: 'Green', value: '#4ade80' },
  { name: 'Emerald', value: '#34d399' },
  { name: 'Teal', value: '#5eead4' },
  { name: 'Cyan', value: '#67e8f9' },
  { name: 'Sky', value: '#7dd3fc' },
  { name: 'Blue', value: '#60a5fa' },
  { name: 'Indigo', value: '#818cf8' },
  { name: 'Violet', value: '#a78bfa' },
  { name: 'Purple', value: '#c084fc' },
  { name: 'Fuchsia', value: '#e879f9' },
  { name: 'Pink', value: '#f472b6' },
]

// manpuc.me Light mode palette
const LIGHT_PRESETS = [
  { name: 'Red', value: '#b15c00' }, // actual manpuc work light
  { name: 'Orange', value: '#c2410c' },
  { name: 'Amber', value: '#b45309' },
  { name: 'Green', value: '#587539' }, // actual manpuc break light
  { name: 'Emerald', value: '#047857' },
  { name: 'Teal', value: '#0f766e' },
  { name: 'Cyan', value: '#0e7490' },
  { name: 'Sky', value: '#0369a1' },
  { name: 'Blue', value: '#2e7de9' }, // actual manpuc long break light
  { name: 'Indigo', value: '#4338ca' },
  { name: 'Violet', value: '#6d28d9' },
  { name: 'Purple', value: '#7e22ce' },
  { name: 'Fuchsia', value: '#a21caf' },
  { name: 'Pink', value: '#be185d' },
]

// Available Google Fonts for timer
const TIMER_FONTS = [
  'Geist Mono',
  'JetBrains Mono',
  'Fira Code',
  'Source Code Pro',
  'IBM Plex Mono',
  'Roboto Mono',
  'Space Mono',
  'Inconsolata',
  'Ubuntu Mono',
  'PT Mono',
  'Bungee',
]

export function Settings() {
  const [isOpen, setIsOpen] = useState(false)
  const [isClosing, setIsClosing] = useState(false)
  const { theme, setTheme, resolvedTheme } = useTheme()
  const isDark = resolvedTheme === 'dark'
  const currentPresets = isDark ? DARK_PRESETS : LIGHT_PRESETS
  const panelRef = useRef<HTMLDivElement>(null)
  const {
    timerSettings,
    displaySettings,
    updateTimerSettings,
    updateDisplaySettings,
    resetDisplayColors,
    getMonthlyPoints,
  } = usePomodoroStore(
    useShallow((state) => ({
      timerSettings: state.timerSettings,
      displaySettings: state.displaySettings,
      updateTimerSettings: state.updateTimerSettings,
      updateDisplaySettings: state.updateDisplaySettings,
      resetDisplayColors: state.resetDisplayColors,
      getMonthlyPoints: state.getMonthlyPoints,
    }))
  )

  const formatMinutes = (seconds: number) => Math.floor(seconds / 60)
  const toSeconds = (minutes: number) => minutes * 60

  // Handle close with animation
  const handleClose = useCallback(() => {
    if (!displaySettings.animationsEnabled) {
      setIsOpen(false)
      return
    }
    setIsClosing(true)
    setTimeout(() => {
      setIsOpen(false)
      setIsClosing(false)
    }, 300)
  }, [displaySettings.animationsEnabled])

  // Apply custom colors on mount and change
  useEffect(() => {
    if (typeof document !== 'undefined') {
      if (displaySettings.workColor) {
        document.documentElement.style.setProperty('--timer-work', displaySettings.workColor)
      }
      if (displaySettings.breakColor) {
        document.documentElement.style.setProperty('--timer-break', displaySettings.breakColor)
      }
      if (displaySettings.longBreakColor) {
        document.documentElement.style.setProperty('--timer-long-break', displaySettings.longBreakColor)
      }
      if (displaySettings.customBackgroundColor) {
        document.documentElement.style.setProperty('--background-custom', displaySettings.customBackgroundColor)
      } else {
        document.documentElement.style.removeProperty('--background-custom')
      }
    }
  }, [displaySettings.workColor, displaySettings.breakColor, displaySettings.longBreakColor, displaySettings.customBackgroundColor])

  // Load timer font
  useEffect(() => {
    if (displaySettings.timerFontFamily && displaySettings.timerFontFamily !== 'Geist Mono') {
      const fontName = displaySettings.timerFontFamily.replace(/ /g, '+')
      const linkId = 'timer-font-link'
      let link = document.getElementById(linkId) as HTMLLinkElement

      if (!link) {
        link = document.createElement('link')
        link.id = linkId
        link.rel = 'stylesheet'
        document.head.appendChild(link)
      }

      link.href = `https://fonts.googleapis.com/css2?family=${fontName}:wght@400;600;700&display=swap`
    }
  }, [displaySettings.timerFontFamily])

  const resetPanelPositions = useResetPanelPositions()
  const { isSupported: notificationsSupported, permission: notificationPermission, requestPermission } = useNotifications()
  const { isInstallable, isInstalled, install } = usePWA()
  const monthlyPoints = getMonthlyPoints()
  const currentMonth = new Date().toLocaleDateString('ja-JP', { month: 'long' })

  // Auto-switch colors when theme changes (only if they are currently set to the other mode's defaults)
  useEffect(() => {
    const darkDefaults = {
      work: '#f87171',
      break: '#4ade80',
      longBreak: '#60a5fa',
      bg: ''
    }
    const lightDefaults = {
      work: '#b15c00',
      break: '#587539',
      longBreak: '#2e7de9',
      bg: ''
    }

    if (isDark) {
      // Switching TO dark mode: if current colors are light defaults, change to dark defaults
      if (
        displaySettings.workColor === lightDefaults.work &&
        displaySettings.breakColor === lightDefaults.break &&
        displaySettings.longBreakColor === lightDefaults.longBreak
      ) {
        updateDisplaySettings({
          workColor: darkDefaults.work,
          breakColor: darkDefaults.break,
          longBreakColor: darkDefaults.longBreak,
          customBackgroundColor: darkDefaults.bg
        })
      }
    } else {
      // Switching TO light mode: if current colors are dark defaults, change to light defaults
      if (
        displaySettings.workColor === darkDefaults.work &&
        displaySettings.breakColor === darkDefaults.break &&
        displaySettings.longBreakColor === darkDefaults.longBreak
      ) {
        updateDisplaySettings({
          workColor: lightDefaults.work,
          breakColor: lightDefaults.break,
          longBreakColor: lightDefaults.longBreak,
          customBackgroundColor: lightDefaults.bg
        })
      }
    }
  }, [isDark, updateDisplaySettings]) // Intentionally not including displaySettings to avoid loops, it checks once on theme flip

  return (
    <>
      {/* Settings button - fixed top right */}
      <button
        onClick={() => setIsOpen(true)}
        className="settings-button control-button glass-button w-10 h-10 flex items-center justify-center rounded-full text-muted-foreground hover:text-foreground"
        style={{
          position: 'fixed',
          top: '16px',
          right: '16px',
          zIndex: 40,
        }}
        aria-label="設定"
      >
        <SettingsIcon className="w-5 h-5" />
      </button>

      {/* Settings panel */}
      {isOpen && (
        <div className={cn(
          'fixed inset-0 z-50 flex items-center justify-center p-4',
          displaySettings.animationsEnabled && 'settings-overlay',
          isClosing && 'settings-overlay-exit'
        )}>
          {/* Backdrop */}
          <div
            className={cn(
              'absolute inset-0 bg-background/80 backdrop-blur-sm',
              displaySettings.animationsEnabled && 'settings-backdrop',
              isClosing && 'settings-backdrop-exit'
            )}
            onClick={handleClose}
          />

          {/* Panel */}
          <div
            ref={panelRef}
            className={cn(
              'settings-panel relative liquid-glass rounded-3xl p-6 w-full max-w-md max-h-[85vh] overflow-y-auto border-0',
              (displaySettings.animationsEnabled ?? true) && !isClosing && 'settings-panel-enter',
              isClosing && 'settings-panel-exit'
            )}
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold">設定</h2>
              <button
                onClick={handleClose}
                className="control-button p-2 text-muted-foreground hover:text-foreground rounded-full hover:bg-secondary/50 transition-colors"
              >
                <XIcon className="w-5 h-5" />
              </button>
            </div>

            {/* Monthly Points */}
            <section className="settings-section mb-6 p-5 rounded-2xl bg-gradient-to-r from-primary/10 to-accent/10">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-full bg-primary/20">
                  <StarIcon className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-1.5">
                    <p className="text-sm text-muted-foreground">{currentMonth}の作業ポイント</p>
                    <div className="relative group">
                      <InfoIcon className="w-3.5 h-3.5 text-muted-foreground/60 cursor-help" />
                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2.5 bg-popover text-popover-foreground text-xs rounded-xl shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 w-56 z-50 border border-border leading-relaxed">
                        <p className="font-medium mb-1">ポイントの付与条件</p>
                        <p>・作業セッション完了: +10pt</p>
                        <p>・連続ポモドーロ（2回以上）: +5pt</p>
                        <p>・タスク完了: +20pt</p>
                        <p className="mt-1 text-muted-foreground/70">毎月リセットされます</p>
                        <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-popover" />
                      </div>
                    </div>
                  </div>
                  <p className="text-2xl font-bold text-primary">{monthlyPoints} <span className="text-sm font-normal text-muted-foreground">pts</span></p>
                </div>
              </div>
            </section>

            {/* Theme */}
            <section className="settings-section mb-6">
              <h3 className="text-sm font-medium text-muted-foreground mb-3">テーマ</h3>
              <div className="flex gap-2">
                <button
                  onClick={() => setTheme('light')}
                  className={cn(
                    'flex-1 flex items-center justify-center gap-2 p-3 rounded-2xl transition-all duration-300',
                    theme === 'light'
                      ? 'bg-primary text-primary-foreground shadow-md'
                      : 'bg-secondary/50 hover:bg-secondary'
                  )}
                >
                  <SunIcon className="w-4 h-4" />
                  <span className="text-sm">ライト</span>
                </button>
                <button
                  onClick={() => setTheme('dark')}
                  className={cn(
                    'flex-1 flex items-center justify-center gap-2 p-3 rounded-2xl transition-all duration-300',
                    theme === 'dark'
                      ? 'bg-primary text-primary-foreground shadow-md'
                      : 'bg-secondary/50 hover:bg-secondary'
                  )}
                >
                  <MoonIcon className="w-4 h-4" />
                  <span className="text-sm">ダーク</span>
                </button>
                <button
                  onClick={() => setTheme('system')}
                  className={cn(
                    'flex-1 flex items-center justify-center gap-2 p-3 rounded-2xl transition-all duration-300',
                    theme === 'system'
                      ? 'bg-primary text-primary-foreground shadow-md'
                      : 'bg-secondary/50 hover:bg-secondary'
                  )}
                >
                  <span className="text-sm">自動</span>
                </button>
              </div>
            </section>

            {/* Timer settings */}
            <section className="settings-section mb-6">
              <h3 className="text-sm font-medium text-muted-foreground mb-3">タイマー設定</h3>
              <div className="space-y-4">
                <div>
                  <label className="flex items-center justify-between text-sm mb-2">
                    <span>作業時間</span>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min="1"
                        max="9999"
                        value={formatMinutes(timerSettings.workDuration)}
                        onChange={(e) => {
                          const val = Math.max(1, Math.min(9999, parseInt(e.target.value) || 1))
                          updateTimerSettings({ workDuration: toSeconds(val) })
                        }}
                        className="w-16 p-1.5 text-center text-sm rounded-lg bg-secondary/50 border-0 focus:outline-none focus:ring-2 focus:ring-ring font-mono"
                      />
                      <span className="text-muted-foreground text-sm">分</span>
                    </div>
                  </label>
                  <input
                    type="range"
                    min="5"
                    max="120"
                    step="5"
                    value={Math.min(120, formatMinutes(timerSettings.workDuration))}
                    onChange={(e) =>
                      updateTimerSettings({ workDuration: toSeconds(parseInt(e.target.value)) })
                    }
                    className="w-full accent-timer-work"
                  />
                </div>

                <div>
                  <label className="flex items-center justify-between text-sm mb-2">
                    <span>小休憩</span>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min="1"
                        max="9999"
                        value={formatMinutes(timerSettings.shortBreakDuration)}
                        onChange={(e) => {
                          const val = Math.max(1, Math.min(9999, parseInt(e.target.value) || 1))
                          updateTimerSettings({ shortBreakDuration: toSeconds(val) })
                        }}
                        className="w-16 p-1.5 text-center text-sm rounded-lg bg-secondary/50 border-0 focus:outline-none focus:ring-2 focus:ring-ring font-mono"
                      />
                      <span className="text-muted-foreground text-sm">分</span>
                    </div>
                  </label>
                  <input
                    type="range"
                    min="1"
                    max="30"
                    step="1"
                    value={Math.min(30, formatMinutes(timerSettings.shortBreakDuration))}
                    onChange={(e) =>
                      updateTimerSettings({
                        shortBreakDuration: toSeconds(parseInt(e.target.value)),
                      })
                    }
                    className="w-full accent-timer-break"
                  />
                </div>

                <div>
                  <label className="flex items-center justify-between text-sm mb-2">
                    <span>長休憩</span>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min="1"
                        max="9999"
                        value={formatMinutes(timerSettings.longBreakDuration)}
                        onChange={(e) => {
                          const val = Math.max(1, Math.min(9999, parseInt(e.target.value) || 1))
                          updateTimerSettings({ longBreakDuration: toSeconds(val) })
                        }}
                        className="w-16 p-1.5 text-center text-sm rounded-lg bg-secondary/50 border-0 focus:outline-none focus:ring-2 focus:ring-ring font-mono"
                      />
                      <span className="text-muted-foreground text-sm">分</span>
                    </div>
                  </label>
                  <input
                    type="range"
                    min="10"
                    max="60"
                    step="5"
                    value={Math.min(60, formatMinutes(timerSettings.longBreakDuration))}
                    onChange={(e) =>
                      updateTimerSettings({
                        longBreakDuration: toSeconds(parseInt(e.target.value)),
                      })
                    }
                    className="w-full accent-timer-long-break"
                  />
                </div>

                <div>
                  <label className="flex items-center justify-between text-sm mb-2">
                    <span>長休憩までのポモドーロ数</span>
                    <span className="text-muted-foreground font-mono">
                      {timerSettings.longBreakInterval}回
                    </span>
                  </label>
                  <input
                    type="range"
                    min="2"
                    max="8"
                    step="1"
                    value={timerSettings.longBreakInterval}
                    onChange={(e) =>
                      updateTimerSettings({ longBreakInterval: parseInt(e.target.value) })
                    }
                    className="w-full accent-primary"
                  />
                </div>
              </div>
            </section>

            {/* Auto-start settings */}
            <section className="settings-section mb-6">
              <h3 className="text-sm font-medium text-muted-foreground mb-3">自動開始</h3>
              <div className="space-y-3">
                <label className="flex items-center justify-between cursor-pointer">
                  <span className="text-sm">休憩後に自動で作業開始</span>
                  <input
                    type="checkbox"
                    checked={timerSettings.autoStartPomodoros}
                    onChange={(e) =>
                      updateTimerSettings({ autoStartPomodoros: e.target.checked })
                    }
                    className="w-5 h-5 rounded accent-primary cursor-pointer"
                  />
                </label>
                <label className="flex items-center justify-between cursor-pointer">
                  <span className="text-sm">作業後に自動で休憩開始</span>
                  <input
                    type="checkbox"
                    checked={timerSettings.autoStartBreaks}
                    onChange={(e) =>
                      updateTimerSettings({ autoStartBreaks: e.target.checked })
                    }
                    className="w-5 h-5 rounded accent-primary cursor-pointer"
                  />
                </label>
              </div>
            </section>

            {/* Notification settings */}
            {notificationsSupported && (
              <section className="settings-section mb-6">
                <h3 className="text-sm font-medium text-muted-foreground mb-3">通知</h3>
                <div className="space-y-3">
                  <label className="flex items-center justify-between cursor-pointer">
                    <div className="flex items-center gap-2">
                      <BellIcon className="w-4 h-4" />
                      <span className="text-sm">デスクトップ通知</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={timerSettings.notificationsEnabled}
                      onChange={async (e) => {
                        if (e.target.checked && notificationPermission !== 'granted') {
                          const granted = await requestPermission()
                          if (granted) {
                            updateTimerSettings({ notificationsEnabled: true })
                          }
                        } else {
                          updateTimerSettings({ notificationsEnabled: e.target.checked })
                        }
                      }}
                      className="w-5 h-5 rounded accent-primary cursor-pointer"
                    />
                  </label>
                  {notificationPermission === 'denied' && (
                    <p className="text-xs text-destructive">
                      通知がブロックされています。ブラウザの設定から許可してください。
                    </p>
                  )}
                </div>
              </section>
            )}

            {/* Sound settings */}
            <section className="settings-section mb-6">
              <h3 className="text-sm font-medium text-muted-foreground mb-3">サウンド</h3>
              <div className="space-y-3">
                <label className="flex items-center justify-between cursor-pointer">
                  <div className="flex items-center gap-2">
                    {timerSettings.soundEnabled ? (
                      <VolumeIcon className="w-4 h-4" />
                    ) : (
                      <VolumeOffIcon className="w-4 h-4" />
                    )}
                    <span className="text-sm">通知音</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={timerSettings.soundEnabled}
                    onChange={(e) =>
                      updateTimerSettings({ soundEnabled: e.target.checked })
                    }
                    className="w-5 h-5 rounded accent-primary cursor-pointer"
                  />
                </label>
                {timerSettings.soundEnabled && (
                  <div>
                    <label className="flex items-center justify-between text-sm mb-2">
                      <span>音量</span>
                      <span className="text-muted-foreground font-mono">
                        {Math.round(timerSettings.soundVolume * 100)}%
                      </span>
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.1"
                      value={timerSettings.soundVolume}
                      onChange={(e) =>
                        updateTimerSettings({ soundVolume: parseFloat(e.target.value) })
                      }
                      className="w-full accent-primary"
                    />
                  </div>
                )}
              </div>
            </section>

            {/* Display settings */}
            <section className="settings-section mb-6">
              <h3 className="text-sm font-medium text-muted-foreground mb-3">表示設定</h3>
              <div className="space-y-3">
                <label className="flex items-center justify-between cursor-pointer">
                  <span className="text-sm">タスクリストを表示</span>
                  <input
                    type="checkbox"
                    checked={displaySettings.showTaskList}
                    onChange={(e) =>
                      updateDisplaySettings({ showTaskList: e.target.checked })
                    }
                    className="w-5 h-5 rounded accent-primary cursor-pointer"
                  />
                </label>
                <label className="flex items-center justify-between cursor-pointer">
                  <span className="text-sm">統計を表示</span>
                  <input
                    type="checkbox"
                    checked={displaySettings.showStatistics}
                    onChange={(e) =>
                      updateDisplaySettings({ showStatistics: e.target.checked })
                    }
                    className="w-5 h-5 rounded accent-primary cursor-pointer"
                  />
                </label>
                <label className="flex items-center justify-between cursor-pointer">
                  <span className="text-sm">円形プログレスを表示</span>
                  <input
                    type="checkbox"
                    checked={displaySettings.showProgressRing}
                    onChange={(e) =>
                      updateDisplaySettings({ showProgressRing: e.target.checked })
                    }
                    className="w-5 h-5 rounded accent-primary cursor-pointer"
                  />
                </label>
                <label className="flex items-center justify-between cursor-pointer">
                  <span className="text-sm">時間表示</span>
                  <input
                    type="checkbox"
                    checked={displaySettings.showTimeDisplay}
                    onChange={(e) =>
                      updateDisplaySettings({ showTimeDisplay: e.target.checked })
                    }
                    className="w-5 h-5 rounded accent-primary cursor-pointer"
                  />
                </label>
                <label className="flex items-center justify-between cursor-pointer">
                  <span className="text-sm">モードラベル表示（作業、小休憩など）</span>
                  <input
                    type="checkbox"
                    checked={displaySettings.showModeLabel ?? true}
                    onChange={(e) =>
                      updateDisplaySettings({ showModeLabel: e.target.checked })
                    }
                    className="w-5 h-5 rounded accent-primary cursor-pointer"
                  />
                </label>
                <label className="flex items-center justify-between cursor-pointer">
                  <span className="text-sm">メモリ表示</span>
                  <input
                    type="checkbox"
                    checked={displaySettings.showTickMarks}
                    onChange={(e) =>
                      updateDisplaySettings({ showTickMarks: e.target.checked })
                    }
                    className="w-5 h-5 rounded accent-primary cursor-pointer"
                  />
                </label>
                <label className="flex items-center justify-between cursor-pointer">
                  <span className="text-sm">アニメーションを有効化</span>
                  <input
                    type="checkbox"
                    checked={displaySettings.animationsEnabled ?? true}
                    onChange={(e) =>
                      updateDisplaySettings({ animationsEnabled: e.target.checked })
                    }
                    className="w-5 h-5 rounded accent-primary cursor-pointer"
                  />
                </label>
              </div>
            </section>

            {/* Reset panel positions */}
            <section className="settings-section mb-6 p-4 rounded-2xl bg-secondary/30 border border-border/50">
              <div className="flex items-center justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-medium">パネル位置をリセット</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">タスク・統計パネルをデフォルト位置に戻す</p>
                </div>
                <button
                  type="button"
                  onClick={resetPanelPositions}
                  className="flex-shrink-0 px-3 py-1.5 text-xs rounded-xl bg-secondary hover:bg-secondary/80 transition-colors border border-border/50 font-medium"
                >
                  リセット
                </button>
              </div>
            </section>

            {/* Timer font */}
            <section className="settings-section mb-6">
              <h3 className="text-sm font-medium text-muted-foreground mb-3">タイマーフォント</h3>
              <select
                value={displaySettings.timerFontFamily ?? 'Geist Mono'}
                onChange={(e) => updateDisplaySettings({ timerFontFamily: e.target.value })}
                className="w-full p-3 rounded-2xl bg-secondary/50 border-0 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              >
                {TIMER_FONTS.map((font) => (
                  <option key={font} value={font}>
                    {font}
                  </option>
                ))}
              </select>
            </section>

            {/* Progress ring thickness */}
            <section className="settings-section mb-6">
              <h3 className="text-sm font-medium text-muted-foreground mb-3">プログレスリングの太さ</h3>
              <div>
                <label className="flex items-center justify-between text-sm mb-2">
                  <span>太さ</span>
                  <span className="text-muted-foreground font-mono">
                    {displaySettings.progressRingThickness ?? 10}px
                  </span>
                </label>
                <input
                  type="range"
                  min="4"
                  max="24"
                  step="2"
                  value={displaySettings.progressRingThickness ?? 10}
                  onChange={(e) =>
                    updateDisplaySettings({ progressRingThickness: parseInt(e.target.value) })
                  }
                  className="w-full accent-primary"
                />
              </div>
            </section>

            {/* Install / Download */}
            {(isInstallable && !isInstalled) && (
              <section className="settings-section mb-6">
                <h3 className="text-sm font-medium text-muted-foreground mb-3">インストール</h3>
                <button
                  onClick={async () => {
                    await install()
                  }}
                  className="w-full flex items-center justify-center gap-2 p-3 rounded-2xl bg-primary text-primary-foreground hover:opacity-90 transition-opacity"
                >
                  <DownloadIcon className="w-4 h-4" />
                  <span className="text-sm font-medium">アプリをインストール</span>
                </button>
              </section>
            )}

            {/* Timer Colors */}
            <section className="settings-section mb-6">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-medium text-muted-foreground">カラー設定</h3>
                <button
                  onClick={resetDisplayColors}
                  className="text-[10px] px-2 py-1 rounded-md bg-secondary hover:bg-secondary/80 transition-colors"
                >
                  デフォルトに戻す
                </button>
              </div>

              <div className="space-y-5">
                <div>
                  <label className="text-xs text-muted-foreground block mb-2">作業時のカラー</label>
                  <div className="flex flex-wrap gap-2 mb-3">
                    {currentPresets.slice(0, 8).map((color) => (
                      <button
                        key={`work-${color.value}`}
                        onClick={() => updateDisplaySettings({ workColor: color.value })}
                        className={cn(
                          "w-6 h-6 rounded-full border-2 transition-transform hover:scale-110",
                          displaySettings.workColor === color.value ? "border-primary scale-110 shadow-sm" : "border-transparent"
                        )}
                        style={{ backgroundColor: color.value }}
                        title={color.name}
                      />
                    ))}
                    <input
                      type="color"
                      value={displaySettings.workColor || (isDark ? '#f87171' : '#b15c00')}
                      onChange={(e) => updateDisplaySettings({ workColor: e.target.value })}
                      className="w-6 h-6 rounded-full bg-transparent border-none cursor-pointer p-0"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs text-muted-foreground block mb-2">小休憩のカラー</label>
                  <div className="flex flex-wrap gap-2 mb-3">
                    {currentPresets.slice(3, 11).map((color) => (
                      <button
                        key={`break-${color.value}`}
                        onClick={() => updateDisplaySettings({ breakColor: color.value })}
                        className={cn(
                          "w-6 h-6 rounded-full border-2 transition-transform hover:scale-110",
                          displaySettings.breakColor === color.value ? "border-primary scale-110 shadow-sm" : "border-transparent"
                        )}
                        style={{ backgroundColor: color.value }}
                        title={color.name}
                      />
                    ))}
                    <input
                      type="color"
                      value={displaySettings.breakColor || (isDark ? '#4ade80' : '#587539')}
                      onChange={(e) => updateDisplaySettings({ breakColor: e.target.value })}
                      className="w-6 h-6 rounded-full bg-transparent border-none cursor-pointer p-0"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs text-muted-foreground block mb-2">長休憩のカラー</label>
                  <div className="flex flex-wrap gap-2 mb-3">
                    {currentPresets.slice(8, 16).map((color) => (
                      <button
                        key={`longBreak-${color.value}`}
                        onClick={() => updateDisplaySettings({ longBreakColor: color.value })}
                        className={cn(
                          "w-6 h-6 rounded-full border-2 transition-transform hover:scale-110",
                          displaySettings.longBreakColor === color.value ? "border-primary scale-110 shadow-sm" : "border-transparent"
                        )}
                        style={{ backgroundColor: color.value }}
                        title={color.name}
                      />
                    ))}
                    <input
                      type="color"
                      value={displaySettings.longBreakColor || (isDark ? '#60a5fa' : '#2e7de9')}
                      onChange={(e) => updateDisplaySettings({ longBreakColor: e.target.value })}
                      className="w-6 h-6 rounded-full bg-transparent border-none cursor-pointer p-0"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs text-muted-foreground block mb-2">背景カラー (カスタム)</label>
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      value={displaySettings.customBackgroundColor || (isDark ? '#0f172a' : '#e1e2e7')}
                      onChange={(e) => updateDisplaySettings({ customBackgroundColor: e.target.value })}
                      className="w-10 h-10 rounded-xl bg-transparent border-none cursor-pointer p-0 overflow-hidden shadow-inner"
                    />
                    <div className="flex-1">
                      <p className="text-[10px] text-muted-foreground leading-tight">
                        背景全体の色を変更します。空にするとテーマ標準色に戻ります。
                      </p>
                      {displaySettings.customBackgroundColor && (
                        <button
                          onClick={() => updateDisplaySettings({ customBackgroundColor: '' })}
                          className="text-[10px] text-primary hover:underline mt-1"
                        >
                          背景色をリセット
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </section>
          </div>
        </div>
      )}
    </>
  )
}
