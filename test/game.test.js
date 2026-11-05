const test = require('node:test');
const assert = require('node:assert/strict');
const { __test: t } = require('../server');

function makePlayer(id, name=id) {
  return { id, name, money: 2500, position: 0, inJail: false, bankrupt: false,
    houses: 0, rentPaid: 0, rentEarned: 0, token: `secret-${id}` };
}
function makeGame(players, properties=t.properties.map(p=>({...p}))) {
  return { started:true, ended:false, round:1, maxRounds:30, players, properties,
    board:t.board.map(x=>({...x})), turnOrder:players.map(p=>p.id), currentPlayerId:players[0].id,
    actedThisRound:[], phase:'turn', pending:null, log:[], bank:100000,
    discarded:[], cardPiles:{nafaka:[...t.nafakaDeck],rizik:[...t.rizikDeck]}, queuedCards:[] };
}

test('kompaktna tabla ima 40 polja: 20 nekretnina, 4 taxi, 4 ugla i 12 specijalnih', () => {
  const counts=t.board.reduce((a,s)=>(a[s.type]=(a[s.type]||0)+1,a),{});
  assert.equal(t.board.length,40);
  assert.deepEqual(counts,{corner:4,property:20,special:12,taxi:4});
  assert.equal(new Set(t.board.map(x=>x.index)).size,40);
});

test('globalno ograničenje boje nikada ne dopušta četvrtu nekretninu', () => {
  const g=makeGame([makePlayer('a'),makePlayer('b')]);
  g.properties[0].color='crvena';g.properties[1].color='crvena';g.properties[2].color='crvena';
  assert.equal(t.colorCounts(g).crvena,3);
  assert.equal(t.canColor(g,'crvena'),false);
  assert.equal(t.canColor(g,'plava'),true);
});

test('renta se množi ×2 za boju, ×2 za kategoriju i ×4 za oba bonusa', () => {
  const players=[makePlayer('a'),makePlayer('b')];
  const g=makeGame(players);
  const [a,b,c,d,e]=g.properties;
  a.owner=b.owner=c.owner=d.owner=e.owner='a';
  a.color=b.color=c.color='crvena';
  a.category='smještaj';b.category='trgovina';c.category='transport';
  d.category=e.category='infrastruktura';d.color='plava';e.color='žuta';
  assert.equal(t.rentFor(g,a),a.baseRent*2);
  // c completes both its red color group and its transport category group.
  const f=g.properties[5];f.owner='a';f.category='transport';f.color='zelena';
  const h=g.properties[6];h.owner='a';h.category='transport';h.color='roza';
  const i=g.properties[7],j=g.properties[8];i.owner=j.owner='a';i.category=j.category='transport';
  assert.equal(t.rentFor(g,c),c.baseRent*4);
});

test('bonus plate počinje nakon trećeg završenog kruga i računa se po vlasniku', () => {
  const a=makePlayer('a'), b=makePlayer('b');
  const g=makeGame([a,b]);
  g.round=3;g.actedThisRound=['a','b'];
  g.properties[0].owner='a';g.properties[1].owner='a';
  g.properties[2].owner='b';g.properties[3].owner='b';
  const room={code:'TEST',hostId:'a',maxRounds:30,players:[a,b],game:g};
  t.applyRoundEnd(room);
  assert.equal(g.round,4);
  assert.equal(a.money,3100);
  assert.equal(b.money,3100);
});

test('dug se ne briše prodajom imovine dok nije stvarno pokriven', () => {
  const a=makePlayer('a'), b=makePlayer('b');
  const g=makeGame([a,b]);
  g.properties[0].owner='a';
  const room={code:'TEST',hostId:'a',maxRounds:30,players:[a,b],game:g};
  a.money=25;
  t.charge(room,a,125);
  assert.equal(g.phase,'debt');
  assert.equal(a.debtRemaining,100);
  t.applyDebtProceeds(room,a,40);
  assert.equal(a.debtRemaining,60);
  assert.equal(g.phase,'debt');
  t.applyDebtProceeds(room,a,100);
  assert.equal(a.debtRemaining,0);
  assert.equal(a.money,40);
  assert.equal(g.phase,'turn');
});

test('privatni reconnect tokeni nisu dio javnog stanja', () => {
  const a=makePlayer('a'), b=makePlayer('b');
  const g=makeGame([a,b]);
  const room={code:'TEST',hostId:'a',maxRounds:30,players:[a,b],game:g};
  const state=t.publicState(room);
  assert.equal('token' in state.players[0],false);
  assert.equal('socketId' in state.players[0],false);
});

test('partija završava tačno nakon izabranih 20 krugova', () => {
  const players=[makePlayer('a'),makePlayer('b'),makePlayer('c')];
  const g=makeGame(players);g.maxRounds=20;
  const room={code:'TEST',hostId:'a',maxRounds:20,players,game:g};
  for(let i=0;i<20;i++){
    g.actedThisRound=players.map(p=>p.id);
    t.applyRoundEnd(room);
  }
  assert.equal(g.ended,true);
  assert.equal(g.round,21);
  assert.equal(g.phase,'ended');
  assert.equal(g.finalRanking.length,3);
});

test('server može inicijalizirati partiju sa 2 do 6 igrača', () => {
  for(let count=2;count<=6;count++){
    const players=Array.from({length:count},(_,i)=>makePlayer(`p${i}`));
    const room={code:`R${count}`,hostId:players[0].id,maxRounds:30,players,game:null};
    t.startGame(room);
    assert.equal(room.game.started,true);
    assert.equal(room.game.players.length,count);
    assert.equal(room.game.currentPlayerId,players[0].id);
    assert.ok(players.every(p=>p.money===2500));
  }
});

test('svaka od četiri kategorije ima tačno pet nekretnina', () => {
  const counts=t.properties.reduce((a,p)=>(a[p.category]=(a[p.category]||0)+1,a),{});
  assert.deepEqual(counts,{'smještaj':5,trgovina:5,transport:5,infrastruktura:5});
  assert.equal(new Set(t.properties.map(p=>p.id)).size,20);
});

test('zatvor i izlaz iz zatvora koriste uglove nove table', () => {
  assert.equal(t.board.findIndex(x=>x.kind==='jail'),30);
  assert.equal(t.board.findIndex(x=>x.kind==='jailvisit'),10);
  assert.equal(t.board.findIndex(x=>x.kind==='start'),0);
});
