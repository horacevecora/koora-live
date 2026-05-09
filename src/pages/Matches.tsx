"use client";

import React, { useEffect, useState } from "react";
import { Info, HelpCircle, ChevronLeft, Home, Tv, Hash } from "lucide-react";
import { useNavigate, Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { supabase } from "@/integrations/supabase/client";

interface PageInfo {
  id: string;
  name: string;
  slug: string;
}

const Matches = () => {
  const navigate = useNavigate();
  const [otherPages, setOtherPages] = useState<PageInfo[]>([]);

  useEffect(() => {
    const fetchPages = async () => {
      const { data } = await supabase
        .from('pages')
        .select('id, name, slug')
        .neq('slug', 'default')
        .order('created_at', { ascending: false });
      if (data) setOtherPages(data);
    };
    fetchPages();
  }, []);

  const tags = [
    "كورة لايف", "بث مباشر", "مباريات اليوم", "يلا شوت", 
    "كورة اون لاين", "بين سبورت", "الاسطورة", "كورة ستار"
  ];

  return (
    <div className="min-h-screen bg-[#0a0f1a] text-white font-sans flex flex-col" dir="rtl">
      <Helmet>
        <title>جدول مباريات اليوم - كورة لايف بث مباشر</title>
        <meta name="description" content="تابع جدول أهم مباريات اليوم بث مباشر بدون تقطيع على كورة لايف. تغطية شاملة لجميع الدوريات والبطولات." />
      </Helmet>

      {/* الشريط العلوي */}
      <header className="sticky top-0 z-50 flex items-center justify-between px-6 py-4 bg-black/60 backdrop-blur-xl border-b border-white/5">
        <button onClick={() => navigate('/')} className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors">
          <Home size={20} />
          <span className="font-bold text-sm">الرئيسية</span>
        </button>
        
        <div className="flex items-center gap-1 text-[#00e676] font-black text-xl italic">
          <span>Koora</span>
          <span className="text-white">Live</span>
        </div>

        <button 
          onClick={() => navigate('/real.html')}
          className="bg-[#00e676] text-black px-4 py-2 rounded-lg font-black text-xs hover:bg-[#00c853] transition-all"
        >
          البث الرئيسي
        </button>
      </header>

      <main className="flex-grow max-w-[1200px] mx-auto w-full px-6 py-10">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
          
          {/* قسم المحتوى النصي والأسئلة */}
          <div className="lg:col-span-2 space-y-10">
            <section className="bg-slate-900/40 border border-white/5 p-8 rounded-[2rem] shadow-2xl">
              <h1 className="text-3xl font-black text-white mb-6 flex items-center gap-3">
                <Info className="text-[#00e676]" size={32} />
                تفاصيل البث المباشر
              </h1>
              <div className="prose prose-invert max-w-none text-slate-400 leading-relaxed space-y-4">
                <p>
                  مرحباً بكم في صفحة تغطية <strong>مباريات اليوم</strong> عبر موقع كورة لايف الرسمي. نحن نوفر لكم تجربة مشاهدة فريدة من نوعها تعتمد على أحدث تقنيات البث المباشر لضمان عدم التقطيع حتى مع سرعات الإنترنت الضعيفة.
                </p>
                <p>
                  تغطي سيرفراتنا جميع الدوريات الكبرى مثل الدوري الإنجليزي، الإسباني، الألماني، ودوري أبطال أوروبا، بالإضافة إلى البطولات العربية والقارية. يمكنك التنقل بين الجودات المختلفة (HD, SD, Low) من داخل مشغل الفيديو بكل سهولة.
                </p>
              </div>
            </section>

            <section className="bg-slate-900/40 border border-white/5 p-8 rounded-[2rem] shadow-2xl">
              <h2 className="text-2xl font-black text-white mb-8 flex items-center gap-3">
                <HelpCircle className="text-[#00e676]" size={28} />
                الأسئلة الشائعة
              </h2>
              <div className="space-y-8">
                <div className="group">
                  <h3 className="text-lg font-bold text-[#00e676] mb-3 group-hover:translate-x-[-5px] transition-transform">كيف أشاهد المباراة بدون تقطيع؟</h3>
                  <p className="text-slate-400 text-sm leading-relaxed">
                    للحصول على أفضل تجربة، تأكد من إغلاق التطبيقات التي تستهلك الإنترنت في الخلفية. إذا واجهت تقطيعاً، قم بتغيير السيرفر أو اختر جودة أقل (360p) من إعدادات المشغل.
                  </p>
                </div>
                <div className="h-px bg-white/5" />
                <div className="group">
                  <h3 className="text-lg font-bold text-[#00e676] mb-3 group-hover:translate-x-[-5px] transition-transform">هل الموقع مجاني تماماً؟</h3>
                  <p className="text-slate-400 text-sm leading-relaxed">
                    نعم، موقع كورة لايف يقدم جميع خدمات البث المباشر والنتائج بشكل مجاني تماماً لجميع الزوار، ولا يتطلب الأمر إنشاء حساب أو دفع أي رسوم.
                  </p>
                </div>
                <div className="h-px bg-white/5" />
                <div className="group">
                  <h3 className="text-lg font-bold text-[#00e676] mb-3 group-hover:translate-x-[-5px] transition-transform">هل يدعم الموقع أجهزة التلفاز الذكية؟</h3>
                  <p className="text-slate-400 text-sm leading-relaxed">
                    بالتأكيد، يمكنك فتح الموقع عبر متصفح الشاشة الذكية (Smart TV) والاستمتاع بالمباريات على شاشة كبيرة بجودة عالية.
                  </p>
                </div>
              </div>
            </section>

            {/* الكلمات الدلالية */}
            <div className="flex flex-wrap gap-2">
              {tags.map((tag, i) => (
                <span key={i} className="px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-xs font-bold text-slate-500">
                  #{tag}
                </span>
              ))}
            </div>
          </div>

          {/* قائمة المباريات الجانبية */}
          <aside className="space-y-6">
            <div className="sticky top-24">
              <h2 className="text-2xl font-black text-white mb-6 flex items-center gap-3">
                <div className="w-2 h-8 bg-[#00e676] rounded-full" />
                مباريات أخرى
              </h2>
              <div className="flex flex-col gap-4">
                {otherPages.length > 0 ? (
                  otherPages.map((page) => (
                    <Link 
                      key={page.id} 
                      to={`/p/${page.slug}`}
                      className="bg-slate-900/60 border border-white/5 p-5 rounded-2xl hover:bg-[#00e676]/10 hover:border-[#00e676]/40 transition-all group flex items-center justify-between shadow-lg"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-white/5 rounded-full flex items-center justify-center group-hover:bg-[#00e676]/20 transition-colors">
                          <Tv size={18} className="text-slate-400 group-hover:text-[#00e676]" />
                        </div>
                        <span className="font-bold text-slate-200 group-hover:text-white text-sm">{page.name}</span>
                      </div>
                      <ChevronLeft size={18} className="text-slate-600 group-hover:text-[#00e676] group-hover:translate-x-[-5px] transition-all" />
                    </Link>
                  ))
                ) : (
                  <div className="text-center py-10 bg-slate-900/20 rounded-2xl border border-dashed border-white/5">
                    <p className="text-slate-500 text-sm font-bold">لا توجد مباريات أخرى حالياً</p>
                  </div>
                )}
              </div>
            </div>
          </aside>

        </div>
      </main>

      <footer className="p-10 text-center border-t border-white/5 bg-black/40 mt-10">
        <p className="text-slate-500 text-xs font-bold">© 2026 Koora Live - جميع الحقوق محفوظة</p>
      </footer>
    </div>
  );
};

export default Matches;