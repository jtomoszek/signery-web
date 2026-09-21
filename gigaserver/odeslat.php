<?php
/**
 * Zpracování kontaktního formuláře Signery.
 *
 * Nahrává se na webhosting Gigaserver (Tarif Mini), kde běží i schránka
 * sandra@signery.cz — pošta tak neopouští český server.
 *
 * Endpoint: https://formular.signery.cz/odeslat.php
 *
 * Umí dvě věci podle toho, jak se na něj zavolá:
 *   – fetch z webu  → odpoví JSONem, stránka se nepřenačítá
 *   – klasické odeslání formuláře (bez JS) → přesměruje zpět na /kontakt
 */

declare(strict_types=1);

const PRIJEMCE      = 'sandra@signery.cz';
const ODESILATEL    = 'formular@signery.cz';
const POVOLENY_PUVOD = 'https://signery.cz';
const NAVRAT        = 'https://signery.cz/kontakt';
const LIMIT_ZA_HODINU = 8;   // kolik zpráv smí odejít z jedné IP za hodinu

// ─── CORS ────────────────────────────────────────────────────────────
$puvod = $_SERVER['HTTP_ORIGIN'] ?? '';
if ($puvod === POVOLENY_PUVOD) {
    header('Access-Control-Allow-Origin: ' . POVOLENY_PUVOD);
    header('Vary: Origin');
    header('Access-Control-Allow-Headers: Content-Type');
    header('Access-Control-Max-Age: 86400');
}
if (($_SERVER['REQUEST_METHOD'] ?? '') === 'OPTIONS') {
    http_response_code(204);
    exit;
}

/** Pozná, jestli volá fetch (chce JSON), nebo prohlížeč (chce přesměrování). */
function chce_json(): bool
{
    if (!empty($_POST['ajax'])) {
        return true;
    }
    return strpos($_SERVER['HTTP_ACCEPT'] ?? '', 'application/json') !== false;
}

/** Ukončí zpracování — JSONem, nebo přesměrováním zpět na web. */
function konec(bool $ok, string $zprava, int $kod = 200): void
{
    if (chce_json()) {
        http_response_code($kod);
        header('Content-Type: application/json; charset=utf-8');
        echo json_encode(['ok' => $ok, 'zprava' => $zprava], JSON_UNESCAPED_UNICODE);
    } else {
        header('Location: ' . NAVRAT . ($ok ? '?odeslano=1' : '?chyba=1'), true, 303);
    }
    exit;
}

/** Zbaví text řídicích znaků, kterými by šlo podvrhnout hlavičky e-mailu. */
function bezpecne(string $s): string
{
    return trim(str_replace(["\r", "\n", "\0"], ' ', $s));
}

/** Kódování diakritiky do hlavičky podle RFC 2047. */
function hlavicka(string $s): string
{
    return '=?UTF-8?B?' . base64_encode(bezpecne($s)) . '?=';
}

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    konec(false, 'Neplatný požadavek.', 405);
}

// ─── Ochrana proti robotům ───────────────────────────────────────────
// Pole „web“ je ve formuláři skryté. Člověk ho nevyplní, robot ano.
if (!empty($_POST['web'])) {
    konec(true, 'Děkujeme, zpráva byla odeslána.');   // tiše zahodit
}
// Formulář odeslaný do tří sekund od načtení stránky nevyplnil člověk.
$zacatek = (int)($_POST['cas'] ?? 0);
if ($zacatek > 0 && (time() - $zacatek) < 3) {
    konec(true, 'Děkujeme, zpráva byla odeslána.');
}

// ─── Jednoduchý limit na počet zpráv z jedné IP ──────────────────────
$ip = $_SERVER['HTTP_CF_CONNECTING_IP'] ?? $_SERVER['REMOTE_ADDR'] ?? '0.0.0.0';
$stopa = sys_get_temp_dir() . '/signery-' . sha1($ip) . '.log';
$casy = is_readable($stopa)
    ? array_filter(array_map('intval', explode(',', (string)file_get_contents($stopa))))
    : [];
$hodinu_zpet = time() - 3600;
$casy = array_values(array_filter($casy, static fn(int $t): bool => $t > $hodinu_zpet));
if (count($casy) >= LIMIT_ZA_HODINU) {
    konec(false, 'Zpráv z vaší adresy přišlo příliš mnoho. Zkuste to prosím za hodinu, nebo nám zavolejte.', 429);
}

// ─── Kontrola vyplnění ───────────────────────────────────────────────
$jmeno  = bezpecne((string)($_POST['jmeno'] ?? ''));
$email  = bezpecne((string)($_POST['email'] ?? ''));
$zprava = trim((string)($_POST['zprava'] ?? ''));

$chyby = [];
if ($jmeno === '')  { $chyby[] = 'jméno'; }
if (!filter_var($email, FILTER_VALIDATE_EMAIL)) { $chyby[] = 'e‑mail'; }
if ($zprava === '') { $chyby[] = 'popis projektu'; }
if (empty($_POST['souhlas'])) {
    konec(false, 'Bez souhlasu se zpracováním údajů zprávu odeslat nemůžeme.', 422);
}
if ($chyby !== []) {
    konec(false, 'Zkontrolujte prosím: ' . implode(', ', $chyby) . '.', 422);
}
if (mb_strlen($zprava) > 5000) {
    konec(false, 'Zpráva je příliš dlouhá, zkraťte ji prosím.', 422);
}

$firma   = bezpecne((string)($_POST['firma'] ?? ''));
$telefon = bezpecne((string)($_POST['telefon'] ?? ''));
$role    = bezpecne((string)($_POST['role'] ?? ''));
$faze    = bezpecne((string)($_POST['faze'] ?? ''));

// ─── Sestavení e‑mailu ───────────────────────────────────────────────
$radky = [
    'Jméno:    ' . $jmeno,
    'E‑mail:   ' . $email,
    'Telefon:  ' . ($telefon !== '' ? $telefon : '—'),
    'Firma:    ' . ($firma !== '' ? $firma : '—'),
    'Role:     ' . ($role !== '' ? $role : '—'),
    'Fáze:     ' . ($faze !== '' ? $faze : '—'),
    '',
    'Zpráva:',
    $zprava,
    '',
    str_repeat('─', 40),
    'Odesláno z formuláře na signery.cz, ' . date('j. n. Y H:i'),
];
$telo = implode("\n", $radky);

$predmet = 'Poptávka ze webu — ' . $jmeno . ($firma !== '' ? ' (' . $firma . ')' : '');

$hlavicky = implode("\r\n", [
    'From: ' . hlavicka('Formulář Signery') . ' <' . ODESILATEL . '>',
    'Reply-To: ' . hlavicka($jmeno) . ' <' . $email . '>',
    'Content-Type: text/plain; charset=UTF-8',
    'Content-Transfer-Encoding: 8bit',
    'X-Mailer: signery-formular',
]);

$odeslano = mail(PRIJEMCE, hlavicka($predmet), $telo, $hlavicky, '-f' . ODESILATEL);

if (!$odeslano) {
    error_log('signery: mail() selhalo pro ' . $email);
    konec(false, 'Zprávu se nepodařilo odeslat. Napište prosím přímo na sandra@signery.cz.', 500);
}

$casy[] = time();
@file_put_contents($stopa, implode(',', $casy), LOCK_EX);

konec(true, 'Děkujeme, zpráva odešla. Ozveme se v pracovní dny.');
