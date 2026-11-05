
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const crypto = require('crypto');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: true, methods: ['GET','POST'] } });
app.use(express.static(path.join(__dirname, 'public')));
app.get('/health', (_, res) => res.json({ ok: true, game: 'Monopoly: Bosanska Mahala' }));

const PORT = process.env.PORT || 3000;
const COLORS = ['crvena','plava','žuta','zelena','ljubičasta','narandžasta','roza','tirkizna'];
const COLOR_HEX = {'crvena':'#d84e55','plava':'#4d83d5','žuta':'#e8bd4b','zelena':'#56a879','ljubičasta':'#9270c9','narandžasta':'#dc8745','roza':'#d77eae','tirkizna':'#48aaa9'};
const CATS = ['smještaj','trgovina','transport','infrastruktura'];
const CAT_ICON = {'smještaj':'⌂','trgovina':'✦','transport':'➤','infrastruktura':'⚡'};

const propertyNames = [
 ['Hotel Evropa','Motel Una','Hostel Baščaršija','Pansion Sebilj','Apartmani Neretva','Prenoćište Vrelo'],
 ['Ćevabdžinica Kod Želje','Pekara Klas','Restoran Stari Most','Tržni centar Mahala','Supermarket Bingo','Kafeterija Miris'],
 ['Željeznička stanica','Autobuska stanica','Aerodrom Mahala','Luka na Savi','Brzi Transport','Logistički centar'],
 ['Elektroprivreda','Gradski vodovod','Pumpa Bosna','Gradska toplana','Elektrodistribucija','Komunalno Sarajevo']
];
const properties = [];
for (let c=0;c<4;c++) for(let j=0;j<6;j++) {
  const price = [200,250,300,250,250,200][j];
  properties.push({
    id:`p${c*6+j}`, name:propertyNames[c][j], category:CATS[c], icon:CAT_ICON[CATS[c]],
    price, baseRent:[40,50,60,55,65,45][j], houseCost:150, hotelCost:300,
    rents:[ [40,100,180,280,400,600], [50,120,220,330,480,700], [60,140,250,380,540,780], [55,130,235,350,500,740], [65,150,270,410,580,850], [45,110,200,300,430,650] ][j],
    color:null, owner:null, houses:0, hotel:false, mortgaged:false
  });
}
const propertyById = Object.fromEntries(properties.map(p=>[p.id,p]));
const specialDefs = [
 ['Općina','opcina'],['Pijaca','pijaca'],['Gradska banka','bank'],['Porez na promet','tax'],['Pošta','bank'],['Dom zdravlja','health'],
 ['Kazna za parkiranje','tax'],['Gradski trg','free'],['Sportski centar','bonus'],['Sud','jail'],['Kulturni centar','bonus'],['Carina','tax'],
 ['Banka mahale','bank'],['Porez na dohodak','tax'],['Sajam','bonus'],['Gradska uprava','opcina']
];
const board = Array.from({length:48},(_,i)=>({index:i,type:'special',name:'Gradska služba',kind:'bonus'}));
function set(i,obj){board[i]={index:i,...obj};}
set(0,{type:'corner',kind:'start',name:'START'});
set(12,{type:'corner',kind:'jailvisit',name:'IZLAZ IZ ZATVORA'});
set(24,{type:'corner',kind:'parking',name:'BESPLATNI PARKING'});
set(36,{type:'corner',kind:'jail',name:'ZATVOR'});
// Distribute 24 properties, 4 taxis, and 16 special services around the 48 unique spaces.
let pi=0, ti=0, si=0;
const taxiSlots = new Set([6,18,30,42]);
const cornerSlots = new Set([0,12,24,36]);
for(let i=1;i<48;i++){
 if(cornerSlots.has(i)) continue;
 if(taxiSlots.has(i)){set(i,{type:'taxi',kind:'taxi',name:'TAXI'});ti++;continue;}
 if(pi<24 && (i%2===1 || (i>24 && i%2===0))){
   const p=properties[pi++]; set(i,{type:'property',propertyId:p.id,name:p.name});
 } else {
   const d=specialDefs[si % specialDefs.length]; set(i,{type:'special',kind:d[1],name:d[0]}); si++;
 }
}
// Fill any remaining property slots while preserving four taxis and corners.
for(let i=1;i<48 && pi<24;i++) if(!cornerSlots.has(i)&&!taxiSlots.has(i)&&board[i].type==='special'){
 const p=properties[pi++]; set(i,{type:'property',propertyId:p.id,name:p.name});
}
const nafakaDeck = [
 ['Poklon banke','Banka ti poklanja 150 KM.',{type:'money',amount:150}],
 ['Osiguranje','Dobijaš 200 KM od osiguranja.',{type:'money',amount:200}],
 ['Dobar dogovor','Dobijaš 100 KM od svakog igrača.',{type:'collect',amount:100}],
 ['Besplatna farba','Možeš besplatno promijeniti boju jedne svoje nekretnine.',{type:'freeColor'}],
 ['Mirna vožnja','Ne plaćaš sljedeću rentu.',{type:'skipRent'}],
 ['Mala firma','Dobijaš 200 KM ako imaš manje od tri nekretnine.',{type:'under3',amount:200}],
 ['Gradska akcija','Svi ostali igrači plaćaju 50 KM banci.',{type:'othersPay',amount:50}],
 ['Majstor na popustu','Dobijaš jednu besplatnu kućicu na nekretnini po izboru.',{type:'freeHouse'}],
 ['Komšijska pomoć','Banka ti daje 150 KM, a biraš igrača koji dobija 50 KM.',{type:'giftOne',amount:150,gift:50}],
 ['Povrat poreza','Dobijaš 100 KM.',{type:'money',amount:100}],
 ['Nagrada za trud','Dobijaš 250 KM.',{type:'money',amount:250}],
 ['Dobra reputacija','Svaki igrač ti plaća 50 KM.',{type:'collect',amount:50}],
 ['Sretan dan','Pomjeri se do STARTA i uzmi 200 KM.',{type:'toStart'}],
 ['Uspješna investicija','Dobijaš 125 KM.',{type:'money',amount:125}],
 ['Besplatno održavanje','Oslobađaš se sljedećeg troška održavanja.',{type:'skipFee'}],
 ['Pomoć prijatelja','Igrač sa najviše nekretnina plaća ti 75 KM.',{type:'richPay',amount:75}],
 ['Dobar komšiluk','Svi igrači dobijaju 50 KM, uključujući i tebe.',{type:'everyone',amount:50}],
 ['Povoljna gradnja','Sljedeća kućica košta te 50 KM manje.',{type:'cheapHouse',amount:50}],
 ['Nafaka na pijaci','Dobijaš 175 KM.',{type:'money',amount:175}],
 ['Sreća prati hrabre','Dobijaš 75 KM od banke.',{type:'money',amount:75}]
];
const rizikDeck = [
 ['Popravak krova','Plaćaš banci 150 KM.',{type:'pay',amount:150}],
 ['Račun za komunalije','Plaćaš 100 KM svakom igraču.',{type:'payAll',amount:100}],
 ['Neplanirani trošak','Gubiš 100 KM.',{type:'pay',amount:100}],
 ['Skuplji materijal','Sljedeća kućica košta 100 KM više.',{type:'expensiveHouse',amount:100}],
 ['Održavanje','Plaćaš 75 KM za svaku svoju nekretninu.',{type:'perProperty',amount:75}],
 ['Zabrana prebojavanja','Ne možeš mijenjati boju u narednom krugu.',{type:'blockColor'}],
 ['Pomoć komšiji','Plaćaš 100 KM igraču sa najmanje nekretnina.',{type:'poorPay',amount:100}],
 ['Kvar instalacija','Plaćaš 150 KM.',{type:'pay',amount:150}],
 ['Kazna za brzinu','Plaćaš 75 KM.',{type:'pay',amount:75}],
 ['Loša investicija','Plaćaš 125 KM.',{type:'pay',amount:125}],
 ['Porez na luksuz','Plaćaš 50 KM po hotelu i 25 KM po kućici.',{type:'buildingTax'}],
 ['Zatvorena ulica','Preskačeš sljedeći potez.',{type:'skipTurn'}],
 ['Popravka fasade','Plaćaš 50 KM po nekretnini.',{type:'perProperty',amount:50}],
 ['Loš ugovor','Plaćaš 100 KM najbogatijem igraču.',{type:'richPay',amount:100}],
 ['Pukla cijev','Plaćaš 100 KM.',{type:'pay',amount:100}],
 ['Skupe dozvole','Sljedeća gradnja hotela skuplja je 100 KM.',{type:'expensiveHotel',amount:100}],
 ['Parking kazna','Plaćaš 60 KM.',{type:'pay',amount:60}],
 ['Tržišni pad','Plaćaš 80 KM banci.',{type:'pay',amount:80}],
 ['Neispravna oprema','Plaćaš 40 KM po kućici i 100 KM po hotelu.',{type:'buildingTax2'}],
 ['Porezna kontrola','Plaćaš 125 KM.',{type:'pay',amount:125}]
];

const rooms = new Map();
const socketRoom = new Map();
const clampName = s => String(s||'Igrač').trim().slice(0,18) || 'Igrač';
const randCode = () => crypto.randomBytes(3).toString('hex').toUpperCase();
const shuffle = a => [...a].sort(()=>Math.random()-.5);
function publicState(room){
 const g=room.game;
 return {code:room.code,hostId:room.hostId,maxRounds:room.maxRounds,players:room.players.map(p=>({...p, socketId:undefined})),
   game:g?{started:g.started,ended:g.ended,round:g.round,maxRounds:g.maxRounds,currentPlayerId:g.currentPlayerId,
   board:g.board.map(s=>({...s})),properties:g.properties.map(p=>({...p})),phase:g.phase,pending:g.pending,auction:g.auction,trade:g.trade,finalRanking:g.finalRanking,winner:g.winner,
   log:g.log.slice(-35),turnOrder:g.turnOrder,scoreboard:scoreboard(g),lastRoll:g.lastRoll,discarded:g.discarded}:null};
}
function emitRoom(room){io.to(room.code).emit('state',publicState(room));}
function log(g,msg){g.log.push({id:crypto.randomUUID(),text:msg,at:Date.now()});}
function getPlayer(room,id){return room.players.find(p=>p.id===id);}
function prop(g,id){return g.properties.find(p=>p.id===id);}
function owned(g,id){return g.properties.filter(p=>p.owner===id);}
function colorCounts(g){const c={};for(const p of g.properties)if(p.color)c[p.color]=(c[p.color]||0)+1;return c;}
function canColor(g,color){return COLORS.includes(color)&&(colorCounts(g)[color]||0)<3;}
function completeColor(g,p){return p.color && g.properties.filter(x=>x.color===p.color&&x.owner===p.owner).length===3;}
function completeCategory(g,p){return g.properties.filter(x=>x.category===p.category&&x.owner===p.owner).length===3;}
function rentFor(g,p){
 if(p.mortgaged)return 0;
 let mult=(completeColor(g,p)?2:1)*(completeCategory(g,p)?2:1);
 const level=p.hotel?5:p.houses;
 return (level===0?p.baseRent:p.rents[level])*mult;
}
function score(p,g){const props=owned(g,p.id);return props.length*4+props.reduce((n,x)=>n+x.houses+(x.hotel?5:0),0);}
function scoreboard(g){return g?g.players.map(p=>({id:p.id,name:p.name,score:score(p,g),properties:owned(g,p.id).length,houses:owned(g,p.id).reduce((n,x)=>n+x.houses,0),hotels:owned(g,p.id).filter(x=>x.hotel).length,position:p.position,money:p.money,netWorth:netWorth(p,g)})).sort((a,b)=>b.score-a.score):[];}
function netWorth(p,g){return p.money+owned(g,p.id).reduce((n,x)=>n+x.price+x.houses*x.houseCost+(x.hotel?x.hotelCost+4*x.houseCost:0)-(x.mortgaged?x.price*.5:0),0);}
function nextPlayer(room){
 const g=room.game; let idx=g.turnOrder.indexOf(g.currentPlayerId);
 for(let k=1;k<=g.turnOrder.length;k++){const id=g.turnOrder[(idx+k)%g.turnOrder.length];const p=getPlayer(room,id);if(p&&!p.bankrupt){g.currentPlayerId=id;return;}}
 finishGame(room);
}
function applyRoundEnd(room){
 const g=room.game;
 if(g.turnOrder.every(id=>{const p=getPlayer(room,id);return !p||p.bankrupt||g.actedThisRound.includes(id)})){
   g.round++;
   if(g.round>4){
     for(const p of room.players.filter(x=>!x.bankrupt)){
       const n=owned(g,p.id).length;const bonus=200*(5-Math.min(n,5));if(bonus>0){p.money+=bonus;log(g,`${p.name} dobija ${bonus} KM bonusa za manji broj nekretnina.`);}
     }
   }
   if(g.round>=4){
     const scores=room.players.filter(x=>!x.bankrupt).map(p=>({id:p.id,s:score(p,g)}));
     if(scores.length){const min=Math.min(...scores.map(x=>x.s)),max=Math.max(...scores.map(x=>x.s));
       const lows=scores.filter(x=>x.s===min), highs=scores.filter(x=>x.s===max);
       if(lows.length===1)drawCard(room,lows[0].id,'nafaka');
       if(highs.length===1)drawCard(room,highs[0].id,'rizik');
     }
   }
   g.actedThisRound=[];
   if(g.round>g.maxRounds){finishGame(room);return;}
   log(g,`Počinje ${g.round}. krug.`);
 }
}
function drawCard(room,id,type){
 const g=room.game, p=getPlayer(room,id), deck=type==='nafaka'?nafakaDeck:rizikDeck;
 const card=deck[Math.floor(Math.random()*deck.length)];
 log(g,`${p.name} izvlači ${type.toUpperCase()}: ${card[0]} — ${card[1]}`);
 applyCard(room,p,card[2]);
}
function applyCard(room,p,e){
 const g=room.game, others=room.players.filter(x=>x.id!==p.id&&!x.bankrupt);
 const pay=(target,amount,recipient=null)=>{if(!target)return;target.money-=amount;if(recipient)recipient.money+=amount;else g.bank+=amount;};
 switch(e.type){
  case'money':p.money+=e.amount;break;
  case'collect':for(const x of others)pay(x,e.amount,p);break;
  case'othersPay':for(const x of others)pay(x,e.amount);break;
  case'everyone':for(const x of room.players.filter(x=>!x.bankrupt))x.money+=e.amount;break;
  case'under3':if(owned(g,p.id).length<3)p.money+=e.amount;break;
  case'giftOne':{p.money+=e.amount;const target=others[Math.floor(Math.random()*others.length)];if(target)charge(room,target,e.gift,p);break;}
  case'freeColor':{const own=owned(g,p.id);const target=own.find(x=>COLORS.some(c=>canColor(g,c)));const color=COLORS.find(c=>canColor(g,c));if(target&&color)target.color=color;break;}
  case'freeHouse':{const target=owned(g,p.id).find(x=>x.houses<4&&!x.hotel&&!x.mortgaged);if(target)target.houses++;break;}
  case'skipRent':p.skipRent=true;break;case'skipFee':p.skipFee=true;break;case'cheapHouse':p.cheapHouse=e.amount;break;
  case'pay':pay(p,e.amount);break;case'payAll':for(const x of others)pay(p,e.amount,x);break;
  case'perProperty':pay(p,e.amount*owned(g,p.id).length);break;
  case'buildingTax':pay(p,owned(g,p.id).reduce((n,x)=>n+(x.hotel?50*x.hotel:25*x.houses),0));break;
  case'buildingTax2':pay(p,owned(g,p.id).reduce((n,x)=>n+100*(x.hotel?1:0)+40*x.houses,0));break;
  case'poorPay':{const x=[...others].sort((a,b)=>owned(g,a.id).length-owned(g,b.id).length)[0];if(x)pay(p,e.amount,x);break;}
  case'richPay':{const x=[...others].sort((a,b)=>b.money-a.money)[0];if(x)pay(x,e.amount,p);break;}
  case'blockColor':p.blockColor=true;break;case'skipTurn':p.skipNext=true;break;
  case'expensiveHouse':p.expensiveHouse=e.amount;break;case'expensiveHotel':p.expensiveHotel=e.amount;break;
  case'toStart':p.position=0;p.money+=200;break;
 }
}
function finishGame(room){
 const g=room.game;if(!g||g.ended)return;g.ended=true;g.phase='ended';
 const ranking=room.players.filter(p=>!p.bankrupt).map(p=>({id:p.id,name:p.name,money:p.money,properties:owned(g,p.id).length,houses:owned(g,p.id).reduce((n,x)=>n+x.houses,0),hotels:owned(g,p.id).filter(x=>x.hotel).length,score:score(p,g),rentPaid:p.rentPaid,rentEarned:p.rentEarned,netWorth:netWorth(p,g)})).sort((a,b)=>b.netWorth-a.netWorth||b.money-a.money);
 g.winner=ranking[0]?.id;g.finalRanking=ranking;log(g,`Partija je završena. Pobjednik: ${ranking[0]?.name||'Nema pobjednika'}.`);
}
function debtCheck(room,p){
 if(p.money>=0)return true;
 p.money=0; // Debt is settled by forced asset liquidation choice; no negative balances are allowed.
 const g=room.game;
 const assets=owned(g,p.id);
 if(assets.length){g.phase='debt';g.pending={type:'debt',playerId:p.id,amount:Math.abs(p.debt||0),choices:assets.map(x=>({id:x.id,name:x.name}))};return false;}
 p.bankrupt=true;log(g,`${p.name} je bankrotirao.`);return false;
}
function charge(room,p,amount,recipient=null){
 if(p.skipRent&&recipient){p.skipRent=false;log(room.game,`${p.name} koristi zaštitu od rente.`);return;}
 p.money-=amount;if(recipient)recipient.money+=amount;else room.game.bank+=amount;
 if(recipient){recipient.rentEarned+=amount;p.rentPaid+=amount;}
 if(p.money<0){p.debt=-p.money;debtCheck(room,p);}
}
function startGame(room){
 const g={started:true,ended:false,round:1,maxRounds:room.maxRounds,players:room.players,board:board.map(x=>({...x})),properties:properties.map(x=>({...x})),
  bank:100000,phase:'turn',pending:null,turnOrder:room.players.map(p=>p.id),currentPlayerId:room.players[0].id,
  actedThisRound:[],log:[],lastRoll:null,discarded:[],auction:null,trade:null};
 room.players.forEach(p=>Object.assign(p,{money:2500,position:0,jailTurns:0,inJail:false,bankrupt:false,skipRent:false,skipFee:false,skipNext:false,blockColor:false,cheapHouse:0,expensiveHouse:0,expensiveHotel:0,rentPaid:0,rentEarned:0,changedColorRound:0,hasRolled:false}));
 log(g,'Partija je počela. Svaki igrač dobija 2.500 KM.');
 emitRoom(room);
}
function movePlayer(room,p,steps,passStart=true){
 const g=room.game, old=p.position, next=(old+steps)%48;
 if(passStart && old+steps>=48 && next!==0){p.money+=200;log(g,`${p.name} prolazi START i dobija 200 KM.`);}
 p.position=next;resolveLanding(room,p);
}
function resolveLanding(room,p){
 const g=room.game,s=g.board[p.position];
 if(s.type==='property'){
  const pr=prop(g,s.propertyId);
  if(!pr.owner){g.phase='buy';g.pending={type:'buy',playerId:p.id,propertyId:pr.id};}
  else if(pr.owner!==p.id&&!pr.mortgaged){
   const owner=getPlayer(room,pr.owner),rent=rentFor(g,pr);
   if(owner&&!owner.inJail){charge(room,p,rent,owner);log(g,`${p.name} plaća ${rent} KM rente igraču ${owner.name} za ${pr.name}.`);}
   else log(g,`Renta za ${pr.name} se ne naplaćuje.`);
  }
 } else if(s.kind==='start'){p.money+=200;log(g,`${p.name} staje na START i dobija 200 KM.`);}
 else if(s.kind==='parking'){log(g,`${p.name} odmara na Besplatnom parkingu.`);}
 else if(s.kind==='jail'){p.inJail=true;p.jailTurns=0;p.position=36;log(g,`${p.name} ide u zatvor.`);}
 else if(s.kind==='tax'){charge(room,p,150);log(g,`${p.name} plaća gradski porez 150 KM.`);}
 else if(s.kind==='bank'){p.money+=100;log(g,`${p.name} dobija 100 KM od gradske banke.`);}
 else if(s.kind==='bonus'){p.money+=75;log(g,`${p.name} dobija gradski bonus 75 KM.`);}
 else if(s.kind==='opcina'){p.money+=50;log(g,`${p.name} dobija 50 KM od općine.`);}
 else if(s.kind==='health'){charge(room,p,50);log(g,`${p.name} plaća 50 KM za zdravstvenu uslugu.`);}
 else if(s.kind==='pijaca'){p.money+=50;log(g,`${p.name} prodaje robu na pijaci i dobija 50 KM.`);}
 else if(s.kind==='jailvisit')log(g,`${p.name} je u posjeti zatvoru.`);
 else if(s.kind==='taxi'){g.phase='taxi';g.pending={type:'taxi',playerId:p.id};}
}
function endTurn(room,p){
 const g=room.game;if(!g||g.ended)return;
 p.hasRolled=false;
 if(!g.actedThisRound.includes(p.id))g.actedThisRound.push(p.id);
 applyRoundEnd(room);
 if(!g.ended){nextPlayer(room);g.phase='turn';g.pending=null;const np=getPlayer(room,g.currentPlayerId);if(np?.skipNext){np.skipNext=false;log(g,`${np.name} preskače potez zbog kartice Rizik.`);endTurn(room,np);return;}}
 emitRoom(room);
}
function act(socket,event,fn){
 const room=rooms.get(socketRoom.get(socket.id));if(!room)return;
 const p=getPlayer(room,socket.data.playerId);if(!p)return;
 const g=room.game;if(!g||g.ended)return;
 try{fn(room,p,g);emitRoom(room);}catch(e){socket.emit('errorMessage',e.message||'Akcija nije uspjela.');}
}
io.on('connection',socket=>{
 socket.on('createRoom',({name,maxRounds=30}={})=>{
  let code=randCode();while(rooms.has(code))code=randCode();
  const p={id:crypto.randomUUID(),name:clampName(name),token:crypto.randomUUID(),money:0,position:0,colorToken:['#d85b55','#4f83d1','#55a77a','#d7a64a','#8d70c8','#4eabb0'][0],rentPaid:0,rentEarned:0};
  const room={code,hostId:p.id,players:[p],maxRounds:[20,30,40,50].includes(+maxRounds)?+maxRounds:30,game:null};
  rooms.set(code,room);socket.join(code);socketRoom.set(socket.id,code);socket.data.playerId=p.id;
  socket.emit('joined',{code,playerId:p.id,token:p.token});emitRoom(room);
 });
 socket.on('joinRoom',({code,name,token}={})=>{
  const room=rooms.get(String(code||'').toUpperCase());if(!room)return socket.emit('errorMessage','Soba ne postoji.');
  let p=room.players.find(x=>token&&x.token===token);
  if(!p){if(room.game?.started)return socket.emit('errorMessage','Partija je već počela. Za povratak koristi svoj token.');if(room.players.length>=6)return socket.emit('errorMessage','Soba je puna (maksimalno 6 igrača).');
   p={id:crypto.randomUUID(),name:clampName(name),token:crypto.randomUUID(),money:0,position:0,colorToken:['#d85b55','#4f83d1','#55a77a','#d7a64a','#8d70c8','#4eabb0'][room.players.length]};room.players.push(p);}
  socket.join(room.code);socketRoom.set(socket.id,room.code);socket.data.playerId=p.id;
  socket.emit('joined',{code:room.code,playerId:p.id,token:p.token});emitRoom(room);
 });
 socket.on('startGame',()=>{const room=rooms.get(socketRoom.get(socket.id));if(!room||room.hostId!==socket.data.playerId)return;if(room.players.length<2)return socket.emit('errorMessage','Potrebna su najmanje 2 igrača.');if(room.game?.started)return;startGame(room);});
 socket.on('setRounds',n=>{const room=rooms.get(socketRoom.get(socket.id));if(room&&room.hostId===socket.data.playerId&&!room.game?.started)room.maxRounds=[20,30,40,50].includes(+n)?+n:30;emitRoom(room);});
 socket.on('kick',id=>{const room=rooms.get(socketRoom.get(socket.id));if(room&&room.hostId===socket.data.playerId&&!room.game?.started){room.players=room.players.filter(p=>p.id!==id);emitRoom(room);}});
 socket.on('roll',()=>act(socket,'roll',(room,p,g)=>{
  if(g.currentPlayerId!==p.id||g.phase!=='turn'||p.hasRolled)throw Error('Nije tvoj potez ili si već bacao kockice.');
  if(p.inJail){p.jailTurns++;const a=1+Math.floor(Math.random()*6),b=1+Math.floor(Math.random()*6);g.lastRoll={a,b,total:a+b,playerId:p.id};
   if(a===b||p.jailTurns>=3){p.inJail=false;p.jailTurns=0;p.position=12;p.hasRolled=true;log(g,`${p.name} izlazi iz zatvora.`);}else{log(g,`${p.name} ostaje u zatvoru.`);return endTurn(room,p);}return;}
  const a=1+Math.floor(Math.random()*6),b=1+Math.floor(Math.random()*6),total=a+b;g.lastRoll={a,b,total,playerId:p.id};p.hasRolled=true;
  log(g,`${p.name} baca ${a} + ${b} = ${total}.`);
  p.doubles=(a===b?(p.doubles||0)+1:0);
  if(p.doubles>=3){p.inJail=true;p.position=36;p.doubles=0;log(g,`${p.name} baca tri duple i ide u zatvor.`);return;}
  movePlayer(room,p,total);
  if(g.phase==='turn'&&a===b){p.hasRolled=false;log(g,`${p.name} ima pravo na dodatno bacanje.`);}
 }));
 socket.on('buy',({color}={})=>act(socket,'buy',(room,p,g)=>{
  if(g.phase!=='buy'||g.pending?.playerId!==p.id)throw Error('Kupovina nije dostupna.');
  const pr=prop(g,g.pending.propertyId);if(p.money<pr.price)throw Error('Nemaš dovoljno novca za kupovinu.');
  if(!canColor(g,color))throw Error('Ta boja je već popunjena ili nije validna.');
  p.money-=pr.price;pr.owner=p.id;pr.color=color;log(g,`${p.name} kupuje ${pr.name} za ${pr.price} KM i bira ${color} boju.`);
  g.phase='turn';g.pending=null;
 }));
 socket.on('declineBuy',()=>act(socket,'declineBuy',(room,p,g)=>{
  if(g.phase!=='buy'||g.pending?.playerId!==p.id)throw Error('Nije aktivna kupovina.');
  const pr=prop(g,g.pending.propertyId);g.auction={propertyId:pr.id,bids:{},turnIndex:0,order:g.turnOrder.filter(id=>!getPlayer(room,id).bankrupt)};g.phase='auction';g.pending=null;log(g,`Aukcija za ${pr.name} je otvorena.`);
 }));
 socket.on('bid',amount=>act(socket,'bid',(room,p,g)=>{
  if(g.phase!=='auction'||!g.auction)throw Error('Nema aktivne aukcije.');
  const a=g.auction;if(a.order[a.turnIndex]!==p.id)throw Error('Nisi na redu za licitaciju.');
  amount=Math.floor(+amount);if(!Number.isFinite(amount)||amount<0||amount>p.money)throw Error('Neispravan iznos ponude.');
  a.bids[p.id]=amount;a.turnIndex++;
  if(a.turnIndex>=a.order.length){const entries=Object.entries(a.bids).filter(x=>x[1]>0).sort((x,y)=>y[1]-x[1]);if(entries.length){const [id,price]=entries[0],pr=prop(g,a.propertyId),buyer=getPlayer(room,id);buyer.money-=price;pr.owner=id;g.pending={type:'auctionColor',playerId:id,propertyId:pr.id};g.phase='auctionColor';log(g,`${buyer.name} pobjeđuje aukciju za ${price} KM.`);}else{g.phase='turn';log(g,'Aukcija je završena bez ponuda.');}g.auction=null;}
 }));
 socket.on('auctionColor',({color}={})=>act(socket,'auctionColor',(room,p,g)=>{
  if(g.phase!=='auctionColor'||g.pending?.playerId!==p.id)throw Error('Nisi pobjednik aukcije.');
  if(!canColor(g,color))throw Error('Ta boja nije dostupna.');prop(g,g.pending.propertyId).color=color;g.phase='turn';g.pending=null;
 }));
 socket.on('taxi',({steps}={})=>act(socket,'taxi',(room,p,g)=>{
  if(g.phase!=='taxi'||g.pending?.playerId!==p.id)throw Error('Taxi nije dostupan.');
  const prices={1:2000,2:4500,3:7500};steps=+steps;
  if(!prices[steps])throw Error('Izaberi 1, 2 ili 3 polja.');if(p.money<prices[steps])throw Error('Nemaš dovoljno novca.');
  p.money-=prices[steps];log(g,`${p.name} plaća taxi ${prices[steps]} KM i vozi ${steps} polja.`);g.phase='turn';g.pending=null;movePlayer(room,p,steps);
 }));
 socket.on('skipTaxi',()=>act(socket,'skipTaxi',(room,p,g)=>{if(g.phase!=='taxi'||g.pending?.playerId!==p.id)throw Error('Taxi nije dostupan.');g.phase='turn';g.pending=null;}));
 socket.on('endTurn',()=>act(socket,'endTurn',(room,p,g)=>{
  if(g.currentPlayerId!==p.id)throw Error('Nije tvoj potez.');
  if(g.phase==='buy'||g.phase==='taxi'||g.phase==='auction'||g.phase==='auctionColor'||g.phase==='debt'||g.phase==='cardChoice')throw Error('Prvo završi aktivnu odluku.');
  if(g.phase!=='turn')throw Error('Potez se trenutno ne može završiti.');
  endTurn(room,p);
 }));
 socket.on('changeColor',({propertyId,color}={})=>act(socket,'changeColor',(room,p,g)=>{
  const pr=prop(g,propertyId);if(!pr||pr.owner!==p.id)throw Error('Nekretnina nije tvoja.');
  if(p.blockColor)throw Error('Kartica Rizik ti trenutno zabranjuje promjenu boje.');
  if(p.changedColorRound===g.round)throw Error('Već si promijenio boju u ovom krugu.');
  if(!canColor(g,color))throw Error('Ta boja je popunjena.');
  if(p.money<pr.price)throw Error('Promjena boje košta punu kupovnu cijenu.');
  p.money-=pr.price;pr.color=color;p.changedColorRound=g.round;log(g,`${p.name} mijenja boju nekretnine ${pr.name} u ${color} za ${pr.price} KM.`);
 }));
 socket.on('buildHouse',({propertyId}={})=>act(socket,'buildHouse',(room,p,g)=>{
  const pr=prop(g,propertyId);if(!pr||pr.owner!==p.id||pr.mortgaged||pr.hotel||pr.houses>=4)throw Error('Na ovoj nekretnini nije moguća gradnja.');
  const cost=pr.houseCost+(p.cheapHouse?-p.cheapHouse:0)+(p.expensiveHouse||0);if(p.money<cost)throw Error('Nemaš dovoljno novca.');
  p.money-=cost;p.cheapHouse=0;p.expensiveHouse=0;pr.houses++;log(g,`${p.name} gradi kućicu na ${pr.name} za ${cost} KM.`);
 }));
 socket.on('buildHotel',({propertyId}={})=>act(socket,'buildHotel',(room,p,g)=>{
  const pr=prop(g,propertyId);if(!pr||pr.owner!==p.id||pr.houses!==4||pr.hotel||p.position!==g.board.findIndex(s=>s.propertyId===propertyId))throw Error('Hotel se može graditi samo na nekretnini na kojoj stojiš i koja ima 4 kućice.');
  const cost=pr.hotelCost+(p.expensiveHotel||0);if(p.money<cost)throw Error('Nemaš dovoljno novca.');
  p.money-=cost;pr.houses=0;pr.hotel=true;p.expensiveHotel=0;log(g,`${p.name} gradi hotel na ${pr.name} za ${cost} KM.`);
 }));
 socket.on('mortgage',({propertyId}={})=>act(socket,'mortgage',(room,p,g)=>{
  const pr=prop(g,propertyId);if(!pr||pr.owner!==p.id||pr.mortgaged||pr.houses||pr.hotel)throw Error('Nekretnina se ne može založiti.');
  pr.mortgaged=true;p.money+=Math.floor(pr.price/2);log(g,`${p.name} stavlja hipoteku na ${pr.name}.`);
 }));
 socket.on('unmortgage',({propertyId}={})=>act(socket,'unmortgage',(room,p,g)=>{
  const pr=prop(g,propertyId);const cost=Math.ceil(pr.price*.6);if(!pr||pr.owner!==p.id||!pr.mortgaged||p.money<cost)throw Error('Hipoteka se ne može otplatiti.');
  p.money-=cost;pr.mortgaged=false;log(g,`${p.name} otplaćuje hipoteku na ${pr.name}.`);
 }));
 socket.on('debtSell',({propertyId}={})=>act(socket,'debtSell',(room,p,g)=>{
  if(g.phase!=='debt'||g.pending?.playerId!==p.id)throw Error('Nema aktivnog duga.');
  const pr=prop(g,propertyId);if(!pr||pr.owner!==p.id)throw Error('Nekretnina nije tvoja.');
  p.money+=Math.floor(pr.price/2)+pr.houses*75+(pr.hotel?300:0);pr.owner=null;pr.color=null;pr.houses=0;pr.hotel=false;pr.mortgaged=false;
  log(g,`${p.name} prodaje ${pr.name} banci radi otplate duga.`);
  if(p.money>0){g.phase='turn';g.pending=null;}else if(!owned(g,p.id).length){p.bankrupt=true;g.phase='turn';g.pending=null;log(g,`${p.name} je bankrotirao.`);}
 }));
 socket.on('cardChoice',({choiceId,color}={})=>act(socket,'cardChoice',(room,p,g)=>{
  const q=g.pending;if(g.phase!=='cardChoice'||q?.playerId!==p.id)throw Error('Nema aktivnog izbora.');
  if(q.type==='giftOne'){const x=getPlayer(room,choiceId);if(!x||x.id===p.id)throw Error('Izaberi drugog igrača.');charge(room,x,q.amount,p);}
  if(q.type==='freeColor'){const pr=prop(g,choiceId);if(!pr||pr.owner!==p.id||!canColor(g,color))throw Error('Izbor boje nije validan.');pr.color=color;}
  if(q.type==='freeHouse'){const pr=prop(g,choiceId);if(!pr||pr.owner!==p.id||pr.houses>=4||pr.hotel)throw Error('Izbor nekretnine nije validan.');pr.houses++;}
  g.phase='turn';g.pending=null;
 }));
 socket.on('tradeOffer',({toId,propertyIds=[],cash=0,requestPropertyIds=[],requestCash=0}={})=>act(socket,'tradeOffer',(room,p,g)=>{
  const to=getPlayer(room,toId);if(!to||to.id===p.id)throw Error('Neispravan igrač.');
  cash=Math.floor(+cash);requestCash=Math.floor(+requestCash);
  if(cash<0||requestCash<0||cash>p.money||requestCash>to.money)throw Error('Neispravan iznos novca.');
  if(propertyIds.some(id=>prop(g,id)?.owner!==p.id)||requestPropertyIds.some(id=>prop(g,id)?.owner!==to.id))throw Error('Ponuda sadrži nekretninu koja nije u vlasništvu odgovarajućeg igrača.');
  g.trade={from:p.id,to:to.id,propertyIds,requestPropertyIds,cash,requestCash};g.phase='trade';log(g,`${p.name} šalje ponudu za razmjenu igraču ${to.name}.`);
 }));
 socket.on('tradeRespond',accept=>act(socket,'tradeRespond',(room,p,g)=>{
  const t=g.trade;if(g.phase!=='trade'||!t||t.to!==p.id)throw Error('Nema ponude za tebe.');
  if(accept){const a=getPlayer(room,t.from);if(a.money<t.cash||p.money<t.requestCash)throw Error('Novac se promijenio; razmjena nije moguća.');
   a.money-=t.cash;p.money+=t.cash;p.money-=t.requestCash;a.money+=t.requestCash;
   for(const id of t.propertyIds){const pr=prop(g,id);pr.owner=p.id;}for(const id of t.requestPropertyIds){const pr=prop(g,id);pr.owner=a.id;}
   log(g,'Razmjena je prihvaćena.');}else log(g,'Ponuda za razmjenu je odbijena.');
  g.trade=null;g.phase='turn';
 }));
 socket.on('nafakaChoice',({propertyId,color}={})=>socket.emit('errorMessage','Izbor kartice se obavlja kroz aktivni izbor kartice.'));
 socket.on('pause',()=>{const room=rooms.get(socketRoom.get(socket.id));if(room&&room.hostId===socket.data.playerId&&room.game){room.game.phase=room.game.phase==='paused'?'turn':'paused';emitRoom(room);}});
 socket.on('disconnect',()=>{const code=socketRoom.get(socket.id);if(!code)return;const room=rooms.get(code);if(!room)return;const id=socket.data.playerId;const p=getPlayer(room,id);if(p){p.disconnected=true;log(room.game||{log:[]},`${p.name} je izgubio vezu.`);emitRoom(room);}});
});
server.listen(PORT,'0.0.0.0',()=>console.log(`Bosanska Mahala running on ${PORT}`));
