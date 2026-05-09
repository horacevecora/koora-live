"use client";

import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Trash2, Edit2, ChevronUp, ChevronDown, Plus, Settings, X, Check, RotateCcw, Lock } from "lucide-react";
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
  
  // نظام الحماية
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [passwordInput, setPasswordInput] = useState("");

  useEffect(() => {
    // التحقق مما إذا كان المستخدم قد سجل دخوله مسبقاً في هذه الجلسة
    const authStatus = sessionStorage.getItem('admin_auth');
    if (authStatus === 'true') {
      setIsAuthenticated(true);
    }

    const saved = localStorage.getItem('player_servers');
    if (saved) {
      setServers(JSON.parse(saved));
    } else {
      const defaultServers = [{"name":"سيرفر 1","url":"https://8.wwwkora.com/albaplayer/bein-sports-hd-1/?serv=1","type":"iframe"}];
      setServers(defaultServers);
      localStorage.setItem('player_servers', JSON.stringify(defaultServers));
    }
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

  const handleSubmit = () => {
    if (!newName || !newUrl) return;
    const type = newUrl.includes('.m3u8') ? 'm3u8' : 'iframe';
    
    if (editingIndex !== null) {
      const updated = [...servers];
      updated[editingIndex] = { name: newName, url: newUrl, type };
      saveServers(updated);
      setEditingIndex(null);
      showSuccess("تم تحديث القناة بنجاح");
    } else {
      const updated = [...servers, { name: newName, url: newUrl, type }];
      saveServers(updated);
      showSuccess("تمت إضافة القناة بنجاح");
    }
    
    setNewName("");
    setNewUrl("");
  };

  const startEdit = (index: number) => {
    const server = servers[index];
    setNewName(server.name);
    setNewUrl(server.url);
    setEditingIndex(index);
    window.scrollTo({ top: 0, behavior: 'smooth' });
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
    if (editingIndex === index) setEditingIndex(target);
    else if (editingIndex === target) setEditingIndex(index);
  };

  // واجهة تسجيل الدخول
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#020617] flex items-center justify-center p-4 font-sans" dir="rtl">
        <Card className="w-full max-w-md bg-[#0f172a] border-slate-800 text-white shadow-2xl">
          <CardHeader className="text-center space-y-2">
            <div className="mx-auto w-12 h-12 bg-indigo-600/20 rounded-full flex items-center justify-center mb-2">
              <Lock className="text-indigo-500" size={24} />
            </div>
            <CardTitle className="text-2xl font-black">منطقة محظورة</CardTitle>
            <p className="text-slate-400 text-sm">يرجى إدخال كلمة المرور للوصول للوحة التحكم</p>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input 
              type="password"
              placeholder="كلمة المرور" 
              value={passwordInput}
              onChange={(e) => setPasswordInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
              className="bg-slate-900 border-slate-700 text-white text-center text-lg tracking-widest focus:ring-indigo-500"
              autoFocus
            />
            <Button 
              onClick={handleLogin}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-6 rounded-xl"
            >
              دخول
            </Button>
            <Button 
              variant="ghost"
              onClick={() => navigate('/real.html')}
              className="w-full text-slate-500 hover:text-white"
            >
              العودة للمشاهدة
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // واجهة لوحة التحكم (تظهر فقط بعد تسجيل الدخول)
  return (
    <div className="min-h-screen bg-[#020617] text-white p-4 md:p-8 font-sans" dir="rtl">
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2 bg-slate-900 p-2 rounded-lg border border-slate-800">
             <span className="text-slate-400 text-sm px-2">لوحة التحكم</span>
             <div className="bg-orange-500 p-1.5 rounded-md">
               <Settings size={18} className="text-white" />
             </div>
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => { sessionStorage.removeItem('admin_auth'); setIsAuthenticated(false); }}
            className="border-slate-800 text-slate-400 hover:bg-red-900/20 hover:text-red-500"
          >
            تسجيل الخروج
          </Button>
        </div>

        <Card className={`bg-[#0f172a]/50 border-slate-800 text-white transition-all duration-500 ${editingIndex !== null ? 'ring-2 ring-indigo-500 shadow-lg shadow-indigo-500/20' : ''}`}>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              {editingIndex !== null ? (
                <>تعديل القناة <Edit2 size={18} className="text-indigo-400" /></>
              ) : (
                <>إضافة قناة <Plus size={18} className="text-emerald-500" /></>
              )}
            </CardTitle>
            {editingIndex !== null && (
              <Button variant="ghost" size="sm" onClick={cancelEdit} className="text-slate-400 hover:text-white">
                <RotateCcw size={16} className="ml-2" /> إلغاء التعديل
              </Button>
            )}
          </CardHeader>
          <CardContent className="flex flex-col md:flex-row gap-4">
            <Input 
              placeholder="اسم القناة" 
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="bg-slate-900 border-slate-700 text-white focus:ring-indigo-500"
            />
            <Input 
              placeholder="رابط الـ iframe أو m3u8 أو ts" 
              value={newUrl}
              onChange={(e) => setNewUrl(e.target.value)}
              className="bg-slate-900 border-slate-700 text-white focus:ring-indigo-500"
            />
            <Button 
              onClick={handleSubmit} 
              className={`${editingIndex !== null ? 'bg-indigo-600 hover:bg-indigo-700' : 'bg-emerald-600 hover:bg-emerald-700'} text-white min-w-[120px] font-bold`}
            >
              {editingIndex !== null ? <><Check size={18} className="ml-2" /> تحديث</> : <><Plus size={18} className="ml-2" /> إضافة</>}
            </Button>
          </CardContent>
        </Card>

        <Card className="bg-[#0f172a]/50 border-slate-800 text-white">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              القنوات ({servers.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {servers.map((server, index) => (
              <div 
                key={index} 
                className={`flex items-center justify-between p-4 rounded-xl border transition-all ${editingIndex === index ? 'bg-indigo-900/20 border-indigo-500/50' : 'bg-slate-900/80 border-slate-800'}`}
              >
                <div className="flex items-center gap-4">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm ${editingIndex === index ? 'bg-indigo-600 text-white' : 'bg-red-900/30 text-red-500'}`}>
                    {index + 1}
                  </div>
                  <div className="overflow-hidden">
                    <div className="font-bold truncate">{server.name}</div>
                    <div className="text-xs text-slate-500 truncate max-w-[150px] md:max-w-md">{server.url}</div>
                  </div>
                </div>
                <div className="flex items-center gap-1 md:gap-2 shrink-0">
                  <button onClick={() => deleteChannel(index)} className="p-2 text-slate-500 hover:text-red-500 transition-colors" title="حذف">
                    <Trash2 size={18} />
                  </button>
                  <button onClick={() => startEdit(index)} className={`p-2 transition-colors ${editingIndex === index ? 'text-indigo-400' : 'text-slate-500 hover:text-indigo-400'}`} title="تعديل">
                    <Edit2 size={18} />
                  </button>
                  <button onClick={() => moveChannel(index, 'down')} className="p-2 text-slate-500 hover:text-white transition-colors" title="تحريك لأسفل">
                    <ChevronDown size={18} />
                  </button>
                  <button onClick={() => moveChannel(index, 'up')} className="p-2 text-slate-500 hover:text-white transition-colors" title="تحريك لأعلى">
                    <ChevronUp size={18} />
                  </button>
                </div>
              </div>
            ))}
            {servers.length === 0 && (
              <div className="text-center py-10 text-slate-500 italic">لا توجد قنوات مضافة حالياً</div>
            )}
          </CardContent>
        </Card>

        <div className="flex justify-center pt-10">
          <Button 
            onClick={() => navigate('/real.html')}
            className="bg-red-600 hover:bg-red-700 text-white px-10 py-6 rounded-2xl text-lg font-bold flex items-center gap-2 shadow-xl shadow-red-900/20"
          >
            <X size={20} />
            إغلاق التحكم والعودة للمشاهدة
          </Button>
        </div>
      </div>
    </div>
  );
};

export default AdminPanel;