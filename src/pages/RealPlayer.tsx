"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
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
        video.setAttribute("playsinline", "");
        video.setAttribute("referrerpolicy", "no-referrer");
        video.className = "w-full h-full";
        container.appendChild(video);

        const plyr = new Plyr(video, {
          controls: [
            "play-large",
            "play",
            "progress",
            "current-time",
            "mute",
            "volume",
            "captions",
            "settings",
            "pip",
            "airplay",
            "fullscreen",
          ],
          settings: ["quality", "speed", "loop"],
          speed: { selected: 1, options: [0.5, 0.75, 1, 1.25, 1.5, 2] },
          fullscreen: { enabled: true, fallback: true, iosNative: true },
          ratio: "16:9",
        });

        plyrRef.current = plyr;

        const handleFullscreenEnter = () => {
          if (
            typeof screen !== "undefined" &&
            screen.orientation &&
            (screen.orientation as any).lock
          ) {
            (screen.orientation as any).lock("landscape").catch(() => {});
          }
        };

        plyr.on("enterfullscreen", handleFullscreenEnter);

        if (Hls.isSupported()) {
          const hls = new Hls({
            enableWorker: true,
            lowLatencyMode: false,
          });
          hlsRef.current = hls;

          hls.loadSource(server.url);
          hls.attachMedia(video);

          hls.on(Hls.Events.MANIFEST_PARSED, () => {
            setLoading(false);
          });

          hls.on(Hls.Events.ERROR, (_event, data) => {
            if (data.fatal) {
              setError("تعذّر تشغيل البث. الرجاء المحاولة لاحقاً.");
              setLoading(false);
            }
          });
        } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
          video.src = server.url;
          video.addEventListener("loadedmetadata", () => setLoading(false));
          video.addEventListener("error", () => {
            setError("تعذّر تشغيل البث. الرجاء المحاولة لاحقاً.");
            setLoading(false);
          });
        } else {
          setError("المتصفح لا يدعم تشغيل بث HLS.");
          setLoading(false);
        }
        return;
      }

      /* ── IFRAME ── */
      const url = server.url;

      if (url.includes("<iframe")) {
        const cleaned = url.replace(
          "<iframe",
          '<iframe referrerpolicy="no-referrer" allowfullscreen'
        );
        container.innerHTML = cleaned;
        const ifr = container.querySelector("iframe");
        if (ifr) {
          ifr.style.width = "100%";
          ifr.style.height = "100%";
          ifr.style.border = "none";
        }
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

      /* إخفاء المُحَمِّل بعد مدّة وجيزة للـ iframe */
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

  /* ---- تغيير الزّر النشط يدويّاً ---- */
  const handleBtnClick = (index: number) => {
    if (index === activeIndex) return;
    switchServer(index);
  };

  /* ---- التحكم في الإعدادات المخفية ---- */
  const handleSettingsClick = () => {
    const newCount = clickCount + 1;
    if (newCount >= 3) {
      navigate('/admin');
    } else {
      setClickCount(newCount);
      setTimeout(() => setClickCount(0), 2000);
    }
  };

  /* ---- تكبير الشاشة ---- */
  const toggleFullScreen = () => {
    const elem = document.getElementById('main-player-wrapper');
    if (!elem) return;
    if (!document.fullscreenElement) {
      elem.requestFullscreen().catch(err => {
        console.error(`Error: ${err.message}`);
      });
    } else {
      document.exitFullscreen();
    }
  };

  return (
    <div
      dir="rtl"
      className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950
                 flex flex-col items-center justify-center p-4 sm:p-6 lg:p-8 font-sans relative overflow-hidden"
    >
      {/* ── أزرار التحكم العلوية (مخفية/واضحة) ── */}
      <div className="absolute top-4 left-4 right-4 flex justify-between items-center z-50 pointer-events-none">
        <div className="flex gap-6 items-center pointer-events-auto">
          {/* زر الإعدادات - صغير جداً وشبه مخفي */}
          <button 
            onClick={handleSettingsClick}
            className="text-white/5 hover:text-white/10 transition-colors p-1"
          >
            <Settings size={8} />
          </button>
          
          {/* زر التكبير - واضح وكبير */}
          <button 
            onClick={toggleFullScreen}
            className="text-white/80 hover:text-white transition-all transform hover:scale-110 p-2 bg-black/20 backdrop-blur-md rounded-full border border-white/10"
            title="Maximize"
          >
            <Maximize size={28} />
          </button>
        </div>
      </div>

      {/* ── العنوان ── */}
      <div className="w-full max-w-4xl mb-6 text-center">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
          Koora Live - Kora Online - كورة لايف - ماتش لايف
        </h1>
      </div>

      {/* ── الغلاف الرئيسي ── */}
      <div
        id="main-player-wrapper"
        className={cn(
          "w-full max-w-4xl rounded-2xl overflow-hidden",
          "shadow-2xl shadow-indigo-500/10",
          "border border-white/5 bg-black"
        )}
      >
        {/* ── شريط الأزرار ── */}
        <nav
          className={cn(
            "flex flex-wrap bg-slate-900/80 backdrop-blur",
            "border-b border-white/5"
          )}
          role="tablist"
          aria-label="قائمة السيرفرات"
        >
          {servers.map((srv, i) => (
            <button
              key={i}
              role="tab"
              aria-selected={i === activeIndex}
              onClick={() => handleBtnClick(i)}
              className={cn(
                "flex-1 min-w-[100px] px-4 py-3.5 sm:py-4 text-sm sm:text-base font-semibold",
                "transition-all duration-300 ease-out",
                "border-l border-white/5 last:border-l-0",
                "focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:ring-inset",
                i === activeIndex
                  ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/30"
                  : "text-slate-400 hover:bg-white/5 hover:text-slate-200"
              )}
            >
              <span className="flex items-center justify-center gap-2">
                {i === activeIndex && (
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500" />
                  </span>
                )}
                {srv.name}
              </span>
            </button>
          ))}
        </nav>

        {/* ── المشغّل ── */}
        <div className="relative w-full aspect-video bg-black">
          <div
            ref={containerRef}
            className="absolute inset-0 flex items-center justify-center"
          />

          {/* شاشة التحميل */}
          {loading && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 backdrop-blur-sm z-10">
              <div className="relative">
                <div className="w-14 h-14 rounded-full border-4 border-indigo-500/20 border-t-indigo-500 animate-spin" />
              </div>
              <p className="mt-4 text-slate-300 text-sm font-medium">
                جارٍ تحميل البث...
              </p>
            </div>
          )}

          {/* شاشة الخطأ */}
          {error && !loading && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/90 z-10 p-6">
              <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center mb-4">
                <svg
                  className="w-8 h-8 text-red-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <p className="text-red-300 text-base font-semibold mb-2">
                {error}
              </p>
              <button
                onClick={() => switchServer(activeIndex)}
                className="mt-3 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500
                           text-white text-sm font-semibold transition-all duration-200
                           active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
              >
                إعادة المحاولة
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── التذييل ── */}
      <footer className="mt-6 text-center text-xs text-slate-500">
        Koora Live - Kora Online - كورة لايف - ماتش لايف
      </footer>

      {/* ── تخصيص Plyr CSS عبر متغيرات ── */}
      <style>{`
        :root {
          --plyr-color-main: #6366f1;
          --plyr-video-control-color: #e2e8f0;
          --plyr-video-control-color-hover: #ffffff;
          --plyr-video-control-background-hover: #6366f120;
          --plyr-menu-background: #0f172aee;
          --plyr-menu-color: #cbd5e1;
          --plyr-menu-item-arrow-color: #6366f1;
          --plyr-range-fill-background: #6366f1;
          --plyr-tooltip-background: #0f172a;
          --plyr-tooltip-color: #f1f5f9;
        }
        .plyr {
          width: 100%;
          height: 100%;
        }
        .plyr--fullscreen-active {
          max-height: 100vh;
        }
        .plyr__control--overlaid {
          background: #6366f1cc !important;
          backdrop-filter: blur(4px);
        }
        #main-player-wrapper:fullscreen {
          max-width: none;
          width: 100vw;
          height: 100vh;
          border-radius: 0;
        }
        #main-player-wrapper:fullscreen .aspect-video {
          aspect-ratio: auto;
          height: calc(100vh - 56px);
        }
      `}</style>
    </div>
  );
}