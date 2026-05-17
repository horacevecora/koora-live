"use client";

import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Trash2, Edit2, Home, Layout, ExternalLink, Code, Loader2, Lock, LogOut, Save, Mail, Key } from "lucide-react";
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
  const [session, setSession] = useState<any>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

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
    const checkSession = async () => {
      const { data: { session: currentSession } } = await supabase.auth.getSession();
      setSession(currentSession);
      setAuthLoading(false);
      if (currentSession) fetchInitialData();
    };

    checkSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      if (newSession) fetchInitialData();
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      showError("خطأ: " + error.message);
    } else {
      showSuccess("تم تسجيل الدخول");
    }
    setIsLoading(false);
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

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/');
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#020617] flex items-center justify-center">
        <Loader2 className="animate-spin text-indigo-500" size={40} />
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-[#020617] flex items-center justify-center p-4 font-sans" dir="rtl">
        <Card className="w-full max-w-md bg-[#0f172a] border-slate-800 text-white shadow-2xl">
          <CardHeader className="text-center space-y-2">
            <Lock className="text-indigo-500 mx-auto mb-2" size={32} />
            <CardTitle className="text-2xl font-black">لوحة التحكم</CardTitle>
            <CardDescription className="text-slate-400">سجل دخولك لإدارة القنوات والأكواد</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <Input type="email" placeholder="البريد الإلكتروني" value={email} onChange={e => setEmail(e.target.value)} className="bg-slate-900 border-slate-700 text-right" required />
              <Input type="password" placeholder="كلمة المرور" value={password} onChange={e => setPassword(e.target.value)} className="bg-slate-900 border-slate-700 text-right" required />
              <Button type="submit" disabled={isLoading} className="w-full bg-indigo-600 hover:bg-indigo-700 font-bold">
                {isLoading ? <Loader2 className="animate-spin" /> : "دخول"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#020617] text-white p-4 md:p-8 font-sans" dir="rtl">
      <div className="max-w-7xl mx-auto space-y-8">
        <div className="flex justify-between items-center bg-[#0f172a]/40 p-6 rounded-3xl border border-white/5">
          <h1 className="text-2xl font-black">لوحة التحكم</h1>
          <div className="flex gap-2">
            <Button onClick={() => navigate('/')} variant="outline" className="bg-slate-900 border-slate-800 text-white text-xs">الرئيسية</Button>
            <Button onClick={handleLogout} variant="outline" className="bg-red-900/20 border-red-900/30 text-red-400 text-xs">خروج</Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-4 space-y-8">
            <Card className="bg-[#0f172a]/40 border-slate-800 text-white">
              <CardHeader><CardTitle className="text-lg font-bold">الصفحات</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <Input placeholder="اسم الصفحة" value={newPageName} onChange={e => setNewPageName(e.target.value)} className="bg-slate-900 border-slate-700 text-right" />
                <Input placeholder="المعرف (Slug)" value={newPageSlug} onChange={e => setNewPageSlug(e.target.value)} className="bg-slate-900 border-slate-700 text-right" />
                <Button onClick={addPage} className="w-full bg-indigo-600">إنشاء</Button>
                <div className="space-y-2 pt-4">
                  {pages.map(p => (
                    <div key={p.id} onClick={() => { setActivePageId(p.id); setActivePageName(p.name); fetchServers(p.id); }} className={`w-full flex items-center justify-between px-4 h-12 font-bold rounded-md cursor-pointer ${activePageId === p.id ? 'bg-indigo-600' : 'bg-slate-900/50 border border-slate-800'}`}>
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
            <Card className="bg-[#0f172a]/40 border-slate-800 text-white">
              <CardHeader><CardTitle className="text-xl font-bold">سيرفرات: {activePageName}</CardTitle></CardHeader>
              <CardContent className="space-y-6">
                <div className="flex flex-col md:flex-row gap-3">
                  <Input placeholder="اسم السيرفر" value={newName} onChange={e => setNewName(e.target.value)} className="bg-slate-900 border-slate-700 text-right" />
                  <Input placeholder="الرابط" value={newUrl} onChange={e => setNewUrl(e.target.value)} className="bg-slate-900 border-slate-700 text-right" />
                  <Button onClick={handleSubmit} className="bg-indigo-600 px-8">حفظ</Button>
                </div>
                <div className="space-y-3">
                  {servers.map((s) => (
                    <div key={s.id} className="flex items-center justify-between p-4 bg-slate-900/60 border border-slate-800 rounded-xl">
                      <div className="text-right">
                        <div className="font-black text-sm">{s.name}</div>
                        <div className="text-[10px] text-slate-500 truncate max-w-[200px]">{s.url}</div>
                      </div>
                      <div className="flex gap-1">
                        <button onClick={() => { setEditingId(s.id || null); setNewName(s.name); setNewUrl(s.url); }} className="p-2"><Edit2 size={16} /></button>
                        <button onClick={() => s.id && deleteChannel(s.id)} className="p-2 text-red-500"><Trash2 size={16} /></button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="bg-[#0f172a]/40 border-slate-800 text-white">
              <CardHeader><CardTitle className="text-xl font-bold">الأكواد والإعلانات (Ads/SEO)</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <Textarea placeholder="ألصق الكود هنا..." value={externalScripts} onChange={(e) => setExternalScripts(e.target.value)} className="bg-slate-900 border-slate-700 min-h-[200px] text-left" dir="ltr" />
                <Button onClick={saveExternalScripts} disabled={isLoading} className="w-full bg-emerald-600 font-black h-12">
                  {isLoading ? <Loader2 className="animate-spin" /> : <><Save size={18} className="ml-2" /> حفظ الكود</>}
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