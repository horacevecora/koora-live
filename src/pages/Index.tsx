"use client";

import { MadeWithDyad } from "@/components/made-with-dyad";
import { Button } from "@/components/ui/button";
import { Play } from "lucide-react";
import { useNavigate } from "react-router-dom";

const Index = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-950 text-white p-4">
      <div className="text-center max-w-2xl">
        <h1 className="text-5xl font-bold mb-6 bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
          KARIM PLAYER PRO
        </h1>
        <p className="text-xl text-slate-400 mb-10">
          مرحباً بك في تطبيق البث المباشر. اضغط على الزر أدناه لفتح مشغل الفيديو.
        </p>
        
        <Button 
          onClick={() => navigate('/player')}
          size="lg"
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-6 rounded-full text-xl font-bold transition-all transform hover:scale-105 flex items-center gap-3"
        >
          <Play fill="currentColor" />
          فتح المشغل الآن
        </Button>
      </div>
      
      <div className="mt-20 grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-4xl">
        <div className="bg-slate-900/50 p-6 rounded-2xl border border-slate-800">
          <h3 className="font-bold text-indigo-400 mb-2">جودة عالية</h3>
          <p className="text-sm text-slate-400">دعم كامل للبث بجودة HD وتقنيات HLS المتطورة.</p>
        </div>
        <div className="bg-slate-900/50 p-6 rounded-2xl border border-slate-800">
          <h3 className="font-bold text-indigo-400 mb-2">سيرفرات متعددة</h3>
          <p className="text-sm text-slate-400">إمكانية التنقل بين السيرفرات بسهولة لضمان استقرار البث.</p>
        </div>
        <div className="bg-slate-900/50 p-6 rounded-2xl border border-slate-800">
          <h3 className="font-bold text-indigo-400 mb-2">واجهة عربية</h3>
          <p className="text-sm text-slate-400">تصميم متجاوب يدعم اللغة العربية والاتجاه من اليمين لليسار.</p>
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0">
        <MadeWithDyad />
      </div>
    </div>
  );
};

export default Index;