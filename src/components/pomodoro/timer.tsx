'use client'

import { useEffect, useCallback, useState, useRef } from 'react'
import { usePomodoroStore, pomodoroStore, type TimerMode, type PomodoroState } from '@/lib/store'
import { cn } from '@/lib/utils'
import { PlayIcon, PauseIcon, SkipIcon, ResetIcon } from '@/components/icons'
import { useNotifications } from '@/hooks/use-notifications'
import { useShallow } from 'zustand/react/shallow'

const modeLabels: Record<TimerMode, string> = {
  work: '作業',
  shortBreak: '小休憩',
  longBreak: '長休憩',
}

const modeColors: Record<TimerMode, string> = {
  work: 'text-timer-work',
  shortBreak: 'text-timer-break',
  longBreak: 'text-timer-long-break',
}

const modeBgColors: Record<TimerMode, string> = {
  work: 'bg-timer-work text-white',
  shortBreak: 'bg-timer-break text-white',
  longBreak: 'bg-timer-long-break text-white',
}

const ringColors: Record<TimerMode, string> = {
  work: 'stroke-timer-work',
  shortBreak: 'stroke-timer-break',
  longBreak: 'stroke-timer-long-break',
}

export function Timer() {
  const {
    mode,
    timeRemaining,
    isRunning,
    displayPomodoros,
    timerSettings,
    displaySettings,
    setMode,
    setIsRunning,
    tick,
    resetTimer,
    skipTimer,
    completeSession,
    resetDisplayPomodoros,
  } = usePomodoroStore(
    useShallow((state: PomodoroState) => ({
      mode: state.mode,
      timeRemaining: state.timeRemaining,
      isRunning: state.isRunning,
      displayPomodoros: state.displayPomodoros,
      timerSettings: state.timerSettings,
      displaySettings: state.displaySettings,
      setMode: state.setMode,
      setIsRunning: state.setIsRunning,
      tick: state.tick,
      resetTimer: state.resetTimer,
      skipTimer: state.skipTimer,
      completeSession: state.completeSession,
      resetDisplayPomodoros: state.resetDisplayPomodoros,
    }))
  )

  const { sendNotification } = useNotifications()
  const [isHydrated, setIsHydrated] = useState(false)
  const audioRef = useRef<HTMLAudioElement>(null)
  const audioPlaying = usePomodoroStore((state: PomodoroState) => state.audioPlaying)
  const stopAudio = usePomodoroStore((state: PomodoroState) => state.stopAudio)
  const triggerAudio = usePomodoroStore((state: PomodoroState) => state.triggerAudio)

  useEffect(() => {
    setIsHydrated(true)
  }, [])

  // Safely auto-play audio via ref to prevent browser autoplay block
  useEffect(() => {
    if (audioPlaying && audioRef.current) {
      audioRef.current.play().catch((err) => {
        if (import.meta.env.DEV) {
          console.warn('Audio play prevented by browser autoplay policy:', err)
        }
      })
    }
  }, [audioPlaying])

  // Format time as MM:SS
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  // Get total duration for current mode
  const getTotalDuration = useCallback(() => {
    switch (mode) {
      case 'work':
        return timerSettings.workDuration
      case 'shortBreak':
        return timerSettings.shortBreakDuration
      case 'longBreak':
        return timerSettings.longBreakDuration
    }
  }, [mode, timerSettings])

  // Calculate progress percentage
  const progress = ((getTotalDuration() - timeRemaining) / getTotalDuration()) * 100

  // Play notification sound using Web Audio API oscillator (works in background tabs)
  const playSound = useCallback(() => {
    if (!timerSettings.soundEnabled) return

    try {
      // Create new AudioContext each time (lazy initialization works better for background tabs)
      const AudioContextClass = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
      if (!AudioContextClass) return

      const ctx = new AudioContextClass()
      const volume = timerSettings.soundVolume

      // Create a pleasant notification sound using oscillators
      const playTone = (frequency: number, startTime: number, duration: number) => {
        const oscillator = ctx.createOscillator()
        const gainNode = ctx.createGain()

        oscillator.type = 'sine'
        oscillator.frequency.setValueAtTime(frequency, ctx.currentTime + startTime)

        gainNode.gain.setValueAtTime(0, ctx.currentTime + startTime)
        gainNode.gain.linearRampToValueAtTime(volume * 0.3, ctx.currentTime + startTime + 0.01)
        gainNode.gain.linearRampToValueAtTime(0, ctx.currentTime + startTime + duration)

        oscillator.connect(gainNode)
        gainNode.connect(ctx.destination)

        oscillator.start(ctx.currentTime + startTime)
        oscillator.stop(ctx.currentTime + startTime + duration)
      }

      // Play a pleasant two-tone notification
      playTone(880, 0, 0.15)      // A5
      playTone(1108.73, 0.15, 0.2) // C#6

      // Close the context after sounds finish
      setTimeout(() => ctx.close(), 500)
    } catch (error) {
      console.warn('Could not play notification sound:', error)
    }
  }, [timerSettings.soundEnabled, timerSettings.soundVolume])

  // Timer tick effect
  useEffect(() => {
    if (!isRunning) return

    // デバッグ用倍速設定 (公開時は 1)
    const DEBUG_SPEED_MULTIPLIER = 1
    const interval = setInterval(() => {
      // ストアから最新値を直接取得
      const currentRemaining = pomodoroStore.getState().timeRemaining
      const nextTime = Math.max(0, currentRemaining - DEBUG_SPEED_MULTIPLIER)
      // ストアを直接更新
      pomodoroStore.setState({ timeRemaining: nextTime })
    }, 1000)

    return () => clearInterval(interval)
  }, [isRunning, tick])

  // Check for timer completion
  useEffect(() => {
    if (timeRemaining === 0 && isRunning) {
      playSound() // Web Audio (fallback/original)
      triggerAudio() // DOM Audio (from notification.mp3)
      setIsRunning(false)

      // Send desktop notification
      if (timerSettings.notificationsEnabled) {
        const notificationTitle = mode === 'work' ? '作業完了!' : '休憩終了!'
        const notificationBody = mode === 'work'
          ? '休憩を取りましょう'
          : '作業を再開しましょう'
        sendNotification(notificationTitle, { body: notificationBody })
      }

      completeSession()
    }
  }, [timeRemaining, isRunning, playSound, triggerAudio, setIsRunning, completeSession, mode, timerSettings.notificationsEnabled, sendNotification])

  // Update document title
  useEffect(() => {
    document.title = `${formatTime(timeRemaining)} - ${modeLabels[mode]} | Pomodoro`
    return () => {
      document.title = 'Pomodoro Timer'
    }
  }, [timeRemaining, mode])

  // SVG circle calculations
  const size = 320
  const strokeWidth = displaySettings.progressRingThickness ?? 10
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius

  // Tick marks
  const tickMarks = Array.from({ length: 60 }, (_, i) => {
    const angle = (i * 6 - 90) * (Math.PI / 180)
    const isMainTick = i % 5 === 0
    const innerRadius = radius - (isMainTick ? 18 : 12)
    const outerRadius = radius - 6
    return {
      x1: size / 2 + innerRadius * Math.cos(angle),
      y1: size / 2 + innerRadius * Math.sin(angle),
      x2: size / 2 + outerRadius * Math.cos(angle),
      y2: size / 2 + outerRadius * Math.sin(angle),
      isMain: isMainTick,
    }
  })

  // Get timer font style
  const timerFontStyle = displaySettings.timerFontFamily
    ? { fontFamily: `'${displaySettings.timerFontFamily}', monospace` }
    : undefined

  // Consistent classes to avoid styling bleed on hydration
  const wrapperClass = "timer-container flex flex-col items-center gap-8"

  if (!isHydrated) {
    return (
      <div className={wrapperClass} suppressHydrationWarning>
        <div className="mode-selector liquid-glass p-2 rounded-3xl container-animate invisible">
          <button className="px-5 py-2.5 rounded-2xl text-sm font-medium">Work</button>
        </div>
        <div className="timer-visual relative flex items-center justify-center invisible" style={{ width: size, height: size }}></div>
        <div className="timer-controls flex items-center gap-6 invisible">
          <button className="control-button glass-button w-16 h-16 flex items-center justify-center rounded-full"></button>
        </div>
        <div className="timer-counter flex items-center gap-2 text-sm text-muted-foreground invisible">
          <span>完了:</span><span className="font-semibold text-base">0</span><span>ポモドーロ</span>
        </div>
      </div>
    )
  }

  return (
    <div className={wrapperClass}>
      {/* Mode selector - separate from timer */}
      <div className="mode-selector liquid-glass p-2 rounded-3xl container-animate">
        {(['work', 'shortBreak', 'longBreak'] as TimerMode[]).map((m) => (
          <button
            key={m}
            onClick={() => setMode(m)}
            className={cn(
              'px-5 py-2.5 rounded-2xl text-sm font-medium transition-all duration-300',
              mode === m
                ? cn(modeBgColors[m], 'shadow-md')
                : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50'
            )}
          >
            {modeLabels[m]}
          </button>
        ))}
      </div>

      {/* Timer display - centered with proper spacing */}
      <div className="timer-visual relative flex items-center justify-center" style={{ width: size, height: size }}>
        {/* Progress ring */}
        {displaySettings.showProgressRing && (
          <svg
            width={size}
            height={size}
            className="timer-ring absolute top-0 left-0"
            style={{ transform: 'rotate(-90deg)' }}
          >
            {/* Background circle */}
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke="currentColor"
              strokeWidth={strokeWidth}
              className="text-secondary opacity-40"
            />

            {/* Tick marks */}
            {displaySettings.showTickMarks &&
              tickMarks.map((tick, i) => (
                <line
                  key={i}
                  x1={tick.x1}
                  y1={tick.y1}
                  x2={tick.x2}
                  y2={tick.y2}
                  stroke="currentColor"
                  strokeWidth={tick.isMain ? 2.5 : 1}
                  className="text-muted-foreground/25"
                />
              ))}

            {/* Progress circle */}
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              strokeWidth={strokeWidth}
              strokeLinecap="round"
              className={cn('timer-ring-progress', ringColors[mode])}
              style={{
                strokeDasharray: circumference,
                strokeDashoffset: circumference - (progress / 100) * circumference,
                transition: displaySettings.animationsEnabled
                  ? 'stroke-dashoffset 1s linear'
                  : 'none',
              }}
            />
          </svg>
        )}

        {/* Time display - absolutely centered */}
        <div className="timer-content absolute inset-0 flex flex-col items-center justify-center z-10">
          {displaySettings.showTimeDisplay && (
            <span
              className={cn(
                'timer-display text-7xl md:text-8xl font-bold',
                modeColors[mode]
              )}
              style={timerFontStyle}
            >
              {formatTime(timeRemaining)}
            </span>
          )}
          {(displaySettings.showModeLabel ?? true) && (
            <span className="text-sm text-muted-foreground mt-1.5 font-medium">
              {!isRunning && timeRemaining < getTotalDuration() ? '一時停止' : modeLabels[mode]}
            </span>
          )}
        </div>
      </div>

      {/* Controls - separate from timer with proper spacing */}
      <div className="timer-controls flex items-center gap-6">
        <button
          onClick={resetTimer}
          className="control-button glass-button w-10 h-10 flex items-center justify-center rounded-full text-muted-foreground hover:text-foreground"
          aria-label="リセット"
        >
          <ResetIcon className="w-5 h-5" />
        </button>

        <button
          onClick={() => setIsRunning(!isRunning)}
          className={cn(
            'control-button control-button-main glass-button w-16 h-16 flex items-center justify-center rounded-full transition-colors',
            isRunning
              ? 'text-timer-work'
              : modeColors[mode]
          )}
          style={{ marginLeft: '4px' }}
          aria-label={isRunning ? '一時停止' : '開始'}
        >
          {isRunning ? (
            <PauseIcon className="w-9 h-9" />
          ) : (
            <PlayIcon className="w-9 h-9" />
          )}
        </button>

        <button
          onClick={() => {
            // Calculate elapsed time before skipping
            const totalDuration = getTotalDuration()
            const elapsedTime = totalDuration - timeRemaining
            setIsRunning(false)
            skipTimer(elapsedTime)
          }}
          className="control-button glass-button w-10 h-10 flex items-center justify-center rounded-full text-muted-foreground hover:text-foreground"
          aria-label="スキップ"
        >
          <SkipIcon className="w-5 h-5" />
        </button>
      </div>

      {/* Pomodoro counter */}
      <div className="timer-counter flex flex-col items-center gap-1">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>完了:</span>
          <span className={cn('font-semibold text-base', modeColors[mode])}>
            {displayPomodoros}
          </span>
          <span>ポモドーロ</span>
        </div>
        <button
          onClick={resetDisplayPomodoros}
          className="text-[11px] text-muted-foreground/40 hover:text-muted-foreground/70 transition-colors"
        >
          カウンターをリセット
        </button>
      </div>

      <audio
        ref={audioRef}
        src="/notification.mp3"
        onEnded={stopAudio}
      />
    </div>
  )
}
