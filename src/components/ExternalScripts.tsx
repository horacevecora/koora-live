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

        if (error || !data?.value) return;

        // تنظيف الأكواد وحقنها في أعلى الرأس لضمان رؤيتها من قبل روبوتات الفحص
        const scriptsContent = data.value.trim();
        if (!scriptsContent) return;

        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = scriptsContent;
        
        const nodes = Array.from(tempDiv.childNodes);
        nodes.forEach(node => {
          if (node instanceof HTMLElement || node instanceof Text) {
            if (node instanceof HTMLScriptElement) {
              const script = document.createElement('script');
              // نسخ كافة الخصائص (Attributes)
              Array.from(node.attributes).forEach(attr => script.setAttribute(attr.name, attr.value));
              script.innerHTML = node.innerHTML;
              // وضعه في البداية ليكون أول ما يراه الروبوت
              document.head.prepend(script);
            } else {
              document.head.prepend(node.cloneNode(true));
            }
          }
        });

        console.log("✅ [Ads System] تم تفعيل الأكواد الإعلانية بنجاح");

      } catch (err) {
        console.error("❌ [Ads System] خطأ في تفعيل الأكواد:", err);
      }
    };

    loadScripts();
  }, []);

  return null;
};

export default ExternalScripts;