"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
// @ts-ignore
import Plyr from "plyr";
import Hls from "hls.js";
// @ts-ignore
import mpegts from "mpegts.js";
import "plyr/dist/plyr.css";
import { cn } from "@/lib/utils";
import { Maximize, Volume2, Loader2, Home, Zap } from "lucide-react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { supabase } from "@/integrations/supabase/client";

type ServerType = "iframe" | "m3u8" | "ts" | "youtube" | "facebook" | "twitch" | "kick" | "raw";

interface Server {
  id?: string;
  name: string;
  url: string;
  type: ServerType;
}

interface PageInfo {
  id: string;
  name: string;
  slug: string;
}

export default function RealPlayer() {
  const navigate = useNavigate();
  const { slug } = useParams();
  const location = useLocation();
  const pageSlug = slug || (location.pathname === '/real.html' ? 'default' : 'unknown');

  const containerRef = useRef<HTMLDivElement>(null);
  const plyrRef = useRef<Plyr | null>(null);
  const hlsRef = useRef<Hls | null>(null);
  const mpegtsRef = useRef<any>(null);

  const [servers, setServers] = useState<Server[]>([]);
  const [pageInfo, setPageInfo] = useState<PageInfo | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [fetching, setFetching] = useState(true);
  const [showUnmuteHint, setShowUnmuteHint] = useState(false);
  const [hasInteracted, setHasInteracted] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isNativeMode, setIsNativeMode] = useState(false);

  const destroy = useCallback(() => {
    if (hlsRef.current) { hlsRef.current.destroy(); hlsRef.current = null; }
    if (mpegtsRef.current) { mpegtsRef.current.destroy(); mpegtsRef.current = null; }
    if (plyrRef.current) { plyrRef.current.destroy(); plyrRef.current = null; }
  }, []);

  const buildPlayer = useCallback(
    (server: Server, forceNative = false, shouldUnmute = hasInteracted, useProxy = false) => {
      const container = containerRef.current;
      if (!container) return;

      container.innerHTML = "";
      destroy();
      setLoading(true);
      
      let finalUrl = server.url.trim();
      if (useProxy && finalUrl.startsWith('http:')) {
        finalUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(server.url)}`;
      }

      const isM3U8 = finalUrl.includes(".m3u8");
      const isRawStream = finalUrl.includes(".ts") || finalUrl.includes("live.php") || server.type === "ts";

      if (isM3U8) {
        const video = document.createElement("video");
        video.playsInline = true; video.autoplay = true; video.muted = !shouldUnmute;
        video.className = "w-full h-full";
        container.appendChild(video);
        
        // التعامل مع الخطأ للتحويل للبروكسي
        video.onerror = () => {
          if (!useProxy && server.url.startsWith('http:')) buildPlayer(server, forceNative, shouldUnmute, true);
        };

        const plyr = new Plyr(video, { controls: ["play", "mute", "volume", "settings", "fullscreen"] });
        plyrRef.current = plyr;

        if (Hls.isSupported()) {
          const hls = new Hls();
          hlsRef.current = hls;
          hls.loadSource(finalUrl);
          hls.attachMedia(video);
          hls.on(Hls.Events.MANIFEST_PARSED, () => {
            setLoading(false);
            video.play().catch(() => { video.muted = true; video.play(); setShowUnmuteHint(true); });
          });
          hls.on(Hls.Events.ERROR, (e, data) => {
            if (data.fatal && !useProxy && server.url.startsWith('http:')) buildPlayer(server, forceNative, shouldUnmute, true);
          });
        }
        return;
      }

      if (isRawStream) {
        const video = document.createElement("video");
        video.playsInline = true; video.autoplay = true; video.controls = true; video.muted = !shouldUnmute;
        video.className = "w-full h-full bg-black object-contain";
        container.appendChild(video);

        video.onplaying = () => setLoading(false);
        video.onerror = () => {
          if (!useProxy && server.url.startsWith('http:')) buildPlayer(server, forceNative, shouldUnmute, true);
          else setLoading(false);
        };

        if (!forceNative && !isNativeMode && mpegts.getFeatureList().mseLivePlayback) {
          try {
            const player = mpegts.createPlayer({ type: 'mpegts', isLive: true, url: finalUrl }, { enableStashBuffer: false });
            mpegtsRef.current = player;
            player.attachMediaElement(video);
            player.load();
            video.play().then(() => setLoading(false)).catch(() => { video.muted = true; video.play(); setShowUnmuteHint(true); });
            return;
          } catch (e) {}
        }
        video.src = finalUrl;
        video.play().then(() => setLoading(false)).catch(() => { video.muted = true; video.play(); setShowUnmuteHint(true); });
        return;
      }

      if (finalUrl.includes("<iframe")) {
        container.innerHTML = finalUrl.replace("<iframe", '<iframe referrerpolicy="no-referrer" allowfullscreen');
        setLoading(false);
      } else {
        const ifr = document.createElement("iframe");
        ifr.src = finalUrl; ifr.style.width = "100%"; ifr.style.height = "100%"; ifr.style.border = "none";
        ifr.allow = "autoplay; fullscreen"; ifr.allowFullscreen = true;
        container.appendChild(ifr);
        setTimeout(() => setLoading(false), 1500);
      }
    },
    [destroy, hasInteracted, isNativeMode]
  );

  useEffect(() => {
    const loadData = async () => {
      setFetching(true);
      const { data: pageData } = await supabase.from('pages').select('*').eq('slug', pageSlug).single();
      if (pageData) {
        setPageInfo(pageData);
        const { data: serversData } = await supabase.from('servers').select('*').eq('page_id', pageData.id).order('sort_order', { ascending: true });
        if (serversData) setServers(serversData);
      }
      setFetching(false);
    };
    loadData();
    return () => destroy();
  }, [pageSlug, destroy]);

  useEffect(() => {
    if (!fetching && servers.length > 0 && !isInitialized && containerRef.current) {
      buildPlayer(servers[0]);
      setIsInitialized(true);
    }
  }, [fetching, servers, isInitialized, buildPlayer]);

  const switchServer = (index: number) => {
    setHasInteracted(true); setActiveIndex(index); setIsNativeMode(false);
    buildPlayer(servers[index], false, true, false);
  };

  if (fetching) return <div className="min-h-screen bg-[#020617] flex items-center justify-center text-white"><Loader2 className="animate-spin text-indigo-500" size={48} /></div>;

  return (
    <div className="min-h-screen bg-[#020617] flex flex-col items-center pt-16 px-4 md:px-24 pb-6 font-sans">
      <Helmet><title>{pageInfo?.name || "بث مباشر"}</title></Helmet>
      
      <div className="absolute top-4 left-6 z-50">
        <button onClick={() => {const el=document.getElementById('p-wrap'); if(document.fullscreenElement) document.exitFullscreen(); else el?.requestFullscreen();}} className="text-white/80 p-2 bg-black/20 rounded-full"><Maximize size={24} /></button>
      </div>

      <div className="absolute top-4 right-6 z-50">
        <button onClick={() => navigate('/')} className="text-white/80 p-2 bg-black/20 rounded-full"><Home size={24} /></button>
      </div>

      <article id="p-wrap" className="w-full max-w-[1000px] rounded-2xl bg-black flex flex-col border border-indigo-500/30 overflow-hidden shadow-2xl">
        <nav className="flex flex-wrap bg-slate-900" dir="rtl">
          {servers.map((srv, i) => (
            <button key={i} onClick={() => switchServer(i)} className={cn("flex-1 px-4 py-3 text-xs font-bold border-l border-white/5", i === activeIndex ? "bg-indigo-600 text-white" : "text-slate-400 hover:bg-white/5")}>{srv.name}</button>
          ))}
        </nav>

        <div className="relative aspect-video bg-black" onClick={() => { setHasInteracted(true); setShowUnmuteHint(false); }}>
          <div ref={containerRef} className="absolute inset-0 flex items-center justify-center" />
          {loading && <div className="absolute inset-0 flex items-center justify-center bg-black/80 z-10"><Loader2 className="animate-spin text-indigo-500" size={40} /></div>}
          {showUnmuteHint && !loading && (
            <div className="absolute bottom-10 left-1/2 -translate-x-1/2 z-20 bg-indigo-600 text-white px-6 py-2 rounded-full font-bold flex items-center gap-2 cursor-pointer animate-bounce"><Volume2 size={18} /> انقر لتشغيل الصوت</div>
          )}
        </div>
      </article>

      {(servers[activeIndex]?.url.includes(".ts") || servers[activeIndex]?.url.includes("live.php")) && (
        <button onClick={() => { setIsNativeMode(!isNativeMode); buildPlayer(servers[activeIndex], !isNativeMode, true); }} className="mt-6 px-6 py-3 bg-white/5 text-slate-400 rounded-xl text-xs font-bold border border-white/10 flex items-center gap-2"><Zap size={16} /> {isNativeMode ? "تعطيل وضع البث المباشر" : "تفعيل وضع البث المباشر (إذا لم تعمل الصورة)"}</button>
      )}
      
      <style>{` :root { --plyr-color-main: #6366f1; } .plyr { width: 100%; height: 100%; } `}</style>
    </div>
  );
}