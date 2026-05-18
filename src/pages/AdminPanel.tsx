"use client";

import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Code, Save, Loader2 } from "lucide-react";
import { showSuccess, showError } from "@/utils/toast";
import { supabase } from "@/integrations/supabase/client";

const AdminPanel = () => {
  const [adScript, setAdScript] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetchCurrentScript();
  }, []);

  const fetchCurrentScript = async () => {
    const { data } = await supabase
      .from('site_files')
      .select('content')
      .eq('filename', 'dynamic-ads.js')
      .maybeSingle();
    if (data) setAdScript(data.content);
  };

  const saveDynamicScript = async () => {
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('site_files')
        .upsert({ 
          filename: 'dynamic-ads.js', 
          content: adScript, 
          content_type: 'application/javascript' 
        }, { onConflict: 'filename' });
      
      if (error) throw error;
      showSuccess("تم تحديث كود الإعلانات بنجاح وسيظهر في الموقع فوراً!");
    } catch (err) {
      showError("حدث خطأ أثناء الحفظ");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#020617] text-white p-8" dir="rtl">
      <Card className="bg-[#0f172a] border-slate-800 shadow-xl max-w-3xl mx-auto">
        <CardHeader>
          <CardTitle className="text-2xl font-black flex items-center gap-3">
            <Code className="text-indigo-500" /> إدارة كود الإعلانات الرئيسي
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-slate-400 text-sm">هذا الكود سيتم تطبيقه في الصفحة الرئيسية وكل صفحات الموقع تلقائياً.</p>
          <Textarea 
            value={adScript}
            onChange={(e) => setAdScript(e.target.value)}
            className="min-h-[300px] bg-slate-900 border-slate-700 font-mono text-xs"
            placeholder="ألصق كود الإعلانات هنا..."
          />
          <Button onClick={saveDynamicScript} className="w-full bg-indigo-600 hover:bg-indigo-700" disabled={isSaving}>
            {isSaving ? <Loader2 className="animate-spin" /> : <Save className="ml-2" size={18} />} حفظ الكود
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminPanel;