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

type ServerType = "iframe" | "m3u8";

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

  /* ---- بناء المشغّل حسب نوع السيرفر ---- */
  const buildPlayer = useCallback(
    (server: Server) => {
      const container = containerRef.current;
      if (!container) return;

      /* تنظيف سابق */
      container.innerHTML = "";
      destroy();
      setLoading(true);
      setError(null);

      /* ── M3U8 ── */
      if (server.type === "m3u8") {
        const video = document.createElement("video");
        video.playsInline = true;
        video.setAttribute("referrerpolicy", "no-referrer");
        video.className = "w-full h-full object-fill";
        container.appendChild(video);

        // تهيئة Plyr
        const plyr = new Plyr(video, {
          controls: [
            "play-large", "play", "progress", "current-time", 
            "mute", "volume", "settings", "pip", "fullscreen"
          ],
          settings: ["quality", "speed"],
          ratio: "16:9",
        });
        plyrRef.current = plyr;

        // تهيئة Hls.js
        if (Hls.isSupported()) {
          const hls = new Hls();
          hlsRef.current = hls;
          hls.loadSource(server.url);
          hls.attachMedia(video);
          
          hls.on(Hls.Events.MANIFEST_PARSED, () => {
            setLoading(false);
          });

          hls.on(Hls.Events.ERROR, (_, data) => {
            if (data.fatal) {
              setError("تعذّر تشغيل البث. الرابط قد يكون متوقفاً.");
              setLoading(false);
            }
          });
        } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
          video.src = server.url;
          video.addEventListener("loadedmetadata", () => setLoading(false));
        } else {
          setError("المتصفح لا يدعم تشغيل بث m3u8.");
          setLoading(false);
        }

        return;
      }

      /* ── IFRAME ── */
      const url = server.url;
      if (url.includes("<iframe")) {
        container.innerHTML = url.replace("<iframe", '<iframe referrerpolicy="no-referrer" allowfullscreen');
        const ifr = container.querySelector("iframe");
        if (ifr) {
          ifr.style.width = "100%";
          ifr.style.height = "100%";
          ifr.style.border = "none";
          ifr.style.objectFit = "fill";
        }
      } else {
        const ifr = document.createElement("iframe");
        ifr.src = url;
        ifr.setAttribute("referrerpolicy", "no-referrer");
        ifr.allowFullscreen = true;
        ifr.style.width = "100%";
        ifr.style.height = "100%";
        ifr.style.border = "none";
        ifr.style.objectFit = "fill";
        container.appendChild(ifr);
      }

      const t = setTimeout(() => setLoading(false), 1500);
      return () => clearTimeout(t);
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
    if (newCount >= 3) {
      navigate('/admin');
    } else {
      setClickCount(newCount);
      setTimeout(() => setClickCount(0), 2000);
    }
  };

  const toggleFullScreen = () => {
    const elem = document.getElementById('main-player-wrapper');
    if (!elem) return;
    if (!document.fullscreenElement) {
      elem.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen();
    }
  };

  return (
    <div className="min-h-screen bg-[#020617] flex flex-col items-center p-4 md:p-12 font-sans relative overflow-hidden">
      {/* أزرار التحكم العلوية */}
      <div className="w-full max-w-[1000px] flex justify-between items-center mb-4 z-50">
        <div className="flex gap-4 items-center">
          <button onClick={handleSettingsClick} className="text-white/5 hover:text-white/10 p-1 transition-colors">
            <Settings size={12} />
          </button>
          <button onClick={toggleFullScreen} className="text-white/80 hover:text-white p-2 bg-slate-900/50 backdrop-blur-md rounded-xl border border-white/10 transition-all hover:scale-110">
            <Maximize size={24} />
          </button>
        </div>
        <div className="text-indigo-500 font-black italic text-xl">Koora Live</div>
      </div>

      {/* حاوية المشغل الرئيسية - تم تقليل العرض لزيادة الهوامش */}
      <div id="main-player-wrapper" className="w-full max-w-[1000px] rounded-[2rem] overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.5)] border border-white/5 bg-black flex flex-col">
        <nav className="flex flex-wrap bg-[#0f172a] border-b border-white/5" dir="rtl">
          {servers.map((srv, i) => (
            <button
              key={i}
              onClick={() => switchServer(i)}
              className={cn(
                "flex-1 min-w-[100px] px-4 py-5 text-sm sm:text-base font-bold transition-all border-l border-white/5 last:border-l-0",
                i === activeIndex ? "bg-indigo-600 text-white" : "text-slate-400 hover:bg-white/5"
              )}
            >
              {srv.name}
            </button>
          ))}
        </nav>

        <div className="relative w-full bg-black aspect-video">
          <div ref={containerRef} className="absolute inset-0 flex items-center justify-center overflow-hidden" />
          
          {loading && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 z-10">
              <div className="w-12 h-12 rounded-full border-4 border-indigo-500/20 border-t-indigo-500 animate-spin" />
              <p className="mt-4 text-slate-300 text-sm font-bold">جارٍ تحميل البث...</p>
            </div>
          )}

          {error && !loading && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/90 z-10 p-6 text-center">
              <p className="text-red-400 font-bold mb-4">{error}</p>
              <button onClick={() => switchServer(activeIndex)} className="px-6 py-2 bg-indigo-600 text-white rounded-lg font-bold">إعادة المحاولة</button>
            </div>
          )}
        </div>
      </div>

      {/* تذييل الصفحة */}
      <footer className="w-full max-w-[1000px] mt-12 pb-8 flex justify-between items-center text-[12px] text-slate-600 px-4 border-t border-white/5 pt-8">
        <span dir="ltr" className="font-medium tracking-widest">KOORA LIVE OFFICIAL</span>
        <span dir="rtl" className="font-bold">جميع الحقوق محفوظة © 2026</span>
      </footer>

      <style>{`
        :root { --plyr-color-main: #6366f1; }
        .plyr { width: 100%; height: 100%; }
        video, iframe { width: 100% !important; height: 100% !important; object-fit: fill !important; }
        #main-player-wrapper:fullscreen { width: 100vw; height: 100vh; border-radius: 0; max-width: none; }
        #main-player-wrapper:fullscreen .aspect-video { height: calc(100vh - 64px); aspect-ratio: auto; }
      `}</style>
    </div>
  );
}