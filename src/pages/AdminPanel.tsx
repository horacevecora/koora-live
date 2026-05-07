"use client";

import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Trash2, Edit2, ChevronUp, ChevronDown, Plus, Settings, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { showSuccess } from "@/utils/toast";

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

  useEffect(() => {
    const saved = localStorage.getItem('player_servers');
    if (saved) {
      setServers(JSON.parse(saved));
    } else {
      const defaultServers = [{"name":"سيرفر 1","url":"https://8.wwwkora.com/albaplayer/bein-sports-hd-1/?serv=1","type":"iframe"}];
      setServers(defaultServers);
      localStorage.setItem('player_servers', JSON.stringify(defaultServers));
    }
  }, []);

  const saveServers = (updated: Server[]) => {
    setServers(updated);
    localStorage.setItem('player_servers', JSON.stringify(updated));
  };

  const addChannel = () => {
    if (!newName || !newUrl) return;
    const type = newUrl.includes('.m3u8') ? 'm3u8' : 'iframe';
    const updated = [...servers, { name: newName, url: newUrl, type }];
    saveServers(updated);
    setNewName("");
    setNewUrl("");
    showSuccess("تمت إضافة القناة بنجاح");
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
        </div>

        <Card className="bg-[#0f172a]/50 border-slate-800 text-white">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              إضافة قناة <Plus size={18} className="text-emerald-500" />
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col md:flex-row gap-4">
            <Input 
              placeholder="اسم القناة" 
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="bg-slate-900 border-slate-700 text-white"
            />
            <Input 
              placeholder="رابط الـ iframe أو m3u8" 
              value={newUrl}
              onChange={(e) => setNewUrl(e.target.value)}
              className="bg-slate-900 border-slate-700 text-white"
            />
            <Button onClick={addChannel} className="bg-emerald-600 hover:bg-emerald-700 text-white min-w-[100px]">
              + إضافة
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
              <div key={index} className="flex items-center justify-between bg-slate-900/80 p-4 rounded-xl border border-slate-800 group">
                <div className="flex items-center gap-4">
                  <div className="bg-red-900/30 text-red-500 w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm">
                    {index + 1}
                  </div>
                  <div>
                    <div className="font-bold">{server.name}</div>
                    <div className="text-xs text-slate-500 truncate max-w-[200px] md:max-w-md">{server.url}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => deleteChannel(index)} className="p-2 text-slate-500 hover:text-red-500 transition-colors">
                    <Trash2 size={18} />
                  </button>
                  <button className="p-2 text-slate-500 hover:text-indigo-400 transition-colors">
                    <Edit2 size={18} />
                  </button>
                  <button onClick={() => moveChannel(index, 'down')} className="p-2 text-slate-500 hover:text-white transition-colors">
                    <ChevronDown size={18} />
                  </button>
                  <button onClick={() => moveChannel(index, 'up')} className="p-2 text-slate-500 hover:text-white transition-colors">
                    <ChevronUp size={18} />
                  </button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <div className="flex justify-center pt-10">
          <Button 
            onClick={() => navigate('/real.html')}
            className="bg-red-600 hover:bg-red-700 text-white px-10 py-6 rounded-2xl text-lg font-bold flex items-center gap-2"
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