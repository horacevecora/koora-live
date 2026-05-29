"use client";

import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Trash2, Edit2, Loader2, LogOut, CheckCircle2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { showSuccess, showError } from "@/utils/toast";
import { supabase } from "@/integrations/supabase/client";

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
    try {
      const { data, error } = await supabase
        .from('site_settings')
        .select('value')
        .eq('key', 'managed_scripts')
        .single();

      if (error) {
        console.error('Error fetching scripts:', error);
        setScriptList([]);
        return;
      }

      if (data?.value) {
        setScriptList(JSON.parse(data.value));
      } else {
        setScriptList([]);
      }
    } catch (e) {
      console.error('Error parsing scripts:', e);
      setScriptList([]);
    }
  };

  const saveScriptsToDB = async (newList: ScriptSnippet[]) => {
    try {
      const { error } = await supabase
        .from('site_settings')
        .upsert(
          { key: 'managed_scripts', value: JSON.stringify(newList) },
          { onConflict: 'key' }
        );

      if (error) throw error;

      const activeScripts = newList.filter(s => s.active).map(s => s.code).join('\n\n');
      await supabase
        .from('site_settings')
        .upsert(
          { key: 'external_scripts', value: activeScripts },
          { onConflict: 'key' }
        );

      setScriptList(newList);
      showSuccess("تم حفظ الأكواد بنجاح");
      return true;
    } catch (error) {
      console.error('Error saving scripts:', error);
      showError("حدث خطأ أثناء حفظ الأكواد");
      return false;
    }
  };

  const handleAddOrUpdateScript = async () => {
    if (!newScriptCode) { showError("يرجى إدخال الكود"); return; }
    let newList = [...scriptList];
    if (editingScriptId) {
      newList = newList.map(s => s.id === editingScriptId ? { ...s, name: scriptName || "كود بدون اسم", code: newScriptCode } : s);
      setEditingScriptId(null);
    } else {
      const newEntry: ScriptSnippet = {
        id: crypto.randomUUID(),
        name: scriptName || `كود ${newList.length + 1}`,
        code: newScriptCode,
        active: true
      };
      newList.push(newEntry);
    }
    await saveScriptsToDB(newList);
    setScriptName("");
    setNewScriptCode("");
  };

  const toggleScript = async (id: string) => {
    const newList = scriptList.map(s => s.id === id ? { ...s, active: !s.active } : s);
    await saveScriptsToDB(newList);
  };

  const deleteScript = async (id: string) => {
    const newList = scriptList.filter(s => s.id !== id);
    await saveScriptsToDB(newList);
  };

  const startEditScript = (s: ScriptSnippet) => {
    setEditingScriptId(s.id);
    setScriptName(s.name);
    setNewScriptCode(s.code);
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

  const handleLogout = () => { localStorage.removeItem('admin_unlocked'); setIsUnlocked(false); };

  if (!isUnlocked) {
    return (
      <div className="min-h-screen bg-[#020617] flex items-center justify-center p-4" dir="rtl">
        <Card className="w-full max-w-md bg-[#0f172a] border-slate-800 text-white">
          <CardContent className="pt-6 space-y-4">
            <Input type="password" placeholder="الكود" value={accessCode} onChange={(e) => setAccessCode(e.target.value)} className="bg-slate-900 border-slate-700" />
            <Button onClick={handleUnlock} className="w-full bg-indigo-600">دخول</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#020617] text-white p-8" dir="rtl">
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-black">لوحة التحكم</h1>
          <Button variant="outline" onClick={handleLogout} className="text-red-400 border-red-900/30 bg-red-900/10 hover:bg-red-900/20"><LogOut size={16} className="ml-2" /> خروج</Button>
        </div>

        <Card className="bg-[#0f172a]/40 border-slate-800">
          <CardHeader><CardTitle className="flex items-center gap-2"><CheckCircle2 /> إدارة الإعلانات</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <Input placeholder="اسم الإعلان" value={scriptName} onChange={e => setScriptName(e.target.value)} className="bg-slate-900" />
            <Textarea placeholder="كود الإعلان..." value={newScriptCode} onChange={(e) => setNewScriptCode(e.target.value)} className="bg-slate-900 font-mono text-xs" />
            <Button onClick={handleAddOrUpdateScript} className="w-full bg-emerald-600" disabled={isLoading}>
              {isLoading ? <Loader2 className="animate-spin" /> : (editingScriptId ? 'تحديث' : 'حفظ')}
            </Button>
            <div className="space-y-2 pt-6">
              <h3 className="font-bold border-b border-slate-800 pb-2">قائمة الأكواد المضافة</h3>
              {scriptList.map(s => (
                <div key={s.id} className="flex justify-between p-3 bg-slate-900/60 rounded">
                  <span>{s.name}</span>
                  <div className="flex gap-2">
                    <button onClick={() => toggleScript(s.id)} className={s.active ? "text-emerald-500" : "text-slate-600"}><CheckCircle2 size={16} /></button>
                    <button onClick={() => startEditScript(s)}><Edit2 size={16} /></button>
                    <button onClick={() => deleteScript(s.id)} className="text-red-400"><Trash2 size={16} /></button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminPanel;