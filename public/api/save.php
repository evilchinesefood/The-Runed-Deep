<?php
// ============================================================
// The Runed Deep — Cloud Save API
// Flat-file save storage with rate limiting and validation
// Saves are gzip-compressed base64 from the client
// ============================================================

ini_set('display_errors', '0');
ini_set('log_errors', '1');

$ALLOWED_ORIGINS = ['https://dev.jdayers.com', 'https://jdayers.com', 'https://www.jdayers.com'];

header('Content-Type: application/json');
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
if (in_array($origin, $ALLOWED_ORIGINS, true)) {
    header('Access-Control-Allow-Origin: ' . $origin);
    header('Vary: Origin');
}
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('X-Content-Type-Options: nosniff');
header('Cache-Control: no-store');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(204); exit; }

$SAVES_DIR = __DIR__ . '/saves';
$RATE_DIR  = __DIR__ . '/ratelimit';
umask(0077);
$MAX_BODY_SIZE  = 1100000;
$MAX_SAVES      = 500;
$MAX_DATA_SIZE  = 1000000;  // 1MB compressed (base64) — real saves are far below this
$MIN_DATA_SIZE  = 24;       // smallest plausible gzip+base64 blob
$MAX_INFLATED   = 5000000;  // 5MB decompressed cap (bomb guard)
$SAVE_TTL       = 7776000;  // 90 days — only stale saves are evictable when full
$RATE_WINDOW    = 3600;
$RATE_MAX_WRITE = 20;
$RATE_MAX_READ  = 60;
$MAX_OWNED_SAVES = 6;
$MAX_NEW_SAVES   = 3;
$ALLOCATION_WINDOW = 86400;
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
    if ($fp === false) fail(503, 'Rate limiter unavailable.');
    if (!flock($fp, LOCK_EX | LOCK_NB)) { fclose($fp); fail(503, 'Please retry shortly.'); }

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
    if ($dh === false) fail(503, 'Storage unavailable.');
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
    if ($oldest !== null && (time() - $oldestTime) > $ttl && @unlink($oldest)) {
        @unlink(substr($oldest, 0, -4) . '.auth');
        @unlink(substr($oldest, 0, -4) . '.owner');
        return true;
    }
    return false;
}

function writePrivateFile(string $file, string $data): bool {
    $tmp = $file . '.' . getmypid() . '.tmp';
    if (@file_put_contents($tmp, $data, LOCK_EX) !== strlen($data) || !@rename($tmp, $file)) {
        @unlink($tmp);
        return false;
    }
    return true;
}

// Called only for new allocations, while holding the global write lock. Metadata
// lives with saves so hourly limiter cleanup cannot reset the ownership budget.
function allocationOwner(string $ip): string {
    global $SAVES_DIR, $MAX_OWNED_SAVES, $MAX_NEW_SAVES, $ALLOCATION_WINDOW, $SAVE_TTL;
    $markers = glob($SAVES_DIR . '/*.owner');
    if ($markers === false) fail(503, 'Allocation limits unavailable.');
    $saltFile = $SAVES_DIR . '/.allocation.salt';
    if (!file_exists($saltFile)) {
        // Losing the key must never silently give every IP a fresh budget.
        if ($markers) fail(503, 'Allocation limits unavailable.');
        if (!writePrivateFile($saltFile, bin2hex(random_bytes(32)))) fail(503, 'Allocation limits unavailable.');
    }
    $salt = @file_get_contents($saltFile);
    if (!is_string($salt) || !preg_match('/^[a-f0-9]{64}$/', $salt)) fail(503, 'Allocation limits unavailable.');
    $owner = hash_hmac('sha256', $ip, $salt);
    $active = 0; $recent = 0; $now = time();
    foreach ($markers as $marker) {
        $metadata = json_decode((string)@file_get_contents($marker), true);
        if (!is_array($metadata) || !is_string($metadata['owner'] ?? null)
            || !preg_match('/^[a-f0-9]{64}$/', $metadata['owner'])
            || !is_int($metadata['created'] ?? null) || $metadata['created'] <= 0) {
            fail(503, 'Allocation limits unavailable.');
        }
        if (!hash_equals($owner, $metadata['owner'])) continue;
        $file = substr($marker, 0, -6) . '.dat';
        if (!file_exists($file)) continue;
        $modified = filemtime($file);
        if ($modified === false) fail(503, 'Allocation limits unavailable.');
        if ($now - $modified <= $SAVE_TTL) $active++;
        if ($now - $metadata['created'] < $ALLOCATION_WINDOW) $recent++;
    }
    if ($active >= $MAX_OWNED_SAVES) fail(429, 'Cloud save allocation limit reached for this network. Existing saves can still sync.');
    if ($recent >= $MAX_NEW_SAVES) fail(429, 'New cloud save limit reached for this network. Try again tomorrow. Existing saves can still sync.');
    return $owner;
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
    if (!is_string($_GET['code'] ?? '')) fail(400, 'Invalid code format.');
    $code = strtoupper(trim($_GET['code'] ?? ''));
    if (!preg_match($CODE_PATTERN, $code)) fail(400, 'Invalid code format.');

    checkRate($ip, 'read', $RATE_MAX_READ, $RATE_WINDOW);

    $file = $SAVES_DIR . '/' . $code . '.dat';
    if (!file_exists($file)) fail(404, 'Save not found.');

    // New saves require the private recovery token. Legacy saves remain readable,
    // but cannot be claimed or overwritten by knowing their old short code.
    $authFile = $SAVES_DIR . '/' . $code . '.auth';
    if (file_exists($authFile)) {
        $bearer = $_SERVER['HTTP_AUTHORIZATION'] ?? $_SERVER['REDIRECT_HTTP_AUTHORIZATION'] ?? '';
        $token = preg_match('/^Bearer ([a-f0-9]{32})$/', $bearer, $m) ? $m[1] : '';
        $expected = trim((string)file_get_contents($authFile));
        if (!$token || !hash_equals($expected, hash('sha256', $token))) fail(403, 'Recovery code required.');
    }
    @touch($file); // keep active saves from being evicted
    // Success body is raw compressed text; error responses are JSON.
    header('Content-Type: text/plain');
    readfile($file);
    exit;
}

// ── POST: Store a save ──────────────────────────────────────
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    if ((int)($_SERVER['CONTENT_LENGTH'] ?? 0) > $MAX_BODY_SIZE) fail(413, 'Request too large.');
    $raw = file_get_contents('php://input', false, null, 0, $MAX_BODY_SIZE + 1);
    if ($raw === false || strlen($raw) > $MAX_BODY_SIZE) fail(413, 'Request too large.');
    $body = json_decode($raw, true);
    if (!is_array($body)) fail(400, 'Invalid JSON body.');

    if (!is_string($body['code'] ?? '')) fail(400, 'Invalid code format.');
    $code = strtoupper(trim($body['code'] ?? ''));
    $data = $body['data'] ?? '';

    if (!preg_match($CODE_PATTERN, $code)) fail(400, 'Invalid code format.');
    if (!is_string($data) || strlen($data) < $MIN_DATA_SIZE) fail(400, 'Missing save data.');
    if (strlen($data) > $MAX_DATA_SIZE) fail(400, 'Save data too large (max 1MB compressed).');

    $token = $body['token'] ?? '';
    if (!is_string($token) || !preg_match('/^[a-f0-9]{32}$/', $token)) fail(403, 'Reload the game to use secure cloud saves.');
    checkRate($ip, 'write', $RATE_MAX_WRITE, $RATE_WINDOW);
    validateSaveBlob($data, !empty($body['compressed']));

    // Serialise ownership creation, capacity checks and replacement together.
    $lock = fopen($SAVES_DIR . '/.write.lock', 'c');
    if (!$lock || !flock($lock, LOCK_EX | LOCK_NB)) fail(503, 'Please retry shortly.');
    $authFile = $SAVES_DIR . '/' . $code . '.auth';
    $existing = file_exists($SAVES_DIR . '/' . $code . '.dat');
    if ($existing && !file_exists($authFile)) fail(409, 'Legacy saves are read-only. Save a new protected copy.');
    if (file_exists($authFile)) {
        $expected = trim((string)file_get_contents($authFile));
        if (!hash_equals($expected, hash('sha256', $token))) fail(403, 'Recovery code required.');
    }

    $file = $SAVES_DIR . '/' . $code . '.dat';
    // Existing saves are grandfathered. Allocation limits never prevent a valid
    // recovery token from updating its save, even when either capacity is full.
    $owner = $existing ? null : allocationOwner($ip);
    if (!$existing && countSaves($SAVES_DIR, $MAX_SAVES) >= $MAX_SAVES) {
        if (!evictOldest($SAVES_DIR, $SAVE_TTL)) fail(507, 'Server save limit reached.');
    }

    $newAuth = !file_exists($authFile);
    if ($newAuth && !writePrivateFile($authFile, hash('sha256', $token))) {
        fail(500, 'Failed to protect save.');
    }
    $ownerFile = $SAVES_DIR . '/' . $code . '.owner';
    if (!$existing && !writePrivateFile($ownerFile, json_encode(['owner' => $owner, 'created' => time()]))) {
        if ($newAuth) @unlink($authFile);
        fail(503, 'Failed to record save allocation.');
    }
    // Atomic write: temp file + rename so readers never see a torn file.
    if (!writePrivateFile($file, $data)) {
        if (!$existing) @unlink($ownerFile);
        if ($newAuth) @unlink($authFile);
        fail(500, 'Failed to store save.');
    }
    flock($lock, LOCK_UN); fclose($lock);
    echo json_encode(['ok' => true, 'code' => $code, 'size' => strlen($data)]);
    exit;
}

fail(405, 'Method not allowed.');
