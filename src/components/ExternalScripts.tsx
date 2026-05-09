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

        if (error) {
          console.error("[ExternalScripts] Error fetching from Supabase:", error);
          return;
        }

        if (!data?.value) {
          console.log("[ExternalScripts] No scripts found in Admin panel.");
          return;
        }

        console.log("[ExternalScripts] Injecting scripts from Admin...");

        // استخدام DOMParser لضمان معالجة صحيحة للأكواد
        const parser = new DOMParser();
        const doc = parser.parseFromString(data.value, 'text/html');
        
        // حقن جميع العناصر الموجودة في الـ head والـ body من الكود المخزن
        const elements = doc.querySelectorAll('script, meta, link, style');
        
        elements.forEach((el) => {
          const newEl = document.createElement(el.tagName);
          
          // نسخ جميع الخصائص (Attributes)
          Array.from(el.attributes).forEach(attr => {
            newEl.setAttribute(attr.name, attr.value);
          });
          
          // نسخ المحتوى الداخلي (مثل أكواد الجافا سكريبت أو الـ CSS)
          if (el.innerHTML) {
            newEl.innerHTML = el.innerHTML;
          }
          
          document.head.appendChild(newEl);
        });

        console.log("[ExternalScripts] Injection complete.");

      } catch (error) {
        console.error("[ExternalScripts] Critical error:", error);
      }
    };

    loadScripts();
  }, []);

  return null;
};

export default ExternalScripts;