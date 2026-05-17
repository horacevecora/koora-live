import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./globals.css";
import { supabase } from "@/integrations/supabase/client";

// محرك حقن الأكواد من قاعدة البيانات (يعمل فوراً عند فتح الموقع)
const injectExternalScripts = async () => {
  try {
    const { data } = await supabase
      .from('site_settings')
      .select('value')
      .eq('key', 'external_scripts')
      .single();

    if (data?.value) {
      const range = document.createRange();
      range.selectNode(document.head);
      const fragment = range.createContextualFragment(data.value);
      
      const scripts = fragment.querySelectorAll('script');
      scripts.forEach(oldScript => {
        const newScript = document.createElement('script');
        Array.from(oldScript.attributes).forEach(attr => newScript.setAttribute(attr.name, attr.value));
        newScript.textContent = oldScript.textContent;
        document.head.appendChild(newScript);
        oldScript.remove();
      });
      document.head.appendChild(fragment);
    }
  } catch (e) {
    console.error("Scripts injection failed", e);
  }
};

// تشغيل الحقن فوراً
injectExternalScripts();

createRoot(document.getElementById("root")!).render(<App />);