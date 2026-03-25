<?php
// ============================================================
// The Runed Deep — Cloud Save API
// Flat-file save storage with rate limiting and validation
// ============================================================

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(204); exit; }

$SAVES_DIR = __DIR__ . '/saves';
$RATE_DIR  = __DIR__ . '/ratelimit';
$MAX_SAVES      = 500;     // total saves on server
$MAX_FILE_SIZE  = 512000;  // 512KB per save
$RATE_WINDOW    = 3600;    // 1 hour
$RATE_MAX_WRITE = 20;      // max writes per IP per hour
$RATE_MAX_READ  = 60;      // max reads per IP per hour
$CODE_PATTERN   = '/^[A-Z0-9]{5}$/';

if (!is_dir($SAVES_DIR)) mkdir($SAVES_DIR, 0755, true);
if (!is_dir($RATE_DIR))  mkdir($RATE_DIR, 0755, true);

function fail(int $code, string $msg): void {
    http_response_code($code);
    echo json_encode(['error' => $msg]);
    exit;
}

function getClientIp(): string {
    $ip = $_SERVER['HTTP_X_FORWARDED_FOR'] ?? $_SERVER['REMOTE_ADDR'] ?? 'unknown';
    // Take first IP if comma-separated
    return preg_replace('/[^a-fA-F0-9.:_-]/', '', explode(',', $ip)[0]);
}

function checkRate(string $ip, string $action, int $max, int $window): void {
    global $RATE_DIR;
    $file = $RATE_DIR . '/' . md5($ip . $action) . '.json';

    $entries = [];
    if (file_exists($file)) {
        $entries = json_decode(file_get_contents($file), true) ?: [];
    }

    $now = time();
    // Prune old entries
    $entries = array_filter($entries, fn($t) => ($now - $t) < $window);

    if (count($entries) >= $max) {
        fail(429, 'Rate limit exceeded. Try again later.');
    }

    $entries[] = $now;
    file_put_contents($file, json_encode(array_values($entries)), LOCK_EX);
}

function cleanRateFiles(): void {
    global $RATE_DIR, $RATE_WINDOW;
    // 5% chance to clean up stale rate limit files
    if (mt_rand(1, 20) !== 1) return;
    $cutoff = time() - ($RATE_WINDOW * 2);
    foreach (glob($RATE_DIR . '/*.json') as $f) {
        if (filemtime($f) < $cutoff) @unlink($f);
    }
}

function validateSaveData(string $json): bool {
    $data = json_decode($json, true);
    if (!$data) return false;
    // Must have basic game state fields
    $required = ['hero', 'currentFloor', 'currentDungeon', 'turn'];
    foreach ($required as $key) {
        if (!array_key_exists($key, $data)) return false;
    }
    // Hero must have name and position
    if (!isset($data['hero']['name']) || !isset($data['hero']['position'])) return false;
    return true;
}

$ip = getClientIp();
cleanRateFiles();

// ── GET: Retrieve a save ────────────────────────────────────
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $code = strtoupper(trim($_GET['code'] ?? ''));
    if (!preg_match($CODE_PATTERN, $code)) fail(400, 'Invalid code format.');

    checkRate($ip, 'read', $RATE_MAX_READ, $RATE_WINDOW);

    $file = $SAVES_DIR . '/' . $code . '.json';
    if (!file_exists($file)) fail(404, 'Save not found.');

    echo file_get_contents($file);
    exit;
}

// ── POST: Store a save ──────────────────────────────────────
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $body = json_decode(file_get_contents('php://input'), true);
    if (!$body) fail(400, 'Invalid JSON body.');

    $code = strtoupper(trim($body['code'] ?? ''));
    $data = $body['data'] ?? '';

    if (!preg_match($CODE_PATTERN, $code)) fail(400, 'Invalid code format.');
    if (!is_string($data) || strlen($data) < 10) fail(400, 'Missing save data.');
    if (strlen($data) > $MAX_FILE_SIZE) fail(400, 'Save data too large (max 512KB).');

    // Validate it looks like a real game save
    if (!validateSaveData($data)) fail(400, 'Invalid save data format.');

    checkRate($ip, 'write', $RATE_MAX_WRITE, $RATE_WINDOW);

    // Check total save count (only for NEW saves, not overwrites)
    $file = $SAVES_DIR . '/' . $code . '.json';
    if (!file_exists($file)) {
        $count = count(glob($SAVES_DIR . '/*.json'));
        if ($count >= $MAX_SAVES) fail(507, 'Server save limit reached.');
    }

    file_put_contents($file, $data, LOCK_EX);
    echo json_encode(['ok' => true, 'code' => $code]);
    exit;
}

fail(405, 'Method not allowed.');
