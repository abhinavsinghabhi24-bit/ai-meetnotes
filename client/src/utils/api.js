const API_BASE = (import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL.replace(/\/$/, '') : '') + '/api'

/**
 * Centralized fetch wrapper for backend API calls.
 * Ready for Phase 3 integration — all endpoints go through here.
 */
export async function apiFetch(endpoint, options = {}) {
  const url = `${API_BASE}${endpoint}`

  const config = {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  }

  const res = await fetch(url, config)

  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    const error = new Error(body.message || `Request failed (${res.status})`)
    error.status = res.status
    error.code = body.code
    error.errors = body.errors
    throw error
  }

  return res.json()
}

/** GET /api/health */
export const fetchHealth = () => apiFetch('/health')

/**
 * POST /api/analyze (Phase 3)
 * Sends title + transcript for AI analysis.
 */
export const analyzeMeeting = (data) =>
  apiFetch('/analyze', {
    method: 'POST',
    body: JSON.stringify(data),
  })

/** GET /api/meetings (Phase 4) */
export const fetchMeetings = (query = '', limit = 20, offset = 0) => {
  const params = new URLSearchParams()
  if (query) params.set('q', query)
  if (limit) params.set('limit', limit)
  if (offset) params.set('offset', offset)
  const qs = params.toString()
  return apiFetch(`/meetings${qs ? `?${qs}` : ''}`)
}

/** GET /api/meetings/:id (Phase 4) */
export const fetchMeeting = (id) => apiFetch(`/meetings/${id}`)

/** POST /api/meetings (Phase 4) */
export const saveMeeting = (data) =>
  apiFetch('/meetings', {
    method: 'POST',
    body: JSON.stringify(data),
  })

/** DELETE /api/meetings/:id (Phase 4) */
export const deleteMeeting = (id) =>
  apiFetch(`/meetings/${id}`, {
    method: 'DELETE',
  })
