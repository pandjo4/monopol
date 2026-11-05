
const socket=io();
const $=id=>document.getElementById(id);
let state=null,myId=null,myToken=null,roomCode=null,muted=false,selectedProperty=null,toastTimer;
const COLORS=['crvena','plava','žuta','zelena','ljubičasta','narandžasta','roza','tirkizna'];
const HEX={'crvena':'#d84e55','plava':'#4d83d5','žuta':'#e8bd4b','zelena':'#56a879','ljubičasta':'#9270c9','narandžasta':'#dc8745','roza':'#d77eae','tirkizna':'#48aaa9'};
const CAT={'smještaj':'⌂','trgovina':'✦','transport':'➤','infrastruktura':'⚡'};
const DICE=['⚀','⚁','⚂','⚃','⚄','⚅'];
const BIRD_FILES={'🐦':'sparrow','🦉':'owl','🦜':'parrot','🐧':'penguin','🦆':'duck','🦅':'eagle'};
function birdMarkup(icon,cls='bird-token'){const file=BIRD_FILES[icon]||'sparrow';return `<img class="${cls}" src="/assets/tokens/${file}.png" alt="" onerror="this.outerHTML='${icon||'🐦'}'">`;}
function showScreen(id){document.querySelectorAll('.screen').forEach(x=>x.classList.remove('active'));$(id).classList.add('active');}
function toast(msg){const t=$('toast');t.textContent=msg;t.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>t.classList.remove('show'),2800);}
function me(){return state?.players.find(p=>p.id===myId)}
function current(){return state?.players.find(p=>p.id===state.game?.currentPlayerId)}
function emit(action,data){socket.emit(action,data||{});}
function sfx(kind='tap'){if(muted)return;try{const ctx=new (window.AudioContext||window.webkitAudioContext)(),now=ctx.currentTime;const tones=kind==='dice'?[180,240,150,320,210]:kind==='move'?[420,560]:kind==='buy'?[520,660,820]:[360];tones.forEach((f,i)=>{const o=ctx.createOscillator(),g=ctx.createGain();o.type=kind==='dice'?'triangle':'sine';o.frequency.value=f;g.gain.setValueAtTime(.0001,now+i*.075);g.gain.exponentialRampToValueAtTime(kind==='dice'?.09:.045,now+i*.075+.015);g.gain.exponentialRampToValueAtTime(.0001,now+i*.075+.11);o.connect(g);g.connect(ctx.destination);o.start(now+i*.075);o.stop(now+i*.075+.12);});}catch(e){}}
function esc(s){return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function create(){const name=$('playerName').value.trim()||'Igrač';emit('createRoom',{name,maxRounds:+$('roundSelect')?.value||30});}
$('createBtn').onclick=()=>create();
$('showJoinBtn').onclick=()=>$('joinForm').classList.toggle('hidden');
$('joinBtn').onclick=()=>{const name=$('playerName').value.trim()||'Igrač',code=$('roomCode').value.trim().toUpperCase();if(code.length<4)return toast('Unesi ispravan kod sobe.');emit('joinRoom',{name,code});};
$('roomCode').addEventListener('keydown',e=>{if(e.key==='Enter')$('joinBtn').click()});
$('copyCode').onclick=()=>{navigator.clipboard?.writeText(roomCode||'');toast('Kod sobe je kopiran.');};
$('startBtn').onclick=()=>emit('startGame');
$('roundSelect').onchange=e=>emit('setRounds',+e.target.value);
$('leaveBtn').onclick=()=>{emit('leaveRoom');sessionStorage.removeItem('bm_token');sessionStorage.removeItem('bm_code');myId=null;myToken=null;roomCode=null;showScreen('home');state=null;};
socket.on('joined',d=>{myId=d.playerId;myToken=d.token;roomCode=d.code;sessionStorage.setItem('bm_token',myToken);sessionStorage.setItem('bm_code',roomCode);});
socket.on('connect',()=>{const token=sessionStorage.getItem('bm_token'),code=sessionStorage.getItem('bm_code');if(token&&code)emit('joinRoom',{code,token,name:$('playerName')?.value||'Igrač'});});
socket.on('state',s=>{const oldMe=state?.players?.find(p=>p.id===myId);const newMe=s.players?.find(p=>p.id===myId);const oldLog=state?.game?.log?.at(-1);const newLog=s.game?.log?.at(-1);if(newLog&&newLog.id!==oldLog?.id){if(/baca/.test(newLog.text))sfx('dice');else if(/kupuje|pobjeđuje aukciju/.test(newLog.text))sfx('buy');else if(/gradi|dobija|plaća/.test(newLog.text))sfx('tap');}if(oldMe&&newMe&&oldMe.position!==newMe.position)sfx('move');state=s;roomCode=s.code;if(!s.game){showScreen('lobby');renderLobby();}else{showScreen('game');renderGame();}});
socket.on('errorMessage',m=>toast(m));
function renderLobby(){
 $('lobbyCode').textContent=state.code;$('playerCount').textContent=`${state.players.length} / 6 igrača`;
 $('lobbyPlayers').innerHTML=state.players.map((p,i)=>`<div class="lobby-player"><div class="avatar" style="background:${p.colorToken}">${birdMarkup(p.tokenIcon||'🐦','lobby-bird')}</div><div><b>${esc(p.name)}</b><small>${p.id===state.hostId?'✦ Domaćin':'Igrač'}</small></div>${p.id===state.hostId?'<span style="margin-left:auto;color:#c49c51">♛</span>':state.hostId===myId?`<button class="text-btn kick-player" data-id="${p.id}" style="margin-left:auto;padding:4px">Izbaci</button>`:''}</div>`).join('');
 $('lobbyPlayers').querySelectorAll('.kick-player').forEach(b=>b.onclick=()=>emit('kick',b.dataset.id));
 const birds=['🐦','🦉','🦜','🐧','🦆','🦅'];
 $('tokenChoices').innerHTML=birds.map(icon=>{const taken=state.players.some(x=>x.id!==myId&&x.tokenIcon===icon);return `<button class="token-choice ${me()?.tokenIcon===icon?'selected':''}" data-token="${icon}" ${taken?'disabled':''} title="${taken?'Zauzeto':'Izaberi figuricu'}">${birdMarkup(icon,"choice-bird")}</button>`}).join('');
 $('tokenChoices').querySelectorAll('.token-choice').forEach(b=>b.onclick=()=>emit('chooseToken',b.dataset.token));

 $('startBtn').disabled=state.hostId!==myId||state.players.length<2;$('startBtn').textContent=state.hostId===myId?'Započni partiju':'Čekamo domaćina…';
 $('lobbyHint').textContent=state.hostId===myId?(state.players.length<2?'Pozovi barem još jednog igrača.':'Svi su spremni? Započni partiju.'):'Samo domaćin može pokrenuti igru.';
 $('roundSelect').value=state.maxRounds||30;
}
function coord(i){if(i<10)return [0,i];if(i<20)return [i-10,10];if(i<30)return [10,29-i];return [39-i,0];}
function renderBoard(){
 const board=$('board');const oldRects=new Map([...board.querySelectorAll('.token-bird[data-player]')].map(el=>[el.dataset.player,el.getBoundingClientRect()]));board.querySelectorAll('.board-cell').forEach(x=>x.remove());
 state.game.board.forEach((s,i)=>{
  const [r,c]=coord(i),cell=document.createElement('button');cell.className=`board-cell ${s.type}`;cell.style.gridRow=r+1;cell.style.gridColumn=c+1;cell.dataset.index=i;
  const pr=s.propertyId?state.game.properties.find(p=>p.id===s.propertyId):null;
  if(pr){cell.innerHTML=`<img class="tile-art" src="/assets/cards/${pr.id}.png" alt="" onerror="this.remove()"><div class="cell-band" style="background:${pr.color?HEX[pr.color]:'#e5e0d5'}"></div><div class="cell-icon">${CAT[pr.category]||'⌂'}</div><div class="cell-name">${esc(pr.name)}</div><div class="cell-price">${pr.price} KM</div>${pr.owner?`<i class="owner-dot" style="background:${state.players.find(p=>p.id===pr.owner)?.colorToken||'#333'}"></i>`:''}<div class="tokens">${state.players.filter(p=>p.position===i&&!p.bankrupt).map(p=>`<i class="token-bird" data-player="${p.id}" title="${esc(p.name)}">${birdMarkup(p.tokenIcon||'🐦')}</i>`).join('')}</div>`;
  }else{const icon=s.kind==='start'?'➜':s.kind==='jail'?'▥':s.kind==='parking'?'✧':s.kind==='taxi'?'🚕':s.kind==='jailvisit'?'⚖':'◆';cell.innerHTML=`<div class="cell-icon">${icon}</div><div class="cell-name">${esc(s.name)}</div>${s.kind==='taxi'?'<div class="cell-price">2–7.5k KM</div>':''}<div class="tokens">${state.players.filter(p=>p.position===i&&!p.bankrupt).map(p=>`<i class="token-bird" data-player="${p.id}" title="${esc(p.name)}">${birdMarkup(p.tokenIcon||'🐦')}</i>`).join('')}</div>`;}
  cell.onclick=()=>{if(pr)showProperty(pr.id);else showBoardSpace(s);};board.appendChild(cell);
 });
 board.querySelectorAll('.token-bird[data-player]').forEach(el=>{const old=oldRects.get(el.dataset.player);if(!old)return;const now=el.getBoundingClientRect(),dx=old.left-now.left,dy=old.top-now.top;if(Math.abs(dx)+Math.abs(dy)<2)return;el.style.transition='none';el.style.transform=`translate(${dx}px,${dy}px)`;requestAnimationFrame(()=>{el.style.transition='transform .48s cubic-bezier(.2,.8,.2,1)';el.style.transform='translate(0,0)';});});
}
function renderPlayers(){
 $('activeCount').textContent=state.players.filter(p=>!p.bankrupt).length;
 $('playerCards').innerHTML=state.players.map(p=>`<div class="player-card ${p.id===state.game.currentPlayerId?'active-turn':''}"><div class="avatar" style="background:${p.colorToken}">${birdMarkup(p.tokenIcon||'🐦','lobby-bird')}</div><div><b>${esc(p.name)}</b><small>${p.inJail?'U zatvoru':`${p.position+1}. polje`}</small></div><strong>${p.money} KM</strong></div>`).join('');
 const p=me();if(p)$('myStats').innerHTML=`Novac <b>${p.money} KM</b><br>Imovina <b>${state.game.properties.filter(x=>x.owner===myId).length}</b><br>Bodovi <b>${state.game.scoreboard.find(x=>x.id===myId)?.score||0}</b><br>Status <b>${p.inJail?'Zatvor':'Aktivan'}</b>`;
 $('colorLegend').innerHTML=COLORS.map(c=>{const n=state.game.properties.filter(p=>p.color===c).length;return `<div class="color-item"><i class="color-dot" style="background:${HEX[c]}"></i>${c} <b>${n}/3</b></div>`}).join('');
}
function renderGame(){
 const g=state.game,p=me(),turn=current();$('roundLabel').textContent=`KRUG ${g.round} / ${g.maxRounds}`;$('turnLabel').textContent=`Na potezu: ${turn?.name||'—'}`;
 $('centerRound').textContent=`KRUG ${g.round} OD ${g.maxRounds}`;$('turnTimer').textContent=`${Math.max(0,Math.ceil(((g.turnDeadline||Date.now()+60000)-Date.now())/1000))}s`;$('centerTurn').textContent=g.paused?'IGRA JE PAUZIRANA':turn?`NA POTEZU: ${turn.name.toUpperCase()}`:'Partija završena';
 $('turnPlayerName').textContent=turn?.name||'—';$('turnPlayerMoney').textContent=`${turn?.money??0} KM`;const dice=g.lastRoll;
 $('dieA').textContent=dice?DICE[dice.a-1]:'⚀';$('dieB').textContent=dice?DICE[dice.b-1]:'⚀';$('diceDisplay').innerHTML=dice?`<span>${DICE[dice.a-1]}</span><span>${DICE[dice.b-1]}</span>`:'<span>⚀</span><span>⚀</span>';
 $('lastAction').textContent=g.log.at(-1)?.text||'Sretno u igri!';const isTurn=turn?.id===myId;
 $('rollBtn').disabled=!isTurn||g.paused||g.phase!=='turn'||p?.hasRolled;$('endBtn').disabled=!isTurn||g.paused||!p?.hasRolled||p?.extraRoll||['buy','taxi','auction','auctionColor','debt','cardChoice','trade'].includes(g.phase);
 $('rollBtn').textContent=p?.inJail?'Pokušaj izlazak':'Baci kockice';$('endBtn').textContent='Završi potez';$('pauseBtn').textContent=g.paused?'▶':'Ⅱ';$('pauseBtn').title=g.paused?'Nastavi igru':'Pauziraj igru';$('pauseBtn').style.display=state.hostId===myId?'':'none';$('pauseBtn').disabled=g.ended;
 $('rollBtnMobile').disabled=$('rollBtn').disabled;$('endBtnMobile').disabled=$('endBtn').disabled;
 renderBoard();renderPlayers();renderAction();
 $('activityLog').innerHTML=[...g.log].reverse().slice(0,12).map(x=>`<div class="activity-item">${esc(x.text)}</div>`).join('');
 $('scoreList').innerHTML=g.scoreboard.map((x,i)=>`<div class="score-row"><span>${i+1}. ${esc(x.name)}</span><b>${x.score} bod.</b></div>`).join('');
 if(g.ended)showFinal();
}
$('rollBtn').onclick=$('rollBtnMobile').onclick=()=>emit('roll');
$('endBtn').onclick=$('endBtnMobile').onclick=()=>emit('endTurn');
$('pauseBtn').onclick=()=>emit('pause');
function renderAction(){
 const box=$('actionPanel'),g=state.game,p=me();let html='<div class="panel-title">TVOJE AKCIJE</div>';
 if(g.phase==='buy'&&g.pending?.playerId===myId){const pr=g.properties.find(x=>x.id===g.pending.propertyId);html+=`<b>${esc(pr.name)}</b><p class="muted">Cijena ${pr.price} KM · Izaberi boju za kupovinu.</p>${colorButtons('buy') }<button class="btn ghost wide" id="declineBuy">Preskoči kupovinu · aukcija</button>`;}
 else if(g.phase==='taxi'&&g.pending?.playerId===myId){html+='<b>Taxi stanica</b><p class="muted">Vožnja je skupa. Odaberi udaljenost.</p>';[[1,2000],[2,4500],[3,7500]].forEach(([n,c])=>html+=`<button class="btn ghost wide taxi-choice" data-steps="${n}">${n} polje · ${c} KM</button>`);html+='<button class="btn ghost wide" id="skipTaxi">Odbij vožnju</button>';}
 else if(g.phase==='auction'){const a=g.auction;html+='<b>Aukcija nekretnine</b><p class="muted">Licitirajte redom. Ponuda 0 znači preskoči.</p>';if(a){const id=a.order[a.turnIndex];html+=`<p>${id===myId?'Tvoj red za ponudu':`Na redu: ${esc(state.players.find(x=>x.id===id)?.name||'igrač')}`}</p><input id="bidAmount" type="number" min="0" placeholder="Iznos ponude"><button class="btn primary wide" id="bidBtn" ${id!==myId?'disabled':''}>Pošalji ponudu</button>`;}}
 else if(g.phase==='auctionColor'&&g.pending?.playerId===myId){html+='<b>Osvojio si aukciju!</b><p class="muted">Izaberi boju za nekretninu.</p>'+colorButtons('auctionColor');}
 else if(g.phase==='cardChoice'&&g.pending?.playerId===myId){const q=g.pending;html+='<b>Izaberi bonus</b>';(q.choices||[]).forEach(x=>html+=`<button class="btn ghost wide card-choice" data-id="${x.id}">${esc(x.name)}</button>`);if(q.type==='freeColor')html+=colorButtons('freeCard');}
 else if(g.phase==='debt'&&g.pending?.playerId===myId){html+='<b>Izmirenje duga</b><p class="muted">Prodaj nekretninu banci za polovinu cijene i vrijednost gradnje.</p>';g.pending.choices.forEach(x=>html+=`<button class="btn ghost wide debt-sell" data-id="${x.id}">Prodaj ${esc(x.name)}</button>`);}
 else if(g.phase==='trade'&&g.trade?.to===myId){const from=state.players.find(x=>x.id===g.trade.from);html+=`<b>Ponuda od ${esc(from.name)}</b><p class="muted">Prihvati ili odbij razmjenu.</p><button class="btn primary wide" id="tradeYes">Prihvati</button><button class="btn ghost wide" id="tradeNo">Odbij</button>`;}
 else{html+='<p class="muted">Baci kockice kada dođeš na red. Klikni na bilo koju nekretninu na tabli za detalje.</p>';if(p?.inJail)html+='<button class="btn primary wide" id="jailBail">Plati kauciju · 100 KM</button>';if(p&&g.currentPlayerId===myId&&!p.inJail&&g.phase==='turn')html+='<button class="btn ghost wide" id="tradeOpen">Ponudi razmjenu</button>';if(p){const own=g.properties.filter(x=>x.owner===myId);if(own.length){html+='<hr><b style="font-size:11px">Upravljanje imovinom</b>';own.slice(0,5).forEach(x=>html+=`<button class="btn ghost wide property-manage" data-id="${x.id}">${esc(x.name)} · ${x.houses} kuć. ${x.hotel?'· Hotel':''}</button>`);}}}
 box.innerHTML=html;
 const byId=id=>$(id);
 byId('declineBuy')?.addEventListener('click',()=>emit('declineBuy'));
 byId('jailBail')?.addEventListener('click',()=>emit('jailBail'));
 byId('tradeOpen')?.addEventListener('click',showTradeForm);
 byId('skipTaxi')?.addEventListener('click',()=>emit('skipTaxi'));
 byId('bidBtn')?.addEventListener('click',()=>emit('bid',+$('bidAmount').value||0));
 byId('tradeYes')?.addEventListener('click',()=>emit('tradeRespond',true));byId('tradeNo')?.addEventListener('click',()=>emit('tradeRespond',false));
 box.querySelectorAll('.color-choice').forEach(b=>b.onclick=()=>{const color=b.dataset.color;if(b.dataset.mode==='buy')emit('buy',{color});else if(b.dataset.mode==='auctionColor')emit('auctionColor',{color});else{const id=g.pending?.choices?.[0]?.id;toast('Odaberi nekretninu pa boju kroz karticu.');}});
 box.querySelectorAll('.taxi-choice').forEach(b=>b.onclick=()=>emit('taxi',{steps:+b.dataset.steps}));
 box.querySelectorAll('.card-choice').forEach(b=>b.onclick=()=>emit('cardChoice',{choiceId:b.dataset.id}));
 box.querySelectorAll('.debt-sell').forEach(b=>b.onclick=()=>emit('debtSell',{propertyId:b.dataset.id}));
 box.querySelectorAll('.property-manage').forEach(b=>b.onclick=()=>showProperty(b.dataset.id));
}
function showTradeForm(){
 const targets=state.players.filter(p=>p.id!==myId&&!p.bankrupt);
 if(!targets.length)return toast('Nema drugog aktivnog igrača za razmjenu.');
 const own=state.game.properties.filter(p=>p.owner===myId);
 const render=()=>{
  const targetId=$('tradeTarget').value;
  const other=state.game.properties.filter(p=>p.owner===targetId);
  $('tradeGiveProps').innerHTML=own.length?own.map(p=>`<label class="trade-check"><input type="checkbox" value="${p.id}" class="trade-give"> ${esc(p.name)}</label>`).join(''):'<small>Nemaš nekretnina za ponuditi.</small>';
  $('tradeWantProps').innerHTML=other.length?other.map(p=>`<label class="trade-check"><input type="checkbox" value="${p.id}" class="trade-want"> ${esc(p.name)}</label>`).join(''):'<small>Ovaj igrač nema nekretnina.</small>';
 };
 $('modalContent').innerHTML=`<h3>Ponudi razmjenu</h3><label>Trguješ sa<select id="tradeTarget">${targets.map(p=>`<option value="${p.id}">${esc(p.name)}</option>`).join('')}</select></label><div class="trade-form-grid"><div><b>Nudiš nekretnine</b><div id="tradeGiveProps" class="trade-props"></div></div><div><b>Tražiš nekretnine</b><div id="tradeWantProps" class="trade-props"></div></div></div><label>Novac koji ti nudiš (KM)<input id="tradeCash" type="number" min="0" step="1" value="0"></label><label>Novac koji tražiš (KM)<input id="tradeRequestCash" type="number" min="0" step="1" value="0"></label><button class="btn primary wide" id="sendTrade">Pošalji ponudu</button>`;
 $('modal').classList.remove('hidden');$('tradeTarget').onchange=render;render();
 $('sendTrade').onclick=()=>{
  const toId=$('tradeTarget').value;
  const propertyIds=[...$('tradeGiveProps').querySelectorAll('.trade-give:checked')].map(x=>x.value);
  const requestPropertyIds=[...$('tradeWantProps').querySelectorAll('.trade-want:checked')].map(x=>x.value);
  const cash=Math.floor(Number($('tradeCash').value)||0),requestCash=Math.floor(Number($('tradeRequestCash').value)||0);
  emit('tradeOffer',{toId,propertyIds,requestPropertyIds,cash,requestCash});$('modal').classList.add('hidden');
 };
}
function colorButtons(mode){return `<div class="modal-grid">${COLORS.map(c=>{const n=state.game.properties.filter(p=>p.color===c).length;return `<button class="color-choice" data-mode="${mode}" data-color="${c}" ${n>=3?'disabled':''}><i style="background:${HEX[c]}"></i>${c} <small>${n}/3</small></button>`}).join('')}</div>`;}
function showProperty(id){
 const pr=state.game.properties.find(x=>x.id===id);if(!pr)return;const owner=state.players.find(x=>x.id===pr.owner);const mine=pr.owner===myId;const count=state.game.properties.filter(x=>x.color===pr.color&&x.owner===pr.owner).length;
 let html=`<div class="property-card-art"><img src="/assets/cards/${pr.id}.png" alt="" onerror="this.style.display='none';this.nextElementSibling.style.display='grid'"><span style="display:none">${CAT[pr.category]||'🏡'}</span></div><h3>${esc(pr.name)}</h3><p>${CAT[pr.category]} ${esc(pr.category)} · ${pr.color?`<b style="color:${HEX[pr.color]}">${pr.color}</b>`:'Bez boje'}</p><div class="modal-grid"><div><small>Vlasnik:</small><b>${owner?esc(owner.name):'Slobodna'}</b></div><div><small>Kupovna cijena</small><b>${pr.price} KM</b></div><div><small>Osnovna renta</small><b>${pr.baseRent} KM</b></div><div><small>Izgradnja kućice</small><b>${pr.houseCost} KM</b></div><div><small>Hotel</small><b>${pr.hotelCost} KM</b></div><div><small>Izgrađeno</small><b>${pr.hotel?'Hotel':pr.houses+' kućica'}</b></div></div><p>Renta bez bonusa: ${pr.rents[pr.hotel?5:pr.houses]} KM. Bonus boje: ${mine&&count===3?'×2':'—'}. Bonus kategorije: ${mine&&state.game.properties.filter(x=>x.category===pr.category&&x.owner===myId).length===5?'×2':'—'}.</p>`;
 if(mine){html+=`<hr><b>Upravljanje nekretninom</b><div class="modal-grid"><button class="btn ghost" id="changeColor">Promijeni boju</button><button class="btn ghost" id="mortgage">${pr.mortgaged?'Otplati hipoteku':'Stavi hipoteku'}</button><button class="btn ghost" id="house" ${pr.hotel||pr.houses>=4||pr.mortgaged||pr.lastHouseRound===state.game.round?'disabled':''}>Izgradi kućicu</button><button class="btn ghost" id="hotel" ${pr.houses!==4||pr.hotel||pr.lastHouseRound===state.game.round||me().position!==state.game.board.findIndex(s=>s.propertyId===id)?'disabled':''}>Izgradi hotel</button></div>`;}
 $('modalContent').innerHTML=html;$('modal').classList.remove('hidden');
 $('changeColor')?.addEventListener('click',()=>{const colors=COLORS.map(c=>`<button class="color-choice" data-color="${c}" ${state.game.properties.filter(x=>x.color===c).length>=3?'disabled':''}><i style="background:${HEX[c]}"></i>${c}</button>`).join('');$('modalContent').innerHTML=`<h3>Promjena boje</h3><p>Trošak: ${pr.price} KM. Jedna promjena po krugu.</p><div class="modal-grid">${colors}</div>`;$('modalContent').querySelectorAll('[data-color]').forEach(b=>b.onclick=()=>{emit('changeColor',{propertyId:id,color:b.dataset.color});$('modal').classList.add('hidden');});});
 $('mortgage')?.addEventListener('click',()=>{emit(pr.mortgaged?'unmortgage':'mortgage',{propertyId:id});$('modal').classList.add('hidden');});
 $('house')?.addEventListener('click',()=>{emit('buildHouse',{propertyId:id});$('modal').classList.add('hidden');});
 $('hotel')?.addEventListener('click',()=>{emit('buildHotel',{propertyId:id});$('modal').classList.add('hidden');});
}
$('modalClose').onclick=()=>$('modal').classList.add('hidden');$('modal').onclick=e=>{if(e.target===$('modal'))$('modal').classList.add('hidden')};
$('rulesBtn').onclick=()=>{$('modalContent').innerHTML=`<h3>Pravila mahale</h3><p><b>Cilj:</b> Nakon 20, 30, 40 ili 50 krugova pobjeđuje igrač s najvećim neto bogatstvom.</p><ul><li>Svaki igrač ima najviše 60 sekundi po potezu.</li><li>Svaki igrač počinje sa 2.500 KM. Prolazak kroz START donosi 200 KM.</li><li>Kupovina nekretnine: 200–300 KM. Kupac bira boju. U cijeloj partiji postoje najviše 3 nekretnine iste boje.</li><li>Svaki igrač jednom po krugu može promijeniti boju svoje nekretnine uz plaćanje njene kupovne cijene.</li><li>Tri iste boje ili svih pet nekretnina iste kategorije udvostručuju rentu. Ako vrijede oba bonusa, renta je ×4.</li><li>Na svakoj nekretnini možeš napraviti najviše jednu nadogradnju po krugu; hotel zahtijeva 4 kućice i da igrač stane na tu nekretninu.</li><li>Nakon 3. kruga isplaćuje se bonus od 200 KM za svaku nekretninu ispod pet. Od 4. kruga najniži bodovni rezultat izvlači Nafaku, a najviši Rizik.</li><li>Taxi: 1 polje 2.000 KM, 2 polja 4.500 KM, 3 polja 7.500 KM.</li><li>U zatvoru igrač ne naplaćuje rentu. Može izaći duplim kockicama ili nakon trećeg pokušaja.</li></ul><p><b>Tabla:</b> 40 polja ukupno — 20 nekretnina, 4 taxi polja, 4 ugla i 12 gradskih/specijalnih polja.</p>`;$('modal').classList.remove('hidden');};
$('soundBtn').onclick=()=>{muted=!muted;$('soundBtn').textContent=muted?'♫̸':'♫';if(!muted)sfx('tap');toast(muted?'Zvuk isključen.':'Zvuk uključen.');};
function showFinal(){const ranking=state.game.finalRanking||[];$('modalContent').innerHTML=`<h3>Partija je završena</h3><p>Pobjednik: <b>${esc(ranking[0]?.name||'—')}</b></p>${ranking.map((x,i)=>`<div class="score-row"><span>${i+1}. ${esc(x.name)}</span><b>${x.netWorth} KM</b></div>`).join('')}<p>Osvježi stranicu za novu sobu.</p>`;$('modal').classList.remove('hidden');}

setInterval(()=>{if(!state?.game||state.game.ended)return;const left=Math.max(0,Math.ceil(((state.game.turnDeadline||Date.now()+60000)-Date.now())/1000));const el=$('turnTimer');if(el)el.textContent=`${left}s`;},250);

function showBoardSpace(space){
 const icon=space.kind==='taxi'?'🚕':space.kind==='jail'?'🔒':space.kind==='jailvisit'?'⚖️':space.kind==='parking'?'🅿️':space.kind==='start'?'🏁':'🏛️';
 const details={taxi:'Platiš vožnju i pomjeraš se unaprijed za odabrani broj polja.',opcina:'Gradska služba mahale.',pijaca:'Pijaca je jedno od gradskih polja.',bank:'Gradska banka obračunava bonus ili uplatu.',tax:'Polje na kojem se plaća gradski porez.',health:'Dom zdravlja – posebno gradsko polje.',free:'Odmor na gradskom trgu.',bonus:'Izvlačiš karticu Nafaka ili Rizik.',jail:'Ovdje završavaš u zatvoru.',jailvisit:'Samo si u posjeti zatvoru.',parking:'Besplatni parking.',start:'Prolaskom kroz START dobijaš 200 KM.'};
 $('modalContent').innerHTML=`<div class="property-card-art"><img src="/assets/cards/${space.kind}.png" alt="" onerror="this.style.display='none';this.nextElementSibling.style.display='grid'"><span style="display:none">${icon}</span></div><h3>${esc(space.name)}</h3><p>${details[space.kind]||'Posebno polje na tabli Bosanske Mahale.'}</p>`;
 $('modal').classList.remove('hidden');
}
