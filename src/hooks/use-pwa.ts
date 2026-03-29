'use client'

import { useEffect, useState } from 'react'

// ブラウザが発火する beforeinstallprompt イベントをコンポーネントのマウントに関わらず捕捉するためのグローバル変数
let globalDeferredPrompt: BeforeInstallPromptEvent | null = null;
let hasDispatchedPrompt = false;

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    // デフォルトのブラウザプロンプトを抑制
    e.preventDefault()
    globalDeferredPrompt = e as BeforeInstallPromptEvent
    hasDispatchedPrompt = true;
    
    // すでにマウントされているコンポーネントがあれば通知するためにカスタムイベントを発火
    window.dispatchEvent(new CustomEvent('pwa-install-ready'))
  })
}

export function usePWA() {
  const [isInstallable, setIsInstallable] = useState(false)
  const [isInstalled, setIsInstalled] = useState(false)
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)

  useEffect(() => {
    // すでにインストール済みかどうかを確認
    if (window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone) {
      setIsInstalled(true)
    }

    // グローバルにすでにイベントを捕捉していれば状態をセット
    if (globalDeferredPrompt) {
      setDeferredPrompt(globalDeferredPrompt)
      setIsInstallable(true)
    }

    // イベントリスナー
    const handleReady = () => {
      if (globalDeferredPrompt) {
        setDeferredPrompt(globalDeferredPrompt)
        setIsInstallable(true)
      }
    }

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault()
      const promptEvent = e as BeforeInstallPromptEvent
      globalDeferredPrompt = promptEvent
      setDeferredPrompt(promptEvent)
      setIsInstallable(true)
    }

    const handleAppInstalled = () => {
      setIsInstalled(true)
      setIsInstallable(false)
      setDeferredPrompt(null)
      globalDeferredPrompt = null
    }

    window.addEventListener('pwa-install-ready', handleReady)
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    window.addEventListener('appinstalled', handleAppInstalled)

    return () => {
      window.removeEventListener('pwa-install-ready', handleReady)
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
      window.removeEventListener('appinstalled', handleAppInstalled)
    }
  }, [])

  const install = async () => {
    const promptToUse = deferredPrompt || globalDeferredPrompt
    if (!promptToUse) {
      console.warn('Install prompt is not available yet')
      return false
    }

    promptToUse.prompt()
    const { outcome } = await promptToUse.userChoice

    if (outcome === 'accepted') {
      setIsInstalled(true)
      setIsInstallable(false)
      setDeferredPrompt(null)
      globalDeferredPrompt = null
    }

    return outcome === 'accepted'
  }

  return {
    isInstallable,
    isInstalled,
    install,
  }
}

// Type for beforeinstallprompt event
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

