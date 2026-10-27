const fs=require('fs'),vm=require('vm'),assert=require('assert');
const source=fs.readFileSync(process.argv[2]||'index.html','utf8');
const fn=source.match(/function checkView\(h,d\).*?(?=\n|$)/)[0];
async function test(old){let renders=0,saved;const nodes={},items=['급수 상태','온도·습도'],buttons=items.map(x=>({dataset:{item:x}}));let ctx;
ctx={ITEMS:items,data:{일일점검:old?[old]:[]},dateAt:()=> '2026-10-27',esc:x=>x,placement:()=> 'flock',journalView:()=>{},alert:m=>{throw Error(m)},document:{querySelectorAll:()=>buttons},$:s=>nodes[s],page:(a,b,html)=>{renders++;for(const id of ['temp','hum','detail','allOk','backJournal','saveCheck']){const match=html.match(new RegExp('id="'+id+'"[^>]*value="([^"]*)"'));nodes['#'+id]={value:match?match[1]:id==='detail'?(old?.내용및조치||''):''}}},save:async(t,row)=>{saved=row;return false}};
vm.createContext(ctx);vm.runInContext(fn,ctx);ctx.checkView(1,20);
if(old){assert.equal(nodes['#temp'].value,'0');assert.equal(nodes['#hum'].value,'0')}
const temp=nodes['#temp'],hum=nodes['#hum'],detail=nodes['#detail'];temp.value='29.7';hum.value='73';detail.value='환기 조정 후 확인';
nodes['#allOk'].onclick();assert.equal(renders,1);assert.equal(nodes['#temp'],temp);assert.equal(temp.value,'29.7');assert.equal(hum.value,'73');assert.equal(detail.value,'환기 조정 후 확인');assert(buttons.every(b=>b.className==='ok'));
buttons[0].onclick();assert.equal(buttons[0].className,'bad');assert.equal(temp.value,'29.7');assert.equal(detail.value,'환기 조정 후 확인');
await nodes['#saveCheck'].onclick();assert.equal(saved.온도,'29.7');assert.equal(saved.습도,73);assert.equal(saved.내용및조치,'환기 조정 후 확인');assert.equal(saved.결과,'이상');assert.equal(renders,1);
buttons[0].onclick();await nodes['#saveCheck'].onclick();assert.equal(saved.결과,'정상');assert.equal(saved.온도,'29.7');assert.equal(nodes['#temp'],temp);
}
(async()=>{await test(null);await test({동:1,일령:20,온도:0,습도:0,점검항목:'급수 상태:정상',내용및조치:'이전 내용'});console.log('PASS new/existing checks: all-normal and individual toggles preserve input nodes, temperature, humidity, details; save payload correct; failed save retains edits; zero values preserved')})().catch(e=>{console.error(e);process.exit(1)});
