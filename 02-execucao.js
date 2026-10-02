/* Solive · Orçamentação — 02-execucao.js
   Portão de execução: adjudicações e variações (Estimado → Adjudicado → Real).
   Versão: ver APP_REGISTAR no fim do ficheiro (tem de ser igual à do index.html). */

/* ================= PORTÃO DE EXECUÇÃO (Estimado -> Adjudicado -> Real) ================= */
const GX_MOTIVOS=[
  ['ALTERACAO_PROJETO','Alteração de projeto / cliente'],
  ['ERRO_OMISSAO','Erro ou omissão de medição'],
  ['PRECO_MERCADO','Preço de mercado / revisão'],
  ['QUANTIDADES','Acerto de quantidades'],
  ['CONDICOES_IMPREVISTAS','Condições imprevistas'],
  ['PRODUTIVIDADE','Produtividade / execução'],
  ['OUTRO','Outro']
];
let GX_ROWS=[]; let GX_VARS={};
const GX_MOTLBL=Object.fromEntries(GX_MOTIVOS);
function gxProjAtual(){ const s=document.getElementById('gxProj'); return s?s.value:''; }
async function gxRender(){
  const sel=document.getElementById('gxProj'); if(!sel) return;
  const nomes=PROJETOS.map(p=>p.nome);
  const atual = sel.value || (typeof CTX!=='undefined'&&CTX.nome) || (typeof ORC_META!=='undefined'&&ORC_META.nome) || nomes[0] || '';
  sel.innerHTML = nomes.length? nomes.map(n=>`<option>${esc(n)}</option>`).join("") : '<option value="">— sem projetos —</option>';
  if(nomes.includes(atual)) sel.value=atual;
  const mot=document.getElementById('gxVarMot'); if(mot) mot.innerHTML=GX_MOTIVOS.map(m=>`<option value="${m[0]}">${m[1]}</option>`).join("");
  const cl=document.getElementById('gxCapList'); if(cl && typeof CAPS!=='undefined' && CAPS.length) cl.innerHTML=CAPS.map(c=>`<option value="${esc(c)}">`).join("");
  const d=document.getElementById('gxData'); if(d && !d.value) d.value=new Date().toISOString().slice(0,10);
  await gxLoad();
}
async function gxLoad(){
  const nome=gxProjAtual(); GX_ROWS=[];
  if(nome && sb){
    const {data,error}=await sb.from('v_execucao').select('*').eq('projeto',nome).order('capitulo');
    if(!error && data) GX_ROWS=data;
    else if(error) console.warn('gxLoad',error);
  }
  GX_VARS={};
  if(GX_ROWS.length && sb){
    const ids=GX_ROWS.map(a=>a.id);
    const {data:vv}=await sb.from('variacoes').select('*').in('adjudicacao_id',ids).order('data');
    (vv||[]).forEach(v=>{ (GX_VARS[v.adjudicacao_id]=GX_VARS[v.adjudicacao_id]||[]).push(v); });
  }
  const vs=document.getElementById('gxVarAdj');
  if(vs) vs.innerHTML = GX_ROWS.length? GX_ROWS.map(a=>`<option value="${a.id}">${esc(a.capitulo)}${a.pacote?' — '+esc(a.pacote):''}${a.fornecedor?' ('+esc(a.fornecedor)+')':''}</option>`).join("") : '<option value="">— sem adjudicações —</option>';
  gxPaint();
}
function gxEUR(n){ return (n==null||isNaN(n))?'—':Number(n).toLocaleString('pt-PT',{maximumFractionDigits:0})+' €'; }
function gxPct(n){ return (n==null||isNaN(n))?'':((n>0?'+':'')+n.toFixed(1)+'%'); }
function gxDataPT(d){ if(!d) return '—'; const m=String(d).match(/^(\d{4})-(\d{2})-(\d{2})/); return m?m[3]+'/'+m[2]+'/'+m[1]:esc(d); }
function gxVarSoma(id){ return (GX_VARS[id]||[]).reduce((s,v)=>s+(Number(v.valor)||0),0); }
/* sinal: positivo (custa mais) a vermelho de alerta, negativo (poupança) a verde */
function gxSinal(v,txt){ return '<span class="'+(v>0.5?'lg-neg':(v<-0.5?'lg-pos':''))+'">'+txt+'</span>'; }
/* Fase 6: pacotes (Capítulo · Subempreiteiro · Data · Orçado · Contrato · Variações · Desvio) e,
   à parte, a lista de variações com data, pacote, descrição, motivo e valor com sinal. */
function gxPaint(){
  const tb=document.getElementById('gxBody'), ft=document.getElementById('gxFoot'), em=document.getElementById('gxEmpty');
  if(!tb) return;
  if(em) em.classList.toggle('hidden', GX_ROWS.length>0);
  let sO=0,sC=0,sV=0,sR=0;
  tb.innerHTML = GX_ROWS.map(a=>{
    const orc=Number(a.estimado)||0, con=Number(a.adjudicado)||0, real=Number(a.real_atual)||0, vr=gxVarSoma(a.id);
    sO+=orc; sC+=con; sV+=vr; sR+=real;
    const dv=orc?(con+vr-orc):null, dp=orc?(dv/orc*100):null;
    const nv=(GX_VARS[a.id]||[]).length;
    return `<tr>
      <td><b>${esc(a.capitulo)}</b>${a.pacote?'<span class="lg-sub-l">'+esc(a.pacote)+'</span>':''}</td>
      <td>${esc(a.fornecedor||'—')}</td>
      <td>${gxDataPT(a.data_adjudicacao)}</td>
      <td class="num">${orc?gxEUR(orc):'—'}</td>
      <td class="num"><b>${gxEUR(con)}</b>${real?'<span class="lg-sub-l">real '+gxEUR(real)+'</span>':''}</td>
      <td class="num">${nv?gxSinal(vr,(vr>0?'+':'')+gxEUR(vr))+'<span class="lg-sub-l">'+nv+(nv===1?' variação':' variações')+'</span>':'<span class="lg-miss">—</span>'}</td>
      <td class="num">${dv==null?'<span class="lg-miss">sem orçado</span>':gxSinal(dv,(dv>0?'+':'')+gxEUR(dv))+'<span class="lg-sub-l">'+gxPct(dp)+'</span>'}</td>
      <td><button class="lg-iconbtn" type="button" onclick="gxDelAdj(${a.id})" title="Remover adjudicação" aria-label="Remover adjudicação"><i class="icon-trash-2" aria-hidden="true"></i></button></td>
    </tr>`;
  }).join("");
  const dT=sO?(sC+sV-sO):null;
  ft.innerHTML = GX_ROWS.length? `<tr><td>Total</td><td></td><td></td><td class="num">${gxEUR(sO)}</td><td class="num">${gxEUR(sC)}</td><td class="num">${gxSinal(sV,(sV>0?'+':'')+gxEUR(sV))}</td><td class="num">${dT==null?'—':gxSinal(dT,(dT>0?'+':'')+gxEUR(dT))}</td><td></td></tr>` : '';
  /* indicadores */
  const set=(id,v)=>{ const e=document.getElementById(id); if(e) e.innerHTML=v; };
  set('gxKOrc',GX_ROWS.length?gxEUR(sO):'—'); set('gxKCon',GX_ROWS.length?gxEUR(sC):'—');
  set('gxKConS',GX_ROWS.length?(GX_ROWS.length+' pacote(s)'+(sO?' · '+gxPct((sC/sO-1)*100)+' na adjudicação':'')):'');
  const nV=Object.values(GX_VARS).reduce((s,l)=>s+l.length,0);
  set('gxKVar',nV?gxSinal(sV,(sV>0?'+':'')+gxEUR(sV)):'—'); set('gxKVarS',nV?(nV+' registada(s) com motivo'):'sem variações');
  set('gxKDes',dT==null?'—':gxSinal(dT,(dT>0?'+':'')+gxEUR(dT))); set('gxKDesS',dT==null?'contrato + variações − orçado':(gxPct(dT/sO*100)+' · contrato + variações − orçado'));
  /* lista de variações */
  const vb=document.getElementById('gxVarBody'), ve=document.getElementById('gxVarEmpty');
  if(vb){
    const pac={}; GX_ROWS.forEach(a=>pac[a.id]=a);
    const todas=[].concat(...Object.values(GX_VARS)).sort((x,y)=>String(y.data||'').localeCompare(String(x.data||'')));
    vb.innerHTML=todas.map(v=>{ const a=pac[v.adjudicacao_id]||{}; const val=Number(v.valor)||0;
      return `<tr><td>${gxDataPT(v.data)}</td><td><b>${esc(a.capitulo||'—')}</b>${a.fornecedor?'<span class="lg-sub-l">'+esc(a.fornecedor)+'</span>':''}</td>
        <td>${esc(v.descricao||'—')}</td><td><span class="lg-badge">${esc(GX_MOTLBL[v.motivo]||v.motivo||'—')}</span></td>
        <td class="num">${gxSinal(val,(val>0?'+':(val<0?'−':''))+gxEUR(Math.abs(val)))}</td>
        <td><button class="lg-iconbtn" type="button" onclick="gxDelVar(${v.id})" title="Apagar variação" aria-label="Apagar variação"><i class="icon-trash-2" aria-hidden="true"></i></button></td></tr>`; }).join('');
    if(ve) ve.classList.toggle('hidden',todas.length>0);
  }
  try{ lgGuiaAtualizar('execucao'); }catch(e){}
}
function gxAbrirModal(id){
  if(id==='gxVarModal'&&!GX_ROWS.length) return alertx("Regista primeiro a adjudicação do pacote: a variação fica ligada a ela.");
  const m=document.getElementById(id); if(!m) return; m.classList.remove('hidden');
  const f=m.querySelector('input,select'); if(f) setTimeout(()=>f.focus(),30);
}
function gxFecharModal(id){ const m=document.getElementById(id); if(m) m.classList.add('hidden'); }
function gxRegistarAdjudicacao(){ gxAbrirModal('gxAdjModal'); }
document.addEventListener('keydown',e=>{ if(e.key==='Escape') ['gxAdjModal','gxVarModal'].forEach(gxFecharModal); });
/* exportação: pacotes e variações num só livro */
function gxExportar(){
  if(!GX_ROWS.length){ toast("Sem adjudicações para exportar."); return; }
  const nome=gxProjAtual()||'Projeto';
  const pac=[["SOLIVE — ADJUDICAÇÕES E DESVIOS"],["Projeto: "+nome+"   ·   Data: "+new Date().toLocaleDateString('pt-PT')],[],
    ["Capítulo","Pacote","Subempreiteiro","Data","Orçado (€)","Contrato (€)","Variações (€)","Desvio (€)","Desvio (%)","Real (€)"]]
    .concat(GX_ROWS.map(a=>{ const o=Number(a.estimado)||0, cn=Number(a.adjudicado)||0, vr=gxVarSoma(a.id), d=o?cn+vr-o:null;
      return [a.capitulo,a.pacote||"",a.fornecedor||"",a.data_adjudicacao||"",o||"",cn,vr,d==null?"":Math.round(d),d==null?"":Math.round(d/o*1000)/10,Number(a.real_atual)||""]; }));
  const pk={}; GX_ROWS.forEach(a=>pk[a.id]=a);
  const vars=[["Data","Capítulo","Subempreiteiro","Descrição","Motivo","Valor (€)","Aprovado por"]]
    .concat([].concat(...Object.values(GX_VARS)).map(v=>[v.data||"",(pk[v.adjudicacao_id]||{}).capitulo||"",(pk[v.adjudicacao_id]||{}).fornecedor||"",v.descricao||"",GX_MOTLBL[v.motivo]||v.motivo||"",Number(v.valor)||0,v.aprovado_por||""]));
  const wb=XLSX.utils.book_new();
  const w1=XLSX.utils.aoa_to_sheet(pac); w1['!cols']=[{wch:30},{wch:26},{wch:24},{wch:12},{wch:14},{wch:14},{wch:14},{wch:14},{wch:10},{wch:14}];
  const w2=XLSX.utils.aoa_to_sheet(vars); w2['!cols']=[{wch:12},{wch:28},{wch:24},{wch:44},{wch:30},{wch:14},{wch:28}];
  XLSX.utils.book_append_sheet(wb,w1,"Pacotes"); XLSX.utils.book_append_sheet(wb,w2,"Variações");
  XLSX.writeFile(wb,("Adjudicacoes_"+nome).replace(/[^\w]+/g,"_")+".xlsx");
}
async function gxAddAdj(){
  if(!SESSION) return alertx("Inicia sessão de gestor para registar adjudicações.");
  const nome=gxProjAtual();
  const cap=(document.getElementById('gxCap').value||'').trim();
  const adj=parseFloat(document.getElementById('gxAdj').value);
  if(!nome||!cap||isNaN(adj)) return alertx("Preenche projeto, capítulo e valor adjudicado.");
  const rec={ projeto:nome, capitulo:cap,
    pacote:(document.getElementById('gxPac').value||'').trim()||null,
    fornecedor:(document.getElementById('gxForn').value||'').trim()||null,
    estimado: parseFloat(document.getElementById('gxEst').value) || null,
    adjudicado: adj,
    data_adjudicacao: document.getElementById('gxData').value||null,
    estado:'adjudicado' };
  const r=await sbq(sb.from('adjudicacoes').insert(rec),"Registar adjudicação");
  if(r.error) return;
  ['gxCap','gxPac','gxForn','gxEst','gxAdj'].forEach(id=>{const e=document.getElementById(id); if(e)e.value='';});
  gxFecharModal('gxAdjModal');
  toast("Adjudicação registada.");
  await gxLoad();
}
async function gxAddVar(){
  if(!SESSION) return alertx("Inicia sessão de gestor para registar variações.");
  const adjId=document.getElementById('gxVarAdj').value;
  const val=parseFloat(document.getElementById('gxVarVal').value);
  const mot=document.getElementById('gxVarMot').value;
  if(!adjId||isNaN(val)||!mot) return alertx("Escolhe a adjudicação, o valor e o motivo.");
  const rec={ adjudicacao_id:Number(adjId), valor:val, motivo:mot,
    descricao:(document.getElementById('gxVarDesc').value||'').trim()||null,
    aprovado_por: (SESSION&&((SESSION.user&&SESSION.user.email)||SESSION.email))||null };
  const r=await sbq(sb.from('variacoes').insert(rec),"Registar variação");
  if(r.error) return;
  ['gxVarVal','gxVarDesc'].forEach(id=>{const e=document.getElementById(id); if(e)e.value='';});
  gxFecharModal('gxVarModal');
  toast("Variação registada com motivo.");
  await gxLoad();
}
async function gxDelVar(id){
  if(!SESSION) return alertx("Inicia sessão para apagar variações.");
  if(!confirm("Apagar esta variação?")) return;
  const r=await sbq(sb.from('variacoes').delete().eq('id',id),"Apagar variação");
  if(r.error) return;
  await gxLoad();
}
async function gxDelAdj(id){
  if(!SESSION) return alertx("Inicia sessão para remover.");
  if(!confirm("Remover esta adjudicação e as suas variações?")) return;
  const r=await sbq(sb.from('adjudicacoes').delete().eq('id',id),"Remover adjudicação");
  if(r.error) return;
  await gxLoad();
}

APP_REGISTAR('02-execucao','3.5.0');
