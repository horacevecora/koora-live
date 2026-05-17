"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
// @ts-ignore
import Plyr from "plyr";
import Hls from "hls.js";
// @ts-ignore
import mpegts from "mpegts.js";
import "plyr/dist/plyr.css";
import { cn } from "@/lib/utils";
import { Settings, Maximize, Volume2, RefreshCw, AlertTriangle, Loader2, Home, ShieldAlert, Zap } from "lucide-react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { supabase } from "@/integrations/supabase/client";

type ServerType = "iframe" | "m3u8" | "ts" | "youtube" | "facebook" | "twitch" | "kick" | "raw";

interface Server {
  id?: string;
  name: string;
  url: string;
  type: ServerType;
}

interface PageInfo {
  id: string;
  name: string;
  slug: string;
}

export default function RealPlayer() {
  const navigate = useNavigate();
  const { slug } = useParams();
  const location = useLocation();
  
  const pageSlug = slug || (location.pathname === '/real.html' ? 'default' : 'unknown');

  const containerRef = useRef<HTMLDivElement>(null);
  const plyrRef = useRef<Plyr | null>(null);
  const hlsRef = useRef<Hls | null>(null);
  const mpegtsRef = useRef<any>(null);
  const monitorInterval = useRef<NodeJS.Timeout | null>(null);
  const lastTime = useRef<number>(0);

  const [servers, setServers] = useState<Server[]>([]);
  const [pageInfo, setPageInfo] = useState<PageInfo | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [clickCount, setClickCount] = useState(0);
  const [showUnmuteHint, setShowUnmuteHint] = useState(false);
  const [hasInteracted, setHasInteracted] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isMixedContent, setIsMixedContent] = useState(false);
  const [isNativeMode, setIsNativeMode] = useState(false);

  const tags = [
    "كورة لايف", "بث مباشر", "يلا شوت", "كورة اون لاين", 
    "مباريات اليوم", "بين سبورت", "الاسطورة", "كورة ستار", 
    "يلا كورة", "ماي كورة", "بث مباريات"
  ];

  useEffect(() => {
    return () => {
      destroy();
    };
  }, []);

  const destroy = useCallback(() => {
    if (monitorInterval.current) {
      clearInterval(monitorInterval.current);
      monitorInterval.current = null;
    }
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }
    if (mpegtsRef.current) {
      mpegtsRef.current.destroy();
      mpegtsRef.current = null;
    }
    if (plyrRef.current) {
      plyrRef.current.destroy();
      plyrRef.current = null;
    }
  }, []);

  const buildPlayer = useCallback(
    (server: Server, forceNative = false, shouldUnmute = hasInteracted) => {
      const container = containerRef.current;
      if (!container) return;

      container.innerHTML = "";
      destroy();
      setError(null);
      setShowUnmuteHint(false);
      setLoading(true);
      
      let rawUrl = server.url.trim();
      const isHttps = window.location.protocol === 'https:';
      const isUrlHttp = rawUrl.startsWith('http:');

      // تحديد نوع الرابط
      const isM3U8 = rawUrl.includes(".m3u8") || server.type === "m3u8";
      const isRawStream = (
        rawUrl.includes("stream") || 
        rawUrl.includes("type=http") || 
        rawUrl.includes(".ts") || 
        rawUrl.includes("extension=ts") ||
        rawUrl.includes("live.php") ||
        server.type === "ts"
      );

      // تطبيق البروكسي استباقياً لروابط الـ HTTP على مواقع الـ HTTPS لروابط البث
      let finalUrl = rawUrl;
      if (isHttps && isUrlHttp && (isM3U8 || isRawStream)) {
        finalUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(rawUrl)}`;
        console.log("[Player] Applied Proxy:", finalUrl);
      }

      if (isM3U8) {
        const video = document.createElement("video");
        video.playsInline = true; video.autoplay = true; video.muted = !shouldUnmute;
        video.className = "w-full h-full";
        container.appendChild(video);

        const plyr = new Plyr(video, {
          controls: ["play-large", "play", "mute", "volume", "settings", "pip", "fullscreen"],
          autoplay: true, muted: !shouldUnmute,
        });
        plyrRef.current = plyr;

        if (Hls.isSupported()) {
          const hls = new Hls({ xhrSetup: (xhr) => { xhr.withCredentials = false; } });
          hlsRef.current = hls;
          hls.loadSource(finalUrl);
          hls.attachMedia(video);
          hls.on(Hls.Events.MANIFEST_PARSED, () => {
            setLoading(false);
            video.play().catch(() => { video.muted = true; video.play(); setShowUnmuteHint(true); });
          });
          hls.on(Hls.Events.ERROR, () => {
            setError("فشل تحميل ملف M3U8");
            setLoading(false);
          });
        }
        return;
      }

      if (isRawStream) {
        const video = document.createElement("video");
        video.playsInline = true; video.autoplay = true; video.controls = true; video.muted = !shouldUnmute;
        video.className = "w-full h-full bg-black object-contain";
        video.setAttribute("crossorigin", "anonymous");
        container.appendChild(video);

        video.onplaying = () => { setLoading(false); setIsMixedContent(false); };
        video.onerror = () => {
          setIsMixedContent(isHttps && isUrlHttp && !finalUrl.includes('allorigins'));
          setError("تعذر تشغيل البث المباشر");
          setLoading(false);
        };

        const attemptPlay = () => {
          video.play().then(() => setLoading(false)).catch(() => { video.muted = true; video.play(); setShowUnmuteHint(true); });
        };

        if (!forceNative && !isNativeMode && mpegts.getFeatureList().mseLivePlayback) {
          try {
            const player = mpegts.createPlayer({ 
              type: 'mpegts', 
              isLive: true, 
              url: finalUrl, 
              cors: true 
            }, { 
              enableStashBuffer: false,
              liveBufferLatencyChasing: true
            });
            mpegtsRef.current = player;
            player.attachMediaElement(video);
            player.load();
            attemptPlay();
            return;
          } catch (e) {
            console.error("[Player] mpegts error", e);
          }
        }
        video.src = finalUrl;
        attemptPlay();
        return;
      }

      // أنواع الروابط الأخرى (YouTube, Facebook, Iframe)
      const getYouTubeId = (url: string) => {
        const match = url.match(/^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/);
        return (match && match[2].length === 11) ? match[2] : null;
      };
      
      const ytId = getYouTubeId(finalUrl);
      if (ytId) {
        const wrapper = document.createElement("div");
        wrapper.className = "youtube-crop-wrapper";
        const ifr = document.createElement("iframe");
        ifr.src = `https://www.youtube.com/embed/${ytId}?autoplay=1&mute=${shouldUnmute ? "0" : "1"}`;
        ifr.allow = "autoplay; fullscreen"; ifr.allowFullscreen = true;
        wrapper.appendChild(ifr);
        container.appendChild(wrapper);
        setLoading(false);
      } else if (finalUrl.includes("<iframe")) {
        container.innerHTML = finalUrl.replace("<iframe", '<iframe referrerpolicy="no-referrer" allow="autoplay; fullscreen" allowfullscreen');
        const ifr = container.querySelector("iframe");
        if (ifr) { ifr.style.width = "100%"; ifr.style.height = "100%"; }
        setLoading(false);
      } else {
        const ifr = document.createElement("iframe");
        ifr.src = finalUrl; ifr.allow = "autoplay; fullscreen"; ifr.allowFullscreen = true;
        ifr.style.width = "100%"; ifr.style.height = "100%";
        container.appendChild(ifr);
        setTimeout(() => setLoading(false), 1500);
      }
    },
    [destroy, hasInteracted, isNativeMode]
  );

  useEffect(() => {
    const loadData = async () => {
      setFetching(true);
      try {
        const { data: pageData } = await supabase.from('pages').select('*').eq('slug', pageSlug).single();
        if (pageData) {
          setPageInfo(pageData);
          const { data: serversData } = await supabase.from('servers').select('*').eq('page_id', pageData.id).order('sort_order', { ascending: true });
          if (serversData && serversData.length > 0) setServers(serversData);
        }
      } catch (err) {} finally { setFetching(false); }
    };
    loadData();
  }, [pageSlug]);

  useEffect(() => {
    if (!fetching && servers.length > 0 && !isInitialized && containerRef.current) {
      buildPlayer(servers[0]);
      setIsInitialized(true);
    }
  }, [fetching, servers, isInitialized, buildPlayer]);

  const switchServer = useCallback((index: number) => {
    setHasInteracted(true); setActiveIndex(index); setIsNativeMode(false);
    buildPlayer(servers[index], false, true);
  }, [buildPlayer, servers]);

  const toggleNativeMode = () => {
    const newMode = !isNativeMode; setIsNativeMode(newMode); setHasInteracted(true);
    buildPlayer(servers[activeIndex], newMode, true);
  };

  const handleUnmute = () => {
    setHasInteracted(true);
    const video = containerRef.current?.querySelector('video');
    if (video) { video.muted = false; video.play(); }
    if (plyrRef.current) { plyrRef.current.muted = false; plyrRef.current.play(); }
    setShowUnmuteHint(false);
  };

  const isCurrentStream = servers[activeIndex] && (servers[activeIndex].url.includes(".ts") || servers[activeIndex].url.includes("live.php"));

  if (fetching) return <div className="min-h-screen bg-[#020617] flex items-center justify-center text-white"><Loader2 className="animate-spin text-indigo-500" size={48} /></div>;

  return (
    <div className="min-h-screen bg-[#020617] flex flex-col items-center pt-16 px-6 md:px-24 pb-6 font-sans relative overflow-hidden">
      <Helmet><title>{pageInfo ? `${pageInfo.name} - كورة لايف` : "بث مباشر"}</title></Helmet>
      
      <div className="absolute top-4 left-24 z-50">
        <button onClick={() => {const el=document.getElementById('main-player-wrapper'); if(document.fullscreenElement) document.exitFullscreen(); else el?.requestFullscreen();}} className="text-white/80 hover:text-white p-2 bg-black/20 backdrop-blur-md rounded-full border border-white/10"><Maximize size={28} /></button>
      </div>

      <div className="absolute top-4 right-6 md:right-24 z-50">
        <button onClick={() => navigate('/')} className="text-white/80 hover:text-white p-2 bg-black/20 backdrop-blur-md rounded-full border border-white/10"><Home size={24} /></button>
      </div>

      <article id="main-player-wrapper" className="w-full max-w-[1200px] rounded-2xl bg-black flex flex-col relative transition-all duration-500 border border-indigo-500/30 shadow-[0_0_25px_rgba(99,102,241,0.25)]">
        <nav className="flex flex-wrap bg-slate-900/80 backdrop-blur border-b border-white/5 rounded-t-2xl overflow-hidden" dir="rtl">
          {servers.map((srv, i) => (
            <button key={i} onClick={() => switchServer(i)} className={cn("flex-1 min-w-[100px] px-3 py-2 text-[10px] sm:text-xs font-extrabold transition-all border-l border-white/5", i === activeIndex ? "bg-indigo-600 text-white" : "text-slate-400 hover:bg-white/5")}>{srv.name}</button>
          ))}
        </nav>

        <div className="relative w-full bg-black aspect-video rounded-b-2xl overflow-hidden" onClick={handleUnmute}>
          <div ref={containerRef} className="absolute inset-0 flex items-center justify-center" />
          {loading && <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 z-10"><div className="w-12 h-12 rounded-full border-4 border-indigo-500/20 border-t-indigo-500 animate-spin" /><p className="mt-4 text-slate-300 text-sm font-bold">جارٍ تشغيل البث (محاولة تخطي الحجب)...</p></div>}
          
          {isMixedContent && (
            <div className="absolute inset-0 z-20 bg-black/90 flex items-center justify-center p-4">
              <div className="bg-amber-500 text-black p-6 rounded-[2rem] flex flex-col gap-4 text-right shadow-2xl max-w-lg">
                <div className="flex items-center justify-between gap-4"><ShieldAlert size={40} /><h3 className="text-xl font-black">تنبيه: المتصفح يمنع البث</h3></div>
                <p className="text-sm font-bold">حاولنا تشغيل البث عبر البروكسي وفشل. يرجى تفعيل "المحتوى غير الآمن" من إعدادات القفل 🔒 بالأعلى لتشغيل الرابط الأصلي.</p>
                <button onClick={() => window.location.reload()} className="w-full bg-black text-white py-3 rounded-xl font-black">تحديث الصفحة</button>
              </div>
            </div>
          )}

          {showUnmuteHint && !loading && !isMixedContent && (
            <div className="absolute bottom-20 left-1/2 -translate-x-1/2 z-20 bg-indigo-600 text-white px-6 py-3 rounded-full flex items-center gap-3 shadow-2xl animate-bounce cursor-pointer" onClick={handleUnmute}><Volume2 size={20} /><span className="font-black text-sm">انقر لتشغيل الصوت</span></div>
          )}
        </div>
      </article>

      {isCurrentStream && !loading && !isMixedContent && (
        <button onClick={toggleNativeMode} className={cn("mt-6 px-6 py-3 rounded-xl font-black text-sm flex items-center gap-2 transition-all shadow-lg", isNativeMode ? "bg-emerald-600 text-white" : "bg-white/5 text-slate-400 border border-white/10")}><Zap size={18} /> {isNativeMode ? "الوضع المباشر مفعل" : "تشغيل كبث مباشر (لحل مشكلة الصورة)"}</button>
      )}

      <div className="mt-8 w-full max-w-[1200px] flex flex-wrap justify-center gap-2" dir="rtl">
        {tags.map((tag, i) => <span key={i} className="px-3 py-1.5 bg-white/5 border border-white/10 rounded-full text-[10px] font-bold text-slate-500">#{tag}</span>)}
      </div>

      <style>{`
        :root { --plyr-color-main: #6366f1; }
        .plyr { width: 100%; height: 100%; }
        .youtube-crop-wrapper { position: relative; width: 100%; height: 100%; overflow: hidden; }
        .youtube-crop-wrapper iframe { position: absolute; width: 120%; height: 120%; top: -10%; left: -10%; border: none; }
      `}</style>
    </div>
  );
}