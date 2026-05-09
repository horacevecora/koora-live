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

  const tags = [
    "كورة لايف", "بث مباشر", "يلا شوت", "كورة اون لاين", 
    "مباريات اليوم", "بين سبورت", "الاسطورة", "كورة ستار", 
    "يلا كورة", "ماي كورة", "بث مباريات"
  ];

  const pageTitle = "كورة لايف - بث مباشر للمباريات | Koora Live الرسمي";
  const pageDesc = "موقع كورة لايف الرسمي لمتابعة أهم مباريات اليوم بث مباشر بدون تقطيع، تغطية شاملة لجميع الدوريات العالمية والعربية بجودات متعددة تناسب جميع السرعات.";

  return (
    <div className="min-h-screen bg-[#0a0f1a] text-white font-sans relative overflow-x-hidden flex flex-col" dir="rtl">
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
        <div className="absolute top-0 bottom-0 left-1/2 w-px bg-white/5" />
      </div>

      {/* الشريط العلوي */}
      <header className="relative z-10 flex items-center justify-between px-6 py-4 bg-black/40 backdrop-blur-md border-b border-white/5">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => navigate('/matches')}
            className="flex items-center gap-2 bg-white/5 text-white px-5 py-2.5 rounded-xl font-bold text-sm hover:bg-white/10 transition-all border border-white/10"
          >
            <List size={18} />
            <span>جدول المباريات</span>
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

      {/* قسم الهيرو (Hero Section) */}
      <main className="relative z-10 flex flex-col items-center justify-center px-4 py-20 text-center min-h-[80vh]">
        <div className="space-y-1 mb-6">
          <h1 className="text-5xl md:text-8xl font-black text-white tracking-tighter drop-shadow-[0_10px_30px_rgba(0,0,0,0.5)]">
            كورة لايف الرسمي
          </h1>
          <h2 className="text-4xl md:text-7xl font-black text-[#00e676] italic tracking-tighter drop-shadow-[0_10px_20px_rgba(0,230,118,0.2)]">
            أقوى بث مباشر للمباريات
          </h2>
        </div>

        <div className="flex items-center justify-center gap-4 text-slate-200 font-black text-lg md:text-xl mb-8">
          <span>كورة أون لاين</span>
          <span className="w-2 h-2 bg-[#00e676] rounded-full shadow-[0_0_10px_#00e676]" />
          <span>ماتش لايف</span>
          <span className="w-2 h-2 bg-[#00e676] rounded-full shadow-[0_0_10px_#00e676]" />
          <span>بث مباشر بدون تقطيع</span>
        </div>

        <div className="w-full max-w-md space-y-4 mb-12">
          <Button 
            onClick={() => navigate('/real.html')}
            className="w-full bg-[#00e676] hover:bg-[#00c853] text-black font-black py-10 rounded-3xl text-2xl shadow-2xl shadow-emerald-500/30 transition-all hover:scale-105 flex items-center justify-center gap-4"
          >
            <Radio size={32} className="animate-pulse" />
            دخول البث المباشر
          </Button>
        </div>

        <div className="flex flex-wrap justify-center gap-2 max-w-3xl">
          {tags.map((tag, index) => (
            <span key={index} className="px-3 py-1.5 bg-white/5 border border-white/10 rounded-full text-[10px] md:text-xs font-bold text-slate-400">
              #{tag}
            </span>
          ))}
        </div>
      </main>

      {/* قسم الـ SEO الضخم (SEO Content Section) */}
      <section className="relative z-10 bg-black/40 border-t border-white/5 py-20 px-6">
        <div className="max-w-[1200px] mx-auto">
          
          {/* مميزات الموقع */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-20">
            <div className="bg-slate-900/40 p-8 rounded-[2.5rem] border border-white/5 text-right space-y-4">
              <div className="w-14 h-14 bg-[#00e676]/10 rounded-2xl flex items-center justify-center text-[#00e676]">
                <Zap size={30} fill="currentColor" />
              </div>
              <h3 className="text-xl font-black">سرعة فائقة</h3>
              <p className="text-slate-400 text-sm leading-relaxed">نستخدم أحدث تقنيات البث لضمان وصول الصورة إليك بأقل تأخير ممكن وبدون تقطيع نهائياً.</p>
            </div>
            <div className="bg-slate-900/40 p-8 rounded-[2.5rem] border border-white/5 text-right space-y-4">
              <div className="w-14 h-14 bg-[#00e676]/10 rounded-2xl flex items-center justify-center text-[#00e676]">
                <ShieldCheck size={30} fill="currentColor" />
              </div>
              <h3 className="text-xl font-black">حماية وأمان</h3>
              <p className="text-slate-400 text-sm leading-relaxed">موقع كورة لايف آمن تماماً وخالٍ من البرمجيات الضارة، مما يضمن لك مشاهدة ممتعة وآمنة.</p>
            </div>
            <div className="bg-slate-900/40 p-8 rounded-[2.5rem] border border-white/5 text-right space-y-4">
              <div className="w-14 h-14 bg-[#00e676]/10 rounded-2xl flex items-center justify-center text-[#00e676]">
                <Globe size={30} fill="currentColor" />
              </div>
              <h3 className="text-xl font-black">تغطية عالمية</h3>
              <p className="text-slate-400 text-sm leading-relaxed">نغطي كافة الدوريات العالمية والعربية، من الدوري الإنجليزي إلى دوري أبطال أفريقيا وآسيا.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
            
            {/* المحتوى النصي الرئيسي */}
            <div className="lg:col-span-2 space-y-12 text-right">
              <div className="space-y-6">
                <h2 className="text-4xl md:text-5xl font-black text-white leading-tight">
                  لماذا يعتبر <span className="text-[#00e676]">كورة لايف</span> الخيار الأول للمشجعين؟
                </h2>
                <div className="prose prose-invert max-w-none text-slate-400 text-lg leading-loose">
                  <p>
                    يعد موقع <strong>كورة لايف (Koora Live)</strong> الوجهة الأساسية لملايين عشاق كرة القدم في الوطن العربي. نحن لا نقدم مجرد بث مباشر، بل نوفر تجربة متكاملة تشمل نتائج المباريات، جداول الترتيب، وأهم الأخبار الرياضية لحظة بلحظة.
                  </p>
                  <p>
                    من خلال <strong>كورة أون لاين</strong> و <strong>ماتش لايف</strong>، استطعنا بناء منصة قوية تتحمل ضغط الزوار الهائل أثناء مباريات القمة مثل الكلاسيكو أو نهائيات دوري أبطال أوروبا. سيرفراتنا موزعة عالمياً لضمان استقرار البث في كافة الدول العربية.
                  </p>
                </div>
              </div>

              {/* الأسئلة الشائعة بتنسيق كبير */}
              <div className="space-y-8">
                <h3 className="text-3xl font-black flex items-center gap-3">
                  <HelpCircle className="text-[#00e676]" size={32} />
                  الأسئلة الشائعة
                </h3>
                <div className="grid grid-cols-1 gap-6">
                  <div className="bg-white/5 p-8 rounded-3xl border border-white/10 hover:border-[#00e676]/30 transition-colors">
                    <h4 className="text-xl font-bold text-[#00e676] mb-3">هل يمكنني مشاهدة المباريات بجودة HD؟</h4>
                    <p className="text-slate-400 leading-relaxed">نعم، نوفر جودات تبدأ من 144p وتصل إلى 1080p (Full HD). يمكنك تغيير الجودة يدوياً من داخل مشغل الفيديو حسب سرعة الإنترنت لديك.</p>
                  </div>
                  <div className="bg-white/5 p-8 rounded-3xl border border-white/10 hover:border-[#00e676]/30 transition-colors">
                    <h4 className="text-xl font-bold text-[#00e676] mb-3">ماذا أفعل إذا توقف البث فجأة؟</h4>
                    <p className="text-slate-400 leading-relaxed">في حال توقف البث، قم بتحديث الصفحة أو الانتقال إلى سيرفر بديل من القائمة الموجودة أعلى المشغل. نحن نوفر أكثر من 10 سيرفرات لكل مباراة.</p>
                  </div>
                </div>
              </div>
            </div>

            {/* القائمة الجانبية للمباريات */}
            <aside className="space-y-8">
              <div className="bg-indigo-600/10 border border-indigo-500/20 p-8 rounded-[2.5rem] sticky top-24">
                <h3 className="text-2xl font-black mb-6 flex items-center gap-3">
                  <Tv className="text-[#00e676]" size={28} />
                  مباريات جارية
                </h3>
                <div className="space-y-4">
                  {otherPages.length > 0 ? (
                    otherPages.map((page) => (
                      <Link 
                        key={page.id} 
                        to={`/p/${page.slug}`}
                        className="flex items-center justify-between p-4 bg-black/40 rounded-2xl hover:bg-[#00e676] hover:text-black transition-all group"
                      >
                        <span className="font-bold text-sm">{page.name}</span>
                        <ChevronLeft size={18} className="group-hover:translate-x-[-5px] transition-transform" />
                      </Link>
                    ))
                  ) : (
                    <p className="text-slate-500 text-center py-4 font-bold">لا توجد مباريات حالياً</p>
                  )}
                </div>
                <Button 
                  onClick={() => navigate('/matches')}
                  variant="outline" 
                  className="w-full mt-8 border-white/10 hover:bg-white/5 text-xs font-bold py-6 rounded-2xl"
                >
                  عرض الجدول الكامل
                </Button>
              </div>
            </aside>

          </div>
        </div>
      </section>

      {/* التذييل */}
      <footer className="relative z-10 p-12 text-center border-t border-white/5 bg-black">
        <div className="max-w-[1200px] mx-auto space-y-6">
          <div className="flex items-center justify-center gap-2 text-[#00e676] font-black text-3xl italic">
            <span>Koora</span>
            <span className="text-white">Live</span>
          </div>
          <p className="text-slate-500 text-sm font-bold max-w-2xl mx-auto leading-relaxed">
            جميع الحقوق محفوظة لموقع كورة لايف الرسمي © 2026. نحن لا نستضيف أي فيديوهات على سيرفراتنا، بل نقوم بتوفير روابط البث المتاحة علنياً على الإنترنت.
          </p>
          <div className="flex justify-center gap-6 text-[10px] text-slate-600 font-black uppercase tracking-widest">
            <span>Kora Online</span>
            <span>Match Live</span>
            <span>Yalla Shoot</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;