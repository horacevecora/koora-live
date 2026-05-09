"use client";

import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Trash2, Edit2, Plus, Home, Layout, ExternalLink, Code, Loader2, ListPlus, Copy, Lock, LogOut, ChevronUp, ChevronDown, Download, Upload } from "lucide-react";
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
  
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [accessCode, setAccessCode] = useState("");
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

  const SECRET_CODE = "simo"; 

  useEffect(() => {
    const savedAuth = localStorage.getItem('admin_unlocked');
    if (savedAuth === 'true') {
      setIsUnlocked(true);
      fetchInitialData();
    }
  }, []);

  const handleUnlock = () => {
    if (accessCode === SECRET_CODE) {
      setIsUnlocked(true);
      localStorage.setItem('admin_unlocked', 'true');
      fetchInitialData();
      showSuccess("تم الدخول بنجاح");
    } else {
      showError("الكود السري غير صحيح");
    }
  };

  const handleLogout = () => {
    setIsUnlocked(false);
    localStorage.removeItem('admin_unlocked');
    navigate('/');
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
        setActivePageName(defaultPage.name);
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
        showSuccess(`تم إضافة ${newServers.length} قناة`);
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
    else showSuccess("تم حفظ الأكواد");
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
            />
            <Button onClick={handleUnlock} className="w-full bg-indigo-600 hover:bg-indigo-700 font-bold">دخول</Button>
            <Button onClick={() => navigate('/')} variant="ghost" className="w-full text-slate-500 text-xs">العودة للرئيسية</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#020617] flex flex-col items-center justify-center text-white">
        <Loader2 className="animate-spin text-indigo-500 mb-4" size={48} />
        <p>جارٍ التحميل...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#020617] text-white p-4 md:p-8 font-sans flex flex-col" dir="rtl">
      <div className="max-w-7xl mx-auto w-full space-y-8 flex-grow">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          <h1 className="text-3xl font-black text-white">لوحة التحكم السحابية</h1>
          <div className="flex gap-2">
            <Button onClick={() => navigate('/')} variant="outline" className="bg-slate-900/50 border-slate-800 text-white hover:bg-white/5 gap-2 text-xs h-10">
              <Home size={16} /> الرئيسية
            </Button>
            <Button variant="outline" className="bg-slate-900/50 border-slate-800 text-white hover:bg-white/5 gap-2 text-xs h-10">
              <Upload size={16} /> استيراد نسخة
            </Button>
            <Button variant="outline" className="bg-slate-900/50 border-slate-800 text-white hover:bg-white/5 gap-2 text-xs h-10">
              <Download size={16} /> تصدير نسخة احتياطية
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Right Column: Pages & Bulk (Now on the right in RTL) */}
          <div className="lg:col-span-4 space-y-8">
            
            {/* Pages Section */}
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
                      <Button 
                        onClick={() => { setActivePageId(p.id); setActivePageName(p.name); fetchServers(p.id); }} 
                        variant={activePageId === p.id ? "default" : "outline"}
                        className={`w-full justify-between h-12 font-bold ${activePageId === p.id ? 'bg-indigo-600' : 'bg-slate-900/50 border-slate-800 text-slate-300'}`}
                      >
                        <div className="flex items-center gap-2">
                          <button onClick={(e) => { e.stopPropagation(); navigate(p.slug === 'default' ? '/real.html' : `/p/${p.slug}`); }} className="p-1 hover:text-white"><ExternalLink size={14} /></button>
                          {p.slug !== 'default' && <button onClick={(e) => { e.stopPropagation(); deletePage(p.id, p.slug); }} className="p-1 hover:text-red-400"><Trash2 size={14} /></button>}
                        </div>
                        <span>{p.name}</span>
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Bulk Add Section */}
            <Card className="bg-[#0f172a]/40 border-slate-800 text-white shadow-xl">
              <CardHeader>
                <CardTitle className="text-lg font-bold flex items-center gap-2"><ListPlus size={18} /> إضافة جماعية</CardTitle>
                <p className="text-[10px] text-slate-500">أضف قنوات متعددة: الاسم = الرابط (كل قناة في سطر)</p>
              </CardHeader>
              <CardContent className="space-y-4">
                <Textarea 
                  placeholder="سيرفر 1 = https://example.com/live.m3u8&#10;سيرفر 2 = https://example.com/embed" 
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

          {/* Left Column: Channels & SEO (Now on the left in RTL) */}
          <div className="lg:col-span-8 space-y-8">
            
            {/* Edit Channels */}
            <Card className="bg-[#0f172a]/40 border-slate-800 text-white shadow-xl">
              <CardHeader>
                <CardTitle className="text-xl font-bold text-center">تعديل قنوات: <span className="text-indigo-400">{activePageName}</span></CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex flex-col md:flex-row gap-3">
                  <Input 
                    placeholder="اسم القناة" 
                    value={newName} 
                    onChange={e => setNewName(e.target.value)} 
                    className="bg-slate-900/80 border-slate-700 h-12 text-right" 
                  />
                  <Input 
                    placeholder="رابط Iframe او m3u8 او ts او يوتيوب او فيس بوك" 
                    value={newUrl} 
                    onChange={e => setNewUrl(e.target.value)} 
                    className="bg-slate-900/80 border-slate-700 h-12 text-right" 
                  />
                  <Button onClick={handleSubmit} className="bg-indigo-600 hover:bg-indigo-700 font-bold h-12 px-8">
                    {editingId ? 'تحديث' : 'إضافة'}
                  </Button>
                </div>
                <p className="text-[10px] text-slate-500 text-center">يدعم: Iframe, m3u8, ts, YouTube, Facebook, Twitch, Kick, Raw Streams</p>
                
                <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                  {servers.map((s, i) => (
                    <div key={s.id} className="flex items-center justify-between p-4 bg-slate-900/60 border border-slate-800 rounded-xl group hover:border-indigo-500/30 transition-all">
                      <div className="flex-grow text-right">
                        <div className="font-black text-sm">{s.name}</div>
                        <div className="text-[10px] text-slate-500 truncate max-w-[400px]">{s.url}</div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <button className="p-2 text-slate-500 hover:text-white"><ChevronDown size={16} /></button>
                        <button className="p-2 text-slate-500 hover:text-white"><ChevronUp size={16} /></button>
                        <button onClick={() => { setEditingId(s.id || null); setNewName(s.name); setNewUrl(s.url); }} className="p-2 text-slate-500 hover:text-indigo-400"><Edit2 size={16} /></button>
                        <button onClick={() => s.id && deleteChannel(s.id)} className="p-2 text-slate-500 hover:text-red-500"><Trash2 size={16} /></button>
                        <button onClick={() => copyToClipboard(s.url)} className="p-2 text-slate-500 hover:text-emerald-400"><Copy size={16} /></button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* SEO Section */}
            <Card className="bg-[#0f172a]/40 border-slate-800 text-white shadow-xl">
              <CardHeader>
                <CardTitle className="text-xl font-bold text-center flex items-center justify-center gap-2">
                  <Code size={20} /> إعدادات الأكواد (Ads/SEO)
                </CardTitle>
                <p className="text-[10px] text-slate-500 text-center">سيتم حفظ هذه الأكواد في قاعدة البيانات لتظهر لجميع الزوار.</p>
              </CardHeader>
              <CardContent className="space-y-4">
                <Textarea 
                  placeholder="...ألصق الكود هنا" 
                  value={externalScripts}
                  onChange={(e) => setExternalScripts(e.target.value)}
                  className="bg-slate-900/80 border-slate-700 min-h-[200px] font-mono text-xs text-right"
                  dir="ltr"
                />
                <Button onClick={saveExternalScripts} className="w-full bg-emerald-600 hover:bg-emerald-700 font-black h-12 text-lg">
                  حفظ الأكواد في السحابة
                </Button>
              </CardContent>
            </Card>
          </div>

        </div>

        {/* Footer Button */}
        <div className="flex justify-center pt-12 pb-8">
          <Button 
            onClick={() => navigate('/')} 
            className="bg-red-600 hover:bg-red-700 text-white font-black px-16 py-8 rounded-2xl text-xl shadow-2xl shadow-red-600/20 transition-transform hover:scale-105"
          >
            إغلاق والعودة للمشاهدة
          </Button>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #1e293b; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #334155; }
      `}} />
    </div>
  );
};

export default AdminPanel;