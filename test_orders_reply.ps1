$body = @{
  platform = "telegram"
  eventType = "NEW_MESSAGE"
  updateId = 8888
  chat = @{ id = "-100123456789"; title = "telegram bot" }
  message = @{ id = 50; text = "/orders" }
  sender = @{ id = "7013806825"; name = "Infanta" }
} | ConvertTo-Json -Depth 5

$res = Invoke-RestMethod -Uri "http://localhost:3005/api/telegram/webhook" -Method Post -Headers @{"x-webhook-secret"="silvia_telegram_secret_2026_secure"} -Body $body -ContentType "application/json"
Write-Host $res.replyText
