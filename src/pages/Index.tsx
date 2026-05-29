"use client";

import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Radio, Tv, Star, Hash, List, Info, HelpCircle, ChevronLeft, ShieldCheck, Zap, Globe } from "lucide-react";
import { useNavigate, Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { supabase } from "@/integrations/supabase/client";

interface PageInfo {
  id: string;
  name: string;
  slug: string;
}

const Index = () => {
  const navigate = useNavigate();
  const [otherPages, setOtherPages] = useState<PageInfo[]>([]);

  useEffect(() => {
    const fetchPages = async () => {
      const { data } = await supabase
        .from('pages')
        .select('id, name, slug')
        .neq('slug', 'default')
        .order('created_at', { ascending: false })
        .limit(8);
      if (data) setOtherPages(data);
    };
    fetchPages();
  }, []);

  const tags = ["كورة لايف", "بث مباشر", "مباريات اليوم", "يلا شوت"];
  const pageTitle = "كورة لايف - بث مباشر للمباريات | Koora Live";
  const pageDesc = "موقع كورة لايف لمتابعة أهم مباريات اليوم بث مباشر.";

  return (
    <div className="min-h-screen bg-[#0a0f1a] text-white font-sans relative overflow-x-hidden flex flex-col" dir="rtl">
      <Helmet>
        <title>{pageTitle}</title>
        <meta name="description" content={pageDesc} />
      </Helmet>

      <header className="relative z-10 flex items-center justify-between px-6 py-4 bg-black/40 backdrop-blur-md border-b border-white/5">
        <button onClick={() => navigate('/matches')} className="flex items-center gap-2 bg-white/5 px-5 py-2.5 rounded-xl font-bold text-sm">
          <List size={18} /> جدول المباريات
        </button>
        <Link to="/" className="text-[#00e676] font-black text-2xl">Koora <span className="text-white">Live</span></Link>
      </header>

      <main className="flex-grow flex flex-col items-center justify-center p-6 text-center">
        <h1 className="text-5xl md:text-8xl font-black mb-6">كورة لايف الرسمي</h1>
        <Button onClick={() => navigate('/real.html')} className="bg-[#00e676] text-black font-black py-8 px-12 rounded-3xl text-2xl hover:scale-105">
          <Radio className="mr-3" /> دخول البث المباشر
        </Button>
      </main>
    </div>
  );
};

export default Index;