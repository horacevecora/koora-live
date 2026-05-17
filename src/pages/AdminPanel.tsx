"use client";

import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Trash2, Edit2, Home, Layout, ExternalLink, Code, Loader2, Lock, LogOut, Save, ShieldCheck } from "lucide-react";
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
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  
  // حقل الكود
  const [accessCode, setAccessCode] = useState("");

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

  useEffect(() => {
    // التحقق من وجود جلسة دخول سابقة في المتصفح
    const savedAuth = localStorage.getItem('admin_auth');
    if (savedAuth === 'true') {
      setIsAuthorized(true);
      fetchInitialData();
    }
    setAuthLoading(false);
  }, []);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (accessCode === 'simo') {
      setIsAuthorized(true);
      localStorage.setItem('admin_auth', 'true');
      showSuccess("تم الدخول بنجاح");
      fetchInitialData();
    } else {
      showError("كود الدخول غير صحيح");
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
      const { data: settingsData } = await supabase.from('site_settings').select('value').eq('key', 'external_scripts').maybeSingle();
      if (settingsData) setExternalScripts(settingsData.value);
    } catch (err) {
      console.error(err);
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
    if (error) showError("فشل إنشاء الصفحة");
    else {
      setPages([...pages, data]);
      setNewPageName(""); setNewPageSlug("");
      showSuccess("تم إنشاء الصفحة");
    }
  };

  const deletePage = async (id: string, slug: string) => {
    if (slug === 'default') return;
    const { error } = await supabase.from('pages').delete().eq('id', id);
    if (error) showError("فشل حذف الصفحة");
    else {
      setPages(pages.filter(p => p.id !== id));
      showSuccess("تم حذف الصفحة");
    }
  };

  const handleSubmit = async () => {
    if (!newName || !newUrl || !activePageId) return;
    const lowUrl = newUrl.toLowerCase();
    let type = 'iframe';
    if (lowUrl.includes('.m3u8')) type = 'm3u8';
    else if (lowUrl.includes('.ts') || lowUrl.includes('type=http')) type = 'ts';
    else if (lowUrl.includes('youtube.com')) type = 'youtube';

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

  const deleteChannel = async (id: string) => {
    const { error } = await supabase.from('servers').delete().eq('id', id);
    if (error) showError("فشل الحذف");
    else if (activePageId) fetchServers(activePageId);
  };

  const saveExternalScripts = async () => {
    setIsLoading(true);
    const { error } = await supabase.from('site_settings').upsert({ key: 'external_scripts', value: externalScripts }, { onConflict: 'key' });
    setIsLoading(false);
    if (error) showError("فشل حفظ الأكواد");
    else showSuccess("تم حفظ الأكواد بنجاح");
  };

  const handleLogout = () => {
    localStorage.removeItem('admin_auth');
    setIsAuthorized(false);
    navigate('/');
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#020617] flex items-center justify-center">
        <Loader2 className="animate-spin text-indigo-500" size={40} />
      </div>
    );
  }

  if (!isAuthorized) {
    return (
      <div className="min-h-screen bg-[#020617] flex items-center justify-center p-4 font-sans" dir="rtl">
        <Card className="w-full max-w-sm bg-[#0f172a] border-slate-800 text-white shadow-2xl overflow-hidden border-t-4 border-t-indigo-600">
          <CardHeader className="text-center space-y-2 pt-8">
            <div className="mx-auto w-16 h-16 bg-indigo-600/10 rounded-full flex items-center justify-center mb-2 border border-indigo-500/20">
              <Lock className="text-indigo-500" size={28} />
            </div>
            <CardTitle className="text-2xl font-black">لوحة التحكم</CardTitle>
            <CardDescription className="text-slate-400 font-bold">يرجى إدخال كود الوصول للمتابعة</CardDescription>
          </CardHeader>
          <CardContent className="p-8">
            <form onSubmit={handleLogin} className="space-y-6">
              <div className="space-y-2">
                <Input 
                  type="text" 
                  placeholder="أدخل الكود هنا (simo)" 
                  value={accessCode} 
                  onChange={e => setAccessCode(e.target.value)} 
                  className="bg-slate-900 border-slate-700 h-12 text-center text-lg font-bold placeholder:text-slate-600" 
                  required 
                />
              </div>
              <Button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700 font-black h-12 text-lg">
                دخول
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#020617] text-white p-4 md:p-8 font-sans flex flex-col" dir="rtl">
      <div className="max-w-7xl mx-auto w-full space-y-8 flex-grow">
        
        <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-[#0f172a]/40 p-6 rounded-3xl border border-white/5">
          <div className="flex items-center gap-3">
            <ShieldCheck className="text-[#00e676]" size={24} />
            <h1 className="text-2xl font-black">لوحة الإدارة</h1>
          </div>
          <div className="flex gap-2">
            <Button onClick={() => navigate('/')} variant="outline" className="bg-slate-900 border-slate-800 text-white text-xs font-bold">الرئيسية</Button>
            <Button onClick={handleLogout} variant="outline" className="bg-red-900/20 border-red-900/30 text-red-400 text-xs font-bold">خروج</Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-4 space-y-8">
            <Card className="bg-[#0f172a]/40 border-slate-800 text-white rounded-3xl overflow-hidden">
              <CardHeader className="border-b border-white/5"><CardTitle className="text-lg font-bold">إدارة الصفحات</CardTitle></CardHeader>
              <CardContent className="p-6 space-y-4">
                <Input placeholder="اسم الصفحة" value={newPageName} onChange={e => setNewPageName(e.target.value)} className="bg-slate-900 border-slate-700 h-11 text-right" />
                <Input placeholder="المعرف (Slug)" value={newPageSlug} onChange={e => setNewPageSlug(e.target.value)} className="bg-slate-900 border-slate-700 h-11 text-right" />
                <Button onClick={addPage} className="w-full bg-indigo-600 font-bold">إنشاء صفحة</Button>
                <div className="space-y-2 pt-4 border-t border-white/5">
                  {pages.map(p => (
                    <div key={p.id} onClick={() => { setActivePageId(p.id); setActivePageName(p.name); fetchServers(p.id); }} className={`w-full flex items-center justify-between px-4 h-12 font-bold rounded-xl cursor-pointer transition-all ${activePageId === p.id ? 'bg-indigo-600 shadow-lg' : 'bg-slate-900/50 border border-slate-800'}`}>
                      <div className="flex items-center gap-2">
                        <ExternalLink size={14} onClick={(e) => { e.stopPropagation(); navigate(p.slug === 'default' ? '/real.html' : `/p/${p.slug}`); }} />
                        {p.slug !== 'default' && <Trash2 size={14} className="text-red-400" onClick={(e) => { e.stopPropagation(); deletePage(p.id, p.slug); }} />}
                      </div>
                      <span className="truncate">{p.name}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="lg:col-span-8 space-y-8">
            <Card className="bg-[#0f172a]/40 border-slate-800 text-white rounded-3xl overflow-hidden">
              <CardHeader className="border-b border-white/5"><CardTitle className="text-xl font-black">سيرفرات البث لـ: {activePageName}</CardTitle></CardHeader>
              <CardContent className="p-6 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <Input placeholder="اسم السيرفر" value={newName} onChange={e => setNewName(e.target.value)} className="bg-slate-900 border-slate-700 h-12 text-right" />
                  <Input placeholder="الرابط" value={newUrl} onChange={e => setNewUrl(e.target.value)} className="bg-slate-900 border-slate-700 h-12 text-right" />
                </div>
                <Button onClick={handleSubmit} className="w-full bg-indigo-600 font-black h-12 text-lg">
                  {editingId ? 'تحديث السيرفر' : 'إضافة السيرفر'}
                </Button>
                <div className="space-y-3">
                  {servers.map((s) => (
                    <div key={s.id} className="flex items-center justify-between p-4 bg-slate-900/60 border border-slate-800 rounded-2xl group">
                      <div className="text-right">
                        <div className="font-black text-sm">{s.name}</div>
                        <div className="text-[10px] text-slate-500 truncate max-w-[300px]">{s.url}</div>
                      </div>
                      <div className="flex gap-1">
                        <button onClick={() => { setEditingId(s.id || null); setNewName(s.name); setNewUrl(s.url); }} className="p-2 text-slate-400 hover:text-indigo-400"><Edit2 size={18} /></button>
                        <button onClick={() => s.id && deleteChannel(s.id)} className="p-2 text-slate-400 hover:text-red-500"><Trash2 size={18} /></button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="bg-[#0f172a]/40 border-slate-800 text-white rounded-3xl overflow-hidden">
              <CardHeader className="border-b border-white/5"><CardTitle className="text-xl font-black flex items-center gap-2"><Code size={20} /> الأكواد والإعلانات</CardTitle></CardHeader>
              <CardContent className="p-6 space-y-4">
                <Textarea placeholder="ألصق الكود هنا..." value={externalScripts} onChange={(e) => setExternalScripts(e.target.value)} className="bg-slate-900 border-slate-700 min-h-[250px] text-left font-mono text-xs" dir="ltr" />
                <Button onClick={saveExternalScripts} disabled={isLoading} className="w-full bg-emerald-600 hover:bg-emerald-700 font-black h-14 text-lg">
                  {isLoading ? <Loader2 className="animate-spin" /> : "حفظ وتفعيل الأكواد"}
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