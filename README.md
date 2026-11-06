# MONOPOLY: BOSANSKA MAHALA

Online multiplayer društvena igra za 2–6 igrača. Projekat koristi Node.js, Express i Socket.IO.

## Pokretanje lokalno

1. Instaliraj Node.js 18 ili noviji.
2. U terminalu otvori ovaj folder.
3. Pokreni `npm ci`.
4. Pokreni `npm start`.
5. Otvori `http://localhost:3000`.
6. Jedan igrač kreira sobu, a ostali se priključuju kodom.

Nemoj otvarati `public/index.html` direktno: igra koristi Socket.IO server.

## Objavljivanje na Render

- Runtime: Node
- Build command: `npm ci`
- Start command: `npm start`
- `render.yaml` sadrži osnovnu konfiguraciju.
- Na GitHub postavi projekat bez `node_modules`; Render instalira zavisnosti kroz `npm ci`.

## Trenutna pravila i struktura table

- Tabla ima 40 polja: 4 ugla, 4 taxi stanice i 32 obične kupovne lokacije.
- Svaka stranica između uglova ima tačno 9 polja: 4 lokacije, taxi stanicu i još 4 lokacije.
- Četiri ugla su START, IZLAZ IZ ZATVORA, BESPLATNI PARKING i ZATVOR.
- Svih 32 običnih lokacija mogu se kupiti, posjedovati, založiti, prodati, razmjenjivati i nadograđivati.
- Postoji 8 boja; svaka boja može imati najviše 4 lokacije. Posjedovanje sve 4 iste boje udvostručuje rentu.
- Postoji 8 kategorija sa po 4 lokacije. Posjedovanje cijele kategorije također udvostručuje rentu.
- Četiri taxi stanice su Taxi Sjever, Istok, Jug i Zapad. Taxi stanice se kupuju i posjeduju; renta je osnovna za jednu, ×2 za dvije, ×3 za tri i ×4 za sve četiri.
- Taxi više nije plaćena opcija za pomjeranje.
- Nakon završetka trećeg kruga, igrač s najmanje bodova izvlači Nafaku, a igrač s najviše bodova Rizik. Nema nasumičnih Nafaka/Rizik polja na tabli.
- Svaki igrač počinje sa 2.500 KM, a prolazak kroz START donosi 200 KM.
- Partija podržava 2–6 igrača, trajanje 20, 30, 40 ili 50 krugova i potez do 60 sekundi.

## Slike i ikone

Kartice nekretnina su uklonjene iz prikaza table. Svaka od osam kategorija ima svoju prepoznatljivu ikonu i boju. Četiri infrastrukturne lokacije imaju zasebne SVG ilustracije: Elektroprivreda, Vodovod, Toplana i Elektrodistribucija. Četiri ugaona polja koriste tvoje originalne ilustracije iz `public/assets/inf/` (Kreni, Zatvor, Parking i Izlaz iz zatvora).

Ikone infrastrukture su u `public/assets/inf/`: `elektroprivreda.svg`, `vodovod.svg`, `toplana.svg` i `elektrodistribucija.svg`. Ako želiš zamijeniti neku od njih svojom slikom, zadrži naziv fajla ili promijeni mapiranje `INFRA_IMAGES` u `public/game.js`.

Postojeće figurice se učitavaju iz `public/assets/tokens/`:

- `bird_01.png` – 🐦
- `bird_02.png` – 🦉
- `bird_03.png` – 🦜
- `bird_04.png` – 🐧
- `bird_05.png` – 🦆
- `bird_06.png` – 🦅

Slika sredine table je `public/assets/board/mahala_center.jpg`. Ako neka slika figurice nedostaje, prikazuje se emoji kao rezerva.

## Provjera

- `npm run check` – provjera JavaScript sintakse.
- `npm test` – automatski testovi rasporeda table, boja, rente, taxi stanica i pravila kartica.

Sobe i aktivne partije čuvaju se u memoriji servera. Restart ili redeploy Render servisa briše aktivne sobe; trajno čuvanje zahtijeva bazu podataka.
