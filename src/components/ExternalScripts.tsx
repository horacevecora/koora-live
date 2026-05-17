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

        if (error) {
          console.error("Supabase error fetching scripts:", error);
          return;
        }

        if (data && data.value) {
          // تنظيف أي أكواد تم حقنها سابقاً لتجنب التكرار
          document.querySelectorAll('[data-injected="true"]').forEach(el => el.remove());

          const parser = new DOMParser();
          const doc = parser.parseFromString(data.value, 'text/html');

          // 1. حقن Meta و Link
          const headElements = doc.querySelectorAll('meta, link, title');
          headElements.forEach(el => {
            const clone = el.cloneNode(true) as HTMLElement;
            clone.setAttribute('data-injected', 'true');
            document.head.appendChild(clone);
          });

          // 2. حقن Scripts بشكل يضمن التنفيذ
          const scripts = doc.querySelectorAll('script');
          scripts.forEach(oldScript => {
            const newScript = document.createElement('script');
            newScript.setAttribute('data-injected', 'true');
            
            // نسخ جميع الخصائص (مثل src, async, defer, type)
            Array.from(oldScript.attributes).forEach(attr => {
              newScript.setAttribute(attr.name, attr.value);
            });
            
            // معالجة السكربتات المكتوبة مباشرة (Inline) أو التي لها رابط (External)
            if (oldScript.src) {
              newScript.src = oldScript.src;
            } else {
              newScript.textContent = oldScript.textContent;
            }
            
            document.head.appendChild(newScript);
          });
        }
      } catch (err) {
        console.error("Failed to safely inject scripts:", err);
      }
    };

    loadScripts();
  }, []);

  return null;
};

export default ExternalScripts;