import { createClient } from '@supabase/supabase-js'

export const supabase = createClient(
  'https://vccvkavmxlmhtfczzgir.supabase.co',
  'sb_publishable_FzxwKIfYYVLZSPivt6vKRQ_JPj4OEN2',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      storageKey: 'aashan-erp-auth',
    },
    realtime: {
      params: { eventsPerSecond: 10 },
    },
  }
)
