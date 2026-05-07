@echo off
title Painel Padaria - Rei dos Paes (dev)
cd /d "%~dp0\.."
call npm run desktop:dev > "%~dp0\last-run.log" 2>&1
