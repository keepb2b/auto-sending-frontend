import { createClient } from '@supabase/supabase-js'

const url =
  typeof import.meta.env.VITE_SUPABASE_URL === 'string'
    ? import.meta.env.VITE_SUPABASE_URL.trim()
    : ''

const key =
  typeof import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY === 'string'
    ? import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY.trim()
    : ''

/** True when Replies page can use direct Supabase + realtime (see .env.example). */
export function isSupabaseRepliesConfigured() {
  return Boolean(url && key)
}

export const supabase = isSupabaseRepliesConfigured() ? createClient(url, key) : null
