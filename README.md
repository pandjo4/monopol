# MONOPOLY: BOSANSKA MAHALA

Online multiplayer igra za 2–6 igrača. Projekat koristi Node.js, Express i Socket.IO.

## Pokretanje lokalno

1. Instaliraj Node.js 18 ili noviji.
2. Otvori ovaj folder u terminalu.
3. Pokreni `npm ci`.
4. Pokreni `npm start`.
5. Otvori `http://localhost:3000`.
6. Jedan igrač kreira sobu, ostali se priključuju kodom.

Nemoj otvarati `public/index.html` direktno: igra koristi Socket.IO server.

## Objavljivanje na Render

- Runtime: Node
- Build command: `npm ci`
- Start command: `npm start`
- `render.yaml` već sadrži osnovnu konfiguraciju.

Na GitHub postavi projekat bez `node_modules` foldera. Render će zavisnosti instalirati kroz `npm ci`.

## Šta je promijenjeno

- Tabla je smanjena sa 48 na 40 polja: 20 nekretnina, 4 taxi polja, 4 ugla i 12 specijalnih polja.
- Svaka od četiri kategorije sada ima po 5 nekretnina.
- Podržano je do 6 igrača i izbor jedinstvene ptičije figurice u lobiju.
- Potez traje najviše 60 sekundi; server automatski završava istekli potez.
- Kućica se na istoj nekretnini može izgraditi najviše jednom po krugu.
- Dodani su zvučni efekti generisani u browseru i animacija figurica.
- Dodan je sistem slika za nekretnine, specijalna polja, zatvor i centralnu ilustraciju.
- Raspored je prilagođen užim ekranima i mobilnim uređajima.

## Slike – kako ih ubaciti

Sve slike su opcionalne. Ako slika nedostaje ili se ne može učitati, igra prikazuje emoji/ikonu kao rezervu. Nemoj mijenjati nazive fajlova ako želiš da ih igra automatski pronađe.

### 1. Slike nekretnina i polja

Folder: `public/assets/cards/`

- Nekretnine: `p0.png` do `p19.png`
- Specijalna polja: `opcina.png`, `pijaca.png`, `bank.png`, `tax.png`, `health.png`, `free.png`, `bonus.png`
- Zatvor i posjeta zatvoru: `jail.png`, `jailvisit.png`
- Start, parking i taxi: `start.png`, `parking.png`, `taxi.png`

**Preporučena dimenzija: 512 × 512 px, PNG, kvadratni format.**
Svaka kartica u prozoru detalja koristi isti fiksni prostor, pa slike neće mijenjati dimenzije kartica. Koristi centriran motiv i ostavi malo praznog prostora uz rubove.

### 2. Ptičije figurice

Folder: `public/assets/tokens/`

- `sparrow.png` – 🐦
- `owl.png` – 🦉
- `parrot.png` – 🦜
- `penguin.png` – 🐧
- `duck.png` – 🦆
- `eagle.png` – 🦅

**Preporučena dimenzija: 256 × 256 px, PNG sa transparentnom pozadinom.**
Napravi cijelu figuricu vidljivom, gledanu iz blago povišene perspektive, kao malu 2D društvenu igru. Ne dodaj tekst ni pozadinu.

### 3. Slika sredine table

Folder: `public/assets/board/`

- `center.png` – ilustracija mahale koja se prikazuje u centru table.

**Preporučena dimenzija: 1024 × 1024 px, PNG, kvadratni format.**
Izbjegavaj sitne detalje i tekst koji bi postao nečitljiv na telefonu.

## Testiranje

Pokreni:

- `npm run check` – provjera JavaScript sintakse.
- `npm test` – automatski testovi pravila igre.

Napomena: sobe i aktivne partije čuvaju se u memoriji servera. Restart ili redeploy Render servisa briše aktivne sobe. Za trajno čuvanje partija potrebna je baza podataka.
