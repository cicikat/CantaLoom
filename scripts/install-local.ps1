# Windows PowerShell 5.1 compatible; no admin rights or global PATH changes.
[CmdletBinding()]
param([ValidateSet('menu','local','singing')][string]$Mode='menu', [switch]$Check, [switch]$Plan)
$ErrorActionPreference = 'Stop'
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
$project = Split-Path $PSScriptRoot -Parent
$resources = Join-Path (Split-Path $project -Parent) 'CantaLoom-resources'
$ProgressPreference = 'SilentlyContinue'

function Download-Verified($Url, $Destination, $Hash, $Algorithm='SHA256') {
    if (-not $Hash) { throw "Missing checksum: $Url" }
    if ((Test-Path -LiteralPath $Destination) -and ((Get-FileHash -LiteralPath $Destination -Algorithm $Algorithm).Hash -eq $Hash)) { return }
    $partial = "$Destination.partial"
    Write-Host "Downloading $Url"
    Invoke-WebRequest -UseBasicParsing -Uri $Url -OutFile $partial -TimeoutSec 1800
    if ((Get-FileHash -LiteralPath $partial -Algorithm $Algorithm).Hash -ne $Hash) { throw "Checksum mismatch: $partial" }
    Move-Item -LiteralPath $partial -Destination $Destination -Force
}
function Install-Zip($Url, $Name, $Hash, $Target, $Algorithm='SHA256') {
    $archive = Join-Path $downloads $Name
    Download-Verified $Url $archive $Hash $Algorithm
    $marker = Join-Path $Target '.cantaloom-installed'
    if (Test-Path -LiteralPath $marker) { return }
    # Never overlay an existing engine/model directory, including partial installs.
    if (Test-Path -LiteralPath $Target) { throw "Directory already exists without completion marker: $Target. Preserve/rename it before retrying." }
    Expand-Archive -LiteralPath $archive -DestinationPath $Target
    Set-Content -LiteralPath $marker -Value $Hash -Encoding ASCII
}
function Install-Release($Repository, $Tag, $Name, $Target) {
    $release = Invoke-RestMethod "https://api.github.com/repos/$Repository/releases/tags/$Tag"
    $asset = @($release.assets | Where-Object name -eq $Name)
    if ($asset.Count -ne 1 -or $asset[0].digest -notmatch '^sha256:([a-f0-9]{64})$') { throw "Release/checksum unavailable: $Repository $Tag $Name" }
    $checksum = $Matches[1]
    Install-Zip $asset[0].browser_download_url ($Name -replace '\.oudep$', '.zip') $checksum $Target
}
try {
    if ($env:PROCESSOR_ARCHITECTURE -ne 'AMD64') { throw 'This installer supports Windows x64 only.' }
    Write-Host "CantaLoom first-run installer. Resource directory: $resources"
    Write-Host 'Local creation: suggested 8 GB RAM, integrated graphics, 3 GB free disk.'
    Write-Host 'Chinese singing (CPU): suggested 16 GB RAM, 8 GB free disk. Dedicated GPU not required.'
    Write-Host 'DirectML optional: suggested 4 GB free VRAM; 8 GB for headroom. These are planning estimates, not tested minimums.'
    if ($Mode -eq 'menu') {
        Write-Host '1 = local creation (Node + npm); 2 = Chinese singing + FFmpeg (~1.1 GB downloads plus npm).'
        $choice = Read-Host 'Choose 1 or 2'
        if ($choice -eq '1') { $Mode='local' } elseif ($choice -eq '2') { $Mode='singing' } else { throw 'Invalid choice.' }
    }
    if ($Plan) { Write-Host "Plan only: $Mode. No downloads or configuration changes."; exit 0 }
    if ($Mode -eq 'singing') {
        Write-Host 'Read the separate voicebank and vocoder terms before downloading:'
        Write-Host 'https://github.com/yqzhishen/qixuan-diffsinger/blob/main/terms_of_use/Terms_of_Use.zh-CN.md'
        Write-Host 'https://github.com/openvpi/vocoders/releases/tag/pc-nsf-hifigan-44.1k-hop512-128bin-2025.02'
        Write-Host 'The vocoder includes CC BY-NC-SA 4.0 terms; check suitability for your intended use.'
        if ((Read-Host 'Type YES if you have read and accept the applicable terms') -cne 'YES') { throw 'Singing resource installation cancelled.' }
    }
    $downloads = Join-Path $resources 'downloads'
    New-Item -ItemType Directory -Force -Path $downloads | Out-Null
    $installedNode = @(Get-ChildItem -Path (Join-Path $resources 'tools/node-v22.*-win-x64') -Directory -ErrorAction SilentlyContinue | Where-Object { Test-Path -LiteralPath (Join-Path $_.FullName '.cantaloom-installed') } | Sort-Object LastWriteTime -Descending)
    if ($installedNode.Count -gt 0) {
        $nodeBin = Join-Path $installedNode[0].FullName $installedNode[0].Name
    } else {
    # Resolve the current maintenance release from the official checksum list.
    $sums = (Invoke-WebRequest -UseBasicParsing 'https://nodejs.org/dist/latest-v22.x/SHASUMS256.txt').Content
    if ($sums -is [byte[]]) { $sums = [Text.Encoding]::UTF8.GetString($sums) }
    if ($sums -notmatch 'node-(v22\.\d+\.\d+)-win-x64\.zip') { throw 'Node 22 release unavailable.' }
    $nodeVersion = $Matches[1]
    $nodeName = "node-$nodeVersion-win-x64"
    $line = @($sums -split "`n" | Where-Object { $_.Trim().EndsWith(" $nodeName.zip") })
    if ($line.Count -ne 1) { throw 'Node checksum entry unavailable.' }
    $nodeTarget = Join-Path $resources "tools/$nodeName"
    Install-Zip "https://nodejs.org/dist/$nodeVersion/$nodeName.zip" "$nodeName.zip" ($line[0] -split '\s+')[0] $nodeTarget
    $nodeBin = Join-Path $nodeTarget $nodeName
    }
    $env:PATH = "$nodeBin;$env:PATH"
    # Explicit existing configuration wins. Do not rewrite .env or DPAPI settings.
    if ($env:SONGYU_EXTERNAL_ROOT -and ([IO.Path]::GetFullPath($env:SONGYU_EXTERNAL_ROOT) -ne [IO.Path]::GetFullPath($resources))) {
        throw 'SONGYU_EXTERNAL_ROOT already selects a different resource root. Use start.bat for that installation.'
    }
    $envFile = Join-Path $project '.env'
    if ((Test-Path -LiteralPath $envFile) -and (Select-String -LiteralPath $envFile -Pattern '^\s*(export\s+)?SONGYU_EXTERNAL_ROOT\s*=' -Quiet)) {
        throw '.env already selects a resource root. Use start.bat for that installation, or reconcile the setting before retrying.'
    }
    $env:SONGYU_EXTERNAL_ROOT = $resources
    if ($Mode -eq 'singing') {
        Install-Release 'openutau/OpenUtau' '0.1.576' 'OpenUtau-win-x64.zip' (Join-Path $resources 'OpenUtau')
        Install-Release 'yqzhishen/qixuan-diffsinger' 'v2.7.0' 'Qixuan_v2.7.0_DiffSinger_OpenUtau.zip' (Join-Path $resources 'voicebanks/Qixuan-v2.7.0')
        Install-Release 'openvpi/vocoders' 'pc-nsf-hifigan-44.1k-hop512-128bin-2025.02' 'pc_nsf_hifigan_44.1k_hop512_128bin_2025.02.oudep' (Join-Path $resources 'OpenUtau/Dependencies/pc_nsf_hifigan_44.1k_hop512_128bin_2025.02')
        $metadata = Invoke-RestMethod 'https://builds.dotnet.microsoft.com/dotnet/release-metadata/10.0/releases.json'
        $sdk = $metadata.releases[0].sdk
        $sdkFile = @($sdk.files | Where-Object { $_.rid -eq 'win-x64' -and $_.name.EndsWith('.zip') })[0]
        $dotnetRoot = Join-Path $resources 'runtime/dotnet'
        Install-Zip $sdkFile.url "dotnet-sdk-$($sdk.version)-win-x64.zip" $sdkFile.hash $dotnetRoot 'SHA512'
        $env:DOTNET_ROOT = $dotnetRoot
        $env:PATH = "$dotnetRoot;$env:PATH"
        & (Join-Path $dotnetRoot 'dotnet.exe') build (Join-Path $project 'scripts/openutau-bridge/SongyuBridge.csproj') "-p:OpenUtauDirectory=$resources/OpenUtau" "-p:BaseIntermediateOutputPath=$resources/runtime/bridge-obj/" -o (Join-Path $resources 'OpenUtau')
        if ($LASTEXITCODE -ne 0) { throw 'Bridge build failed.' }
        $ffmpegRelease = Invoke-RestMethod 'https://api.github.com/repos/GyanD/codexffmpeg/releases/latest'
        $ffmpegAsset = @($ffmpegRelease.assets | Where-Object name -match '^ffmpeg-.*-essentials_build\.zip$')
        if ($ffmpegAsset.Count -ne 1) { throw 'FFmpeg release unavailable.' }
        Install-Release 'GyanD/codexffmpeg' $ffmpegRelease.tag_name $ffmpegAsset[0].name (Join-Path $resources 'tools/ffmpeg')
    }
    $ffmpegBins = @(Get-ChildItem -LiteralPath (Join-Path $resources 'tools') -Filter ffmpeg.exe -Recurse -ErrorAction SilentlyContinue)
    if ($ffmpegBins.Count -gt 0) { $env:PATH = "$($ffmpegBins[0].DirectoryName);$env:PATH" }
    Write-Host 'LLM URL/model/key must be configured in /admin. No local LLM weights are needed for a remote API.'
    Write-Host 'MP4 additionally needs FFmpeg (libx264/libass); FluidSynth/SoundFont are optional. See docs/ENGINES.md.'
    $arguments = @((Join-Path $project 'scripts/start-local.mjs'))
    if ($Check) { $arguments += '--check' }
    & (Join-Path $nodeBin 'node.exe') @arguments
    if ($LASTEXITCODE -ne 0) { throw "Startup failed ($LASTEXITCODE)." }
} catch {
    Write-Host "[ERROR] $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}
