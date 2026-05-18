"use client";

import { useEffect } from 'react';
import { supabase } from "@/integrations/supabase/client";

const ExternalScripts = () => {
  useEffect(() => {
    const fetchAndInject = async () => {
      try {
        const { data, error } = await supabase
          .from('site_settings')
          .select('value')
          .eq('key', 'external_scripts')
          .single();

        if (error || !data?.value) return;

        // إنشاء عنصر script جديد
        const script = document.createElement('script');
        script.textContent = data.value;
        script.async = true;
        
        // إضافة السكريبت في head
        document.head.appendChild(script);

      } catch (err) {
        console.error("Error injecting external scripts:", err);
      }
    };

    fetchAndInject();
  }, []);

  return null;
};

export default ExternalScripts;