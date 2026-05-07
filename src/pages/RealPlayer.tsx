"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
// @ts-ignore
import Plyr from "plyr";
import Hls from "hls.js";
import "plyr/dist/plyr.css";
import { cn } from "@/lib/utils";
import { Settings, Maximize, RefreshCw } from "lucide-react";
import { useNavigate } from "react-router-dom";

/* ──────────────── النوعيات ──────────────── */

type ServerType = "iframe" | "m3u8" | "youtube" | "facebook" | "twitch" | "kick";

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

  /* ---- إعدادات الصفحة (الميتا تاج الضروري لفيسبوك ويوتيوب) ---- */
  useEffect(() => {
    const meta = document.createElement('meta');
    meta.name = "referrer";
    meta.content = "no-referrer";
    document.head.appendChild(meta);

    const saved = localStorage.getItem('player_servers');
    if (saved) {
      const parsed = JSON.parse(saved);
      setServers(parsed);
      if (parsed.length > 0) buildPlayer(parsed[0]);
    } else {
      const defaultServers: Server[] = [{ name: "سيرفر 1", url: "https://8.wwwkora.com/albaplayer/bein-sports-hd-1/?serv=1", type: "iframe" }];
      setServers(defaultServers);
      buildPlayer(defaultServers[0]);
    }

    return () => {
      document.head.removeChild(meta);
      destroy();
    };
  }, []);

  /* ---- تنظيف المشغّل ---- */
  const destroy = useCallback(() => {
    if (hlsRef.current) { hlsRef.current.destroy(); hlsRef.current = null; }
    if (plyrRef.current) { plyrRef.current.destroy(); plyrRef.current = null; }
  }, []);

  /* ---- استخراج رابط كيك في الخلفية ---- */
  const tryExtractKickStream = async (url: string): Promise<string | null> => {
    try {
      const response = await fetch(url);
      if (!response.ok) return null;
      const html = await response.text();
      const regex = /"source"\s*:\s*"([^"]+)"/;
      const match = html.match(regex);
      if (match && match[1]) return match[1].replace(/\\/g, '');
    } catch (e) { console.warn("Kick extraction failed", e); }
    return null;
  };

  /* ---- بناء المشغّل ---- */
  const buildPlayer = useCallback(
    async (server: Server) => {
      const container = containerRef.current;
      if (!container) return;

      container.innerHTML = "";
      destroy();
      setLoading(true);
      setError(null);

      let finalUrl = server.url;
      let isM3U8 = server.type === "m3u8" || server.url.includes(".m3u8");

      // منطق كيك: استخراج في الخلفية فقط
      if (server.url.includes("kick.com") && server.url.includes("/videos/")) {
        const extracted = await tryExtractKickStream(server.url);
        if (extracted) {
          finalUrl = extracted;
          isM3U8 = true;
        }
      }

      if (isM3U8) {
        const video = document.createElement("video");
        video.playsInline = true;
        video.setAttribute('referrerpolicy', 'no-referrer');
        video.className = "w-full h-full";
        container.appendChild(video);

        const plyr = new Plyr(video, { controls: ["play-large", "play", "progress", "current-time", "mute", "volume", "settings", "pip", "fullscreen"], ratio: "16:9" });
        plyrRef.current = plyr;

        if (Hls.isSupported()) {
          const hls = new Hls();
          hlsRef.current = hls;
          hls.loadSource(finalUrl);
          hls.attachMedia(video);
          hls.on(Hls.Events.MANIFEST_PARSED, () => setLoading(false));
        } else {
          video.src = finalUrl;
          video.addEventListener("loadedmetadata", () => setLoading(false));
        }
      } else {
        // النظام الأصلي المستقر (Iframe)
        if (finalUrl.includes('<iframe')) {
          container.innerHTML = finalUrl.replace('<iframe', '<iframe referrerpolicy="no-referrer" allowfullscreen');
          const ifr = container.querySelector('iframe');
          if (ifr) { ifr.style.width = '100%'; ifr.style.height = '100%'; ifr.style.objectFit = 'contain'; }
        } else {
          const ifr = document.createElement('iframe');
          ifr.src = finalUrl;
          ifr.setAttribute('referrerpolicy', 'no-referrer');
          ifr.style.width = '100%';
          ifr.style.height = '100%';
          ifr.style.objectFit = 'contain';
          ifr.allowFullscreen = true;
          container.appendChild(ifr);
        }
        setTimeout(() => setLoading(false), 1000);
      }
    },
    [destroy]
  );

  const switchServer = useCallback((index: number) => {
    if (servers[index]) { setActiveIndex(index); buildPlayer(servers[index]); }
  }, [buildPlayer, servers]);

  const handleSettingsClick = () => {
    const newCount = clickCount + 1;
    if (newCount >= 3) navigate('/admin');
    else { setClickCount(newCount); setTimeout(() => setClickCount(0), 2000); }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center p-2 sm:p-4 font-sans relative overflow-hidden">
      <div className="absolute top-4 left-4 right-4 flex justify-between items-center z-50 pointer-events-none">
        <div className="flex gap-6 items-center pointer-events-auto">
          <button onClick={handleSettingsClick} className="text-white/5 hover:text-white/10 p-1"><Settings size={8} /></button>
          <button onClick={() => {
            const elem = document.getElementById('main-player-wrapper');
            if (elem) { if (!document.fullscreenElement) elem.requestFullscreen().catch(()=>{}); else document.exitFullscreen(); }
          }} className="text-white/80 hover:text-white p-2 bg-black/20 backdrop-blur-md rounded-full border border-white/10">
            <Maximize size={28} />
          </button>
        </div>
      </div>

      <div id="main-player-wrapper" className="w-full max-w-[950px] rounded-2xl overflow-hidden mt-8 shadow-2xl border border-white/5 bg-black flex-grow flex flex-col">
        <nav className="flex flex-wrap bg-slate-900/80 backdrop-blur border-b border-white/5" dir="rtl">
          {servers.map((srv, i) => (
            <button key={i} onClick={() => switchServer(i)} className={cn("flex-1 min-w-[100px] px-4 py-4 text-sm sm:text-base font-bold transition-all", i === activeIndex ? "bg-indigo-600 text-white" : "text-slate-400 hover:bg-white/5")}>
              {srv.name}
            </button>
          ))}
        </nav>

        <div className="relative w-full flex-grow bg-black aspect-video lg:aspect-auto">
          <div ref={containerRef} className="absolute inset-0 flex items-center justify-center" />
          {loading && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 z-10">
              <div className="w-12 h-12 rounded-full border-4 border-indigo-500/20 border-t-indigo-500 animate-spin" />
              <p className="mt-4 text-slate-300 text-sm">جارٍ تشغيل البث...</p>
            </div>
          )}
        </div>
      </div>

      <footer className="w-full max-w-[950px] mt-auto pt-8 pb-4 flex justify-between items-center text-[11px] text-slate-500 px-4">
        <span dir="ltr">Koora Live - Kora Online</span>
        <span dir="rtl">كورة لايف - ماتش لايف</span>
      </footer>

      <style>{`
        :root { --plyr-color-main: #6366f1; }
        .plyr { width: 100%; height: 100%; }
        #main-player-wrapper:fullscreen { width: 100vw; height: 100vh; border-radius: 0; margin: 0; }
        #main-player-wrapper:fullscreen .aspect-video { height: calc(100vh - 56px); }
      `}</style>
    </div>
  );
}