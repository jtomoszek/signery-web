# Signery — web

Statický web značky **Signery** postavený podle tří zadání:

- **Strategie značky** — Signery jako partner stavebních projektů, ne dodavatel PENB.
  Homepage buduje značku a rozděluje návštěvníky na B2B a B2C. Viz [STRATEGIE.md](STRATEGIE.md).
- **Vizuální styl** — *Signery, Manuál vizuálního stylu, vydání 01 / 2026* (PDF ve složce).
- **Rozložení** — struktura šablony [Pipely / home-v2](https://pipely.webflow.io/home/home-v2),
  psaná v rytmu Apple / Notion: silné headline, krátké odstavce, hodně prostoru, velké fotografie.

Bez build kroku, bez závislostí. Otevřete `index.html` nebo nasaďte celou složku na statický hosting.

```bash
python3 -m http.server 8777
```

---

## Struktura

```
index.html              Homepage — značka, Sandra, rozcestí B2B / B2C
pro-profesionaly.html   B2B — projektanti, architekti, developeři
pro-majitele.html       B2C — majitelé nemovitostí, PENB
kontakt.html            Kontakt — pozvánka ke spolupráci + formulář

assets/css/style.css    Design systém: tokeny, komponenty, animované objekty
assets/js/main.js       Menu, FAQ, odhalení při scrollu, počítadla
assets/img/photo/       Fotografie optimalizované pro web (2 velikosti)
assets/img/favicon.svg  Favikona (dočasná — viz níže)

Fotky/                  Originály dodané klientem (na web se nenasazují)
_archiv/                Stránky z první verze webu, kterou nahradila nová struktura
STRATEGIE.md            Positioning, brand story, pilíře, IA, UX scénáře
```

Šest stránek předchozí verze (`sluzby`, `projektanti`, `developerske-projekty`,
`retail`, `reference`, `o-signery`) je v `_archiv/`. Nemazal jsem je — pokud se
z některé bude něco hodit, je po ruce. Na web se nenasazuje.

---

## Animované objekty z energetického průkazu

Všechny se rozjedou až ve chvíli, kdy sekce vjede do obrazu, a všechny respektují
`prefers-reduced-motion`. Bez JavaScriptu zůstává obsah čitelný.

| Objekt | Kde | Co dělá |
|---|---|---|
| **Škála tříd A–G** (`.penb`) | Homepage, sekce „Jedno písmeno“ | Sedm šipek se postupně vykresluje zleva, u třídy B naskočí rámeček a štítek |
| **Měřidlo s ručičkou** (`.gauge`) | Pro majitele — „Co se z průkazu dozvíte“ | Oblouk se dokresluje a ručička dojede na hodnotu |
| **Podpis** (`.sig`) | Homepage hero, sekce Sandra, kontakt | SVG tah se sám „podepíše“ — motiv *signery / signature* |
| **Obálka budovy** (`.envelope`) | Homepage — „S čím vám pomůžeme“ | Řez domem s pomalu unikajícími šipkami tepla, ve smyčce |
| **Osa projektu** (`.rail`) | B2B i B2C — postup spolupráce | Linka dojíždí zleva doprava a rozsvěcuje body fází |
| **Počítadla** (`[data-count-to]`) | B2B — „Tři čísla“ | Dopočítají se z nuly; má pojistku pro případ, že prohlížeč pozastaví animace |

Škála tříd záměrně **nepoužívá zeleno-červený přechod**, který má celá konkurence.
Jede v monochromatické rampě značkových barev (`--penb-a` … `--penb-g` v `style.css`).

---

## Fotografie

Originály z `Fotky/` jsou zmenšené a překomprimované do `assets/img/photo/`
ve dvou velikostech (`*.jpg` ~1800 px a `*@900.jpg`), zapojené přes `srcset`.
Celkem 4 MB místo původních 31 MB. Portrét Sandry šel z 20 MB na 146 kB.

| Soubor | Kde je použitý |
|---|---|
| `budova-krivky.jpg` | Homepage — pás pod hero |
| `atrium-drevo.jpg` | Homepage — „Nejde jen o energetiku“, kontakt |
| `sandra-schwarzova.jpg` | Homepage — sekce Sandra, kontakt |
| `render-vila.jpg` | Homepage — rozcestník B2B |
| `dum-moderni.jpg` | Homepage — rozcestník B2C, Pro majitele |
| `dum-beton.jpg` | Homepage — závěrečné CTA, Pro majitele |
| `render-drevo.jpg` | Pro profesionály — pás pod hero |
| `fasada-vlna.jpg` | Pro profesionály — rozsah služeb |
| `render-bazen.jpg` | Pro profesionály — závěrečné CTA |

Fotky jsou podle vašeho zadání ilustrační. Až budou vlastní, stačí přepsat
soubory ve `photo/` při zachování názvů — v HTML se nemusí měnit nic.
Fotografický styl podle manuálu str. 28: denní světlo, tlumené tóny, jeden hlavní motiv.

---

## Jak je manuál zapracovaný

| Prvek manuálu | Kde na webu |
|---|---|
| Linen `#F0EADE` jako podklad všech stran | `--bg`, plocha za kartami |
| Olive Deep `#37371B` jako barva textu a tmavých ploch | `--ink`, `.panel--olive`, `.cta-band` |
| Moss `#70704E` jako akcent — cíleně a v malém množství | jediné hlavní CTA na obrazovku, ručička měřidla, podpis |
| Sage `#AFAE90` jako jemná plocha | `.panel--sage`, `.card--sage`, popisky |
| Kombinace na plochách (str. 19) | `.panel--*` přebarvují text i tlačítka podle předepsaných dvojic |
| Poppins na titulky, řádkování 0,95–1,15, prostrkání −2 až −4 % | `--font-display`, `.display / .h1 / .h2 / .statement` |
| DM Sans na text, 16–18 px, řádkování 1,5 | `--font-text`, `body`, `.prose` |
| Popisky DM Sans Medium, verzálky, +8 % | `.label` |
| Tlačítka DM Sans Bold, verzálky, +10 %, rádius 100 px | `.btn` |
| Oblouk — nerotovaný, nezrcadlený, otevřený dolů, ukotvený k hraně | `.arch`, `.media--arch`, `.card--arched`, `.tick-list` |
| Oblouk rámuje sekce, nikdy ne text | dekorace jsou vždy `z-index: 0` pod obsahem |
| „Na potisk nikdy nesázíme text" (str. 27) | tmavé plochy mají oblouky ve vyhrazeném spodním pásu (`.panel--deco-arches`) |
| Ikonografie: mřížka 24 × 24, linka 2 px, zaoblené konce | inline SVG v kartách |
| Web: rastr 12 sloupců, gutter 24 px, jediné hlavní tlačítko na obrazovku | `--wrap`, `--gutter`, hierarchie `.btn--primary` / `.btn--ghost` |

---

## Co je potřeba doplnit před spuštěním

1. **Logo.** Manuál na str. 15 zakazuje překreslovat logo z PDF nebo ze screenshotu
   a originální SVG ve složce není. Wordmark je proto vysázený v Poppins Medium
   s odsazeným bodem pod „s“ (komponenta `.logo` v `style.css`, sekce 07).
   Nahrazuje se na jednom místě v CSS.

2. **Favikona a avatar.** `assets/img/favicon.svg` obsahuje zatím oblouk, ne monogram.
   Manuál (str. 09) předepisuje monogram „s“ na plné ploše.

3. **Vlastní fotografie** místo ilustračních.

4. **Formulář.** `kontakt.html` má `action="#"`. Doplňte endpoint a metodu POST.

5. **Právní stránky.** V patičce jsou zatím jen texty „Zpracování osobních údajů“
   a „Cookies“ bez odkazů.

6. **Kontaktní údaje.** E‑mail, telefon, adresa a IČO jsou převzaté z ukázek v manuálu.
   Ověřte, že platí.

7. **Reference.** V nové struktuře zatím nejsou. Až budou reálné projekty odsouhlasené
   klienty, doporučuji je přidat na stránku pro profesionály ve struktuře
   *zadání → komplikace → jak jsme pomohli → výsledek* (hotová komponenta `.case`
   je v `_archiv/reference.html`).

---

## Pokud web poputuje do Webflow

- barvy → **Variables** (názvy odpovídají manuálu: Moss, Olive Deep, Linen, Sage),
- typografie → **Typography classes** (`.display`, `.h1`–`.h4`, `.statement`, `.prose`),
- karty, pásy a patička → symboly,
- animované objekty → škála A–G a osa projektu jdou postavit z Webflow Interactions,
  podpis a měřidlo potřebují vložený SVG s custom kódem (v `style.css` sekce 27),
- reference → **CMS Collection** s poli *tag, zadání, komplikace, řešení, výsledek, foto*.

---

## Přístupnost

- jeden H1 na stránku, pořadí nadpisů H1 → H2 → H3,
- `skip-link` na obsah, `aria-current` na aktivní položce navigace,
- FAQ přes `aria-expanded`, mobilní menu ovladatelné klávesnicí a Escapem,
- dekorativní grafika má `aria-hidden`, škála A–G má textovou alternativu,
- respektuje `prefers-reduced-motion` — vypnou se animace i posun obrazu,
- obsah zůstává viditelný bez JavaScriptu (třída `.js` se přidává inline v `<head>`).
