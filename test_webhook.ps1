try {
  $unauth = Invoke-RestMethod -Uri 'http://localhost:3005/api/telegram/webhook' -Method Post -Body '{}' -ContentType 'application/json' -ErrorAction Stop
} catch {
  Write-Host "Auth check: correctly rejected unauthorized request."
}

$headers = @{
  "x-webhook-secret" = "silvia_telegram_secret_2026_secure"
}

$payload = @{
  platform = "telegram"
  eventType = "NEW_MESSAGE"
  updateId = 1001
  chat = @{
    id = "-100123456789"
    title = "Test Group"
    type = "supergroup"
  }
  message = @{
    id = 50
    text = "Customer: John Doe`nOrder ID: ORD-9900`nAmount: 4500`nStatus: Pending"
    date = 1795500000
  }
  sender = @{
    id = "999"
    name = "John"
  }
} | ConvertTo-Json -Depth 5

Write-Host "Sending valid test payload..."
$res1 = Invoke-RestMethod -Uri "http://localhost:3005/api/telegram/webhook" -Method Post -Headers $headers -Body $payload -ContentType "application/json"
$res1 | ConvertTo-Json

Write-Host "`nTesting Idempotency (re-sending same updateId 1001)..."
$res2 = Invoke-RestMethod -Uri "http://localhost:3005/api/telegram/webhook" -Method Post -Headers $headers -Body $payload -ContentType "application/json"
$res2 | ConvertTo-Json
