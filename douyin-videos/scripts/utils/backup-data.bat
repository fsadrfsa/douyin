@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion

set DATA_DIR=D:\opencli\douyin-videos\data
set BACKUP_DIR=D:\opencli\douyin-videos\backups
set TIMESTAMP=%date:~0,4%%date:~5,2%%date:~8,2%-%time:~0,2%%time:~3,2%%time:~6,2%
set TIMESTAMP=%TIMESTAMP: =0%

echo.
echo ========================================
echo   数据备份工具
echo ========================================
echo.

if not exist "%BACKUP_DIR%" mkdir "%BACKUP_DIR%"

set BACKUP_PATH=%BACKUP_DIR%\data-backup-%TIMESTAMP%
mkdir "%BACKUP_PATH%"

echo 正在备份数据文件...
echo.

xcopy /Y "%DATA_DIR%\bloggers.json" "%BACKUP_PATH%\" >nul 2>&1 && echo   ✓ bloggers.json
xcopy /Y "%DATA_DIR%\videos.json" "%BACKUP_PATH%\" >nul 2>&1 && echo   ✓ videos.json
xcopy /Y "%DATA_DIR%\pipeline-state.json" "%BACKUP_PATH%\" >nul 2>&1 && echo   ✓ pipeline-state.json
xcopy /Y "%DATA_DIR%\search-keywords.json" "%BACKUP_PATH%\" >nul 2>&1 && echo   ✓ search-keywords.json
xcopy /Y "%DATA_DIR%\blogger-analysis.json" "%BACKUP_PATH%\" >nul 2>&1 && echo   ✓ blogger-analysis.json
xcopy /Y "%DATA_DIR%\blogger-blacklist.json" "%BACKUP_PATH%\" >nul 2>&1 && echo   ✓ blogger-blacklist.json
xcopy /Y "%DATA_DIR%\discovered-keywords.json" "%BACKUP_PATH%\" >nul 2>&1 && echo   ✓ discovered-keywords.json
xcopy /Y "%DATA_DIR%\statistics.json" "%BACKUP_PATH%\" >nul 2>&1 && echo   ✓ statistics.json

echo.
echo ========================================
echo   备份完成！
echo   备份位置: %BACKUP_PATH%
echo ========================================
echo.

pause
