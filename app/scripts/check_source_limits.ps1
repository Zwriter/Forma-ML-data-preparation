$ErrorActionPreference = 'Stop'
$sourceRoot = Join-Path $PSScriptRoot '..'
$extensions = @('.py', '.ts', '.tsx', '.css', '.rs')
$violations = [System.Collections.Generic.List[string]]::new()
$blocks = @{}
$hash = [System.Security.Cryptography.SHA256]::Create()

Get-ChildItem -LiteralPath $sourceRoot -Recurse -File -ErrorAction SilentlyContinue | Where-Object {
    $extensions -contains $_.Extension -and
    $_.FullName -notmatch '[\\/]tests[\\/]|[\\/](\.venv|node_modules|dist|target|__pycache__|\.pytest_cache)[\\/]'
} | ForEach-Object {
    $codeLines = [System.Collections.Generic.List[string]]::new()
    foreach ($line in Get-Content -LiteralPath $_.FullName) {
        $trimmed = $line.Trim()
        if (-not $trimmed -or $trimmed.StartsWith('#') -or $trimmed.StartsWith('//') -or
            $trimmed.StartsWith('/*') -or $trimmed.StartsWith('*')) { continue }
        $codeLines.Add($trimmed)
    }
    if ($codeLines.Count -gt 250) { $violations.Add("$($_.FullName): $($codeLines.Count) code lines (limit 250)") }

    if ($_.FullName -match '[\\/]features[\\/]') {
        for ($index = 0; $index -le $codeLines.Count - 12; $index++) {
            $block = ($codeLines.GetRange($index, 12) -join "`n")
            $digest = [BitConverter]::ToString($hash.ComputeHash([Text.Encoding]::UTF8.GetBytes($block))).Replace('-', '')
            if (-not $blocks.ContainsKey($digest)) { $blocks[$digest] = [System.Collections.Generic.List[string]]::new() }
            $blocks[$digest].Add($_.FullName)
        }
    }
}

foreach ($entry in $blocks.GetEnumerator()) {
    $paths = @($entry.Value | Sort-Object -Unique)
    if ($paths.Count -gt 1) { $violations.Add("Duplicated 12-line feature block: $($paths -join ', ')") }
}
$hash.Dispose()
if ($violations.Count -gt 0) {
    $violations | ForEach-Object { Write-Error $_ }
    exit 1
}
Write-Output 'Source line limits and feature duplication review passed.'
