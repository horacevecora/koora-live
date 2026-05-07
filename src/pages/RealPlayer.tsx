"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import * as PlyrModule from "plyr";
import Hls from "hls.js";
import "plyr/dist/plyr.css";
import { cn } from "@/lib/utils";
import { Settings, Maximize, ChevronLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

// تصحيح استيراد Plyr للتعامل مع عدم وجود default export في بعض البيئات
const Plyr = (PlyrModule as any).default || PlyrModule;

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
        {
          name: "سيرفر 1 – beIN HD1",
          url: "https://8.wwwkora.com/albaplayer/bein-sports-hd-1/?serv=1",
          type: "iframe",
        }
      ];
      setServers(defaultServers);
      buildPlayer(defaultServers[0]);
    }
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

        const plyr = new Plyr(video, {
          controls: ["play-large", "play", "progress", "current-time", "mute", "volume", "settings", "pip", "fullscreen"],
          settings: ["quality", "speed"],
          ratio: "16:9",
        });

        plyrRef.current = plyr;

        if (Hls.isSupported()) {
          const hls = new Hls();
          hlsRef.current = hls;
          hls.loadSource(server.url);
          hls.attachMedia(video);
          hls.on(Hls.Events.MANIFEST_PARSED, () => setLoading(false));
          hls.on(Hls.Events.ERROR, (_, data) => {
            if (data.fatal) {
              setError("خطأ في تحميل البث");
              setLoading(false);
            }
          });
        } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
          video.src = server.url;
          video.addEventListener("loadedmetadata", () => setLoading(false));
        }
        return;
      }

      const url = server.url;
      if (url.includes("<iframe")) {
        container.innerHTML = url.replace("<iframe", '<iframe referrerpolicy="no-referrer" allowfullscreen');
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
    if (!document.fullscreenElement) elem.requestFullscreen().catch(() => {});
    else document.exitFullscreen();
  };

  return (
    <div dir="rtl" className="min-h-screen bg-[#020617] flex flex-col items-center justify-center p-0 sm:p-2 font-sans relative overflow-hidden">
      <div className="absolute top-4 left-4 right-4 flex justify-between items-center z-50 pointer-events-none">
        <div className="flex gap-4 items-center pointer-events-auto">
          <button onClick={() => navigate('/')} className="text-white/60 hover:text-white p-2 bg-white/5 backdrop-blur-md rounded-full border border-white/10">
            <ChevronLeft size={24} />
          </button>
          <button onClick={handleSettingsClick} className="text-white/5 p-1"><Settings size={10} /></button>
        </div>
        <div className="pointer-events-auto">
          <button onClick={toggleFullScreen} className="text-white/80 hover:text-white p-2.5 bg-indigo-600/20 backdrop-blur-md rounded-full border border-indigo-500/30 shadow-lg shadow-indigo-500/10">
            <Maximize size={24} />
          </button>
        </div>
      </div>

      <div id="main-player-wrapper" className="w-full max-w-[1400px] h-screen sm:h-auto sm:aspect-video bg-black flex flex-col">
        <nav className="flex flex-wrap bg-slate-900/90 backdrop-blur-xl border-b border-white/10">
          {servers.map((srv, i) => (
            <button key={i} onClick={() => switchServer(i)} className={cn(
              "flex-1 min-w-[100px] py-3 sm:py-4 text-xs sm:text-sm font-bold transition-all border-l border-white/5 last:border-l-0",
              i === activeIndex ? "bg-indigo-600 text-white" : "text-slate-400 hover:bg-white/5"
            )}>
              {srv.name}
            </button>
          ))}
        </nav>

        <div className="relative flex-1 bg-black overflow-hidden">
          <div ref={containerRef} className="absolute inset-0 flex items-center justify-center" />
          {loading && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/90 z-10">
              <div className="w-12 h-12 rounded-full border-4 border-indigo-500/20 border-t-indigo-500 animate-spin" />
            </div>
          )}
          {error && !loading && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/95 z-10 p-6">
              <p className="text-red-400 text-lg font-bold mb-4">{error}</p>
              <button onClick={() => switchServer(activeIndex)} className="px-6 py-2 rounded-xl bg-indigo-600 text-white font-bold">إعادة المحاولة</button>
            </div>
          )}
        </div>
      </div>

      <style>{`
        :root { --plyr-color-main: #6366f1; }
        .plyr { width: 100%; height: 100%; }
        #main-player-wrapper:fullscreen { max-width: none; width: 100vw; height: 100vh; }
        #main-player-wrapper:fullscreen nav { display: none; }
      `}</style>
    </div>
  );
}