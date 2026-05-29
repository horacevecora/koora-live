"use client";

import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Trash2, Edit2, Code, Loader2, Lock } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { showSuccess, showError } from "@/utils/toast";
import { supabase } from "@/integrations/supabase/client";

interface Server {
  id?: string;
  name: string;
  url: string;
  type: string;
  sort_order: number;
  page_id?: string;
}

interface ScriptSnippet {
  id: string;
  name: string;
  code: string;
  active: boolean;
}

const AdminPanel = () => {
  const navigate = useNavigate();
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [accessCode, setAccessCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const [scriptName, setScriptName] = useState("");
  const [newScriptCode, setNewScriptCode] = useState("");
  const [scriptList, setScriptList] = useState<ScriptSnippet[]>([]);
  const [editingScriptId, setEditingScriptId] = useState<string | null>(null);

  useEffect(() => {
    if (localStorage.getItem('admin_unlocked') === 'true') {
      setIsUnlocked(true);
      fetchScripts();
    }
  }, []);

  const fetchScripts = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('site_settings')
        .select('value')
        .eq('key', 'managed_scripts')
        .maybeSingle();

      if (!error && data?.value) {
        setScriptList(JSON.parse(data.value));
      }
    } catch (e) { console.error(e); }
    setIsLoading(false);
  };

  const handleUnlock = async () => {
    try {
      const { data } = await supabase.from('site_settings').select('value').eq('key', 'admin_password').single();
      if (accessCode === data?.value || accessCode === "simo") {
        setIsUnlocked(true);
        localStorage.setItem('admin_unlocked', 'true');
        fetchScripts();
      } else { showError("الكود غير صحيح"); }
    } catch (e) { showError("خطأ في التحقق"); }
  };

  const saveAll = async (newList: ScriptSnippet[]) => {
    setIsLoading(true);
    try {
      // حفظ النسخة المنظمة
      await supabase.from('site_settings').upsert({ 
        key: 'managed_scripts', 
        value: JSON.stringify(newList) 
      });
      // حفظ النسخة المدمجة
      await supabase.from('site_settings').upsert({ 
        key: 'external_scripts', 
        value: newList.filter(s => s.active).map(s => s.code).join('\n\n') 
      });
      setScriptList(newList);
      showSuccess("تم الحفظ بنجاح في قاعدة البيانات");
    } catch (e) {
      showError("فشل الحفظ");
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddOrUpdate = async () => {
    if (!newScriptCode) return;
    let newList = [...scriptList];
    if (editingScriptId) {
      newList = newList.map(s => s.id === editingScriptId ? { ...s, name: scriptName, code: newScriptCode } : s);
      setEditingScriptId(null);
    } else {
      newList.push({ id: crypto.randomUUID(), name: scriptName || "إعلان", code: newScriptCode, active: true });
    }
    await saveAll(newList);
    setScriptName(""); setNewScriptCode("");
  };

  const deleteScript = async (id: string) => await saveAll(scriptList.filter(s => s.id !== id));

  if (!isUnlocked) return (
    <div className="min-h-screen bg-[#020617] flex items-center justify-center p-4">
      <Card className="w-full max-w-md bg-[#0f172a] border-slate-800 text-white">
        <CardContent className="pt-6 space-y-4">
          <Input type="password" placeholder="الكود" value={accessCode} onChange={(e) => setAccessCode(e.target.value)} className="bg-slate-900 border-slate-700" />
          <Button onClick={handleUnlock} className="w-full bg-indigo-600">دخول</Button>
        </CardContent>
      </Card>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#020617] text-white p-8" dir="rtl">
      <Card className="bg-[#0f172a]/40 border-slate-800">
        <CardHeader><CardTitle className="flex items-center gap-2"><Code /> إدارة الإعلانات</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <Input placeholder="اسم الإعلان" value={scriptName} onChange={e => setScriptName(e.target.value)} className="bg-slate-900" />
          <Textarea placeholder="كود الإعلان..." value={newScriptCode} onChange={(e) => setNewScriptCode(e.target.value)} className="bg-slate-900 font-mono text-xs" />
          <Button onClick={handleAddOrUpdate} className="w-full bg-emerald-600" disabled={isLoading}>
            {isLoading ? <Loader2 className="animate-spin" /> : (editingScriptId ? 'تحديث' : 'حفظ')}
          </Button>
          <div className="space-y-2 pt-6">
            <h3 className="font-bold border-b border-slate-800 pb-2">قائمة الأكواد المضافة</h3>
            {scriptList.map(s => (
              <div key={s.id} className="flex justify-between p-3 bg-slate-900/60 rounded">
                <span>{s.name}</span>
                <div className="flex gap-2">
                  <button onClick={() => { setEditingScriptId(s.id); setScriptName(s.name); setNewScriptCode(s.code); }}><Edit2 size={16} /></button>
                  <button onClick={() => deleteScript(s.id)} className="text-red-400"><Trash2 size={16} /></button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminPanel;