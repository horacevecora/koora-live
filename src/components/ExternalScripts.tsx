"use client";

import { useEffect } from 'react';
import { supabase } from "@/integrations/supabase/client";

const ExternalScripts = () => {
  useEffect(() => {
    let mounted = true;

    const fetchAndInject = async () => {
      try {
        // جلب الأكواد من site_settings
        const { data } = await supabase
          .from('site_settings')
          .select('value')
          .eq('key', 'external_scripts')
          .single();

        if (!mounted || !data?.value) return;

        // إنشاء عنصر script
        const script = document.createElement('script');
        script.textContent = data.value;
        script.async = false;
        
        // إضافة في head
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