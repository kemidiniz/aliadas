import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabaseConfigurado = Boolean(url && anonKey)

// Só a URL pública e a anon key (publishable). Toda a proteção dos dados
// está no RLS do banco, não aqui.
export const supabase = createClient(url || 'http://localhost', anonKey || 'chave-ausente', {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
})
