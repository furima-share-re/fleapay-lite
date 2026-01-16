# Simple staging verification script
$BaseUrl = "https://fleapay-lite-t1.onrender.com"

Write-Host "=== Verification Environment Check ===" -ForegroundColor Cyan
Write-Host ""

# 1. Health Check
Write-Host "1. Health Check (/api/ping)" -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "$BaseUrl/api/ping" -UseBasicParsing -TimeoutSec 15
    $data = $response.Content | ConvertFrom-Json
    Write-Host "   Status: $($response.StatusCode)" -ForegroundColor Green
    Write-Host "   Version: $($data.version)" -ForegroundColor Green
    Write-Host "   Prisma: $($data.prisma)" -ForegroundColor Green
    if ($data.git) {
        Write-Host "   Git Commit: $($data.git.commit)" -ForegroundColor Green
    }
} catch {
    Write-Host "   Error: $_" -ForegroundColor Red
    Write-Host "   Server may be starting up or down" -ForegroundColor Yellow
}

Write-Host ""

# 2. API Endpoints
Write-Host "2. API Endpoints" -ForegroundColor Yellow
$tests = @(
    @{url="$BaseUrl/api/seller/summary?s=test-seller-standard"; name="Standard"; plan="standard"},
    @{url="$BaseUrl/api/seller/summary?s=test-seller-pro"; name="Pro"; plan="pro"},
    @{url="$BaseUrl/api/seller/summary?s=test-seller-kids"; name="Kids"; plan="kids"}
)

foreach ($test in $tests) {
    try {
        $response = Invoke-WebRequest -Uri $test.url -UseBasicParsing -TimeoutSec 15
        $data = $response.Content | ConvertFrom-Json
        if ($data.planType -eq $test.plan) {
            Write-Host "   OK $($test.name): planType=$($data.planType), isSubscribed=$($data.isSubscribed)" -ForegroundColor Green
        } else {
            Write-Host "   WARN $($test.name): planType mismatch" -ForegroundColor Yellow
        }
    } catch {
        Write-Host "   ERROR $($test.name): $_" -ForegroundColor Red
    }
}

Write-Host ""

# 3. Pages
Write-Host "3. Pages" -ForegroundColor Yellow
$pages = @(
    @{url="$BaseUrl/seller-dashboard?s=test-seller-pro"; name="Dashboard"},
    @{url="$BaseUrl/seller-purchase-standard.html?s=test-seller-pro"; name="Purchase"}
)

foreach ($page in $pages) {
    try {
        $response = Invoke-WebRequest -Uri $page.url -UseBasicParsing -TimeoutSec 15
        Write-Host "   OK $($page.name): Status $($response.StatusCode)" -ForegroundColor Green
    } catch {
        Write-Host "   ERROR $($page.name): $_" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "=== Verification Complete ===" -ForegroundColor Cyan

