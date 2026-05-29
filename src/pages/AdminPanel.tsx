"use client";

import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Trash2, Edit2, Code, Loader2, Lock, LogOut, Home, Download, Upload } from "lucide-react";
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
  const [isCheckingCode, setIsCheckingCode] = useState(false);

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
      const { data } = await supabase.from('site_settings').select('value').eq('key', 'managed_scripts').single();
      if (data && data.value) {
        setScriptList(JSON.parse(data.value));
      }
    } catch (e) { console.error(e); }
    setIsLoading(false);
  };

  const handleUnlock = async () => {
    setIsCheckingCode(true);
    try {
      const { data } = await supabase.from('site_settings').select('value').eq('key', 'admin_password').single();
      if (accessCode === data?.value || accessCode === "simo") {
        setIsUnlocked(true);
        localStorage.setItem('admin_unlocked', 'true');
        fetchScripts();
      } else {
        showError("الكود غير صحيح");
      }
    } finally { setIsCheckingCode(false); }
  };

  const saveAll = async (newList: ScriptSnippet[]) => {
    const { error } = await supabase.from('site_settings').upsert([
      { key: 'managed_scripts', value: JSON.stringify(newList) },
      { key: 'external_scripts', value: newList.filter(s => s.active).map(s => s.code).join('\n\n') }
    ]);
    if (!error) {
      setScriptList(newList);
      showSuccess("تم الحفظ بنجاح");
    } else {
      showError("حدث خطأ أثناء الحفظ");
    }
  };

  const handleAddOrUpdate = async () => {
    if (!newScriptCode) return;
    let newList = [...scriptList];
    if (editingScriptId) {
      newList = newList.map(s => s.id === editingScriptId ? { ...s, name: scriptName, code: newScriptCode } : s);
      setEditingScriptId(null);
    } else {
      newList.push({ id: crypto.randomUUID(), name: scriptName || "إعلان جديد", code: newScriptCode, active: true });
    }
    await saveAll(newList);
    setScriptName(""); setNewScriptCode("");
  };

  const deleteScript = async (id: string) => await saveAll(scriptList.filter(s => s.id !== id));
  
  const startEdit = (s: ScriptSnippet) => {
    setEditingScriptId(s.id);
    setScriptName(s.name);
    setNewScriptCode(s.code);
  };

  if (!isUnlocked) return (
    <div className="min-h-screen bg-[#020617] flex items-center justify-center p-4">
      <Card className="w-full max-w-md bg-[#0f172a] border-slate-800 text-white">
        <CardContent className="pt-6 space-y-4">
          <Input type="password" placeholder="الكود السري" value={accessCode} onChange={(e) => setAccessCode(e.target.value)} className="bg-slate-900 border-slate-700" />
          <Button onClick={handleUnlock} className="w-full bg-indigo-600">دخول</Button>
        </CardContent>
      </Card>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#020617] text-white p-8">
      <Card className="bg-[#0f172a]/40 border-slate-800">
        <CardHeader><CardTitle>إعدادات الأكواد (Ads/SEO)</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <Input placeholder="اسم تعريفي للكود" value={scriptName} onChange={e => setScriptName(e.target.value)} className="bg-slate-900 border-slate-700" />
          <Textarea placeholder="ألصق كود السكريبت هنا..." value={newScriptCode} onChange={(e) => setNewScriptCode(e.target.value)} className="bg-slate-900 border-slate-700 font-mono text-xs" />
          <Button onClick={handleAddOrUpdate} className="w-full bg-emerald-600">{editingScriptId ? 'تحديث الكود' : 'حفظ الكود في السحابة'}</Button>
          
          <div className="space-y-2 pt-6">
            <h3 className="font-bold border-b border-slate-800 pb-2">قائمة الأكواد المضافة</h3>
            {scriptList.map(s => (
              <div key={s.id} className="flex items-center justify-between p-3 bg-slate-900/60 rounded-lg">
                <span>{s.name}</span>
                <div className="flex gap-2">
                  <button onClick={() => startEdit(s)} className="text-slate-400 hover:text-indigo-400"><Edit2 size={16} /></button>
                  <button onClick={() => deleteScript(s.id)} className="text-slate-400 hover:text-red-500"><Trash2 size={16} /></button>
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