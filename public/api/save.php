<?php
// Keep this endpoint as a tombstone for older clients. No runtime data is accessed.
http_response_code(410);
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
header('X-Content-Type-Options: nosniff');
echo json_encode(['error' => 'Cloud saves have been retired. Saves are now stored only in this browser.']);
