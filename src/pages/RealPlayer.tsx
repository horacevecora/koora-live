"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
// @ts-ignore
import Plyr from "plyr";
import Hls from "hls.js";
// @ts-ignore
import mpegts from "mpegts.js";
import "plyr/dist/plyr.css";
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";
import { useParams, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

type ServerType = "iframe" | "m3u8" | "ts" | "youtube" | "facebook" | "twitch" | "kick" | "raw";

interface Server {
  id?: string;
  name: string;
  url: string;
  type: ServerType;
}

export default function RealPlayer() {
  const { slug } = useParams();
  const location = useLocation();
  const pageSlug = slug || (location.pathname === '/real.html' ? 'default' : 'unknown');

  const containerRef = useRef<HTMLDivElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const mpegtsRef = useRef<any>(null);

  const [servers, setServers] = useState<Server[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [fetching, setFetching] = useState(true);
  const [isNativeMode, setIsNativeMode] = useState(false);

  const destroy = useCallback(() => {
    if (hlsRef.current) { hlsRef.current.destroy(); hlsRef.current = null; }
    if (mpegtsRef.current) { 
      try { mpegtsRef.current.destroy(); } catch(e) {}
      mpegtsRef.current = null; 
    }
  }, []);

  const buildPlayer = useCallback(
    (server: Server, forceNative = false) => {
      const container = containerRef.current;
      if (!container) return;

      container.innerHTML = "";
      destroy();
      setLoading(true);
      
      const url = server.url.trim();
      const isM3U8 = url.includes(".m3u8") || server.type === "m3u8";
      const isRawStream = url.includes(".ts") || server.type === "ts" || url.includes("stream");

      if (isM3U8) {
        const video = document.createElement("video");
        video.playsInline = true;
        video.autoplay = true;
        video.muted = true;
        container.appendChild(video);

        if (Hls.isSupported()) {
          const hls = new Hls({ enableWorker: true });
          hlsRef.current = hls;
          hls.loadSource(url);
          hls.attachMedia(video);
          hls.on(Hls.Events.MANIFEST_PARSED, () => {
            setLoading(false);
            video.play().catch(() => {});
          });
        }
        return;
      }

      if (isRawStream && !url.includes("<iframe")) {
        const video = document.createElement("video");
        video.playsInline = true;
        video.autoplay = true;
        video.controls = true;
        video.muted = true;
        video.className = "w-full h-full";
        container.appendChild(video);

        if (!forceNative && mpegts.getFeatureList().mseLivePlayback) {
          try {
            const player = mpegts.createPlayer({ type: 'mpegts', isLive: true, url: url, cors: true });
            mpegtsRef.current = player;
            player.attachMediaElement(video);
            player.load();
            const playPromise = player.play() as Promise<void> | undefined;
            if (playPromise instanceof Promise) {
              playPromise.then(() => setLoading(false)).catch(() => { video.play().catch(() => {}); setLoading(false); });
            } else {
              setLoading(false);
            }
            return;
          } catch (e) { console.error("MPEGTS init failed", e); }
        }
        
        video.src = url;
        video.play().then(() => setLoading(false)).catch(() => { video.muted = true; video.play(); setLoading(false); });
        return;
      }

      const ifr = document.createElement("iframe");
      ifr.src = url;
      ifr.style.width = "100%"; ifr.style.height = "100%"; ifr.style.border = "none";
      ifr.allow = "autoplay; fullscreen";
      container.appendChild(ifr);
      setLoading(false);
    },
    [destroy]
  );

  useEffect(() => {
    const loadData = async () => {
      setFetching(true);
      const { data: pageData } = await supabase.from('pages').select('id').eq('slug', pageSlug).single();
      if (pageData) {
        const { data: serversData } = await supabase.from('servers').select('*').eq('page_id', pageData.id).order('sort_order', { ascending: true });
        setServers(serversData || []);
      }
      setFetching(false);
    };
    loadData();
  }, [pageSlug]);

  useEffect(() => {
    if (!fetching && servers.length > 0 && containerRef.current) {
      buildPlayer(servers[activeIndex], isNativeMode);
    }
  }, [fetching, servers, activeIndex, isNativeMode, buildPlayer]);

  if (fetching) return <div className="min-h-screen flex items-center justify-center text-white"><Loader2 className="animate-spin" size={48} /></div>;

  return (
    <div className="min-h-screen bg-[#020617] flex flex-col items-center pt-16 px-6 font-sans">
      <div className="w-full max-w-[1200px] bg-black rounded-2xl overflow-hidden border border-indigo-500/30">
        <div className="relative aspect-video bg-black" ref={containerRef}>
          {loading && <div className="absolute inset-0 flex items-center justify-center"><Loader2 className="animate-spin text-indigo-500" /></div>}
        </div>
      </div>
    </div>
  );
}