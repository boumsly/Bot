param(
  [string]$Department = 'hr',
  [string]$Answer = 'Test automate',
  [string]$NodeKey = 'intro',
  [string]$WebBase = 'http://localhost:3300',
  [string]$AiBase = 'http://localhost:8800'
)

$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'

function Write-Section($title) {
  Write-Host "`n==== $title ====\n" -ForegroundColor Cyan
}

function Invoke-JsonPost($url, $obj) {
  $json = $obj | ConvertTo-Json -Depth 10
  return Invoke-RestMethod -Method Post -Uri $url -ContentType 'application/json' -Body $json
}

try {
  Write-Section 'Health checks'
  $webHealth = Invoke-RestMethod -UseBasicParsing -Uri "$WebBase/health"
  $aiHealth = Invoke-RestMethod -UseBasicParsing -Uri "$AiBase/health"
  'WEB_HEALTH:'
  $webHealth | ConvertTo-Json -Compress
  'AI_HEALTH:'
  $aiHealth | ConvertTo-Json -Compress

  Write-Section 'Start session'
  $start = Invoke-JsonPost "$WebBase/api/session/start" @{ departmentKey = $Department }
  if (-not $start.sessionId) { throw 'No sessionId in start response' }
  $sid = $start.sessionId
  "SessionId: $sid"
  'START_JSON:'
  $start | ConvertTo-Json -Compress

  Write-Section 'Post answer & get next question'
  $answerResp = Invoke-JsonPost "$WebBase/api/session/$sid/answer" @{ answer = $Answer; nodeKey = $NodeKey }
  'ANSWER_JSON:'
  $answerResp | ConvertTo-Json -Depth 10 -Compress

  exit 0
}
catch {
  Write-Error $_.Exception.Message
  if ($_.ErrorDetails.Message) { Write-Error $_.ErrorDetails.Message }
  exit 1
}
