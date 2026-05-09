"use client";

import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Trash2, Edit2, ChevronUp, ChevronDown, Plus, Settings, Lock, Link as LinkIcon, ExternalLink, LogOut } from "lucide-react";
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
  
  const [newName, setNewName] = useState("");
  const [newUrl, setNewUrl] = useState("");
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  
  const [pageTitle, setPageTitle] = useState("");
  const [pageSlug, setPageSlug] = useState("");
  const [editingPageId, setEditingPageId] = useState<string | null>(null);

  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [passwordInput, setPasswordInput] = useState("");

  useEffect(() => {
    const authStatus = sessionStorage.getItem('admin_auth');
    if (authStatus === 'true') setIsAuthenticated(true);

    const savedServers = localStorage.getItem('player_servers');
    if (savedServers) setServers(JSON.parse(savedServers));
    
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

  const moveServer = (index: number, direction: 'up' | 'down') => {
    const updated = [...servers];
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= updated.length) return;
    [updated[index], updated[newIndex]] = [updated[newIndex], updated[index]];
    saveServers(updated);
  };

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
      const newPage: CustomPage = { id: Date.now().toString(), title: pageTitle, slug, servers: [] };
      savePages([...customPages, newPage]);
    }
    setPageTitle(""); setPageSlug("");
    showSuccess("تم حفظ الصفحة");
  };

  const movePageServer = (pageId: string, index: number, direction: 'up' | 'down') => {
    const updated = customPages.map(p => {
      if (p.id === pageId) {
        const newServers = [...p.servers];
        const newIndex = direction === 'up' ? index - 1 : index + 1;
        if (newIndex >= 0 && newIndex < newServers.length) {
          [newServers[index], newServers[newIndex]] = [newServers[newIndex], newServers[index]];
        }
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
        {/* Header */}
        <div className="flex justify-between items-center mb-10">
          <Button variant="secondary" size="sm" onClick={() => { sessionStorage.removeItem('admin_auth'); setIsAuthenticated(false); }} className="bg-white/10 hover:bg-white/20 text-white border-none">
            <LogOut size={16} className="ml-2" /> تسجيل الخروج
          </Button>
          <h1 className="text-2xl font-black flex items-center gap-3">
            لوحة التحكم المتقدمة <Settings className="text-indigo-500" />
          </h1>
        </div>

        <Tabs defaultValue="default" className="w-full">
          <TabsList className="grid w-full grid-cols-2 bg-[#0f172a] border border-slate-800 p-1 h-14 rounded-xl">
            <TabsTrigger value="default" className="data-[state=active]:bg-indigo-600 data-[state=active]:text-white font-bold rounded-lg transition-all">المشغل الرئيسي (/real)</TabsTrigger>
            <TabsTrigger value="pages" className="data-[state=active]:bg-indigo-600 data-[state=active]:text-white font-bold rounded-lg transition-all">الصفحات المخصصة (/live)</TabsTrigger>
          </TabsList>

          {/* المشغل الرئيسي */}
          <TabsContent value="default" className="space-y-6 mt-8">
            <Card className="bg-[#0f172a] border-slate-800 text-white shadow-xl">
              <CardHeader><CardTitle className="text-lg font-bold">إضافة قناة للمشغل الرئيسي</CardTitle></CardHeader>
              <CardContent className="flex flex-col md:flex-row gap-4">
                <Input placeholder="اسم القناة" value={newName} onChange={(e) => setNewName(e.target.value)} className="bg-[#020617] border-slate-700 h-12" />
                <Input placeholder="الرابط" value={newUrl} onChange={(e) => setNewUrl(e.target.value)} className="bg-[#020617] border-slate-700 h-12" />
                <Button onClick={handleServerSubmit} className="bg-indigo-600 hover:bg-indigo-700 h-12 px-10 font-bold">{editingIndex !== null ? 'تحديث' : 'إضافة'}</Button>
              </CardContent>
            </Card>

            <div className="space-y-3">
              {servers.map((s, i) => (
                <div key={i} className="flex items-center justify-between p-5 bg-[#0f172a] border border-slate-800 rounded-xl hover:border-indigo-500/50 transition-all group">
                  <div className="font-bold text-lg">{s.name}</div>
                  <div className="flex items-center gap-1">
                    <button onClick={() => moveServer(i, 'up')} disabled={i === 0} className="p-2 text-slate-500 hover:text-white disabled:opacity-20"><ChevronUp size={20}/></button>
                    <button onClick={() => moveServer(i, 'down')} disabled={i === servers.length - 1} className="p-2 text-slate-500 hover:text-white disabled:opacity-20"><ChevronDown size={20}/></button>
                    <div className="w-px h-6 bg-slate-800 mx-2" />
                    <button onClick={() => {setNewName(s.name); setNewUrl(s.url); setEditingIndex(i);}} className="p-2 text-indigo-400 hover:bg-indigo-500/10 rounded-lg"><Edit2 size={18}/></button>
                    <button onClick={() => saveServers(servers.filter((_, idx) => idx !== i))} className="p-2 text-red-500 hover:bg-red-500/10 rounded-lg"><Trash2 size={18}/></button>
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>

          {/* الصفحات المخصصة */}
          <TabsContent value="pages" className="space-y-6 mt-8">
            <Card className="bg-[#0f172a] border-slate-800 text-white shadow-xl">
              <CardHeader><CardTitle className="text-lg font-bold">إنشاء صفحة بث جديدة</CardTitle></CardHeader>
              <CardContent className="flex flex-col md:flex-row gap-4">
                <Input placeholder="عنوان الصفحة" value={pageTitle} onChange={(e) => setPageTitle(e.target.value)} className="bg-[#020617] border-slate-700 h-12" />
                <Input placeholder="الرابط (slug)" value={pageSlug} onChange={(e) => setPageSlug(e.target.value)} className="bg-[#020617] border-slate-700 h-12" />
                <Button onClick={handlePageSubmit} className="bg-indigo-600 hover:bg-indigo-700 h-12 px-10 font-bold">{editingPageId ? 'تحديث' : 'إنشاء صفحة'}</Button>
              </CardContent>
            </Card>

            <div className="space-y-6">
              {customPages.map((page) => (
                <Card key={page.id} className="bg-[#0f172a] border-slate-800 text-white overflow-hidden shadow-xl">
                  <div className="bg-slate-800/30 p-5 flex justify-between items-center border-b border-slate-800">
                    <div>
                      <h3 className="font-black text-xl text-indigo-400">{page.title}</h3>
                      <div className="flex items-center gap-2 text-xs text-slate-500 mt-1">
                        <LinkIcon size={12} /> <span>/live/{page.slug}</span>
                        <button onClick={() => window.open(`/live/${page.slug}`, '_blank')} className="text-indigo-400 hover:underline flex items-center gap-1 mr-3">
                          فتح المعاينة <ExternalLink size={10} />
                        </button>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => {setPageTitle(page.title); setPageSlug(page.slug); setEditingPageId(page.id);}} className="p-2 text-slate-400 hover:text-white"><Edit2 size={20}/></button>
                      <button onClick={() => savePages(customPages.filter(p => p.id !== page.id))} className="p-2 text-red-500/70 hover:text-red-500"><Trash2 size={20}/></button>
                    </div>
                  </div>
                  <CardContent className="p-5 space-y-4">
                    <div className="flex gap-2 bg-black/20 p-4 rounded-xl border border-slate-800">
                      <Input placeholder="اسم القناة" value={newName} onChange={(e) => setNewName(e.target.value)} className="bg-[#020617] border-slate-700 h-10 text-sm" />
                      <Input placeholder="الرابط" value={newUrl} onChange={(e) => setNewUrl(e.target.value)} className="bg-[#020617] border-slate-700 h-10 text-sm" />
                      <Button onClick={() => addServerToPage(page.id)} className="bg-indigo-600 h-10 px-4"><Plus size={18} /></Button>
                    </div>
                    <div className="grid gap-2">
                      {page.servers.map((srv, sIdx) => (
                        <div key={sIdx} className="flex items-center justify-between p-3 bg-[#020617] rounded-xl border border-slate-800 text-sm group">
                          <span className="font-bold">{srv.name}</span>
                          <div className="flex items-center gap-1">
                            <button onClick={() => movePageServer(page.id, sIdx, 'up')} disabled={sIdx === 0} className="p-1 text-slate-600 hover:text-white disabled:opacity-10"><ChevronUp size={16}/></button>
                            <button onClick={() => movePageServer(page.id, sIdx, 'down')} disabled={sIdx === page.servers.length - 1} className="p-1 text-slate-600 hover:text-white disabled:opacity-10"><ChevronDown size={16}/></button>
                            <button onClick={() => {
                              const updated = customPages.map(p => {
                                if (p.id === page.id) return { ...p, servers: p.servers.filter((_, idx) => idx !== sIdx) };
                                return p;
                              });
                              savePages(updated);
                            }} className="text-red-500/50 hover:text-red-500 p-1 mr-2"><Trash2 size={16}/></button>
                          </div>
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
          <Button onClick={() => navigate('/real.html')} className="bg-red-600 hover:bg-red-700 text-white px-12 py-7 rounded-2xl font-black text-xl shadow-2xl shadow-red-600/20 transition-transform hover:scale-105">العودة للمشاهدة</Button>
        </div>
      </div>
    </div>
  );

  function addServerToPage(pageId: string) {
    if (!newName || !newUrl) { showError("أدخل بيانات القناة أولاً"); return; }
    const type = newUrl.includes('.m3u8') ? 'm3u8' : 'iframe';
    const updated = customPages.map(p => {
      if (p.id === pageId) return { ...p, servers: [...p.servers, { name: newName, url: newUrl, type }] };
      return p;
    });
    savePages(updated);
    setNewName(""); setNewUrl("");
    showSuccess("تمت إضافة القناة");
  }
};

export default AdminPanel;