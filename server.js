
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
const CATS = ['smještaj','trgovina','transport','infrastruktura','ugostiteljstvo','zabava','javne_usluge','industrija'];
const CAT_ICON = {'smještaj':'⌂','trgovina':'✦','transport':'➤','infrastruktura':'⚡','ugostiteljstvo':'☕','zabava':'✧','javne_usluge':'⌂','industrija':'⚙'};
const propertyNames = [
 ['Hotel Evropa','Motel Una','Hostel Baščaršija','Pansion Sebilj'],
 ['Ćevabdžinica Kod Želje','Pekara Klas','Restoran Stari Most','Kafeterija Miris'],
 ['Željeznička stanica','Autobuska stanica','Aerodrom Mahala','Luka na Savi'],
 ['Elektroprivreda','Gradski vodovod','Gradska toplana','Elektrodistribucija'],
 ['Buregdžinica','Ćevabdžinica Neretva','Slastičarna','Restoran Bašča'],
 ['Kino Mahala','Sportski centar','Igraonica','Kulturni centar'],
 ['Gradska uprava','Pošta','Dom zdravlja','Vatrogasna stanica'],
 ['Fabrika namještaja','Pilana Bosna','Metalna industrija','Skladište Sjever']
];
const properties=[];
for(let c=0;c<8;c++) for(let j=0;j<4;j++){
 const idx=c*4+j, price=180+idx*18;
 properties.push({id:`p${idx+1}`,name:propertyNames[c][j],category:CATS[c],icon:CAT_ICON[CATS[c]],price,
  baseRent:Math.round(price*.18),houseCost:Math.round(price*.55),hotelCost:Math.round(price*.9),
  rents:[Math.round(price*.18),Math.round(price*.42),Math.round(price*.75),Math.round(price*1.15),Math.round(price*1.7),Math.round(price*2.5)],
  color:null,owner:null,houses:0,hotel:false,mortgaged:false,lastHouseRound:0});
}
const taxiNames=['Taxi Sjever','Taxi Istok','Taxi Jug','Taxi Zapad'];
const taxiProperties=taxiNames.map((name,i)=>({id:`taxi${i+1}`,name,category:'taxi',icon:'🚕',isTaxi:true,price:350,baseRent:90,houseCost:0,hotelCost:0,rents:[90,180,270,360,450,540],color:null,owner:null,houses:0,hotel:false,mortgaged:false,lastHouseRound:0}));
const allProperties=[...properties,...taxiProperties];
const propertyById=Object.fromEntries(allProperties.map(p=>[p.id,p]));
const board=Array.from({length:40},(_,i)=>({index:i,type:'corner',kind:'start',name:'START'}));
const corners={0:['start','START'],10:['jailvisit','IZLAZ IZ ZATVORA'],20:['parking','BESPLATNI PARKING'],30:['jail','ZATVOR']};
for(const [i,[kind,name]] of Object.entries(corners))board[+i]={index:+i,type:'corner',kind,name};
const taxiAt={5:0,15:1,25:2,35:3};
for(const [i,propertyIndex] of Object.entries(taxiAt))board[+i]={index:+i,type:'property',propertyId:taxiProperties[propertyIndex].id,name:taxiProperties[propertyIndex].name};
let propertyIndex=0;
for(let i=1;i<40;i++){
 if(corners[i]||taxiAt[i]!==undefined)continue;
 const pr=properties[propertyIndex++];board[i]={index:i,type:'property',propertyId:pr.id,name:pr.name};
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
const shuffle = a => {const out=[...a];for(let i=out.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[out[i],out[j]]=[out[j],out[i]];}return out;};
function publicState(room){
 const g=room.game;
 return {code:room.code,hostId:room.hostId,maxRounds:room.maxRounds,players:room.players.map(({token,socketId,...p})=>({...p})),
   game:g?{started:g.started,ended:g.ended,paused:!!g.paused,round:g.round,maxRounds:g.maxRounds,currentPlayerId:g.currentPlayerId,turnDeadline:g.turnDeadline,
   board:g.board.map(s=>({...s})),properties:g.properties.map(p=>({...p})),phase:g.phase,pending:g.pending,auction:g.auction,trade:g.trade,finalRanking:g.finalRanking,winner:g.winner,
   log:g.log.slice(-35),turnOrder:g.turnOrder,scoreboard:scoreboard(g),lastRoll:g.lastRoll,discarded:g.discarded}:null};
}
function emitRoom(room){io.to(room.code).emit('state',publicState(room));}
function log(g,msg){g.log.push({id:crypto.randomUUID(),text:msg,at:Date.now()});}
function getPlayer(room,id){return room.players.find(p=>p.id===id);}
function prop(g,id){return g.properties.find(p=>p.id===id);}
function owned(g,id){return g.properties.filter(p=>p.owner===id);}
function colorCounts(g){const c={};for(const p of g.properties)if(p.color)c[p.color]=(c[p.color]||0)+1;return c;}
function canColor(g,color){return COLORS.includes(color)&&(colorCounts(g)[color]||0)<4;}
function completeColor(g,p){return p.color && g.properties.filter(x=>x.color===p.color&&x.owner===p.owner).length===4;}
function completeCategory(g,p){return g.properties.filter(x=>x.category===p.category&&x.owner===p.owner).length===4;}
function rentFor(g,p){
 if(p.mortgaged)return 0;
 if(p.isTaxi){const count=g.properties.filter(x=>x.isTaxi&&x.owner===p.owner).length;return p.baseRent*Math.max(1,count);}
 let mult=(completeColor(g,p)?2:1)*(completeCategory(g,p)?2:1);
 const level=p.hotel?5:p.houses;
 return (level===0?p.baseRent:p.rents[level])*mult;
}
function score(p,g){const props=owned(g,p.id);return props.length*4+props.reduce((n,x)=>n+x.houses+(x.hotel?5:0),0);}
function scoreboard(g){return g?g.players.map(p=>({id:p.id,name:p.name,score:score(p,g),properties:owned(g,p.id).length,houses:owned(g,p.id).reduce((n,x)=>n+x.houses,0),hotels:owned(g,p.id).filter(x=>x.hotel).length,position:p.position,money:p.money,netWorth:netWorth(p,g)})).sort((a,b)=>b.score-a.score):[];}
function netWorth(p,g){return p.money+owned(g,p.id).reduce((n,x)=>n+x.price+x.houses*x.houseCost+(x.hotel?x.hotelCost+4*x.houseCost:0)-(x.mortgaged?x.price*.5:0),0);}
function nextPlayer(room){
 const g=room.game; let idx=g.turnOrder.indexOf(g.currentPlayerId);
 for(let k=1;k<=g.turnOrder.length;k++){const id=g.turnOrder[(idx+k)%g.turnOrder.length];const p=getPlayer(room,id);if(p&&!p.bankrupt){g.currentPlayerId=id;g.turnDeadline=Date.now()+60000;return;}}
 finishGame(room);
}
function applyRoundEnd(room){
 const g=room.game;
 if(g.turnOrder.every(id=>{const p=getPlayer(room,id);return !p||p.bankrupt||g.actedThisRound.includes(id)})){
   g.round++;
   if(g.round===4 && !g.milestoneCardsDrawn){
     g.milestoneCardsDrawn=true;
     const scores=room.players.filter(x=>!x.bankrupt).map(p=>({id:p.id,s:score(p,g)})).sort((a,b)=>a.s-b.s);
     if(scores.length){drawCard(room,scores[0].id,'nafaka');if(scores.length>1)drawCard(room,scores[scores.length-1].id,'rizik');}
   }
   g.actedThisRound=[];
   for(const p of room.players){p.blockColor=false;}
   if(g.round>g.maxRounds){finishGame(room);return;}
   log(g,`Počinje ${g.round}. krug.`);
 }
}
function drawCard(room,id,type){
 const g=room.game;if(g.phase==='debt'){g.queuedCards.push({id,type});return;}
 const p=getPlayer(room,id), deck=type==='nafaka'?nafakaDeck:rizikDeck;
 if(!g.cardPiles[type]||!g.cardPiles[type].length){const returned=g.discarded.filter(x=>x.type===type).map(x=>x.card);g.discarded=g.discarded.filter(x=>x.type!==type);g.cardPiles[type]=shuffle(returned.length?returned:deck);}
 const card=g.cardPiles[type].pop();
 g.discarded.push({type,card,at:Date.now()});
 log(g,`${p.name} izvlači ${type.toUpperCase()}: ${card[0]} — ${card[1]}`);
 applyCard(room,p,card[2]);
}
function drainQueuedCards(room){
 const g=room.game;
 while(g.phase!=='debt'&&g.queuedCards.length){const next=g.queuedCards.shift();drawCard(room,next.id,next.type);}
}
function applyCard(room,p,e){
 const g=room.game, others=room.players.filter(x=>x.id!==p.id&&!x.bankrupt);
 const pay=(target,amount,recipient=null)=>{if(!target||target.bankrupt)return;target.money-=amount;if(recipient)recipient.money+=amount;else g.bank+=amount;if(target.money<0)debtCheck(room,target);};
 switch(e.type){
  case'money':p.money+=e.amount;break;
  case'collect':for(const x of others){pay(x,e.amount,p);if(g.phase==='debt')break;}break;
  case'othersPay':for(const x of others){pay(x,e.amount);if(g.phase==='debt')break;}break;
  case'everyone':for(const x of room.players.filter(x=>!x.bankrupt))x.money+=e.amount;break;
  case'under3':if(owned(g,p.id).length<3)p.money+=e.amount;break;
  case'giftOne':{p.money+=e.amount;const target=others[Math.floor(Math.random()*others.length)];if(target)charge(room,target,e.gift,p);break;}
  case'freeColor':{const own=owned(g,p.id);const target=own.find(x=>!x.isTaxi&&COLORS.some(c=>canColor(g,c)&&c!==x.color));const color=COLORS.find(c=>canColor(g,c)&&c!==target?.color);if(target&&color)target.color=color;else p.money+=100;break;}
  case'freeHouse':{const target=owned(g,p.id).find(x=>!x.isTaxi&&x.houses<4&&!x.hotel&&!x.mortgaged&&x.lastHouseRound!==g.round);if(target){target.houses++;target.lastHouseRound=g.round;}else p.money+=100;break;}
  case'skipRent':p.skipRent=true;break;case'skipFee':p.skipFee=true;break;case'cheapHouse':p.cheapHouse=e.amount;break;
  case'pay':pay(p,e.amount);break;case'payAll':for(const x of others){pay(p,e.amount,x);if(g.phase==='debt')break;}break;
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
 const g=room.game;
 g.currentPlayerId=p.id;
 p.debtRemaining=Math.max(0,Math.ceil(-p.money));
 p.money=0;
 const assets=owned(g,p.id);
 if(assets.length){
  g.phase='debt';
  g.pending={type:'debt',playerId:p.id,amount:p.debtRemaining,choices:assets.map(x=>({id:x.id,name:x.name}))};
  log(g,`${p.name} duguje ${p.debtRemaining} KM i mora prodati imovinu.`);
  return false;
 }
 p.bankrupt=true;
 log(g,`${p.name} je bankrotirao.`);
 return false;
}
function applyDebtProceeds(room,p,proceeds){
 const g=room.game;
 const paid=Math.min(proceeds,p.debtRemaining||0);
 p.debtRemaining=Math.max(0,(p.debtRemaining||0)-paid);
 p.money+=(proceeds-paid);
 if(p.debtRemaining===0){g.phase='turn';g.pending=null;if(p.extraRoll)p.hasRolled=false;log(g,`${p.name} je izmirio dug.`);}
 else if(!owned(g,p.id).length){p.bankrupt=true;g.phase='turn';g.pending=null;log(g,`${p.name} je bankrotirao zbog preostalog duga od ${p.debtRemaining} KM.`);}
 else{g.pending.amount=p.debtRemaining;g.pending.choices=owned(g,p.id).map(x=>({id:x.id,name:x.name}));}
 if(g.phase!=='debt')drainQueuedCards(room);
}
function charge(room,p,amount,recipient=null){
 if(p.skipRent&&recipient){p.skipRent=false;log(room.game,`${p.name} koristi zaštitu od rente.`);return;}
 if(p.skipFee&&!recipient){p.skipFee=false;log(room.game,`${p.name} koristi oslobađanje od sljedeće uplate banci.`);return;}
 p.money-=amount;if(recipient)recipient.money+=amount;else room.game.bank+=amount;
 if(recipient){recipient.rentEarned+=amount;p.rentPaid+=amount;}
 if(p.money<0){p.debt=-p.money;debtCheck(room,p);}
}
function startGame(room){
 const g={started:true,ended:false,round:1,maxRounds:room.maxRounds,players:room.players,board:board.map(x=>({...x})),properties:allProperties.map(x=>({...x})),
  bank:100000,phase:'turn',paused:false,pending:null,milestoneCardsDrawn:false,cardPiles:{nafaka:shuffle(nafakaDeck),rizik:shuffle(rizikDeck)},queuedCards:[],turnOrder:room.players.map(p=>p.id),currentPlayerId:room.players[0].id,turnDeadline:Date.now()+60000,
  actedThisRound:[],log:[],lastRoll:null,discarded:[],auction:null,trade:null};
 room.players.forEach(p=>Object.assign(p,{money:2500,position:0,jailTurns:0,inJail:false,bankrupt:false,skipRent:false,skipFee:false,skipNext:false,blockColor:false,cheapHouse:0,expensiveHouse:0,expensiveHotel:0,rentPaid:0,rentEarned:0,changedColorRound:0,hasRolled:false,extraRoll:false,doubles:0,debtRemaining:0,landedPropertyThisTurn:false,landedPropertyId:null}));
 room.game=g;
 log(g,'Partija je počela. Svaki igrač dobija 2.500 KM.');
 emitRoom(room);
}
function movePlayer(room,p,steps,passStart=true,byTaxi=false){
 const g=room.game, old=p.position, next=(old+steps)%40;
 if(passStart && old+steps>=40 && next!==0){p.money+=200;log(g,`${p.name} prolazi START i dobija 200 KM.`);}
 p.position=next;resolveLanding(room,p,byTaxi);
}
function resolveLanding(room,p,byTaxi=false){
 const g=room.game,s=g.board[p.position];
 if(s.type==='property'){
  p.landedPropertyThisTurn=!byTaxi;p.landedPropertyId=byTaxi?null:s.propertyId;
  const pr=prop(g,s.propertyId);
  if(!pr.owner){g.phase='buy';g.pending={type:'buy',playerId:p.id,propertyId:pr.id};}
  else if(pr.owner!==p.id&&!pr.mortgaged){
   const owner=getPlayer(room,pr.owner),rent=rentFor(g,pr);
   if(owner&&!owner.inJail){charge(room,p,rent,owner);log(g,`${p.name} plaća ${rent} KM rente igraču ${owner.name} za ${pr.name}.`);}
   else log(g,`Renta za ${pr.name} se ne naplaćuje.`);
  }
 } else if(s.kind==='start'){p.money+=200;log(g,`${p.name} staje na START i dobija 200 KM.`);}
 else if(s.kind==='parking'){log(g,`${p.name} odmara na Besplatnom parkingu.`);}
 else if(s.kind==='jail'){p.inJail=true;p.jailTurns=0;p.doubles=0;p.extraRoll=false;p.hasRolled=true;p.position=30;log(g,`${p.name} ide u zatvor.`);}
 else if(s.kind==='tax'){charge(room,p,150);log(g,`${p.name} plaća gradski porez 150 KM.`);}
 else if(s.kind==='bank'){p.money+=100;log(g,`${p.name} dobija 100 KM od gradske banke.`);}
 else if(s.kind==='bonus'){p.money+=75;log(g,`${p.name} dobija gradski bonus 75 KM.`);}
 else if(s.kind==='opcina'){p.money+=50;log(g,`${p.name} dobija 50 KM od općine.`);}
 else if(s.kind==='health'){charge(room,p,50);log(g,`${p.name} plaća 50 KM za zdravstvenu uslugu.`);}
 else if(s.kind==='pijaca'){p.money+=50;log(g,`${p.name} prodaje robu na pijaci i dobija 50 KM.`);}
 else if(s.kind==='jailvisit')log(g,`${p.name} je u posjeti zatvoru.`);
 
}
function endTurn(room,p){
 const g=room.game;if(!g||g.ended)return;
 p.hasRolled=false;p.extraRoll=false;p.landedPropertyThisTurn=false;p.landedPropertyId=null;
 if(!g.actedThisRound.includes(p.id))g.actedThisRound.push(p.id);
 applyRoundEnd(room);
 if(g.phase==='debt'||g.phase==='cardChoice'){emitRoom(room);return;}
 if(!g.ended){nextPlayer(room);g.phase='turn';g.pending=null;const np=getPlayer(room,g.currentPlayerId);if(np?.skipNext){np.skipNext=false;log(g,`${np.name} preskače potez zbog kartice Rizik.`);endTurn(room,np);return;}}
 emitRoom(room);
}
function act(socket,event,fn){
 const room=rooms.get(socketRoom.get(socket.id));if(!room)return;
 const p=getPlayer(room,socket.data.playerId);if(!p)return;
 const g=room.game;if(!g||g.ended)return;
 if(g.paused){socket.emit('errorMessage','Igra je pauzirana.');return;}
 try{fn(room,p,g);emitRoom(room);}catch(e){socket.emit('errorMessage',e.message||'Akcija nije uspjela.');}
}
io.on('connection',socket=>{
 socket.on('createRoom',({name,maxRounds=30}={})=>{
  const previous=socketRoom.get(socket.id);if(previous)socket.leave(previous);
  let code=randCode();while(rooms.has(code))code=randCode();
  const p={id:crypto.randomUUID(),name:clampName(name),token:crypto.randomUUID(),money:0,position:0,colorToken:['#d85b55','#4f83d1','#55a77a','#d7a64a','#8d70c8','#4eabb0'][0],tokenIcon:'🐦',rentPaid:0,rentEarned:0};
  const room={code,hostId:p.id,players:[p],maxRounds:[20,30,40,50].includes(+maxRounds)?+maxRounds:30,game:null};
  rooms.set(code,room);socket.join(code);socketRoom.set(socket.id,code);socket.data.playerId=p.id;
  p.socketId=socket.id;p.disconnected=false;
  socket.emit('joined',{code,playerId:p.id,token:p.token});emitRoom(room);
 });
 socket.on('joinRoom',({code,name,token}={})=>{
  const previous=socketRoom.get(socket.id);if(previous)socket.leave(previous);socketRoom.delete(socket.id);socket.data.playerId=null;
  const room=rooms.get(String(code||'').toUpperCase());if(!room)return socket.emit('errorMessage','Soba ne postoji.');
  let p=room.players.find(x=>token&&x.token===token);
  if(!p){if(room.game?.started)return socket.emit('errorMessage','Partija je već počela. Za povratak koristi svoj token.');if(room.players.length>=6)return socket.emit('errorMessage','Soba je puna (maksimalno 6 igrača).');
   p={id:crypto.randomUUID(),name:clampName(name),token:crypto.randomUUID(),money:0,position:0,colorToken:['#d85b55','#4f83d1','#55a77a','#d7a64a','#8d70c8','#4eabb0'][room.players.length],tokenIcon:['🐦','🦉','🦜','🐧','🦆','🦅'][room.players.length]};room.players.push(p);}
  if(p.socketId&&p.socketId!==socket.id){const old=io.sockets.sockets.get(p.socketId);if(old)old.disconnect(true);}
  p.socketId=socket.id;p.disconnected=false;socket.join(room.code);socketRoom.set(socket.id,room.code);socket.data.playerId=p.id;
  socket.emit('joined',{code:room.code,playerId:p.id,token:p.token});emitRoom(room);
 });
 socket.on('leaveRoom',()=>{
  const code=socketRoom.get(socket.id),room=rooms.get(code);if(!room||room.game?.started)return;
  const id=socket.data.playerId;socket.leave(code);socketRoom.delete(socket.id);room.players=room.players.filter(x=>x.id!==id);
  if(room.hostId===id)room.hostId=room.players[0]?.id||null;
  if(!room.players.length)rooms.delete(code);else emitRoom(room);
 });
 socket.on('startGame',()=>{const room=rooms.get(socketRoom.get(socket.id));if(!room||room.hostId!==socket.data.playerId)return;if(room.players.length<2)return socket.emit('errorMessage','Potrebna su najmanje 2 igrača.');if(room.game?.started)return;startGame(room);});
 socket.on('chooseToken',token=>{
  const room=rooms.get(socketRoom.get(socket.id));if(!room||room.game?.started)return;
  const allowed=['🐦','🦉','🦜','🐧','🦆','🦅'];
  const p=getPlayer(room,socket.data.playerId);if(!p||!allowed.includes(token))return;
  if(room.players.some(x=>x.id!==p.id&&x.tokenIcon===token))return socket.emit('errorMessage','Ova figurica je već zauzeta.');
  p.tokenIcon=token;emitRoom(room);
 });
 socket.on('chooseColor',color=>{
  const room=rooms.get(socketRoom.get(socket.id));if(!room||room.game?.started)return;
  const p=getPlayer(room,socket.data.playerId);if(!p||!COLORS.includes(color))return;
  const hex=COLOR_HEX[color];
  if(room.players.some(x=>x.id!==p.id&&x.colorToken===hex))return socket.emit('errorMessage','Tu boju već koristi drugi igrač.');
  p.colorToken=hex;emitRoom(room);
 });
 socket.on('setRounds',n=>{const room=rooms.get(socketRoom.get(socket.id));if(!room)return;if(room.hostId===socket.data.playerId&&!room.game?.started)room.maxRounds=[20,30,40,50].includes(+n)?+n:30;emitRoom(room);});
 socket.on('kick',id=>{const room=rooms.get(socketRoom.get(socket.id));if(!room||room.hostId!==socket.data.playerId||room.game?.started)return;const target=getPlayer(room,id);if(!target||target.id===room.hostId)return;const targetSocket=target.socketId&&io.sockets.sockets.get(target.socketId);if(targetSocket){targetSocket.leave(room.code);socketRoom.delete(targetSocket.id);targetSocket.emit('errorMessage','Domaćin te je uklonio iz sobe.');}room.players=room.players.filter(p=>p.id!==id);emitRoom(room);});
 socket.on('roll',()=>act(socket,'roll',(room,p,g)=>{
  if(g.currentPlayerId!==p.id||g.phase!=='turn'||p.hasRolled)throw Error('Nije tvoj potez ili si već bacao kockice.');
  if(p.inJail){p.jailTurns++;const a=1+Math.floor(Math.random()*6),b=1+Math.floor(Math.random()*6);g.lastRoll={a,b,total:a+b,playerId:p.id};
   if(a===b||p.jailTurns>=3){p.inJail=false;p.jailTurns=0;p.position=10;p.hasRolled=true;log(g,`${p.name} izlazi iz zatvora.`);}else{log(g,`${p.name} ostaje u zatvoru.`);return endTurn(room,p);}return;}
  const a=1+Math.floor(Math.random()*6),b=1+Math.floor(Math.random()*6),total=a+b;g.lastRoll={a,b,total,playerId:p.id};p.hasRolled=true;
  log(g,`${p.name} baca ${a} + ${b} = ${total}.`);
  p.doubles=(a===b?(p.doubles||0)+1:0);
  if(p.doubles>=3){p.inJail=true;p.position=30;p.doubles=0;p.extraRoll=false;log(g,`${p.name} baca tri duple i ide u zatvor.`);return;}
  p.extraRoll=(a===b);
  movePlayer(room,p,total);
  if(g.phase==='turn'&&a===b&&!p.inJail){p.hasRolled=false;log(g,`${p.name} ima pravo na dodatno bacanje.`);}else if(p.inJail){p.extraRoll=false;p.hasRolled=true;}
 }));
 socket.on('jailBail',()=>act(socket,'jailBail',(room,p,g)=>{
  if(g.currentPlayerId!==p.id||g.phase!=='turn'||!p.inJail)throw Error('Nisi u zatvoru ili nije tvoj potez.');
  const bail=100;if(p.money<bail)throw Error('Nemaš dovoljno novca za kauciju od 100 KM.');
  p.money-=bail;g.bank+=bail;p.inJail=false;p.jailTurns=0;p.position=10;p.hasRolled=true;
  log(g,`${p.name} plaća kauciju od 100 KM i izlazi iz zatvora.`);
 }));
 socket.on('buy',({color}={})=>act(socket,'buy',(room,p,g)=>{
  if(g.phase!=='buy'||g.pending?.playerId!==p.id)throw Error('Kupovina nije dostupna.');
  const pr=prop(g,g.pending.propertyId);if(p.money<pr.price)throw Error('Nemaš dovoljno novca za kupovinu.');
  if(!pr.isTaxi&&!canColor(g,color))throw Error('Ta boja je već popunjena ili nije validna.');
  p.money-=pr.price;pr.owner=p.id;pr.color=pr.isTaxi?null:color;log(g,`${p.name} kupuje ${pr.name} za ${pr.price} KM${pr.isTaxi?'':` i bira ${color} boju`}.`);
  g.phase='turn';g.pending=null;if(p.extraRoll)p.hasRolled=false;
 }));
 socket.on('declineBuy',({choice='skip'}={})=>act(socket,'declineBuy',(room,p,g)=>{
  if(g.phase!=='buy'||g.pending?.playerId!==p.id)throw Error('Nije aktivna kupovina.');
  const pr=prop(g,g.pending.propertyId);
  if(choice==='auction'){
   g.auction={propertyId:pr.id,bids:{},turnIndex:0,order:g.turnOrder.filter(id=>{const player=getPlayer(room,id);return player&&!player.bankrupt;})};
   g.phase='auction';log(g,`Aukcija za ${pr.name} je otvorena.`);
  }else if(choice==='skip'){
   g.phase='turn';log(g,`${p.name} preskače kupovinu nekretnine ${pr.name}. Niko je ne može kupiti.`);
   if(p.extraRoll)p.hasRolled=false;
  }else throw Error('Izbor nije validan.');
  g.pending=null;
 }));
 socket.on('bid',amount=>act(socket,'bid',(room,p,g)=>{
  if(g.phase!=='auction'||!g.auction)throw Error('Nema aktivne aukcije.');
  const a=g.auction;if(a.order[a.turnIndex]!==p.id)throw Error('Nisi na redu za licitaciju.');
  amount=Math.floor(+amount);if(!Number.isFinite(amount)||amount<0||amount>p.money)throw Error('Neispravan iznos ponude.');
  a.bids[p.id]=amount;a.turnIndex++;
  if(a.turnIndex>=a.order.length){const entries=Object.entries(a.bids).filter(x=>x[1]>0).sort((x,y)=>y[1]-x[1]);if(entries.length){const [id,price]=entries[0],pr=prop(g,a.propertyId),buyer=getPlayer(room,id);buyer.money-=price;pr.owner=id;if(pr.isTaxi){pr.color=null;g.pending=null;g.phase='turn';log(g,`${buyer.name} osvaja ${pr.name} za ${price} KM.`);}else{g.pending={type:'auctionColor',playerId:id,propertyId:pr.id};g.phase='auctionColor';log(g,`${buyer.name} pobjeđuje aukciju za ${price} KM.`);}}else{g.phase='turn';log(g,'Aukcija je završena bez ponuda.');}g.auction=null;if(g.phase==='turn'&&getPlayer(room,g.currentPlayerId)?.extraRoll)getPlayer(room,g.currentPlayerId).hasRolled=false;}
 }));
 socket.on('auctionColor',({color}={})=>act(socket,'auctionColor',(room,p,g)=>{
  if(g.phase!=='auctionColor'||g.pending?.playerId!==p.id)throw Error('Nisi pobjednik aukcije.');
  const pr=prop(g,g.pending.propertyId);if(!pr||pr.isTaxi||!canColor(g,color))throw Error('Ta boja nije dostupna.');pr.color=color;g.phase='turn';g.pending=null;const turnPlayer=getPlayer(room,g.currentPlayerId);if(turnPlayer?.extraRoll)turnPlayer.hasRolled=false;
 }));
 socket.on('endTurn',()=>act(socket,'endTurn',(room,p,g)=>{
  if(g.currentPlayerId!==p.id)throw Error('Nije tvoj potez.');
  if(p.extraRoll)throw Error('Imaš pravo na dodatno bacanje i ne možeš još završiti potez.');
  if(!p.hasRolled)throw Error('Prvo baci kockice.');
  if(g.phase==='buy'||g.phase==='auction'||g.phase==='auctionColor'||g.phase==='debt'||g.phase==='cardChoice')throw Error('Prvo završi aktivnu odluku.');
  if(g.phase!=='turn')throw Error('Potez se trenutno ne može završiti.');
  endTurn(room,p);
 }));
 socket.on('changeColor',({propertyId,color}={})=>act(socket,'changeColor',(room,p,g)=>{
  if(g.currentPlayerId!==p.id||g.phase!=='turn'||p.inJail)throw Error('Ovu akciju možeš izvršiti samo tokom svog poteza izvan zatvora.');
  const pr=prop(g,propertyId);if(!pr||pr.owner!==p.id||pr.isTaxi)throw Error('Nekretnina nije tvoja ili ne podržava promjenu boje.');
  if(p.blockColor)throw Error('Kartica Rizik ti trenutno zabranjuje promjenu boje.');
  if(p.changedColorRound===g.round)throw Error('Već si promijenio boju u ovom krugu.');
  if(!canColor(g,color)||color===pr.color)throw Error('Izaberi drugu dostupnu boju.');
  if(p.money<pr.price)throw Error('Promjena boje košta punu kupovnu cijenu.');
  p.money-=pr.price;pr.color=color;p.changedColorRound=g.round;log(g,`${p.name} mijenja boju nekretnine ${pr.name} u ${color} za ${pr.price} KM.`);
 }));
 socket.on('buildHouse',({propertyId}={})=>act(socket,'buildHouse',(room,p,g)=>{
  if(g.currentPlayerId!==p.id||g.phase!=='turn'||p.inJail)throw Error('Graditi možeš samo tokom svog poteza izvan zatvora.');
  const pr=prop(g,propertyId);if(!pr||pr.isTaxi||pr.owner!==p.id||pr.mortgaged||pr.hotel||pr.houses>=4||pr.lastHouseRound===g.round)throw Error('Na ovoj nekretnini nije moguća gradnja ili si već nadogradio kućicu u ovom krugu.');
  const cost=pr.houseCost+(p.cheapHouse?-p.cheapHouse:0)+(p.expensiveHouse||0);if(p.money<cost)throw Error('Nemaš dovoljno novca.');
  p.money-=cost;p.cheapHouse=0;p.expensiveHouse=0;pr.houses++;pr.lastHouseRound=g.round;log(g,`${p.name} gradi kućicu na ${pr.name} za ${cost} KM.`);
 }));
 socket.on('buildHotel',({propertyId}={})=>act(socket,'buildHotel',(room,p,g)=>{
  if(g.currentPlayerId!==p.id||g.phase!=='turn'||p.inJail)throw Error('Hotel možeš graditi samo tokom svog poteza izvan zatvora.');
  const pr=prop(g,propertyId);if(!pr||pr.isTaxi||pr.owner!==p.id||pr.houses!==4||pr.hotel||pr.lastHouseRound===g.round||!p.landedPropertyThisTurn||p.landedPropertyId!==propertyId||p.position!==g.board.findIndex(s=>s.propertyId===propertyId))throw Error('Hotel se može graditi samo na nekretnini na kojoj stojiš i koja ima 4 kućice.');
  const cost=pr.hotelCost+(p.expensiveHotel||0);if(p.money<cost)throw Error('Nemaš dovoljno novca.');
  p.money-=cost;pr.houses=0;pr.hotel=true;pr.lastHouseRound=g.round;p.expensiveHotel=0;p.landedPropertyThisTurn=false;p.landedPropertyId=null;log(g,`${p.name} gradi hotel na ${pr.name} za ${cost} KM.`);
 }));
 socket.on('mortgage',({propertyId}={})=>act(socket,'mortgage',(room,p,g)=>{
  if(g.currentPlayerId!==p.id||!['turn','debt'].includes(g.phase))throw Error('Hipoteku možeš koristiti tokom svog poteza ili izmirenja duga.');
  const pr=prop(g,propertyId);if(!pr||pr.owner!==p.id||pr.mortgaged||pr.houses||pr.hotel)throw Error('Nekretnina se ne može založiti.');
  pr.mortgaged=true;const proceeds=Math.floor(pr.price/2);if(g.phase==='debt')applyDebtProceeds(room,p,proceeds);else p.money+=proceeds;log(g,`${p.name} stavlja hipoteku na ${pr.name}.`);
 }));
 socket.on('unmortgage',({propertyId}={})=>act(socket,'unmortgage',(room,p,g)=>{
  if(g.currentPlayerId!==p.id||!['turn','debt'].includes(g.phase))throw Error('Hipoteku možeš otplatiti tokom svog poteza ili izmirenja duga.');
  const pr=prop(g,propertyId);if(!pr)throw Error('Nekretnina ne postoji.');const cost=Math.ceil(pr.price*.6);if(pr.owner!==p.id||!pr.mortgaged||p.money<cost)throw Error('Hipoteka se ne može otplatiti.');
  p.money-=cost;pr.mortgaged=false;log(g,`${p.name} otplaćuje hipoteku na ${pr.name}.`);
 }));
 socket.on('debtSell',({propertyId}={})=>act(socket,'debtSell',(room,p,g)=>{
  if(g.phase!=='debt'||g.pending?.playerId!==p.id)throw Error('Nema aktivnog duga.');
  const pr=prop(g,propertyId);if(!pr||pr.owner!==p.id)throw Error('Nekretnina nije tvoja.');
  const proceeds=(pr.mortgaged?0:Math.floor(pr.price/2))+pr.houses*75+(pr.hotel?300:0);
  pr.owner=null;pr.color=null;pr.houses=0;pr.hotel=false;pr.mortgaged=false;
  applyDebtProceeds(room,p,proceeds);
  log(g,`${p.name} prodaje ${pr.name} banci za ${proceeds} KM radi otplate duga.`);
 }));
 socket.on('cardChoice',({choiceId,color}={})=>act(socket,'cardChoice',(room,p,g)=>{
  const q=g.pending;if(g.phase!=='cardChoice'||q?.playerId!==p.id)throw Error('Nema aktivnog izbora.');
  if(q.type==='giftOne'){const x=getPlayer(room,choiceId);if(!x||x.id===p.id)throw Error('Izaberi drugog igrača.');charge(room,x,q.amount,p);}
  if(q.type==='freeColor'){const pr=prop(g,choiceId);if(!pr||pr.owner!==p.id||!canColor(g,color)||color===pr.color)throw Error('Izbor boje nije validan.');pr.color=color;}
  if(q.type==='freeHouse'){const pr=prop(g,choiceId);if(!pr||pr.owner!==p.id||pr.houses>=4||pr.hotel||pr.lastHouseRound===g.round)throw Error('Izbor nekretnine nije validan ili je već nadograđena u ovom krugu.');pr.houses++;pr.lastHouseRound=g.round;}
  g.phase='turn';g.pending=null;if(p.extraRoll)p.hasRolled=false;
 }));
 socket.on('tradeOffer',({toId,propertyIds=[],cash=0,requestPropertyIds=[],requestCash=0}={})=>act(socket,'tradeOffer',(room,p,g)=>{
  if(g.currentPlayerId!==p.id||g.phase!=='turn'||p.inJail)throw Error('Razmjenu možeš ponuditi samo tokom svog poteza izvan zatvora.');
  const to=getPlayer(room,toId);if(!to||to.id===p.id||to.bankrupt)throw Error('Neispravan igrač.');
  cash=Math.floor(+cash);requestCash=Math.floor(+requestCash);
  if(!Number.isFinite(cash)||!Number.isFinite(requestCash)||(!propertyIds.length&&!requestPropertyIds.length&&!cash&&!requestCash))throw Error('Ponuda razmjene nije validna.');
  if(cash<0||requestCash<0||cash>p.money||requestCash>to.money)throw Error('Neispravan iznos novca.');
  if(!Array.isArray(propertyIds)||!Array.isArray(requestPropertyIds)||new Set(propertyIds).size!==propertyIds.length||new Set(requestPropertyIds).size!==requestPropertyIds.length||propertyIds.some(id=>prop(g,id)?.owner!==p.id)||requestPropertyIds.some(id=>prop(g,id)?.owner!==to.id))throw Error('Ponuda sadrži nekretninu koja nije u vlasništvu odgovarajućeg igrača.');
  g.trade={from:p.id,to:to.id,propertyIds,requestPropertyIds,cash,requestCash};g.phase='trade';log(g,`${p.name} šalje ponudu za razmjenu igraču ${to.name}.`);
 }));
 socket.on('tradeRespond',accept=>act(socket,'tradeRespond',(room,p,g)=>{
  const t=g.trade;if(g.phase!=='trade'||!t||t.to!==p.id)throw Error('Nema ponude za tebe.');
  if(accept===true){const a=getPlayer(room,t.from);if(a.money<t.cash||p.money<t.requestCash)throw Error('Novac se promijenio; razmjena nije moguća.');
   a.money-=t.cash;p.money+=t.cash;p.money-=t.requestCash;a.money+=t.requestCash;
   for(const id of t.propertyIds){const pr=prop(g,id);pr.owner=p.id;}for(const id of t.requestPropertyIds){const pr=prop(g,id);pr.owner=a.id;}
   log(g,'Razmjena je prihvaćena.');}else log(g,'Ponuda za razmjenu je odbijena.');
  g.trade=null;g.phase='turn';const turnPlayer=getPlayer(room,g.currentPlayerId);if(turnPlayer?.extraRoll)turnPlayer.hasRolled=false;
 }));
 socket.on('nafakaChoice',({propertyId,color}={})=>socket.emit('errorMessage','Izbor kartice se obavlja kroz aktivni izbor kartice.'));
 socket.on('pause',()=>{const room=rooms.get(socketRoom.get(socket.id));if(room&&room.hostId===socket.data.playerId&&room.game&&!room.game.ended){room.game.paused=!room.game.paused;room.game.turnDeadline=Date.now()+60000;log(room.game,room.game.paused?'Domaćin je pauzirao igru.':'Domaćin je nastavio igru.');emitRoom(room);}});
 socket.on('disconnect',()=>{const code=socketRoom.get(socket.id);socketRoom.delete(socket.id);if(!code)return;const room=rooms.get(code);if(!room)return;const id=socket.data.playerId;const p=getPlayer(room,id);if(p&&p.socketId===socket.id){p.disconnected=true;p.socketId=null;log(room.game||{log:[]},`${p.name} je izgubio vezu.`);emitRoom(room);}});
});
setInterval(()=>{
 for(const room of rooms.values()){
  const g=room.game;if(!g||g.ended||g.paused||!g.turnDeadline||Date.now()<g.turnDeadline)continue;
  const p=getPlayer(room,g.currentPlayerId);if(!p)continue;
  log(g,`${p.name} nije završio potez u roku od 60 sekundi. Potez se automatski završava.`);
  if(g.phase==='debt'&&g.pending?.playerId===p.id){
   p.bankrupt=true;p.debtRemaining=0;
   for(const asset of owned(g,p.id)){asset.owner=null;asset.color=null;asset.houses=0;asset.hotel=false;asset.mortgaged=false;}
   log(g,`${p.name} je bankrotirao jer nije izmirio dug na vrijeme.`);
  }
  g.phase='turn';g.pending=null;g.auction=null;g.trade=null;p.hasRolled=true;p.extraRoll=false;
  endTurn(room,p);
 }
},1000).unref();
if(require.main===module){server.listen(PORT,'0.0.0.0',()=>console.log(`Bosanska Mahala running on ${PORT}`));}
module.exports={app,server,io,__test:{board,properties,COLORS,rooms,startGame,rentFor,score,netWorth,applyRoundEnd,finishGame,movePlayer,resolveLanding,charge,debtCheck,applyDebtProceeds,publicState,drawCard,nafakaDeck,rizikDeck,canColor,completeColor,completeCategory,colorCounts}};
