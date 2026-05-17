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

  useEffect(() => {
    return () => destroy();
  }, [destroy]);

  const startStallMonitor = (video: HTMLVideoElement) => {
    if (monitorInterval.current) clearInterval(monitorInterval.current);
    monitorInterval.current = setInterval(() => {
      if (!video.paused && video.readyState >= 2) {
        if (video.currentTime === lastTime.current) {
          // البث متوقف (Stall)
          if (video.buffered.length > 0) {
            const end = video.buffered.end(video.buffered.length - 1);
            video.currentTime = end - 0.1;
          }
        } else {
          // البث يعمل، تأكد من إخفاء اللودينج
          setLoading(false);
        }
        lastTime.current = video.currentTime;
      }
    }, 2000);
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
      setIsMixedContent(false);
      
      let finalUrl = server.url.trim();
      const isHttps = window.location.protocol === 'https:';
      const isUrlHttp = finalUrl.startsWith('http:');
      
      if (isHttps && isUrlHttp) {
        console.log("Mixed content detected, using cloud proxy...");
        finalUrl = `https://pelqxsweoarqlwjsanlc.supabase.co/functions/v1/stream-proxy?url=${encodeURIComponent(finalUrl)}`;
      }

      const isM3U8 = finalUrl.includes(".m3u8") || server.type === "m3u8";
      const isRawStream = (
        finalUrl.includes("stream") || 
        finalUrl.includes("type=http") || 
        finalUrl.includes(".ts") || 
        finalUrl.includes("extension=ts") ||
        finalUrl.includes("live.php") ||
        server.type === "ts"
      );

      if (isM3U8) {
        const video = document.createElement("video");
        video.playsInline = true;
        video.autoplay = true;
        video.muted = !shouldUnmute;
        video.className = "w-full h-full";
        container.appendChild(video);

        const plyr = new Plyr(video, {
          controls: ["play-large", "play", "mute", "volume", "settings", "pip", "fullscreen"],
          autoplay: true,
          muted: !shouldUnmute,
        });
        plyrRef.current = plyr;

        if (Hls.isSupported()) {
          const hls = new Hls({ 
            xhrSetup: (xhr) => { xhr.withCredentials = false; },
            liveSyncDurationCount: 8,
            enableWorker: true
          });
          hlsRef.current = hls;
          hls.loadSource(finalUrl);
          hls.attachMedia(video);
          hls.on(Hls.Events.MANIFEST_PARSED, () => {
            video.play().catch(() => setShowUnmuteHint(true));
            startStallMonitor(video);
          });
          hls.on(Hls.Events.FRAG_LOADED, () => setLoading(false));
          hls.on(Hls.Events.ERROR, (_, data) => { if (data.fatal) setLoading(false); });
        } else {
          video.src = finalUrl;
          video.onplaying = () => setLoading(false);
          video.play().catch(() => setShowUnmuteHint(true));
        }
        return;
      }

      if (isRawStream && !finalUrl.includes("<iframe")) {
        const video = document.createElement("video");
        video.playsInline = true;
        video.autoplay = true;
        video.controls = true;
        video.muted = !shouldUnmute;
        video.className = "w-full h-full bg-black object-contain live-video-element";
        video.setAttribute("crossorigin", "anonymous");
        container.appendChild(video);

        // مراقبة دقيقة لحالة اللودينج
        video.ontimeupdate = () => {
          if (video.currentTime > 0) setLoading(false);
        };
        video.onplaying = () => setLoading(false);
        video.onwaiting = () => {
          // أظهر اللودينج فقط إذا تأخر البث فعلاً
          setTimeout(() => {
            if (video.readyState < 3) setLoading(true);
          }, 1500);
        };
        video.onerror = () => { setLoading(false); setError("فشل تحميل البث عبر البروكسي."); };

        const attemptPlay = () => {
          video.play().then(() => {
            if (video.muted) setShowUnmuteHint(true);
            startStallMonitor(video);
          }).catch(() => {
            video.muted = true;
            video.play();
            setShowUnmuteHint(true);
            startStallMonitor(video);
          });
        };

        if (!forceNative && !isNativeMode && mpegts.getFeatureList().mseLivePlayback) {
          try {
            const player = mpegts.createPlayer({ type: 'mpegts', isLive: true, url: finalUrl, cors: true }, {
              enableWorker: true, 
              enableStashBuffer: false, 
              liveBufferLatencyChasing: true,
              autoCleanupSourceBuffer: true
            });
            mpegtsRef.current = player;
            player.on(mpegts.Events.METADATA_ARRIVED, () => setLoading(false));
            player.on(mpegts.Events.STATISTICS_INFO, () => setLoading(false));
            player.attachMediaElement(video);
            player.load();
            attemptPlay();
            return;
          } catch (e) { console.error(e); }
        }
        
        video.src = finalUrl;
        attemptPlay();
        return;
      }

      if (finalUrl.includes("<iframe")) {
        container.innerHTML = finalUrl.replace("<iframe", '<iframe referrerpolicy="no-referrer" allow="autoplay; fullscreen" allowfullscreen');
        const ifr = container.querySelector("iframe");
        if (ifr) { ifr.style.width = "100%"; ifr.style.height = "100%"; ifr.style.border = "none"; }
      } else {
        const ifr = document.createElement("iframe");
        ifr.src = finalUrl; 
        ifr.allow = "autoplay; fullscreen"; ifr.allowFullscreen = true;
        ifr.style.width = "100%"; ifr.style.height = "100%"; ifr.style.border = "none";
        container.appendChild(ifr);
      }
      setTimeout(() => setLoading(false), 2000);
    },
    [destroy, hasInteracted, isNativeMode]
  );

  useEffect(() => {
    const loadData = async () => {
      setFetching(true);
      const { data: pageData } = await supabase.from('pages').select('*').eq('slug', pageSlug).single();
      if (!pageData) { setFetching(false); return; }
      setPageInfo(pageData);
      const { data: srvs } = await supabase.from('servers').select('*').eq('page_id', pageData.id).order('sort_order', { ascending: true });
      if (srvs) setServers(srvs);
      setFetching(false);
    };
    loadData();
  }, [pageSlug]);

  useEffect(() => {
    if (!fetching && servers.length > 0 && !isInitialized && containerRef.current) {
      buildPlayer(servers[0], false, false);
      setIsInitialized(true);
    }
  }, [fetching, servers, isInitialized, buildPlayer]);

  const switchServer = (index: number) => {
    setHasInteracted(true);
    setActiveIndex(index);
    buildPlayer(servers[index], false, true);
  };

  const handleUnmute = () => {
    setHasInteracted(true);
    const v = containerRef.current?.querySelector('video');
    if (v) { v.muted = false; v.play().catch(()=>{}); }
    if (plyrRef.current) { plyrRef.current.muted = false; plyrRef.current.play(); }
    setShowUnmuteHint(false);
    setLoading(false); // إخفاء اللودينج عند التفاعل
  };

  const isCurrentStream = servers[activeIndex] && (servers[activeIndex].url.includes(".ts") || servers[activeIndex].url.includes("live.php"));

  if (fetching) return <div className="min-h-screen bg-[#020617] flex items-center justify-center text-white"><Loader2 className="animate-spin" size={48} /></div>;

  return (
    <div className="min-h-screen bg-[#020617] flex flex-col items-center pt-16 px-6 md:px-24 pb-6 font-sans relative overflow-hidden">
      <Helmet><title>{pageInfo?.name || "بث مباشر"}</title></Helmet>
      
      <div className="absolute top-4 left-24 z-50">
        <button onClick={() => { const e = document.getElementById('main-player-wrapper'); if (e) e.requestFullscreen(); }} className="text-white/80 hover:text-white p-2 bg-black/20 backdrop-blur-md rounded-full border border-white/10"><Maximize size={28} /></button>
      </div>

      <div className="absolute top-4 left-12 z-50">
        <button onClick={() => { setClickCount(c => c+1); if(clickCount>=2) navigate('/admin'); }} className="text-white/5 p-1"><Settings size={8} /></button>
      </div>

      <div className="absolute top-4 right-6 md:right-24 z-50">
        <button onClick={() => navigate('/')} className="text-white/80 hover:text-white p-2 bg-black/20 backdrop-blur-md rounded-full border border-white/10"><Home size={24} /></button>
      </div>

      <article id="main-player-wrapper" className="w-full max-w-[1200px] rounded-2xl bg-black flex flex-col relative border border-indigo-500/30 shadow-2xl">
        <nav className="flex flex-wrap bg-slate-900/80 backdrop-blur border-b border-white/5 rounded-t-2xl overflow-hidden" dir="rtl">
          {servers.map((srv, i) => (
            <button key={i} onClick={() => switchServer(i)} className={cn("flex-1 min-w-[100px] px-3 py-2 text-[10px] sm:text-xs font-extrabold transition-all border-l border-white/5", i === activeIndex ? "bg-indigo-600 text-white" : "text-slate-400 hover:bg-white/5")}>
              {srv.name}
            </button>
          ))}
        </nav>

        <div className="relative w-full bg-black aspect-video rounded-b-2xl overflow-hidden" onClick={handleUnmute}>
          <div ref={containerRef} className="absolute inset-0 flex items-center justify-center" />
          
          {/* طبقة اللودينج تظهر فقط إذا كانت الحالة صحيحة والفيديو غير جاهز تماماً */}
          {loading && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm z-10 pointer-events-none">
              <div className="flex flex-col items-center bg-black/40 p-8 rounded-3xl border border-white/5">
                <Loader2 className="animate-spin text-indigo-500 mb-4" size={40} />
                <p className="text-slate-300 text-sm font-bold animate-pulse">جارٍ الاتصال بالبث المباشر...</p>
              </div>
            </div>
          )}

          {showUnmuteHint && !loading && <div className="absolute bottom-20 left-1/2 -translate-x-1/2 z-20 bg-indigo-600 text-white px-6 py-3 rounded-full flex items-center gap-3 shadow-2xl animate-bounce cursor-pointer" onClick={handleUnmute}><Volume2 size={20} /><span className="font-black text-sm">انقر لتشغيل الصوت</span></div>}
          {error && <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/90 z-10 p-6 text-center"><AlertTriangle className="text-red-500 mb-2" size={32} /><p className="text-red-400 font-black text-sm">{error}</p></div>}
        </div>
      </article>

      {isCurrentStream && !loading && (
        <div className="mt-6 flex flex-col items-center gap-3">
          <button onClick={() => { setIsNativeMode(!isNativeMode); buildPlayer(servers[activeIndex], !isNativeMode, true); }} className={cn("px-6 py-3 rounded-xl font-black text-sm flex items-center gap-2 transition-all shadow-lg", isNativeMode ? "bg-emerald-600" : "bg-white/5 text-slate-400 border border-white/10")}>
            <Zap size={18} /> {isNativeMode ? "تم تفعيل البروكسي المباشر" : "تفعيل معالجة الصورة الذكية (TS)"}
          </button>
        </div>
      )}

      <footer className="mt-12 text-center"><p className="text-[8px] text-slate-600 font-bold uppercase tracking-widest">Koora Live Cloud Service © 2026</p></footer>
      <style>{`.plyr { width: 100%; height: 100%; } .live-video-element::-webkit-media-controls-timeline { display: none !important; }`}</style>
    </div>
  );
}