# UTF-8 编码设置脚本
$env:NODE_OPTIONS = "--no-warnings"
$env:LANG = "zh_CN.UTF-8"
chcp 65001 | Out-Null
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
[Console]::InputEncoding = [System.Text.Encoding]::UTF8
$OutputEncoding = [System.Text.Encoding]::UTF8
