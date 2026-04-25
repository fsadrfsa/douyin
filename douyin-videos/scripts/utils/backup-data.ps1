# 数据备份脚本
$ErrorActionPreference = "Stop"

$DATA_DIR = "D:\opencli\douyin-videos\data"
$BACKUP_DIR = "D:\opencli\douyin-videos\backups"
$TIMESTAMP = Get-Date -Format "yyyyMMdd-HHmmss"

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  数据备份工具" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# 创建备份目录
if (-not (Test-Path $BACKUP_DIR)) {
    New-Item -ItemType Directory -Path $BACKUP_DIR -Force | Out-Null
}

$BACKUP_PATH = Join-Path $BACKUP_DIR "data-backup-$TIMESTAMP"
New-Item -ItemType Directory -Path $BACKUP_PATH -Force | Out-Null

Write-Host "正在备份数据文件..." -ForegroundColor Yellow
Write-Host ""

# 关键数据文件列表
$CRITICAL_FILES = @(
    "bloggers.json",
    "videos.json",
    "pipeline-state.json",
    "search-keywords.json",
    "blogger-analysis.json",
    "blogger-blacklist.json",
    "discovered-keywords.json",
    "statistics.json"
)

$backedUp = 0
foreach ($file in $CRITICAL_FILES) {
    $sourcePath = Join-Path $DATA_DIR $file
    if (Test-Path $sourcePath) {
        $destPath = Join-Path $BACKUP_PATH $file
        Copy-Item -Path $sourcePath -Destination $destPath -Force
        Write-Host "  ✓ $file" -ForegroundColor Green
        $backedUp++
    }
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  备份完成！" -ForegroundColor Green
Write-Host "  已备份: $backedUp 个文件" -ForegroundColor Green
Write-Host "  备份位置: $BACKUP_PATH" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# 显示备份统计
$allBackups = Get-ChildItem -Path $BACKUP_DIR -Directory | Where-Object { $_.Name -like "data-backup-*" }
Write-Host "📊 备份统计:" -ForegroundColor Yellow
Write-Host "  - 总备份数: $($allBackups.Count)" -ForegroundColor White
if ($allBackups.Count -gt 0) {
    $latestBackup = $allBackups | Sort-Object LastWriteTime -Descending | Select-Object -First 1
    Write-Host "  - 最新备份: $($latestBackup.Name)" -ForegroundColor White
    Write-Host "  - 备份时间: $($latestBackup.LastWriteTime.ToString('yyyy-MM-dd HH:mm:ss'))" -ForegroundColor White
}
Write-Host ""
