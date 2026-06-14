<?php
// ============================================================
// The Runed Deep — Cloud Save API
// Flat-file save storage with rate limiting and validation
// Saves are gzip-compressed base64 from the client
// ============================================================

$ALLOWED_ORIGINS = ['https://dev.jdayers.com', 'https://jdayers.com', 'https://www.jdayers.com'];

header('Content-Type: application/json');
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
if (in_array($origin, $ALLOWED_ORIGINS, true)) {
    header('Access-Control-Allow-Origin: ' . $origin);
    header('Vary: Origin');
}
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
header('X-Content-Type-Options: nosniff');
header('Cache-Control: no-store');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(204); exit; }

$SAVES_DIR = __DIR__ . '/saves';
$RATE_DIR  = __DIR__ . '/ratelimit';
$MAX_SAVES      = 500;
$MAX_DATA_SIZE  = 1000000;  // 1MB compressed (base64) — real saves are far below this
$MIN_DATA_SIZE  = 24;       // smallest plausible gzip+base64 blob
$MAX_INFLATED   = 5000000;  // 5MB decompressed cap (bomb guard)
$SAVE_TTL       = 7776000;  // 90 days — only stale saves are evictable when full
$RATE_WINDOW    = 3600;
$RATE_MAX_WRITE = 20;
$RATE_MAX_READ  = 60;
$CODE_PATTERN   = '/^[A-HJ-NP-Z2-9]{5}$/';  // matches client alphabet (no 0/O/1/I/L)

function fail(int $code, string $msg): void {
    http_response_code($code);
    echo json_encode(['error' => $msg]);
    exit;
}

function ensureDir(string $dir): void {
    if (!is_dir($dir) && !mkdir($dir, 0755, true) && !is_dir($dir)) {
        fail(500, 'Storage unavailable.');
    }
    $ht = $dir . '/.htaccess';
    if (!file_exists($ht)) @file_put_contents($ht, "Require all denied\nOptions -Indexes\n");
}

function getClientIp(): string {
    // REMOTE_ADDR only — X-Forwarded-For is trivially spoofed
    $ip = $_SERVER['REMOTE_ADDR'] ?? '';
    return filter_var($ip, FILTER_VALIDATE_IP) ? $ip : 'unknown';
}

function checkRate(string $ip, string $action, int $max, int $window): void {
    global $RATE_DIR;
    $file = $RATE_DIR . '/' . md5($ip . $action) . '.json';
    $fp = fopen($file, 'c+');
    if ($fp === false) return; // fail open — availability over strict limiting
    if (!flock($fp, LOCK_EX)) { fclose($fp); return; }

    $raw = stream_get_contents($fp);
    $entries = $raw ? (json_decode($raw, true) ?: []) : [];
    $now = time();
    $entries = array_values(array_filter($entries, fn($t) => ($now - $t) < $window));

    if (count($entries) >= $max) {
        flock($fp, LOCK_UN); fclose($fp);
        fail(429, 'Rate limit exceeded. Try again later.');
    }

    $entries[] = $now;
    ftruncate($fp, 0); rewind($fp);
    fwrite($fp, json_encode($entries));
    fflush($fp); flock($fp, LOCK_UN); fclose($fp);
}

function cleanRateFiles(): void {
    global $RATE_DIR, $RATE_WINDOW;
    if (mt_rand(1, 50) !== 1) return;
    $cutoff = time() - ($RATE_WINDOW * 2);
    foreach (glob($RATE_DIR . '/*.json') as $f) {
        if (filemtime($f) < $cutoff) @unlink($f);
    }
}

// Count .dat saves, short-circuiting once the cap is reached.
function countSaves(string $dir, int $cap): int {
    $dh = opendir($dir);
    if ($dh === false) return 0;
    $n = 0;
    while (($f = readdir($dh)) !== false) {
        if (substr($f, -4) === '.dat' && ++$n >= $cap) break;
    }
    closedir($dh);
    return $n;
}

// Evict the oldest save, but only if it is older than the TTL (active saves are safe).
function evictOldest(string $dir, int $ttl): bool {
    $oldest = null; $oldestTime = PHP_INT_MAX;
    foreach (glob($dir . '/*.dat') as $f) {
        $m = filemtime($f);
        if ($m !== false && $m < $oldestTime) { $oldestTime = $m; $oldest = $f; }
    }
    if ($oldest !== null && (time() - $oldestTime) > $ttl) return @unlink($oldest);
    return false;
}

// Validate that a payload is a real save (same shape check for both branches).
function validateSaveBlob(string $data, bool $compressed): void {
    global $MAX_INFLATED;
    if ($compressed) {
        $raw = base64_decode($data, true);
        if ($raw === false || substr($raw, 0, 3) !== "\x1f\x8b\x08") fail(400, 'Invalid compressed data.');
        $json = @gzdecode($raw, $MAX_INFLATED);
        if ($json === false) fail(400, 'Invalid compressed data.');
    } else {
        $json = $data;
    }
    if (strlen($json) > $MAX_INFLATED) fail(400, 'Save too large.');
    $parsed = json_decode($json, true);
    if (!is_array($parsed) || !isset($parsed['hero']['name']) || !isset($parsed['currentFloor'])) {
        fail(400, 'Invalid save data format.');
    }
}

ensureDir($SAVES_DIR);
ensureDir($RATE_DIR);

$ip = getClientIp();
cleanRateFiles();

// ── GET: Retrieve a save ────────────────────────────────────
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $code = strtoupper(trim((string)($_GET['code'] ?? '')));
    if (!preg_match($CODE_PATTERN, $code)) fail(400, 'Invalid code format.');

    checkRate($ip, 'read', $RATE_MAX_READ, $RATE_WINDOW);

    $file = $SAVES_DIR . '/' . $code . '.dat';
    if (!file_exists($file)) fail(404, 'Save not found.');

    @touch($file); // keep active saves from being evicted
    // Success body is raw compressed text; error responses are JSON.
    header('Content-Type: text/plain');
    readfile($file);
    exit;
}

// ── POST: Store a save ──────────────────────────────────────
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $body = json_decode(file_get_contents('php://input'), true);
    if (!is_array($body)) fail(400, 'Invalid JSON body.');

    $code = strtoupper(trim((string)($body['code'] ?? '')));
    $data = $body['data'] ?? '';

    if (!preg_match($CODE_PATTERN, $code)) fail(400, 'Invalid code format.');
    if (!is_string($data) || strlen($data) < $MIN_DATA_SIZE) fail(400, 'Missing save data.');
    if (strlen($data) > $MAX_DATA_SIZE) fail(400, 'Save data too large (max 1MB compressed).');

    validateSaveBlob($data, !empty($body['compressed']));

    checkRate($ip, 'write', $RATE_MAX_WRITE, $RATE_WINDOW);

    $file = $SAVES_DIR . '/' . $code . '.dat';
    if (!file_exists($file) && countSaves($SAVES_DIR, $MAX_SAVES) >= $MAX_SAVES) {
        if (!evictOldest($SAVES_DIR, $SAVE_TTL)) fail(507, 'Server save limit reached.');
    }

    // Atomic write: temp file + rename so readers never see a torn file.
    $tmp = $file . '.' . getmypid() . '.tmp';
    if (file_put_contents($tmp, $data, LOCK_EX) === false || !rename($tmp, $file)) {
        @unlink($tmp);
        fail(500, 'Failed to store save.');
    }
    echo json_encode(['ok' => true, 'code' => $code, 'size' => strlen($data)]);
    exit;
}

fail(405, 'Method not allowed.');
