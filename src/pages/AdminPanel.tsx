"use client";

import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Trash2, Edit2, ChevronUp, ChevronDown, Plus, RotateCcw, Layout, ExternalLink, Code, Loader2, Home, Download, Upload, ListPlus, Copy, LogOut } from "lucide-react";
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

const AdminPanel = () => {
  const navigate = useNavigate();
  
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const [pages, setPages] = useState<Page[]>([]);
  const [activePageId, setActivePageId] = useState<string | null>(null);
  const [activePageSlug, setActivePageSlug] = useState("default");
  const [newPageName, setNewPageName] = useState("");
  const [newPageSlug, setNewPageSlug] = useState("");

  const [servers, setServers] = useState<Server[]>([]);
  const [newName, setNewName] = useState("");
  const [newUrl, setNewUrl] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);

  const [externalScripts, setExternalScripts] = useState("");
  const [bulkInput, setBulkInput] = useState("");

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate('/login');
      } else {
        setIsAuthenticated(true);
        fetchInitialData();
      }
    };
    checkAuth();
  }, [navigate]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

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
        setActivePageSlug(defaultPage.slug);
        fetchServers(defaultPage.id);
      }

      const { data: settingsData } = await supabase
        .from('site_settings')
        .select('value')
        .eq('key', 'external_scripts')
        .single();
      
      if (settingsData) setExternalScripts(settingsData.value);

    } catch (error) {
      console.error("Error fetching data:", error);
      showError("فشل في تحميل البيانات");
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
    
    if (error) {
      showError("فشل في تحميل القنوات");
    } else {
      setServers(data || []);
    }
  };

  const addPage = async () => {
    if (!newPageName || !newPageSlug) return;
    const { data, error } = await supabase
      .from('pages')
      .insert([{ name: newPageName, slug: newPageSlug }])
      .select()
      .single();

    if (error) {
      showError("فشل في إنشاء الصفحة");
    } else {
      setPages([...pages, data]);
      setNewPageName("");
      setNewPageSlug("");
      showSuccess("تم إنشاء الصفحة");
    }
  };

  const deletePage = async (id: string, slug: string) => {
    if (slug === 'default') return;
    const { error } = await supabase.from('pages').delete().eq('id', id);
    if (error) {
      showError("فشل في حذف الصفحة");
    } else {
      setPages(pages.filter(p => p.id !== id));
      showSuccess("تم حذف الصفحة");
    }
  };

  const getCleanLink = (url: string) => {
    if (url.includes('<iframe')) {
      const match = url.match(/src=["']([^"']+)["']/);
      return match ? match[1] : url;
    }
    return url;
  };

  const copyToClipboard = (url: string) => {
    const cleanUrl = getCleanLink(url);
    navigator.clipboard.writeText(cleanUrl);
    showSuccess("تم نسخ الرابط النظيف");
  };

  const handleSubmit = async () => {
    if (!newName || !newUrl || !activePageId) return;
    const type = newUrl.includes('.m3u8') ? 'm3u8' : 'iframe';
    
    if (editingId) {
      const { error } = await supabase
        .from('servers')
        .update({ name: newName, url: newUrl, type })
        .eq('id', editingId);
      
      if (error) showError("فشل التحديث");
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
      
      if (error) showError("فشل الإضافة");
      else {
        showSuccess("تمت الإضافة");
        fetchServers(activePageId);
        setNewName("");
        setNewUrl("");
      }
    }
  };

  const handleBulkAdd = async () => {
    if (!bulkInput || !activePageId) return;
    const lines = bulkInput.split('\n').filter(line => line.trim() !== '');
    const newServers = lines.map((line, index) => {
      const parts = line.split('=');
      if (parts.length >= 2) {
        const name = parts[0].trim();
        const url = parts.slice(1).join('=').trim();
        return {
          name,
          url,
          type: url.includes('.m3u8') ? 'm3u8' : 'iframe',
          page_id: activePageId,
          sort_order: servers.length + index
        };
      }
      return null;
    }).filter(Boolean) as Server[];

    if (newServers.length > 0) {
      const { error } = await supabase.from('servers').insert(newServers);
      if (error) showError("فشل الإضافة الجماعية");
      else {
        showSuccess(`تم إضافة ${newServers.length} قناة بنجاح`);
        fetchServers(activePageId);
        setBulkInput("");
      }
    }
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
    else showSuccess("تم حفظ الأكواد بنجاح");
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#020617] flex flex-col items-center justify-center text-white">
        <Loader2 className="animate-spin text-indigo-500 mb-4" size={48} />
        <p>جارٍ التحقق من الصلاحيات...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#020617] text-white p-4 md:p-8 font-sans" dir="rtl">
      <div className="max-w-6xl mx-auto space-y-8">
        
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          <h1 className="text-2xl font-black text-indigo-400">لوحة التحكم السحابية</h1>
          <div className="flex gap-2">
            <Button onClick={handleLogout} variant="outline" className="border-red-900/50 text-red-400 hover:bg-red-900/20 gap-2 text-xs">
              <LogOut size={16} /> تسجيل الخروج
            </Button>
            <Button onClick={() => navigate('/')} variant="outline" className="border-slate-700 text-slate-300 hover:bg-white/5 gap-2 text-xs">
              <Home size={16} /> الرئيسية
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-1 space-y-6">
            <Card className="bg-[#0f172a]/50 border-slate-800 text-white">
              <CardHeader>
                <CardTitle className="text-md flex items-center gap-2"><Layout size={18} /> الصفحات</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Input placeholder="اسم الصفحة" value={newPageName} onChange={e => setNewPageName(e.target.value)} className="bg-slate-900 border-slate-700 text-xs" />
                  <Input placeholder="المعرف (Slug)" value={newPageSlug} onChange={e => setNewPageSlug(e.target.value)} className="bg-slate-900 border-slate-700 text-xs" />
                  <Button onClick={addPage} className="w-full bg-indigo-600 text-xs h-8"><Plus size={14} className="ml-1" /> إنشاء صفحة</Button>
                </div>
                <div className="border-t border-slate-800 pt-4 space-y-1">
                  {pages.map(p => (
                    <div key={p.id} className={`flex items-center justify-between p-2 rounded-lg text-xs transition-all ${activePageId === p.id ? 'bg-indigo-600' : 'hover:bg-white/5'}`}>
                      <button onClick={() => { setActivePageId(p.id); setActivePageSlug(p.slug); fetchServers(p.id); }} className="flex-grow text-right font-bold">{p.name}</button>
                      <div className="flex items-center gap-1">
                        <button onClick={() => navigate(p.slug === 'default' ? '/real.html' : `/p/${p.slug}`)} className="p-1 hover:text-emerald-400" title="معاينة"><ExternalLink size={14} /></button>
                        {p.slug !== 'default' && <button onClick={() => deletePage(p.id, p.slug)} className="p-1 hover:text-red-400"><Trash2 size={14} /></button>}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="bg-[#0f172a]/50 border-slate-800 text-white">
              <CardHeader>
                <CardTitle className="text-md flex items-center gap-2"><ListPlus size={18} /> إضافة جماعية</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Textarea 
                  placeholder="سيرفر 1 = https://example.com/live.m3u8" 
                  value={bulkInput}
                  onChange={(e) => setBulkInput(e.target.value)}
                  className="bg-slate-900 border-slate-700 min-h-[120px] text-[10px]"
                />
                <Button onClick={handleBulkAdd} className="w-full bg-indigo-600 text-xs h-8">إضافة الكل</Button>
              </CardContent>
            </Card>
          </div>

          <div className="md:col-span-2 space-y-6">
            <Card className="bg-[#0f172a]/50 border-slate-800 text-white">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-lg">تعديل قنوات: <span className="text-indigo-400">{pages.find(p => p.id === activePageId)?.name}</span></CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-col md:flex-row gap-2">
                  <Input placeholder="اسم القناة" value={newName} onChange={e => setNewName(e.target.value)} className="bg-slate-900 border-slate-700" />
                  <Input placeholder="الرابط" value={newUrl} onChange={e => setNewUrl(e.target.value)} className="bg-slate-900 border-slate-700" />
                  <Button onClick={handleSubmit} className="bg-indigo-600 font-bold">{editingId ? 'تحديث' : 'إضافة'}</Button>
                </div>
                <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2">
                  {servers.map((s, i) => (
                    <div key={s.id} className="flex items-center justify-between p-3 bg-slate-900/80 border border-slate-800 rounded-xl text-sm">
                      <div className="truncate ml-4">
                        <div className="font-bold">{s.name}</div>
                        <div className="text-[10px] text-slate-500 truncate">{s.url}</div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button onClick={() => copyToClipboard(s.url)} className="p-1.5 text-slate-500 hover:text-emerald-400"><Copy size={16} /></button>
                        <button onClick={() => s.id && deleteChannel(s.id)} className="p-1.5 text-slate-500 hover:text-red-500"><Trash2 size={16} /></button>
                        <button onClick={() => { setEditingId(s.id || null); setNewName(s.name); setNewUrl(s.url); }} className="p-1.5 text-slate-500 hover:text-indigo-400"><Edit2 size={16} /></button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="bg-[#0f172a]/50 border-slate-800 text-white">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2"><Code size={20} /> إعدادات الأكواد (Ads/SEO)</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Textarea 
                  placeholder="ألصق الكود هنا..." 
                  value={externalScripts}
                  onChange={(e) => setExternalScripts(e.target.value)}
                  className="bg-slate-900 border-slate-700 min-h-[150px] font-mono text-xs"
                  dir="ltr"
                />
                <Button onClick={saveExternalScripts} className="w-full bg-emerald-600 hover:bg-emerald-700 font-bold">حفظ الأكواد</Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminPanel;