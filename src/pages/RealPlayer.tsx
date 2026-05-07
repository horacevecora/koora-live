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
    };
  }, []);

  /* ---- تنظيف المشغّل القديم ---- */
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
    if (!url) return null;
    const cleanUrl = url.split('?')[0].split('#')[0];
    const videoMatch = cleanUrl.match(/kick\.com\/(?:[^\/]+\/videos\/|video\/)([a-zA-Z0-9-]+)/i);
    if (videoMatch) return { type: 'video', id: videoMatch[1], fullUrl: cleanUrl };
    const channelMatch = cleanUrl.match(/kick\.com\/([a-zA-Z0-9_]+)/i);
    if (channelMatch && !['video', 'videos', 'clip'].includes(channelMatch[1].toLowerCase())) {
      return { type: 'channel', id: channelMatch[1], fullUrl: cleanUrl };
    }
    return null;
  };

  /* ---- وظيفة استخراج رابط m3u8 من كيك ---- */
  const extractKickM3u8 = async (url: string): Promise<string | null> => {
    try {
      // استخدام بروكسي لتجاوز CORS
      const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`;
      const response = await fetch(proxyUrl);
      const data = await response.json();
      const html = data.contents;

      // البحث عن النمط المطلوب: \"status\":\"public\",\"source\":\"رابط.m3u8\"
      const regex = /\\"status\\":\\"public\\",\\"source\\":\\"([^\\"]+)\\"/;
      const match = html.match(regex);
      
      if (match && match[1]) {
        // تنظيف الرابط من الـ backslashes
        return match[1].replace(/\\/g, '');
      }
      return null;
    } catch (err) {
      console.error("Extraction failed:", err);
      return null;
    }
  };

  /* ---- بناء المشغّل حسب نوع السيرفر ---- */
  const buildPlayer = useCallback(
    async (server: Server) => {
      const container = containerRef.current;
      if (!container) return;

      container.innerHTML = "";
      destroy();
      setLoading(true);
      setError(null);

      const kickInfo = getKickInfo(server.url);

      /* ── منطق كيك المطور (استخراج m3u8) ── */
      if (kickInfo && kickInfo.type === 'video') {
        const m3u8Url = await extractKickM3u8(kickInfo.fullUrl);
        if (m3u8Url) {
          // تشغيل الرابط المستخرج كمشغل m3u8
          playM3u8(m3u8Url, container);
          return;
        }
        // إذا فشل الاستخراج، نعود للـ iframe كحل أخير
      }

      /* ── بقية الأنواع ── */
      const ytId = getYouTubeId(server.url);
      const twitchChannel = getTwitchChannel(server.url);
      const isFB = server.url.includes("facebook.com") || server.url.includes("fb.watch");

      if (kickInfo && kickInfo.type === 'channel') {
        const ifr = document.createElement("iframe");
        ifr.src = `https://player.kick.com/${kickInfo.id}?autoplay=true`;
        ifr.style.width = "100%"; ifr.style.height = "100%"; ifr.style.border = "none";
        ifr.allowFullscreen = true;
        ifr.setAttribute("allow", "autoplay; fullscreen");
        container.appendChild(ifr);
        setLoading(false);
      } else if (twitchChannel) {
        const ifr = document.createElement("iframe");
        ifr.src = `https://player.twitch.tv/?channel=${twitchChannel}&parent=${window.location.hostname}&autoplay=true`;
        ifr.style.width = "100%"; ifr.style.height = "100%"; ifr.style.border = "none";
        ifr.allowFullscreen = true;
        container.appendChild(ifr);
        setLoading(false);
      } else if (ytId) {
        const ifr = document.createElement("iframe");
        ifr.src = `https://www.youtube.com/embed/${ytId}?autoplay=1`;
        ifr.style.width = "100%"; ifr.style.height = "100%"; ifr.style.border = "none";
        ifr.allowFullscreen = true;
        container.appendChild(ifr);
        setLoading(false);
      } else if (server.type === "m3u8" || server.url.includes(".m3u8")) {
        playM3u8(server.url, container);
      } else {
        // Iframe الافتراضي
        const ifr = document.createElement("iframe");
        ifr.src = server.url;
        ifr.style.width = "100%"; ifr.style.height = "100%"; ifr.style.border = "none";
        ifr.allowFullscreen = true;
        container.appendChild(ifr);
        setTimeout(() => setLoading(false), 1500);
      }
    },
    [destroy]
  );

  /* ---- وظيفة تشغيل m3u8 ---- */
  const playM3u8 = (url: string, container: HTMLElement) => {
    const video = document.createElement("video");
    video.playsInline = true;
    video.className = "w-full h-full";
    container.appendChild(video);

    const plyr = new Plyr(video, {
      controls: ["play-large", "play", "progress", "current-time", "mute", "volume", "settings", "pip", "fullscreen"],
      settings: ["quality", "speed"],
    });
    plyrRef.current = plyr;

    if (Hls.isSupported()) {
      const hls = new Hls();
      hlsRef.current = hls;
      hls.loadSource(url);
      hls.attachMedia(video);
      hls.on(Hls.Events.MANIFEST_PARSED, () => setLoading(false));
    } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
      video.src = url;
      video.addEventListener("loadedmetadata", () => setLoading(false));
    } else {
      setError("المتصفح لا يدعم m3u8.");
      setLoading(false);
    }
  };

  const switchServer = (index: number) => {
    setActiveIndex(index);
    buildPlayer(servers[index]);
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center p-2 sm:p-4 font-sans relative overflow-hidden">
      <div className="absolute top-4 left-4 right-4 flex justify-between items-center z-50 pointer-events-none">
        <div className="flex gap-6 items-center pointer-events-auto">
          <button onClick={() => {
            const newCount = clickCount + 1;
            if (newCount >= 3) navigate('/admin');
            else { setClickCount(newCount); setTimeout(() => setClickCount(0), 2000); }
          }} className="text-white/5 hover:text-white/10 p-1">
            <Settings size={8} />
          </button>
          <button onClick={() => {
            const elem = document.getElementById('main-player-wrapper');
            if (elem) {
              if (!document.fullscreenElement) elem.requestFullscreen().catch(() => {});
              else document.exitFullscreen();
            }
          }} className="text-white/80 hover:text-white p-2 bg-black/20 backdrop-blur-md rounded-full border border-white/10">
            <Maximize size={28} />
          </button>
        </div>
      </div>

      <div id="main-player-wrapper" className="w-full max-w-[950px] rounded-2xl overflow-hidden mt-8 shadow-2xl border border-white/5 bg-black flex-grow flex flex-col">
        <nav className="flex flex-wrap bg-slate-900/80 backdrop-blur border-b border-white/5" dir="rtl">
          {servers.map((srv, i) => (
            <button
              key={i}
              onClick={() => switchServer(i)}
              className={cn(
                "flex-1 min-w-[100px] px-4 py-4 text-sm sm:text-base font-bold transition-all",
                i === activeIndex ? "bg-indigo-600 text-white" : "text-slate-400 hover:bg-white/5"
              )}
            >
              {srv.name}
            </button>
          ))}
        </nav>

        <div className="relative w-full flex-grow bg-black aspect-video lg:aspect-auto">
          <div ref={containerRef} className="absolute inset-0 flex items-center justify-center" />
          
          {loading && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 z-10">
              <div className="w-12 h-12 rounded-full border-4 border-indigo-500/20 border-t-indigo-500 animate-spin" />
              <p className="mt-4 text-slate-300 text-sm">جارٍ استخراج البث وتشغيله...</p>
            </div>
          )}

          {error && !loading && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/90 z-10 p-6 text-center">
              <p className="text-red-400 font-bold mb-4">{error}</p>
              <button onClick={() => switchServer(activeIndex)} className="px-6 py-2 bg-indigo-600 text-white rounded-lg flex items-center gap-2">
                <RefreshCw size={18} /> إعادة المحاولة
              </button>
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