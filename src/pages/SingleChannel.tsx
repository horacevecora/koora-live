"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
// @ts-ignore
import Plyr from "plyr";
import Hls from "hls.js";
// @ts-ignore
import mpegts from "mpegts.js";
import "plyr/dist/plyr.css";
import { Settings, Maximize, Volume2, RefreshCw, AlertTriangle, ArrowDownRight, Home } from "lucide-react";

interface Server {
  name: string;
  url: string;
  type: string;
}

export default function SingleChannel() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const containerRef = useRef<HTMLDivElement>(null);
  const plyrRef = useRef<Plyr | null>(null);
  const hlsRef = useRef<Hls | null>(null);
  const mpegtsRef = useRef<any>(null);
  const monitorInterval = useRef<NodeJS.Timeout | null>(null);
  const lastTime = useRef<number>(0);

  const [channel, setChannel] = useState<Server | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showUnmuteHint, setShowUnmuteHint] = useState(false);
  const [hasInteracted, setHasInteracted] = useState(false);

  const destroy = useCallback(() => {
    if (monitorInterval.current) clearInterval(monitorInterval.current);
    if (hlsRef.current) hlsRef.current.destroy();
    if (mpegtsRef.current) mpegtsRef.current.destroy();
    if (plyrRef.current) plyrRef.current.destroy();
  }, []);

  const isFacebookUrl = (url: string) => url.includes("facebook.com") || url.includes("fb.watch");

  const buildPlayer = useCallback((server: Server, shouldUnmute = false) => {
    const container = containerRef.current;
    if (!container) return;
    container.innerHTML = "";
    destroy();
    setLoading(true);
    
    const url = server.url.trim();
    const isM3U8 = url.includes(".m3u8");
    const isTS = url.includes(".ts") || url.includes("extension=ts") || url.includes(":2086") || url.includes(":8080");

    if (isM3U8) {
      const video = document.createElement("video");
      video.playsInline = true; video.autoplay = true; video.muted = !shouldUnmute;
      video.className = "w-full h-full";
      container.appendChild(video);
      new Plyr(video, { controls: ["play", "mute", "volume", "fullscreen"] });
      if (Hls.isSupported()) {
        const hls = new Hls(); hls.loadSource(url); hls.attachMedia(video);
        hls.on(Hls.Events.MANIFEST_PARSED, () => { setLoading(false); video.play().catch(() => setShowUnmuteHint(true)); });
      }
    } else if (isFacebookUrl(url)) {
      const ifr = document.createElement("iframe");
      ifr.src = `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(url)}&show_text=0&autoplay=true&mute=${shouldUnmute ? '0' : '1'}&allowfullscreen=true`;
      ifr.style.width = "100%"; ifr.style.height = "100%"; ifr.style.border = "none";
      ifr.allow = "autoplay; fullscreen"; ifr.allowFullscreen = true;
      container.appendChild(ifr);
      setTimeout(() => { setLoading(false); setShowUnmuteHint(true); }, 2000);
    } else {
      const ifr = document.createElement("iframe");
      ifr.src = url; ifr.style.width = "100%"; ifr.style.height = "100%"; ifr.style.border = "none";
      ifr.allow = "autoplay; fullscreen"; ifr.allowFullscreen = true;
      container.appendChild(ifr);
      setTimeout(() => setLoading(false), 1500);
    }
  }, [destroy]);

  useEffect(() => {
    const saved = localStorage.getItem('player_servers');
    if (saved && slug) {
      const servers: Server[] = JSON.parse(saved);
      const found = servers.find(s => s.name.replace(/\s+/g, '-').toLowerCase() === slug.toLowerCase());
      if (found) {
        setChannel(found);
        buildPlayer(found, false);
      } else {
        setError("القناة غير موجودة");
        setLoading(false);
      }
    }
    return () => destroy();
  }, [slug, buildPlayer, destroy]);

  const handleUnmute = () => {
    setHasInteracted(true);
    buildPlayer(channel!, true);
    setShowUnmuteHint(false);
  };

  if (!channel && !loading) return <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white">القناة غير موجودة</div>;

  return (
    <div className="min-h-screen bg-[#020617] flex flex-col items-center justify-center p-4 font-sans">
      <div className="w-full max-w-[1000px] relative group">
        <div className="absolute -top-12 left-0 right-0 flex justify-between items-center px-2">
          <h1 className="text-white font-black text-lg">{channel?.name}</h1>
          <button onClick={() => navigate('/')} className="text-slate-500 hover:text-white flex items-center gap-1 text-xs">
            <Home size={14} /> الرئيسية
          </button>
        </div>

        <div className="relative aspect-video bg-black rounded-3xl overflow-hidden border border-indigo-500/20 shadow-2xl shadow-indigo-500/10">
          <div ref={containerRef} className="w-full h-full" />
          
          {loading && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/80 z-10">
              <div className="w-10 h-10 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin" />
            </div>
          )}

          {showUnmuteHint && !loading && (
            <div 
              className="absolute bottom-10 left-1/2 -translate-x-1/2 z-20 bg-indigo-600 text-white px-6 py-3 rounded-full flex items-center gap-3 shadow-2xl animate-bounce cursor-pointer"
              onClick={handleUnmute}
            >
              <Volume2 size={20} /> <span className="font-black text-sm">انقر لتشغيل الصوت</span>
            </div>
          )}
        </div>
      </div>
      
      <div className="mt-8 opacity-20 text-[10px] text-white font-bold tracking-widest uppercase">
        Koora Live Standalone Player
      </div>
    </div>
  );
}