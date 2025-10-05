"use client"

import { useEffect, useRef, useState, useCallback } from 'react'

interface UseWebSocketOptions {
  url: string
  onMessage?: (data: any) => void
  onConnect?: () => void
  onDisconnect?: () => void
  onError?: (error: Event) => void
  reconnectInterval?: number
  reconnectAttempts?: number
}

export function useWebSocket({
  url,
  onMessage,
  onConnect,
  onDisconnect,
  onError,
  reconnectInterval = 3000,
  reconnectAttempts = 10
}: UseWebSocketOptions) {
  const [isConnected, setIsConnected] = useState(false)
  const [lastMessage, setLastMessage] = useState<any>(null)
  const wsRef = useRef<WebSocket | null>(null)
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const reconnectCountRef = useRef(0)
  const shouldReconnectRef = useRef(true)
  
  // Store callbacks in refs to prevent reconnection loops
  const onMessageRef = useRef(onMessage)
  const onConnectRef = useRef(onConnect)
  const onDisconnectRef = useRef(onDisconnect)
  const onErrorRef = useRef(onError)
  
  // Update refs when callbacks change
  useEffect(() => {
    onMessageRef.current = onMessage
    onConnectRef.current = onConnect
    onDisconnectRef.current = onDisconnect
    onErrorRef.current = onError
  }, [onMessage, onConnect, onDisconnect, onError])

  const connect = useCallback(() => {
    // Prevent multiple connections
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      console.log('⚠️ WebSocket already connected, skipping reconnect')
      return
    }
    
    try {
      console.log('🔌 Connecting to WebSocket:', url)
      const ws = new WebSocket(url)
      
      ws.onopen = () => {
        console.log('✅ WebSocket connected successfully', {
          url,
          readyState: ws.readyState,
          protocol: ws.protocol || 'default'
        })
        setIsConnected(true)
        reconnectCountRef.current = 0
        onConnectRef.current?.()
      }
      
      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)
          setLastMessage(data)
          onMessageRef.current?.(data)
        } catch (error) {
          console.error('Error parsing WebSocket message:', error)
        }
      }
      
      ws.onclose = (event) => {
        console.log('❌ WebSocket disconnected', {
          code: event.code,
          reason: event.reason || 'No reason provided',
          wasClean: event.wasClean
        })
        setIsConnected(false)
        wsRef.current = null
        onDisconnectRef.current?.()
        
        // Attempt to reconnect
        if (shouldReconnectRef.current && reconnectCountRef.current < reconnectAttempts) {
          reconnectCountRef.current++
          console.log(`🔄 Reconnecting... (attempt ${reconnectCountRef.current}/${reconnectAttempts})`)
          reconnectTimeoutRef.current = setTimeout(() => {
            connect()
          }, reconnectInterval)
        } else if (reconnectCountRef.current >= reconnectAttempts) {
          console.error('❌ Max reconnection attempts reached')
        }
      }
      
      ws.onerror = (error) => {
        console.error('❌ WebSocket error occurred:', {
          url,
          error: error.type || 'Connection error',
          timestamp: new Date().toISOString()
        })
        onErrorRef.current?.(error)
      }
      
      wsRef.current = ws
    } catch (error) {
      console.error('Error creating WebSocket:', error)
    }
  }, [url, reconnectInterval, reconnectAttempts]) // Only url and config options as dependencies

  const disconnect = useCallback(() => {
    shouldReconnectRef.current = false
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
    }
    if (wsRef.current) {
      wsRef.current.close()
      wsRef.current = null
    }
  }, [])

  const sendMessage = useCallback((data: any) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(data))
    } else {
      console.warn('⚠️ WebSocket not connected, cannot send message')
    }
  }, [])

  useEffect(() => {
    shouldReconnectRef.current = true
    connect()
    
    return () => {
      disconnect()
    }
  }, [connect, disconnect])

  return {
    isConnected,
    lastMessage,
    sendMessage,
    disconnect,
    reconnect: connect
  }
}
