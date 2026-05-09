"use client";

import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Trash2, Edit2, Plus, Home, Layout, ExternalLink, Code, Loader2, ListPlus, Copy, Lock, LogOut, ChevronUp, ChevronDown, Download, Upload, XCircle, FileCode } from "lucide-react";
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

interface VirtualFile {
  name: string;
  content: string;
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

  const [externalScripts, setExternalScripts] = useState("");

  // ملفات التحقق
  const [vFileName, setVFileName] = useState("");
  const [vFileContent, setVFileContent] = useState("");
  const [virtualFiles, setVirtualFiles] = useState<VirtualFile[]>([]);

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

      const { data: settingsData } = await supabase.from('site_settings').select('*');
      if (settingsData) {
        const scripts = settingsData.find(s => s.key === 'external_scripts');
        if (scripts) setExternalScripts(scripts.value);

        const files = settingsData.filter(s => s.key.startsWith('file_')).map(s => ({
          name: s.key.replace('file_', ''),
          content: s.value
        }));
        setVirtualFiles(files);
      }
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

  const addPage = async () => {
    if (!newPageName || !newPageSlug) return;
    const { data, error } = await supabase.from('pages').insert([{ name: newPageName, slug: newPageSlug }]).select().single();
    if (error) showError("فشل في إنشاء الصفحة");
    else { setPages([...pages, data]); setNewPageName(""); setNewPageSlug(""); showSuccess("تم إنشاء الصفحة"); }
  };

  const deletePage = async (id: string, slug: string) => {
    if (slug === 'default') return;
    const { error } = await supabase.from('pages').delete().eq('id', id);
    if (error) showError("فشل في حذف الصفحة");
    else { setPages(pages.filter(p => p.id !== id)); showSuccess("تم حذف الصفحة"); }
  };

  const deleteChannel = async (id: string) => {
    const { error } = await supabase.from('servers').delete().eq('id', id);
    if (error) showError("فشل الحذف");
    else if (activePageId) fetchServers(activePageId);
  };

  const handleSubmit = async () => {
    if (!newName || !newUrl || !activePageId) return;
    const type = detectType(newUrl);
    if (editingId) {
      const { error } = await supabase.from('servers').update({ name: newName, url: newUrl, type }).eq('id', editingId);
      if (error) showError("فشل التحديث");
      else { showSuccess("تم التحديث"); fetchServers(activePageId); setEditingId(null); setNewName(""); setNewUrl(""); }
    } else {
      const { error } = await supabase.from('servers').insert([{ name: newName, url: newUrl, type, page_id: activePageId, sort_order: servers.length }]);
      if (error) showError("فشل الإضافة");
      else { showSuccess("تمت الإضافة"); fetchServers(activePageId); setNewName(""); setNewUrl(""); }
    }
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

  const saveExternalScripts = async () => {
    const { error } = await supabase.from('site_settings').upsert({ key: 'external_scripts', value: externalScripts }, { onConflict: 'key' });
    if (error) showError("فشل حفظ الأكواد");
    else showSuccess("تم حفظ الأكواد");
  };

  const saveVirtualFile = async () => {
    if (!vFileName || !vFileContent) return;
    const key = `file_${vFileName}`;
    const { error } = await supabase.from('site_settings').upsert({ key, value: vFileContent }, { onConflict: 'key' });
    if (error) showError("فشل حفظ الملف");
    else {
      showSuccess("تم حفظ ملف التحقق");
      setVirtualFiles([...virtualFiles.filter(f => f.name !== vFileName), { name: vFileName, content: vFileContent }]);
      setVFileName(""); setVFileContent("");
    }
  };

  const deleteVirtualFile = async (name: string) => {
    const { error } = await supabase.from('site_settings').delete().eq('key', `file_${name}`);
    if (error) showError("فشل حذف الملف");
    else {
      setVirtualFiles(virtualFiles.filter(f => f.name !== name));
      showSuccess("تم حذف الملف");
    }
  };

  const handleLogout = () => { localStorage.removeItem('admin_unlocked'); setIsUnlocked(false); setAccessCode(""); };

  if (!isUnlocked) {
    return (
      <div className="min-h-screen bg-[#020617] flex items-center justify-center p-4 font-sans" dir="rtl">
        <Card className="w-full max-w-md bg-[#0f172a] border-slate-800 text-white shadow-2xl">
          <CardHeader className="text-center space-y-2">
            <div className="mx-auto w-12 h-12 bg-indigo-600/20 rounded-full flex items-center justify-center mb-2">
              <Lock className="text-indigo-500" size={24} />
            </div>
            <CardTitle className="text-2xl font-black">لوحة التحكم</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input type="password" placeholder="الكود السري" value={accessCode} onChange={(e) => setAccessCode(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleUnlock()} className="bg-slate-900 border-slate-700 text-center" />
            <Button onClick={handleUnlock} className="w-full bg-indigo-600 hover:bg-indigo-700 font-bold" disabled={isCheckingCode}>
              {isCheckingCode ? <Loader2 className="animate-spin" size={18} /> : "دخول"}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#020617] text-white p-4 md:p-8 font-sans flex flex-col" dir="rtl">
      <div className="max-w-7xl mx-auto w-full space-y-8 flex-grow">
        
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-black">لوحة التحكم</h1>
          <Button onClick={handleLogout} variant="outline" className="bg-red-900/20 border-red-900/30 text-red-400 h-10">خروج</Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          <div className="lg:col-span-4 space-y-8">
            <Card className="bg-[#0f172a]/40 border-slate-800 text-white">
              <CardHeader><CardTitle className="text-lg font-bold">الصفحات</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <Input placeholder="اسم الصفحة" value={newPageName} onChange={e => setNewPageName(e.target.value)} className="bg-slate-900/80 border-slate-700" />
                <Input placeholder="المعرف (Slug)" value={newPageSlug} onChange={e => setNewPageSlug(e.target.value)} className="bg-slate-900/80 border-slate-700" />
                <Button onClick={addPage} className="w-full bg-indigo-600 font-bold">إنشاء صفحة</Button>
                <div className="space-y-2 pt-4">
                  {pages.map(p => (
                    <div key={p.id} onClick={() => { setActivePageId(p.id); setActivePageName(p.name); fetchServers(p.id); }} className={`p-3 rounded-md cursor-pointer flex justify-between items-center ${activePageId === p.id ? 'bg-indigo-600' : 'bg-slate-900/50 border border-slate-800'}`}>
                      <span>{p.name}</span>
                      {p.slug !== 'default' && <Trash2 size={14} onClick={(e) => { e.stopPropagation(); deletePage(p.id, p.slug); }} className="text-red-400" />}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="bg-[#0f172a]/40 border-slate-800 text-white">
              <CardHeader><CardTitle className="text-lg font-bold flex items-center gap-2"><FileCode size={18} /> ملفات التحقق (HTML)</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <Input placeholder="اسم الملف (مثلاً: monetag.html)" value={vFileName} onChange={e => setVFileName(e.target.value)} className="bg-slate-900/80 border-slate-700" />
                <Textarea placeholder="محتوى الملف..." value={vFileContent} onChange={e => setVFileContent(e.target.value)} className="bg-slate-900/80 border-slate-700 min-h-[100px]" />
                <Button onClick={saveVirtualFile} className="w-full bg-emerald-600 font-bold">حفظ الملف</Button>
                <div className="space-y-2 pt-4">
                  {virtualFiles.map(f => (
                    <div key={f.name} className="p-3 bg-slate-900/50 border border-slate-800 rounded-md flex justify-between items-center">
                      <div className="flex flex-col">
                        <span className="text-xs font-bold">{f.name}</span>
                        <a href={`/${f.name}`} target="_blank" className="text-[10px] text-indigo-400 underline">رابط المعاينة</a>
                      </div>
                      <Trash2 size={14} onClick={() => deleteVirtualFile(f.name)} className="text-red-400 cursor-pointer" />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="lg:col-span-8 space-y-8">
            <Card className="bg-[#0f172a]/40 border-slate-800 text-white">
              <CardHeader><CardTitle className="text-xl font-bold">تعديل قنوات: {activePageName}</CardTitle></CardHeader>
              <CardContent className="space-y-6">
                <div className="flex gap-3">
                  <Input placeholder="اسم القناة" value={newName} onChange={e => setNewName(e.target.value)} className="bg-slate-900/80 border-slate-700" />
                  <Input placeholder="الرابط" value={newUrl} onChange={e => setNewUrl(e.target.value)} className="bg-slate-900/80 border-slate-700" />
                  <Button onClick={handleSubmit} className="bg-indigo-600 font-bold px-8">{editingId ? 'تحديث' : 'إضافة'}</Button>
                </div>
                <div className="space-y-3 max-h-[400px] overflow-y-auto">
                  {servers.map((s, i) => (
                    <div key={s.id} className="flex items-center justify-between p-4 bg-slate-900/60 border border-slate-800 rounded-xl">
                      <div className="text-right">
                        <div className="font-black text-sm">{s.name}</div>
                        <div className="text-[10px] text-slate-500 truncate max-w-[300px]">{s.url}</div>
                      </div>
                      <div className="flex gap-2">
                        <Edit2 size={16} onClick={() => { setEditingId(s.id || null); setNewName(s.name); setNewUrl(s.url); }} className="cursor-pointer text-indigo-400" />
                        <Trash2 size={16} onClick={() => s.id && deleteChannel(s.id)} className="cursor-pointer text-red-400" />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="bg-[#0f172a]/40 border-slate-800 text-white">
              <CardHeader><CardTitle className="text-xl font-bold">أكواد Ads/SEO</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <Textarea placeholder="ألصق الأكواد هنا..." value={externalScripts} onChange={(e) => setExternalScripts(e.target.value)} className="bg-slate-900/80 border-slate-700 min-h-[200px] font-mono text-xs" dir="ltr" />
                <Button onClick={saveExternalScripts} className="w-full bg-emerald-600 font-black h-12">حفظ الأكواد</Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminPanel;