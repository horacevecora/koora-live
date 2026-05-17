"use client";

import React, { useState, useEffect } from 'react';
import { Auth } from '@supabase/auth-ui-react';
import { ThemeSupa } from '@supabase/auth-ui-shared';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Trash2, Edit2, Plus, Home, Layout, ExternalLink, Code, Loader2, ListPlus, Copy, Lock, LogOut, ChevronUp, ChevronDown, Download, Upload, XCircle, FileCode, ShieldAlert } from "lucide-react";
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
  const [session, setSession] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);

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
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) fetchInitialData();
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) fetchInitialData();
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchInitialData = async () => {
    setIsLoading(true);
    try {
      const { data: pagesData, error: pagesError } = await supabase
        .from('pages')
        .select('*')
        .order('created_at', { ascending: true });

      if (pagesError) throw pagesError;
      
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
        .maybeSingle();
      
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

    if (error) showError("فشل في إنشاء الصفحة: تأكد من تفعيل RLS");
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

  const deleteChannel = async (id: string) => {
    const { error } = await supabase.from('servers').delete().eq('id', id);
    if (error) showError("فشل الحذف");
    else if (activePageId) fetchServers(activePageId);
  };

  const saveExternalScripts = async () => {
    const { error } = await supabase
      .from('site_settings')
      .upsert({ key: 'external_scripts', value: externalScripts }, { onConflict: 'key' });
    
    if (error) showError("فشل حفظ الأكواد");
    else showSuccess("تم حفظ الأكواد");
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

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/');
  };

  if (!session) {
    return (
      <div className="min-h-screen bg-[#020617] flex items-center justify-center p-4 font-sans" dir="rtl">
        <Card className="w-full max-w-md bg-[#0f172a] border-slate-800 text-white shadow-2xl">
          <CardHeader className="text-center space-y-2">
            <div className="mx-auto w-12 h-12 bg-indigo-600/20 rounded-full flex items-center justify-center mb-2">
              <Lock className="text-indigo-500" size={24} />
            </div>
            <CardTitle className="text-2xl font-black">تسجيل دخول المسؤول</CardTitle>
            <CardDescription className="text-slate-400">يرجى تسجيل الدخول للوصول إلى لوحة التحكم</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Auth
              supabaseClient={supabase}
              appearance={{ theme: ThemeSupa }}
              theme="dark"
              providers={[]}
            />
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
          <h1 className="text-3xl font-black text-white">لوحة التحكم السحابية الآمنة</h1>
          <div className="flex gap-2 flex-wrap justify-center">
            <Button onClick={() => navigate('/')} variant="outline" className="bg-slate-900/50 border-slate-800 text-white hover:bg-white/5 gap-2 text-xs h-10">
              <Home size={16} /> الرئيسية
            </Button>
            <Button onClick={handleLogout} variant="outline" className="bg-red-900/20 border-red-900/30 text-red-400 hover:bg-red-900/40 gap-2 text-xs h-10">
              <LogOut size={16} /> خروج
            </Button>
          </div>
        </div>

        <Alert className="bg-amber-500/10 border-amber-500/50 text-amber-500">
          <ShieldAlert className="h-4 w-4" />
          <AlertTitle className="font-black">تنبيه أمني هام</AlertTitle>
          <AlertDescription className="text-xs">
            تأكد من تفعيل **Row Level Security (RLS)** في لوحة تحكم Supabase لمنع أي شخص من التلاعب بالبيانات حتى بدون دخول اللوحة.
          </AlertDescription>
        </Alert>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
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
          </div>

          <div className="lg:col-span-8 space-y-8">
            <Card className="bg-[#0f172a]/40 border-slate-800 text-white shadow-xl">
              <CardHeader>
                <CardTitle className="text-xl font-bold text-center">تعديل قنوات: <span className="text-indigo-400">{activePageName}</span></CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex flex-col md:flex-row gap-3">
                  <Input placeholder="اسم القناة" value={newName} onChange={e => setNewName(e.target.value)} className="bg-slate-900/80 border-slate-700 h-12 text-right" />
                  <Input placeholder="الرابط" value={newUrl} onChange={e => setNewUrl(e.target.value)} className="bg-slate-900/80 border-slate-700 h-12 text-right" />
                  <Button onClick={handleSubmit} className="bg-indigo-600 hover:bg-indigo-700 font-bold h-12 px-8">
                    {editingId ? 'تحديث' : 'إضافة'}
                  </Button>
                </div>
                
                <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                  {servers.map((s, i) => (
                    <div key={s.id} className="flex items-center justify-between p-4 bg-slate-900/60 border border-slate-800 rounded-xl group hover:border-indigo-500/30 transition-all">
                      <div className="flex-grow text-right">
                        <div className="font-black text-sm">{s.name}</div>
                        <div className="text-[10px] text-slate-500 truncate max-w-[300px]">{s.url}</div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button onClick={() => { setEditingId(s.id || null); setNewName(s.name); setNewUrl(s.url); }} className="p-2 text-slate-500 hover:text-indigo-400"><Edit2 size={16} /></button>
                        <button onClick={() => s.id && deleteChannel(s.id)} className="p-2 text-slate-500 hover:text-red-500"><Trash2 size={16} /></button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="bg-[#0f172a]/40 border-slate-800 text-white shadow-xl">
              <CardHeader>
                <CardTitle className="text-xl font-bold text-center flex items-center justify-center gap-2">
                  <Code size={20} /> إعدادات الأكواد (Ads/SEO)
                </CardTitle>
                <p className="text-center text-[10px] text-red-400 font-bold">تنبيه: حقن الأكواد ميزة قوية، استخدمها بحذر لتجنب ثغرات XSS</p>
              </CardHeader>
              <CardContent className="space-y-4">
                <Textarea 
                  placeholder="ألصق كود الميتاتاج أو الإعلانات هنا..." 
                  value={externalScripts}
                  onChange={(e) => setExternalScripts(e.target.value)}
                  className="bg-slate-900/80 border-slate-700 min-h-[200px] font-mono text-xs text-right"
                  dir="ltr"
                />
                <Button onClick={saveExternalScripts} className="w-full bg-emerald-600 hover:bg-emerald-700 font-black h-12 text-lg">
                  حفظ الأكواد
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminPanel;