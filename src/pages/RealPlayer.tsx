"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import * as PlyrModule from "plyr";
import Hls from "hls.js";
import "plyr/dist/plyr.css";
import { cn } from "@/lib/utils";
import { Settings, Maximize, ChevronRight } from "lucide-react";
import { useNavigate } from "react-router-dom";

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
      if (parsed.length > 0) buildPlayer(parsed[0]);
    } else {
      const defaultServers: Server[] = [
        { name: "سيرفر 1", url: "https://8.wwwkora.com/albaplayer/bein-sports-hd-1/?serv=1", type: "iframe" }
      ];
      setServers(defaultServers);
      buildPlayer(defaultServers[0]);
    }
  }, []);

  const destroy = useCallback(() => {
    if (hlsRef.current) { hlsRef.current.destroy(); hlsRef.current = null; }
    if (plyrRef.current) { plyrRef.current.destroy(); plyrRef.current = null; }
  }, []);

  const buildPlayer = useCallback((server: Server) => {
    const container = containerRef.current;
    if (!container) return;
    container.innerHTML = "";
    destroy();
    setLoading(true);
    setError(null);

    if (server.type === "m3u8") {
      const video = document.createElement("video");
      video.setAttribute("playsinline", "");
      video.className = "w-full h-full";
      container.appendChild(video);
      const plyr = new Plyr(video, { controls: ["play-large", "play", "progress", "current-time", "mute", "volume", "settings", "fullscreen"] });
      plyrRef.current = plyr;
      if (Hls.isSupported()) {
        const hls = new Hls();
        hlsRef.current = hls;
        hls.loadSource(server.url);
        hls.attachMedia(video);
        hls.on(Hls.Events.MANIFEST_PARSED, () => setLoading(false));
      }
    } else {
      const ifr = document.createElement("iframe");
      ifr.src = server.url;
      ifr.setAttribute("referrerpolicy", "no-referrer");
      ifr.allowFullscreen = true;
      ifr.className = "w-full h-full border-none";
      container.appendChild(ifr);
      setTimeout(() => setLoading(false), 1500);
    }
  }, [destroy]);

  const handleSettingsClick = () => {
    const newCount = clickCount + 1;
    if (newCount >= 3) navigate('/admin');
    else { setClickCount(newCount); setTimeout(() => setClickCount(0), 2000); }
  };

  const toggleFullScreen = () => {
    const elem = document.getElementById('player-main-content');
    if (!elem) return;
    if (!document.fullscreenElement) elem.requestFullscreen().catch(() => {});
    else document.exitFullscreen();
  };

  return (
    <div className="min-h-screen bg-[#020617] flex flex-col font-sans overflow-hidden">
      {/* Header Controls */}
      <div className="flex justify-between items-center p-4 z-50">
        {/* Left: Maximize */}
        <button 
          onClick={toggleFullScreen}
          className="w-10 h-10 flex items-center justify-center bg-white/5 hover:bg-white/10 backdrop-blur-md rounded-lg border border-white/10 text-white/80 transition-all"
        >
          <Maximize size={20} />
        </button>

        {/* Right: Back & Hidden Settings */}
        <div className="flex items-center gap-4">
          <button onClick={handleSettingsClick} className="text-white/5 hover:text-white/10 p-1">
            <Settings size={12} />
          </button>
          <button 
            onClick={() => navigate('/')}
            className="w-10 h-10 flex items-center justify-center bg-white/5 hover:bg-white/10 backdrop-blur-md rounded-full border border-white/10 text-white/80 transition-all"
          >
            <ChevronRight size={24} />
          </button>
        </div>
      </div>

      {/* Main Player Area */}
      <div id="player-main-content" className="flex-1 flex flex-col relative">
        {/* Server Tabs */}
        <div className="flex overflow-x-auto no-scrollbar bg-slate-900/50 border-b border-white/5">
          {servers.map((srv, i) => (
            <button
              key={i}
              onClick={() => { setActiveIndex(i); buildPlayer(srv); }}
              className={cn(
                "px-6 py-3 text-sm font-bold whitespace-nowrap transition-all border-b-2",
                i === activeIndex ? "border-indigo-500 text-white bg-indigo-500/10" : "border-transparent text-slate-500 hover:text-slate-300"
              )}
            >
              {srv.name}
            </button>
          ))}
        </div>

        {/* Player Container */}
        <div className="flex-1 relative bg-black">
          <div ref={containerRef} className="absolute inset-0 flex items-center justify-center" />
          
          {loading && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/90 z-10">
              <div className="w-12 h-12 rounded-full border-2 border-indigo-500/20 border-t-indigo-500 animate-spin" />
            </div>
          )}
        </div>
      </div>

      <style>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        #player-main-content:fullscreen { background: black; }
        #player-main-content:fullscreen .flex-1 { height: 100vh; }
        :root { --plyr-color-main: #6366f1; }
      `}</style>
    </div>
  );
}