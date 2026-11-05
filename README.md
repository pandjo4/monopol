# MONOPOLY: BOSANSKA MAHALA

Online multiplayer društvena igra za 2–6 igrača. Projekat koristi Node.js, Express i Socket.IO. Server je autoritet za bacanje kockica, novac, vlasništvo i transakcije.

## Pokretanje lokalno

1. Instaliraj Node.js 18 ili noviji.
2. Raspakuj ZIP.
3. U terminalu otvori folder projekta.
4. Pokreni:
   ```bash
   npm install
   npm start
   ```
5. Otvori `http://localhost:3000`.
6. Jedan igrač kreira sobu, a ostali unose kod sobe.

## Objavljivanje na Render

1. Napravi GitHub repository i postavi sadržaj ovog foldera.
2. Na Renderu izaberi **New → Web Service** i poveži repository.
3. Runtime: Node.
4. Build command: `npm install`
5. Start command: `npm start`
6. Deploy. Render će dodijeliti javni URL.
7. Pošalji URL i kod sobe prijateljima.

Aplikacija sluša na `0.0.0.0` i koristi `process.env.PORT`.

## Struktura

- `server.js` – Socket.IO server, sobe, pravila, ekonomija i validacija poteza.
- `public/index.html` – interfejs.
- `public/style.css` – dizajn i responsive raspored.
- `public/game.js` – klijentski prikaz i akcije.
- `package.json` – zavisnosti i komande.

## Pravila i implementirane funkcije

- Sobe za 2–6 igrača, lobby, kod sobe i domaćin.
- Tabla od 48 polja: 24 nekretnine, 4 taxi polja, 4 ugaona polja i 16 gradskih/specijalnih polja.
- Osam boja; globalno najviše tri nekretnine po boji.
- Dupla renta za kompletiranu boju ili kategoriju; ×4 ako važe oba bonusa.
- Promjena boje uz plaćanje kupovne cijene, jednom po krugu.
- Kućice, hoteli, hipoteka, aukcija, taxi, zatvor.
- Nafaka i Rizik špilovi.
- Bonus za manji broj nekretnina nakon trećeg kruga.
- Bodovi, završetak partije i rangiranje prema neto bogatstvu.
- Osnovna razmjena nekretnina i novca.
- Reconnect token se čuva u sessionStorage; isti token se može koristiti za povratak u sobu.

## Važna pravila dizajna / pretpostavke

Izvorna specifikacija navodi 48 polja, ali zbroj kategorija (24 nekretnine + 4 taxi + 12 specijalnih + 4 ugla) iznosi 44. Da bi tabla imala traženih 48 jedinstvenih polja, implementirano je 16 specijalnih polja.

Ovo je prva kompletna igriva verzija. Prije ozbiljnog takmičarskog korištenja preporučuje se dodatno testiranje svih rubnih slučajeva i balans ekonomije. Trenutna verzija koristi jednostavan dugovni postupak: kada novac padne ispod nule, igrač dobija izbor prodaje nekretnina banci; kompleksni stečajni transferi prema povjeriocu i aukcije imovine mogu se dodatno proširiti.

## Health check

`/health` vraća JSON status servera.
