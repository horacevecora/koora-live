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

        // استخدام Range لضمان معالجة السكربتات وتنفيذها بشكل صحيح تماماً كما في HTML الأصلي
        const range = document.createRange();
        range.selectNode(document.head);
        const fragment = range.createContextualFragment(data.value);
        
        // معالجة السكربتات بشكل خاص لضمان التنفيذ (لأن appendChild العادي للـ fragment قد لا ينفذ السكربتات في بعض المتصفحات)
        const scripts = fragment.querySelectorAll('script');
        scripts.forEach(oldScript => {
          const newScript = document.createElement('script');
          Array.from(oldScript.attributes).forEach(attr => newScript.setAttribute(attr.name, attr.value));
          newScript.textContent = oldScript.textContent;
          document.head.appendChild(newScript);
          oldScript.remove(); // إزالة القديم من الـ fragment
        });

        // إضافة ما تبقى (Meta, Link, Style)
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