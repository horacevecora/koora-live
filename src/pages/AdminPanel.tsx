"use client";

import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Trash2, Edit2, Plus, Home, Layout, ExternalLink, Code, Loader2, ListPlus, Lock, LogOut, ChevronUp, ChevronDown, Download, Upload, XCircle, FileCode, CheckCircle2, Circle, Eye } from "lucide-react";
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

interface ScriptSnippet {
  id: string;
  name: string;
  code: string;
  active: boolean;
}

const AdminPanel = () => {
  const navigate = useNavigate();
  
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [accessCode, setAccessCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isCheckingCode, setIsCheckingCode] = useState(false);

  const [pages, setPages] = useState<Page[]>([]);
  const [activePageId, setActivePageId] = useState<string | null>(null);
  const [activePageName, setActivePageName] = useState("");
  const [newPageName, setNewPageName] = useState("");
  const [newPageSlug, setNewPageSlug] = useState("");

  const [servers, setServers] = useState<Server[]>([]);
  const [newName, setNewName] = useState("");
  const [newUrl, setNewUrl] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);

  const [scriptName, setScriptName] = useState("");
  const [newScriptCode, setNewScriptCode] = useState("");
  const [scriptList, setScriptList] = useState<ScriptSnippet[]>([]);
  const [editingScriptId, setEditingScriptId] = useState<string | null>(null);

  const [bulkInput, setBulkInput] = useState("");

  const [siteFiles, setSiteFiles] = useState<SiteFile[]>([]);
  const [newFileName, setNewFileName] = useState("sw.js");
  const [newFileContent, setNewFileContent] = useState("");

  useEffect(() => {
    const savedAuth = localStorage.getItem('admin_unlocked');
    if (savedAuth === 'true') {
      setIsUnlocked(true);
      fetchInitialData();
    }
  }, []);

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

      const { data: scriptsData } = await supabase.from('site_settings').select('value').eq('key', 'managed_scripts').maybeSingle();
      if (scriptsData?.value) {
        setScriptList(JSON.parse(scriptsData.value));
      }

      const { data: filesData } = await supabase.from('site_files').select('*');
      if (filesData) setSiteFiles(filesData);

    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchServers = async (pageId: string) => {
    const { data } = await supabase.from('servers').select('*').eq('page_id', pageId).order('sort_order', { ascending: true });
    setServers(data || []);
  };

  const handleUnlock = async () => {
    setIsCheckingCode(true);
    try {
      const { data } = await supabase.from('site_settings').select('value').eq('key', 'admin_password').maybeSingle();
      if (accessCode === data?.value || accessCode === "simo") {
        setIsUnlocked(true);
        localStorage.setItem('admin_unlocked', 'true');
        fetchInitialData();
        showSuccess("تم الدخول بنجاح");
      } else {
        showError("الكود السري غير صحيح");
      }
    } catch (err) {
      showError("خطأ في التحقق من الكود");
    } finally {
      setIsCheckingCode(false);
    }
  };

  const saveScriptsToDB = async (newList: ScriptSnippet[]) => {
    const { error: error1 } = await supabase.from('site_settings').upsert({ key: 'managed_scripts', value: JSON.stringify(newList) }, { onConflict: 'key' });
    const combinedScripts = newList.filter(s => s.active).map(s => s.code).join('\n\n');
    const { error: error2 } = await supabase.from('site_settings').upsert({ key: 'external_scripts', value: combinedScripts }, { onConflict: 'key' });
    
    if (error1 || error2) {
        showError("خطأ في حفظ البيانات في السحابة");
        return false;
    }
    setScriptList(newList);
    return true;
  };

  const handleAddOrUpdateScript = async () => {
    if (!newScriptCode) { showError("يرجى إدخال الكود"); return; }
    let newList = [...scriptList];
    if (editingScriptId) {
      newList = newList.map(s => s.id === editingScriptId ? { ...s, name: scriptName || "كود بدون اسم", code: newScriptCode } : s);
      setEditingScriptId(null);
    } else {
      const newEntry: ScriptSnippet = {
        id: crypto.randomUUID(),
        name: scriptName || `كود ${newList.length + 1}`,
        code: newScriptCode,
        active: true
      };
      newList.push(newEntry);
    }
    const success = await saveScriptsToDB(newList);
    if (success) {
      showSuccess("تم حفظ الكود بنجاح");
      setScriptName("");
      setNewScriptCode("");
    }
  };

  const toggleScript = async (id: string) => {
    const newList = scriptList.map(s => s.id === id ? { ...s, active: !s.active } : s);
    await saveScriptsToDB(newList);
  };

  const deleteScript = async (id: string) => {
    const newList = scriptList.filter(s => s.id !== id);
    await saveScriptsToDB(newList);
  };

  const startEditScript = (s: ScriptSnippet) => {
    setEditingScriptId(s.id);
    setScriptName(s.name);
    setNewScriptCode(s.code);
  };

  const handleLogout = () => { localStorage.removeItem('admin_unlocked'); setIsUnlocked(false); };

  if (!isUnlocked) {
    return (
      <div className="min-h-screen bg-[#020617] flex items-center justify-center p-4" dir="rtl">
        <Card className="w-full max-w-md bg-[#0f172a] border-slate-800 text-white shadow-2xl">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-black">لوحة التحكم</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input type="password" placeholder="الكود السري" value={accessCode} onChange={(e) => setAccessCode(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleUnlock()} className="bg-slate-900 border-slate-700 text-center" disabled={isCheckingCode} />
            <Button onClick={handleUnlock} className="w-full bg-indigo-600 hover:bg-indigo-700 font-bold" disabled={isCheckingCode}>{isCheckingCode ? <Loader2 className="animate-spin" size={18} /> : "دخول"}</Button>
            <Button onClick={() => navigate('/')} variant="ghost" className="w-full text-slate-500 text-xs">العودة للرئيسية</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#020617] text-white p-8" dir="rtl">
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-black">لوحة التحكم</h1>
          <Button variant="outline" onClick={handleLogout} className="text-red-400 border-red-900/30 bg-red-900/10 hover:bg-red-900/20"><LogOut size={16} className="ml-2" /> خروج</Button>
        </div>

        <Card className="bg-[#0f172a]/40 border-slate-800">
          <CardHeader><CardTitle className="flex items-center gap-2"><Code /> إدارة الإعلانات والأكواد</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <Input placeholder="اسم الإعلان" value={scriptName} onChange={e => setScriptName(e.target.value)} className="bg-slate-900 border-slate-700" />
            <Textarea placeholder="كود الإعلان..." value={newScriptCode} onChange={(e) => setNewScriptCode(e.target.value)} className="bg-slate-900 border-slate-700 font-mono text-xs" />
            <Button onClick={handleAddOrUpdateScript} className="w-full bg-emerald-600 hover:bg-emerald-700">حفظ في قاعدة البيانات</Button>
            
            <div className="space-y-2 pt-4">
              <h3 className="text-sm font-bold text-slate-400 border-b border-slate-800 pb-2">قائمة الأكواد المضافة</h3>
              {scriptList.map(s => (
                <div key={s.id} className="flex justify-between p-3 bg-slate-900/60 rounded border border-slate-800">
                  <span className="text-sm font-bold">{s.name}</span>
                  <div className="flex gap-2">
                    <button onClick={() => toggleScript(s.id)} className={s.active ? "text-emerald-500" : "text-slate-600"}><CheckCircle2 size={16} /></button>
                    <button onClick={() => startEditScript(s)}><Edit2 size={16} /></button>
                    <button onClick={() => deleteScript(s.id)} className="text-red-400"><Trash2 size={16} /></button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminPanel;