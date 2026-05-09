"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
// @ts-ignore
import Plyr from "plyr";
import Hls from "hls.js";
// @ts-ignore
import mpegts from "mpegts.js";
import "plyr/dist/plyr.css";
import { cn } from "@/lib/utils";
import { Settings, Maximize, Volume2, RefreshCw, AlertTriangle, WifiOff, Zap, Play } from "lucide-react";
import { useNavigate } from "react-router-dom";

/* ──────────────── النوعيات ──────────────── */

type ServerType = "iframe" | "m3u8" | "ts" | "youtube" | "facebook" | "twitch" | "kick" | "raw";

interface Server {
  name: string;
  url: string;
  type: ServerType;
}

export default function RealPlayer() {
  const navigate = useNavigate();
  const containerRef = useRef<HTMLDivElement>(null);
  const plyrRef = useRef<Plyr | null>(null);
  const hlsRef = useRef<Hls | null>(null);
  const mpegtsRef = useRef<any>(null);

  const [servers, setServers] = useState<Server[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [clickCount, setClickCount] = useState(0);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [retryCount, setRetryCount] = useState(0);
  const [isCodecUnsupported, setIsCodecUnsupported] = useState(false);
  const [hasInteracted, setHasInteracted] = useState(false);

  /* ---- مراقبة حالة الإنترنت ---- */
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  /* ---- تحميل السيرفرات من localStorage ---- */
  useEffect(() => {
    const saved = localStorage.getItem('player_servers');
    if (saved) {
      const parsed = JSON.parse(saved);
      setServers(parsed);
      if (parsed.length > 0) {
        buildPlayer(parsed[0], false);
      }
    } else {
      const defaultServers: Server[] = [
        {
          name: "سيرفر 1 – beIN HD1",
          url: "https://8.wwwkora.com/albaplayer/bein-sports-hd-1/?serv=1",
          type: "iframe",
        }
      ];
      setServers(defaultServers);
      buildPlayer(defaultServers[0], false);
    }

    return () => {
      destroy();
    };
  }, []);

  /* ---- تنظيف المشغّل القديم ---- */
  const destroy = useCallback(() => {
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

  /* ---- استخراج المعرفات من الروابط ---- */
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

  const isFacebookUrl = (url: string) => {
    return url.includes("facebook.com") || url.includes("fb.watch");
  };

  /* ---- بناء المشغّل حسب نوع السيرفر ---- */
  const buildPlayer = useCallback(
    (server: Server, forceNative = false) => {
      const container = containerRef.current;
      if (!container) return;

      container.style.opacity = "0";
      
      setTimeout(() => {
        container.innerHTML = "";
        destroy();
        setLoading(true);
        setError(null);
        setIsCodecUnsupported(false);
        
        const url = server.url.trim();
        
        const isIPTVPort = url.includes(":2086") || url.includes(":8080") || url.includes(":8000") || url.includes(":8789") || url.includes(":25461");
        const isTS = url.includes(".ts") || url.includes("extension=ts") || url.includes("/live.php") || isIPTVPort || / \/\d+$/.test(url);
        const isM3U8 = url.includes(".m3u8") || server.type === "m3u8";
        const isRawStream = url.includes("stream") || url.includes("type=http") || url.includes("nocache") || isTS;

        /* 1. دعم روابط البث المباشر الخام و IPTV (TS) */
        if (isRawStream && !isM3U8 && !url.includes("<iframe")) {
          const video = document.createElement("video");
          video.playsInline = true;
          video.autoplay = false; // إيقاف التشغيل التلقائي
          video.controls = true;
          video.className = "w-full h-full bg-black object-contain live-video-element";
          video.setAttribute("crossorigin", "anonymous");
          video.setAttribute("referrerpolicy", "no-referrer");
          container.appendChild(video);

          video.onwaiting = () => setLoading(true);
          video.onplaying = () => {
            setLoading(false);
            setRetryCount(0);
            container.style.opacity = "1";
          };
          
          video.onerror = () => {
            if (retryCount < 3) {
              setRetryCount(prev => prev + 1);
              setTimeout(() => buildPlayer(server, forceNative), 2000);
            } else {
              setError("فشل الاتصال بالسيرفر");
              setLoading(false);
            }
          };

          if (forceNative || !mpegts.getFeatureList().mseLivePlayback) {
            video.src = url;
            setLoading(false);
            container.style.opacity = "1";
            return;
          }

          if (isTS) {
            try {
              const player = mpegts.createPlayer({ 
                type: 'mpegts', isLive: true, url: url, cors: true
              }, {
                enableWorker: true, 
                enableStashBuffer: true, 
                stashInitialSize: 1024 * 1024,
                liveBufferLatencyChasing: false,
                autoCleanupSourceBuffer: true, 
              });
              mpegtsRef.current = player;
              player.attachMediaElement(video);
              player.load();
              setLoading(false);
              container.style.opacity = "1";
            } catch (e) {
              buildPlayer(server, true);
            }
          } else {
            video.src = url;
            setLoading(false);
            container.style.opacity = "1";
          }
          return;
        }

        /* 2. روابط M3U8 المباشرة */
        if (isM3U8) {
          const video = document.createElement("video");
          video.playsInline = true;
          video.autoplay = false; // إيقاف التشغيل التلقائي
          video.setAttribute("referrerpolicy", "no-referrer");
          video.className = "w-full h-full";
          container.appendChild(video);

          const plyr = new Plyr(video, {
            controls: ["play-large", "play", "mute", "volume", "settings", "pip", "fullscreen"],
            autoplay: false, // إيقاف التشغيل التلقائي في Plyr
          });
          plyrRef.current = plyr;

          const startHls = () => {
            if (Hls.isSupported()) {
              const hls = new Hls({ 
                xhrSetup: (xhr) => { xhr.withCredentials = false; },
                liveSyncDurationCount: 6,
                enableWorker: true
              });
              hlsRef.current = hls;
              hls.loadSource(url);
              hls.attachMedia(video);
              hls.on(Hls.Events.MANIFEST_PARSED, () => {
                setLoading(false);
                container.style.opacity = "1";
              });
            } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
              video.src = url;
              setLoading(false);
              container.style.opacity = "1";
            }
          };
          startHls();
          return;
        }

        /* 3. روابط المنصات و IFRAME */
        const ytId = getYouTubeId(url);
        const twitchChannel = getTwitchChannel(url);
        const kickInfo = getKickInfo(url);
        const isFB = isFacebookUrl(url);

        if (kickInfo || twitchChannel || isFB || ytId || url.includes("<iframe")) {
          // للمنصات الخارجية، نترك التحكم للمنصة نفسها ولكن نحاول إيقاف التشغيل التلقائي
          if (kickInfo) {
            const ifr = document.createElement("iframe");
            const embedPath = kickInfo.type === 'video' ? `video/${kickInfo.id}` : kickInfo.id;
            ifr.src = `https://player.kick.com/${embedPath}?autoplay=false&muted=false`;
            ifr.style.width = "100%"; ifr.style.height = "100%"; ifr.style.border = "none";
            ifr.allow = "fullscreen"; ifr.allowFullscreen = true;
            container.appendChild(ifr);
          } else if (twitchChannel) {
            const ifr = document.createElement("iframe");
            ifr.src = `https://player.twitch.tv/?channel=${twitchChannel}&parent=${window.location.hostname}&autoplay=false`;
            ifr.style.width = "100%"; ifr.style.height = "100%"; ifr.style.border = "none";
            ifr.allow = "fullscreen"; ifr.allowFullscreen = true;
            container.appendChild(ifr);
          } else if (isFB) {
            const ifr = document.createElement("iframe");
            ifr.src = `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(url)}&show_text=0&autoplay=0&allowfullscreen=true`;
            ifr.style.width = "100%"; ifr.style.height = "100%"; ifr.style.border = "none";
            ifr.allow = "fullscreen"; ifr.allowFullscreen = true;
            container.appendChild(ifr);
          } else if (ytId) {
            const wrapper = document.createElement("div");
            wrapper.className = "youtube-crop-wrapper";
            const ifr = document.createElement("iframe");
            ifr.src = `https://www.youtube.com/embed/${ytId}?rel=0&modestbranding=1&autoplay=0&controls=1`;
            ifr.allow = "fullscreen"; ifr.allowFullscreen = true;
            wrapper.appendChild(ifr);
            container.appendChild(wrapper);
          } else if (url.includes("<iframe")) {
            container.innerHTML = url.replace("<iframe", '<iframe referrerpolicy="no-referrer" allow="fullscreen" allowfullscreen');
            const ifr = container.querySelector("iframe");
            if (ifr) { ifr.style.width = "100%"; ifr.style.height = "100%"; ifr.style.border = "none"; }
          } else {
            const ifr = document.createElement("iframe");
            ifr.src = url; ifr.setAttribute("referrerpolicy", "no-referrer");
            ifr.allow = "fullscreen"; ifr.allowFullscreen = true;
            ifr.style.width = "100%"; ifr.style.height = "100%"; ifr.style.border = "none";
            container.appendChild(ifr);
          }
          setTimeout(() => {
            setLoading(false);
            container.style.opacity = "1";
          }, 1000);
          return;
        }
      }, 300);
    },
    [destroy, retryCount]
  );

  /* ---- التبديل بين السيرفرات ---- */
  const switchServer = useCallback(
    (index: number) => {
      if (servers[index]) {
        setHasInteracted(true);
        setRetryCount(0);
        setActiveIndex(index);
        buildPlayer(servers[index], false);
      }
    },
    [buildPlayer, servers]
  );

  const handleSettingsClick = () => {
    const newCount = clickCount + 1;
    if (newCount >= 3) { navigate('/admin'); } 
    else { setClickCount(newCount); setTimeout(() => setClickCount(0), 2000); }
  };

  const toggleFullScreen = () => {
    const elem = document.getElementById('main-player-wrapper');
    if (!elem) return;
    if (!document.fullscreenElement) { elem.requestFullscreen().catch(() => {}); } 
    else { document.exitFullscreen(); }
  };

  const refreshStream = () => {
    setRetryCount(0);
    buildPlayer(servers[activeIndex], false);
  };

  return (
    <div className="min-h-screen bg-[#020617] flex flex-col items-center pt-16 px-6 md:px-24 pb-6 font-sans relative overflow-hidden">
      {/* تنبيه انقطاع الإنترنت */}
      {!isOnline && (
        <div className="fixed top-0 left-0 right-0 bg-red-600 text-white py-2 px-4 z-[100] flex items-center justify-center gap-2 animate-slide-down">
          <WifiOff size={18} />
          <span className="font-bold text-sm">أنت غير متصل بالإنترنت.</span>
        </div>
      )}

      <div className="absolute top-4 left-12 right-12 flex justify-between items-center z-50 pointer-events-none">
        <div className="flex gap-4 items-center pointer-events-auto">
          <button onClick={handleSettingsClick} className="text-white/5 hover:text-white/10 p-1">
            <Settings size={8} />
          </button>
          <div className="flex gap-2 bg-black/40 backdrop-blur-xl p-1.5 rounded-2xl border border-white/10 shadow-2xl">
            <button 
              onClick={refreshStream} 
              className="text-white/80 hover:text-white p-2 hover:bg-white/10 rounded-xl transition-all"
              title="تحديث البث"
            >
              <RefreshCw size={22} className={cn(loading && "animate-spin")} />
            </button>
            <button 
              onClick={toggleFullScreen} 
              className="text-white/80 hover:text-white p-2 hover:bg-white/10 rounded-xl transition-all"
              title="ملء الشاشة"
            >
              <Maximize size={22} />
            </button>
          </div>
        </div>
      </div>

      <div 
        id="main-player-wrapper" 
        className="w-full max-w-[1200px] bg-black flex flex-col relative border border-indigo-500/30 shadow-[0_0_50px_rgba(99,102,241,0.15)] rounded-3xl mt-4"
      >
        <nav className="flex flex-wrap bg-slate-900/90 backdrop-blur-2xl border-b border-white/5 overflow-hidden rounded-t-3xl" dir="rtl">
          {servers.map((srv, i) => (
            <button
              key={i}
              onClick={() => switchServer(i)}
              className={cn(
                "flex-1 min-w-[100px] px-4 py-3 text-[11px] sm:text-xs font-black transition-all flex items-center justify-center gap-2 border-l border-white/5",
                i === activeIndex ? "bg-indigo-600 text-white shadow-[inset_0_0_20px_rgba(0,0,0,0.2)]" : "text-slate-400 hover:bg-white/5"
              )}
            >
              {i === activeIndex && (
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
              )}
              {srv.name}
            </button>
          ))}
        </nav>

        <div className="relative w-full bg-black aspect-video overflow-hidden">
          <div 
            ref={containerRef} 
            className="absolute inset-0 flex items-center justify-center transition-opacity duration-500" 
          />
          
          {loading && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/90 z-10 backdrop-blur-sm">
              <div className="w-12 h-12 rounded-full border-4 border-indigo-500/10 border-t-indigo-500 animate-spin" />
              <p className="mt-4 text-white text-xs font-black tracking-widest uppercase animate-pulse">جاري التحميل...</p>
            </div>
          )}

          {!hasInteracted && !loading && (
            <div 
              className="absolute inset-0 flex flex-col items-center justify-center bg-black/40 z-20 cursor-pointer group"
              onClick={() => {
                setHasInteracted(true);
                const video = containerRef.current?.querySelector('video');
                if (video) video.play();
              }}
            >
              <div className="w-20 h-20 bg-indigo-600 rounded-full flex items-center justify-center shadow-2xl group-hover:scale-110 transition-transform">
                <Play size={40} fill="white" className="text-white ml-1" />
              </div>
              <p className="mt-4 text-white font-black text-sm drop-shadow-lg">انقر لبدء المشاهدة</p>
            </div>
          )}

          {error && !loading && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/95 z-10 p-8 text-center backdrop-blur-md">
              <AlertTriangle className="text-red-500 mx-auto mb-4" size={48} />
              <h3 className="text-white font-black text-lg mb-2">حدث خطأ في السيرفر</h3>
              <button 
                onClick={refreshStream} 
                className="px-8 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-black flex items-center gap-2"
              >
                <RefreshCw size={18} /> إعادة المحاولة
              </button>
            </div>
          )}
        </div>
      </div>

      <footer className="w-full max-w-[1200px] mt-10 pb-6 flex flex-col items-center gap-4 text-[11px] text-slate-500 px-4">
        <div className="flex justify-between w-full items-center opacity-30 border-t border-white/5 pt-6">
          <span dir="ltr" className="font-black tracking-tighter text-sm">KOORA LIVE PREMIUM PLAYER</span>
          <div className="flex gap-4">
            <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
            <span dir="rtl" className="font-black">نظام البث المستقر v2.0</span>
          </div>
        </div>
      </footer>

      <style>{`
        :root { --plyr-color-main: #6366f1; }
        .plyr { width: 100%; height: 100%; }
        .live-video-element::-webkit-media-controls-timeline,
        .live-video-element::-webkit-media-controls-current-time-display,
        .live-video-element::-webkit-media-controls-time-remaining-display {
          display: none !important;
        }
        #main-player-wrapper:fullscreen { width: 100vw; height: 100vh; border-radius: 0; margin: 0; display: flex; align-items: center; justify-content: center; background: #000; box-shadow: none; border: none; }
        
        .youtube-crop-wrapper {
          position: relative;
          width: 100%;
          height: 100%;
          overflow: hidden;
          background: #000;
        }
        .youtube-crop-wrapper iframe {
          position: absolute;
          width: 120%;
          height: 120%;
          top: -10%;
          left: -10%;
          border: none;
        }

        @keyframes slide-down {
          from { transform: translateY(-100%); }
          to { transform: translateY(0); }
        }
        .animate-slide-down { animation: slide-down 0.4s cubic-bezier(0.16, 1, 0.3, 1); }
      `}</style>
    </div>
  );
}