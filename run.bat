@echo off
echo =========================================
echo Inventory Management System (IMS)
echo =========================================
echo.

echo [1/2] Seeding Database (Safe to run multiple times)...
node database/seed.js
echo.

echo [2/2] Starting Server...
echo The application will be available at: http://localhost:3000
echo.
node server.js

pause
