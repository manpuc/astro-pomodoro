'use client'

import { useState, useEffect, useCallback } from 'react'

export function useNotifications() {
  const [permission, setPermission] = useState<NotificationPermission>('default')
  const [isSupported, setIsSupported] = useState(false)
  const [serviceWorkerRegistration, setServiceWorkerRegistration] = useState<ServiceWorkerRegistration | null>(null)

  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setIsSupported(true)
      setPermission(Notification.permission)
      
      // Register service worker for background notifications
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('/sw.js').then((registration) => {
          setServiceWorkerRegistration(registration)
        }).catch((error) => {
          console.warn('Service Worker registration failed:', error)
        })
      }
    }
  }, [])

  const requestPermission = useCallback(async () => {
    if (!isSupported) return false
    
    try {
      const result = await Notification.requestPermission()
      setPermission(result)
      return result === 'granted'
    } catch {
      return false
    }
  }, [isSupported])

  const sendNotification = useCallback((title: string, options?: NotificationOptions) => {
    if (!isSupported || permission !== 'granted') return null
    
    try {
      // Use Service Worker notification if available (works in background)
      if (serviceWorkerRegistration) {
        serviceWorkerRegistration.showNotification(title, {
          icon: '/icon-192x192.png',
          badge: '/icon-192x192.png',
          tag: 'pomodoro-notification',
          requireInteraction: true,
          ...options,
        })
        return null
      }
      
      // Fallback to regular notification
      const notification = new Notification(title, {
        icon: '/icon-192.png',
        badge: '/icon-192.png',
        ...options,
      })
      
      // Auto close after 5 seconds
      setTimeout(() => notification.close(), 5000)
      
      return notification
    } catch {
      return null
    }
  }, [isSupported, permission, serviceWorkerRegistration])

  return {
    isSupported,
    permission,
    requestPermission,
    sendNotification,
  }
}
