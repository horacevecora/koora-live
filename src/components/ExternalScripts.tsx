"use client";

import { useEffect } from 'react';
import { supabase } from "@/integrations/supabase/client";

const ExternalScripts = () => {
  useEffect(() => {
    const loadScripts = async () => {
      try {
        const { data, error } = await supabase
          .from('site_settings')
          .select('value')
          .eq('key', 'external_scripts')
          .maybeSingle();

        if (data && data.value) {
          const parser = new DOMParser();
          const doc = parser.parseFromString(`<div>${data.value}</div>`, 'text/html');
          const container = doc.body.firstChild as HTMLElement;

          if (!container) return;

          // Inject scripts securely (only after authentication/RLS is enabled)
          const scripts = container.querySelectorAll('script');
          scripts.forEach(oldScript => {
            const newScript = document.createElement('script');
            Array.from(oldScript.attributes).forEach(attr => {
              newScript.setAttribute(attr.name, attr.value);
            });
            newScript.textContent = oldScript.textContent;
            document.head.appendChild(newScript);
          });

          const others = container.querySelectorAll('meta, link');
          others.forEach(el => {
            document.head.appendChild(el.cloneNode(true));
          });
        }
      } catch (err) {
        console.error("Security: Failed to safely inject scripts:", err);
      }
    };

    loadScripts();
  }, []);

  return null;
};

export default ExternalScripts;