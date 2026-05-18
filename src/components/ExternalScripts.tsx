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
          .single();

        if (!mounted || !data?.value) return;

        // الطريقة 1: إضافة script tag
        const script = document.createElement('script');
        script.textContent = data.value;
        script.async = false; // تعطيل async لضمان التنفيذ بالترتيب
        document.head.appendChild(script);

      } catch (err) {
        console.error("Error injecting scripts:", err);
      }
    };

    fetchAndInject();

    return () => { mounted = false; };
  }, []);

  return null;
};

export default ExternalScripts;