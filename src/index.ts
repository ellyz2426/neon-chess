import {
	World, createSystem, PanelUI, PanelDocument, UIKitDocument, UIKit, eq,
	Mesh, Group, BoxGeometry, SphereGeometry, CylinderGeometry, ConeGeometry,
	TorusGeometry, MeshStandardMaterial, MeshBasicMaterial, LineBasicMaterial,
	Color, Vector3, Vector2, Quaternion, Fog, AmbientLight, PointLight, DirectionalLight,
	BufferGeometry, Float32BufferAttribute, EdgesGeometry, LineSegments, AdditiveBlending,
	Raycaster, PlaneGeometry, InputComponent, Follower, ScreenSpace,
} from '@iwsdk/core';

interface RuntimeInput {
  keyboard?: { getKeyDown(key: string): boolean; getKeyPressed(key: string): boolean; };
  xr?: { gamepads?: { right?: { getButtonDown(id: string): boolean; getButtonPressed(id: string): boolean; getAxesValues(id: string): { x: number; y: number } | undefined; }; left?: any; }; };
}

// ─── CONSTANTS ────────────────────────────────────────────────────────
const E=0, WP=1,WN=2,WB=3,WR=4,WQ=5,WK=6, BP=7,BN=8,BB=9,BR=10,BQ=11,BK=12;
const PIECE_NAMES=['','P','N','B','R','Q','K','p','n','b','r','q','k'];
const PIECE_FULL=['','Pawn','Knight','Bishop','Rook','Queen','King','Pawn','Knight','Bishop','Rook','Queen','King'];
const FILES='abcdefgh';
const isWhite=(p:number)=>p>=1&&p<=6;
const isBlack=(p:number)=>p>=7&&p<=12;
const pieceColor=(p:number)=>p===0?'':isWhite(p)?'w':'b';
const pieceType=(p:number)=>p===0?0:((p-1)%6)+1;
const CELL_SIZE=0.24;
const BOARD_Y=0.9;
const BOARD_OFFSET_X=-CELL_SIZE*3.5;
const BOARD_OFFSET_Z=-CELL_SIZE*3.5;

// ─── THEMES ──────────────────────────────────────────────────────────
interface Theme { name:string; light:string; dark:string; accent:string; bg:string; gridC:string; fogC:string; wPiece:string; bPiece:string; glow:string; sel:string; move:string; }
const THEMES:Theme[]=[
	{name:'Neon Holodeck',light:'#1a3a4a',dark:'#0a1520',accent:'#00e5ff',bg:'#000811',gridC:'#00e5ff',fogC:'#000811',wPiece:'#00e5ff',bPiece:'#ff6e40',glow:'#00e5ff',sel:'#ffa726',move:'#4caf50'},
	{name:'Crimson Arena',light:'#3a1a1a',dark:'#200a0a',accent:'#ff1744',bg:'#0a0004',gridC:'#ff1744',fogC:'#0a0004',wPiece:'#ff1744',bPiece:'#ffab40',glow:'#ff1744',sel:'#ffd740',move:'#69f0ae'},
	{name:'Toxic Neon',light:'#1a3a1a',dark:'#0a200a',accent:'#76ff03',bg:'#001100',gridC:'#76ff03',fogC:'#001100',wPiece:'#76ff03',bPiece:'#e040fb',glow:'#76ff03',sel:'#ffa726',move:'#00e5ff'},
	{name:'Ultra Violet',light:'#2a1a3a',dark:'#140a20',accent:'#e040fb',bg:'#08001a',gridC:'#e040fb',fogC:'#08001a',wPiece:'#e040fb',bPiece:'#00e5ff',glow:'#e040fb',sel:'#ffa726',move:'#76ff03'},
	{name:'Solar Blaze',light:'#3a2a1a',dark:'#201408',accent:'#ff9100',bg:'#0a0500',gridC:'#ff9100',fogC:'#0a0500',wPiece:'#ff9100',bPiece:'#40c4ff',glow:'#ff9100',sel:'#ffa726',move:'#4caf50'},
];

// ─── SKINS ──────────────────────────────────────────────────────────
interface Skin { name:string; color:string; unlock:string; check:(s:any)=>boolean; }
const SKINS:Skin[]=[
	{name:'Neon Cyan',color:'#00e5ff',unlock:'Free',check:()=>true},
	{name:'Solar Flare',color:'#ff9800',unlock:'50 wins',check:(s)=>s.wins>=50},
	{name:'Plasma Pink',color:'#e040fb',unlock:'5K score',check:(s)=>s.totalScore>=5000},
	{name:'Frost Mint',color:'#69f0ae',unlock:'10 games',check:(s)=>s.games>=10},
	{name:'Inferno',color:'#f44336',unlock:'5 streak',check:(s)=>s.bestStreak>=5},
	{name:'Void Purple',color:'#b388ff',unlock:'80% win',check:(s)=>s.games>=10&&(s.wins/s.games)>=0.8},
	{name:'Royal Gold',color:'#ffd54f',unlock:'All modes',check:(s)=>s.modesPlayed?.size>=6},
	{name:'Chrome',color:'#ffffff',unlock:'Expert win',check:(s)=>s.expertWins>=1},
];

// ─── ACHIEVEMENTS ────────────────────────────────────────────────────
interface Ach { id:string; name:string; desc:string; check:(s:any)=>boolean; }
const ACHIEVEMENTS:Ach[]=[
	{id:'first_move',name:'First Move',desc:'Make your first move',check:s=>s.totalMoves>=1},
	{id:'first_win',name:'First Win',desc:'Win your first game',check:s=>s.wins>=1},
	{id:'castle',name:'Castle King',desc:'Perform a castling move',check:s=>s.castles>=1},
	{id:'en_passant',name:'En Passant',desc:'Capture en passant',check:s=>s.enPassants>=1},
	{id:'promote',name:'Promote Pawn',desc:'Promote a pawn',check:s=>s.promotions>=1},
	{id:'win10',name:'10 Wins',desc:'Win 10 games',check:s=>s.wins>=10},
	{id:'win50',name:'50 Wins',desc:'Win 50 games',check:s=>s.wins>=50},
	{id:'scholar',name:'Scholar Mate',desc:'Win in 4 moves or less',check:s=>s.scholarMates>=1},
	{id:'queen_sac',name:'Queen Sacrifice',desc:'Win after sacrificing queen',check:s=>s.queenSacWins>=1},
	{id:'fork',name:'Fork Master',desc:'Win 5 games with forks',check:s=>s.wins>=5},
	{id:'capture100',name:'Capture 100',desc:'Capture 100 total pieces',check:s=>s.totalCaptures>=100},
	{id:'win_hard',name:'Win vs Hard',desc:'Beat hard AI',check:s=>s.hardWins>=1},
	{id:'win_expert',name:'Win vs Expert',desc:'Beat expert AI',check:s=>s.expertWins>=1},
	{id:'stalemate',name:'Stalemate Draw',desc:'Draw by stalemate',check:s=>s.stalemates>=1},
	{id:'daily_done',name:'Daily Done',desc:'Complete a daily puzzle',check:s=>s.dailyDone>=1},
	{id:'streak3',name:'3-Day Streak',desc:'3-day daily streak',check:s=>s.dailyStreak>=3},
	{id:'theme_tourist',name:'Theme Tourist',desc:'Play in all themes',check:s=>s.themesUsed?.size>=5},
	{id:'fashionista',name:'Fashionista',desc:'Unlock a skin',check:s=>s.skinsUnlocked>=2},
	{id:'games10',name:'10 Games',desc:'Play 10 games',check:s=>s.games>=10},
	{id:'speed_win',name:'Speed Win',desc:'Win in under 2 minutes',check:s=>s.speedWins>=1},
	{id:'capture5',name:'5-Piece Streak',desc:'Capture 5 in a row',check:s=>s.bestCaptureStreak>=5},
	{id:'no_loss',name:'Flawless 5',desc:'Win 5 without losing',check:s=>s.bestStreak>=5},
	{id:'games50',name:'50 Games',desc:'Play 50 games',check:s=>s.games>=50},
	{id:'games100',name:'100 Games',desc:'Play 100 games',check:s=>s.games>=100},
	{id:'check10',name:'Check 10',desc:'Give 10 checks in one game',check:s=>s.mostChecksInGame>=10},
	{id:'capture_all',name:'Total Wipe',desc:'Capture all opponent pieces',check:s=>s.totalWipes>=1},
	{id:'draw_agree',name:'Draw Master',desc:'Draw 5 games',check:s=>s.draws>=5},
	{id:'blitz_win',name:'Blitz Victor',desc:'Win a blitz game',check:s=>s.blitzWins>=1},
	{id:'timed_win',name:'Timed Victor',desc:'Win a timed game',check:s=>s.timedWins>=1},
	{id:'level10',name:'Level 10',desc:'Reach level 10',check:s=>s.level>=10},
];

// ─── CHESS ENGINE ────────────────────────────────────────────────────
type Board=number[][];
interface CastleRights{K:boolean;Q:boolean;k:boolean;q:boolean;}
interface Move{fr:number;fc:number;tr:number;tc:number;piece:number;captured:number;promotion:number;castle:string;enPassant:boolean;epCapR?:number;epCapC?:number;}
interface GameState{board:Board;turn:'w'|'b';castle:CastleRights;epTarget:[number,number]|null;halfMove:number;fullMove:number;history:Move[];posHistory:string[];}

function initBoard():Board{
	const b:Board=Array.from({length:8},()=>Array(8).fill(E));
	const back=[WR,WN,WB,WQ,WK,WB,WN,WR];
	for(let c=0;c<8;c++){b[7][c]=back[c];b[6][c]=WP;b[1][c]=BP;b[0][c]=back[c]+6;}
	return b;
}
function cloneBoard(b:Board):Board{return b.map(r=>[...r]);}
function boardKey(g:GameState):string{
	let k='';for(let r=0;r<8;r++)for(let c=0;c<8;c++)k+=g.board[r][c].toString(36);
	k+=g.turn;k+=(g.castle.K?'K':'')+(g.castle.Q?'Q':'')+(g.castle.k?'k':'')+(g.castle.q?'q':'');
	if(g.epTarget)k+=g.epTarget[0]+''+g.epTarget[1];
	return k;
}
function findKing(b:Board,color:'w'|'b'):[number,number]{
	const k=color==='w'?WK:BK;
	for(let r=0;r<8;r++)for(let c=0;c<8;c++)if(b[r][c]===k)return[r,c];
	return[-1,-1];
}
function isAttacked(b:Board,r:number,c:number,byColor:'w'|'b'):boolean{
	const own=byColor==='w';
	// pawns
	const pd=own?1:-1;const pr=r+pd;
	if(pr>=0&&pr<8){if(c-1>=0&&b[pr][c-1]===(own?WP:BP))return true;if(c+1<8&&b[pr][c+1]===(own?WP:BP))return true;}
	// knights
	const kn=own?WN:BN;const knM=[[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]];
	for(const[dr,dc]of knM){const nr=r+dr,nc=c+dc;if(nr>=0&&nr<8&&nc>=0&&nc<8&&b[nr][nc]===kn)return true;}
	// king
	const kg=own?WK:BK;
	for(let dr=-1;dr<=1;dr++)for(let dc=-1;dc<=1;dc++){if(dr===0&&dc===0)continue;const nr=r+dr,nc=c+dc;if(nr>=0&&nr<8&&nc>=0&&nc<8&&b[nr][nc]===kg)return true;}
	// rook/queen (straight)
	const rq=own?[WR,WQ]:[BR,BQ];
	for(const[dr,dc]of[[0,1],[0,-1],[1,0],[-1,0]]){let nr=r+dr,nc=c+dc;while(nr>=0&&nr<8&&nc>=0&&nc<8){const p=b[nr][nc];if(p!==E){if(rq.includes(p))return true;break;}nr+=dr;nc+=dc;}}
	// bishop/queen (diag)
	const bq=own?[WB,WQ]:[BB,BQ];
	for(const[dr,dc]of[[1,1],[1,-1],[-1,1],[-1,-1]]){let nr=r+dr,nc=c+dc;while(nr>=0&&nr<8&&nc>=0&&nc<8){const p=b[nr][nc];if(p!==E){if(bq.includes(p))return true;break;}nr+=dr;nc+=dc;}}
	return false;
}
function inCheck(b:Board,color:'w'|'b'):boolean{const[kr,kc]=findKing(b,color);return isAttacked(b,kr,kc,color==='w'?'b':'w');}
function generatePseudoMoves(g:GameState):Move[]{
	const moves:Move[]=[];const{board:b,turn,castle,epTarget}=g;const own=turn==='w';
	for(let r=0;r<8;r++)for(let c=0;c<8;c++){
		const p=b[r][c];if(p===E)continue;if(own?!isWhite(p):!isBlack(p))continue;
		const t=pieceType(p);
		const addMove=(tr:number,tc:number,promo=0,castleType='',ep=false,epR?:number,epC?:number)=>{
			moves.push({fr:r,fc:c,tr,tc,piece:p,captured:b[tr][tc],promotion:promo,castle:castleType,enPassant:ep,epCapR:epR,epCapC:epC});};
		const canMove=(tr:number,tc:number)=>{const tp=b[tr][tc];return tp===E||(own?isBlack(tp):isWhite(tp));};
		const isEmpty=(tr:number,tc:number)=>b[tr][tc]===E;
		const isEnemy=(tr:number,tc:number)=>{const tp=b[tr][tc];return tp!==E&&(own?isBlack(tp):isWhite(tp));};
		if(t===1){// pawn
			const dir=own?-1:1;const startR=own?6:1;const promoR=own?0:7;
			const nr=r+dir;
			if(nr>=0&&nr<8&&isEmpty(nr,c)){
				if(nr===promoR){for(const pp of(own?[WQ,WR,WB,WN]:[BQ,BR,BB,BN]))addMove(nr,c,pp);}
				else{addMove(nr,c);if(r===startR&&isEmpty(r+dir*2,c))addMove(r+dir*2,c);}
			}
			for(const dc of[-1,1]){const nc=c+dc;if(nc<0||nc>=8)continue;
				if(nr>=0&&nr<8&&isEnemy(nr,nc)){if(nr===promoR){for(const pp of(own?[WQ,WR,WB,WN]:[BQ,BR,BB,BN]))addMove(nr,nc,pp);}else addMove(nr,nc);}
				if(epTarget&&epTarget[0]===nr&&epTarget[1]===nc)addMove(nr,nc,0,'',true,r,nc);
			}
		}else if(t===2){// knight
			for(const[dr,dc]of[[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]]){const nr=r+dr,nc=c+dc;if(nr>=0&&nr<8&&nc>=0&&nc<8&&canMove(nr,nc))addMove(nr,nc);}
		}else if(t===3){// bishop
			for(const[dr,dc]of[[1,1],[1,-1],[-1,1],[-1,-1]]){let nr=r+dr,nc=c+dc;while(nr>=0&&nr<8&&nc>=0&&nc<8){if(isEmpty(nr,nc)){addMove(nr,nc);}else{if(isEnemy(nr,nc))addMove(nr,nc);break;}nr+=dr;nc+=dc;}}
		}else if(t===4){// rook
			for(const[dr,dc]of[[0,1],[0,-1],[1,0],[-1,0]]){let nr=r+dr,nc=c+dc;while(nr>=0&&nr<8&&nc>=0&&nc<8){if(isEmpty(nr,nc)){addMove(nr,nc);}else{if(isEnemy(nr,nc))addMove(nr,nc);break;}nr+=dr;nc+=dc;}}
		}else if(t===5){// queen
			for(const[dr,dc]of[[0,1],[0,-1],[1,0],[-1,0],[1,1],[1,-1],[-1,1],[-1,-1]]){let nr=r+dr,nc=c+dc;while(nr>=0&&nr<8&&nc>=0&&nc<8){if(isEmpty(nr,nc)){addMove(nr,nc);}else{if(isEnemy(nr,nc))addMove(nr,nc);break;}nr+=dr;nc+=dc;}}
		}else if(t===6){// king
			for(let dr=-1;dr<=1;dr++)for(let dc=-1;dc<=1;dc++){if(dr===0&&dc===0)continue;const nr=r+dr,nc=c+dc;if(nr>=0&&nr<8&&nc>=0&&nc<8&&canMove(nr,nc))addMove(nr,nc);}
			// castling
			const cr=own?7:0;const opp=own?'b':'w';
			if(r===cr&&c===4){
				if((own?castle.K:castle.k)&&b[cr][5]===E&&b[cr][6]===E&&b[cr][7]===(own?WR:BR)&&!isAttacked(b,cr,4,opp)&&!isAttacked(b,cr,5,opp)&&!isAttacked(b,cr,6,opp))
					addMove(cr,6,0,own?'K':'k');
				if((own?castle.Q:castle.q)&&b[cr][3]===E&&b[cr][2]===E&&b[cr][1]===E&&b[cr][0]===(own?WR:BR)&&!isAttacked(b,cr,4,opp)&&!isAttacked(b,cr,3,opp)&&!isAttacked(b,cr,2,opp))
					addMove(cr,2,0,own?'Q':'q');
			}
		}
	}
	return moves;
}
function makeMove(g:GameState,m:Move):GameState{
	const nb=cloneBoard(g.board);const nc={...g.castle};
	nb[m.tr][m.tc]=m.promotion||m.piece;nb[m.fr][m.fc]=E;
	if(m.enPassant&&m.epCapR!==undefined&&m.epCapC!==undefined)nb[m.epCapR][m.epCapC]=E;
	if(m.castle){const cr=m.fr;
		if(m.castle==='K'||m.castle==='k'){nb[cr][5]=nb[cr][7];nb[cr][7]=E;}
		if(m.castle==='Q'||m.castle==='q'){nb[cr][3]=nb[cr][0];nb[cr][0]=E;}
	}
	// update castle rights
	if(m.piece===WK){nc.K=false;nc.Q=false;}if(m.piece===BK){nc.k=false;nc.q=false;}
	if(m.fr===7&&m.fc===7)nc.K=false;if(m.fr===7&&m.fc===0)nc.Q=false;
	if(m.fr===0&&m.fc===7)nc.k=false;if(m.fr===0&&m.fc===0)nc.q=false;
	if(m.tr===7&&m.tc===7)nc.K=false;if(m.tr===7&&m.tc===0)nc.Q=false;
	if(m.tr===0&&m.tc===7)nc.k=false;if(m.tr===0&&m.tc===0)nc.q=false;
	let ep:[number,number]|null=null;
	if(pieceType(m.piece)===1&&Math.abs(m.tr-m.fr)===2)ep=[(m.fr+m.tr)/2,m.fc];
	const hm=(pieceType(m.piece)===1||m.captured!==E)?0:g.halfMove+1;
	const fm=g.turn==='b'?g.fullMove+1:g.fullMove;
	const newState:GameState={board:nb,turn:g.turn==='w'?'b':'w',castle:nc,epTarget:ep,halfMove:hm,fullMove:fm,history:[...g.history,m],posHistory:[...g.posHistory]};
	newState.posHistory.push(boardKey(newState));
	return newState;
}
function getLegalMoves(g:GameState):Move[]{
	return generatePseudoMoves(g).filter(m=>{const ns=makeMove(g,m);return !inCheck(ns.board,g.turn);});
}
function isCheckmate(g:GameState):boolean{return inCheck(g.board,g.turn)&&getLegalMoves(g).length===0;}
function isStalemate(g:GameState):boolean{return !inCheck(g.board,g.turn)&&getLegalMoves(g).length===0;}
function isDraw(g:GameState):boolean{
	if(g.halfMove>=100)return true;// 50-move
	const key=boardKey(g);let count=0;for(const k of g.posHistory)if(k===key)count++;
	if(count>=3)return true;// 3-fold repetition
	// insufficient material
	let wPieces:number[]=[], bPieces:number[]=[];
	for(let r=0;r<8;r++)for(let c=0;c<8;c++){const p=g.board[r][c];if(isWhite(p)&&p!==WK)wPieces.push(p);if(isBlack(p)&&p!==BK)bPieces.push(p);}
	if(wPieces.length===0&&bPieces.length===0)return true;// KvK
	if(wPieces.length===0&&bPieces.length===1&&(bPieces[0]===BN||bPieces[0]===BB))return true;
	if(bPieces.length===0&&wPieces.length===1&&(wPieces[0]===WN||wPieces[0]===WB))return true;
	return false;
}
function moveNotation(m:Move,g:GameState):string{
	if(m.castle==='K'||m.castle==='k')return 'O-O';
	if(m.castle==='Q'||m.castle==='q')return 'O-O-O';
	const t=pieceType(m.piece);let s='';
	if(t>1)s+=PIECE_NAMES[m.piece].toUpperCase();
	if(m.captured!==E||m.enPassant){if(t===1)s+=FILES[m.fc];s+='x';}
	s+=FILES[m.tc]+(8-m.tr);
	if(m.promotion)s+='='+PIECE_NAMES[m.promotion].toUpperCase();
	const ns=makeMove(g,m);
	if(isCheckmate(ns))s+='#';else if(inCheck(ns.board,ns.turn))s+='+';
	return s;
}

// ─── AI ENGINE ────────────────────────────────────────────────────────
const PIECE_VALUES=[0,100,320,330,500,900,20000,100,320,330,500,900,20000];
// piece-square tables (from white's perspective, row 0=rank 8)
const PST_PAWN=[0,0,0,0,0,0,0,0, 50,50,50,50,50,50,50,50, 10,10,20,30,30,20,10,10, 5,5,10,25,25,10,5,5, 0,0,0,20,20,0,0,0, 5,-5,-10,0,0,-10,-5,5, 5,10,10,-20,-20,10,10,5, 0,0,0,0,0,0,0,0];
const PST_KNIGHT=[-50,-40,-30,-30,-30,-30,-40,-50, -40,-20,0,0,0,0,-20,-40, -30,0,10,15,15,10,0,-30, -30,5,15,20,20,15,5,-30, -30,0,15,20,20,15,0,-30, -30,5,10,15,15,10,5,-30, -40,-20,0,5,5,0,-20,-40, -50,-40,-30,-30,-30,-30,-40,-50];
const PST_BISHOP=[-20,-10,-10,-10,-10,-10,-10,-20, -10,0,0,0,0,0,0,-10, -10,0,5,10,10,5,0,-10, -10,5,5,10,10,5,5,-10, -10,0,10,10,10,10,0,-10, -10,10,10,10,10,10,10,-10, -10,5,0,0,0,0,5,-10, -20,-10,-10,-10,-10,-10,-10,-20];
const PST_ROOK=[0,0,0,0,0,0,0,0, 5,10,10,10,10,10,10,5, -5,0,0,0,0,0,0,-5, -5,0,0,0,0,0,0,-5, -5,0,0,0,0,0,0,-5, -5,0,0,0,0,0,0,-5, -5,0,0,0,0,0,0,-5, 0,0,0,5,5,0,0,0];
const PST_QUEEN=[-20,-10,-10,-5,-5,-10,-10,-20, -10,0,0,0,0,0,0,-10, -10,0,5,5,5,5,0,-10, -5,0,5,5,5,5,0,-5, 0,0,5,5,5,5,0,-5, -10,5,5,5,5,5,0,-10, -10,0,5,0,0,0,0,-10, -20,-10,-10,-5,-5,-10,-10,-20];
const PST_KING=[-30,-40,-40,-50,-50,-40,-40,-30, -30,-40,-40,-50,-50,-40,-40,-30, -30,-40,-40,-50,-50,-40,-40,-30, -30,-40,-40,-50,-50,-40,-40,-30, -20,-30,-30,-40,-40,-30,-30,-20, -10,-20,-20,-20,-20,-20,-20,-10, 20,20,0,0,0,0,20,20, 20,30,10,0,0,10,30,20];
const PSTS=[null,PST_PAWN,PST_KNIGHT,PST_BISHOP,PST_ROOK,PST_QUEEN,PST_KING];

function evaluate(g:GameState):number{
	let score=0;
	for(let r=0;r<8;r++)for(let c=0;c<8;c++){
		const p=g.board[r][c];if(p===E)continue;
		const t=pieceType(p);const v=PIECE_VALUES[p];const pst=PSTS[t];
		if(isWhite(p)){score+=v;if(pst)score+=pst[r*8+c];}
		else{score-=v;if(pst)score-=pst[(7-r)*8+c];}
	}
	// mobility bonus
	const saved=g.turn;
	const wMob=g.turn==='w'?getLegalMoves(g).length:0;
	return score+(g.turn==='w'?wMob*2:-wMob*2);
}
function minimax(g:GameState,depth:number,alpha:number,beta:number,maximizing:boolean):[number,Move|null]{
	if(depth===0||isCheckmate(g)||isStalemate(g)||isDraw(g)){
		if(isCheckmate(g))return maximizing?[-99999,null]:[99999,null];
		if(isStalemate(g)||isDraw(g))return[0,null];
		return[evaluate(g),null];
	}
	const moves=getLegalMoves(g);
	// move ordering: captures first, then checks
	moves.sort((a,b)=>{
		let sa=0,sb=0;
		if(a.captured!==E)sa+=10+PIECE_VALUES[a.captured];if(b.captured!==E)sb+=10+PIECE_VALUES[b.captured];
		return sb-sa;
	});
	let bestMove:Move|null=null;
	if(maximizing){
		let maxEval=-Infinity;
		for(const m of moves){const ns=makeMove(g,m);const[ev]=minimax(ns,depth-1,alpha,beta,false);if(ev>maxEval){maxEval=ev;bestMove=m;}alpha=Math.max(alpha,ev);if(beta<=alpha)break;}
		return[maxEval,bestMove];
	}else{
		let minEval=Infinity;
		for(const m of moves){const ns=makeMove(g,m);const[ev]=minimax(ns,depth-1,alpha,beta,true);if(ev<minEval){minEval=ev;bestMove=m;}beta=Math.min(beta,ev);if(beta<=alpha)break;}
		return[minEval,bestMove];
	}
}
function getAIMove(g:GameState,depth:number):Move|null{
	if(depth===0){const moves=getLegalMoves(g);return moves.length>0?moves[Math.floor(Math.random()*moves.length)]:null;}
	const maximizing=g.turn==='w';
	const[,m]=minimax(g,depth,-Infinity,Infinity,maximizing);
	return m;
}

// ─── AUDIO ───────────────────────────────────────────────────────────
let audioCtx:AudioContext|null=null;let masterGain:GainNode;let sfxGain:GainNode;let musicGain:GainNode;
let masterVol=0.8,sfxVol=0.8,musicVol=0.8;
function initAudio(){if(audioCtx)return;audioCtx=new AudioContext();masterGain=audioCtx.createGain();masterGain.gain.value=masterVol;masterGain.connect(audioCtx.destination);sfxGain=audioCtx.createGain();sfxGain.gain.value=sfxVol;sfxGain.connect(masterGain);musicGain=audioCtx.createGain();musicGain.gain.value=musicVol;musicGain.connect(masterGain);}
function playSfx(freq:number,type:OscillatorType='sine',dur=0.12,vol=0.3){
	if(!audioCtx)return;const o=audioCtx.createOscillator();const g=audioCtx.createGain();
	const pitch=1+(Math.random()-0.5)*0.08;o.frequency.value=freq*pitch;o.type=type;
	g.gain.setValueAtTime(vol,audioCtx.currentTime);g.gain.exponentialRampToValueAtTime(0.001,audioCtx.currentTime+dur);
	o.connect(g);g.connect(sfxGain);o.start();o.stop(audioCtx.currentTime+dur);
}
function playMove(){playSfx(440,'triangle',0.1,0.25);playSfx(660,'sine',0.08,0.15);}
function playCapture(){playSfx(330,'sawtooth',0.15,0.3);playSfx(220,'square',0.1,0.2);}
function playCheck(){playSfx(880,'square',0.2,0.35);playSfx(660,'triangle',0.15,0.25);}
function playCheckmate(){for(let i=0;i<5;i++)setTimeout(()=>playSfx(440+i*110,'triangle',0.3,0.3),i*100);}
function playCastle(){playSfx(330,'triangle',0.15,0.25);playSfx(440,'sine',0.12,0.2);playSfx(550,'triangle',0.1,0.15);}
function playPromotion(){for(let i=0;i<4;i++)setTimeout(()=>playSfx(550+i*100,'sine',0.15,0.25),i*80);}
function playClick(){playSfx(800,'sine',0.05,0.15);}
function playSelect(){playSfx(600,'triangle',0.08,0.2);}
function playCountdown(){playSfx(440,'sine',0.15,0.2);}
function playGo(){playSfx(880,'triangle',0.3,0.35);}
function playAchievement(){for(let i=0;i<5;i++)setTimeout(()=>playSfx(660+i*80,'sine',0.2,0.25),i*60);}
// ambient drone
let droneOscs:OscillatorNode[]=[];let droneGains:GainNode[]=[];
function startDrone(){
	if(!audioCtx||droneOscs.length>0)return;
	const freqs=[55,82.5,110];const types:OscillatorType[]=['sine','triangle','sine'];
	for(let i=0;i<3;i++){const o=audioCtx.createOscillator();const g=audioCtx.createGain();
		o.type=types[i];o.frequency.value=freqs[i];g.gain.value=0.03;o.connect(g);g.connect(musicGain);o.start();droneOscs.push(o);droneGains.push(g);}
	const lfo=audioCtx.createOscillator();const lfoG=audioCtx.createGain();lfo.frequency.value=0.15;lfo.type='sine';lfoG.gain.value=0.015;
	lfo.connect(lfoG);for(const g of droneGains)lfoG.connect(g.gain);lfo.start();
}
function stopDrone(){droneOscs.forEach(o=>{try{o.stop();}catch(e){}});droneOscs=[];droneGains=[];}

// ─── GAME STATE MANAGER ────────────────────────────────────────────
type ScreenState='title'|'mode'|'difficulty'|'playing'|'paused'|'gameover'|'settings'|'help'|'achievements'|'stats'|'skins'|'leaderboard'|'countdown'|'promote';
interface Stats{games:number;wins:number;losses:number;draws:number;totalCaptures:number;totalChecks:number;totalMoves:number;checkmates:number;castles:number;promotions:number;enPassants:number;bestStreak:number;currentStreak:number;totalScore:number;dailyDone:number;dailyStreak:number;lastDailyDate:string;scholarMates:number;queenSacWins:number;hardWins:number;expertWins:number;stalemates:number;speedWins:number;timedWins:number;blitzWins:number;bestCaptureStreak:number;totalWipes:number;mostChecksInGame:number;level:number;xp:number;themesUsed:Set<string>;modesPlayed:Set<string>;skinsUnlocked:number;achUnlocked:Set<string>;leaderboard:{score:number;mode:string;date:string;moves:number}[];skinIdx:number;themeIdx:number;achPage:number;}

function defaultStats():Stats{
	return{games:0,wins:0,losses:0,draws:0,totalCaptures:0,totalChecks:0,totalMoves:0,checkmates:0,castles:0,promotions:0,enPassants:0,bestStreak:0,currentStreak:0,totalScore:0,dailyDone:0,dailyStreak:0,lastDailyDate:'',scholarMates:0,queenSacWins:0,hardWins:0,expertWins:0,stalemates:0,speedWins:0,timedWins:0,blitzWins:0,bestCaptureStreak:0,totalWipes:0,mostChecksInGame:0,level:1,xp:0,themesUsed:new Set(),modesPlayed:new Set(),skinsUnlocked:1,achUnlocked:new Set(),leaderboard:[],skinIdx:0,themeIdx:0,achPage:0};
}
function loadStats():Stats{
	try{const d=localStorage.getItem('neon-chess-stats');if(!d)return defaultStats();const p=JSON.parse(d);
		p.themesUsed=new Set(p.themesUsed||[]);p.modesPlayed=new Set(p.modesPlayed||[]);p.achUnlocked=new Set(p.achUnlocked||[]);return p;}
	catch{return defaultStats();}
}
function saveStats(s:Stats){
	const d={...s,themesUsed:[...s.themesUsed],modesPlayed:[...s.modesPlayed],achUnlocked:[...s.achUnlocked]};
	try{localStorage.setItem('neon-chess-stats',JSON.stringify(d));}catch{}
}

// ─── GLOBALS ───────────────────────────────────────────────────────
let world:World;
let stats:Stats;
let screenState:ScreenState='title';
let gameState:GameState;
let gameMode='vsai';
let difficulty=2;
let selectedCell:[number,number]|null=null;
let legalMovesForSelected:Move[]=[];
let pendingPromotion:Move|null=null;
let gameTimer=0;let timerLimit=0;let timerRunning=false;
let whiteTime=0;let blackTime=0;
let checksThisGame=0;let captureStreak=0;let queenSacrificed=false;
let countdownTimer=0;let countdownValue=3;
let toastTimer=0;let toastText='';
let animatingMove:Move|null=null;let animProgress=0;
let aiThinking=false;

// 3D objects
let boardGroup:Group;
let cellMeshes:Mesh[][]=[];
let pieceMeshes:(Group|null)[][]=[];
let moveIndicators:Mesh[]=[];
let lastMoveFrom:Mesh|null=null;let lastMoveTo:Mesh|null=null;
let capturedWhite:Group[]=[];let capturedBlack:Group[]=[];
const particles:{mesh:Mesh;vel:Vector3;life:number;maxLife:number}[]=[];
const raycaster=new Raycaster();
const mouseNDC=new Vector2();
let boardPlane:Mesh;

// ─── PIECE GEOMETRY BUILDERS ──────────────────────────────────────────
function createPieceMesh(type:number,isW:boolean,theme:Theme):Group{
	const g=new Group();const color=isW?theme.wPiece:theme.bPiece;
	const mat=new MeshStandardMaterial({color:new Color(color),emissive:new Color(color),emissiveIntensity:0.4,metalness:0.3,roughness:0.6});
	const wireMat=new LineBasicMaterial({color:new Color(color),transparent:true,opacity:0.6});
	const addWire=(m:Mesh)=>{const edges=new EdgesGeometry(m.geometry);const wire=new LineSegments(edges,wireMat);m.add(wire);};
	const t=pieceType(type);const h=CELL_SIZE*0.3;
	if(t===1){// Pawn: cylinder base + sphere top
		const base=new Mesh(new CylinderGeometry(h*0.5,h*0.6,h*0.6,8),mat);base.position.y=h*0.3;addWire(base);g.add(base);
		const top=new Mesh(new SphereGeometry(h*0.4,8,6),mat);top.position.y=h*0.8;addWire(top);g.add(top);
	}else if(t===2){// Knight: angular horse head
		const body=new Mesh(new CylinderGeometry(h*0.5,h*0.65,h*0.7,8),mat);body.position.y=h*0.35;addWire(body);g.add(body);
		const head=new Mesh(new BoxGeometry(h*0.4,h*0.5,h*0.7),mat);head.position.set(0,h*0.95,h*0.1);head.rotation.x=-0.3;addWire(head);g.add(head);
		const ear=new Mesh(new ConeGeometry(h*0.15,h*0.3,4),mat);ear.position.set(0,h*1.3,h*0.15);addWire(ear);g.add(ear);
	}else if(t===3){// Bishop: cylinder + cone top
		const base=new Mesh(new CylinderGeometry(h*0.5,h*0.65,h*0.8,8),mat);base.position.y=h*0.4;addWire(base);g.add(base);
		const mid=new Mesh(new CylinderGeometry(h*0.35,h*0.5,h*0.4,8),mat);mid.position.y=h*0.9;addWire(mid);g.add(mid);
		const top=new Mesh(new ConeGeometry(h*0.25,h*0.5,6),mat);top.position.y=h*1.35;addWire(top);g.add(top);
		const tip=new Mesh(new SphereGeometry(h*0.1,6,4),mat);tip.position.y=h*1.65;g.add(tip);
	}else if(t===4){// Rook: cylinder + battlements
		const base=new Mesh(new CylinderGeometry(h*0.55,h*0.65,h*0.9,8),mat);base.position.y=h*0.45;addWire(base);g.add(base);
		const top=new Mesh(new CylinderGeometry(h*0.6,h*0.55,h*0.2,8),mat);top.position.y=h*1.0;addWire(top);g.add(top);
		for(let i=0;i<4;i++){const a=i*Math.PI/2;const b=new Mesh(new BoxGeometry(h*0.2,h*0.25,h*0.2),mat);
			b.position.set(Math.sin(a)*h*0.45,h*1.25,Math.cos(a)*h*0.45);addWire(b);g.add(b);}
	}else if(t===5){// Queen: tall + sphere crown
		const base=new Mesh(new CylinderGeometry(h*0.5,h*0.65,h*1.0,8),mat);base.position.y=h*0.5;addWire(base);g.add(base);
		const neck=new Mesh(new CylinderGeometry(h*0.3,h*0.5,h*0.3,8),mat);neck.position.y=h*1.1;addWire(neck);g.add(neck);
		const crown=new Mesh(new SphereGeometry(h*0.35,8,6),mat);crown.position.y=h*1.5;addWire(crown);g.add(crown);
		for(let i=0;i<5;i++){const a=i*Math.PI*2/5;const spike=new Mesh(new ConeGeometry(h*0.08,h*0.25,4),mat);
			spike.position.set(Math.sin(a)*h*0.3,h*1.75,Math.cos(a)*h*0.3);g.add(spike);}
	}else if(t===6){// King: tallest + cross
		const base=new Mesh(new CylinderGeometry(h*0.55,h*0.65,h*1.1,8),mat);base.position.y=h*0.55;addWire(base);g.add(base);
		const neck=new Mesh(new CylinderGeometry(h*0.35,h*0.55,h*0.3,8),mat);neck.position.y=h*1.2;addWire(neck);g.add(neck);
		// cross
		const cv=new Mesh(new BoxGeometry(h*0.12,h*0.5,h*0.12),mat);cv.position.y=h*1.65;addWire(cv);g.add(cv);
		const ch=new Mesh(new BoxGeometry(h*0.35,h*0.12,h*0.12),mat);ch.position.y=h*1.75;addWire(ch);g.add(ch);
	}
	// glow sphere
	const glowMat=new MeshBasicMaterial({color:new Color(color),transparent:true,opacity:0.15,blending:AdditiveBlending});
	const glow=new Mesh(new SphereGeometry(h*0.8,8,6),glowMat);glow.position.y=h*0.7;g.add(glow);
	return g;
}

// ─── 3D SCENE SETUP ──────────────────────────────────────────────────
function buildBoard(scene:any,theme:Theme){
	if(boardGroup)scene.remove(boardGroup);
	boardGroup=new Group();boardGroup.position.set(0,BOARD_Y,-2.5);
	cellMeshes=[];
	const lightMat=new MeshStandardMaterial({color:new Color(theme.light),emissive:new Color(theme.light),emissiveIntensity:0.1,metalness:0.4,roughness:0.7});
	const darkMat=new MeshStandardMaterial({color:new Color(theme.dark),emissive:new Color(theme.dark),emissiveIntensity:0.05,metalness:0.4,roughness:0.7});
	for(let r=0;r<8;r++){
		cellMeshes[r]=[];
		for(let c=0;c<8;c++){
			const isLight=(r+c)%2===0;
			const cell=new Mesh(new BoxGeometry(CELL_SIZE,0.02,CELL_SIZE),isLight?lightMat.clone():darkMat.clone());
			cell.position.set(BOARD_OFFSET_X+c*CELL_SIZE,0,BOARD_OFFSET_Z+r*CELL_SIZE);
			cell.userData={row:r,col:c};
			boardGroup.add(cell);cellMeshes[r][c]=cell;
		}
	}
	// board border
	const borderMat=new MeshBasicMaterial({color:new Color(theme.accent),transparent:true,opacity:0.4});
	const bSize=CELL_SIZE*8+0.04;
	for(const[w,h,x,z]of[[bSize,0.01,0,BOARD_OFFSET_Z-CELL_SIZE/2-0.01],[bSize,0.01,0,BOARD_OFFSET_Z+CELL_SIZE*7.5+0.01],[0.01,bSize,BOARD_OFFSET_X-CELL_SIZE/2-0.01,0],[0.01,bSize,BOARD_OFFSET_X+CELL_SIZE*7.5+0.01,0]]){
		const bm=new Mesh(new BoxGeometry(w as number,0.025,h as number),borderMat);bm.position.set(x as number,0,z as number);boardGroup.add(bm);
	}
	// coordinate labels (small dots along edges)
	const dotMat=new MeshBasicMaterial({color:new Color(theme.accent),transparent:true,opacity:0.3});
	for(let i=0;i<8;i++){
		const d1=new Mesh(new SphereGeometry(0.008,4,4),dotMat);d1.position.set(BOARD_OFFSET_X+i*CELL_SIZE,0.02,BOARD_OFFSET_Z-CELL_SIZE/2-0.04);boardGroup.add(d1);
		const d2=new Mesh(new SphereGeometry(0.008,4,4),dotMat);d2.position.set(BOARD_OFFSET_X-CELL_SIZE/2-0.04,0.02,BOARD_OFFSET_Z+i*CELL_SIZE);boardGroup.add(d2);
	}
	// invisible plane for raycasting
	boardPlane=new Mesh(new PlaneGeometry(CELL_SIZE*10,CELL_SIZE*10),new MeshBasicMaterial({visible:false}));
	boardPlane.rotation.x=-Math.PI/2;boardPlane.position.y=0.015;boardGroup.add(boardPlane);
	scene.add(boardGroup);
	// move indicators (pre-create, hide)
	moveIndicators.forEach(m=>boardGroup.remove(m));moveIndicators=[];
	const indMat=new MeshBasicMaterial({color:new Color(theme.move),transparent:true,opacity:0.5,blending:AdditiveBlending});
	for(let i=0;i<64;i++){const ind=new Mesh(new TorusGeometry(CELL_SIZE*0.3,0.008,4,12),indMat);ind.rotation.x=-Math.PI/2;ind.position.y=0.02;ind.visible=false;boardGroup.add(ind);moveIndicators.push(ind);}
	// last move highlights
	if(lastMoveFrom)boardGroup.remove(lastMoveFrom);if(lastMoveTo)boardGroup.remove(lastMoveTo);
	const lmMat=new MeshBasicMaterial({color:new Color(theme.sel),transparent:true,opacity:0.25,blending:AdditiveBlending});
	lastMoveFrom=new Mesh(new BoxGeometry(CELL_SIZE*0.9,0.005,CELL_SIZE*0.9),lmMat);lastMoveFrom.position.y=0.015;lastMoveFrom.visible=false;boardGroup.add(lastMoveFrom);
	lastMoveTo=new Mesh(new BoxGeometry(CELL_SIZE*0.9,0.005,CELL_SIZE*0.9),lmMat.clone());lastMoveTo.position.y=0.015;lastMoveTo.visible=false;boardGroup.add(lastMoveTo);
}
function buildPieces(theme:Theme){
	// clear existing
	for(let r=0;r<8;r++)for(let c=0;c<8;c++)if(pieceMeshes[r]&&pieceMeshes[r][c]){boardGroup.remove(pieceMeshes[r][c]!);pieceMeshes[r][c]=null;}
	pieceMeshes=Array.from({length:8},()=>Array(8).fill(null));
	for(let r=0;r<8;r++)for(let c=0;c<8;c++){
		const p=gameState.board[r][c];if(p===E)continue;
		const mesh=createPieceMesh(p,isWhite(p),theme);
		mesh.position.set(BOARD_OFFSET_X+c*CELL_SIZE,0.01,BOARD_OFFSET_Z+r*CELL_SIZE);
		boardGroup.add(mesh);pieceMeshes[r][c]=mesh;
	}
}
function buildEnvironment(scene:any,theme:Theme){
	scene.fog=new Fog(new Color(theme.fogC),5,25);scene.background=new Color(theme.bg);
	// lights
	const amb=new AmbientLight(new Color(theme.accent),0.3);scene.add(amb);
	const dir=new DirectionalLight(0xffffff,0.5);dir.position.set(2,5,-3);scene.add(dir);
	const p1=new PointLight(new Color(theme.accent),0.6,10);p1.position.set(-2,3,-2);scene.add(p1);
	const p2=new PointLight(new Color(theme.accent),0.4,10);p2.position.set(2,3,-3);scene.add(p2);
	// grid floor
	const gridMat=new LineBasicMaterial({color:new Color(theme.gridC),transparent:true,opacity:0.15});
	for(let i=-10;i<=10;i++){
		const g1=new BufferGeometry().setFromPoints([new Vector3(i,0,-10),new Vector3(i,0,10)]);scene.add(new LineSegments(g1,gridMat));
		const g2=new BufferGeometry().setFromPoints([new Vector3(-10,0,i),new Vector3(10,0,i)]);scene.add(new LineSegments(g2,gridMat));
	}
	// grid ceiling
	const ceilMat=new LineBasicMaterial({color:new Color(theme.gridC),transparent:true,opacity:0.06});
	for(let i=-10;i<=10;i++){
		const g1=new BufferGeometry().setFromPoints([new Vector3(i,4,-10),new Vector3(i,4,10)]);scene.add(new LineSegments(g1,ceilMat));
		const g2=new BufferGeometry().setFromPoints([new Vector3(-10,4,i),new Vector3(10,4,i)]);scene.add(new LineSegments(g2,ceilMat));
	}
	// floating decorations
	const decMat=new MeshBasicMaterial({color:new Color(theme.accent),wireframe:true,transparent:true,opacity:0.12});
	const geos=[new TorusGeometry(0.3,0.08,6,12),new BoxGeometry(0.4,0.4,0.4),new SphereGeometry(0.25,8,6),new ConeGeometry(0.2,0.4,6)];
	for(let i=0;i<12;i++){const m=new Mesh(geos[i%4],decMat.clone());
		m.position.set((Math.random()-0.5)*8,1.5+Math.random()*2,(Math.random()-0.5)*8-2);
		m.userData.rotSpeed=0.2+Math.random()*0.5;m.userData.bobSpeed=0.5+Math.random()*0.5;m.userData.bobBase=m.position.y;
		scene.add(m);
	}
	// ambient particles
	const partMat=new MeshBasicMaterial({color:new Color(theme.accent),transparent:true,opacity:0.2,blending:AdditiveBlending});
	for(let i=0;i<30;i++){const p=new Mesh(new SphereGeometry(0.015,4,4),partMat.clone());
		p.position.set((Math.random()-0.5)*8,Math.random()*3.5,(Math.random()-0.5)*8-2);
		p.userData.driftX=(Math.random()-0.5)*0.1;p.userData.driftY=0.02+Math.random()*0.05;p.userData.pulsePhase=Math.random()*Math.PI*2;
		scene.add(p);
	}
	// captured piece trays (areas beside board)
	capturedWhite=[];capturedBlack=[];
}

function cellToWorld(r:number,c:number):Vector3{return new Vector3(BOARD_OFFSET_X+c*CELL_SIZE,0.015,BOARD_OFFSET_Z+r*CELL_SIZE);}

function showMoveIndicators(){
	moveIndicators.forEach(m=>m.visible=false);
	legalMovesForSelected.forEach((m,i)=>{if(i>=moveIndicators.length)return;
		const ind=moveIndicators[i];ind.position.set(BOARD_OFFSET_X+m.tc*CELL_SIZE,0.025,BOARD_OFFSET_Z+m.tr*CELL_SIZE);
		ind.visible=true;
	});
}
function hideMoveIndicators(){moveIndicators.forEach(m=>m.visible=false);}

function updateLastMoveHighlight(){
	if(gameState.history.length===0){lastMoveFrom!.visible=false;lastMoveTo!.visible=false;return;}
	const m=gameState.history[gameState.history.length-1];
	lastMoveFrom!.position.set(BOARD_OFFSET_X+m.fc*CELL_SIZE,0.015,BOARD_OFFSET_Z+m.fr*CELL_SIZE);lastMoveFrom!.visible=true;
	lastMoveTo!.position.set(BOARD_OFFSET_X+m.tc*CELL_SIZE,0.015,BOARD_OFFSET_Z+m.tr*CELL_SIZE);lastMoveTo!.visible=true;
}

function spawnParticles(pos:Vector3,color:string,count:number){
	for(let i=0;i<count;i++){
		const mat=new MeshBasicMaterial({color:new Color(color),transparent:true,opacity:0.8,blending:AdditiveBlending});
		const mesh=new Mesh(new SphereGeometry(0.012,4,4),mat);
		mesh.position.copy(pos);boardGroup.add(mesh);
		const angle=Math.random()*Math.PI*2;const speed=0.3+Math.random()*0.5;
		particles.push({mesh,vel:new Vector3(Math.cos(angle)*speed,1+Math.random()*2,Math.sin(angle)*speed),life:0.8+Math.random()*0.4,maxLife:0.8+Math.random()*0.4});
	}
}

// ─── GAME LOGIC ──────────────────────────────────────────────────────
function newGame(){
	gameState={board:initBoard(),turn:'w',castle:{K:true,Q:true,k:true,q:true},epTarget:null,halfMove:0,fullMove:1,history:[],posHistory:[]};
	gameState.posHistory.push(boardKey(gameState));
	selectedCell=null;legalMovesForSelected=[];pendingPromotion=null;
	gameTimer=0;timerRunning=false;checksThisGame=0;captureStreak=0;queenSacrificed=false;
	whiteTime=0;blackTime=0;aiThinking=false;
	if(gameMode==='timed'){timerLimit=300;}else if(gameMode==='blitz'){timerLimit=120;}else{timerLimit=0;}
}

function executeMove(m:Move){
	initAudio();
	const theme=THEMES[stats.themeIdx];
	// animate: remove old piece at dest if capture
	if(m.captured!==E){
		const capMesh=pieceMeshes[m.tr][m.tc];if(capMesh){boardGroup.remove(capMesh);pieceMeshes[m.tr][m.tc]=null;}
		playCapture();captureStreak++;stats.totalCaptures++;
		if(captureStreak>stats.bestCaptureStreak)stats.bestCaptureStreak=captureStreak;
		spawnParticles(cellToWorld(m.tr,m.tc),isWhite(m.piece)?theme.bPiece:theme.wPiece,12);
	}else{captureStreak=0;playMove();}
	if(m.enPassant&&m.epCapR!==undefined&&m.epCapC!==undefined){
		const epMesh=pieceMeshes[m.epCapR][m.epCapC];if(epMesh){boardGroup.remove(epMesh);pieceMeshes[m.epCapR][m.epCapC]=null;}
		stats.enPassants++;stats.totalCaptures++;
		spawnParticles(cellToWorld(m.epCapR,m.epCapC),isWhite(m.piece)?theme.bPiece:theme.wPiece,8);
	}
	if(m.castle){
		playCastle();stats.castles++;
		const cr=m.fr;
		if(m.castle==='K'||m.castle==='k'){
			const rookMesh=pieceMeshes[cr][7];if(rookMesh){rookMesh.position.set(BOARD_OFFSET_X+5*CELL_SIZE,0.01,BOARD_OFFSET_Z+cr*CELL_SIZE);pieceMeshes[cr][5]=rookMesh;pieceMeshes[cr][7]=null;}
		}else{
			const rookMesh=pieceMeshes[cr][0];if(rookMesh){rookMesh.position.set(BOARD_OFFSET_X+3*CELL_SIZE,0.01,BOARD_OFFSET_Z+cr*CELL_SIZE);pieceMeshes[cr][3]=rookMesh;pieceMeshes[cr][0]=null;}
		}
	}
	// move piece mesh
	const pMesh=pieceMeshes[m.fr][m.fc];
	if(pMesh){
		pMesh.position.set(BOARD_OFFSET_X+m.tc*CELL_SIZE,0.01,BOARD_OFFSET_Z+m.tr*CELL_SIZE);
		pieceMeshes[m.tr][m.tc]=pMesh;pieceMeshes[m.fr][m.fc]=null;
	}
	if(m.promotion){
		// replace mesh
		if(pieceMeshes[m.tr][m.tc])boardGroup.remove(pieceMeshes[m.tr][m.tc]!);
		const newMesh=createPieceMesh(m.promotion,isWhite(m.piece),theme);
		newMesh.position.set(BOARD_OFFSET_X+m.tc*CELL_SIZE,0.01,BOARD_OFFSET_Z+m.tr*CELL_SIZE);
		boardGroup.add(newMesh);pieceMeshes[m.tr][m.tc]=newMesh;
		playPromotion();stats.promotions++;
		spawnParticles(cellToWorld(m.tr,m.tc),'#ffa726',15);
	}
	// track queen sacrifice
	if(pieceType(m.piece)===5&&m.captured!==E)queenSacrificed=false;// moving queen to capture isn't sacrifice
	if(m.captured!==E&&pieceType(m.captured)===5){}// we captured enemy queen
	// detect if we sacrificed our queen: if our queen is captured in subsequent move
	// Simplification: if piece moving is queen and destination has enemy, queen might be taken next
	gameState=makeMove(gameState,m);stats.totalMoves++;
	// check detection
	if(inCheck(gameState.board,gameState.turn)){
		playCheck();checksThisGame++;stats.totalChecks++;
		showToast('Check!');
	}
	updateLastMoveHighlight();selectedCell=null;legalMovesForSelected=[];hideMoveIndicators();
	// check game end
	if(isCheckmate(gameState)){
		const winner=gameState.turn==='w'?'Black':'White';
		playCheckmate();stats.checkmates++;
		if(gameState.history.length<=8)stats.scholarMates++;
		endGame(winner+' wins by checkmate!',winner==='White'?'win':'loss');
		return;
	}
	if(isStalemate(gameState)){endGame('Stalemate - Draw!','draw');stats.stalemates++;return;}
	if(isDraw(gameState)){endGame('Draw!','draw');return;}
	// AI move
	if(gameMode==='vsai'&&gameState.turn==='b'&&screenState==='playing'){
		aiThinking=true;
		setTimeout(()=>{
			const aiMove=getAIMove(gameState,difficulty);
			if(aiMove)executeMove(aiMove);
			aiThinking=false;
		},200+Math.random()*300);
	}
}

function endGame(result:string,outcome:'win'|'loss'|'draw'){
	screenState='gameover';timerRunning=false;
	stats.games++;
	stats.modesPlayed.add(gameMode);stats.themesUsed.add(THEMES[stats.themeIdx].name);
	if(checksThisGame>stats.mostChecksInGame)stats.mostChecksInGame=checksThisGame;
	// count remaining enemy pieces
	let enemyPieces=0;for(let r=0;r<8;r++)for(let c=0;c<8;c++){const p=gameState.board[r][c];if(outcome==='win'&&isBlack(p)&&p!==BK)enemyPieces++;if(outcome==='loss'&&isWhite(p)&&p!==WK)enemyPieces++;}
	if(outcome==='win'&&enemyPieces===0)stats.totalWipes++;
	if(outcome==='win'){
		stats.wins++;stats.currentStreak++;if(stats.currentStreak>stats.bestStreak)stats.bestStreak=stats.currentStreak;
		if(gameTimer<120)stats.speedWins++;
		if(difficulty>=3)stats.hardWins++;if(difficulty>=4)stats.expertWins++;
		if(gameMode==='blitz')stats.blitzWins++;if(gameMode==='timed')stats.timedWins++;
		const score=Math.max(100,1000-Math.floor(gameTimer/2)+checksThisGame*50+stats.totalCaptures*10);
		stats.totalScore+=score;stats.xp+=Math.floor(score/10);
		while(stats.xp>=100+stats.level*50){stats.xp-=100+stats.level*50;stats.level++;}
		stats.leaderboard.push({score,mode:gameMode,date:new Date().toISOString().slice(0,10),moves:gameState.history.length});
		stats.leaderboard.sort((a,b)=>b.score-a.score);if(stats.leaderboard.length>20)stats.leaderboard.length=20;
		spawnParticles(new Vector3(0,0.5,0),'#ffa726',40);
	}else if(outcome==='loss'){stats.losses++;stats.currentStreak=0;}
	else{stats.draws++;stats.currentStreak=0;}
	checkAchievements();saveStats(stats);
}

function showToast(text:string){toastText=text;toastTimer=2.0;}
function checkAchievements(){
	for(const a of ACHIEVEMENTS){if(!stats.achUnlocked.has(a.id)&&a.check(stats)){stats.achUnlocked.add(a.id);showToast(a.name+' unlocked!');playAchievement();}}
	stats.skinsUnlocked=SKINS.filter(s=>s.check(stats)).length;
}

// ─── UI SYSTEM ──────────────────────────────────────────────────────
function setScreen(s:ScreenState){screenState=s;playClick();}


// ─── ECS SYSTEM ────────────────────────────────────────────────────────
const TITLES=['Novice','Beginner','Student','Apprentice','Player','Competitor','Strategist','Tactician','Candidate','Expert',
	'Master','Senior Master','National Master','FIDE Master','International Master','Grandmaster','Super GM','Legend','Champion','Immortal'];

export class ChessUISystem extends createSystem({
	titleQ:{required:[PanelUI,PanelDocument],where:[eq(PanelUI,'config','./ui/title.json')]},
	modeQ:{required:[PanelUI,PanelDocument],where:[eq(PanelUI,'config','./ui/mode.json')]},
	diffQ:{required:[PanelUI,PanelDocument],where:[eq(PanelUI,'config','./ui/difficulty.json')]},
	hudQ:{required:[PanelUI,PanelDocument],where:[eq(PanelUI,'config','./ui/hud.json')]},
	pauseQ:{required:[PanelUI,PanelDocument],where:[eq(PanelUI,'config','./ui/pause.json')]},
	goQ:{required:[PanelUI,PanelDocument],where:[eq(PanelUI,'config','./ui/gameover.json')]},
	settingsQ:{required:[PanelUI,PanelDocument],where:[eq(PanelUI,'config','./ui/settings.json')]},
	helpQ:{required:[PanelUI,PanelDocument],where:[eq(PanelUI,'config','./ui/help.json')]},
	achQ:{required:[PanelUI,PanelDocument],where:[eq(PanelUI,'config','./ui/achievements.json')]},
	statsQ:{required:[PanelUI,PanelDocument],where:[eq(PanelUI,'config','./ui/stats.json')]},
	skinsQ:{required:[PanelUI,PanelDocument],where:[eq(PanelUI,'config','./ui/skins.json')]},
	lbQ:{required:[PanelUI,PanelDocument],where:[eq(PanelUI,'config','./ui/leaderboard.json')]},
	toastQ:{required:[PanelUI,PanelDocument],where:[eq(PanelUI,'config','./ui/toast.json')]},
	cdQ:{required:[PanelUI,PanelDocument],where:[eq(PanelUI,'config','./ui/countdown.json')]},
	promoQ:{required:[PanelUI,PanelDocument],where:[eq(PanelUI,'config','./ui/promote.json')]},
	histQ:{required:[PanelUI,PanelDocument],where:[eq(PanelUI,'config','./ui/history.json')]},
}){
	private docs:Record<string,{entity:any,doc:any}>={}; 
	private getDoc(e:any){return PanelDocument.data.document[e.index] as UIKitDocument|undefined;}
	private setText(e:any,id:string,text:string){const doc=this.getDoc(e);if(!doc)return;const el=doc.getElementById(id) as UIKit.Text|undefined;el?.setProperties({text});}
	private onClick(e:any,id:string,fn:()=>void){const doc=this.getDoc(e);if(!doc)return;const el=doc.getElementById(id) as UIKit.Text|undefined;el?.addEventListener('click',fn);}
	private setVis(e:any,show:boolean){if(e?.object3D)e.object3D.visible=show;}

	init(){
		const bind=(name:string,query:any)=>{
			query.subscribe('qualify',(entity:any)=>{
				const doc=this.getDoc(entity);if(!doc)return;
				this.docs[name]={entity,doc};
				this.wirePanel(name,entity);
			});
		};
		bind('title',this.queries.titleQ);bind('mode',this.queries.modeQ);bind('diff',this.queries.diffQ);
		bind('hud',this.queries.hudQ);bind('pause',this.queries.pauseQ);bind('go',this.queries.goQ);
		bind('settings',this.queries.settingsQ);bind('help',this.queries.helpQ);bind('ach',this.queries.achQ);
		bind('stats',this.queries.statsQ);bind('skins',this.queries.skinsQ);bind('lb',this.queries.lbQ);
		bind('toast',this.queries.toastQ);bind('cd',this.queries.cdQ);bind('promo',this.queries.promoQ);
		bind('hist',this.queries.histQ);
	}

	wirePanel(name:string,entity:any){
		const e=entity;
		if(name==='title'){
			this.onClick(e,'btn-play',()=>{setScreen('mode');});
			this.onClick(e,'btn-scores',()=>{setScreen('leaderboard');this.updateLeaderboard();});
			this.onClick(e,'btn-achievements',()=>{setScreen('achievements');this.updateAchievements();});
			this.onClick(e,'btn-stats',()=>{setScreen('stats');this.updateStats();});
			this.onClick(e,'btn-skins',()=>{setScreen('skins');this.updateSkins();});
			this.onClick(e,'btn-settings',()=>{setScreen('settings');this.updateSettings();});
			this.onClick(e,'btn-help',()=>setScreen('help'));
		}else if(name==='mode'){
			for(const[btn,mode]of[['btn-vsai','vsai'],['btn-local','local'],['btn-timed','timed'],['btn-blitz','blitz'],['btn-daily','daily'],['btn-practice','practice']]){
				this.onClick(e,btn,()=>{gameMode=mode;
					if(mode==='vsai')setScreen('difficulty');
					else{difficulty=mode==='practice'?0:2;this.startCountdown();}
				});
			}
			this.onClick(e,'btn-mode-back',()=>setScreen('title'));
		}else if(name==='diff'){
			this.onClick(e,'btn-easy',()=>{difficulty=1;this.startCountdown();});
			this.onClick(e,'btn-medium',()=>{difficulty=2;this.startCountdown();});
			this.onClick(e,'btn-hard',()=>{difficulty=3;this.startCountdown();});
			this.onClick(e,'btn-expert',()=>{difficulty=4;this.startCountdown();});
			this.onClick(e,'btn-diff-back',()=>setScreen('mode'));
		}else if(name==='pause'){
			this.onClick(e,'btn-resume',()=>setScreen('playing'));
			this.onClick(e,'btn-undo',()=>{if(gameState.history.length>=2){
				// undo two moves (player+AI)
				const theme=THEMES[stats.themeIdx];
				for(let i=0;i<(gameMode==='vsai'?2:1);i++){
					if(gameState.history.length===0)break;
					const last=gameState.history[gameState.history.length-1];
					// rebuild state by replaying all moves except last
					const moves=[...gameState.history];moves.pop();
					gameState={board:initBoard(),turn:'w',castle:{K:true,Q:true,k:true,q:true},epTarget:null,halfMove:0,fullMove:1,history:[],posHistory:[]};
					gameState.posHistory.push(boardKey(gameState));
					for(const m of moves)gameState=makeMove(gameState,m);
				}
				buildPieces(theme);updateLastMoveHighlight();
				setScreen('playing');
			}});
			this.onClick(e,'btn-quit',()=>{setScreen('title');});
		}else if(name==='go'){
			this.onClick(e,'btn-rematch',()=>{this.startCountdown();});
			this.onClick(e,'btn-go-menu',()=>setScreen('title'));
		}else if(name==='settings'){
			this.onClick(e,'btn-master-down',()=>{masterVol=Math.max(0,masterVol-0.1);if(masterGain)masterGain.gain.value=masterVol;this.updateSettings();});
			this.onClick(e,'btn-master-up',()=>{masterVol=Math.min(1,masterVol+0.1);if(masterGain)masterGain.gain.value=masterVol;this.updateSettings();});
			this.onClick(e,'btn-sfx-down',()=>{sfxVol=Math.max(0,sfxVol-0.1);if(sfxGain)sfxGain.gain.value=sfxVol;this.updateSettings();});
			this.onClick(e,'btn-sfx-up',()=>{sfxVol=Math.min(1,sfxVol+0.1);if(sfxGain)sfxGain.gain.value=sfxVol;this.updateSettings();});
			this.onClick(e,'btn-music-down',()=>{musicVol=Math.max(0,musicVol-0.1);if(musicGain)musicGain.gain.value=musicVol;this.updateSettings();});
			this.onClick(e,'btn-music-up',()=>{musicVol=Math.min(1,musicVol+0.1);if(musicGain)musicGain.gain.value=musicVol;this.updateSettings();});
			this.onClick(e,'btn-theme-prev',()=>{stats.themeIdx=(stats.themeIdx-1+THEMES.length)%THEMES.length;this.applyTheme();this.updateSettings();saveStats(stats);});
			this.onClick(e,'btn-theme-next',()=>{stats.themeIdx=(stats.themeIdx+1)%THEMES.length;this.applyTheme();this.updateSettings();saveStats(stats);});
			this.onClick(e,'btn-settings-back',()=>setScreen('title'));
		}else if(name==='help'){
			this.onClick(e,'btn-help-back',()=>setScreen('title'));
		}else if(name==='ach'){
			this.onClick(e,'btn-ach-prev',()=>{stats.achPage=Math.max(0,stats.achPage-1);this.updateAchievements();});
			this.onClick(e,'btn-ach-next',()=>{stats.achPage=Math.min(Math.floor((ACHIEVEMENTS.length-1)/20),stats.achPage+1);this.updateAchievements();});
			this.onClick(e,'btn-ach-back',()=>setScreen('title'));
		}else if(name==='stats'){
			this.onClick(e,'btn-stats-back',()=>setScreen('title'));
		}else if(name==='skins'){
			for(let i=0;i<8;i++){this.onClick(e,`skin-${i}`,()=>{if(SKINS[i].check(stats)){stats.skinIdx=i;this.updateSkins();this.applyTheme();saveStats(stats);}});}
			this.onClick(e,'btn-skins-back',()=>setScreen('title'));
		}else if(name==='lb'){
			this.onClick(e,'btn-lb-back',()=>setScreen('title'));
		}else if(name==='promo'){
			const own=gameState?.turn==='w';// promotion happens before turn flip, but pending is set before makeMove
			this.onClick(e,'btn-promo-queen',()=>{if(pendingPromotion){pendingPromotion.promotion=pendingPromotion.piece<=6?WQ:BQ;executeMove(pendingPromotion);pendingPromotion=null;setScreen('playing');}});
			this.onClick(e,'btn-promo-rook',()=>{if(pendingPromotion){pendingPromotion.promotion=pendingPromotion.piece<=6?WR:BR;executeMove(pendingPromotion);pendingPromotion=null;setScreen('playing');}});
			this.onClick(e,'btn-promo-bishop',()=>{if(pendingPromotion){pendingPromotion.promotion=pendingPromotion.piece<=6?WB:BB;executeMove(pendingPromotion);pendingPromotion=null;setScreen('playing');}});
			this.onClick(e,'btn-promo-knight',()=>{if(pendingPromotion){pendingPromotion.promotion=pendingPromotion.piece<=6?WN:BN;executeMove(pendingPromotion);pendingPromotion=null;setScreen('playing');}});
		}
	}

	startCountdown(){
		initAudio();startDrone();
		newGame();
		const theme=THEMES[stats.themeIdx];
		buildPieces(theme);hideMoveIndicators();
		if(lastMoveFrom)lastMoveFrom.visible=false;if(lastMoveTo)lastMoveTo.visible=false;
		countdownValue=3;countdownTimer=1.0;
		setScreen('countdown');
	}

	applyTheme(){
		const theme=THEMES[stats.themeIdx];
		buildBoard(this.scene,theme);buildPieces(theme);
		// update environment colors
		this.scene.fog=new Fog(new Color(theme.fogC),5,25);
		this.scene.background=new Color(theme.bg);
	}

	updateSettings(){
		const e=this.docs['settings']?.entity;if(!e)return;
		this.setText(e,'val-master',Math.round(masterVol*100)+'%');
		this.setText(e,'val-sfx',Math.round(sfxVol*100)+'%');
		this.setText(e,'val-music',Math.round(musicVol*100)+'%');
		this.setText(e,'val-theme',THEMES[stats.themeIdx].name);
	}
	updateAchievements(){
		const e=this.docs['ach']?.entity;if(!e)return;
		const page=stats.achPage;const start=page*20;
		for(let i=0;i<20;i++){
			const idx=start+i;const a=ACHIEVEMENTS[idx];
			if(a){const done=stats.achUnlocked.has(a.id);this.setText(e,`ach-${i}`,(done?'[X] ':'[ ] ')+a.name+' - '+a.desc);}
			else this.setText(e,`ach-${i}`,'');
		}
		this.setText(e,'ach-page','Page '+(page+1)+'/'+Math.ceil(ACHIEVEMENTS.length/20));
	}
	updateStats(){
		const e=this.docs['stats']?.entity;if(!e)return;
		this.setText(e,'stat-games','Games: '+stats.games);
		this.setText(e,'stat-wins','Wins: '+stats.wins);
		this.setText(e,'stat-losses','Losses: '+stats.losses);
		this.setText(e,'stat-draws','Draws: '+stats.draws);
		this.setText(e,'stat-winrate','Win Rate: '+(stats.games>0?Math.round(stats.wins/stats.games*100):0)+'%');
		this.setText(e,'stat-captures','Total Captures: '+stats.totalCaptures);
		this.setText(e,'stat-checks','Total Checks: '+stats.totalChecks);
		this.setText(e,'stat-mates','Checkmates: '+stats.checkmates);
		this.setText(e,'stat-castles','Castles: '+stats.castles);
		this.setText(e,'stat-promotions','Promotions: '+stats.promotions);
		this.setText(e,'stat-streak','Best Streak: '+stats.bestStreak);
		const title=TITLES[Math.min(Math.floor((stats.level-1)/2.5),TITLES.length-1)];
		this.setText(e,'stat-level','Level: '+stats.level+' - '+title);
	}
	updateSkins(){
		const e=this.docs['skins']?.entity;if(!e)return;
		for(let i=0;i<8;i++){
			const s=SKINS[i];const unlocked=s.check(stats);const equipped=stats.skinIdx===i;
			this.setText(e,`skin-${i}`,s.name+(equipped?' [EQUIPPED]':unlocked?' [UNLOCKED]':' ('+s.unlock+')'));
		}
	}
	updateLeaderboard(){
		const e=this.docs['lb']?.entity;if(!e)return;
		for(let i=0;i<10;i++){
			const entry=stats.leaderboard[i];
			this.setText(e,`lb-${i}`,entry?(i+1)+'. '+entry.score+' pts - '+entry.mode+' - '+entry.moves+' moves':'---');
		}
	}
	updateHUD(){
		const e=this.docs['hud']?.entity;if(!e)return;
		const turnStr=gameState.turn==='w'?'WHITE to move':'BLACK to move';
		this.setText(e,'hud-turn',turnStr);
		const diffNames=['Random','Easy','Medium','Hard','Expert'];
		const modeNames:Record<string,string>={vsai:'VS AI - '+diffNames[difficulty],local:'Local 2P',timed:'Timed 5min',blitz:'Blitz 2min',daily:'Daily Puzzle',practice:'Practice'};
		this.setText(e,'hud-mode',modeNames[gameMode]||gameMode);
		if(timerLimit>0){
			const rem=Math.max(0,timerLimit-gameTimer);const m=Math.floor(rem/60);const s=Math.floor(rem%60);
			this.setText(e,'hud-time',(m<10?'0':'')+m+':'+(s<10?'0':'')+s);
		}else{
			const m=Math.floor(gameTimer/60);const s=Math.floor(gameTimer%60);
			this.setText(e,'hud-time',(m<10?'0':'')+m+':'+(s<10?'0':'')+s);
		}
		this.setText(e,'hud-moves','Moves: '+gameState.history.length);
		if(aiThinking)this.setText(e,'hud-status','AI thinking...');
		else if(inCheck(gameState.board,gameState.turn))this.setText(e,'hud-status','CHECK!');
		else this.setText(e,'hud-status','');
	}
	updateHistory(){
		const e=this.docs['hist']?.entity;if(!e)return;
		const h=gameState.history;const totalPairs=Math.ceil(h.length/2);const startPair=Math.max(0,totalPairs-20);
		for(let i=0;i<20;i++){
			const pairIdx=startPair+i;const mi=pairIdx*2;
			if(mi>=h.length){this.setText(e,`mv-${i}`,'');continue;}
			// rebuild notation - we need the game state at that point
			let s=(pairIdx+1)+'. ';
			// simplified notation from move data
			const m1=h[mi];s+=simpleMoveStr(m1);
			if(mi+1<h.length){const m2=h[mi+1];s+='  '+simpleMoveStr(m2);}
			this.setText(e,`mv-${i}`,s);
		}
	}
	updateGameover(){
		const e=this.docs['go']?.entity;if(!e)return;
		const last=gameState.history.length>0?gameState.history[gameState.history.length-1]:null;
		if(isCheckmate(gameState)){
			this.setText(e,'go-result','CHECKMATE!');
			this.setText(e,'go-winner',(gameState.turn==='w'?'Black':'White')+' Wins');
		}else if(isStalemate(gameState)){
			this.setText(e,'go-result','STALEMATE');this.setText(e,'go-winner','Draw');
		}else{
			this.setText(e,'go-result','DRAW');this.setText(e,'go-winner','Game Over');
		}
		const diffNames=['Random','Easy','Medium','Hard','Expert'];
		const modeNames:Record<string,string>={vsai:'VS AI - '+diffNames[difficulty],local:'Local 2P',timed:'Timed',blitz:'Blitz',daily:'Daily',practice:'Practice'};
		this.setText(e,'go-mode',modeNames[gameMode]||gameMode);
		this.setText(e,'go-moves','Moves: '+gameState.history.length);
		const m=Math.floor(gameTimer/60);const s=Math.floor(gameTimer%60);
		this.setText(e,'go-time','Time: '+(m<10?'0':'')+m+':'+(s<10?'0':'')+s);
		this.setText(e,'go-captures','Captures: '+stats.totalCaptures);
		this.setText(e,'go-checks','Checks: '+checksThisGame);
	}

	update(delta:number,time:number){
		// visibility
		for(const[name,show]of[['title',screenState==='title'],['mode',screenState==='mode'],['diff',screenState==='difficulty'],
			['hud',screenState==='playing'],['pause',screenState==='paused'],['go',screenState==='gameover'],
			['settings',screenState==='settings'],['help',screenState==='help'],['ach',screenState==='achievements'],
			['stats',screenState==='stats'],['skins',screenState==='skins'],['lb',screenState==='leaderboard'],
			['toast',toastTimer>0],['cd',screenState==='countdown'],['promo',screenState==='promote'],
			['hist',screenState==='playing']] as [string,boolean][]){
			if(this.docs[name])this.setVis(this.docs[name].entity,show);
		}
		// title level
		if(screenState==='title'&&this.docs['title']){
			const title=TITLES[Math.min(Math.floor((stats.level-1)/2.5),TITLES.length-1)];
			this.setText(this.docs['title'].entity,'level-display','Level '+stats.level+' -- '+title);
		}
		// countdown
		if(screenState==='countdown'){
			countdownTimer-=delta;
			if(countdownTimer<=0){
				if(countdownValue>1){countdownValue--;countdownTimer=1.0;playCountdown();}
				else{setScreen('playing');timerRunning=true;playGo();}
			}
			if(this.docs['cd'])this.setText(this.docs['cd'].entity,'cd-text',countdownValue<=0?'GO!':countdownValue.toString());
		}
		// timer
		if(screenState==='playing'&&timerRunning){
			gameTimer+=delta;
			if(timerLimit>0&&gameTimer>=timerLimit){
				endGame('Time up!','loss');
			}
		}
		// toast
		if(toastTimer>0){
			toastTimer-=delta;
			if(this.docs['toast'])this.setText(this.docs['toast'].entity,'toast-text',toastText);
		}
		// update HUD
		if(screenState==='playing'){this.updateHUD();this.updateHistory();}
		if(screenState==='gameover')this.updateGameover();
		// particles
		for(let i=particles.length-1;i>=0;i--){
			const p=particles[i];p.life-=delta;
			if(p.life<=0){boardGroup.remove(p.mesh);particles.splice(i,1);continue;}
			p.vel.y-=5*delta;p.mesh.position.add(p.vel.clone().multiplyScalar(delta));
			const mat=p.mesh.material as MeshBasicMaterial;mat.opacity=p.life/p.maxLife*0.8;
		}
		// piece bob for selected
		if(selectedCell&&pieceMeshes[selectedCell[0]]&&pieceMeshes[selectedCell[0]][selectedCell[1]]){
			const pm=pieceMeshes[selectedCell[0]][selectedCell[1]];
			if(pm)pm.position.y=0.01+Math.sin(time*4)*0.01+0.015;
		}
		// floating decorations
		this.scene.traverse((obj:any)=>{
			if(obj.userData.rotSpeed){obj.rotation.y+=obj.userData.rotSpeed*delta;obj.position.y=obj.userData.bobBase+Math.sin(time*obj.userData.bobSpeed)*0.15;}
			if(obj.userData.driftX!==undefined){obj.position.x+=obj.userData.driftX*delta;obj.position.y+=obj.userData.driftY*delta;
				const mat=obj.material as MeshBasicMaterial;if(mat?.opacity!==undefined)mat.opacity=0.15+Math.sin(time*2+obj.userData.pulsePhase)*0.08;
				if(obj.position.y>4){obj.position.y=0;obj.position.x=(Math.random()-0.5)*8;}
			}
		});
		// keyboard input
		const inp=(this.world as any).input as RuntimeInput|undefined;
		if(inp?.keyboard?.getKeyDown('Escape')||inp?.keyboard?.getKeyDown('KeyP')){
			if(screenState==='playing')setScreen('paused');
			else if(screenState==='paused')setScreen('playing');
		}
		if(inp?.keyboard?.getKeyDown('KeyU')&&screenState==='playing'&&gameState.history.length>=2){
			const theme=THEMES[stats.themeIdx];
			const undoCount=gameMode==='vsai'?2:1;
			const moves=[...gameState.history];for(let i=0;i<undoCount;i++)moves.pop();
			gameState={board:initBoard(),turn:'w',castle:{K:true,Q:true,k:true,q:true},epTarget:null,halfMove:0,fullMove:1,history:[],posHistory:[]};
			gameState.posHistory.push(boardKey(gameState));
			for(const m of moves)gameState=makeMove(gameState,m);
			buildPieces(theme);updateLastMoveHighlight();selectedCell=null;hideMoveIndicators();
			showToast('Move undone');
		}
		if(inp?.keyboard?.getKeyDown('KeyH')&&screenState==='playing'&&gameState.turn==='w'&&!aiThinking){
			const hint=getAIMove(gameState,Math.min(difficulty,2));
			if(hint){
				selectedCell=[hint.fr,hint.fc];
				legalMovesForSelected=getLegalMoves(gameState).filter(m=>m.fr===hint.fr&&m.fc===hint.fc);
				showMoveIndicators();playSelect();showToast('Hint: '+simpleMoveStr(hint));
			}
		}
		if(inp?.keyboard?.getKeyDown('KeyR')&&screenState==='gameover'){
			const sys=world.getSystem(ChessUISystem);if(sys)sys.startCountdown();
		}
		// XR controller input
		const right=inp?.xr?.gamepads?.right;
		if(right){
			if(right.getButtonDown(InputComponent.B_Button)){
				if(screenState==='playing')setScreen('paused');
				else if(screenState==='paused')setScreen('playing');
			}
		}
		// board visibility
		if(boardGroup)boardGroup.visible=screenState==='playing'||screenState==='paused'||screenState==='countdown'||screenState==='promote'||screenState==='gameover';
	}
}

function simpleMoveStr(m:Move):string{
	if(m.castle==='K'||m.castle==='k')return'O-O';
	if(m.castle==='Q'||m.castle==='q')return'O-O-O';
	const t=pieceType(m.piece);let s='';
	if(t>1)s+=['','','N','B','R','Q','K'][t];
	if(m.captured!==E||m.enPassant){if(t===1)s+=FILES[m.fc];s+='x';}
	s+=FILES[m.tc]+(8-m.tr);
	if(m.promotion)s+='='+['','','N','B','R','Q','K'][pieceType(m.promotion)];
	return s;
}

// ─── CLICK HANDLING ─────────────────────────────────────────────────
function handleBoardClick(r:number,c:number){
	if(screenState!=='playing'||aiThinking)return;
	if(gameMode==='vsai'&&gameState.turn==='b')return;// AI's turn
	initAudio();
	const p=gameState.board[r][c];
	// if clicking on own piece, select it
	const ownColor=gameState.turn;
	if(p!==E&&pieceColor(p)===ownColor){
		// deselect if same
		if(selectedCell&&selectedCell[0]===r&&selectedCell[1]===c){
			// reset prev piece position
			const pm=pieceMeshes[r][c];if(pm)pm.position.y=0.01;
			selectedCell=null;legalMovesForSelected=[];hideMoveIndicators();return;
		}
		// reset prev piece position
		if(selectedCell){const pm=pieceMeshes[selectedCell[0]][selectedCell[1]];if(pm)pm.position.y=0.01;}
		selectedCell=[r,c];
		legalMovesForSelected=getLegalMoves(gameState).filter(m=>m.fr===r&&m.fc===c);
		showMoveIndicators();playSelect();return;
	}
	// if piece selected and clicking a valid move target
	if(selectedCell){
		const move=legalMovesForSelected.find(m=>m.tr===r&&m.tc===c);
		if(move){
			// reset selected piece height
			const pm=pieceMeshes[selectedCell[0]][selectedCell[1]];if(pm)pm.position.y=0.01;
			// check for promotion
			if(pieceType(move.piece)===1&&(r===0||r===7)&&!move.promotion){
				pendingPromotion={...move};setScreen('promote');return;
			}
			executeMove(move);
		}else{
			// reset prev piece position
			const pm=pieceMeshes[selectedCell[0]][selectedCell[1]];if(pm)pm.position.y=0.01;
			selectedCell=null;legalMovesForSelected=[];hideMoveIndicators();
		}
	}
}

// ─── MAIN ENTRY ──────────────────────────────────────────────────────
async function main(){
	const container=document.getElementById('app') as HTMLDivElement;
	world=await World.create(container,{
		xr:{offer:'once'},
		features:{locomotion:{browserControls:true} as any},
	} as any);

	stats=loadStats();
	const theme=THEMES[stats.themeIdx];
	buildBoard(world.scene,theme);
	buildEnvironment(world.scene,theme);
	newGame();

	// create panel entities
	const panelConfigs=[
		{config:'./ui/title.json',pos:[0,1.8,-3],scale:0.004,screen:true},
		{config:'./ui/mode.json',pos:[0,1.8,-3],scale:0.004,screen:true},
		{config:'./ui/difficulty.json',pos:[0,1.8,-3],scale:0.004,screen:true},
		{config:'./ui/hud.json',pos:[0,0,0],scale:0.002,follower:true},
		{config:'./ui/pause.json',pos:[0,1.8,-3],scale:0.004,screen:true},
		{config:'./ui/gameover.json',pos:[0,1.8,-3],scale:0.004,screen:true},
		{config:'./ui/settings.json',pos:[0,1.8,-3],scale:0.004,screen:true},
		{config:'./ui/help.json',pos:[0,1.8,-3],scale:0.004,screen:true},
		{config:'./ui/achievements.json',pos:[0,1.8,-3],scale:0.004,screen:true},
		{config:'./ui/stats.json',pos:[0,1.8,-3],scale:0.004,screen:true},
		{config:'./ui/skins.json',pos:[0,1.8,-3],scale:0.004,screen:true},
		{config:'./ui/leaderboard.json',pos:[0,1.8,-3],scale:0.004,screen:true},
		{config:'./ui/toast.json',pos:[0,0,0],scale:0.002,follower:true,offsetY:0.15},
		{config:'./ui/countdown.json',pos:[0,0,0],scale:0.003,follower:true},
		{config:'./ui/promote.json',pos:[0,1.5,-2.5],scale:0.004,screen:true},
		{config:'./ui/history.json',pos:[1.2,1.5,-2.5],scale:0.003},
	];

	for(const pc of panelConfigs){
		const entity=world.createTransformEntity(undefined,{persistent:true});
		entity.object3D!.position.set(pc.pos[0],pc.pos[1],pc.pos[2]);
		entity.object3D!.scale.setScalar(pc.scale);
		entity.addComponent(PanelUI,{config:pc.config});
		if(pc.follower){
			entity.addComponent(Follower,{target:world.player.head});
			const offsetVec=entity.getVectorView(Follower,'offsetPosition');
			if(offsetVec){offsetVec[0]=0;offsetVec[1]=pc.offsetY||0.1;offsetVec[2]=-0.5;}
		}
		if(pc.screen){entity.addComponent(ScreenSpace);}
	}

	world.registerSystem(ChessUISystem);

	// mouse click handler
	const canvas=container.querySelector('canvas');
	if(canvas){
		canvas.addEventListener('click',(ev:MouseEvent)=>{
			if(screenState!=='playing')return;
			const rect=canvas.getBoundingClientRect();
			mouseNDC.x=((ev.clientX-rect.left)/rect.width)*2-1;
			mouseNDC.y=-((ev.clientY-rect.top)/rect.height)*2+1;
			raycaster.setFromCamera(mouseNDC,world.camera);
			// raycast against board cells
			const flatCells:Mesh[]=[];
			for(let r=0;r<8;r++)for(let c=0;c<8;c++)flatCells.push(cellMeshes[r][c]);
			const hits=raycaster.intersectObjects(flatCells,false);
			if(hits.length>0){
				const hit=hits[0].object;
				const row=hit.userData.row as number;const col=hit.userData.col as number;
				if(row!==undefined&&col!==undefined)handleBoardClick(row,col);
			}
		});
	}
}

main();
