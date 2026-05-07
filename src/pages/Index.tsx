"use client";

import { Button } from "@/components/ui/button";
import { Radio, Tv, Star } from "lucide-react";
import { useNavigate } from "react-router-dom";

const Index = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#0a0f1a] text-white font-sans relative overflow-hidden flex flex-col" dir="rtl">
      {/* خلفية الملعب (تأثير بصري) */}
      <div className="absolute inset-0 opacity-20 pointer-events-none">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-emerald-500/10 via-transparent to-transparent" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] border border-white/5 rounded-full" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] border border-white/5 rounded-full" />
        <div className="absolute top-0 bottom-0 left-1/2 w-px bg-white/5" />
      </div>

      {/* الشريط العلوي */}
      <header className="relative z-10 flex items-center justify-between px-6 py-4 bg-black/40 backdrop-blur-md border-b border-white/5">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => navigate('/real.html')}
            className="flex items-center gap-2 bg-[#00e676] text-black px-5 py-2.5 rounded-xl font-black text-sm hover:bg-[#00c853] transition-all transform active:scale-95 shadow-lg shadow-emerald-500/20"
          >
            <Tv size={18} fill="currentColor" />
            <span>شاهد الآن</span>
          </button>
        </div>

        <div className="flex flex-col items-end">
          <div className="flex items-center gap-1 text-[#00e676] font-black text-2xl italic tracking-tighter leading-none">
            <span>Koora</span>
            <span className="text-white">Live</span>
          </div>
          <span className="text-[10px] text-slate-400 font-bold mt-1">كورة أون لاين | ماتش لايف</span>
        </div>
      </header>

      {/* المحتوى الرئيسي */}
      <main className="relative z-10 flex-grow flex flex-col items-center justify-center px-4 py-12 text-center">
        
        {/* قسم العناوين الكبيرة */}
        <div className="space-y-1 mb-10">
          <h1 className="text-7xl md:text-9xl font-black text-white tracking-tighter drop-shadow-[0_10px_30px_rgba(0,0,0,0.5)]">
            كورة لايف
          </h1>
          <h2 className="text-6xl md:text-8xl font-black text-[#00e676] italic tracking-tighter drop-shadow-[0_10px_20px_rgba(0,230,118,0.2)]">
            Koora Live
          </h2>
        </div>

        {/* العناوين الفرعية */}
        <div className="flex items-center justify-center gap-4 text-slate-200 font-black text-xl md:text-2xl mb-10">
          <span>كورة أون لاين</span>
          <span className="w-2 h-2 bg-[#00e676] rounded-full shadow-[0_0_10px_#00e676]" />
          <span>ماتش لايف</span>
          <span className="w-2 h-2 bg-[#00e676] rounded-full shadow-[0_0_10px_#00e676]" />
          <span>بث مباشر</span>
        </div>

        {/* الوصف */}
        <p className="max-w-2xl text-slate-400 text-sm md:text-lg leading-relaxed mb-14 font-medium">
          <Star className="inline-block text-yellow-400 ml-2 mb-1" size={18} fill="currentColor" />
          مرحباً بك في موقع البث المباشر الأول عربياً — شاهد جميع المباريات أون لاين
          <br className="hidden md:block" />
          بجودة عالية، متابعة فورية للأهداف والإحصائيات والأخبار العاجلة
        </p>

        {/* أزرار الأكشن */}
        <div className="w-full max-w-md">
          <Button 
            onClick={() => navigate('/real.html')}
            className="w-full bg-[#00e676] hover:bg-[#00c853] text-black font-black py-10 rounded-3xl text-2xl shadow-2xl shadow-emerald-500/30 transition-all hover:scale-105 flex items-center justify-center gap-4"
          >
            <Radio size={32} className="animate-pulse" />
            شاهد المباريات المباشرة
          </Button>
        </div>
      </main>

      {/* التذييل */}
      <footer className="relative z-10 p-8 text-center border-t border-white/5 bg-black/20">
        <p className="text-slate-500 text-xs font-bold tracking-widest uppercase">
          © 2026 Koora Live - جميع الحقوق محفوظة لموقع كورة لايف الرسمي
        </p>
      </footer>
    </div>
  );
};

export default Index;