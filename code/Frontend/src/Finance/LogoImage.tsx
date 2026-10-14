'use client'
import { useEffect, useState } from 'react'
import { getApiToken, refreshApiToken } from '../api/apiClient'

export function LogoImage({
  id,
  className,
  onReady,
}: {
  id: string
  className?: string
  onReady?: () => void
}) {
  const [url, setUrl] = useState('')
  useEffect(() => {
    let active = true
    let objectUrl = ''
    const load = async () => {
      const request = () =>
        fetch(`/api/finance/assets/${encodeURIComponent(id)}`, {
          headers: { Authorization: `Bearer ${getApiToken() ?? ''}` },
          credentials: 'same-origin',
          cache: 'no-store',
        })
      let response = await request()
      if (response.status === 401 && (await refreshApiToken())) response = await request()
      if (response.status === 403) window.dispatchEvent(new Event('freelanceflow-finance-revoked'))
      if (!response.ok) {
        if (active) onReady?.()
        return
      }
      objectUrl = URL.createObjectURL(await response.blob())
      if (active) setUrl(objectUrl)
      else URL.revokeObjectURL(objectUrl)
    }
    void load().catch(() => {
      /* A failed logo must not break the document preview. */
      if (active) onReady?.()
    })
    return () => {
      active = false
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [id, onReady])
  return url ? (
    <img src={url} alt="Business logo" className={className} onLoad={onReady} onError={onReady} />
  ) : null
}
