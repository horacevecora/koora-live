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

        // إنشاء حاوية مخفية للأكواد الخارجية لتنظيمها
        let container = document.getElementById('dyad-external-scripts');
        if (container) container.remove();
        
        container = document.createElement('div');
        container.id = 'dyad-external-scripts';
        container.style.display = 'none';
        document.head.appendChild(container);

        const range = document.createRange();
        const documentFragment = range.createContextualFragment(data.value);
        
        // حقن السكريبتات بطريقة تضمن التنفيذ الفوري
        const scripts = documentFragment.querySelectorAll('script');
        scripts.forEach(oldScript => {
          const newScript = document.createElement('script');
          Array.from(oldScript.attributes).forEach(attr => {
            newScript.setAttribute(attr.name, attr.value);
          });
          if (oldScript.innerHTML) {
            newScript.appendChild(document.createTextNode(oldScript.innerHTML));
          }
          container?.appendChild(newScript);
        });

        // حقن الميتا والستايلات
        const otherElements = documentFragment.querySelectorAll('link, meta, style');
        otherElements.forEach(el => container?.appendChild(el));

      } catch (err) {
        console.error("Error injecting external scripts:", err);
      }
    };

    fetchAndInject();
  }, []);

  return null;
};

export default ExternalScripts;