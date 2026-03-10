$token = Get-Content "token.txt"
$headers = @{ Authorization = "Bearer $token" }

try {
    # Replace the UUID with the one from the frontend logs
    $response = Invoke-RestMethod -Uri "http://localhost:8083/api/visit-control-reports/3ae04c99-9c42-45cb-be75-2b1966a4be90/download" -Headers $headers
    Write-Host "Success"
}
catch {
    Write-Host "Status Code: "$_.Exception.Response.StatusCode
    $stream = $_.Exception.Response.GetResponseStream()
    $reader = New-Object System.IO.StreamReader($stream)
    $errorJson = $reader.ReadToEnd()
    Write-Host "Response Body:"
    Write-Host $errorJson
}
