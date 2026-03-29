<?php
// ============================================================
// The Runed Deep — Cloud Save API
// Flat-file save storage with rate limiting and validation
// Saves are gzip-compressed base64 from the client
// ============================================================

header('Content-Type: application/json');

// CORS: only allow known origins
$allowedOrigins = [
    'https://dev.jdayers.com',
    'http://localhost:5173',
    'http://127.0.0.1:5173',
];
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
if (in_array($origin, $allowedOrigins, true)) {
    header("Access-Control-Allow-Origin: $origin");
    header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type');
}

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(204); exit; }

$SAVES_DIR = __DIR__ . '/saves';
$RATE_DIR  = __DIR__ . '/ratelimit';
$MAX_SAVES      = 500;
$MAX_DATA_SIZE  = 2000000;  // 2MB compressed (base64)
$RATE_WINDOW    = 3600;
$RATE_MAX_WRITE = 20;
$RATE_MAX_READ  = 60;
$CODE_PATTERN   = '/^[A-Z0-9]{5}$/';

if (!is_dir($SAVES_DIR)) mkdir($SAVES_DIR, 0755, true);
if (!is_dir($RATE_DIR))  mkdir($RATE_DIR, 0755, true);

function fail(int $code, string $msg): void {
    http_response_code($code);
    echo json_encode(['error' => $msg]);
    exit;
}

function getClientIp(): string {
    // Use REMOTE_ADDR only — X-Forwarded-For is trivially spoofed
    $ip = $_SERVER['REMOTE_ADDR'] ?? 'unknown';
    return preg_replace('/[^a-fA-F0-9.:_-]/', '', $ip);
}

function checkRate(string $ip, string $action, int $max, int $window): void {
    global $RATE_DIR;
    $file = $RATE_DIR . '/' . md5($ip . $action) . '.json';

    $entries = [];
    if (file_exists($file)) {
        $entries = json_decode(file_get_contents($file), true) ?: [];
    }

    $now = time();
    $entries = array_filter($entries, fn($t) => ($now - $t) < $window);

    if (count($entries) >= $max) {
        fail(429, 'Rate limit exceeded. Try again later.');
    }

    $entries[] = $now;
    file_put_contents($file, json_encode(array_values($entries)), LOCK_EX);
}

function cleanRateFiles(): void {
    global $RATE_DIR, $RATE_WINDOW;
    if (mt_rand(1, 20) !== 1) return;
    $cutoff = time() - ($RATE_WINDOW * 2);
    foreach (glob($RATE_DIR . '/*.json') as $f) {
        if (filemtime($f) < $cutoff) @unlink($f);
    }
}

// Block requests without a valid origin or referer (stops automated scripts)
$referer = $_SERVER['HTTP_REFERER'] ?? '';
$validRequest = false;
if ($origin && in_array($origin, $allowedOrigins, true)) {
    $validRequest = true;
} else {
    foreach ($allowedOrigins as $ao) {
        if (str_starts_with($referer, $ao)) { $validRequest = true; break; }
    }
}
if (!$validRequest) fail(403, 'Forbidden.');

$ip = getClientIp();
cleanRateFiles();

// ── GET: Retrieve a save ────────────────────────────────────
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $code = strtoupper(trim($_GET['code'] ?? ''));
    if (!preg_match($CODE_PATTERN, $code)) fail(400, 'Invalid code format.');

    checkRate($ip, 'read', $RATE_MAX_READ, $RATE_WINDOW);

    $file = $SAVES_DIR . '/' . $code . '.dat';
    if (!file_exists($file)) fail(404, 'Save not found.');

    // Return raw compressed data (client handles decompression)
    header('Content-Type: text/plain');
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
    if (strlen($data) > $MAX_DATA_SIZE) fail(400, 'Save data too large (max 2MB compressed).');

    // Validate: compressed data must be valid base64
    if (!empty($body['compressed'])) {
        if (base64_decode($data, true) === false) {
            fail(400, 'Invalid compressed data.');
        }
    } else {
        // Uncompressed: validate it looks like a game save
        $parsed = json_decode($data, true);
        if (!$parsed || !isset($parsed['hero']['name']) || !isset($parsed['currentFloor'])) {
            fail(400, 'Invalid save data format.');
        }
    }

    checkRate($ip, 'write', $RATE_MAX_WRITE, $RATE_WINDOW);

    $file = $SAVES_DIR . '/' . $code . '.dat';
    if (!file_exists($file)) {
        $count = count(glob($SAVES_DIR . '/*.dat'));
        if ($count >= $MAX_SAVES) fail(507, 'Server save limit reached.');
    }

    file_put_contents($file, $data, LOCK_EX);
    echo json_encode(['ok' => true, 'code' => $code, 'size' => strlen($data)]);
    exit;
}

fail(405, 'Method not allowed.');
