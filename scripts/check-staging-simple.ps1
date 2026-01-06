# Check all screens on staging environment (PowerShell)
# Works without Node.js

$BaseUrl = "https://fleapay-lite-t1.onrender.com"
$Timeout = 10

$PageRoutes = @(
    @{ Path = "/"; Name = "Top Page" },
    @{ Path = "/success"; Name = "Success Page" },
    @{ Path = "/thanks"; Name = "Thanks Page" },
    @{ Path = "/cancel"; Name = "Cancel Page" },
    @{ Path = "/onboarding/complete"; Name = "Onboarding Complete" },
    @{ Path = "/onboarding/refresh"; Name = "Onboarding Refresh" },
    @{ Path = "/checkout"; Name = "Checkout" },
    @{ Path = "/seller-register"; Name = "Seller Register" },
    @{ Path = "/seller-purchase-standard"; Name = "Seller Purchase Standard" },
    @{ Path = "/admin/dashboard"; Name = "Admin Dashboard" },
    @{ Path = "/admin/sellers"; Name = "Admin Sellers" },
    @{ Path = "/admin/frames"; Name = "Admin Frames" },
    @{ Path = "/admin/payments"; Name = "Admin Payments" },
    @{ Path = "/kids-dashboard"; Name = "Kids Dashboard" }
)

$ApiRoutes = @(
    @{ Path = "/api/ping"; Method = "GET"; Name = "Health Check" },
    @{ Path = "/api/seller/summary"; Method = "GET"; Name = "Seller Summary" },
    @{ Path = "/api/seller/kids-summary"; Method = "GET"; Name = "Kids Summary" },
    @{ Path = "/api/admin/dashboard"; Method = "GET"; Name = "Admin Dashboard API" },
    @{ Path = "/api/admin/sellers"; Method = "GET"; Name = "Admin Sellers API" },
    @{ Path = "/api/admin/frames"; Method = "GET"; Name = "Admin Frames API" },
    @{ Path = "/api/admin/stripe/summary"; Method = "GET"; Name = "Stripe Summary API" }
)

$Results = @{
    Pages = @()
    Apis = @()
    Summary = @{
        Total = 0
        Success = 0
        Errors = 0
        Warnings = 0
        StartTime = Get-Date -Format "yyyy-MM-ddTHH:mm:ss.fffZ"
        EndTime = $null
    }
}

function Test-Url {
    param(
        [string]$Url,
        [string]$Name,
        [string]$Method = "GET"
    )
    
    $result = @{
        Name = $Name
        Url = $Url
        Status = "unknown"
        StatusCode = $null
        ResponseTime = $null
        Issues = @()
        Timestamp = Get-Date -Format "yyyy-MM-ddTHH:mm:ss.fffZ"
    }
    
    try {
        $startTime = Get-Date
        $response = Invoke-WebRequest -Uri $Url -Method $Method -TimeoutSec $Timeout -UseBasicParsing -ErrorAction Stop
        $responseTime = ((Get-Date) - $startTime).TotalMilliseconds
        
        $result.StatusCode = $response.StatusCode
        $result.ResponseTime = [math]::Round($responseTime, 0)
        
        if ($response.StatusCode -eq 200) {
            $result.Status = "success"
            $Results.Summary.Success++
            
            $html = $response.Content
            if ($html -notmatch "<html" -and $html -notmatch "<!DOCTYPE") {
                $result.Issues += @{ Type = "warning"; Message = "HTML structure not found" }
            }
            if ($html -match "Application error" -or $html -match "Error occurred") {
                $result.Issues += @{ Type = "error"; Message = "Next.js error page detected" }
                $result.Status = "error"
                $Results.Summary.Success--
                $Results.Summary.Errors++
            }
        }
        elseif ($response.StatusCode -ge 400 -and $response.StatusCode -lt 500) {
            $result.Status = "error"
            $result.Issues += @{ Type = "error"; Message = "HTTP $($response.StatusCode) error" }
            $Results.Summary.Errors++
        }
        elseif ($response.StatusCode -ge 500) {
            $result.Status = "error"
            $result.Issues += @{ Type = "error"; Message = "HTTP $($response.StatusCode) server error" }
            $Results.Summary.Errors++
        }
    }
    catch {
        $result.Status = "error"
        $errorMessage = $_.Exception.Message
        if ($_.Exception.Response) {
            $result.StatusCode = [int]$_.Exception.Response.StatusCode.value__
            $result.Issues += @{ Type = "error"; Message = "HTTP $($result.StatusCode) error: $errorMessage" }
        }
        else {
            $result.Issues += @{ Type = "error"; Message = "Request failed: $errorMessage" }
        }
        $Results.Summary.Errors++
    }
    
    $Results.Summary.Total++
    return $result
}

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "Checking all screens on staging..." -ForegroundColor Cyan
Write-Host "Base URL: $BaseUrl" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "Checking $($PageRoutes.Count) pages..." -ForegroundColor Magenta
Write-Host ""

foreach ($route in $PageRoutes) {
    $url = "$BaseUrl$($route.Path)"
    Write-Host "Checking: $($route.Name) ($($route.Path))" -ForegroundColor Gray -NoNewline
    $result = Test-Url -Url $url -Name $route.Name
    
    $Results.Pages += $result
    
    $statusIcon = switch ($result.Status) {
        "success" { "OK" }
        "error" { "ERROR" }
        "warning" { "WARN" }
        default { "?" }
    }
    
    $statusColor = switch ($result.Status) {
        "success" { "Green" }
        "error" { "Red" }
        "warning" { "Yellow" }
        default { "Gray" }
    }
    
    Write-Host " [$statusIcon] " -ForegroundColor $statusColor -NoNewline
    Write-Host "$($result.StatusCode) - $($result.ResponseTime)ms" -ForegroundColor White
}

Write-Host ""
Write-Host "Checking $($ApiRoutes.Count) API endpoints..." -ForegroundColor Magenta
Write-Host ""

foreach ($route in $ApiRoutes) {
    $url = "$BaseUrl$($route.Path)"
    Write-Host "Checking: $($route.Name) ($($route.Path))" -ForegroundColor Gray -NoNewline
    $result = Test-Url -Url $url -Name $route.Name -Method $route.Method
    
    $Results.Apis += $result
    
    $statusIcon = switch ($result.Status) {
        "success" { "OK" }
        "error" { "ERROR" }
        "warning" { "WARN" }
        default { "?" }
    }
    
    $statusColor = switch ($result.Status) {
        "success" { "Green" }
        "error" { "Red" }
        "warning" { "Yellow" }
        default { "Gray" }
    }
    
    Write-Host " [$statusIcon] " -ForegroundColor $statusColor -NoNewline
    Write-Host "$($result.StatusCode) - $($result.ResponseTime)ms" -ForegroundColor White
}

$Results.Summary.EndTime = Get-Date -Format "yyyy-MM-ddTHH:mm:ss.fffZ"

Write-Host ""
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "Summary" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Total: $($Results.Summary.Total)" -ForegroundColor White
Write-Host "Success: " -NoNewline
Write-Host "$($Results.Summary.Success)" -ForegroundColor Green
Write-Host "Errors: " -NoNewline
Write-Host "$($Results.Summary.Errors)" -ForegroundColor Red
Write-Host "Warnings: " -NoNewline
Write-Host "$($Results.Summary.Warnings)" -ForegroundColor Yellow
Write-Host ""
Write-Host "Start: $($Results.Summary.StartTime)" -ForegroundColor Gray
Write-Host "End: $($Results.Summary.EndTime)" -ForegroundColor Gray
Write-Host ""

if ($Results.Summary.Errors -gt 0) {
    Write-Host "==========================================" -ForegroundColor Red
    Write-Host "Errors detected:" -ForegroundColor Red
    Write-Host "==========================================" -ForegroundColor Red
    Write-Host ""
    
    $errorPages = $Results.Pages | Where-Object { $_.Status -eq "error" }
    $errorApis = $Results.Apis | Where-Object { $_.Status -eq "error" }
    
    if ($errorPages.Count -gt 0) {
        Write-Host "Pages with errors:" -ForegroundColor Yellow
        foreach ($page in $errorPages) {
            Write-Host "  ERROR: $($page.Name) ($($page.Path))" -ForegroundColor Red
            foreach ($issue in $page.Issues) {
                Write-Host "    - $($issue.Message)" -ForegroundColor Gray
            }
        }
        Write-Host ""
    }
    
    if ($errorApis.Count -gt 0) {
        Write-Host "APIs with errors:" -ForegroundColor Yellow
        foreach ($api in $errorApis) {
            Write-Host "  ERROR: $($api.Name) ($($api.Path))" -ForegroundColor Red
            foreach ($issue in $api.Issues) {
                Write-Host "    - $($issue.Message)" -ForegroundColor Gray
            }
        }
        Write-Host ""
    }
}

$jsonOutput = $Results | ConvertTo-Json -Depth 10
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "JSON Results:" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host $jsonOutput

$saveToFile = Read-Host "`nSave results to file? (y/n)"
if ($saveToFile -eq "y" -or $saveToFile -eq "Y") {
    $fileName = "staging-check-$(Get-Date -Format 'yyyyMMdd-HHmmss').json"
    $jsonOutput | Out-File -FilePath $fileName -Encoding UTF8
    Write-Host "Results saved to $fileName" -ForegroundColor Green
}

if ($Results.Summary.Errors -gt 0) {
    exit 1
} else {
    exit 0
}



