// @ts-ignore
import { serve } from "https://deno.land/std@0.190.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// @ts-ignore
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  const urlStr = new URL(req.url).searchParams.get('url');
  if (!urlStr) {
    return new Response("[stream-proxy] Missing URL", { status: 400, headers: corsHeaders });
  }

  try {
    console.log(`[stream-proxy] Fetching: ${urlStr}`);
    
    const response = await fetch(urlStr, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Referer': new URL(urlStr).origin
      }
    });

    if (!response.ok) {
       console.error(`[stream-proxy] Target returned status: ${response.status}`);
    }

    // تمرير البث مباشرة كـ Stream للحفاظ على السرعة
    const { readable, writable } = new TransformStream();
    response.body?.pipeTo(writable);

    return new Response(readable, {
      status: response.status,
      headers: {
        ...corsHeaders,
        'Content-Type': response.headers.get('Content-Type') || 'video/mp2t',
        'Cache-Control': 'no-cache',
        'Access-Control-Expose-Headers': '*'
      }
    });
  } catch (err) {
    console.error(`[stream-proxy] Fatal error:`, err);
    // @ts-ignore
    return new Response(`Error: ${err.message}`, { status: 500, headers: corsHeaders });
  }
})