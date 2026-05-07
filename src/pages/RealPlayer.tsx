"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
// @ts-ignore
import Plyr from "plyr";
import Hls from "hls.js";
import "plyr/dist/plyr.css";
import { cn } from "@/lib/utils";
import { Settings, Maximize } from "lucide-react";
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

    // 1. مقطع (Clip): kick.com/clip/ID
    const clipMatch = cleanUrl.match(/kick\.com\/clip\/([a-zA-Z0-9_-]+)/i);
    if (clipMatch) return { type: 'clip', id: clipMatch[1] };

    // 2. فيديو: kick.com/username/videos/ID أو kick.com/video/ID
    const videoMatch = cleanUrl.match(/kick\.com\/(?:[^\/]+\/videos\/|video\/)([a-zA-Z0-9-]+)/i);
    if (videoMatch) return { type: 'video', id: videoMatch[1] };
    
    // 3. قناة: kick.com/username
    const channelMatch = cleanUrl.match(/kick\.com\/([a-zA-Z0-9_]+)/i);
    if (channelMatch) {
      const slug = channelMatch[1].toLowerCase();
      if (!['video', 'videos', 'clip'].includes(slug)) return { type: 'channel', id: channelMatch[1] };
    }
    
    return null;
  };

  const isFacebookUrl = (url: string) => {
    return url.includes("facebook.com") || url.includes("fb.watch");
  };

  /* ---- بناء المشغّل حسب نوع السيرفر ---- */
  const buildPlayer = useCallback(
    (server: Server) => {
      const container = containerRef.current;
      if (!container) return;

      container.innerHTML = "";
      destroy();
      setLoading(true);
      setError(null);

      const ytId = getYouTubeId(server.url);
      const twitchChannel = getTwitchChannel(server.url);
      const kickInfo = getKickInfo(server.url);
      const isFB = isFacebookUrl(server.url);

      /* ── KICK ── */
      if (kickInfo || server.type === "kick") {
        const ifr = document.createElement("iframe");
        const info = kickInfo || { type: 'channel', id: server.url };
        const domain = window.location.hostname;
        
        let embedUrl = "";
        if (info.type === 'video') {
          embedUrl = `https://player.kick.com/video/${info.id}?autoplay=true`;
        } else if (info.type === 'clip') {
          embedUrl = `https://kick.com/embed/clip/${info.id}`;
        } else {
          embedUrl = `https://player.kick.com/${info.id}?autoplay=true`;
        }
        
        ifr.src = embedUrl;
        ifr.style.width = "100%";
        ifr.style.height = "100%";
        ifr.style.border = "none";
        ifr.allowFullscreen = true;
        // إضافة صلاحيات التضمين الكاملة مع تحديد المصدر
        ifr.setAttribute("allow", "autoplay; fullscreen; picture-in-picture; encrypted-media; gyroscope; accelerometer; clipboard-write");
        
        container.appendChild(ifr);
        setLoading(false);
        return;
      }

      /* ── TWITCH ── */
      if (twitchChannel || server.type === "twitch") {
        const ifr = document.createElement("iframe");
        const channel = twitchChannel || server.url;
        const domain = window.location.hostname;
        ifr.src = `https://player.twitch.tv/?channel=${channel}&parent=${domain}&autoplay=true&muted=false`;
        ifr.style.width = "100%";
        ifr.style.height = "100%";
        ifr.style.border = "none";
        ifr.allowFullscreen = true;
        container.appendChild(ifr);
        setLoading(false);
        return;
      }

      /* ── FACEBOOK ── */
      if (isFB || server.type === "facebook") {
        const ifr = document.createElement("iframe");
        const encodedUrl = encodeURIComponent(server.url);
        ifr.src = `https://www.facebook.com/plugins/video.php?href=${encodedUrl}&show_text=0&width=auto&autoplay=1&mute=0`;
        ifr.style.width = "100%";
        ifr.style.height = "100%";
        ifr.style.border = "none";
        ifr.allow = "autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share; fullscreen";
        ifr.setAttribute("allowfullscreen", "true");
        container.appendChild(ifr);
        setTimeout(() => setLoading(false), 1500);
        return;
      }

      /* ── YOUTUBE ── */
      if (ytId || server.type === "youtube") {
        const ifr = document.createElement("iframe");
        const id = ytId || server.url;
        ifr.src = `https://www.youtube.com/embed/${id}?rel=0&modestbranding=1&playsinline=1&autoplay=1`;
        ifr.allow = "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share";
        ifr.allowFullscreen = true;
        ifr.style.width = "100%";
        ifr.style.height = "100%";
        ifr.style.border = "none";
        container.appendChild(ifr);
        setTimeout(() => setLoading(false), 1000);
        return;
      }

      /* ── M3U8 ── */
      if (server.type === "m3u8" || server.url.includes(".m3u8")) {
        const video = document.createElement("video");
        video.playsInline = true;
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
            if (data.fatal) { setError("تعذّر تشغيل البث."); setLoading(false); }
          });
        } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
          video.src = server.url;
          video.addEventListener("loadedmetadata", () => setLoading(false));
        } else {
          setError("المتصفح لا يدعم m3u8.");
          setLoading(false);
        }
        return;
      }

      /* ── IFRAME ── */
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

  /* ---- التبديل بين السيرفرات ---- */
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
    <div className="min-h-screen bg-slate-950 flex flex-col items-center p-2 sm:p-4 font-sans relative overflow-hidden">
      <div className="absolute top-4 left-4 right-4 flex justify-between items-center z-50 pointer-events-none">
        <div className="flex gap-6 items-center pointer-events-auto">
          <button onClick={handleSettingsClick} className="text-white/5 hover:text-white/10 p-1">
            <Settings size={8} />
          </button>
          <button onClick={toggleFullScreen} className="text-white/80 hover:text-white p-2 bg-black/20 backdrop-blur-md rounded-full border border-white/10">
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
              <p className="mt-4 text-slate-300 text-sm">جارٍ تحميل البث...</p>
            </div>
          )}

          {error && !loading && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/90 z-10 p-6 text-center">
              <p className="text-red-400 font-bold mb-4">{error}</p>
              <button onClick={() => switchServer(activeIndex)} className="px-6 py-2 bg-indigo-600 text-white rounded-lg">إعادة المحاولة</button>
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