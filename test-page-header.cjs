const fs=require('fs'),vm=require('vm'),assert=require('assert');
const source=fs.readFileSync(process.argv[2]||'index.html','utf8');
const grab=name=>{const s=source.indexOf((name==='openTab'?'async ':'')+'function '+name+'(');assert(s>=0,name+' exists');const tail=source.slice(s);if(name==='openTab')return tail.slice(0,tail.indexOf('function setupAppBackNavigation'));return tail.split('\n')[0]};
const classes=new Set(),elements={'.app':{classList:{toggle:(c,on)=>on?classes.add(c):classes.delete(c),contains:c=>classes.has(c)}}},ctx={window:{},location:{href:'fixture'},data:{농장정보:[{농장명:'청운농장'}]},tab:'home',house:0,admin:'',busy:false,current:()=>({}),ageAt:()=>8,placement:()=> '2026-10-23',drawNav:()=>{},flLock:()=>{},stopOverviewRefresh:()=>{},pageLabel:n=>n+' 자료'};
for(const key of ['#farmTitle','#ageTitle','#overviewDate','#view'])elements[key]={};ctx.$=s=>elements[s]||null;let visited=[];ctx.pull=async(show,name)=>{assert(!classes.has('overview-mode'),'loading screen must already use normal header');visited.push(name)};ctx.ledgerView=async()=>{assert(!classes.has('overview-mode'));visited.push('ledger')};ctx.protectedLoginView=()=>{assert(!classes.has('overview-mode'),'auth guard must reset header');visited.push('login')};
for(const n of ['homeView','journalView','shipView','settingsView','haccpView','overviewView'])ctx[n]=()=>visited.push(n);
vm.createContext(ctx);vm.runInContext(grab('syncPageHeader')+'\n'+grab('page')+'\n'+grab('render')+'\n'+grab('openTab'),ctx);
const overview=()=>{ctx.tab='overview';ctx.syncPageHeader();assert(classes.has('overview-mode'));assert.equal(elements['#ageTitle'].textContent,'현재 8일령');assert(elements['#overviewDate'].innerHTML.includes('2026-10-23'))};
(async()=>{
 for(const name of ['home','journal','ship','settings','haccp','ledger'])for(const auth of ['', 'mock']){overview();ctx.admin=auth;await ctx.openTab(name,false);assert.equal(ctx.tab,name);assert(!classes.has('overview-mode'));assert.equal(elements['#overviewDate'].innerHTML,'');assert.equal(elements['#ageTitle'].textContent,'입추 2026-10-23 · 8일령')}
 // Direct page draws (ledger details/login/back) must repair stale overview state too.
 overview();ctx.tab='ledger';ctx.admin='mock';ctx.page('장부','','<p>fixture</p>');assert(!classes.has('overview-mode'));assert.equal(elements['#overviewDate'].innerHTML,'');
 overview();ctx.tab='ship';ctx.admin='';ctx.render();assert(!classes.has('overview-mode'));assert.equal(visited.at(-1),'login');
 // Entering overview restores its title/date layout; regular subpages do not alter report state.
 ctx.tab='overview';ctx.admin='mock';ctx.render();assert(classes.has('overview-mode'));assert.equal(visited.at(-1),'overviewView');ctx.tab='settings';classes.add('report-review');ctx.page('보고서','','');assert(classes.has('report-review'));assert(!classes.has('overview-mode'));
 ctx.current=()=>null;ctx.tab='home';ctx.syncPageHeader();assert.equal(elements['#ageTitle'].textContent,'현재 사육 없음');assert.equal(elements['#overviewDate'].innerHTML,'');
 assert(source.includes('setupAppBackNavigation'));assert(source.includes('trackHistory'));console.log('PASS: overview → all 6 menus, locked/unlocked screens, direct ledger/subpage draws, back-navigation path, overview re-entry and report-review class preservation');
})().catch(e=>{console.error(e);process.exit(1)});
