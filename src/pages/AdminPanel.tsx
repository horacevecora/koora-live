"use client";

import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Trash2, Edit2, Plus, Home, Layout, ExternalLink, Code, Loader2, ListPlus, Lock, LogOut, ChevronUp, ChevronDown, Download, Upload, XCircle, FileCode, CheckCircle2, Circle, Eye } from "lucide-react";
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

interface SiteFile {
  id: string;
  filename: string;
  content: string;
  content_type: string;
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
  const [activePageName, setActivePageName] = useState("");
  const [newPageName, setNewPageName] = useState("");
  const [newPageSlug, setNewPageSlug] = useState("");

  const [servers, setServers] = useState<Server[]>([]);
  const [newName, setNewName] = useState("");
  const [newUrl, setNewUrl] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);

  const [scriptName, setScriptName] = useState("");
  const [newScriptCode, setNewScriptCode] = useState("");
  const [scriptList, setScriptList] = useState<ScriptSnippet[]>([]);
  const [editingScriptId, setEditingScriptId] = useState<string | null>(null);

  const [bulkInput, setBulkInput] = useState("");

  const [siteFiles, setSiteFiles] = useState<SiteFile[]>([]);
  const [newFileName, setNewFileName] = useState("sw.js");
  const [newFileContent, setNewFileContent] = useState("");

  useEffect(() => {
    const savedAuth = localStorage.getItem('admin_unlocked');
    if (savedAuth === 'true') {
      setIsUnlocked(true);
      fetchInitialData();
    }
  }, []);

  const handleUnlock = async () => {
    setIsCheckingCode(true);
    try {
      const { data, error } = await supabase
        .from('site_settings')
        .select('value')
        .eq('key', 'admin_password')
        .single();

      if (error) throw error;

      if (accessCode === data.value) {
        setIsUnlocked(true);
        localStorage.setItem('admin_unlocked', 'true');
        fetchInitialData();
        showSuccess("تم الدخول بنجاح");
      } else {
        showError("الكود السري غير صحيح");
      }
    } catch (err) {
      if (accessCode === "simo") {
        setIsUnlocked(true);
        localStorage.setItem('admin_unlocked', 'true');
        fetchInitialData();
        showSuccess("تم الدخول (كود احتياطي)");
      } else {
        showError("خطأ في التحقق من الكود");
      }
    } finally {
      setIsCheckingCode(false);
    }
  };

  const fetchInitialData = async () => {
    setIsLoading(true);
    try {
      const { data: pagesData } = await supabase.from('pages').select('*').order('created_at', { ascending: true });
      if (pagesData && pagesData.length > 0) {
        setPages(pagesData);
        const defaultPage = pagesData.find(p => p.slug === 'default') || pagesData[0];
        setActivePageId(defaultPage.id);
        setActivePageName(defaultPage.name);
        fetchServers(defaultPage.id);
      }

      const { data: scriptsData } = await supabase.from('site_settings').select('value').eq('key', 'managed_scripts').single();
      if (scriptsData && scriptsData.value) {
        setScriptList(JSON.parse(scriptsData.value));
      }

      const { data: filesData } = await supabase.from('site_files').select('*');
      if (filesData) setSiteFiles(filesData);

    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchServers = async (pageId: string) => {
    const { data } = await supabase.from('servers').select('*').eq('page_id', pageId).order('sort_order', { ascending: true });
    setServers(data || []);
  };

  const saveScriptsToDB = async (newList: ScriptSnippet[]) => {
    const { error: error1 } = await supabase.from('site_settings').upsert({ key: 'managed_scripts', value: JSON.stringify(newList) }, { onConflict: 'key' });
    const combinedScripts = newList.filter(s => s.active).map(s => s.code).join('\n\n');
    const { error: error2 } = await supabase.from('site_settings').upsert({ key: 'external_scripts', value: combinedScripts }, { onConflict: 'key' });
    
    if (error1 || error2) {
        showError("خطأ في حفظ البيانات في السحابة");
        return false;
    }
    setScriptList(newList);
    return true;
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
    const success = await saveScriptsToDB(newList);
    if (success) {
      showSuccess("تم حفظ الكود في السحابة بنجاح");
      setScriptName("");
      setNewScriptCode("");
    }
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
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const addPage = async () => {
    if (!newPageName || !newPageSlug) return;
    const { data, error } = await supabase.from('pages').insert([{ name: newPageName, slug: newPageSlug }]).select().single();
    if (!error) { setPages([...pages, data]); setNewPageName(""); setNewPageSlug(""); showSuccess("تم إنشاء الصفحة"); }
  };

  const deletePage = async (id: string, slug: string) => {
    if (slug === 'default') return;
    const { error } = await supabase.from('pages').delete().eq('id', id);
    if (!error) { setPages(pages.filter(p => p.id !== id)); showSuccess("تم حذف الصفحة"); }
  };

  const handleSubmit = async () => {
    if (!newName || !newUrl || !activePageId) return;
    const type = detectType(newUrl);
    if (editingId) {
      const { error } = await supabase.from('servers').update({ name: newName, url: newUrl, type }).eq('id', editingId);
      if (!error) { showSuccess("تم التحديث"); fetchServers(activePageId); setEditingId(null); setNewName(""); setNewUrl(""); }
    } else {
      const { error } = await supabase.from('servers').insert([{ name: newName, url: newUrl, type, page_id: activePageId, sort_order: servers.length }]);
      if (!error) { showSuccess("تمت الإضافة"); fetchServers(activePageId); setNewName(""); setNewUrl(""); }
    }
  };

  const detectType = (url: string): string => {
    const lowUrl = url.toLowerCase();
    if (lowUrl.includes('.m3u8')) return 'm3u8';
    if (lowUrl.includes('.ts') || lowUrl.includes('type=http')) return 'ts';
    if (lowUrl.includes('youtube.com') || lowUrl.includes('youtu.be')) return 'youtube';
    if (lowUrl.includes('facebook.com') || lowUrl.includes('fb.watch')) return 'facebook';
    return 'iframe';
  };

  const handleBulkAdd = async () => {
    if (!bulkInput || !activePageId) return;
    const lines = bulkInput.split('\n').filter(line => line.trim() !== '');
    const newServers = lines.map((line, index) => {
      const parts = line.split('=');
      if (parts.length >= 2) {
        const name = parts[0].trim();
        const url = parts.slice(1).join('=').trim();
        return { name, url, type: detectType(url), page_id: activePageId, sort_order: servers.length + index };
      }
      return null;
    }).filter(Boolean) as Server[];
    if (newServers.length > 0) {
      const { error } = await supabase.from('servers').insert(newServers);
      if (!error) { showSuccess(`تم إضافة ${newServers.length} قناة`); fetchServers(activePageId); setBulkInput(""); }
    }
  };

  const deleteChannel = async (id: string) => {
    const { error } = await supabase.from('servers').delete().eq('id', id);
    if (!error && activePageId) fetchServers(activePageId);
  };

  const moveChannel = async (index: number, direction: 'up' | 'down') => {
    if (!activePageId) return;
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= servers.length) return;
    const updatedServers = [...servers];
    const temp = updatedServers[index].sort_order;
    updatedServers[index].sort_order = updatedServers[newIndex].sort_order;
    updatedServers[newIndex].sort_order = temp;
    await supabase.from('servers').update({ sort_order: updatedServers[index].sort_order }).eq('id', updatedServers[index].id);
    await supabase.from('servers').update({ sort_order: updatedServers[newIndex].sort_order }).eq('id', updatedServers[newIndex].id);
    fetchServers(activePageId);
  };

  const handleSaveFile = async () => {
    if (!newFileName || !newFileContent) return;
    const { error } = await supabase.from('site_files').upsert({ filename: newFileName, content: newFileContent, content_type: newFileName.endsWith('.js') ? 'application/javascript' : 'text/plain' }, { onConflict: 'filename' });
    if (!error) { showSuccess("تم حفظ الملف"); fetchInitialData(); setNewFileContent(""); }
  };

  const deleteFile = async (id: string) => {
    const { error } = await supabase.from('site_files').delete().eq('id', id);
    if (!error) { showSuccess("تم حذف الملف"); fetchInitialData(); }
  };

  const exportBackup = async () => {
    const { data: pagesData } = await supabase.from('pages').select('*');
    const { data: serversData } = await supabase.from('servers').select('*');
    const backup = { pages: pagesData, servers: serversData, timestamp: new Date().toISOString() };
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `koora-live-backup.json`; a.click();
  };

  const importBackup = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const backup = JSON.parse(event.target?.result as string);
        setIsLoading(true);
        for (const page of backup.pages) await supabase.from('pages').upsert({ name: page.name, slug: page.slug }, { onConflict: 'slug' });
        const { data: currentPages } = await supabase.from('pages').select('*');
        for (const server of backup.servers) {
          const origPage = backup.pages.find((p: any) => p.id === server.page_id);
          const currPage = currentPages?.find(p => p.slug === origPage?.slug);
          if (currPage) await supabase.from('servers').insert([{ name: server.name, url: server.url, type: server.type, sort_order: server.sort_order, page_id: currPage.id }]);
        }
        showSuccess("تم الاستيراد بنجاح"); fetchInitialData();
      } catch (err) { showError("فشل الاستيراد"); } finally { setIsLoading(false); }
    };
    reader.readAsText(file);
  };

  const handleLogout = () => { localStorage.removeItem('admin_unlocked'); setIsUnlocked(false); };

  if (!isUnlocked) {
    return (
      <div className="min-h-screen bg-[#020617] flex items-center justify-center p-4 font-sans" dir="rtl">
        <Card className="w-full max-w-md bg-[#0f172a] border-slate-800 text-white shadow-2xl">
          <CardHeader className="text-center space-y-2">
            <div className="mx-auto w-12 h-12 bg-indigo-600/20 rounded-full flex items-center justify-center mb-2"><Lock className="text-indigo-500" size={24} /></div>
            <CardTitle className="text-2xl font-black">لوحة التحكم</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input type="password" placeholder="الكود السري" value={accessCode} onChange={(e) => setAccessCode(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleUnlock()} className="bg-slate-900 border-slate-700 text-center text-lg tracking-widest" disabled={isCheckingCode} />
            <Button onClick={handleUnlock} className="w-full bg-indigo-600 hover:bg-indigo-700 font-bold" disabled={isCheckingCode}>{isCheckingCode ? <Loader2 className="animate-spin" size={18} /> : "دخول"}</Button>
            <Button onClick={() => navigate('/')} variant="ghost" className="w-full text-slate-500 text-xs">العودة للرئيسية</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoading) return <div className="min-h-screen bg-[#020617] flex flex-center justify-center text-white"><Loader2 className="animate-spin text-indigo-500" size={48} /></div>;

  return (
    <div className="min-h-screen bg-[#020617] text-white p-4 md:p-8 font-sans flex flex-col" dir="rtl">
      <div className="max-w-7xl mx-auto w-full space-y-8 flex-grow">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          <h1 className="text-3xl font-black text-white">لوحة التحكم</h1>
          <div className="flex gap-2 flex-wrap justify-center">
            <Button onClick={exportBackup} variant="outline" className="bg-slate-900/50 border-slate-800 text-white hover:bg-white/5 gap-2 text-xs h-10"><Download size={16} /> تصدير</Button>
            <Button onClick={handleLogout} variant="outline" className="bg-red-900/20 border-red-900/30 text-red-400 hover:bg-red-900/40 gap-2 text-xs h-10"><LogOut size={16} /> خروج</Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-12">
            <Card className="bg-[#0f172a]/40 border-slate-800 text-white shadow-xl">
              <CardHeader>
                <CardTitle className="text-xl font-bold text-center flex items-center justify-center gap-2"><Code size={20} /> إعدادات الأكواد (Ads/SEO)</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Input placeholder="اسم تعريفي للكود" value={scriptName} onChange={e => setScriptName(e.target.value)} className="bg-slate-900/80 border-slate-700 h-10 text-right" />
                <Textarea placeholder="ألصق كود السكريبت هنا..." value={newScriptCode} onChange={(e) => setNewScriptCode(e.target.value)} className="bg-slate-900/80 border-slate-700 min-h-[150px] font-mono text-xs text-right" dir="ltr" />
                <Button onClick={handleAddOrUpdateScript} className="w-full bg-emerald-600 hover:bg-emerald-700 font-black h-12 text-lg">{editingScriptId ? 'تحديث الكود' : 'حفظ الكود في السحابة'}</Button>
                
                <div className="pt-6 space-y-3">
                  <h3 className="text-sm font-bold text-slate-400 border-b border-slate-800 pb-2">قائمة الأكواد المضافة</h3>
                  {scriptList.map(script => (
                    <div key={script.id} className="flex items-center justify-between p-3 rounded-lg border bg-slate-900/60 border-slate-800">
                      <div className="flex items-center gap-2">
                        <button onClick={() => deleteScript(script.id)} className="text-slate-500 hover:text-red-500 p-1"><Trash2 size={16} /></button>
                        <button onClick={() => startEditScript(script)} className="text-slate-500 hover:text-indigo-400 p-1"><Edit2 size={16} /></button>
                      </div>
                      <span className="text-sm font-bold">{script.name}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminPanel;