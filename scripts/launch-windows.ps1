# Windows PowerShell 5.1. Both shortcuts use the same environment and restart checks.
$ErrorActionPreference = 'Stop'
$project = Split-Path $PSScriptRoot -Parent
Set-Location -LiteralPath $project
$resources = Join-Path (Split-Path $project -Parent) 'CantaLoom-resources'
$launchArgs = @('--restart') + $args
$envFile = Join-Path $project '.env'
$customRoot = $env:SONGYU_EXTERNAL_ROOT -or ((Test-Path -LiteralPath $envFile) -and
    (Select-String -LiteralPath $envFile -Pattern '^\s*(export\s+)?SONGYU_EXTERNAL_ROOT\s*=' -Quiet))
$portable = Get-ChildItem -Path (Join-Path $resources 'tools/node-v22.*-win-x64') -Directory -ErrorAction SilentlyContinue |
    Sort-Object LastWriteTime -Descending | Where-Object {
        (Test-Path -LiteralPath (Join-Path $_.FullName '.cantaloom-installed')) -and
        (Test-Path -LiteralPath (Join-Path $_.FullName "$($_.Name)/node.exe")) -and
        (Test-Path -LiteralPath (Join-Path $_.FullName "$($_.Name)/npm.cmd"))
    } | Select-Object -First 1
if ($portable) {
    $env:PATH = "$(Join-Path $portable.FullName $portable.Name);$env:PATH"
    if (-not $customRoot) {
        $env:SONGYU_EXTERNAL_ROOT = $resources
        $dotnet = Join-Path $resources 'runtime/dotnet'
        if (Test-Path -LiteralPath (Join-Path $dotnet 'dotnet.exe')) {
            $env:DOTNET_ROOT = $dotnet
            $env:PATH = "$dotnet;$env:PATH"
        }
        $ffmpeg = Get-ChildItem -LiteralPath (Join-Path $resources 'tools/ffmpeg') -Filter ffmpeg.exe -File -Recurse -ErrorAction SilentlyContinue | Select-Object -First 1
        if ($ffmpeg) { $env:PATH = "$($ffmpeg.DirectoryName);$env:PATH" }
    }
}
$node = Get-Command node.exe -CommandType Application -ErrorAction SilentlyContinue | Select-Object -First 1
$ready = $node -and (Get-Command npm.cmd -CommandType Application -ErrorAction SilentlyContinue) -and
    ([version]((& $node.Source --version) -replace '^v','') -ge [version]'22.12.0')
if ($ready -and ($customRoot -or (Test-Path -LiteralPath (Join-Path $project 'node_modules/.package-lock.json')))) {
    & $node.Source (Join-Path $PSScriptRoot 'start-local.mjs') @launchArgs
    exit $LASTEXITCODE
}
if ($customRoot) { throw 'Existing resource configuration detected. Install Node.js 22.12+ with npm, then reopen the studio.' }
& (Join-Path $PSScriptRoot 'install-local.ps1') -Restart -Admin:($launchArgs -contains '--admin') -NoOpen:($launchArgs -contains '--no-open') -Check:($launchArgs -contains '--check')
exit $LASTEXITCODE
