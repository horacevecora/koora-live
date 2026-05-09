"use client";

import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Radio, Tv, Star, Hash, Info, HelpCircle, ChevronLeft } from "lucide-react";
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
        .limit(10);
      if (data) setOtherPages(data);
    };
    fetchPages();
  }, []);

  const tags = [
    "كورة لايف", "بث مباشر", "يلا شوت", "كورة اون لاين", 
    "مباريات اليوم", "بين سبورت", "الاسطورة", "كورة ستار", 
    "يلا كورة", "ماي كورة", "بث مباريات"
  ];

  const pageTitle = "كورة لايف - بث مباشر للمباريات | Koora Live الرسمي";
  const pageDesc = "موقع كورة لايف الرسمي لمتابعة أهم مباريات اليوم بث مباشر بدون تقطيع، تغطية شاملة لجميع الدوريات العالمية والعربية بجودات متعددة تناسب جميع السرعات.";

  return (
    <div className="min-h-screen bg-[#0a0f1a] text-white font-sans relative overflow-hidden flex flex-col" dir="rtl">
      <Helmet>
        <title>{pageTitle}</title>
        <meta name="description" content={pageDesc} />
        <meta name="keywords" content="كورة لايف, بث مباشر, مباريات اليوم, يلا شوت, كورة اون لاين, بين سبورت, الاسطورة, كورة ستار, koora live, yalla shoot, live matches" />
        <link rel="canonical" href={`https://${window.location.hostname}/`} />
        <meta property="og:title" content={pageTitle} />
        <meta property="og:description" content={pageDesc} />
        <meta property="og:image" content="/favicon.svg" />
        <meta property="og:type" content="website" />
      </Helmet>

      {/* خلفية الملعب (تأثير بصري) */}
      <div className="absolute inset-0 opacity-20 pointer-events-none">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-emerald-500/10 via-transparent to-transparent" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] border border-white/5 rounded-full" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] border border-white/5 rounded-full" />
        <div className="absolute top-0 bottom-0 left-1/2 w-px bg-white/5" />
      </div>

      {/* الشعار الاحترافي الجديد (ثابت) */}
      <div className="absolute top-24 left-8 md:left-20 z-20 hidden lg:block">
        <div className="relative group cursor-pointer" onClick={() => navigate('/real.html')}>
          <div className="absolute inset-0 bg-[#00e676] blur-[60px] opacity-20 rounded-full" />
          <img 
            src="/favicon.svg" 
            alt="Koora Live Pro Logo" 
            className="w-48 h-48 md:w-56 md:h-56 drop-shadow-[0_20px_40px_rgba(0,0,0,0.6)] relative z-10 transition-transform duration-300 hover:scale-105"
          />
        </div>
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
      <main className="relative z-10 flex-grow flex flex-col items-center px-4 py-12 text-center">
        
        {/* قسم العناوين الكبيرة */}
        <div className="space-y-1 mb-6">
          <h1 className="text-5xl md:text-8xl font-black text-white tracking-tighter drop-shadow-[0_10px_30px_rgba(0,0,0,0.5)]">
            كورة لايف الرسمي
          </h1>
          <h2 className="text-4xl md:text-7xl font-black text-[#00e676] italic tracking-tighter drop-shadow-[0_10px_20px_rgba(0,230,118,0.2)]">
            أقوى بث مباشر للمباريات
          </h2>
        </div>

        {/* العناوين الفرعية */}
        <div className="flex items-center justify-center gap-4 text-slate-200 font-black text-lg md:text-xl mb-8">
          <span>كورة أون لاين</span>
          <span className="w-2 h-2 bg-[#00e676] rounded-full shadow-[0_0_10px_#00e676]" />
          <span>ماتش لايف</span>
          <span className="w-2 h-2 bg-[#00e676] rounded-full shadow-[0_0_10px_#00e676]" />
          <span>بث مباشر بدون تقطيع</span>
        </div>

        {/* قسم الكلمات الدلالية (Tags) */}
        <div className="flex flex-wrap justify-center gap-2 max-w-3xl mb-10">
          {tags.map((tag, index) => (
            <span 
              key={index} 
              className="px-3 py-1.5 bg-white/5 border border-white/10 rounded-full text-[10px] md:text-xs font-bold text-slate-400 hover:text-[#00e676] hover:border-[#00e676]/50 transition-colors cursor-default flex items-center gap-1"
            >
              <Hash size={10} className="text-[#00e676]/50" />
              {tag}
            </span>
          ))}
        </div>

        {/* أزرار الأكشن */}
        <div className="w-full max-w-md mb-16">
          <Button 
            onClick={() => navigate('/real.html')}
            className="w-full bg-[#00e676] hover:bg-[#00c853] text-black font-black py-10 rounded-3xl text-2xl shadow-2xl shadow-emerald-500/30 transition-all hover:scale-105 flex items-center justify-center gap-4"
          >
            <Radio size={32} className="animate-pulse" />
            دخول البث المباشر
          </Button>
        </div>

        {/* قسم المحتوى النصي الغني (SEO Content) - تم نقله هنا */}
        <section className="w-full max-w-[1200px] mt-10 grid grid-cols-1 md:grid-cols-3 gap-8 text-right" dir="rtl">
          <div className="md:col-span-2 space-y-8">
            <div className="bg-slate-900/40 border border-white/5 p-6 rounded-3xl">
              <h3 className="text-2xl font-black text-white mb-4 flex items-center gap-2">
                <Info className="text-[#00e676]" size={24} />
                تفاصيل البث المباشر: الصفحة الرئيسية
              </h3>
              <p className="text-slate-400 leading-relaxed text-sm md:text-base">
                مرحباً بكم في موقع كورة لايف الرسمي. نقدم لكم اليوم تغطية حصرية ومباشرة لـ <strong>أهم مباريات اليوم</strong>. 
                يمكنكم متابعة المباريات بجودة عالية وبدون تقطيع عبر سيرفراتنا المتطورة. 
                نحن في كورة لايف نحرص على توفير أفضل تجربة مشاهدة للمشجع العربي، مع توفير جودات متعددة تناسب باقات الإنترنت المختلفة.
              </p>
            </div>

            <div className="bg-slate-900/40 border border-white/5 p-6 rounded-3xl">
              <h3 className="text-xl font-black text-white mb-6 flex items-center gap-2">
                <HelpCircle className="text-[#00e676]" size={24} />
                الأسئلة الشائعة حول البث
              </h3>
              <div className="space-y-6">
                <div className="border-b border-white/5 pb-4">
                  <h4 className="font-bold text-[#00e676] mb-2">كيف أشاهد المباراة بدون تقطيع؟</h4>
                  <p className="text-slate-400 text-sm">اختر السيرفر المناسب لسرعة إنترنتك، إذا كان الإنترنت ضعيفاً ننصح باختيار جودة 360p أو 480p من إعدادات المشغل.</p>
                </div>
                <div className="border-b border-white/5 pb-4">
                  <h4 className="font-bold text-[#00e676] mb-2">هل يدعم الموقع المشاهدة عبر الجوال؟</h4>
                  <p className="text-slate-400 text-sm">نعم، موقع كورة لايف مصمم ليعمل بكفاءة عالية على جميع أجهزة الأندرويد والآيفون، كما يمكنك تثبيت الموقع كتطبيق PWA.</p>
                </div>
              </div>
            </div>
          </div>

          <aside className="space-y-6">
            <h3 className="text-xl font-black text-white flex items-center gap-2">
              <div className="w-2 h-8 bg-[#00e676] rounded-full" />
              مباريات أخرى
            </h3>
            <div className="flex flex-col gap-3">
              {otherPages.length > 0 ? (
                otherPages.map((page) => (
                  <Link 
                    key={page.id} 
                    to={`/p/${page.slug}`}
                    className="bg-slate-900/50 border border-white/5 p-4 rounded-2xl hover:bg-[#00e676]/20 hover:border-[#00e676]/50 transition-all group flex items-center justify-between"
                  >
                    <span className="font-bold text-slate-200 group-hover:text-white text-sm">{page.name}</span>
                    <ChevronLeft size={16} className="text-slate-500 group-hover:text-[#00e676] group-hover:translate-x-[-4px] transition-all" />
                  </Link>
                ))
              ) : (
                <p className="text-slate-500 text-xs">لا توجد مباريات أخرى حالياً</p>
              )}
            </div>
          </aside>
        </section>
      </main>

      {/* التذييل */}
      <footer className="relative z-10 p-8 text-center border-t border-white/5 bg-black/20">
        <div className="max-w-[1200px] mx-auto flex flex-col items-center gap-4">
          <div className="flex justify-between w-full items-center opacity-40 text-[11px]">
            <span dir="ltr" className="font-black tracking-tight">Koora Live - Kora Online</span>
            <span dir="rtl" className="font-black">كورة لايف - ماتش لايف</span>
          </div>
          <p className="text-slate-500 text-xs font-bold tracking-widest uppercase">
            © 2026 Koora Live - جميع الحقوق محفوظة لموقع كورة لايف الرسمي
          </p>
          <p className="text-slate-600 text-[10px] max-w-2xl leading-relaxed">
            موقع كورة لايف الرسمي يقدم لكم بث مباشر للمباريات بجودة عالية وبدون تقطيع. تابع أهم مباريات اليوم في جميع الدوريات العالمية والعربية عبر سيرفراتنا المتعددة.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Index;