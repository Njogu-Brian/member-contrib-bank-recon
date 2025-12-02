# Comprehensive Mobile App API Testing Script
# Tests all endpoints used by the Flutter mobile app

$baseUrl = "http://localhost:8000/api"
$testResults = @()

function Test-ApiEndpoint {
    param(
        [string]$Method,
        [string]$Path,
        [hashtable]$Body = $null,
        [string]$Token = $null,
        [string]$TestName
    )
    
    $headers = @{
        "Content-Type" = "application/json"
        "Accept" = "application/json"
    }
    
    if ($Token) {
        $headers["Authorization"] = "Bearer $Token"
    }
    
    try {
        $uri = "$baseUrl$Path"
        Write-Host "Testing: $TestName" -ForegroundColor Cyan
        Write-Host "  $Method $Path" -ForegroundColor Gray
        
        if ($Method -eq "GET") {
            $response = Invoke-RestMethod -Uri $uri -Method Get -Headers $headers -ErrorAction Stop
        }
        elseif ($Method -eq "POST") {
            $response = Invoke-RestMethod -Uri $uri -Method Post -Headers $headers -Body ($Body | ConvertTo-Json) -ErrorAction Stop
        }
        elseif ($Method -eq "PUT") {
            $response = Invoke-RestMethod -Uri $uri -Method Put -Headers $headers -Body ($Body | ConvertTo-Json) -ErrorAction Stop
        }
        elseif ($Method -eq "DELETE") {
            $response = Invoke-RestMethod -Uri $uri -Method Delete -Headers $headers -ErrorAction Stop
        }
        
        $testResults += [PSCustomObject]@{
            Test = $TestName
            Method = $Method
            Path = $Path
            Status = "PASS"
            Message = "Success"
            Response = $response
        }
        Write-Host "  ✓ PASS" -ForegroundColor Green
        return $response
    }
    catch {
        $status = "FAIL"
        $message = $_.Exception.Message
        if ($_.Exception.Response) {
            $statusCode = $_.Exception.Response.StatusCode.value__
            $message = "HTTP $statusCode : $message"
        }
        
        $testResults += [PSCustomObject]@{
            Test = $TestName
            Method = $Method
            Path = $Path
            Status = $status
            Message = $message
            Response = $null
        }
        Write-Host "  ✗ FAIL: $message" -ForegroundColor Red
        return $null
    }
}

Write-Host "`n=== MOBILE APP API COMPREHENSIVE TESTING ===" -ForegroundColor Yellow
Write-Host "Base URL: $baseUrl`n" -ForegroundColor Gray

# Phase 1: Authentication Tests
Write-Host "`n--- PHASE 1: AUTHENTICATION ---" -ForegroundColor Magenta

# Test 1.1: User Registration
$registerData = @{
    name = "Test User $(Get-Date -Format 'yyyyMMddHHmmss')"
    email = "testuser$(Get-Date -Format 'yyyyMMddHHmmss')@evimeria.test"
    password = "TestPassword123!"
    password_confirmation = "TestPassword123!"
}
$registerResponse = Test-ApiEndpoint -Method "POST" -Path "/mobile/auth/register" -Body $registerData -TestName "User Registration"

# Test 1.2: User Login
$loginData = @{
    email = "testuser@example.com"  # Use existing test user or the one just created
    password = "password"
}
$loginResponse = Test-ApiEndpoint -Method "POST" -Path "/mobile/auth/login" -Body $loginData -TestName "User Login"

$authToken = $null
if ($loginResponse -and $loginResponse.token) {
    $authToken = $loginResponse.token
    Write-Host "  Token obtained: $($authToken.Substring(0, [Math]::Min(20, $authToken.Length)))..." -ForegroundColor Green
}

# Test 1.3: Get Current User
if ($authToken) {
    $userResponse = Test-ApiEndpoint -Method "GET" -Path "/mobile/auth/me" -Token $authToken -TestName "Get Current User"
}

# Test 1.4: Password Reset Request
Test-ApiEndpoint -Method "POST" -Path "/password/email" -Body @{email = "test@example.com"} -TestName "Password Reset Request"

# Phase 2: KYC Tests
Write-Host "`n--- PHASE 2: KYC ---" -ForegroundColor Magenta

if ($authToken) {
    # Test 2.1: Get KYC Profile
    Test-ApiEndpoint -Method "GET" -Path "/mobile/kyc/profile" -Token $authToken -TestName "Get KYC Profile"
    
    # Test 2.2: Update KYC Profile
    $kycData = @{
        first_name = "Test"
        last_name = "User"
        date_of_birth = "1990-01-01"
        phone_number = "+254712345678"
        address = "123 Test Street"
        city = "Nairobi"
        country = "Kenya"
    }
    Test-ApiEndpoint -Method "PUT" -Path "/mobile/kyc/profile" -Body $kycData -Token $authToken -TestName "Update KYC Profile"
}

# Phase 3: Wallets & Contributions
Write-Host "`n--- PHASE 3: WALLETS AND CONTRIBUTIONS ---" -ForegroundColor Magenta

if ($authToken) {
    # Test 3.1: Get Wallets
    $walletsResponse = Test-ApiEndpoint -Method "GET" -Path "/mobile/wallets" -Token $authToken -TestName "Get Wallets"
    
    # Test 3.2: Create Contribution (if wallet exists)
    if ($walletsResponse -and $walletsResponse.Count -gt 0) {
        $walletId = $walletsResponse[0].id
        $contributionData = @{
            amount = 1000
            source = "mobile_app"
            reference = "Test contribution"
        }
        Test-ApiEndpoint -Method "POST" -Path "/mobile/wallets/$walletId/contributions" -Body $contributionData -Token $authToken -TestName "Create Contribution"
    }
}

# Phase 4: Investments
Write-Host "`n--- PHASE 4: INVESTMENTS ---" -ForegroundColor Magenta

if ($authToken) {
    # Test 4.1: Get Investments
    Test-ApiEndpoint -Method "GET" -Path "/mobile/investments" -Token $authToken -TestName "Get Investments"
}

# Phase 5: Reports
Write-Host "`n--- PHASE 5: REPORTS ---" -ForegroundColor Magenta

if ($authToken) {
    # Test 5.1: Get Reports Summary
    Test-ApiEndpoint -Method "GET" -Path "/reports/summary" -Token $authToken -TestName "Get Reports Summary"
    
    # Test 5.2: Get Expense Reports
    Test-ApiEndpoint -Method "GET" -Path "/reports/expenses" -Token $authToken -TestName "Get Expense Reports"
}

# Phase 6: Meetings
Write-Host "`n--- PHASE 6: MEETINGS ---" -ForegroundColor Magenta

if ($authToken) {
    # Test 6.1: Get Meetings
    Test-ApiEndpoint -Method "GET" -Path "/meetings" -Token $authToken -TestName "Get Meetings"
}

# Phase 7: Announcements
Write-Host "`n--- PHASE 7: ANNOUNCEMENTS ---" -ForegroundColor Magenta

if ($authToken) {
    # Test 7.1: Get Announcements
    Test-ApiEndpoint -Method "GET" -Path "/announcements" -Token $authToken -TestName "Get Announcements"
}

# Phase 8: Dashboard
Write-Host "`n--- PHASE 8: DASHBOARD ---" -ForegroundColor Magenta

if ($authToken) {
    # Test 8.1: Get Dashboard Data
    Test-ApiEndpoint -Method "GET" -Path "/mobile/dashboard" -Token $authToken -TestName "Get Dashboard Data"
}

# Phase 9: MFA
Write-Host "`n--- PHASE 9: MFA ---" -ForegroundColor Magenta

if ($authToken) {
    # Test 9.1: Enable MFA (will fail without proper setup, but tests endpoint)
    Test-ApiEndpoint -Method "POST" -Path "/mobile/mfa/enable" -Body @{code = "123456"} -Token $authToken -TestName "Enable MFA"
    
    # Test 9.2: Disable MFA
    Test-ApiEndpoint -Method "POST" -Path "/mobile/mfa/disable" -Token $authToken -TestName "Disable MFA"
}

# Phase 10: Logout
Write-Host "`n--- PHASE 10: LOGOUT ---" -ForegroundColor Magenta

if ($authToken) {
    Test-ApiEndpoint -Method "POST" -Path "/mobile/auth/logout" -Token $authToken -TestName "Logout"
}

# Summary
Write-Host "`n=== TEST SUMMARY ===" -ForegroundColor Yellow
$passed = ($testResults | Where-Object { $_.Status -eq "PASS" }).Count
$failed = ($testResults | Where-Object { $_.Status -eq "FAIL" }).Count
$total = $testResults.Count

Write-Host "Total Tests: $total" -ForegroundColor White
Write-Host "Passed: $passed" -ForegroundColor Green
Write-Host "Failed: $failed" -ForegroundColor Red
Write-Host "Success Rate: $([math]::Round(($passed / $total) * 100, 2))%" -ForegroundColor Cyan

# Export results
$testResults | Export-Csv -Path "api_test_results.csv" -NoTypeInformation
Write-Host "`nResults exported to: api_test_results.csv" -ForegroundColor Green

# Show failed tests
if ($failed -gt 0) {
    Write-Host "`n--- FAILED TESTS ---" -ForegroundColor Red
    $testResults | Where-Object { $_.Status -eq "FAIL" } | Format-Table Test, Method, Path, Message -AutoSize
}

