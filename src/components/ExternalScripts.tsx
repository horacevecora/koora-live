"use client";

import { useEffect } from 'react';
import { supabase } from "@/integrations/supabase/client";

const ExternalScripts = () => {
  useEffect(() => {
    const fetchAndInject = async () => {
      try {
        // جلب الأكواد من الإعدادات
        const { data, error } = await supabase
          .from('site_settings')
          .select('value')
          .eq('key', 'external_scripts')
          .single();

        if (error || !data?.value) {
          console.log("[ExternalScripts] لا توجد أكواد خارجية لحقنها.");
          return;
        }

        console.log("[ExternalScripts] جاري حقن الأكواد الخارجية...");

        // تحويل النص إلى عناصر DOM
        const parser = new DOMParser();
        const doc = parser.parseFromString(data.value, 'text/html');
        
        // 1. حقن السكربتات
        const scripts = doc.querySelectorAll('script');
        scripts.forEach(oldScript => {
          const newScript = document.createElement('script');
          
          // نسخ كافة الخصائص (src, async, defer, data-zone, etc)
          Array.from(oldScript.attributes).forEach(attr => {
            newScript.setAttribute(attr.name, attr.value);
          });
          
          // نسخ المحتوى الداخلي إذا وجد
          if (oldScript.textContent) {
            newScript.textContent = oldScript.textContent;
          }
          
          // الحقن المباشر في الـ head لضمان رؤيتها من قبل أدوات التحقق
          document.head.appendChild(newScript);
        });

        // 2. حقن الميتا والستايلات والروابط الأخرى
        const otherElements = doc.querySelectorAll('link, meta, style');
        otherElements.forEach(el => {
          document.head.appendChild(el.cloneNode(true));
        });

        console.log("[ExternalScripts] تم حقن الأكواد بنجاح.");

      } catch (err) {
        console.error("[ExternalScripts] خطأ في حقن الأكواد:", err);
      }
    };

    fetchAndInject();
  }, []);

  return null;
};

export default ExternalScripts;