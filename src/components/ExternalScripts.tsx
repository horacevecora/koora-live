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

        // تحويل النص إلى عناصر HTML وحقنها في الـ head
        const range = document.createRange();
        const documentFragment = range.createContextualFragment(data.value);
        
        // حقن كل سكريبت بشكل صحيح لضمان تنفيذه
        const scripts = documentFragment.querySelectorAll('script');
        scripts.forEach(oldScript => {
          const newScript = document.createElement('script');
          Array.from(oldScript.attributes).forEach(attr => {
            newScript.setAttribute(attr.name, attr.value);
          });
          newScript.appendChild(document.createTextNode(oldScript.innerHTML));
          document.head.appendChild(newScript);
        });

        // حقن باقي العناصر (مثل link أو meta) إذا وجدت
        const otherElements = documentFragment.querySelectorAll('link, meta, style');
        otherElements.forEach(el => document.head.appendChild(el));

      } catch (err) {
        console.error("Error injecting external scripts:", err);
      }
    };

    fetchAndInject();
  }, []);

  return null;
};

export default ExternalScripts;