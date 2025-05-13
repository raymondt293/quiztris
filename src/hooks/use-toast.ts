"use client"

import { useState } from "react"

type ToastProps = {
  title: string
  description: string
  variant?: "default" | "destructive"
}

export function useToast() {
  const [toasts, setToasts] = useState<ToastProps[]>([])

  const toast = (props: ToastProps) => {
    //const id = Date.now()
    setToasts((prevToasts) => [...prevToasts, props])

    // In a real implementation, this would display a toast notification
    console.log(`Toast: ${props.title} - ${props.description}`)

    // Remove toast after 3 seconds
    setTimeout(() => {
      setToasts((prevToasts) => prevToasts.filter((_, index) => index !== 0))
    }, 3000)
  }

  return { toast, toasts }
}
