"use client";

import { useEffect } from 'react';

const ExternalScripts = () => {
  useEffect(() => {
    // تحميل الأكواد من التخزين
    const savedScripts = localStorage.getItem('site_external_scripts');
    if (!savedScripts) return;

    try {
      // إنشاء حاوية مؤقتة لتحليل الأكواد
      const container = document.createElement('div');
      container.innerHTML = savedScripts;

      // استخراج وحقن جميع السكربتات
      const scripts = container.querySelectorAll('script');
      scripts.forEach((oldScript) => {
        const newScript = document.createElement('script');
        
        // نسخ جميع الخصائص (src, async, defer, etc.)
        Array.from(oldScript.attributes).forEach((attr) => {
          newScript.setAttribute(attr.name, attr.value);
        });

        // نسخ المحتوى الداخلي للسكربت إن وجد
        if (oldScript.innerHTML) {
          newScript.appendChild(document.createTextNode(oldScript.innerHTML));
        }

        document.head.appendChild(newScript);
      });

      // حقن الأكواد الأخرى (مثل meta tags أو css) التي ليست سكربتات
      const otherTags = container.querySelectorAll('meta, link, style');
      otherTags.forEach((tag) => {
        document.head.appendChild(tag.cloneNode(true));
      });

    } catch (error) {
      console.error("Error injecting external scripts:", error);
    }
  }, []);

  return null; // هذا المكون لا يظهر شيئاً في الواجهة
};

export default ExternalScripts;