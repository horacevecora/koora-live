"use client";

import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Trash2, Edit2, ChevronUp, ChevronDown, Plus, Settings, X, Check, RotateCcw, Lock, Layout, Link as LinkIcon, ExternalLink } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { showSuccess, showError } from "@/utils/toast";

interface Server {
  name: string;
  url: string;
  type: string;
}

interface CustomPage {
  id: string;
  title: string;
  slug: string;
  servers: Server[];
}

const AdminPanel = () => {
  const navigate = useNavigate();
  const [servers, setServers] = useState<Server[]>([]);
  const [customPages, setCustomPages] = useState<CustomPage[]>([]);
  
  // حقول القنوات (للسيرفر الافتراضي أو داخل صفحة)
  const [newName, setNewName] = useState("");
  const [newUrl, setNewUrl] = useState("");
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  
  // حقول الصفحات
  const [pageTitle, setPageTitle] = useState("");
  const [pageSlug, setPageSlug] = useState("");
  const [editingPageId, setEditingPageId] = useState<string | null>(null);

  // نظام الحماية
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [passwordInput, setPasswordInput] = useState("");

  useEffect(() => {
    const authStatus = sessionStorage.getItem('admin_auth');
    if (authStatus === 'true') setIsAuthenticated(true);

    // تحميل القنوات الافتراضية
    const savedServers = localStorage.getItem('player_servers');
    if (savedServers) setServers(JSON.parse(savedServers));
    else {
      const def = [{"name":"سيرفر 1","url":"https://8.wwwkora.com/albaplayer/bein-sports-hd-1/?serv=1","type":"iframe"}];
      setServers(def);
      localStorage.setItem('player_servers', JSON.stringify(def));
    }

    // تحميل الصفحات المخصصة
    const savedPages = localStorage.getItem('custom_pages');
    if (savedPages) setCustomPages(JSON.parse(savedPages));
  }, []);

  const handleLogin = () => {
    if (passwordInput === "simo") {
      setIsAuthenticated(true);
      sessionStorage.setItem('admin_auth', 'true');
      showSuccess("تم تسجيل الدخول بنجاح");
    } else {
      showError("كلمة المرور غير صحيحة");
      setPasswordInput("");
    }
  };

  /* --- إدارة القنوات الافتراضية --- */
  const saveServers = (updated: Server[]) => {
    setServers(updated);
    localStorage.setItem('player_servers', JSON.stringify(updated));
  };

  const handleServerSubmit = () => {
    if (!newName || !newUrl) return;
    const type = newUrl.includes('.m3u8') ? 'm3u8' : 'iframe';
    if (editingIndex !== null) {
      const updated = [...servers];
      updated[editingIndex] = { name: newName, url: newUrl, type };
      saveServers(updated);
      setEditingIndex(null);
    } else {
      saveServers([...servers, { name: newName, url: newUrl, type }]);
    }
    setNewName(""); setNewUrl("");
    showSuccess("تم الحفظ");
  };

  /* --- إدارة الصفحات المخصصة --- */
  const savePages = (updated: CustomPage[]) => {
    setCustomPages(updated);
    localStorage.setItem('custom_pages', JSON.stringify(updated));
  };

  const handlePageSubmit = () => {
    if (!pageTitle || !pageSlug) return;
    const slug = pageSlug.replace(/\s+/g, '-').toLowerCase();
    
    if (editingPageId) {
      const updated = customPages.map(p => p.id === editingPageId ? { ...p, title: pageTitle, slug } : p);
      savePages(updated);
      setEditingPageId(null);
    } else {
      const newPage: CustomPage = {
        id: Date.now().toString(),
        title: pageTitle,
        slug,
        servers: []
      };
      savePages([...customPages, newPage]);
    }
    setPageTitle(""); setPageSlug("");
    showSuccess("تم حفظ الصفحة");
  };

  const deletePage = (id: string) => {
    savePages(customPages.filter(p => p.id !== id));
  };

  const addServerToPage = (pageId: string) => {
    if (!newName || !newUrl) { showError("أدخل بيانات القناة أولاً"); return; }
    const type = newUrl.includes('.m3u8') ? 'm3u8' : 'iframe';
    const updated = customPages.map(p => {
      if (p.id === pageId) {
        return { ...p, servers: [...p.servers, { name: newName, url: newUrl, type }] };
      }
      return p;
    });
    savePages(updated);
    setNewName(""); setNewUrl("");
    showSuccess("تمت إضافة القناة للصفحة");
  };

  const removeServerFromPage = (pageId: string, serverIndex: number) => {
    const updated = customPages.map(p => {
      if (p.id === pageId) {
        const newServers = p.servers.filter((_, i) => i !== serverIndex);
        return { ...p, servers: newServers };
      }
      return p;
    });
    savePages(updated);
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
            <Input type="password" placeholder="كلمة المرور" value={passwordInput} onChange={(e) => setPasswordInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleLogin()} className="bg-slate-900 border-slate-700 text-white text-center" autoFocus />
            <Button onClick={handleLogin} className="w-full bg-indigo-600 hover:bg-indigo-700 font-bold py-6">دخول</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#020617] text-white p-4 md:p-8 font-sans" dir="rtl">
      <div className="max-w-5xl mx-auto space-y-8">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-black flex items-center gap-2">
            <Settings className="text-indigo-500" /> لوحة التحكم المتقدمة
          </h1>
          <Button variant="outline" size="sm" onClick={() => { sessionStorage.removeItem('admin_auth'); setIsAuthenticated(false); }} className="border-slate-800 text-slate-400">تسجيل الخروج</Button>
        </div>

        <Tabs defaultValue="default" className="w-full">
          <TabsList className="grid w-full grid-cols-2 bg-slate-900 border border-slate-800 p-1 h-14">
            <TabsTrigger value="default" className="data-[state=active]:bg-indigo-600 font-bold">المشغل الرئيسي (/real)</TabsTrigger>
            <TabsTrigger value="pages" className="data-[state=active]:bg-emerald-600 font-bold">الصفحات المخصصة (/live)</TabsTrigger>
          </TabsList>

          {/* قسم المشغل الرئيسي */}
          <TabsContent value="default" className="space-y-6 mt-6">
            <Card className="bg-[#0f172a]/50 border-slate-800 text-white">
              <CardHeader><CardTitle className="text-lg">إضافة قناة للمشغل الرئيسي</CardTitle></CardHeader>
              <CardContent className="flex flex-col md:flex-row gap-4">
                <Input placeholder="اسم القناة" value={newName} onChange={(e) => setNewName(e.target.value)} className="bg-slate-900 border-slate-700" />
                <Input placeholder="الرابط" value={newUrl} onChange={(e) => setNewUrl(e.target.value)} className="bg-slate-900 border-slate-700" />
                <Button onClick={handleServerSubmit} className="bg-indigo-600 hover:bg-indigo-700 min-w-[120px]">{editingIndex !== null ? 'تحديث' : 'إضافة'}</Button>
              </CardContent>
            </Card>

            <div className="grid gap-3">
              {servers.map((s, i) => (
                <div key={i} className="flex items-center justify-between p-4 bg-slate-900/80 border border-slate-800 rounded-xl">
                  <div className="font-bold">{s.name}</div>
                  <div className="flex gap-2">
                    <button onClick={() => {setNewName(s.name); setNewUrl(s.url); setEditingIndex(i);}} className="p-2 text-indigo-400"><Edit2 size={18}/></button>
                    <button onClick={() => saveServers(servers.filter((_, idx) => idx !== i))} className="p-2 text-red-500"><Trash2 size={18}/></button>
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>

          {/* قسم الصفحات المخصصة */}
          <TabsContent value="pages" className="space-y-6 mt-6">
            <Card className="bg-[#0f172a]/50 border-slate-800 text-white">
              <CardHeader><CardTitle className="text-lg">إنشاء صفحة بث جديدة</CardTitle></CardHeader>
              <CardContent className="flex flex-col md:flex-row gap-4">
                <Input placeholder="عنوان الصفحة (مثلاً: مباراة ريال مدريد)" value={pageTitle} onChange={(e) => setPageTitle(e.target.value)} className="bg-slate-900 border-slate-700" />
                <Input placeholder="الرابط (مثلاً: real-madrid)" value={pageSlug} onChange={(e) => setPageSlug(e.target.value)} className="bg-slate-900 border-slate-700" />
                <Button onClick={handlePageSubmit} className="bg-emerald-600 hover:bg-emerald-700 min-w-[120px]">{editingPageId ? 'تحديث' : 'إنشاء صفحة'}</Button>
              </CardContent>
            </Card>

            <div className="space-y-6">
              {customPages.map((page) => (
                <Card key={page.id} className="bg-slate-900/40 border-slate-800 text-white overflow-hidden">
                  <div className="bg-slate-800/50 p-4 flex justify-between items-center border-b border-slate-700">
                    <div>
                      <h3 className="font-black text-lg text-emerald-400">{page.title}</h3>
                      <div className="flex items-center gap-2 text-xs text-slate-400 mt-1">
                        <LinkIcon size={12} /> 
                        <span>/live/{page.slug}</span>
                        <button onClick={() => window.open(`/live/${page.slug}`, '_blank')} className="text-indigo-400 hover:underline flex items-center gap-1 ml-2">
                          فتح <ExternalLink size={10} />
                        </button>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => {setPageTitle(page.title); setPageSlug(page.slug); setEditingPageId(page.id);}} className="p-2 text-slate-400 hover:text-white"><Edit2 size={18}/></button>
                      <button onClick={() => deletePage(page.id)} className="p-2 text-red-500/50 hover:text-red-500"><Trash2 size={18}/></button>
                    </div>
                  </div>
                  <CardContent className="p-4 space-y-4">
                    <div className="flex gap-2 bg-black/20 p-3 rounded-lg border border-slate-800">
                      <Input placeholder="اسم القناة لهذه الصفحة" value={newName} onChange={(e) => setNewName(e.target.value)} className="bg-slate-900 border-slate-700 h-9 text-sm" />
                      <Input placeholder="الرابط" value={newUrl} onChange={(e) => setNewUrl(e.target.value)} className="bg-slate-900 border-slate-700 h-9 text-sm" />
                      <Button onClick={() => addServerToPage(page.id)} size="sm" className="bg-indigo-600 h-9"><Plus size={16} /></Button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {page.servers.map((srv, sIdx) => (
                        <div key={sIdx} className="flex items-center justify-between p-2 bg-slate-800/30 rounded-lg border border-slate-700/50 text-sm">
                          <span className="font-bold truncate max-w-[150px]">{srv.name}</span>
                          <button onClick={() => removeServerFromPage(page.id, sIdx)} className="text-red-400 hover:text-red-500 p-1"><X size={14}/></button>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>

        <div className="flex justify-center pt-10">
          <Button onClick={() => navigate('/real.html')} className="bg-red-600 hover:bg-red-700 text-white px-10 py-6 rounded-2xl font-bold">العودة للمشاهدة</Button>
        </div>
      </div>
    </div>
  );
};

export default AdminPanel;