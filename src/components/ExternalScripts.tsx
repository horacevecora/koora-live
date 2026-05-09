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

        const container = document.createElement('div');
        container.innerHTML = data.value;

        const scripts = container.querySelectorAll('script');
        scripts.forEach((oldScript) => {
          const newScript = document.createElement('script');
          Array.from(oldScript.attributes).forEach((attr) => {
            newScript.setAttribute(attr.name, attr.value);
          });
          if (oldScript.innerHTML) {
            newScript.appendChild(document.createTextNode(oldScript.innerHTML));
          }
          document.head.appendChild(newScript);
        });

        const otherTags = container.querySelectorAll('meta, link, style');
        otherTags.forEach((tag) => {
          document.head.appendChild(tag.cloneNode(true));
        });

      } catch (error) {
        console.error("Error injecting external scripts:", error);
      }
    };

    loadScripts();
  }, []);

  return null;
};

export default ExternalScripts;