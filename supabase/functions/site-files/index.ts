import { serve } from "https://deno.land/std@0.190.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  const url = new URL(req.url);
  const filename = url.pathname.split('/').pop();

  if (!filename) {
    return new Response('Not Found', { status: 404, headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_ANON_KEY') ?? ''
  )

  const { data, error } = await supabase
    .from('site_files')
    .select('content, content_type')
    .eq('filename', filename)
    .single();

  if (error || !data) {
    console.error("[site-files] File not found:", filename);
    return new Response('File not found', { status: 404, headers: corsHeaders });
  }

  return new Response(data.content, {
    headers: {
      ...corsHeaders,
      'Content-Type': data.content_type || 'application/javascript',
      'Cache-Control': 'no-cache'
    }
  });
})