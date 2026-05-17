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

        // تنظيف الأكواد لمنع التكرار إذا كان الكود موجوداً بالفعل في index.html
        const scriptsInHead = Array.from(document.head.querySelectorAll('script')).map(s => s.src || s.textContent);
        
        const range = document.createRange();
        range.selectNode(document.head);
        const fragment = range.createContextualFragment(data.value);
        
        const scripts = fragment.querySelectorAll('script');
        scripts.forEach(oldScript => {
          const scriptContent = oldScript.src || oldScript.textContent;
          // تجنب تكرار السكربت إذا كان محقوناً يدوياً
          if (scriptsInHead.includes(scriptContent)) {
            oldScript.remove();
            return;
          }

          const newScript = document.createElement('script');
          Array.from(oldScript.attributes).forEach(attr => newScript.setAttribute(attr.name, attr.value));
          newScript.textContent = oldScript.textContent;
          document.head.appendChild(newScript);
          oldScript.remove();
        });

        document.head.appendChild(fragment);

      } catch (err) {
        console.error("[ExternalScripts] Error:", err);
      }
    };

    fetchAndInject();
  }, []);

  return null;
};

export default ExternalScripts;