"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import * as Plyr from "plyr";
import Hls from "hls.js";
import "plyr/dist/plyr.css";
import { cn } from "@/lib/utils";
import { Settings, Maximize, Code2, RotateCcw } from "lucide-react";
import { useNavigate } from "react-router-dom";

/* ──────────────── النوعيات ──────────────── */

type ServerType = "iframe" | "m3u8";

interface Server {
  name: string;
  url: string;
  type: ServerType;
}

export default function RealPlayer() {
  const navigate = useNavigate();
  const containerRef = useRef<HTMLDivElement>(null);
  const plyrRef = useRef<any>(null);
  const hlsRef = useRef<Hls | null>(null);

  const [servers, setServers] = useState<Server[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [clickCount, setClickCount] = useState(0);

  /* ---- تحميل السيرفرات من localStorage ---- */
  useEffect(() => {
    const saved = localStorage.getItem('player_servers');
    if (saved) {
      const parsed = JSON.parse(saved);
      setServers(parsed);
      if (parsed.length > 0) {
        buildPlayer(parsed[0]);
      }
    } else {
      const defaultServers: Server[] = [
        { name: "بث 1", url: "https://8.wwwkora.com/albaplayer/bein-sports-hd-1/?serv=1", type: "iframe" },
        { name: "بث 2", url: "#", type: "iframe" },
        { name: "بث 3", url: "#", type: "iframe" },
        { name: "EN", url: "#", type: "iframe" },
        { name: "SP", url: "#", type: "iframe" },
        { name: "IT", url: "#", type: "iframe" },
        { name: "متعدد", url: "#", type: "iframe" }
      ];
      setServers(defaultServers);
      buildPlayer(defaultServers[0]);
    }
  }, []);

  /* ---- تنظيف المشغّل القديم ---- */
  const destroy = useCallback(() => {
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }
    if (plyrRef.current) {
      if (typeof plyrRef.current.destroy === 'function') {
        plyrRef.current.destroy();
      }
      plyrRef.current = null;
    }
  }, []);

  /* ---- بناء المشغّل حسب نوع السيرفر ---- */
  const buildPlayer = useCallback(
    (server: Server) => {
      const container = containerRef.current;
      if (!container) return;

      container.innerHTML = "";
      destroy();
      setLoading(true);
      setError(null);

      if (server.type === "m3u8") {
        const video = document.createElement("video");
        video.setAttribute("playsinline", "");
        video.setAttribute("referrerpolicy", "no-referrer");
        video.className = "w-full h-full";
        container.appendChild(video);

        // @ts-ignore
        const plyr = new window.Plyr(video, {
          controls: ["play-large", "play", "progress", "current-time", "mute", "volume", "settings", "fullscreen"],
          ratio: "16:9",
        });

        plyrRef.current = plyr;

        if (Hls.isSupported()) {
          const hls = new Hls();
          hlsRef.current = hls;
          hls.loadSource(server.url);
          hls.attachMedia(video);
          hls.on(Hls.Events.MANIFEST_PARSED, () => setLoading(false));
        } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
          video.src = server.url;
          video.addEventListener("loadedmetadata", () => setLoading(false));
        }
        return;
      }

      const ifr = document.createElement("iframe");
      ifr.src = server.url;
      ifr.setAttribute("referrerpolicy", "no-referrer");
      ifr.allowFullscreen = true;
      ifr.style.width = "100%";
      ifr.style.height = "100%";
      ifr.style.border = "none";
      container.appendChild(ifr);

      const t = setTimeout(() => setLoading(false), 1500);
      return () => clearTimeout(t);
    },
    [destroy]
  );

  const switchServer = (index: number) => {
    if (servers[index]) {
      setActiveIndex(index);
      buildPlayer(servers[index]);
    }
  };

  const handleSettingsClick = () => {
    const newCount = clickCount + 1;
    if (newCount >= 3) navigate('/admin');
    else {
      setClickCount(newCount);
      setTimeout(() => setClickCount(0), 2000);
    }
  };

  const toggleFullScreen = () => {
    const elem = document.getElementById('main-player-wrapper');
    if (!elem) return;
    if (!document.fullscreenElement) elem.requestFullscreen();
    else document.exitFullscreen();
  };

  return (
    <div
      dir="rtl"
      className="min-h-screen bg-[#020617] flex flex-col items-center p-2 sm:p-4 font-sans relative overflow-hidden"
    >
      {/* زر الإعدادات المخفي */}
      <button onClick={handleSettingsClick} className="absolute top-2 left-2 text-white/5 p-1 z-50">
        <Settings size={8} />
      </button>

      {/* زر التكبير العائم */}
      <button 
        onClick={toggleFullScreen}
        className="absolute top-4 left-4 text-white/60 hover:text-white z-50 bg-black/40 p-2 rounded-lg backdrop-blur-sm border border-white/10"
      >
        <Maximize size={24} />
      </button>

      {/* الغلاف الرئيسي - تم تكبيره لملء الشاشة */}
      <div
        id="main-player-wrapper"
        className="w-full max-w-[98vw] xl:max-w-[1400px] rounded-xl overflow-hidden shadow-2xl bg-black border border-white/5 mt-4"
      >
        {/* شريط العنوان العلوي (مثل الصورة) */}
        <div className="bg-[#4f46e5] py-2 flex items-center justify-center gap-2 text-white font-bold text-sm sm:text-base">
          <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
          {servers[activeIndex]?.name || "سيرفر 1"}
        </div>

        {/* شريط الأزرار (مثل الصورة) */}
        <div className="flex bg-[#0f172a] border-b border-white/10 p-1 gap-1 overflow-x-auto no-scrollbar">
          <button className="bg-[#1e293b] p-2 rounded text-white/70 hover:text-white">
            <Code2 size={18} />
          </button>
          {servers.map((srv, i) => (
            <button
              key={i}
              onClick={() => switchServer(i)}
              className={cn(
                "flex-1 min-w-[70px] py-2 px-3 rounded text-xs sm:text-sm font-bold transition-all",
                srv.name === "متعدد" 
                  ? "bg-red-700 text-white hover:bg-red-600" 
                  : i === activeIndex 
                    ? "bg-[#0d9488] text-white" 
                    : "bg-[#0d9488]/80 text-white/90 hover:bg-[#0d9488]"
              )}
            >
              {srv.name}
            </button>
          ))}
        </div>

        {/* منطقة المشغل */}
        <div className="relative w-full aspect-video bg-[#111] group">
          <div ref={containerRef} className="absolute inset-0" />
          
          {/* زر التحديث في الزاوية */}
          <button 
            onClick={() => switchServer(activeIndex)}
            className="absolute top-4 right-4 text-white/40 hover:text-white z-20 transition-colors"
          >
            <RotateCcw size={20} />
          </button>

          {/* نص "لا تنسى ذكر الله" */}
          <div className="absolute bottom-10 left-0 right-0 text-center pointer-events-none z-10">
            <h2 className="text-white/80 text-2xl sm:text-4xl font-bold drop-shadow-[0_2px_10px_rgba(0,0,0,0.8)]">
              لا تنسى ذكر الله
            </h2>
          </div>

          {loading && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm z-30">
              <div className="w-12 h-12 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin" />
            </div>
          )}
        </div>
      </div>

      {/* التذييل - تم إزاحته للأسفل */}
      <footer className="mt-auto py-10 text-center">
        <div className="px-4 py-1 border border-red-600/30 rounded bg-red-950/10">
          <p className="text-[11px] sm:text-xs text-slate-500 font-medium">
            Koora Live - Kora Online - كورة لايف - ماتش لايف
          </p>
        </div>
      </footer>

      <style>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        :root { --plyr-color-main: #0d9488; }
        #main-player-wrapper:fullscreen { max-width: none; width: 100vw; height: 100vh; border-radius: 0; margin-top: 0; }
        #main-player-wrapper:fullscreen .aspect-video { height: calc(100vh - 80px); aspect-ratio: auto; }
      `}</style>
    </div>
  );
}