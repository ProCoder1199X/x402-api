$ErrorActionPreference = "Stop"
$base = if ($env:SMOKE_BASE_URL) { $env:SMOKE_BASE_URL } else { "http://localhost:8080" }
$routes = @(
  "/alpharoute/api/v1/quote?tokenIn=0x0000000000000000000000000000000000000001&tokenOut=0x0000000000000000000000000000000000000002&amountIn=1000&chainId=8453",
  "/sentinelfeed/api/v1/events?topic=token_launch",
  "/complyrail/api/v1/screen/transaction?from=0x0000000000000000000000000000000000000001&to=0x0000000000000000000000000000000000000002&amount=1&asset=USDC",
  "/distillforge/api/v1/models",
  "/proofmesh/api/v1/verify/status/stub-proof"
)

foreach ($route in $routes) {
  try { Invoke-WebRequest "$base$route" -UseBasicParsing | Out-Null; throw "Expected HTTP 402: $route" }
  catch { if ($_.Exception.Response.StatusCode.value__ -ne 402) { throw } }
  Write-Host "402 confirmed: $route"
}

Write-Host "For signed retries, set AGENT_WALLET_PRIVATE_KEY and run: npx tsx scripts/smoke-test.ts"
Write-Host "The x402-fetch client signs EIP-3009 transferWithAuthorization payloads and retries automatically."
