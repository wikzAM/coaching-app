@echo off
REM Build Android from short path (Z:) to avoid Windows long-path limit with react-native-reanimated
cd /d "%~dp0.."
if exist Z:\ (
  echo Z: already in use. Unmap it first with: subst Z: /d
  exit /b 1
)
subst Z: "%CD%"
echo Building from Z: to avoid long path...
Z:
cd \
call npx expo run:android --no-bundler
set EXIT_CODE=%ERRORLEVEL%
subst Z: /d
exit /b %EXIT_CODE%
