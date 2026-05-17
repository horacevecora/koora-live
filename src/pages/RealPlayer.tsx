"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
// @ts-ignore
import Plyr from "plyr";
import Hls from "hls.js";
// @ts-ignore
import mpegts from "mpegts.js";
import "plyr/dist/plyr.css";
import { cn } from "@/lib/utils";
import { Settings, Maximize, Volume2, RefreshCw, AlertTriangle, Loader2, Home, ShieldAlert, Zap, LockOpen, Globe } from "lucide-react";
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
  const [isUsingProxy, setIsUsingProxy] = useState(false);

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
    }, 2000);
  };

  const buildPlayer = useCallback(
    (server: Server, forceNative = false, shouldUnmute = hasInteracted, useProxy = false) => {
      const container = containerRef.current;
      if (!container) return;

      container.innerHTML = "";
      destroy();
      setLoading(true);
      setError(null);
      setShowUnmuteHint(false);
      setIsMixedContent(false);
      
      let originalUrl = server.url.trim();
      let finalUrl = originalUrl;

      // منطق التحويل لبروكسي إذا تم طلبه أو إذا كان هناك تعارض HTTP/HTTPS
      if (useProxy && originalUrl.startsWith('http:')) {
        finalUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(originalUrl)}`;
      }

      const isHttps = window.location.protocol === 'https:';
      const isUrlHttp = originalUrl.startsWith('http:');
      
      if (isHttps && isUrlHttp && !useProxy) {
        setIsMixedContent(true);
      }

      const isM3U8 = finalUrl.includes(".m3u8") || server.type === "m3u8";
      const isXtream = /\/[a-zA-Z0-9_-]+\/[a-zA-Z0-9_-]+\/\d+$/.test(originalUrl) || /:\d+\/.*?\/\d+$/.test(originalUrl);
      const isRawStream = (originalUrl.includes("stream") || originalUrl.includes("type=http") || originalUrl.includes(".ts") || isXtream || server.type === "ts");

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
          const hls = new Hls({ 
            xhrSetup: (xhr) => { xhr.withCredentials = false; },
            liveSyncDurationCount: 8,
            liveMaxLatencyDurationCount: 20,
            maxBufferLength: 60,
            enableWorker: true
          });
          hlsRef.current = hls;
          hls.loadSource(finalUrl);
          hls.attachMedia(video);
          hls.on(Hls.Events.MANIFEST_PARSED, () => {
            setLoading(false);
            video.play().catch(() => {
              video.muted = true;
              video.play();
              setShowUnmuteHint(true);
            });
            startStallMonitor(video);
          });
          hls.on(Hls.Events.ERROR, (event, data) => {
            if (data.fatal && !useProxy && isUrlHttp) {
              // محاولة تلقائية باستخدام البروكسي عند الفشل
              setIsUsingProxy(true);
              buildPlayer(server, forceNative, shouldUnmute, true);
            } else if (data.fatal) {
              setError("فشل تحميل البث. قد يكون الرابط متوقفاً أو يحتاج لتحديث.");
              setLoading(false);
            }
          });
        } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
          video.src = finalUrl;
          video.play().catch(() => {
            video.muted = true;
            video.play();
            setShowUnmuteHint(true);
          });
          setLoading(false);
          startStallMonitor(video);
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
        video.setAttribute("referrerpolicy", "no-referrer");
        container.appendChild(video);

        video.onwaiting = () => setLoading(true);
        video.onplaying = () => setLoading(false);
        video.onerror = () => {
          if (isHttps && isUrlHttp && !useProxy) {
            // محاولة تلقائية باستخدام البروكسي
            setIsUsingProxy(true);
            buildPlayer(server, forceNative, shouldUnmute, true);
          } else {
            setError("خطأ في تشغيل الرابط المباشر.");
            setLoading(false);
          }
        };

        const attemptPlay = () => {
          video.play().then(() => {
            setLoading(false);
            if (video.muted) setShowUnmuteHint(true);
            startStallMonitor(video);
          }).catch(() => {
            video.muted = true;
            video.play().then(() => {
              setLoading(false);
              setShowUnmuteHint(true);
              startStallMonitor(video);
            });
          });
        };

        if (forceNative || isNativeMode || !mpegts.getFeatureList().mseLivePlayback) {
          video.src = finalUrl;
          attemptPlay();
          return;
        }

        try {
          const player = mpegts.createPlayer({ 
            type: 'mpegts', 
            isLive: true, 
            url: finalUrl, 
            cors: true 
          }, {
            enableWorker: true,
            enableStashBuffer: false,
            stashInitialSize: 128
          });
          mpegtsRef.current = player;
          player.attachMediaElement(video);
          player.load();
          attemptPlay();
        } catch (e) {
          video.src = finalUrl;
          attemptPlay();
        }
        return;
      }

      // أنواع الروابط الأخرى (YouTube, Twitch, Iframe...)
      const getYouTubeId = (u: string) => {
        const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
        const match = u.match(regExp);
        return (match && match[2].length === 11) ? match[2] : null;
      };
      
      const ytId = getYouTubeId(originalUrl);
      if (ytId) {
        const wrapper = document.createElement("div");
        wrapper.className = "youtube-crop-wrapper";
        const ifr = document.createElement("iframe");
        ifr.src = `https://www.youtube.com/embed/${ytId}?rel=0&autoplay=1&mute=${shouldUnmute ? "0" : "1"}&controls=1`;
        ifr.allow = "autoplay; fullscreen"; ifr.allowFullscreen = true;
        wrapper.appendChild(ifr);
        container.appendChild(wrapper);
        setLoading(false);
        return;
      }

      if (originalUrl.includes("<iframe")) {
        container.innerHTML = originalUrl.replace("<iframe", '<iframe referrerpolicy="no-referrer" allow="autoplay; fullscreen" allowfullscreen');
        const ifr = container.querySelector("iframe");
        if (ifr) { ifr.style.width = "100%"; ifr.style.height = "100%"; ifr.style.border = "none"; }
      } else {
        const ifr = document.createElement("iframe");
        ifr.src = originalUrl; 
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
        const { data: pageData, error: pageError } = await supabase
          .from('pages')
          .select('*')
          .eq('slug', pageSlug)
          .single();

        if (pageError || !pageData) {
          if (pageSlug === 'default') {
            const def = [{ name: "سيرفر 1", url: "https://8.wwwkora.com/albaplayer/bein-sports-hd-1/?serv=1", type: "iframe" as ServerType }];
            setServers(def);
            setPageInfo({ id: 'default', name: "بث مباشر مباريات اليوم", slug: "default" });
          } else {
            setError("الصفحة غير موجودة");
          }
          return;
        }

        setPageInfo(pageData);

        const { data: serversData, error: serversError } = await supabase
          .from('servers')
          .select('*')
          .eq('page_id', pageData.id)
          .order('sort_order', { ascending: true });

        if (serversError) throw serversError;

        if (serversData && serversData.length > 0) {
          setServers(serversData);
        } else {
          const def = [{ name: "سيرفر 1", url: "https://8.wwwkora.com/albaplayer/bein-sports-hd-1/?serv=1", type: "iframe" as ServerType }];
          setServers(def);
        }

      } catch (err) {
        console.error("Error loading player data:", err);
        setError("فشل الاتصال بقاعدة البيانات");
      } finally {
        setFetching(false);
      }
    };

    loadData();
    return () => destroy();
  }, [pageSlug, destroy]);

  useEffect(() => {
    if (!fetching && servers.length > 0 && !isInitialized && containerRef.current) {
      buildPlayer(servers[0], false, false);
      setIsInitialized(true);
    }
  }, [fetching, servers, isInitialized, buildPlayer]);

  const switchServer = useCallback(
    (index: number) => {
      if (servers[index]) {
        setHasInteracted(true);
        setActiveIndex(index);
        setIsNativeMode(false);
        setIsUsingProxy(false);
        buildPlayer(servers[index], false, true, false);
      }
    },
    [buildPlayer, servers]
  );

  const toggleProxy = () => {
    const newProxyState = !isUsingProxy;
    setIsUsingProxy(newProxyState);
    setHasInteracted(true);
    if (servers[activeIndex]) {
      buildPlayer(servers[activeIndex], isNativeMode, true, newProxyState);
    }
  };

  const toggleNativeMode = () => {
    const newMode = !isNativeMode;
    setIsNativeMode(newMode);
    setHasInteracted(true);
    if (servers[activeIndex]) {
      buildPlayer(servers[activeIndex], newMode, true, isUsingProxy);
    }
  };

  const handleUnmute = () => {
    setHasInteracted(true);
    const video = containerRef.current?.querySelector('video');
    if (video) { video.muted = false; video.volume = 1; video.play().catch(() => {}); }
    if (plyrRef.current) { plyrRef.current.muted = false; plyrRef.current.volume = 1; plyrRef.current.play(); }
    setShowUnmuteHint(false);
  };

  const handleSettingsClick = () => {
    const newCount = clickCount + 1;
    if (newCount >= 3) navigate('/admin');
    else { setClickCount(newCount); setTimeout(() => setClickCount(0), 2000); }
  };

  const toggleFullScreen = () => {
    const elem = document.getElementById('main-player-wrapper');
    if (!elem) return;
    if (!document.fullscreenElement) elem.requestFullscreen().catch(() => {});
    else document.exitFullscreen();
  };

  const isCurrentHttp = servers[activeIndex] && servers[activeIndex].url.startsWith("http:");
  const isCurrentStream = servers[activeIndex] && (servers[activeIndex].url.includes(".ts") || servers[activeIndex].url.includes("type=http") || servers[activeIndex].type === "ts");

  if (fetching) {
    return (
      <div className="min-h-screen bg-[#020617] flex flex-col items-center justify-center text-white">
        <Loader2 className="animate-spin text-indigo-500 mb-4" size={48} />
        <p className="font-bold">جارٍ الاتصال بقاعدة البيانات...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#020617] flex flex-col items-center pt-16 px-6 md:px-24 pb-6 font-sans relative overflow-hidden">
      <Helmet>
        <title>{pageInfo ? `${pageInfo.name} - كورة لايف` : "بث مباشر"}</title>
      </Helmet>

      <div className="absolute top-4 left-24 z-50">
        <button onClick={toggleFullScreen} className="text-white/80 hover:text-white p-2 bg-black/20 backdrop-blur-md rounded-full border border-white/10" title="ملء الشاشة">
          <Maximize size={28} />
        </button>
      </div>

      <div className="absolute top-4 left-12 z-50">
        <button onClick={handleSettingsClick} className="text-white/5 hover:text-white/10 p-1"><Settings size={8} /></button>
      </div>

      <div className="absolute top-4 right-6 md:right-24 z-50">
        <button onClick={() => navigate('/')} className="text-white/80 hover:text-white p-2 bg-black/20 backdrop-blur-md rounded-full border border-white/10" title="الرئيسية"><Home size={24} /></button>
      </div>

      <article id="main-player-wrapper" className="w-full max-w-[1200px] rounded-2xl bg-black flex flex-col relative transition-all duration-500 border border-indigo-500/30 shadow-[0_0_25px_rgba(99,102,241,0.25)]">
        <nav className="flex flex-wrap bg-slate-900/80 backdrop-blur border-b border-white/5 rounded-t-2xl overflow-hidden" dir="rtl">
          {servers.map((srv, i) => (
            <button
              key={i}
              onClick={() => switchServer(i)}
              className={cn(
                "flex-1 min-w-[100px] px-3 py-2 text-[10px] sm:text-xs font-extrabold transition-all flex items-center justify-center gap-1.5 border-l border-white/5 relative group",
                i === activeIndex ? "bg-indigo-600 text-white" : "text-slate-400 hover:bg-white/5"
              )}
            >
              {i === activeIndex && (
                <span className="relative flex h-1 w-1">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-1 w-1 bg-emerald-500"></span>
                </span>
              )}
              {srv.name}
            </button>
          ))}
        </nav>

        <div className="relative w-full bg-black aspect-video rounded-b-2xl overflow-hidden" onClick={handleUnmute}>
          <div ref={containerRef} className="absolute inset-0 flex items-center justify-center" />
          
          {loading && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 z-10">
              <div className="w-12 h-12 rounded-full border-4 border-indigo-500/20 border-t-indigo-500 animate-spin" />
              <p className="mt-4 text-slate-300 text-sm font-bold">جارٍ استقرار البث...</p>
            </div>
          )}

          {isMixedContent && !loading && !error && !isUsingProxy && (
            <div className="absolute inset-0 z-20 bg-black/90 flex items-center justify-center p-4">
              <div className="bg-amber-500 text-black p-6 rounded-[2rem] flex flex-col gap-4 text-right shadow-2xl border-4 border-white/20 max-w-lg animate-in fade-in zoom-in duration-300">
                <div className="flex items-center justify-between gap-4">
                  <ShieldAlert size={40} className="shrink-0" />
                  <h3 className="text-xl font-black">المتصفح يمنع البث (HTTP)</h3>
                </div>
                <p className="text-sm font-bold leading-loose">
                  هذا الرابط يعمل بنظام <code className="bg-black/10 px-1 rounded">http</code>، وهو ما يمنعه المتصفح لعدم تشفيره.
                </p>
                <div className="flex flex-col gap-3">
                  <button onClick={toggleProxy} className="w-full bg-black text-white py-3 rounded-xl font-black flex items-center justify-center gap-2 hover:scale-105 transition-transform">
                    <Globe size={18} className="text-[#00e676]" /> تشغيل عبر بروكسي آمن (تلقائي)
                  </button>
                  <p className="text-[10px] text-center font-bold opacity-70">أو يمكنك السماح بالمحتوى غير الآمن من إعدادات القفل 🔒 بالأعلى</p>
                </div>
              </div>
            </div>
          )}

          {showUnmuteHint && !loading && (
            <div className="absolute bottom-20 left-1/2 -translate-x-1/2 z-20 bg-indigo-600 text-white px-6 py-3 rounded-full flex items-center gap-3 shadow-2xl animate-bounce cursor-pointer hover:bg-indigo-500 transition-colors" onClick={(e) => { e.stopPropagation(); handleUnmute(); }}>
              <Volume2 size={20} />
              <span className="font-black text-sm">انقر لتشغيل الصوت</span>
            </div>
          )}

          {error && !loading && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/90 z-10 p-6 text-center">
              <div className="bg-red-500/10 p-4 rounded-2xl border border-red-500/20 mb-4 max-w-md">
                <AlertTriangle className="text-red-500 mx-auto mb-2" size={32} />
                <p className="text-red-400 font-black text-sm">{error}</p>
              </div>
              <div className="flex gap-3">
                <button onClick={() => window.location.reload()} className="px-6 py-3 bg-white/10 text-white rounded-xl font-bold flex items-center gap-2"><RefreshCw size={18} /> تحديث</button>
                {isCurrentHttp && !isUsingProxy && (
                  <button onClick={toggleProxy} className="px-6 py-3 bg-indigo-600 text-white rounded-xl font-bold flex items-center gap-2"><Globe size={18} /> تجربة البروكسي</button>
                )}
              </div>
            </div>
          )}
        </div>
      </article>

      <div className="mt-6 flex flex-wrap justify-center gap-4">
        {isCurrentStream && !loading && !error && (
          <button 
            onClick={toggleNativeMode}
            className={cn(
              "px-6 py-3 rounded-xl font-black text-xs flex items-center gap-2 transition-all shadow-lg",
              isNativeMode 
                ? "bg-emerald-600 text-white shadow-emerald-500/20" 
                : "bg-white/5 text-slate-400 border border-white/10 hover:bg-white/10"
            )}
          >
            <Zap size={16} className={isNativeMode ? "fill-white" : ""} />
            {isNativeMode ? "وضع السرعة مفعل" : "تفعيل وضع السرعة القصوى"}
          </button>
        )}

        {isCurrentHttp && !loading && (
          <button 
            onClick={toggleProxy}
            className={cn(
              "px-6 py-3 rounded-xl font-black text-xs flex items-center gap-2 transition-all shadow-lg",
              isUsingProxy 
                ? "bg-indigo-600 text-white shadow-indigo-500/20 border-indigo-400" 
                : "bg-white/5 text-slate-400 border border-white/10 hover:bg-white/10"
            )}
          >
            <Globe size={16} className={isUsingProxy ? "text-[#00e676]" : ""} />
            {isUsingProxy ? "وضع البروكسي مفعل (رابط آمن)" : "تشغيل عبر رابط آمن (Proxy)"}
          </button>
        )}
      </div>

      <div className="mt-8 w-full max-w-[1200px] overflow-x-auto no-scrollbar" dir="rtl">
        <div className="flex flex-nowrap justify-center gap-2 min-w-max px-4">
          {tags.map((tag, index) => (
            <span key={index} className="px-3 py-1.5 bg-white/5 border border-white/10 rounded-full text-[10px] font-bold text-slate-500 hover:text-[#00e676] hover:border-[#00e676]/30 transition-colors cursor-default whitespace-nowrap">
              #{tag}
            </span>
          ))}
        </div>
      </div>

      <footer className="w-full max-w-[1200px] mt-12 px-4 text-center" dir="rtl">
        <p className="text-[8px] text-slate-600 font-bold uppercase tracking-widest">
          Koora Live Streaming Service - Secure Proxy Tech Enabled © 2026
        </p>
      </footer>

      <style>{`
        :root { --plyr-color-main: #6366f1; }
        .plyr { width: 100%; height: 100%; }
        .live-video-element::-webkit-media-controls-timeline,
        .live-video-element::-webkit-media-controls-current-time-display,
        .live-video-element::-webkit-media-controls-time-remaining-display { display: none !important; }
        #main-player-wrapper:fullscreen { width: 100vw; height: 100vh; border-radius: 0; margin: 0; display: flex; align-items: center; justify-content: center; background: #000; box-shadow: none; border: none; }
        #main-player-wrapper:fullscreen .aspect-video { width: 100%; height: auto; max-height: 100vh; border-radius: 0; }
        .youtube-crop-wrapper { position: relative; width: 100%; height: 100%; overflow: hidden; background: #000; }
        .youtube-crop-wrapper iframe { position: absolute; width: 120%; height: 120%; top: -10%; left: -10%; border: none; }
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  );
}