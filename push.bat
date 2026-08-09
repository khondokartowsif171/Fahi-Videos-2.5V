@echo off
title Fahi-Videos 1-Click GitHub Auto Push Tool
echo ========================================================
echo         FAHI-VIDEOS 1-CLICK GITHUB AUTO PUSH TOOL       
echo ========================================================
echo.

cd /d D:\Fahi-videos

echo [1/3] Staging modified project files...
git add .

echo [2/3] Committing changes...
git commit -m "update: Fahi-Videos studio latest code"

echo [3/3] Pushing to GitHub (https://github.com/khondokartowsif171/Fahi-Videos-2.5V)...
git push origin main --force

echo.
echo ========================================================
echo      SUCCESS! ALL CODE PUSHED TO GITHUB REPOSITORY!     
echo ========================================================
echo.
pause
