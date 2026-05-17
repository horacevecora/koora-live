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
  
  // Auth Form State
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
      const { data: { session } } = await supabase.auth.getSession();
      setSession(session);
      setAuthLoading(false);
      if (session) fetchInitialData();
    };

    checkSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) fetchInitialData();
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      showError("خطأ في تسجيل الدخول: " + error.message);
    } else {
      showSuccess("تم تسجيل الدخول بنجاح");
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
        <Card className="w-full max-w-md bg-[#0f172a] border-slate-800 text-white shadow-2xl overflow-hidden">
          <div className="h-2 bg-indigo-600 w-full" />
          <CardHeader className="text-center space-y-2 pt-8">
            <div className="mx-auto w-16 h-16 bg-indigo-600/10 rounded-2xl flex items-center justify-center mb-4 border border-indigo-500/20">
              <Lock className="text-indigo-500" size={32} />
            </div>
            <CardTitle className="text-3xl font-black tracking-tight">لوحة التحكم</CardTitle>
            <CardDescription className="text-slate-400 font-bold">سجل دخولك لإدارة قنوات البث</CardDescription>
          </CardHeader>
          <CardContent className="p-8 pt-4">
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <div className="relative">
                  <Mail className="absolute right-3 top-3 text-slate-500" size={18} />
                  <Input 
                    type="email" 
                    placeholder="البريد الإلكتروني" 
                    value={email} 
                    onChange={e => setEmail(e.target.value)} 
                    className="bg-slate-900/50 border-slate-700 h-12 pr-10 text-right" 
                    required 
                  />
                </div>
              </div>
              <div className="space-y-2">
                <div className="relative">
                  <Key className="absolute right-3 top-3 text-slate-500" size={18} />
                  <Input 
                    type="password" 
                    placeholder="كلمة المرور" 
                    value={password} 
                    onChange={e => setPassword(e.target.value)} 
                    className="bg-slate-900/50 border-slate-700 h-12 pr-10 text-right" 
                    required 
                  />
                </div>
              </div>
              <Button type="submit" disabled={isLoading} className="w-full bg-indigo-600 hover:bg-indigo-700 font-black h-12 text-lg shadow-lg shadow-indigo-500/20">
                {isLoading ? <Loader2 className="animate-spin" /> : "تسجيل الدخول"}
              </Button>
            </form>
            <Button onClick={() => navigate('/')} variant="ghost" className="w-full mt-6 text-slate-500 hover:text-slate-300 font-bold">العودة للرئيسية</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#020617] text-white p-4 md:p-8 font-sans flex flex-col" dir="rtl">
      <div className="max-w-7xl mx-auto w-full space-y-8 flex-grow">
        
        <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-[#0f172a]/40 p-6 rounded-3xl border border-white/5">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <Layout size={24} />
            </div>
            <div>
              <h1 className="text-2xl font-black">لوحة التحكم</h1>
              <p className="text-xs text-slate-400 font-bold">{session.user.email}</p>
            </div>
          </div>
          <div className="flex gap-3">
            <Button onClick={() => navigate('/')} variant="outline" className="bg-slate-900/50 border-slate-800 text-white hover:bg-white/5 gap-2 font-bold px-6">
              <Home size={18} /> معاينة الموقع
            </Button>
            <Button onClick={handleLogout} variant="outline" className="bg-red-900/20 border-red-900/30 text-red-400 hover:bg-red-900/40 gap-2 font-bold px-6">
              <LogOut size={18} /> خروج
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-4 space-y-8">
            <Card className="bg-[#0f172a]/40 border-slate-800 text-white rounded-[2rem] overflow-hidden">
              <CardHeader className="bg-white/5">
                <CardTitle className="text-lg font-bold flex items-center gap-2"><Layout size={20} /> إدارة الصفحات</CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-6">
                <div className="space-y-3">
                  <Input placeholder="اسم الصفحة (مثل: مباراة ريال مدريد)" value={newPageName} onChange={e => setNewPageName(e.target.value)} className="bg-slate-900/80 border-slate-700 h-12 text-right" />
                  <Input placeholder="المعرف (مثل: real-madrid)" value={newPageSlug} onChange={e => setNewPageSlug(e.target.value)} className="bg-slate-900/80 border-slate-700 h-12 text-right" />
                  <Button onClick={addPage} className="w-full bg-emerald-600 hover:bg-emerald-700 font-black h-12">
                    إنشاء صفحة جديدة
                  </Button>
                </div>
                <div className="space-y-2 pt-4 border-t border-white/5">
                  <p className="text-xs font-black text-slate-500 mb-3 uppercase tracking-widest">قائمة الصفحات</p>
                  {pages.map(p => (
                    <div 
                      key={p.id}
                      onClick={() => { setActivePageId(p.id); setActivePageName(p.name); fetchServers(p.id); }} 
                      className={`w-full flex items-center justify-between px-4 h-14 font-bold rounded-2xl cursor-pointer transition-all ${activePageId === p.id ? 'bg-indigo-600 shadow-lg shadow-indigo-500/20 scale-[1.02]' : 'bg-slate-900/50 border border-slate-800 hover:bg-slate-800'}`}
                    >
                      <div className="flex items-center gap-2">
                        <ExternalLink size={16} className="hover:text-white" onClick={(e) => { e.stopPropagation(); navigate(p.slug === 'default' ? '/real.html' : `/p/${p.slug}`); }} />
                        {p.slug !== 'default' && <Trash2 size={16} className="hover:text-red-400" onClick={(e) => { e.stopPropagation(); deletePage(p.id, p.slug); }} />}
                      </div>
                      <span className="truncate max-w-[150px]">{p.name}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="lg:col-span-8 space-y-8">
            <Card className="bg-[#0f172a]/40 border-slate-800 text-white rounded-[2rem] overflow-hidden">
              <CardHeader className="bg-white/5">
                <CardTitle className="text-xl font-black">سيرفرات البث لـ: <span className="text-indigo-400">{activePageName}</span></CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-8">
                <div className="bg-white/5 p-6 rounded-3xl border border-white/5 space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input placeholder="اسم السيرفر (مثال: سيرفر 1)" value={newName} onChange={e => setNewName(e.target.value)} className="bg-slate-900/80 border-slate-700 h-12 text-right" />
                    <Input placeholder="رابط البث (m3u8, ts, iframe...)" value={newUrl} onChange={e => setNewUrl(e.target.value)} className="bg-slate-900/80 border-slate-700 h-12 text-right" />
                  </div>
                  <Button onClick={handleSubmit} className="w-full bg-indigo-600 hover:bg-indigo-700 font-black h-12 text-lg">
                    {editingId ? 'تحديث السيرفر الحالي' : 'إضافة سيرفر جديد للجدول'}
                  </Button>
                </div>
                
                <div className="space-y-3">
                  <p className="text-xs font-black text-slate-500 mb-2 uppercase tracking-widest">السيرفرات المضافة</p>
                  {servers.length > 0 ? servers.map((s) => (
                    <div key={s.id} className="flex items-center justify-between p-5 bg-slate-900/60 border border-slate-800 rounded-2xl group hover:border-indigo-500/30 transition-all">
                      <div className="flex-grow text-right">
                        <div className="font-black text-slate-200">{s.name}</div>
                        <div className="text-[10px] text-slate-500 truncate max-w-[400px] mt-1 font-mono">{s.url}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button onClick={() => { setEditingId(s.id || null); setNewName(s.name); setNewUrl(s.url); }} className="p-3 bg-white/5 rounded-xl text-slate-400 hover:text-indigo-400 hover:bg-indigo-500/10 transition-all"><Edit2 size={18} /></button>
                        <button onClick={() => s.id && deleteChannel(s.id)} className="p-3 bg-white/5 rounded-xl text-slate-400 hover:text-red-500 hover:bg-red-500/10 transition-all"><Trash2 size={18} /></button>
                      </div>
                    </div>
                  )) : (
                    <div className="text-center py-12 bg-slate-900/20 rounded-3xl border border-dashed border-white/5">
                      <p className="text-slate-500 font-bold">لا توجد سيرفرات مضافة لهذه الصفحة</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card className="bg-[#0f172a]/40 border-slate-800 text-white rounded-[2rem] overflow-hidden">
              <CardHeader className="bg-white/5">
                <CardTitle className="text-xl font-black flex items-center gap-2">
                  <Code size={24} className="text-emerald-500" /> إعدادات الأكواد والإعلانات
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                <Textarea 
                  placeholder="ألصق أكواد Monetag أو Meta Tags أو أي سكربتات إضافية هنا..." 
                  value={externalScripts}
                  onChange={(e) => setExternalScripts(e.target.value)}
                  className="bg-slate-900/80 border-slate-700 min-h-[300px] font-mono text-xs text-right leading-relaxed focus:border-emerald-500/50"
                  dir="ltr"
                />
                <Button onClick={saveExternalScripts} disabled={isLoading} className="w-full bg-emerald-600 hover:bg-emerald-700 font-black h-14 text-lg shadow-lg shadow-emerald-500/20">
                  {isLoading ? <Loader2 className="animate-spin" /> : <><Save size={20} className="ml-2" /> حفظ وتفعيل الأكواد فوراً</>}
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