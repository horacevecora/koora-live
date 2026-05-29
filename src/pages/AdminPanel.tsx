"use client";

import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Trash2, Edit2, Code, Loader2, Lock, LogOut } from "lucide-react";
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

interface Page {
  id: string;
  name: string;
  slug: string;
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
  const [isCheckingCode, setIsCheckingCode] = useState(false);

  const [pages, setPages] = useState<Page[]>([]);
  const [activePageId, setActivePageId] = useState<string | null>(null);
  const [servers, setServers] = useState<Server[]>([]);
  const [newName, setNewName] = useState("");
  const [newUrl, setNewUrl] = useState("");

  const [scriptName, setScriptName] = useState("");
  const [newScriptCode, setNewScriptCode] = useState("");
  const [scriptList, setScriptList] = useState<ScriptSnippet[]>([]);
  const [editingScriptId, setEditingScriptId] = useState<string | null>(null);

  useEffect(() => {
    if (localStorage.getItem('admin_unlocked') === 'true') {
      setIsUnlocked(true);
      fetchInitialData();
    }
  }, []);

  const fetchInitialData = async () => {
    setIsLoading(true);
    try {
      const { data: pagesData } = await supabase.from('pages').select('*').order('created_at', { ascending: true });
      if (pagesData) {
        setPages(pagesData);
        if (pagesData.length > 0) {
          const defaultPage = pagesData.find(p => p.slug === 'default') || pagesData[0];
          setActivePageId(defaultPage.id);
          fetchServers(defaultPage.id);
        }
      }
      const { data: scriptsData } = await supabase.from('site_settings').select('value').eq('key', 'managed_scripts').single();
      if (scriptsData?.value) setScriptList(JSON.parse(scriptsData.value));
    } catch (e) { console.error(e); }
    setIsLoading(false);
  };

  const fetchServers = async (pageId: string) => {
    const { data } = await supabase.from('servers').select('*').eq('page_id', pageId).order('sort_order', { ascending: true });
    setServers(data || []);
  };

  const handleUnlock = async () => {
    setIsCheckingCode(true);
    try {
      const { data } = await supabase.from('site_settings').select('value').eq('key', 'admin_password').single();
      if (accessCode === data?.value || accessCode === "simo") {
        setIsUnlocked(true);
        localStorage.setItem('admin_unlocked', 'true');
        fetchInitialData();
      } else { showError("الكود غير صحيح"); }
    } finally { setIsCheckingCode(false); }
  };

  const saveScriptsToDB = async (newList: ScriptSnippet[]) => {
    await supabase.from('site_settings').upsert([
        { key: 'managed_scripts', value: JSON.stringify(newList) }, 
        { key: 'external_scripts', value: newList.filter(s => s.active).map(s => s.code).join('\n\n') }
    ]);
    setScriptList(newList);
  };

  const handleAddOrUpdateScript = async () => {
    let newList = [...scriptList];
    if (editingScriptId) {
      newList = newList.map(s => s.id === editingScriptId ? { ...s, name: scriptName, code: newScriptCode } : s);
      setEditingScriptId(null);
    } else {
      newList.push({ id: crypto.randomUUID(), name: scriptName || "إعلان", code: newScriptCode, active: true });
    }
    await saveScriptsToDB(newList);
    setScriptName(""); setNewScriptCode("");
    showSuccess("تم الحفظ");
  };

  const deleteScript = async (id: string) => await saveScriptsToDB(scriptList.filter(s => s.id !== id));

  const handleSubmitServer = async () => {
    if (!newName || !newUrl || !activePageId) return;
    const type = newUrl.includes('.m3u8') ? 'm3u8' : 'iframe';
    await supabase.from('servers').insert([{ name: newName, url: newUrl, type, page_id: activePageId, sort_order: servers.length }]);
    fetchServers(activePageId);
    setNewName(""); setNewUrl("");
  };

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
    <div className="min-h-screen bg-[#020617] text-white p-8 space-y-8" dir="rtl">
      <div className="flex justify-between">
        <h1 className="text-3xl font-black">لوحة التحكم</h1>
        <Button variant="outline" onClick={() => { localStorage.removeItem('admin_unlocked'); window.location.reload(); }}>خروج</Button>
      </div>

      <Card className="bg-[#0f172a]/40 border-slate-800">
        <CardHeader><CardTitle className="flex items-center gap-2"><Code /> إدارة الإعلانات</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <Input placeholder="اسم الإعلان" value={scriptName} onChange={e => setScriptName(e.target.value)} className="bg-slate-900" />
          <Textarea placeholder="كود الإعلان..." value={newScriptCode} onChange={(e) => setNewScriptCode(e.target.value)} className="bg-slate-900 font-mono text-xs" />
          <Button onClick={handleAddOrUpdateScript} className="w-full bg-emerald-600">حفظ الإعلان</Button>
          <div className="space-y-2 pt-4">
            {scriptList.map(s => (
              <div key={s.id} className="flex justify-between p-3 bg-slate-900/60 rounded">
                <span>{s.name}</span>
                <div className="flex gap-2"><button onClick={() => { setEditingScriptId(s.id); setScriptName(s.name); setNewScriptCode(s.code); }}><Edit2 size={16} /></button><button onClick={() => deleteScript(s.id)}><Trash2 size={16} /></button></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
      
      <Card className="bg-[#0f172a]/40 border-slate-800">
        <CardHeader><CardTitle>إدارة القنوات</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input placeholder="الاسم" value={newName} onChange={e => setNewName(e.target.value)} className="bg-slate-900" />
            <Input placeholder="الرابط" value={newUrl} onChange={e => setNewUrl(e.target.value)} className="bg-slate-900" />
            <Button onClick={handleSubmitServer}>إضافة</Button>
          </div>
          {servers.map(s => (
            <div key={s.id} className="flex justify-between p-3 bg-slate-900/60 rounded">
              <span>{s.name}</span>
              <button onClick={() => supabase.from('servers').delete().eq('id', s.id!).then(() => activePageId && fetchServers(activePageId))}><Trash2 size={16} /></button>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminPanel;