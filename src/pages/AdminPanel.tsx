"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { showSuccess, showError } from "@/utils/toast";
import { supabase } from "@/integrations/supabase/client";

const AdminPanel = () => {
  const [isLoading, setIsLoading] = useState(false);

  const fetchInitialData = useCallback(async () => {
    // منطق جلب البيانات هنا
  }, []);

  useEffect(() => {
    fetchInitialData();
  }, [fetchInitialData]);

  const importBackup = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; 
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const backup = JSON.parse(event.target?.result as string);
        setIsLoading(true);
        
        for (const page of backup.pages) {
          await supabase.from('pages').upsert({ name: page.name, slug: page.slug }, { onConflict: 'slug' });
        }

        const { data: currentPages } = await supabase.from('pages').select('*');
        
        for (const server of backup.servers) {
          const origPage = backup.pages.find((p: any) => p.id === server.page_id);
          const currPage = currentPages?.find(p => p.slug === origPage?.slug);
          
          if (currPage) {
            await supabase.from('servers').insert([{ 
              name: server.name, 
              url: server.url, 
              type: server.type, 
              sort_order: server.sort_order, 
              page_id: currPage.id 
            }]);
          }
        }
        showSuccess("تم الاستيراد بنجاح"); 
        fetchInitialData();
      } catch (err) { 
        console.error(err);
        showError("فشل الاستيراد: تأكد من صحة ملف الـ JSON"); 
      } finally { 
        setIsLoading(false); 
      }
    };
    reader.readAsText(file);
  };

  return (
    <Card className="p-6">
      <CardHeader>
        <CardTitle>لوحة التحكم</CardTitle>
      </CardHeader>
      <CardContent>
        <input type="file" onChange={importBackup} disabled={isLoading} />
        {isLoading && <p>جاري الاستيراد...</p>}
      </CardContent>
    </Card>
  );
};

export default AdminPanel;