import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'

export const config = {
  runtime: 'edge',
}

export default async function handler(req: Request) {
  const SUPABASE_URL = process.env.SUPABASE_URL || 'https://pelqxsweoarqlwjsanlc.supabase.co'
  const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBlbHF4c3dlb2FybHF3anNhbmxjIiwiaWQiOiIxIiwiZXhwIjoxOTM3ODI1NjI0fQ.5G_IoqLNVNTbIqwN4qKcLw4Kk5mG0C0h5dGgJ4W0aNQ'

  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

  const { data, error } = await supabase
    .from('site_settings')
    .select('value')
    .eq('key', 'external_scripts')
    .single()

  const jsContent = data?.value || '// No scripts configured'

  return new Response(jsContent, {
    headers: {
      'Content-Type': 'application/javascript; charset=utf-8',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Access-Control-Allow-Origin': '*',
    },
  })
}