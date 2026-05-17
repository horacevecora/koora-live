@echo off
title Koora-Live Deploy to Vercel
color 0A
echo.
echo ========================================
echo    Koora-Live Deploy Script
echo ========================================
echo.

cd /d "%~dp0"

echo [*] Checking for changes...
git add .

echo [*] Committing changes...
git commit -m "Auto deploy %date% %time%"

echo [*] Pushing to GitHub...
git push origin main

echo.
echo ========================================
echo    Done! Vercel will auto-deploy soon
echo ========================================
echo.
pause