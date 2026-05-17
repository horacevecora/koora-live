"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
// @ts-ignore
import Plyr from "plyr";
import Hls from "hls.js";
// @ts-ignore
import mpegts from "mpegts.js";
import "plyr/dist/plyr.css";
import { cn } from "@/lib/utils";
import { Settings, Maximize, Volume2, RefreshCw, AlertTriangle, Loader2, Home, ShieldAlert, Zap, ExternalLink, PlayCircle } from "lucide-react";
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

  const tags = ["كورة لايف", "بث مباشر", "يلا شوت", "مباريات اليوم", "الاسطورة", "كورة ستار"];

  const destroy = useCallback(() => {
    if (monitorInterval.current) { clearInterval(monitorInterval.current); monitorInterval.current = null; }
    if (hlsRef.current) { hlsRef.current.destroy(); hlsRef.current = null; }
    if (mpegtsRef.current) { mpegtsRef.current.destroy(); mpegtsRef.current = null; }
    if (plyrRef.current) { plyrRef.current.destroy(); plyrRef.current = null; }
  }, []);

  const startStallMonitor = (video: HTMLVideoElement) => {
    if (monitorInterval.current) clearInterval(monitorInterval.current);
    monitorInterval.current = setInterval(() => {
      if (!video.paused && video.readyState >= 2) {
        if (video.currentTime === lastTime.current) {
          if (video.buffered.length > 0) {
            const end = video.buffered.end(video.buffered.length - 1);
            video.currentTime = end - 0.2;
          }
        }
        lastTime.current = video.currentTime;
      }
    }, 2500);
  };

  const buildPlayer = useCallback(
    (server: Server, forceNative = false, shouldUnmute = hasInteracted) => {
      const container = containerRef.current;
      if (!container) return;

      container.innerHTML = "";
      destroy();
      setLoading(true);
      setError(null);
      setShowUnmuteHint(false);
      
      let url = server.url.trim();
      const isHttps = window.location.protocol === 'https:';
      const isUrlHttp = url.startsWith('http:');
      
      if (isHttps && isUrlHttp) {
        setIsMixedContent(true);
      } else {
        setIsMixedContent(false);
      }

      const isM3U8 = url.includes(".m3u8") || server.type === "m3u8";
      const isRawStream = (url.includes("stream") || url.includes("type=http") || url.includes(".ts") || url.includes("extension=ts") || server.type === "ts");

      if (isM3U8) {
        const video = document.createElement("video");
        video.playsInline = true;
        video.autoplay = true;
        video.muted = !shouldUnmute;
        video.setAttribute("referrerpolicy", "no-referrer");
        video.className = "w-full h-full";
        container.appendChild(video);

        const plyr = new Plyr(video, {
          controls: ["play-large", "play", "mute", "volume", "settings", "pip", "fullscreen"],
          autoplay: true,
          muted: !shouldUnmute,
        });
        plyrRef.current = plyr;

        if (Hls.isSupported()) {
          const hls = new Hls({ xhrSetup: (xhr) => { xhr.withCredentials = false; } });
          hlsRef.current = hls;
          hls.loadSource(url);
          hls.attachMedia(video);
          hls.on(Hls.Events.MANIFEST_PARSED, () => {
            setLoading(false);
            video.play().catch(() => { video.muted = true; video.play(); setShowUnmuteHint(true); });
            startStallMonitor(video);
          });
        } else {
          video.src = url;
          video.play().catch(() => { video.muted = true; video.play(); setShowUnmuteHint(true); });
          setLoading(false);
        }
        return;
      }

      if (isRawStream && !url.includes("<iframe")) {
        const video = document.createElement("video");
        video.playsInline = true;
        video.autoplay = true;
        video.controls = true;
        video.muted = !shouldUnmute;
        video.className = "w-full h-full bg-black object-contain";
        video.setAttribute("referrerpolicy", "no-referrer");
        container.appendChild(video);

        const attemptPlay = () => {
          video.play().then(() => {
            setLoading(false);
            if (video.muted) setShowUnmuteHint(true);
            startStallMonitor(video);
          }).catch(() => {
            video.muted = true;
            video.play().then(() => { setLoading(false); setShowUnmuteHint(true); startStallMonitor(video); });
          });
        };

        if (forceNative || isNativeMode) {
          video.src = url;
          attemptPlay();
        } else {
          try {
            const player = mpegts.createPlayer({ type: 'mpegts', isLive: true, url: url, cors: true });
            mpegtsRef.current = player;
            player.attachMediaElement(video);
            player.load();
            attemptPlay();
          } catch (e) {
            video.src = url;
            attemptPlay();
          }
        }
        return;
      }

      // Default Iframe / Other logic
      if (url.includes("<iframe")) {
        container.innerHTML = url.replace("<iframe", '<iframe referrerpolicy="no-referrer" allow="autoplay; fullscreen" allowfullscreen');
      } else {
        const ifr = document.createElement("iframe");
        ifr.src = url; 
        ifr.setAttribute("referrerpolicy", "no-referrer"); 
        ifr.allow = "autoplay; fullscreen"; ifr.allowFullscreen = true;
        ifr.style.width = "100%"; ifr.style.height = "100%"; ifr.style.border = "none";
        container.appendChild(ifr);
      }
      setTimeout(() => setLoading(false), 1500);
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
          const { data: srvs } = await supabase.from('servers').select('*').eq('page_id', pageData.id).order('sort_order', { ascending: true });
          if (srvs && srvs.length > 0) setServers(srvs);
        } else if (pageSlug === 'default') {
          const def = [{ name: "سيرفر 1", url: "https://8.wwwkora.com/albaplayer/bein-sports-hd-1/?serv=1", type: "iframe" as ServerType }];
          setServers(def);
          setPageInfo({ id: 'default', name: "بث مباشر", slug: "default" });
        }
      } catch (err) { setError("فشل الاتصال"); } finally { setFetching(false); }
    };
    loadData();
  }, [pageSlug]);

  useEffect(() => {
    if (!fetching && servers.length > 0 && !isInitialized && containerRef.current) {
      buildPlayer(servers[0], false, false);
      setIsInitialized(true);
    }
  }, [fetching, servers, isInitialized, buildPlayer]);

  const switchServer = (i: number) => { setHasInteracted(true); setActiveIndex(i); setIsNativeMode(false); buildPlayer(servers[i], false, true); };
  const toggleFullScreen = () => { const el = document.getElementById('main-player-wrapper'); if (el) { if (!document.fullscreenElement) el.requestFullscreen().catch(()=>{}); else document.exitFullscreen(); } };
  const handleUnmute = () => {
    setHasInteracted(true);
    const v = containerRef.current?.querySelector('video');
    if (v) { v.muted = false; v.volume = 1; v.play().catch(()=>{}); }
    if (plyrRef.current) { plyrRef.current.muted = false; plyrRef.current.volume = 1; plyrRef.current.play(); }
    setShowUnmuteHint(false);
  };

  const tryHttps = () => {
    const srv = servers[activeIndex];
    if (srv && srv.url.startsWith('http:')) {
      const newSrv = { ...srv, url: srv.url.replace('http:', 'https:') };
      buildPlayer(newSrv, isNativeMode, true);
    }
  };

  const openExternal = () => {
    const url = servers[activeIndex]?.url;
    if (url) window.open(url, '_blank');
  };

  if (fetching) return <div className="min-h-screen bg-[#020617] flex items-center justify-center"><Loader2 className="animate-spin text-indigo-500" size={48} /></div>;

  const currentUrl = servers[activeIndex]?.url || "";
  const isTS = currentUrl.includes(".ts") || currentUrl.includes("extension=ts");

  return (
    <div className="min-h-screen bg-[#020617] flex flex-col items-center pt-16 px-6 md:px-24 pb-6 font-sans relative overflow-hidden">
      <Helmet><title>{pageInfo?.name || "بث مباشر"} - كورة لايف</title></Helmet>

      <div className="absolute top-4 left-6 md:left-24 z-50 flex gap-2">
        <button onClick={toggleFullScreen} className="text-white/80 hover:text-white p-2 bg-black/20 backdrop-blur-md rounded-full border border-white/10"><Maximize size={24} /></button>
        <button onClick={() => navigate('/admin')} className="text-white/5 p-1 hover:text-white/10"><Settings size={8} /></button>
      </div>

      <div className="absolute top-4 right-6 md:right-24 z-50">
        <button onClick={() => navigate('/')} className="text-white/80 hover:text-white p-2 bg-black/20 backdrop-blur-md rounded-full border border-white/10"><Home size={24} /></button>
      </div>

      <article id="main-player-wrapper" className="w-full max-w-[1200px] rounded-2xl bg-black flex flex-col relative border border-indigo-500/30 shadow-2xl">
        <nav className="flex flex-wrap bg-slate-900/80 backdrop-blur border-b border-white/5 rounded-t-2xl overflow-hidden" dir="rtl">
          {servers.map((srv, i) => (
            <button key={i} onClick={() => switchServer(i)} className={cn("flex-1 min-w-[100px] px-3 py-3 text-xs font-black transition-all border-l border-white/5", i === activeIndex ? "bg-indigo-600 text-white" : "text-slate-400 hover:bg-white/5")}>
              {srv.name}
            </button>
          ))}
        </nav>

        <div className="relative w-full bg-black aspect-video rounded-b-2xl overflow-hidden" onClick={handleUnmute}>
          <div ref={containerRef} className="absolute inset-0 flex items-center justify-center" />
          
          {loading && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 z-10">
              <div className="w-12 h-12 rounded-full border-4 border-indigo-500/20 border-t-indigo-500 animate-spin" />
              <p className="mt-4 text-slate-300 text-xs font-bold">جارٍ معالجة رابط البث...</p>
            </div>
          )}

          {isMixedContent && !loading && (
            <div className="absolute inset-0 z-20 bg-black/95 flex items-center justify-center p-4">
              <div className="bg-slate-900 border-2 border-amber-500/50 p-8 rounded-[2.5rem] flex flex-col gap-5 text-right shadow-2xl max-w-lg animate-in fade-in zoom-in duration-300">
                <div className="flex items-center justify-between">
                  <AlertTriangle size={40} className="text-amber-500" />
                  <h3 className="text-xl font-black text-white">تحذير: المتصفح يحظر هذا الرابط</h3>
                </div>
                <p className="text-sm text-slate-300 leading-loose font-bold">
                  هذا الرابط يعمل بنظام <code className="text-amber-400">http</code> وقد قام المتصفح بحظره تلقائياً لدواعي أمنية.
                </p>
                <div className="grid grid-cols-1 gap-3">
                  <button onClick={tryHttps} className="w-full bg-indigo-600 text-white py-3 rounded-xl font-black flex items-center justify-center gap-2 hover:bg-indigo-500 transition-colors">
                    <Zap size={18} /> محاولة تحويل الرابط لـ HTTPS
                  </button>
                  <button onClick={openExternal} className="w-full bg-white/5 border border-white/10 text-white py-3 rounded-xl font-black flex items-center justify-center gap-2 hover:bg-white/10 transition-colors">
                    <ExternalLink size={18} /> فتح الرابط في صفحة مستقلة
                  </button>
                  <div className="bg-amber-500/10 p-4 rounded-2xl border border-amber-500/20">
                    <p className="text-[10px] text-amber-500 font-bold leading-relaxed">
                      💡 حل نهائي: اضغط على أيقونة "القفل" بجانب رابط الموقع 🔒 {'>'} إعدادات الموقع {'>'} المحتوى غير الآمن {'>'} سماح.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {showUnmuteHint && !loading && !isMixedContent && (
            <div className="absolute bottom-10 left-1/2 -translate-x-1/2 z-20 bg-indigo-600 text-white px-6 py-3 rounded-full flex items-center gap-3 shadow-2xl animate-bounce cursor-pointer" onClick={handleUnmute}>
              <Volume2 size={20} />
              <span className="font-black text-xs">انقر لتشغيل الصوت</span>
            </div>
          )}
        </div>
      </article>

      <div className="mt-6 flex flex-wrap justify-center gap-4">
        {isTS && (
          <button 
            onClick={() => { setIsNativeMode(!isNativeMode); setTimeout(() => buildPlayer(servers[activeIndex], !isNativeMode, true), 10); }}
            className={cn("px-6 py-3 rounded-xl font-black text-xs flex items-center gap-2 transition-all shadow-lg", isNativeMode ? "bg-emerald-600 text-white" : "bg-white/5 text-slate-400 border border-white/10")}
          >
            <Zap size={18} /> {isNativeMode ? "وضع البث المباشر (مفعل)" : "تفعيل وضع البث المباشر (TS)"}
          </button>
        )}
        <button onClick={openExternal} className="px-6 py-3 bg-white/5 border border-white/10 text-slate-400 rounded-xl font-black text-xs flex items-center gap-2 hover:text-white transition-all">
          <PlayCircle size={18} /> فتح الرابط في مشغل خارجي (VLC)
        </button>
      </div>

      <div className="mt-8 flex flex-wrap justify-center gap-2 max-w-2xl opacity-40">
        {tags.map((tag, i) => <span key={i} className="text-[10px] font-bold text-slate-500">#{tag}</span>)}
      </div>

      <style>{`
        :root { --plyr-color-main: #6366f1; }
        .plyr { width: 100%; height: 100%; }
        #main-player-wrapper:fullscreen { width: 100vw; height: 100vh; border-radius: 0; background: #000; }
        #main-player-wrapper:fullscreen .aspect-video { height: 100vh; }
      `}</style>
    </div>
  );
}