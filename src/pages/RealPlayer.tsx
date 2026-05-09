"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
// @ts-ignore
import Plyr from "plyr";
import Hls from "hls.js";
// @ts-ignore
import mpegts from "mpegts.js";
import "plyr/dist/plyr.css";
import { cn } from "@/lib/utils";
import { Settings, Maximize, Volume2, RefreshCw, AlertTriangle, Loader2, Home, ShieldAlert, Zap, LockOpen } from "lucide-react";
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

  useEffect(() => {
    const meta = document.createElement('meta');
    meta.name = "referrer";
    meta.content = "no-referrer";
    document.head.appendChild(meta);
    return () => {
      document.head.removeChild(meta);
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
    (server: Server, forceNative = false, shouldUnmute = hasInteracted) => {
      const container = containerRef.current;
      if (!container) return;

      container.innerHTML = "";
      destroy();
      setLoading(true);
      setError(null);
      setShowUnmuteHint(false);
      setIsMixedContent(false);
      
      let url = server.url.trim();
      const isHttps = window.location.protocol === 'https:';
      const isUrlHttp = url.startsWith('http:');
      
      if (isHttps && isUrlHttp) {
        setIsMixedContent(true);
      }

      const isM3U8 = url.includes(".m3u8") || server.type === "m3u8";
      const isXtream = /\/[a-zA-Z0-9_-]+\/[a-zA-Z0-9_-]+\/\d+$/.test(url) || /:\d+\/.*?\/\d+$/.test(url);
      const isRawStream = (url.includes("stream") || url.includes("type=http") || url.includes(".ts") || isXtream || server.type === "ts");

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
          hls.loadSource(url);
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
            if (data.fatal) {
              setError("فشل تحميل البث. قد يكون الرابط متوقفاً أو يحتاج لتحديث.");
              setLoading(false);
            }
          });
        } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
          video.src = url;
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

      if (isRawStream && !url.includes("<iframe")) {
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
          if (isHttps && isUrlHttp) {
            setError("المتصفح يمنع تشغيل روابط HTTP على موقع آمن. يرجى اتباع التعليمات في التنبيه الأصفر بالأعلى.");
          } else {
            setError("خطأ في تشغيل الرابط المباشر.");
          }
          setLoading(false);
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
          video.src = url;
          attemptPlay();
          return;
        }

        try {
          const player = mpegts.createPlayer({ 
            type: 'mpegts', 
            isLive: true, 
            url: url, 
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
          video.src = url;
          attemptPlay();
        }
        return;
      }

      // باقي أنواع الروابط
      const getYouTubeId = (url: string) => {
        const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
        const match = url.match(regExp);
        return (match && match[2].length === 11) ? match[2] : null;
      };
      const getTwitchChannel = (url: string) => {
        const match = url.match(/(?:twitch\.tv\/)([a-zA-Z0-9_]+)/);
        return match ? match[1] : null;
      };
      const getKickInfo = (url: string) => {
        if (url.includes('.m3u8')) return null;
        const videoMatch = url.match(/kick\.com\/video\/([a-zA-Z0-9-]+)/);
        if (videoMatch) return { type: 'video', id: videoMatch[1] };
        const channelMatch = url.match(/kick\.com\/([a-zA-Z0-9_]+)/);
        if (channelMatch && channelMatch[1] !== 'video' && channelMatch[1] !== 'api') return { type: 'channel', id: channelMatch[1] };
        return null;
      };
      const isFacebookUrl = (url: string) => url.includes("facebook.com") || url.includes("fb.watch");

      const ytId = getYouTubeId(url);
      const twitchChannel = getTwitchChannel(url);
      const kickInfo = getKickInfo(url);
      const isFB = isFacebookUrl(url);

      if (kickInfo) {
        const ifr = document.createElement("iframe");
        const embedPath = kickInfo.type === 'video' ? `video/${kickInfo.id}` : kickInfo.id;
        ifr.src = `https://player.kick.com/${embedPath}?autoplay=true&muted=${shouldUnmute ? 'false' : 'true'}`;
        ifr.style.width = "100%"; ifr.style.height = "100%"; ifr.style.border = "none";
        ifr.allow = "autoplay; fullscreen"; ifr.allowFullscreen = true;
        container.appendChild(ifr);
      } else if (twitchChannel) {
        const ifr = document.createElement("iframe");
        ifr.src = `https://player.twitch.tv/?channel=${twitchChannel}&parent=${window.location.hostname}&autoplay=true&muted=${!shouldUnmute}`;
        ifr.style.width = "100%"; ifr.style.height = "100%"; ifr.style.border = "none";
        ifr.allow = "autoplay; fullscreen"; ifr.allowFullscreen = true;
        container.appendChild(ifr);
      } else if (isFB) {
        const ifr = document.createElement("iframe");
        ifr.src = `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(url)}&show_text=0&autoplay=true&mute=${shouldUnmute ? "0" : "1"}&allowfullscreen=true&adapt_to_wrapper=true`;
        ifr.style.width = "100%"; ifr.style.height = "100%"; ifr.style.border = "none"; ifr.style.position = "absolute"; ifr.style.top = "0"; ifr.style.left = "0";
        ifr.allow = "autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share; fullscreen"; ifr.allowFullscreen = true;
        container.appendChild(ifr);
        setTimeout(() => setShowUnmuteHint(true), 2000);
      } else if (ytId) {
        const wrapper = document.createElement("div");
        wrapper.className = "youtube-crop-wrapper";
        const ifr = document.createElement("iframe");
        ifr.src = `https://www.youtube.com/embed/${ytId}?rel=0&modestbranding=1&autoplay=1&mute=${shouldUnmute ? "0" : "1"}&controls=1`;
        ifr.allow = "autoplay; fullscreen"; ifr.allowFullscreen = true;
        wrapper.appendChild(ifr);
        container.appendChild(wrapper);
      } else if (url.includes("<iframe")) {
        container.innerHTML = url.replace("<iframe", '<iframe referrerpolicy="no-referrer" allow="autoplay; fullscreen" allowfullscreen');
        const ifr = container.querySelector("iframe");
        if (ifr) { ifr.style.width = "100%"; ifr.style.height = "100%"; ifr.style.border = "none"; }
      } else {
        const ifr = document.createElement("iframe");
        ifr.src = url; ifr.setAttribute("referrerpolicy", "no-referrer"); ifr.allow = "autoplay; fullscreen"; ifr.allowFullscreen = true;
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
        buildPlayer(servers[index], false, true);
      }
    },
    [buildPlayer, servers]
  );

  const toggleNativeMode = () => {
    const newMode = !isNativeMode;
    setIsNativeMode(newMode);
    setHasInteracted(true);
    if (servers[activeIndex]) {
      setTimeout(() => buildPlayer(servers[activeIndex], newMode, true), 10);
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

  const isCurrentFB = servers[activeIndex] && servers[activeIndex].url.includes("facebook.com");
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

          {isMixedContent && !loading && !error && (
            <div className="absolute inset-0 z-20 bg-black/90 flex items-center justify-center p-4">
              <div className="bg-amber-500 text-black p-6 rounded-[2rem] flex flex-col gap-4 text-right shadow-2xl border-4 border-white/20 max-w-lg animate-in fade-in zoom-in duration-300">
                <div className="flex items-center justify-between gap-4">
                  <ShieldAlert size={40} className="shrink-0" />
                  <h3 className="text-xl font-black">تنبيه أمني: المتصفح يمنع البث</h3>
                </div>
                <div className="h-px bg-black/10 w-full" />
                <p className="text-sm font-bold leading-loose">
                  هذا الرابط يعمل بنظام <code className="bg-black/10 px-1 rounded">http</code> القديم، وبما أن موقعك يعمل بنظام <code className="bg-black/10 px-1 rounded">https</code> الآمن، فإن المتصفح يمنعه تلقائياً.
                </p>
                <div className="bg-white/20 p-4 rounded-2xl space-y-2">
                  <p className="font-black text-xs underline mb-2">الحل لتشغيل البث الآن:</p>
                  <ol className="text-xs font-bold space-y-2 list-decimal list-inside">
                    <li>اضغط على أيقونة القفل 🔒 أو الإعدادات بجانب رابط الموقع في الأعلى.</li>
                    <li>اختر <span className="bg-black/10 px-1">إعدادات الموقع</span> (Site Settings).</li>
                    <li>ابحث عن <span className="bg-black/10 px-1">المحتوى غير الآمن</span> (Insecure content).</li>
                    <li>غير الخيار إلى <span className="underline font-black">سماح</span> (Allow).</li>
                    <li>أعد تحميل الصفحة وسيعمل البث فوراً.</li>
                  </ol>
                </div>
                <button onClick={() => window.location.reload()} className="w-full bg-black text-white py-3 rounded-xl font-black flex items-center justify-center gap-2 hover:scale-105 transition-transform">
                  <RefreshCw size={18} /> تحديث الصفحة بعد الضبط
                </button>
              </div>
            </div>
          )}

          {showUnmuteHint && !loading && !isCurrentFB && (
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
              <button onClick={() => window.location.reload()} className="px-8 py-3 bg-indigo-600 text-white rounded-xl font-bold flex items-center gap-2 mx-auto"><RefreshCw size={18} /> إعادة المحاولة</button>
            </div>
          )}
        </div>
      </article>

      {isCurrentStream && !loading && !error && (
        <div className="mt-6 flex flex-col items-center gap-3">
          <button 
            onClick={toggleNativeMode}
            className={cn(
              "px-6 py-3 rounded-xl font-black text-sm flex items-center gap-2 transition-all shadow-lg",
              isNativeMode 
                ? "bg-emerald-600 text-white shadow-emerald-500/20" 
                : "bg-white/5 text-slate-400 border border-white/10 hover:bg-white/10"
            )}
          >
            <Zap size={18} className={isNativeMode ? "fill-white" : ""} />
            {isNativeMode ? "الوضع المباشر مفعل (لحل مشكلة الصورة)" : "تشغيل كبث مباشر (إذا ظهر الصوت فقط)"}
          </button>
          <p className="text-[10px] text-slate-500 font-bold">استخدم هذا الخيار إذا كنت تسمع الصوت ولا ترى الصورة في روابط TS</p>
        </div>
      )}

      <footer className="w-full max-w-[1200px] mt-12 px-4 text-center" dir="rtl">
        <p className="text-[8px] text-slate-600 font-bold uppercase tracking-widest">
          Koora Live Streaming Service - All Rights Reserved © 2026
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
      `}</style>
    </div>
  );
}