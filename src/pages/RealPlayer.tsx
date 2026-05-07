"use client";

import React, { useEffect } from 'react';

const RealPlayer = () => {
  useEffect(() => {
    // إضافة الميتا تاج للرأس
    const meta = document.createElement('meta');
    meta.name = "referrer";
    meta.content = "no-referrer";
    document.head.appendChild(meta);

    // تحميل السكربتات الخارجية
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

        // الكود البرمجي الخاص بك كما هو
        const servers = [{"name":"سيرفر 1","url":"https://8.wwwkora.com/albaplayer/bein-sports-hd-1/?serv=1","type":"iframe"}];
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

            currentPlayer.on('enterfullscreen', () => {
              // @ts-ignore
              if (screen.orientation && screen.orientation.lock) screen.orientation.lock('landscape').catch(()=>{});
            });
            currentPlayer.on('exitfullscreen', () => {
              // @ts-ignore
              if (screen.orientation && screen.orientation.unlock) screen.orientation.unlock();
            });
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
        servers.forEach((server, index) => {
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

  return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <link rel="stylesheet" href="https://cdn.plyr.io/3.7.8/plyr.css" />
      <style dangerouslySetInnerHTML={{ __html: `
        :root { --plyr-color-main: #6366f1; }
        .k-wrapper { width: 100%; max-width: 1000px; margin: 20px auto; border-radius: 20px; overflow: hidden; box-shadow: 0 20px 50px rgba(0,0,0,0.5); font-family: sans-serif; background: #000; direction: rtl; }
        .k-nav { display: flex; background: #0f172a; border-bottom: 1px solid rgba(255,255,255,0.1); flex-wrap: wrap; }
        .k-btn { flex: 1; min-width: 100px; padding: 15px; border: none; background: transparent; color: #94a3b8; font-weight: bold; cursor: pointer; transition: 0.3s; border-right: 1px solid rgba(255,255,255,0.05); }
        .k-btn.active { background: #6366f1; color: #fff; }
        .k-container { width: 100%; height: 500px; position: relative; background: #000; display: flex; align-items: center; justify-content: center; overflow: hidden; }
        @media (min-width: 768px) { .k-container { height: auto; aspect-ratio: 16 / 9; } }
        .k-container iframe, .k-container video { width: 100%; height: 100%; border: none; object-fit: contain; }
        .plyr { width: 100%; height: 100%; }
      `}} />
      
      <div className="k-wrapper">
        <div id="k-nav" className="k-nav"></div>
        <div id="k-container" className="k-container"></div>
      </div>
    </div>
  );
};

export default RealPlayer;