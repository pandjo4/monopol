# Monopoly: Bosanska Mahala

Online multiplayer igra za 2 do 6 igrača. Pokreće se na Node.js serveru i koristi Socket.IO za povezivanje igrača.

## Pokretanje

```bash
npm install
npm start
```

Render koristi komandu `npm start`. Zdravstvena provjera servera dostupna je na `/health`.

## Osnovna pravila

- Svaki igrač počinje sa **2.500 KM**. Prolazak kroz START donosi **200 KM**.
- Igrači bacaju dvije kockice i pomjeraju figuricu po tabli. Partija traje 20, 30, 40 ili 50 krugova, prema izboru domaćina.
- Kada staneš na slobodnu nekretninu ili taxi stanicu, možeš je kupiti, preskočiti kupovinu ili poslati na aukciju.
- Ako preskočiš kupovinu, nekretnina ostaje slobodna i niko je ne kupuje. Aukcija se pokreće samo ako izabereš tu opciju.
- Vlasnik naplaćuje rentu igraču koji stane na njegovu nekretninu. Iznos zavisi od nekretnine, kućica, hotela i bonusa.
- Četiri nekretnine iste boje udvostručuju rentu. Posjedovanje sve četiri nekretnine iste kategorije također udvostručuje rentu. Oba bonusa zajedno daju rentu ×4.
- Taxi stanice nemaju boju ni kućice. Renta se povećava prema broju taxi stanica koje posjeduje isti igrač: jedna ×1, dvije ×2, tri ×3, četiri ×4.
- Na nekretninama se mogu graditi do četiri kućice, a zatim hotel. Gradnja je ograničena na jednu nadogradnju po nekretnini u krugu. Hotel se gradi kada igrač stane na tu nekretninu.
- Hipoteka daje novac banci, ali se na založenu nekretninu ne naplaćuje renta. Hipoteka se može kasnije otplatiti.
- Igrači mogu slati ponude za razmjenu novca i nekretnina. Primalac vidi šta druga strana nudi i šta traži prije prihvatanja ili odbijanja.
- Nakon završetka trećeg kruga, igrač s najmanje bodova izvlači karticu **Nafaka**, a igrač s najviše bodova karticu **Rizik**. Nafaka uglavnom donosi novac ili druge pogodnosti, dok Rizik donosi troškove ili kazne. Ove dvije nagrade dodjeljuju se samo jednom po partiji.
- Igrač koji ne može platiti dug može prodati imovinu banci ili koristiti hipoteku. Ako dug ne može izmiriti, bankrotira.
- Na kraju pobjeđuje igrač s najvećim neto bogatstvom: novac plus vrijednost imovine i izgradnje, uz odbitak hipoteka.

## Boje igrača

U lobiju svaki igrač bira svoju figuricu i jedinstvenu boju igrača. Boja igrača označava njegovu figuricu i vlasništvo na tabli; boja nekretnine bira se zasebno prilikom kupovine.
