"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
// @ts-ignore
import Plyr from "plyr";
import Hls from "hls.js";
import "plyr/dist/plyr.css";
import { cn } from "@/lib/utils";
import { Settings, Maximize, Volume2 } from "lucide-react";
import { useNavigate } from "react-router-dom";

/* ──────────────── النوعيات ──────────────── */

type ServerType = "iframe" | "m3u8" | "youtube" | "facebook" | "twitch" | "kick" | "dailymotion";

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

  const [servers, setServers] = useState<Server[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [clickCount, setClickCount] = useState(0);
  const [showUnmuteHint, setShowUnmuteHint] = useState(false);

  /* ---- إدارة سياسة المرجع (Referrer Policy) ---- */
  useEffect(() => {
    const meta = document.createElement('meta');
    meta.name = "referrer";
    meta.content = "no-referrer";
    document.head.appendChild(meta);

    const saved = localStorage.getItem('player_servers');
    if (saved) {
      const parsed = JSON.parse(saved);
      setServers(parsed);
      if (parsed.length > 0) {
        buildPlayer(parsed[0]);
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
      buildPlayer(defaultServers[0]);
    }

    return () => {
      destroy();
      if (document.head.contains(meta)) {
        document.head.removeChild(meta);
      }
    };
  }, []);

  const destroy = useCallback(() => {
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }
    if (plyrRef.current) {
      plyrRef.current.destroy();
      plyrRef.current = null;
    }
  }, []);

  const getDailymotionId = (url: string) => {
    const match = url.match(/(?:dailymotion\.com(?:\/video|\/embed\/video|\/cdn\/live\/video\/)|\/dai\.ly|cdndirector\.dailymotion\.com\/cdn\/live\/video\/)([a-zA-Z0-9]+)/);
    return match ? match[1] : null;
  };

  const buildPlayer = useCallback(
    (server: Server) => {
      const container = containerRef.current;
      if (!container) return;

      container.innerHTML = "";
      destroy();
      setLoading(true);
      setError(null);
      setShowUnmuteHint(false);

      const url = server.url.trim();
      const dmId = getDailymotionId(url);

      // إذا كان الرابط لـ Dailymotion (سواء مباشر أو صفحة فيديو)
      if (dmId) {
        const ifr = document.createElement("iframe");
        // استخدام الـ embed التقليدي مع إخفاء المرجع تماماً
        ifr.src = `https://www.dailymotion.com/embed/video/${dmId}?autoplay=1&mute=1`;
        ifr.setAttribute("referrerpolicy", "no-referrer");
        ifr.style.width = "100%";
        ifr.style.height = "100%";
        ifr.style.border = "none";
        ifr.allowFullscreen = true;
        ifr.allow = "autoplay; fullscreen; picture-in-picture";
        container.appendChild(ifr);
        setLoading(false);
        setShowUnmuteHint(true);
        return;
      }

      /* 1. روابط M3U8 الأخرى */
      if (url.includes(".m3u8") || server.type === "m3u8") {
        const video = document.createElement("video");
        video.playsInline = true;
        video.setAttribute("referrerpolicy", "no-referrer");
        video.className = "w-full h-full";
        container.appendChild(video);

        const plyr = new Plyr(video, {
          controls: ["play-large", "play", "progress", "current-time", "mute", "volume", "settings", "pip", "fullscreen"],
          ratio: "16:9",
        });
        plyrRef.current = plyr;

        if (Hls.isSupported()) {
          const hls = new Hls({ xhrSetup: (xhr) => { xhr.withCredentials = false; } });
          hlsRef.current = hls;
          hls.loadSource(url);
          hls.attachMedia(video);
          hls.on(Hls.Events.MANIFEST_PARSED, () => setLoading(false));
        } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
          video.src = url;
          video.addEventListener("loadedmetadata", () => setLoading(false));
        }
        return;
      }

      /* 2. IFRAME عام */
      if (url.includes("<iframe")) {
        container.innerHTML = url.replace("<iframe", `<iframe referrerpolicy="no-referrer" allowfullscreen`);
        const ifr = container.querySelector("iframe");
        if (ifr) { ifr.style.width = "100%"; ifr.style.height = "100%"; ifr.style.border = "none"; }
      } else {
        const ifr = document.createElement("iframe");
        ifr.src = url;
        ifr.setAttribute("referrerpolicy", "no-referrer");
        ifr.allowFullscreen = true;
        ifr.style.width = "100%";
        ifr.style.height = "100%";
        ifr.style.border = "none";
        container.appendChild(ifr);
      }

      setTimeout(() => setLoading(false), 1500);
    },
    [destroy]
  );

  const switchServer = useCallback(
    (index: number) => {
      if (servers[index]) {
        setActiveIndex(index);
        buildPlayer(servers[index]);
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

  return (
    <div className="min-h-screen bg-[#020617] flex flex-col items-center pt-16 px-6 md:px-24 pb-6 font-sans relative overflow-hidden">
      <div className="absolute top-4 left-12 right-12 flex justify-between items-center z-50 pointer-events-none">
        <div className="flex gap-6 items-center pointer-events-auto">
          <button onClick={handleSettingsClick} className="text-white/5 hover:text-white/10 p-1">
            <Settings size={8} />
          </button>
          <button onClick={toggleFullScreen} className="text-white/80 hover:text-white p-2 bg-black/20 backdrop-blur-md rounded-full border border-white/10">
            <Maximize size={28} />
          </button>
        </div>
      </div>

      <div 
        id="main-player-wrapper" 
        className="w-full max-w-[1200px] rounded-2xl mt-4 bg-black flex flex-col relative transition-all duration-500 border border-indigo-500/30 shadow-[0_0_25px_rgba(99,102,241,0.25)]"
      >
        <nav className="flex flex-wrap bg-slate-900/80 backdrop-blur border-b border-white/5 rounded-t-2xl overflow-hidden" dir="rtl">
          {servers.map((srv, i) => (
            <button
              key={i}
              onClick={() => switchServer(i)}
              className={cn(
                "flex-1 min-w-[120px] px-4 py-4 text-xs sm:text-sm font-extrabold transition-all flex items-center justify-center gap-2 border-l border-white/5",
                i === activeIndex ? "bg-indigo-600 text-white" : "text-slate-400 hover:bg-white/5"
              )}
            >
              {i === activeIndex && (
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                </span>
              )}
              <span className="truncate">{srv.name}</span>
            </button>
          ))}
        </nav>

        <div 
          className="relative w-full bg-black aspect-video rounded-b-2xl overflow-hidden"
          onClick={() => setShowUnmuteHint(false)}
        >
          <div ref={containerRef} className="absolute inset-0 flex items-center justify-center" />
          
          {loading && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 z-10">
              <div className="w-12 h-12 rounded-full border-4 border-indigo-500/20 border-t-indigo-500 animate-spin" />
              <p className="mt-4 text-slate-300 text-sm font-bold">جارٍ تحميل البث...</p>
            </div>
          )}

          {showUnmuteHint && !loading && (
            <div 
              className="absolute bottom-20 left-1/2 -translate-x-1/2 z-20 bg-indigo-600 text-white px-6 py-3 rounded-full flex items-center gap-3 shadow-2xl animate-bounce cursor-pointer"
              onClick={(e) => { e.stopPropagation(); setShowUnmuteHint(false); }}
            >
              <Volume2 size={20} />
              <span className="font-black text-sm">انقر لتشغيل الصوت</span>
            </div>
          )}

          {error && !loading && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/90 z-10 p-6 text-center">
              <p className="text-red-400 font-black mb-4">{error}</p>
              <button onClick={() => switchServer(activeIndex)} className="px-8 py-3 bg-indigo-600 text-white rounded-xl font-bold">إعادة المحاولة</button>
            </div>
          )}
        </div>
      </div>

      <footer className="w-full max-w-[1200px] mt-6 pb-4 flex flex-col items-center gap-2 text-[11px] text-slate-500 px-4">
        <div className="flex justify-between w-full items-center opacity-40">
          <span dir="ltr" className="font-black tracking-tight">Koora Live - Kora Online</span>
          <span dir="rtl" className="font-black">كورة لايف - ماتش لايف</span>
        </div>
      </footer>

      <style>{`
        :root { --plyr-color-main: #6366f1; }
        .plyr { width: 100%; height: 100%; }
        #main-player-wrapper:fullscreen { width: 100vw; height: 100vh; border-radius: 0; margin: 0; display: flex; align-items: center; justify-content: center; background: #000; box-shadow: none; border: none; }
        #main-player-wrapper:fullscreen .aspect-video { width: 100%; height: auto; max-height: 100vh; border-radius: 0; }
      `}</style>
    </div>
  );
}