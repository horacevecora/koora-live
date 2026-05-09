"use client";

import { useEffect } from 'react';
import { supabase } from "@/integrations/supabase/client";

const ExternalScripts = () => {
  useEffect(() => {
    const loadScripts = async () => {
      try {
        // جلب الأكواد من Supabase
        const { data, error } = await supabase
          .from('site_settings')
          .select('value')
          .eq('key', 'external_scripts')
          .single();

        if (error || !data?.value) return;

        // تحويل النص إلى عناصر HTML وحقنها مباشرة في الـ Head
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = data.value.trim();
        
        const nodes = Array.from(tempDiv.childNodes);
        nodes.forEach(node => {
          if (node instanceof HTMLElement || node instanceof Text) {
            // إذا كان سكريبت، نحتاج لإنشائه يدوياً ليعمل
            if (node instanceof HTMLScriptElement) {
              const script = document.createElement('script');
              Array.from(node.attributes).forEach(attr => script.setAttribute(attr.name, attr.value));
              script.innerHTML = node.innerHTML;
              document.head.appendChild(script);
            } else {
              // للميتا تاج والستايل والروابط
              document.head.appendChild(node.cloneNode(true));
            }
          }
        });

        console.log("✅ [Admin Scripts] تم حقن الأكواد بنجاح من لوحة التحكم");

      } catch (err) {
        console.error("❌ [Admin Scripts] خطأ في الحقن:", err);
      }
    };

    loadScripts();
  }, []);

  return null;
};

export default ExternalScripts;