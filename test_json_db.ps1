$headers = @{ "x-webhook-secret" = "silvia_telegram_secret_2026_secure" }

# 1. Send webhook
$payload = @{
  platform = "telegram"
  eventType = "NEW_MESSAGE"
  updateId = 5001
  chat = @{ id = "-100123456789"; title = "Production Group"; type = "supergroup" }
  message = @{
    id = 101
    text = "Customer: Sarah Connor`nOrder ID: ORD-7788`nAmount: 12500`nStatus: Approved"
    date = 1795501000
  }
  sender = @{ id = "888"; name = "Sarah" }
} | ConvertTo-Json -Depth 5

Write-Host "--- 1. POST /api/telegram/webhook (Writes to database.json) ---"
$postRes = Invoke-RestMethod -Uri "http://localhost:3005/api/telegram/webhook" -Method Post -Headers $headers -Body $payload -ContentType "application/json"
$postRes | ConvertTo-Json

Write-Host "`n--- 2. GET /api/telegram/data (Reads entire JSON DB through API) ---"
$getAll = Invoke-RestMethod -Uri "http://localhost:3005/api/telegram/data" -Method Get
$getAll | ConvertTo-Json -Depth 5

Write-Host "`n--- 3. GET /api/telegram/data/order/ORD-7788 (Queries JSON DB by Order ID) ---"
$getOne = Invoke-RestMethod -Uri "http://localhost:3005/api/telegram/data/order/ORD-7788" -Method Get
$getOne | ConvertTo-Json -Depth 5
