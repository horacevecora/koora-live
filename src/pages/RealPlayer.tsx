"use client";

import React, { useEffect, useState } from 'react';
import { Settings, Maximize } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const RealPlayer = () => {
  const navigate = useNavigate();
  const [clickCount, setClickCount] = useState(0);

  useEffect(() => {
    const meta = document.createElement('meta');
    meta.name = "referrer";
    meta.content = "no-referrer";
    document.head.appendChild(meta);

    const loadScript = (src: string) => {
      return new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = src;
        script.onload = resolve;
        script.onerror = reject;
        document.body.appendChild(script);
      });
    };

    const initPlayer = async () => {
      try {
        await loadScript("https://cdn.jsdelivr.net/npm/hls.js@latest");
        await loadScript("https://cdn.plyr.io/3.7.8/plyr.js");

        const savedServers = localStorage.getItem('player_servers');
        const servers = savedServers ? JSON.parse(savedServers) : [{"name":"سيرفر 1","url":"https://8.wwwkora.com/albaplayer/bein-sports-hd-1/?serv=1","type":"iframe"}];
        
        const container = document.getElementById('k-container');
        const nav = document.getElementById('k-nav');
        let currentPlayer: any = null;

        if (!container || !nav) return;

        function switchServer(index: number) {
          const server = servers[index];
          if (!container) return;
          container.innerHTML = '';
          if (currentPlayer) { currentPlayer.destroy(); currentPlayer = null; }

          if (server.type === 'm3u8') {
            const video = document.createElement('video');
            video.playsInline = true;
            video.setAttribute('referrerpolicy', 'no-referrer');
            container.appendChild(video);
            
            // @ts-ignore
            currentPlayer = new window.Plyr(video);
            // @ts-ignore
            if (window.Hls && window.Hls.isSupported()) {
              // @ts-ignore
              const hls = new window.Hls();
              hls.loadSource(server.url);
              hls.attachMedia(video);
            } else {
              video.src = server.url;
            }
          } else {
            const url = server.url;
            if (url.includes('<iframe')) {
              container.innerHTML = url.replace('<iframe', '<iframe referrerpolicy="no-referrer" allowfullscreen');
              const ifr = container.querySelector('iframe');
              if (ifr) { ifr.style.width = '100%'; ifr.style.height = '100%'; ifr.style.objectFit = 'contain'; }
            } else {
              const ifr = document.createElement('iframe');
              ifr.src = url;
              ifr.setAttribute('referrerpolicy', 'no-referrer');
              ifr.style.width = '100%';
              ifr.style.height = '100%';
              ifr.style.objectFit = 'contain';
              ifr.allowFullscreen = true;
              container.appendChild(ifr);
            }
          }
          
          document.querySelectorAll('.k-btn').forEach((b, i) => b.classList.toggle('active', i === index));
        }

        nav.innerHTML = '';
        servers.forEach((server: any, index: number) => {
          const btn = document.createElement('button');
          btn.className = 'k-btn';
          btn.innerText = server.name;
          btn.onclick = () => switchServer(index);
          nav.appendChild(btn);
        });

        if (servers.length > 0) switchServer(0);
      } catch (err) {
        console.error("Failed to load player scripts", err);
      }
    };

    initPlayer();

    return () => {
      if (document.head.contains(meta)) {
        document.head.removeChild(meta);
      }
    };
  }, []);

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
    const elem = document.getElementById('k-wrapper');
    if (!elem) return;
    if (!document.fullscreenElement) {
      elem.requestFullscreen().catch(err => {
        console.error(`Error attempting to enable full-screen mode: ${err.message}`);
      });
    } else {
      document.exitFullscreen();
    }
  };

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center relative overflow-hidden">
      <link rel="stylesheet" href="https://cdn.plyr.io/3.7.8/plyr.css" />
      
      <div className="absolute top-0 left-0 right-0 p-3 flex justify-between items-center z-50 pointer-events-none">
        <div className="flex gap-4 items-center pointer-events-auto">
          {/* زر الإعدادات - صغير جداً وشبه مخفي */}
          <button 
            onClick={handleSettingsClick}
            className="text-white/5 hover:text-white/10 transition-colors p-1"
            title="Settings"
          >
            <Settings size={8} />
          </button>
          
          {/* زر التكبير - واضح وكبير */}
          <button 
            onClick={toggleFullScreen}
            className="text-white/70 hover:text-white transition-colors p-1"
            title="Maximize"
          >
            <Maximize size={24} />
          </button>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        :root { --plyr-color-main: #6366f1; }
        .k-wrapper { width: 100%; max-width: 1000px; margin: 0 auto; border-radius: 0; overflow: hidden; box-shadow: 0 20px 50px rgba(0,0,0,0.5); font-family: sans-serif; background: #000; direction: rtl; }
        .k-nav { display: flex; background: #0f172a; border-bottom: 1px solid rgba(255,255,255,0.1); flex-wrap: wrap; }
        .k-btn { flex: 1; min-width: 100px; padding: 15px; border: none; background: transparent; color: #94a3b8; font-weight: bold; cursor: pointer; transition: 0.3s; border-right: 1px solid rgba(255,255,255,0.05); }
        .k-btn.active { background: #6366f1; color: #fff; }
        .k-container { width: 100%; height: 500px; position: relative; background: #000; display: flex; align-items: center; justify-content: center; overflow: hidden; }
        @media (min-width: 768px) { 
          .k-wrapper { border-radius: 20px; }
          .k-container { height: auto; aspect-ratio: 16 / 9; } 
        }
        .k-container iframe, .k-container video { width: 100%; height: 100%; border: none; object-fit: contain; }
        .plyr { width: 100%; height: 100%; }
        #k-wrapper:fullscreen { max-width: none; width: 100vw; height: 100vh; border-radius: 0; }
        #k-wrapper:fullscreen .k-container { height: calc(100vh - 50px); }
      `}} />
      
      <div id="k-wrapper" className="k-wrapper">
        <div id="k-nav" className="k-nav"></div>
        <div id="k-container" className="k-container">
          <div className="text-center text-slate-500 p-10">
            <p className="mb-4">The manifest could not be loaded</p>
            <p className="text-2xl font-bold text-white">لا تنسى ذكر الله</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RealPlayer;