"use client";

import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Trash2, Edit2, ChevronUp, ChevronDown, Plus, Settings, X, Check, RotateCcw, Lock, Layout, ExternalLink } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { showSuccess, showError } from "@/utils/toast";

interface Server {
  name: string;
  url: string;
  type: string;
}

interface Page {
  name: string;
  slug: string;
}

const AdminPanel = () => {
  const navigate = useNavigate();
  
  // نظام الحماية
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [passwordInput, setPasswordInput] = useState("");

  // إدارة الصفحات
  const [pages, setPages] = useState<Page[]>([]);
  const [activePageSlug, setActivePageSlug] = useState("default");
  const [newPageName, setNewPageName] = useState("");
  const [newPageSlug, setNewPageSlug] = useState("");

  // إدارة القنوات
  const [servers, setServers] = useState<Server[]>([]);
  const [newName, setNewName] = useState("");
  const [newUrl, setNewUrl] = useState("");
  const [editingIndex, setEditingIndex] = useState<number | null>(null);

  useEffect(() => {
    const authStatus = sessionStorage.getItem('admin_auth');
    if (authStatus === 'true') setIsAuthenticated(true);

    // تحميل قائمة الصفحات
    const savedPages = localStorage.getItem('app_pages');
    if (savedPages) {
      setPages(JSON.parse(savedPages));
    } else {
      const initialPages = [{ name: "الصفحة الرئيسية", slug: "default" }];
      setPages(initialPages);
      localStorage.setItem('app_pages', JSON.stringify(initialPages));
    }
  }, []);

  // تحميل قنوات الصفحة النشطة
  useEffect(() => {
    const storageKey = `servers_${activePageSlug}`;
    const savedServers = localStorage.getItem(storageKey);
    if (savedServers) {
      setServers(JSON.parse(savedServers));
    } else {
      setServers([]);
    }
    cancelEdit();
  }, [activePageSlug]);

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

  // وظائف الصفحات
  const addPage = () => {
    if (!newPageName || !newPageSlug) return;
    if (pages.find(p => p.slug === newPageSlug)) {
      showError("هذا المعرف (Slug) مستخدم بالفعل");
      return;
    }
    const updated = [...pages, { name: newPageName, slug: newPageSlug }];
    setPages(updated);
    localStorage.setItem('app_pages', JSON.stringify(updated));
    setNewPageName("");
    setNewPageSlug("");
    showSuccess("تم إنشاء الصفحة بنجاح");
  };

  const deletePage = (slug: string) => {
    if (slug === 'default') return;
    const updated = pages.filter(p => p.slug !== slug);
    setPages(updated);
    localStorage.setItem('app_pages', JSON.stringify(updated));
    localStorage.removeItem(`servers_${slug}`);
    if (activePageSlug === slug) setActivePageSlug('default');
    showSuccess("تم حذف الصفحة");
  };

  // وظائف القنوات
  const saveServers = (updated: Server[]) => {
    setServers(updated);
    localStorage.setItem(`servers_${activePageSlug}`, JSON.stringify(updated));
  };

  const handleSubmit = () => {
    if (!newName || !newUrl) return;
    const type = newUrl.includes('.m3u8') ? 'm3u8' : 'iframe';
    
    if (editingIndex !== null) {
      const updated = [...servers];
      updated[editingIndex] = { name: newName, url: newUrl, type };
      saveServers(updated);
      setEditingIndex(null);
      showSuccess("تم تحديث القناة");
    } else {
      const updated = [...servers, { name: newName, url: newUrl, type }];
      saveServers(updated);
      showSuccess("تمت إضافة القناة");
    }
    setNewName("");
    setNewUrl("");
  };

  const startEdit = (index: number) => {
    const server = servers[index];
    setNewName(server.name);
    setNewUrl(server.url);
    setEditingIndex(index);
  };

  const cancelEdit = () => {
    setEditingIndex(null);
    setNewName("");
    setNewUrl("");
  };

  const deleteChannel = (index: number) => {
    const updated = servers.filter((_, i) => i !== index);
    saveServers(updated);
    if (editingIndex === index) cancelEdit();
  };

  const moveChannel = (index: number, direction: 'up' | 'down') => {
    const updated = [...servers];
    const target = direction === 'up' ? index - 1 : index + 1;
    if (target < 0 || target >= updated.length) return;
    [updated[index], updated[target]] = [updated[target], updated[index]];
    saveServers(updated);
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
            <Button onClick={handleLogin} className="w-full bg-indigo-600 hover:bg-indigo-700 font-bold py-6">دخول</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#020617] text-white p-4 md:p-8 font-sans" dir="rtl">
      <div className="max-w-5xl mx-auto space-y-8">
        
        {/* قسم إدارة الصفحات */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="md:col-span-1 bg-[#0f172a]/50 border-slate-800 text-white">
            <CardHeader>
              <CardTitle className="text-md flex items-center gap-2"><Layout size={18} /> الصفحات</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Input placeholder="اسم الصفحة (مثلاً: رياضة)" value={newPageName} onChange={e => setNewPageName(e.target.value)} className="bg-slate-900 border-slate-700 text-xs" />
                <Input placeholder="المعرف (مثلاً: sports)" value={newPageSlug} onChange={e => setNewPageSlug(e.target.value)} className="bg-slate-900 border-slate-700 text-xs" />
                <Button onClick={addPage} className="w-full bg-indigo-600 text-xs h-8"><Plus size={14} className="ml-1" /> إنشاء صفحة</Button>
              </div>
              <div className="border-t border-slate-800 pt-4 space-y-1">
                {pages.map(p => (
                  <div key={p.slug} className={`flex items-center justify-between p-2 rounded-lg text-xs transition-all ${activePageSlug === p.slug ? 'bg-indigo-600' : 'hover:bg-white/5'}`}>
                    <button onClick={() => setActivePageSlug(p.slug)} className="flex-grow text-right font-bold">{p.name}</button>
                    <div className="flex items-center gap-1">
                      <button onClick={() => navigate(p.slug === 'default' ? '/real.html' : `/p/${p.slug}`)} className="p-1 hover:text-emerald-400" title="معاينة"><ExternalLink size={14} /></button>
                      {p.slug !== 'default' && <button onClick={() => deletePage(p.slug)} className="p-1 hover:text-red-400"><Trash2 size={14} /></button>}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* قسم إدارة القنوات للصفحة المختارة */}
          <div className="md:col-span-2 space-y-6">
            <Card className="bg-[#0f172a]/50 border-slate-800 text-white">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-lg">تعديل قنوات: <span className="text-indigo-400">{pages.find(p => p.slug === activePageSlug)?.name}</span></CardTitle>
                {editingIndex !== null && <Button variant="ghost" size="sm" onClick={cancelEdit} className="text-xs"><RotateCcw size={14} className="ml-1" /> إلغاء</Button>}
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-col md:flex-row gap-2">
                  <Input placeholder="اسم القناة" value={newName} onChange={e => setNewName(e.target.value)} className="bg-slate-900 border-slate-700" />
                  <Input placeholder="الرابط" value={newUrl} onChange={e => setNewUrl(e.target.value)} className="bg-slate-900 border-slate-700" />
                  <Button onClick={handleSubmit} className="bg-indigo-600 font-bold">{editingIndex !== null ? 'تحديث' : 'إضافة'}</Button>
                </div>
                <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2">
                  {servers.map((s, i) => (
                    <div key={i} className="flex items-center justify-between p-3 bg-slate-900/80 border border-slate-800 rounded-xl text-sm">
                      <div className="truncate ml-4">
                        <div className="font-bold">{s.name}</div>
                        <div className="text-[10px] text-slate-500 truncate">{s.url}</div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button onClick={() => deleteChannel(i)} className="p-1.5 text-slate-500 hover:text-red-500"><Trash2 size={16} /></button>
                        <button onClick={() => startEdit(i)} className="p-1.5 text-slate-500 hover:text-indigo-400"><Edit2 size={16} /></button>
                        <button onClick={() => moveChannel(i, 'up')} className="p-1.5 text-slate-500 hover:text-white"><ChevronUp size={16} /></button>
                        <button onClick={() => moveChannel(i, 'down')} className="p-1.5 text-slate-500 hover:text-white"><ChevronDown size={16} /></button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        <div className="flex justify-center">
          <Button onClick={() => navigate('/real.html')} className="bg-red-600 hover:bg-red-700 px-10 py-6 rounded-2xl font-bold">إغلاق والعودة للمشاهدة</Button>
        </div>
      </div>
    </div>
  );
};

export default AdminPanel;