"use client";

import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Trash2, Edit2, ChevronUp, ChevronDown, Plus, Settings, X, Check, RotateCcw, Lock, Link as LinkIcon, Copy } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { showSuccess, showError } from "@/utils/toast";

interface Server {
  name: string;
  url: string;
  type: string;
}

const AdminPanel = () => {
  const navigate = useNavigate();
  const [servers, setServers] = useState<Server[]>([]);
  const [newName, setNewName] = useState("");
  const [newUrl, setNewUrl] = useState("");
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [passwordInput, setPasswordInput] = useState("");

  useEffect(() => {
    const authStatus = sessionStorage.getItem('admin_auth');
    if (authStatus === 'true') setIsAuthenticated(true);

    const saved = localStorage.getItem('player_servers');
    if (saved) setServers(JSON.parse(saved));
  }, []);

  const handleLogin = () => {
    if (passwordInput === "simo") {
      setIsAuthenticated(true);
      sessionStorage.setItem('admin_auth', 'true');
      showSuccess("تم تسجيل الدخول بنجاح");
    } else {
      showError("كلمة المرور غير صحيحة");
    }
  };

  const saveServers = (updated: Server[]) => {
    setServers(updated);
    localStorage.setItem('player_servers', JSON.stringify(updated));
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
    setNewName(""); setNewUrl("");
  };

  const copyLiveLink = (name: string) => {
    const slug = name.replace(/\s+/g, '-').toLowerCase();
    const url = `${window.location.origin}/live/${slug}`;
    navigator.clipboard.writeText(url);
    showSuccess("تم نسخ رابط القناة المنفردة");
  };

  const deleteChannel = (index: number) => {
    const updated = servers.filter((_, i) => i !== index);
    saveServers(updated);
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
      <div className="min-h-screen bg-[#020617] flex items-center justify-center p-4" dir="rtl">
        <Card className="w-full max-w-md bg-[#0f172a] border-slate-800 text-white">
          <CardHeader className="text-center">
            <Lock className="mx-auto text-indigo-500 mb-2" size={32} />
            <CardTitle>لوحة التحكم</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input type="password" placeholder="كلمة المرور" value={passwordInput} onChange={(e) => setPasswordInput(e.target.value)} className="bg-slate-900 border-slate-700 text-center" />
            <Button onClick={handleLogin} className="w-full bg-indigo-600">دخول</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#020617] text-white p-4 md:p-8" dir="rtl">
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-black flex items-center gap-2"><Settings /> إدارة القنوات</h1>
          <Button variant="outline" onClick={() => navigate('/real.html')}>العودة للمشغل</Button>
        </div>

        <Card className="bg-[#0f172a] border-slate-800 text-white">
          <CardHeader><CardTitle>{editingIndex !== null ? "تعديل قناة" : "إضافة قناة جديدة"}</CardTitle></CardHeader>
          <CardContent className="flex flex-col md:flex-row gap-4">
            <Input placeholder="اسم القناة" value={newName} onChange={(e) => setNewName(e.target.value)} className="bg-slate-900 border-slate-700" />
            <Input placeholder="الرابط" value={newUrl} onChange={(e) => setNewUrl(e.target.value)} className="bg-slate-900 border-slate-700" />
            <Button onClick={handleSubmit} className="bg-indigo-600">{editingIndex !== null ? "تحديث" : "إضافة"}</Button>
          </CardContent>
        </Card>

        <div className="space-y-3">
          {servers.map((server, index) => (
            <div key={index} className="flex items-center justify-between p-4 bg-slate-900/50 border border-slate-800 rounded-2xl">
              <div>
                <div className="font-bold">{server.name}</div>
                <div className="text-xs text-slate-500 truncate max-w-[200px]">{server.url}</div>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => copyLiveLink(server.name)} className="p-2 text-emerald-500 hover:bg-emerald-500/10 rounded-lg" title="نسخ رابط الصفحة المنفردة">
                  <Copy size={18} />
                </button>
                <button onClick={() => setEditingIndex(index)} className="p-2 text-indigo-400 hover:bg-indigo-400/10 rounded-lg">
                  <Edit2 size={18} />
                </button>
                <button onClick={() => deleteChannel(index)} className="p-2 text-red-500 hover:bg-red-500/10 rounded-lg">
                  <Trash2 size={18} />
                </button>
                <div className="flex flex-col">
                  <button onClick={() => moveChannel(index, 'up')} className="p-1 text-slate-500 hover:text-white"><ChevronUp size={16} /></button>
                  <button onClick={() => moveChannel(index, 'down')} className="p-1 text-slate-500 hover:text-white"><ChevronDown size={16} /></button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AdminPanel;