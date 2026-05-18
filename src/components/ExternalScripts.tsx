"use client";

import { useEffect } from 'react';
import { supabase } from "@/integrations/supabase/client";

const ExternalScripts = () => {
  useEffect(() => {
    let mounted = true;

    const fetchAndInject = async () => {
      try {
        const { data } = await supabase
          .from('site_settings')
          .select('value')
          .eq('key', 'external_scripts')
          .maybeSingle();

        if (!mounted || !data?.value) return;

        const content = data.value.trim();
        
        // التحقق من أن المحتوى يبدأ بـ JS وليس HTML
        if (content.startsWith('<')) {
          console.error("ExternalScripts: Received HTML instead of JS content. Check site_settings.");
          return;
        }

        const script = document.createElement('script');
        script.textContent = content;
        script.async = false;
        
        document.head.appendChild(script);

      } catch (err) {
        console.error("Error loading scripts:", err);
      }
    };

    fetchAndInject();

    return () => { mounted = false; };
  }, []);

  return null;
};

export default ExternalScripts;