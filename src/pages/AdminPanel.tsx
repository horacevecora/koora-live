"use client";

import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Trash2, Edit2, Plus, Home, Layout, ExternalLink, Code, Loader2, ListPlus, Copy, Lock, LogOut, ChevronUp, ChevronDown, Download, Upload, XCircle, FileCode, Wifi, WifiOff, Database } from "lucide-react";
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

const AdminPanel = () => {
  const navigate = useNavigate();
  
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [accessCode, setAccessCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isCheckingCode, setIsCheckingCode] = useState(false);
  const [isSavingScripts, setIsSavingScripts] = useState(false);
  const [dbStatus, setDbStatus] = useState<'checking' | 'connected' | 'error'>('checking');

  const [pages, setPages] = useState<Page[]>([]);
  const [activePageId, setActivePageId] = useState<string | null>(null);
  const [activePageName, setActivePageName] = useState("");
  const [newPageName, setNewPageName] = useState("");
  const [newPageSlug, setNewPageSlug] = useState("");

  const [servers, setServers] = useState<Server[]>([]);
  const [newName, setNewName] = useState("");
  const [newUrl, setNewUrl] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);

  const [externalScripts, setExternalScripts] = useState("");
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

  const checkConnection = async () => {
    try {
      const { error } = await supabase.from('site_settings').select('key').limit(1);
      if (error) throw error;
      setDbStatus('connected');
    } catch (err) {
      console.error("DB Check error:", err);
      setDbStatus('error');
    }
  };

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
        showError("خطأ في الاتصال بقاعدة البيانات. تأكد من تهيئة الجداول.");
      }
    } finally {
      setIsCheckingCode(false);
    }
  };

  const fetchInitialData = async () => {
    setIsLoading(true);
    checkConnection();
    try {
      const { data: pagesData, error: pagesError } = await supabase
        .from('pages')
        .select('*')
        .order('created_at', { ascending: true });

      if (pagesError) {
        if (pagesError.message.includes("relation") || pagesError.message.includes("does not exist")) {
          showError("الجداول غير موجودة في قاعدة البيانات الجديدة. يرجى تهيئتها.");
        }
        throw pagesError;
      }
      
      if (pagesData && pagesData.length > 0) {
        setPages(pagesData);
        const defaultPage = pagesData.find(p => p.slug === 'default') || pagesData[0];
        setActivePageId(defaultPage.id);
        setActivePageName(defaultPage.name);
        fetchServers(defaultPage.id);
      }

      const { data: settingsData } = await supabase
        .from('site_settings')
        .select('value')
        .eq('key', 'external_scripts')
        .single();
      
      if (settingsData) setExternalScripts(settingsData.value);

      const { data: filesData } = await supabase.from('site_files').select('*');
      if (filesData) setSiteFiles(filesData);

    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchServers = async (pageId: string) => {
    const { data, error } = await supabase
      .from('servers')
      .select('*')
      .eq('page_id', pageId)
      .order('sort_order', { ascending: true });
    
    if (error) showError("فشل في تحميل القنوات");
    else setServers(data || []);
  };

  const addPage = async () => {
    if (!newPageName || !newPageSlug) return;
    const { data, error } = await supabase
      .from('pages')
      .insert([{ name: newPageName, slug: newPageSlug }])
      .select()
      .single();

    if (error) showError("فشل في إنشاء الصفحة");
    else {
      setPages([...pages, data]);
      setNewPageName("");
      setNewPageSlug("");
      showSuccess("تم إنشاء الصفحة");
    }
  };

  const deletePage = async (id: string, slug: string) => {
    if (slug === 'default') return;
    const { error } = await supabase.from('pages').delete().eq('id', id);
    if (error) showError("فشل في حذف الصفحة");
    else {
      setPages(pages.filter(p => p.id !== id));
      showSuccess("تم حذف الصفحة");
    }
  };

  const copyToClipboard = (url: string) => {
    let cleanUrl = url;
    if (url.includes('<iframe')) {
      const match = url.match(/src=["']([^"']+)["']/);
      cleanUrl = match ? match[1] : url;
    }
    navigator.clipboard.writeText(cleanUrl);
    showSuccess("تم نسخ الرابط");
  };

  const detectType = (url: string): string => {
    const lowUrl = url.toLowerCase();
    if (lowUrl.includes('.m3u8')) return 'm3u8';
    if (lowUrl.includes('.ts') || lowUrl.includes('type=http')) return 'ts';
    if (lowUrl.includes('youtube.com') || lowUrl.includes('youtu.be')) return 'youtube';
    if (lowUrl.includes('facebook.com') || lowUrl.includes('fb.watch')) return 'facebook';
    if (lowUrl.includes('twitch.tv')) return 'twitch';
    if (lowUrl.includes('kick.com')) return 'kick';
    return 'iframe';
  };

  const handleSubmit = async () => {
    if (!newName || !newUrl || !activePageId) return;
    const type = detectType(newUrl);
    
    if (editingId) {
      const { error } = await supabase
        .from('servers')
        .update({ name: newName, url: newUrl, type })
        .eq('id', editingId);
      
      if (error) showError(`فشل التحديث: ${error.message}`);
      else {
        showSuccess("تم التحديث");
        fetchServers(activePageId);
        setEditingId(null);
        setNewName("");
        setNewUrl("");
      }
    } else {
      const { error } = await supabase
        .from('servers')
        .insert([{ 
          name: newName, 
          url: newUrl, 
          type, 
          page_id: activePageId,
          sort_order: servers.length 
        }]);
      
      if (error) showError(`فشل الإضافة: ${error.message}`);
      else {
        showSuccess("تمت الإضافة");
        fetchServers(activePageId);
        setNewName("");
        setNewUrl("");
      }
    }
  };

  const moveChannel = async (index: number, direction: 'up' | 'down') => {
    if (!activePageId) return;
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= servers.length) return;

    const updatedServers = [...servers];
    const temp = updatedServers[index].sort_order;
    updatedServers[index].sort_order = updatedServers[newIndex].sort_order;
    updatedServers[newIndex].sort_order = temp;

    const { error: err1 } = await supabase.from('servers').update({ sort_order: updatedServers[index].sort_order }).eq('id', updatedServers[index].id);
    const { error: err2 } = await supabase.from('servers').update({ sort_order: updatedServers[newIndex].sort_order }).eq('id', updatedServers[newIndex].id);

    if (err1 || err2) showError("فشل تغيير الترتيب");
    else fetchServers(activePageId);
  };

  const exportBackup = async () => {
    try {
      const { data: pagesData } = await supabase.from('pages').select('*');
      const { data: serversData } = await supabase.from('servers').select('*');
      
      const backup = {
        pages: pagesData,
        servers: serversData,
        timestamp: new Date().toISOString()
      };

      const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `koora-live-backup-${new Date().toLocaleDateString()}.json`;
      a.click();
      showSuccess("تم تصدير النسخة الاحتياطية");
    } catch (err) {
      showError("فشل التصدير");
    }
  };

  const importBackup = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const backup = JSON.parse(event.target?.result as string);
        if (!backup.pages || !backup.servers) throw new Error("ملف غير صالح");

        setIsLoading(true);
        
        for (const page of backup.pages) {
          await supabase.from('pages').upsert({ 
            name: page.name, 
            slug: page.slug 
          }, { onConflict: 'slug' });
        }

        const { data: currentPages } = await supabase.from('pages').select('*');
        
        for (const server of backup.servers) {
          const originalPage = backup.pages.find((p: any) => p.id === server.page_id);
          const currentPage = currentPages?.find(p => p.slug === originalPage?.slug);
          
          if (currentPage) {
            await supabase.from('servers').insert([{
              name: server.name,
              url: server.url,
              type: server.type,
              sort_order: server.sort_order,
              page_id: currentPage.id
            }]);
          }
        }

        showSuccess("تم استيراد البيانات بنجاح");
        fetchInitialData();
      } catch (err) {
        showError("فشل الاستيراد: تأكد من صحة الملف");
      } finally {
        setIsLoading(false);
      }
    };
    reader.readAsText(file);
  };

  const handleBulkAdd = async () => {
    if (!bulkInput || !activePageId) {
      showError("يرجى إدخال البيانات واختيار صفحة");
      return;
    }
    
    const lines = bulkInput.split('\n').filter(line => line.trim() !== '');
    const newServers = lines.map((line, index) => {
      const parts = line.split('=');
      if (parts.length >= 2) {
        const name = parts[0].trim();
        const url = parts.slice(1).join('=').trim();
        return {
          name,
          url,
          type: detectType(url),
          page_id: activePageId,
          sort_order: servers.length + index
        };
      }
      return null;
    }).filter(Boolean) as Server[];

    if (newServers.length > 0) {
      const { error } = await supabase.from('servers').insert(newServers);
      if (error) showError(`فشل الإضافة الجماعية: ${error.message}`);
      else {
        showSuccess(`تم إضافة ${newServers.length} قناة بنجاح`);
        fetchServers(activePageId);
        setBulkInput("");
      }
    } else {
      showError("لم يتم العثور على بيانات صالحة. تأكد من استخدام صيغة: الاسم = الرابط");
    }
  };

  const deleteChannel = async (id: string) => {
    const { error } = await supabase.from('servers').delete().eq('id', id);
    if (error) showError("فشل الحذف");
    else if (activePageId) fetchServers(activePageId);
  };

  const saveExternalScripts = async () => {
    setIsSavingScripts(true);
    try {
      const { error } = await supabase
        .from('site_settings')
        .upsert({ 
          key: 'external_scripts', 
          value: externalScripts 
        }, { 
          onConflict: 'key' 
        });
      
      if (error) {
        console.error("Supabase error:", error);
        showError(`فشل الحفظ: ${error.message || 'خطأ في قاعدة البيانات'}`);
      } else {
        showSuccess("تم حفظ الأكواد بنجاح في السحابة");
      }
    } catch (err: any) {
      showError(`خطأ غير متوقع: ${err.message}`);
    } finally {
      setIsSavingScripts(false);
    }
  };

  const handleSaveFile = async () => {
    if (!newFileName || !newFileContent) return;
    const { error } = await supabase
      .from('site_files')
      .upsert({ 
        filename: newFileName, 
        content: newFileContent,
        content_type: newFileName.endsWith('.js') ? 'application/javascript' : 'text/plain'
      }, { onConflict: 'filename' });

    if (error) showError("فشل حفظ الملف");
    else {
      showSuccess("تم حفظ الملف بنجاح");
      fetchInitialData();
      setNewFileContent("");
    }
  };

  const deleteFile = async (id: string) => {
    const { error } = await supabase.from('site_files').delete().eq('id', id);
    if (error) showError("فشل حذف الملف");
    else {
      showSuccess("تم حذف الملف");
      fetchInitialData();
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('admin_unlocked');
    setIsUnlocked(false);
    setAccessCode("");
  };

  if (!isUnlocked) {
    return (
      <div className="min-h-screen bg-[#020617] flex items-center justify-center p-4 font-sans" dir="rtl">
        <Card className="w-full max-w-md bg-[#0f172a] border-slate-800 text-white shadow-2xl">
          <CardHeader className="text-center space-y-2">
            <div className="mx-auto w-12 h-12 bg-indigo-600/20 rounded-full flex items-center justify-center mb-2">
              <Lock className="text-indigo-500" size={24} />
            </div>
            <CardTitle className="text-2xl font-black">لوحة التحكم</CardTitle>
            <p className="text-slate-400 text-xs">أدخل الكود السري للوصول</p>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input 
              type="password" 
              placeholder="الكود السري" 
              value={accessCode} 
              onChange={(e) => setAccessCode(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleUnlock()}
              className="bg-slate-900 border-slate-700 text-center text-lg tracking-widest"
              disabled={isCheckingCode}
            />
            <Button 
              onClick={handleUnlock} 
              className="w-full bg-indigo-600 hover:bg-indigo-700 font-bold"
              disabled={isCheckingCode}
            >
              {isCheckingCode ? <Loader2 className="animate-spin" size={18} /> : "دخول"}
            </Button>
            <Button onClick={() => navigate('/')} variant="ghost" className="w-full text-slate-500 text-xs">العودة للرئيسية</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#020617] text-white p-4 md:p-8 font-sans flex flex-col" dir="rtl">
      <div className="max-w-7xl mx-auto w-full space-y-8 flex-grow">
        
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-4">
            <h1 className="text-3xl font-black text-white">لوحة التحكم السحابية</h1>
            <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-bold border ${dbStatus === 'connected' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-red-500/10 border-red-500/20 text-red-400'}`}>
              {dbStatus === 'connected' ? <Wifi size={12} /> : <WifiOff size={12} />}
              {dbStatus === 'connected' ? 'متصل بالسحابة' : 'خطأ في الاتصال'}
            </div>
          </div>
          <div className="flex gap-2 flex-wrap justify-center">
            <Button onClick={exportBackup} variant="outline" className="bg-slate-900/50 border-slate-800 text-white hover:bg-white/5 gap-2 text-xs h-10">
              <Download size={16} /> تصدير
            </Button>
            <div className="relative">
              <input type="file" accept=".json" onChange={importBackup} className="absolute inset-0 opacity-0 cursor-pointer" />
              <Button variant="outline" className="bg-slate-900/50 border-slate-800 text-white hover:bg-white/5 gap-2 text-xs h-10">
                <Upload size={16} /> استيراد
              </Button>
            </div>
            <Button onClick={() => navigate('/')} variant="outline" className="bg-slate-900/50 border-slate-800 text-white hover:bg-white/5 gap-2 text-xs h-10">
              <Home size={16} /> الرئيسية
            </Button>
            <Button onClick={handleLogout} variant="outline" className="bg-red-900/20 border-red-900/30 text-red-400 hover:bg-red-900/40 gap-2 text-xs h-10">
              <LogOut size={16} /> خروج
            </Button>
          </div>
        </div>

        {dbStatus === 'error' && (
          <div className="bg-amber-500/10 border border-amber-500/30 p-6 rounded-2xl flex flex-col items-center gap-4 text-center">
            <Database className="text-amber-500" size={40} />
            <div className="space-y-1">
              <h3 className="font-black text-amber-500">تنبيه: قاعدة البيانات غير مهيأة</h3>
              <p className="text-slate-400 text-xs leading-relaxed">
                يبدو أنك قمت بربط مشروع Supabase جديد. يجب عليك إنشاء الجداول اللازمة أولاً.
                <br />
                يرجى الضغط على الزر أدناه لمعرفة الأكواد التي يجب تشغيلها في <strong>SQL Editor</strong> الخاص بـ Supabase.
              </p>
            </div>
            <Button variant="outline" className="border-amber-500/30 text-amber-500 hover:bg-amber-500/10 text-xs h-9" onClick={() => window.open('https://dyad.sh/docs/integrations/supabase', '_blank')}>
              دليل التهيئة
            </Button>
          </div>
        )}

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 className="animate-spin text-indigo-500 mb-4" size={48} />
            <p>جارٍ تحميل البيانات...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* المحتوى السابق للوحة التحكم */}
            <div className="lg:col-span-4 space-y-8">
              <Card className="bg-[#0f172a]/40 border-slate-800 text-white shadow-xl">
                <CardHeader>
                  <CardTitle className="text-lg font-bold flex items-center gap-2"><Layout size={18} /> الصفحات</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <Input placeholder="اسم الصفحة" value={newPageName} onChange={e => setNewPageName(e.target.value)} className="bg-slate-900/80 border-slate-700 h-10 text-right" />
                    <Input placeholder="المعرف (Slug)" value={newPageSlug} onChange={e => setNewPageSlug(e.target.value)} className="bg-slate-900/80 border-slate-700 h-10 text-right" />
                    <Button onClick={addPage} className="w-full bg-indigo-600 hover:bg-indigo-700 font-bold h-10 gap-2">
                      <Plus size={16} /> إنشاء صفحة
                    </Button>
                  </div>
                  <div className="space-y-2 pt-4">
                    {pages.map(p => (
                      <div key={p.id} className="flex flex-col gap-1">
                        <div 
                          onClick={() => { setActivePageId(p.id); setActivePageName(p.name); fetchServers(p.id); }} 
                          className={`w-full flex items-center justify-between px-4 h-12 font-bold rounded-md cursor-pointer transition-colors ${activePageId === p.id ? 'bg-indigo-600 text-white' : 'bg-slate-900/50 border border-slate-800 text-slate-300 hover:bg-slate-800'}`}
                        >
                          <div className="flex items-center gap-2">
                            <div onClick={(e) => { e.stopPropagation(); navigate(p.slug === 'default' ? '/real.html' : `/p/${p.slug}`); }} className="p-1 hover:text-white" role="button"><ExternalLink size={14} /></div>
                            {p.slug !== 'default' && <div onClick={(e) => { e.stopPropagation(); deletePage(p.id, p.slug); }} className="p-1 hover:text-red-400" role="button"><Trash2 size={14} /></div>}
                          </div>
                          <span>{p.name}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-[#0f172a]/40 border-slate-800 text-white shadow-xl">
                <CardHeader>
                  <CardTitle className="text-lg font-bold flex items-center gap-2"><ListPlus size={18} /> إضافة جماعية</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Textarea 
                    placeholder={"الاسم = الرابط..."} 
                    value={bulkInput}
                    onChange={(e) => setBulkInput(e.target.value)}
                    className="bg-slate-900/80 border-slate-700 min-h-[150px] text-[10px] text-right"
                  />
                  <Button onClick={handleBulkAdd} className="w-full bg-indigo-600 hover:bg-indigo-700 font-bold h-12">
                    إضافة الكل
                  </Button>
                </CardContent>
              </Card>
            </div>

            <div className="lg:col-span-8 space-y-8">
              <Card className="bg-[#0f172a]/40 border-slate-800 text-white shadow-xl">
                <CardHeader>
                  <CardTitle className="text-xl font-bold text-center">تعديل قنوات: <span className="text-indigo-400">{activePageName}</span></CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex flex-col md:flex-row gap-3">
                    <Input placeholder="اسم القناة" value={newName} onChange={e => setNewName(e.target.value)} className="bg-slate-900/80 border-slate-700 h-12 text-right" />
                    <Input placeholder="الرابط..." value={newUrl} onChange={e => setNewUrl(e.target.value)} className="bg-slate-900/80 border-slate-700 h-12 text-right" />
                    <Button onClick={handleSubmit} className="bg-indigo-600 hover:bg-indigo-700 font-bold h-12 px-8">
                      {editingId ? 'تحديث' : 'إضافة'}
                    </Button>
                  </div>
                  
                  <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                    {servers.map((s, i) => (
                      <div key={s.id} className="flex items-center justify-between p-4 bg-slate-900/60 border border-slate-800 rounded-xl group hover:border-indigo-500/30 transition-all">
                        <div className="flex-grow text-right">
                          <div className="font-black text-sm">{s.name}</div>
                          <div className="text-[10px] text-slate-500 truncate max-w-[300px] block">{s.url}</div>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <div className="flex flex-col gap-1 mr-2">
                            <button onClick={() => moveChannel(i, 'up')} className="p-1 text-slate-500 hover:text-white" disabled={i === 0}><ChevronUp size={14} /></button>
                            <button onClick={() => moveChannel(i, 'down')} className="p-1 text-slate-500 hover:text-white" disabled={i === servers.length - 1}><ChevronDown size={14} /></button>
                          </div>
                          <button onClick={() => { setEditingId(s.id || null); setNewName(s.name); setNewUrl(s.url); }} className="p-2 text-slate-500 hover:text-indigo-400"><Edit2 size={16} /></button>
                          <button onClick={() => s.id && deleteChannel(s.id)} className="p-2 text-slate-500 hover:text-red-500"><Trash2 size={16} /></button>
                          <button onClick={() => copyToClipboard(s.url)} className="p-2 text-slate-500 hover:text-emerald-400"><Copy size={16} /></button>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-[#0f172a]/40 border-slate-800 text-white shadow-xl">
                <CardHeader>
                  <CardTitle className="text-xl font-bold text-center flex items-center justify-center gap-2"><Code size={20} /> إعدادات الأكواد (Ads/SEO)</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Textarea placeholder="...ألصق الكود هنا" value={externalScripts} onChange={(e) => setExternalScripts(e.target.value)} className="bg-slate-900/80 border-slate-700 min-h-[200px] font-mono text-xs text-right" dir="ltr" />
                  <Button onClick={saveExternalScripts} disabled={isSavingScripts} className="w-full bg-emerald-600 hover:bg-emerald-700 font-black h-12 text-lg">
                    {isSavingScripts ? <Loader2 className="animate-spin" size={20} /> : "حفظ الأكواد في السحابة"}
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        <div className="flex justify-center pt-8 pb-12">
          <Button onClick={() => navigate('/real.html')} className="bg-red-600 hover:bg-red-700 text-white font-black px-12 py-8 rounded-2xl text-xl shadow-2xl flex items-center gap-3">
            <XCircle size={28} /> إغلاق والعودة للمشاهدة
          </Button>
        </div>
      </div>
    </div>
  );
};

export default AdminPanel;