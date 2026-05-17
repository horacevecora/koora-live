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
          .single();

        if (data && data.value) {
          // إنشاء حاوية مؤقتة لتحليل كود HTML المستلم
          const parser = new DOMParser();
          const doc = parser.parseFromString(`<div>${data.value}</div>`, 'text/html');
          const container = doc.body.firstChild as HTMLElement;

          if (!container) return;

          // معالجة وحقن السكربتات (لأن innerHTML لا يشغل السكربتات تلقائياً)
          const scripts = container.querySelectorAll('script');
          scripts.forEach(oldScript => {
            const newScript = document.createElement('script');
            
            // نسخ كل السمات (Attributes) مثل src, type, etc.
            Array.from(oldScript.attributes).forEach(attr => {
              newScript.setAttribute(attr.name, attr.value);
            });
            
            // نسخ المحتوى الداخلي للسكربت
            newScript.textContent = oldScript.textContent;
            
            document.head.appendChild(newScript);
          });

          // معالجة وحقن عناصر الميتا والروابط الأخرى
          const others = container.querySelectorAll('meta, link');
          others.forEach(el => {
            document.head.appendChild(el.cloneNode(true));
          });
        }
      } catch (err) {
        console.error("Failed to inject external scripts:", err);
      }
    };

    loadScripts();
  }, []);

  return null;
};

export default ExternalScripts;