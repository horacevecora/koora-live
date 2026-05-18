// @ts-ignore
import { serve } from "https://deno.land/std@0.190.0/http/server.ts"
// @ts-ignore
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// @ts-ignore
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  const url = new URL(req.url);
  const filename = url.searchParams.get('file') || url.pathname.split('/').pop();

  if (!filename || filename === 'site-files') {
    return new Response('يرجى تحديد اسم الملف', { status: 400, headers: corsHeaders });
  }

  const supabase = createClient(
    // @ts-ignore
    Deno.env.get('SUPABASE_URL') ?? '',
    // @ts-ignore
    Deno.env.get('SUPABASE_ANON_KEY') ?? ''
  )

  const { data, error } = await supabase
    .from('site_files')
    .select('content, content_type')
    .eq('filename', filename)
    .single();

  if (error || !data) {
    return new Response(`الملف (${filename}) غير موجود في قاعدة البيانات`, { status: 404, headers: corsHeaders });
  }

  return new Response(data.content, {
    headers: {
      ...corsHeaders,
      'Content-Type': data.content_type || 'application/javascript',
      'Cache-Control': 'no-cache'
    }
  });
})