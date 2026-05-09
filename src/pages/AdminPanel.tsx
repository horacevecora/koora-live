"use client";

import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Trash2, Edit2, ChevronUp, ChevronDown, Plus, RotateCcw, Lock, Layout, ExternalLink, Code, Loader2, Home } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { showSuccess, showError } from "@/utils/toast";
import { supabase } from "@/integrations/supabase/client";

interface Server {
  id?: string;
  name: string;
  url: string;
  type: string;
  sort_order: number;
}

interface Page {
  id: string;
  name: string;
  slug: string;
}

const AdminPanel = () => {
  const navigate = useNavigate();
  
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [passwordInput, setPasswordInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);

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

  useEffect(() => {
    const authStatus = sessionStorage.getItem('admin_auth');
    if (authStatus === 'true') {
      setIsAuthenticated(true);
      fetchInitialData();
    }
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
        setActivePageSlug(defaultPage.slug);
        fetchServers(defaultPage.id);
      } else {
        const { data: newPage, error: createError } = await supabase
          .from('pages')
          .insert([{ name: "الصفحة الرئيسية", slug: "default" }])
          .select()
          .single();
        
        if (createError) throw createError;
        setPages([newPage]);
        setActivePageId(newPage.id);
        setActivePageSlug(newPage.slug);
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

  const handleLogin = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('site_settings')
        .select('value')
        .eq('key', 'admin_password')
        .single();

      const correctPassword = data?.value || "simo";

      if (passwordInput === correctPassword) {
        setIsAuthenticated(true);
        sessionStorage.setItem('admin_auth', 'true');
        fetchInitialData();
        showSuccess("تم تسجيل الدخول بنجاح");
      } else {
        showError("كلمة المرور غير صحيحة");
        setPasswordInput("");
      }
    } catch (err) {
      if (passwordInput === "simo") {
        setIsAuthenticated(true);
        sessionStorage.setItem('admin_auth', 'true');
        fetchInitialData();
      } else {
        showError("كلمة المرور غير صحيحة");
      }
    } finally {
      setIsLoading(false);
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
      showError("فشل في إنشاء الصفحة (ربما المعرف مستخدم)");
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
      if (activePageId === id) {
        const def = pages.find(p => p.slug === 'default');
        if (def) {
          setActivePageId(def.id);
          setActivePageSlug(def.slug);
          fetchServers(def.id);
        }
      }
      showSuccess("تم حذف الصفحة");
    }
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
        cancelEdit();
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

  const deleteChannel = async (id: string) => {
    const { error } = await supabase.from('servers').delete().eq('id', id);
    if (error) showError("فشل الحذف");
    else if (activePageId) fetchServers(activePageId);
  };

  const moveChannel = async (index: number, direction: 'up' | 'down') => {
    const target = direction === 'up' ? index - 1 : index + 1;
    if (target < 0 || target >= servers.length || !activePageId) return;

    const item1 = servers[index];
    const item2 = servers[target];

    const { error } = await supabase.from('servers').upsert([
      { id: item1.id, sort_order: item2.sort_order },
      { id: item2.id, sort_order: item1.sort_order }
    ]);

    if (!error) fetchServers(activePageId);
  };

  const saveExternalScripts = async () => {
    const { error } = await supabase
      .from('site_settings')
      .upsert({ key: 'external_scripts', value: externalScripts }, { onConflict: 'key' });
    
    if (error) showError("فشل حفظ الأكواد");
    else showSuccess("تم حفظ الأكواد بنجاح");
  };

  const startEdit = (server: Server) => {
    setNewName(server.name);
    setNewUrl(server.url);
    setEditingId(server.id || null);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setNewName("");
    setNewUrl("");
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#020617] flex items-center justify-center p-4 font-sans" dir="rtl">
        <Card className="w-full max-w-md bg-[#0f172a] border-slate-800 text-white shadow-2xl">
          <CardHeader className="text-center space-y-2">
            <div className="mx-auto w-12 h-12 bg-indigo-600/20 rounded-full flex items-center justify-center mb-2">
              <Lock className="text-indigo-500" size={24} />
            </div>
            <CardTitle className="text-2xl font-black">منطقة محظورة</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input 
              type="password"
              placeholder="كلمة المرور" 
              value={passwordInput}
              onChange={(e) => setPasswordInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
              className="bg-slate-900 border-slate-700 text-white text-center text-lg"
              autoFocus
            />
            <Button onClick={handleLogin} disabled={isLoading} className="w-full bg-indigo-600 hover:bg-indigo-700 font-bold py-6">
              {isLoading ? <Loader2 className="animate-spin" /> : "دخول"}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#020617] text-white p-4 md:p-8 font-sans" dir="rtl">
      <div className="max-w-5xl mx-auto space-y-8">
        
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-black text-indigo-400">لوحة التحكم</h1>
          <Button onClick={() => navigate('/')} variant="outline" className="border-slate-700 text-slate-300 hover:bg-white/5 gap-2">
            <Home size={18} /> الصفحة الرئيسية
          </Button>
        </div>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 className="animate-spin text-indigo-500 mb-4" size={48} />
            <p>جارٍ تحميل البيانات من السحابة...</p>
          </div>
        ) : (
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
            </div>

            <div className="md:col-span-2 space-y-6">
              <Card className="bg-[#0f172a]/50 border-slate-800 text-white">
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="text-lg">تعديل قنوات: <span className="text-indigo-400">{pages.find(p => p.id === activePageId)?.name}</span></CardTitle>
                  {editingId && <Button variant="ghost" size="sm" onClick={cancelEdit} className="text-xs"><RotateCcw size={14} className="ml-1" /> إلغاء</Button>}
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
                          <button onClick={() => s.id && deleteChannel(s.id)} className="p-1.5 text-slate-500 hover:text-red-500"><Trash2 size={16} /></button>
                          <button onClick={() => startEdit(s)} className="p-1.5 text-slate-500 hover:text-indigo-400"><Edit2 size={16} /></button>
                          <button onClick={() => moveChannel(i, 'up')} className="p-1.5 text-slate-500 hover:text-white"><ChevronUp size={16} /></button>
                          <button onClick={() => moveChannel(i, 'down')} className="p-1.5 text-slate-500 hover:text-white"><ChevronDown size={16} /></button>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-[#0f172a]/50 border-slate-800 text-white">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2"><Code size={20} /> إعدادات الأكواد (Ads/SEO)</CardTitle>
                  <CardDescription className="text-slate-400">سيتم حفظ هذه الأكواد في قاعدة البيانات لتظهر لجميع الزوار.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Textarea 
                    placeholder="ألصق الكود هنا..." 
                    value={externalScripts}
                    onChange={(e) => setExternalScripts(e.target.value)}
                    className="bg-slate-900 border-slate-700 min-h-[150px] font-mono text-xs"
                    dir="ltr"
                  />
                  <Button onClick={saveExternalScripts} className="w-full bg-emerald-600 hover:bg-emerald-700 font-bold">حفظ الأكواد في السحابة</Button>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        <div className="flex justify-center">
          <Button onClick={() => navigate('/real.html')} className="bg-red-600 hover:bg-red-700 px-10 py-6 rounded-2xl font-bold">إغلاق والعودة للمشاهدة</Button>
        </div>
      </div>
    </div>
  );
};

export default AdminPanel;