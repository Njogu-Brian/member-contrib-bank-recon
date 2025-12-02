# Comprehensive Mobile App Endpoint Testing Script
# Tests all mobile endpoints with sample data

$baseUrl = "http://localhost:8000/api/v1"
$testResults = @()
$authToken = $null

function Test-Endpoint {
    param(
        [string]$Method,
        [string]$Path,
        [hashtable]$Body = $null,
        [string]$Token = $null,
        [string]$TestName,
        [bool]$ExpectSuccess = $true
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
        
        $response = $null
        if ($Method -eq "GET") {
            $response = Invoke-RestMethod -Uri $uri -Method Get -Headers $headers -ErrorAction Stop
        }
        elseif ($Method -eq "POST") {
            $response = Invoke-RestMethod -Uri $uri -Method Post -Headers $headers -Body ($Body | ConvertTo-Json) -ErrorAction Stop
        }
        elseif ($Method -eq "PUT") {
            $response = Invoke-RestMethod -Uri $uri -Method Put -Headers $headers -Body ($Body | ConvertTo-Json) -ErrorAction Stop
        }
        
        $status = if ($ExpectSuccess) { "PASS" } else { "PASS (Expected Fail)" }
        $testResults += [PSCustomObject]@{
            Test = $TestName
            Method = $Method
            Path = $Path
            Status = $status
            Message = "Success"
        }
        Write-Host "  ✓ PASS" -ForegroundColor Green
        return $response
    }
    catch {
        $statusCode = 0
        $message = $_.Exception.Message
        if ($_.Exception.Response) {
            $statusCode = $_.Exception.Response.StatusCode.value__
            $message = "HTTP $statusCode"
        }
        
        $status = if ($ExpectSuccess) { "FAIL" } else { "PASS (Expected Fail)" }
        $testResults += [PSCustomObject]@{
            Test = $TestName
            Method = $Method
            Path = $Path
            Status = $status
            Message = $message
        }
        
        if ($ExpectSuccess) {
            Write-Host "  ✗ FAIL: $message" -ForegroundColor Red
        } else {
            Write-Host "  ✓ PASS (Expected failure)" -ForegroundColor Yellow
        }
        return $null
    }
}

Write-Host "`n=== COMPREHENSIVE MOBILE APP ENDPOINT TESTING ===" -ForegroundColor Yellow
Write-Host "Base URL: $baseUrl`n" -ForegroundColor Gray

# Phase 1: Authentication
Write-Host "`n--- PHASE 1: AUTHENTICATION ---" -ForegroundColor Magenta

# Test 1.1: Register (if needed)
$registerData = @{
    name = "Mobile Test User"
    email = "mobiletest@evimeria.test"
    password = "TestPassword123!"
    password_confirmation = "TestPassword123!"
}
$registerResponse = Test-Endpoint -Method "POST" -Path "/mobile/auth/register" -Body $registerData -TestName "User Registration" -ExpectSuccess $false

# Test 1.2: Login
$loginData = @{
    email = "mobiletest@evimeria.test"
    password = "TestPassword123!"
}
$loginResponse = Test-Endpoint -Method "POST" -Path "/mobile/auth/login" -Body $loginData -TestName "User Login"

if ($loginResponse -and $loginResponse.token) {
    $authToken = $loginResponse.token
    Write-Host "  Token obtained successfully" -ForegroundColor Green
} else {
    Write-Host "  ⚠️  No token received, some tests will fail" -ForegroundColor Yellow
}

# Test 1.3: Get Current User
if ($authToken) {
    $userResponse = Test-Endpoint -Method "GET" -Path "/mobile/auth/me" -Token $authToken -TestName "Get Current User"
}

# Phase 2: KYC
Write-Host "`n--- PHASE 2: KYC ---" -ForegroundColor Magenta

if ($authToken) {
    # Get KYC Profile
    $kycProfile = Test-Endpoint -Method "GET" -Path "/mobile/kyc/profile" -Token $authToken -TestName "Get KYC Profile"
    
    # Update KYC Profile
    $kycData = @{
        first_name = "Mobile"
        last_name = "Test"
        date_of_birth = "1990-01-01"
        phone_number = "+254712345678"
        address = "123 Test Street"
        city = "Nairobi"
        country = "Kenya"
    }
    Test-Endpoint -Method "PUT" -Path "/mobile/kyc/profile" -Body $kycData -Token $authToken -TestName "Update KYC Profile"
}

# Phase 3: Wallets & Contributions
Write-Host "`n--- PHASE 3: WALLETS & CONTRIBUTIONS ---" -ForegroundColor Magenta

if ($authToken) {
    # Get Wallets
    $walletsResponse = Test-Endpoint -Method "GET" -Path "/mobile/wallets" -Token $authToken -TestName "Get Wallets"
    
    # Create Contribution (if wallet exists)
    if ($walletsResponse -and $walletsResponse.Count -gt 0) {
        $walletId = $walletsResponse[0].id
        $contributionData = @{
            amount = 5000
            source = "mobile_app"
            reference = "Test contribution from script"
        }
        Test-Endpoint -Method "POST" -Path "/mobile/wallets/$walletId/contributions" -Body $contributionData -Token $authToken -TestName "Create Contribution"
    }
}

# Phase 4: Investments
Write-Host "`n--- PHASE 4: INVESTMENTS ---" -ForegroundColor Magenta

if ($authToken) {
    # Get Investments
    $investmentsResponse = Test-Endpoint -Method "GET" -Path "/mobile/investments" -Token $authToken -TestName "Get Investments"
    
    # Create Investment
    $investmentData = @{
        investment_type_id = 1
        amount = 25000
        start_date = (Get-Date).ToString("yyyy-MM-dd")
        maturity_date = (Get-Date).AddMonths(12).ToString("yyyy-MM-dd")
    }
    $newInvestment = Test-Endpoint -Method "POST" -Path "/mobile/investments" -Body $investmentData -Token $authToken -TestName "Create Investment"
    
    # Get ROI (if investment exists)
    if ($investmentsResponse -and $investmentsResponse.data -and $investmentsResponse.data.Count -gt 0) {
        $investmentId = $investmentsResponse.data[0].id
        Test-Endpoint -Method "GET" -Path "/mobile/investments/$investmentId/roi" -Token $authToken -TestName "Get Investment ROI"
    }
}

# Phase 5: Dashboard
Write-Host "`n--- PHASE 5: DASHBOARD ---" -ForegroundColor Magenta

if ($authToken) {
    Test-Endpoint -Method "GET" -Path "/mobile/dashboard" -Token $authToken -TestName "Get Dashboard Data"
}

# Phase 6: Meetings & Voting
Write-Host "`n--- PHASE 6: MEETINGS & VOTING ---" -ForegroundColor Magenta

if ($authToken) {
    # Get Meetings (using admin route, but accessible)
    $meetingsResponse = Test-Endpoint -Method "GET" -Path "/admin/meetings" -Token $authToken -TestName "Get Meetings"
    
    # Vote on Motion (if motion exists - need to get from meetings)
    # This would require getting a motion ID from the meetings response
}

# Phase 7: Announcements
Write-Host "`n--- PHASE 7: ANNOUNCEMENTS ---" -ForegroundColor Magenta

if ($authToken) {
    Test-Endpoint -Method "GET" -Path "/admin/announcements" -Token $authToken -TestName "Get Announcements"
}

# Phase 8: Reports
Write-Host "`n--- PHASE 8: REPORTS ---" -ForegroundColor Magenta

if ($authToken) {
    Test-Endpoint -Method "GET" -Path "/admin/reports/summary" -Token $authToken -TestName "Get Reports Summary"
}

# Phase 9: MFA
Write-Host "`n--- PHASE 9: MFA ---" -ForegroundColor Magenta

if ($authToken) {
    # Disable MFA (safe to test)
    Test-Endpoint -Method "POST" -Path "/mobile/mfa/disable" -Token $authToken -TestName "Disable MFA"
}

# Phase 10: Logout
Write-Host "`n--- PHASE 10: LOGOUT ---" -ForegroundColor Magenta

if ($authToken) {
    Test-Endpoint -Method "POST" -Path "/mobile/auth/logout" -Token $authToken -TestName "Logout"
}

# Summary
Write-Host "`n=== TEST SUMMARY ===" -ForegroundColor Yellow
$passed = ($testResults | Where-Object { $_.Status -like "PASS*" }).Count
$failed = ($testResults | Where-Object { $_.Status -eq "FAIL" }).Count
$total = $testResults.Count

Write-Host "Total Tests: $total" -ForegroundColor White
Write-Host "Passed: $passed" -ForegroundColor Green
Write-Host "Failed: $failed" -ForegroundColor Red
if ($total -gt 0) {
    Write-Host "Success Rate: $([math]::Round(($passed / $total) * 100, 2))%" -ForegroundColor Cyan
}

# Export results
$testResults | Export-Csv -Path "mobile_endpoint_test_results.csv" -NoTypeInformation
Write-Host "`nResults exported to: mobile_endpoint_test_results.csv" -ForegroundColor Green

# Show failed tests
if ($failed -gt 0) {
    Write-Host "`n--- FAILED TESTS ---" -ForegroundColor Red
    $testResults | Where-Object { $_.Status -eq "FAIL" } | Format-Table Test, Method, Path, Message -AutoSize
}

Write-Host "`n=== TESTING COMPLETE ===" -ForegroundColor Yellow

