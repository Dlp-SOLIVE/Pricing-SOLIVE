/* Solive · Orçamentação — 08-contexto.js
   Projeto ativo (contexto único), descritores, desempenho (snapshot), ergonomia, leitor de pricing sheet completo e guarda contra obra errada.
   Versão: ver APP_REGISTAR no fim do ficheiro (tem de ser igual à do index.html). */

/* ==========================================================================
   v2.2 — CONTEXTO DE PROJETO, DESEMPENHO E ERGONOMIA
   ========================================================================== */

/* ---------- 1. Feedback: um único canal ----------
   Havia dois sistemas de notificação em cantos opostos do ecrã. Passa a haver um. */

let _busy=0;
function busy(on,msg){
  const bar=document.getElementById('busy');
  _busy=Math.max(0,_busy+(on?1:-1));
  if(bar) bar.className=_busy>0?'on':'done';
  document.querySelectorAll('.busytxt').forEach(e=>e.remove());
  if(_busy>0&&msg){
    const d=document.createElement('div'); d.className='busytxt'; d.textContent=msg;
    document.body.appendChild(d);
  }
  if(_busy===0&&bar) setTimeout(()=>{if(_busy===0)bar.className=''},700);
}
async function comBusy(msg,fn){ busy(true,msg); try{ return await fn() } finally { busy(false) } }

/* Confirmação para ações destrutivas — antes desapareciam ao primeiro clique. */
function confirmar(msg){ return window.confirm(msg) }

/* ---------- 2. CONTEXTO DE PROJETO ----------
   O problema estrutural da v2.1: oito seletores de projeto independentes e quatro
   campos de ABC. Bastava uma diferença de grafia para o mesmo projeto se dividir
   em três registos sem aviso. Passa a existir um único projeto ativo. */
let CTX={nome:"",D:{abc:null,acima:null,abaixo:null,fogos:null,pisosA:null,pisosB:null,implantacao:null,lote:null,park:null},novo:true};
const CTX_CAMPOS=[["abc","ABC","m²"],["acima","Acima solo","m²"],["abaixo","Abaixo solo","m²"],
  ["fogos","Fogos",""],["pisosA","Pisos elev.",""],["pisosB","Pisos ent.",""],
  ["implantacao","Implantação","m²"],["lote","Lote","m²"],["park","Estac.",""]];

function ctxAplicar(){
  /* espelha o contexto nos campos que o resto da aplicação já lê — sem reescrever
     todas as vistas, mas com uma única fonte de verdade */
  const set=(id,v)=>{const e=document.getElementById(id); if(e) e.value=(v==null?"":v)};
  const D=CTX.D;
  set('pNome',CTX.nome); set('estNome',CTX.nome); set('orcNome',CTX.nome); set('cstProj',CTX.nome);
  set('pGFA',D.abc); set('pGCA',D.acima); set('pAbaixo',D.abaixo); set('pFogos',D.fogos);
  set('pPisosAcima',D.pisosA); set('pPisosAbaixo',D.pisosB); set('pImplantacao',D.implantacao);
  set('pLote',D.lote); set('pEstacionamento',D.park);
  set('estAbc',D.abc); set('estAcima',D.acima); set('estAbaixo',D.abaixo); set('estFogos',D.fogos);
  set('estPisosA',D.pisosA); set('estPisosB',D.pisosB); set('estImpl',D.implantacao);
  set('estLote',D.lote); set('estPark',D.park);
  set('orcAbc',D.abc); set('orcFogos',D.fogos);
  set('foAbc',D.abc); set('foFogos',D.fogos); set('foAcima',D.acima); set('foAbaixo',D.abaixo);
  set('foPisosAcima',D.pisosA); set('foPisosAbaixo',D.pisosB); set('foImplantacao',D.implantacao);
  set('foLote',D.lote); set('foEstacionamento',D.park);
  set('foProjeto',CTX.nome);   // sincroniza sempre: antes só preenchia se estivesse vazio,
                               // e trocar de projeto deixava o Fecho de Obra no anterior
  if(ORC_META) ORC_META.nome=ORC_META.nome||CTX.nome;
  ctxRender();
  saveLocal('ctx',CTX);
}
function ctxResumoHTML(){
  if(!CTX.nome) return '<span class="miss">Sem projeto ativo — escolhe ou escreve um nome em «Projeto ativo», no menu lateral.</span>';
  const partes=CTX_CAMPOS.filter(([k])=>CTX.D[k]!=null)
    .map(([k,l,u])=>`${l} <b>${fmt(CTX.D[k],0)}${u?" "+u:""}</b>`);
  const seg = CTX.D.segmento
    ? `<b style="color:var(--teal)">${esc(segLabel(CTX.D.segmento))}</b>`
    : '<span class="miss" style="font-style:italic">segmento por definir</span>';
  return seg + (partes.length?' · '+partes.join(" · "):'');
}
function toggleCtxLista(ev){
  if(ev){ev.preventDefault();ev.stopPropagation()}
  const box=document.getElementById('ctxLista'); if(!box)return;
  if(!box.classList.contains('hidden')){ box.classList.add('hidden'); return; }
  box.innerHTML="";
  /* Fase 6: «Novo projeto» no topo da lista — limpa o nome para escrever o do projeto novo */
  const novo=document.createElement('button'); novo.type='button'; novo.className='lg-proj-novo';
  novo.innerHTML='<i class="icon-plus" aria-hidden="true"></i>Novo projeto';
  novo.onclick=()=>{ box.classList.add('hidden'); const i=document.getElementById('ctxNome'); if(i){ i.value=''; i.placeholder='Escreve o nome do projeto novo'; i.focus(); } };
  box.appendChild(novo);
  if(!PROJETOS.length){
    box.insertAdjacentHTML('beforeend','<div class="lg-proj-vazio">Ainda não há projetos gravados. Escreve um nome para criar.</div>');
  } else {
    PROJETOS.slice().sort((a,b)=>a.nome.localeCompare(b.nome)).forEach(p=>{
      const d=document.createElement('div');
      d.className='lg-proj-op'+(norm(p.nome)===norm(CTX.nome)?' on':''); d.tabIndex=0; d.setAttribute('role','button');
      d.innerHTML='<b>'+esc(p.nome)+'</b><span>'+[p.segmento?esc(segLabel(p.segmento)):'',p.gfa?fmt(p.gfa,0)+' m²':''].filter(Boolean).join(' · ')+'</span>';
      d.onkeydown=e=>{ if(e.key==='Enter') d.click(); };
      d.onclick=()=>{ box.classList.add('hidden'); document.getElementById('ctxNome').value=p.nome; ctxDefinir(p.nome); };
      box.appendChild(d);
    });
  }
  box.classList.remove('hidden');
}
document.addEventListener('click',e=>{
  const box=document.getElementById('ctxLista');
  if(box&&!box.classList.contains('hidden')&&!e.target.closest('#ctxLista')&&!e.target.closest('#ctxSeta')) box.classList.add('hidden');
});
function ctxRender(){
  document.body.classList.toggle('no-project',!CTX.nome);
  const bar=document.getElementById('ctxDesc'); if(bar) bar.innerHTML=ctxResumoHTML();
  const inp=document.getElementById('ctxNome'); if(inp&&inp.value!==CTX.nome) inp.value=CTX.nome;
  const tag=document.getElementById('ctxNew');
  if(tag) tag.classList.toggle('hidden', !(CTX.nome&&CTX.novo));
  try{ if(typeof lgProjMeta==='function') lgProjMeta(); }catch(e){}
  const eco=CTX.nome
    ? `<span class="pn">${esc(CTX.nome)}</span>${CTX.novo?'<span class="tag">novo</span>':''}<span style="color:#c4ccd8;margin:0 4px">|</span> ${ctxResumoHTML()}`
    : ctxResumoHTML();
  ['anEcho','estEcho','orcEcho'].forEach(id=>{const e=document.getElementById(id); if(e) e.innerHTML=eco});
  try{ if(typeof estPainelDescritores==='function') estPainelDescritores(); }catch(e){}
  ['verProj','mcProj'].forEach(id=>{
    const sel=document.getElementById(id);
    if(sel&&CTX.nome){const o=[...sel.options].find(x=>norm(x.text)===norm(CTX.nome)||norm(x.value)===norm(CTX.nome)); if(o) sel.value=o.value;}
  });
}
async function ctxDefinir(nome){
  nome=(nome||"").trim();
  CTX.nome=nome;
  const p=PROJETOS.find(x=>norm(x.nome)===norm(nome));
  if(p){ CTX.novo=false; CTX.D=descritoresDe(p); }
  else  { CTX.novo=true; }
  ctxAplicar();
  if(p&&SESSION){ await loadOrcBoard(p.nome); }
  await refrescarVistaAtual();
}
/* Trocar de projeto tem de repercutir-se na vista aberta, senão fica-se a olhar
   para os números do projeto anterior sem nada o indicar. */
async function refrescarVistaAtual(){
  const v=['resumo','programa','kit','analisador','estimador','orcamento','consultas','comparar','biblioteca','execucao']
    .find(x=>{const e=document.getElementById('view-'+x);return e&&!e.classList.contains('hidden')});
  if(!v) return;
  try{
    if(v==='resumo'){ await uxRenderResumo(); }
    if(v==='programa'){ await tpRenderPrograma(); }
    if(v==='kit'){ await tpRenderKit(); }
    if(v==='biblioteca'){
      ['verProj'].forEach(preencherProjSelect);   // estes sim funcionam por nome
      renderVersoes();
    }
    if(v==='consultas')  { await refreshConsultas(); }
    if(v==='comparar')   { renderComparar(); }
    if(v==='execucao')   { gxRender(); }
    if(v==='estimador'){
      /* a estimativa anterior é de outro projeto — esconder em vez de a deixar a enganar */
      const r=document.getElementById('estResults');
      if(r&&!r.classList.contains('hidden')){
        r.classList.add('hidden'); EST_LAST=null;
        alertx("Mudaste de projeto — a estimativa anterior foi limpa. Carrega em Estimar outra vez.",true);
      }
    }
  }catch(e){ console.warn('refrescarVistaAtual',e); }
}
function abrirDescritores(){
  const g=(id,v)=>{const e=document.getElementById(id); if(e) e.value=(v==null?"":v)};
  g('dAbc',CTX.D.abc); g('dAcima',CTX.D.acima); g('dAbaixo',CTX.D.abaixo); g('dFogos',CTX.D.fogos);
  g('dPisosA',CTX.D.pisosA); g('dPisosB',CTX.D.pisosB); g('dImpl',CTX.D.implantacao);
  g('dLote',CTX.D.lote); g('dPark',CTX.D.park);
  const seg=document.getElementById('dSeg'); if(seg) seg.innerHTML=segOptions(CTX.D.segmento||"");
  document.getElementById('descOverlay').classList.remove('hidden');
}
function fecharDescritores(){ document.getElementById('descOverlay').classList.add('hidden') }
function guardarDescritores(){
  const n=id=>{const v=parseFloat((document.getElementById(id)||{}).value); return isFinite(v)&&v>0?v:null};
  CTX.D={abc:n('dAbc'),acima:n('dAcima'),abaixo:n('dAbaixo'),fogos:n('dFogos'),
         pisosA:n('dPisosA'),pisosB:n('dPisosB'),implantacao:n('dImpl'),lote:n('dLote'),park:n('dPark'),
         segmento:(document.getElementById('dSeg')||{}).value||null};
  if(CTX.D.abc&&CTX.D.abaixo&&!CTX.D.acima) CTX.D.acima=CTX.D.abc-CTX.D.abaixo;
  ctxAplicar(); fecharDescritores();
  /* persistir o segmento no projeto, se existir na base */
  if(SESSION&&CTX.nome){
    const p=PROJETOS.find(x=>norm(x.nome)===norm(CTX.nome));
    if(p){ sbq(sb.from('projetos').update({segmento:CTX.D.segmento||null}).eq('id',p.id),"Gravar segmento").then(()=>loadProjetos()); }
    else { sb.from('projetos').insert({nome:CTX.nome,gfa:CTX.D.abc||null,ac_abaixo:CTX.D.abaixo||null,fogos:CTX.D.fogos||null,pisos_acima:CTX.D.pisosA||null,pisos_enterrados:CTX.D.pisosB||null,area_implantacao:CTX.D.implantacao||null,area_lote:CTX.D.lote||null,estacionamento:CTX.D.park||null,segmento:CTX.D.segmento||null}).select().single().then(({error})=>{ if(error){alertx("Erro a criar o projeto: "+error.message);} else { loadProjetos(); toast('Projeto "'+CTX.nome+'" criado na base.'); } }); }
  }
  alertx("Descritores aplicados a todos os separadores.",true);
}

/* ---------- 3. Desempenho: fim das consultas em cascata ----------
   gatherProjectData, calibracaoDesvios, loadBenchmarks e renderComparar faziam,
   cada uma, uma consulta por projeto e outra por fase. Com dez projetos eram mais
   de vinte idas ao servidor, em série, com o ecrã parado. Agora: duas consultas. */
const SEGMENTOS=[   /* lista fechada na base (ck_projetos_segmento) */
  {v:"medio",      g:"Médio",      l:"Médio"},
  {v:"medio_alto", g:"Médio-alto", l:"Médio-alto"},
  {v:"premium",    g:"Premium",    l:"Premium"}
];
function segLabel(v){ const s=SEGMENTOS.find(x=>x.v===v); return s? (s.g===s.l?s.l:s.g+" · "+s.l) : "—"; }
function segOptions(sel){ return '<option value="">— não definido —</option>'+
  SEGMENTOS.map(s=>`<option value="${s.v}"${s.v===sel?' selected':''}>${esc(s.g===s.l?s.l:s.g+" — "+s.l)}</option>`).join(""); }
function lurbainNaBase(){ return !!(SESSION && PROJETOS.some(p=>norm(p.nome).includes("URBAIN"))) }

/* ═══════════ FASE 6 · índice de segmento e projeto de referência ═══════════
   Índice relativo por segmento (médio = 1). Quando falta histórico no segmento do
   projeto, um preço de outro segmento converte-se por índice destino / índice origem,
   e fica assinalado. Valores na tabela segmento_indice; editáveis em
   Administração › Segmentos e referência. */
const SEG_IDX_BASE={medio:1, medio_alto:1.15, premium:1.35};
let SEG_IDX=Object.assign({},SEG_IDX_BASE), SEG_IDX_FONTE='omissão';
async function segIndicesCarregar(){
  try{ const r=await sb.from('segmento_indice').select('*'); if(r.error) throw r.error;
    (r.data||[]).forEach(x=>{ if(+x.indice>0) SEG_IDX[x.segmento]=+x.indice; }); SEG_IDX_FONTE=(r.data||[]).length?'base':'omissão';
  }catch(e){ console.warn('segmento_indice',e.message||e); }
}
function segFator(de,para){
  if(!de||!para||de===para) return 1;
  const a=SEG_IDX[de], b=SEG_IDX[para]; return (a>0&&b>0)?b/a:1;
}
/* Projeto de referência: marcado na base (projetos.referencia). Na falta, o L'Urbain;
   sem sessão, os valores embutidos (REF). */
function refProjeto(){
  const P=(typeof PROJETOS!=='undefined'?PROJETOS:[]);
  return P.find(p=>p.referencia)||P.find(p=>norm(p.nome).includes("URBAIN"))||null;
}
function refNome(){ const p=refProjeto(); return p?p.nome:REF.projeto; }
let REF_DADOS=null;   /* {nome, abc, fogos, caps:{cap: custo real}} do projeto de referência */
async function refCarregar(){
  REF_DADOS=null;
  const p=refProjeto(); if(!p||!SESSION) return;
  try{
    const li=await lerLinhasCusto(q=>q.eq('fonte','auto').eq('projeto_id',p.id),'capitulo,total');
    const caps={}; li.forEach(l=>{ const c=l.capitulo||'(sem capítulo)'; caps[c]=(caps[c]||0)+(Number(l.total)||0); });
    const abc=+p.gfa||(norm(p.nome).includes("URBAIN")?REF.gfa:null);
    if(Object.keys(caps).length) REF_DADOS={nome:p.nome,abc,fogos:+p.fogos||null,caps};
  }catch(e){ console.warn('refCarregar',e); }
}
/* sugestão de índices a partir da biblioteca: artigos com a mesma descrição e unidade
   em dois segmentos → mediana da razão dos preços */
async function segSugerir(){
  const vl=await lerLinhasCusto(q=>q.eq('nivel','artigo').gt('preco_unit',0),'descricao,unidade,preco_unit,segmento,fonte');
  const g={};
  vl.filter(r=>r.segmento&&['auto','subempreitada','composto','auto_pu'].includes(r.fonte)).forEach(r=>{
    const k=norm(r.descricao||'').slice(0,70)+'|'+norm(r.unidade||''); (g[k]=g[k]||{}); (g[k][r.segmento]=g[k][r.segmento]||[]).push(+r.preco_unit); });
  const med=a=>{ const s=a.slice().sort((x,y)=>x-y); const n=s.length; return n%2?s[(n-1)/2]:(s[n/2-1]+s[n/2])/2; };
  const par=(a,b)=>{ const rs=[]; Object.values(g).forEach(x=>{ if(x[a]&&x[b]) rs.push(med(x[b])/med(x[a])); }); return rs.length?{r:med(rs),n:rs.length}:null; };
  return {'medio→medio_alto':par('medio','medio_alto'),'medio_alto→premium':par('medio_alto','premium'),'medio→premium':par('medio','premium')};
}
async function cfgRender(){
  const box=document.getElementById('cfgBody'); if(!box) return;
  if(!SESSION){ box.innerHTML='<div class="note">Inicia sessão para ver e alterar estas definições.</div>'; return; }
  await segIndicesCarregar();
  const P=(typeof PROJETOS!=='undefined'?PROJETOS:[]); const rp=refProjeto();
  box.innerHTML='<div class="card"><h2>Índice de segmento</h2>'
    +'<div class="hint">Quanto custa, em média, o mesmo trabalho em cada segmento, relativo ao médio (= 1). Usa-se quando falta histórico no segmento do projeto: um preço de outro segmento é multiplicado por <span class="mono">índice do segmento do projeto ÷ índice do segmento de origem</span>, e o valor aparece assinalado como convertido. Só se aplica aos elementos e capítulos de acabamento (marcados como sensíveis ao segmento na taxonomia).</div>'
    +'<div class="grid g6" style="margin-top:10px">'+SEGMENTOS.map(s=>'<div><label>'+esc(s.l)+'</label><input type="text" inputmode="decimal" id="cfgIdx_'+s.v+'" value="'+String(SEG_IDX[s.v]).replace('.',',')+'"'+(s.v==='medio'?' disabled title="base"':'')+'></div>').join('')
    +'<div style="display:flex;align-items:end"><button class="btn navy" onclick="cfgGravarIndices()">Gravar índices</button></div></div>'
    +'<div class="hint" id="cfgSug" style="margin-top:8px">'+(SEG_IDX_FONTE==='base'?'':'<b>Valores por omissão</b> — ainda não gravados. ')+'<a style="cursor:pointer;text-decoration:underline" onclick="cfgSugerir()">Calcular sugestão a partir da biblioteca</a></div></div>'
    +'<div class="card"><h2>Projeto de referência</h2>'
    +'<div class="hint">O projeto contra o qual a Revisão do MQ e os Rácios de custo real comparam quando o histórico é curto, e que entra sempre no Benchmark. Até aqui era o L’Urbain, escrito no código; agora escolhe-se aqui.</div>'
    +'<div style="display:flex;gap:10px;align-items:end;margin-top:10px;flex-wrap:wrap"><div><label>Projeto</label><br><select id="cfgRef" style="min-width:260px">'
    +P.map(p=>'<option value="'+p.id+'"'+(rp&&rp.id===p.id?' selected':'')+'>'+esc(p.nome)+(p.segmento?' · '+esc(segLabel(p.segmento)):'')+'</option>').join('')+'</select></div>'
    +'<button class="btn navy" onclick="cfgGravarReferencia()">Gravar referência</button></div>'
    +'<div class="hint" style="margin-top:8px">'+(rp?(rp.referencia?'Referência atual: <b>'+esc(rp.nome)+'</b>.':'Ainda não há referência marcada na base — a usar <b>'+esc(rp.nome)+'</b> por omissão.'):'Sem projetos na base.')+(REF_DADOS?' Custo real carregado: '+Object.keys(REF_DADOS.caps).length+' capítulos.':'')+'</div></div>';
}
async function cfgSugerir(){
  const el=document.getElementById('cfgSug'); if(el) el.textContent='A calcular…';
  try{
    const s=await segSugerir(); const f=x=>x?('×'+fmt(x.r,2)+' ('+x.n+' artigos comparáveis)'):'sem artigos comparáveis';
    el.innerHTML='Sugestão a partir da biblioteca — médio → médio-alto: <b>'+f(s['medio→medio_alto'])+'</b> · médio-alto → premium: <b>'+f(s['medio_alto→premium'])+'</b> · médio → premium: <b>'+f(s['medio→premium'])+'</b>. Com poucos artigos, é uma indicação, não uma regra.';
  }catch(e){ if(el) el.textContent='Não consegui calcular: '+(e.message||e); }
}
async function cfgGravarIndices(){
  const rows=SEGMENTOS.map(s=>{ const v=s.v==='medio'?1:tpNum((document.getElementById('cfgIdx_'+s.v)||{}).value); return {segmento:s.v,indice:v,atualizado:new Date().toISOString()}; });
  if(rows.some(r=>!(r.indice>0))) return alertx('Os índices têm de ser números maiores que zero (ex.: 1,15).');
  const {error}=await sbq(sb.from('segmento_indice').upsert(rows,{onConflict:'segmento'}),"Gravar índices de segmento");
  if(error) return;
  await segIndicesCarregar(); TP_LIB=null;
  alertx('Índices de segmento gravados.',true); cfgRender();
}
async function cfgGravarReferencia(){
  const id=+(document.getElementById('cfgRef')||{}).value; if(!id) return;
  let r=await sbq(sb.from('projetos').update({referencia:false}).eq('referencia',true),"Limpar referência"); if(r.error) return;
  r=await sbq(sb.from('projetos').update({referencia:true}).eq('id',id),"Gravar referência"); if(r.error) return;
  (typeof PROJETOS!=='undefined'?PROJETOS:[]).forEach(p=>{ p.referencia=(p.id===id); });
  await refCarregar(); try{ await loadBenchmarks(); }catch(e){}
  alertx('Projeto de referência: '+refNome()+'.',true); cfgRender();
}
let SNAP=null, SNAP_T=0;
async function snapshot(force){
  if(!SESSION) return {fases:[],caps:[]};
  if(SNAP&&!force&&Date.now()-SNAP_T<20000) return SNAP;
  const [f,c]=await Promise.all([
    sbq(sb.from('fases').select('*'),"Ler fases"),
    sbq(sb.from('capitulos').select('*'),"Ler capítulos")
  ]);
  SNAP={fases:f.data||[],caps:c.data||[]}; SNAP_T=Date.now();
  return SNAP;
}
function invalidarSnapshot(){ SNAP=null; CALIB_CACHE=null; }

async function gpdFases(pref){   /* fases de promotor (Orçamento/Contrato/Real) */
  const data=[];
  /* A referência L'Urbain está embutida no código como semente da v1. Assim que o
     projeto passa a existir na base — com o seu orçamento e o seu real — a semente
     tem de sair, senão o L'Urbain conta duas vezes: puxa a mediana para si e finge
     uma dispersão que não existe. */
  if(!lurbainNaBase()){
    const lurbCaps=Object.fromEntries(REF.capitulos.filter(c=>c.total>0).map(c=>[c.cap,c.total]));
    data.push({nome:"L'Urbain (referência embutida)",ano:2024,gfa:REF.gfa,fogos:REF.fogos,
               caps:lurbCaps,fase:"Orçamento",D:descritoresRef()});
  }
  if(!SESSION) return data;
  const {fases,caps}=await snapshot();
  const porFase={}; caps.forEach(c=>{(porFase[c.fase_id]=porFase[c.fase_id]||[]).push(c)});
  for(const p of PROJETOS){
    const fs=fases.filter(f=>f.projeto_id===p.id);
    if(!fs.length) continue;
    const ordem=pref==='todas'?null:{real:['Real','Contrato','Orçamento'],contrato:['Contrato','Real','Orçamento'],orcamento:['Orçamento','Contrato','Real']}[pref];
    let escolhidas=[];
    if(ordem){ for(const t of ordem){const m=fs.filter(x=>x.fase===t); if(m.length){escolhidas=[m.sort((a,b)=>(b.data||'').localeCompare(a.data||''))[0]];break}} }
    else escolhidas=fs;
    for(const fase of escolhidas){
      const cs=porFase[fase.id]||[]; if(!cs.length) continue;
      const capObj={}; cs.forEach(c=>{if(+c.total>0)capObj[c.cap]=(capObj[c.cap]||0)+ +c.total});
      const ano=fase.data?+fase.data.slice(0,4):new Date().getFullYear();
      data.push({nome:p.nome+(escolhidas.length>1?" · "+fase.fase:""),ano,gfa:p.gfa,fogos:p.fogos,
                 caps:capObj,fase:fase.fase,D:descritoresDe(p)});
    }
  }
  return data;
}

/* referências do portão de execução: preço de contrato adjudicado, por capítulo */
async function gpdAdjudicado(){
  const data=[];
    if(!SESSION) return data;
    for(const p of PROJETOS){
      const {data:adjs}=await sb.from('adjudicacoes').select('capitulo,adjudicado').eq('projeto',p.nome);
      if(!adjs||!adjs.length) continue;
      const capObj={}; adjs.forEach(a=>{ if(+a.adjudicado>0) capObj[a.capitulo]=(capObj[a.capitulo]||0)+ +a.adjudicado; });
      if(Object.keys(capObj).length) data.push({nome:p.nome+" · Adjudicado", ano:new Date().getFullYear(), gfa:p.gfa, fogos:p.fogos, caps:capObj, fase:'Adjudicado', D:descritoresDe(p)});
    }
    return data; // só referências adjudicadas reais; se vazio, o Estimador não inventa
}


async function calibracaoDesvios(){
  if(CALIB_CACHE) return CALIB_CACHE;
  const out={};
  if(!SESSION){CALIB_CACHE=out;return out}
  const {fases,caps}=await snapshot();
  const porFase={}; caps.forEach(c=>{(porFase[c.fase_id]=porFase[c.fase_id]||[]).push(c)});
  const ultima=(fs,tipo)=>fs.filter(f=>f.fase===tipo).sort((a,b)=>(b.data||'').localeCompare(a.data||''))[0];
  PROJETOS.forEach(p=>{
    const fs=fases.filter(f=>f.projeto_id===p.id);
    const orc=ultima(fs,'Orçamento'), real=ultima(fs,'Real');
    if(!orc||!real) return;
    const mo={},mr={};
    (porFase[orc.id]||[]).forEach(c=>mo[c.cap]=(mo[c.cap]||0)+ +c.total);
    // base contratual = total menos trabalhos adicionais: a calibração mede erro de
    // estimativa, não alteração de âmbito nem revisão de preços
    (porFase[real.id]||[]).forEach(c=>mr[c.cap]=(mr[c.cap]||0)+(+c.total - (+c.adicionais||0)));
    Object.keys(mr).forEach(cap=>{ if(mo[cap]>0) (out[cap]=out[cap]||{r:[]}).r.push(mr[cap]/mo[cap]) });
  });
  Object.keys(out).forEach(cap=>{
    out[cap]={n:out[cap].r.length, fator:Math.min(Math.max(med(out[cap].r),0.75),1.40)};
  });
  CALIB_CACHE=out; return out;
}

function renderComparar(){ return comBusy("A comparar projetos…",()=>_renderComparar()) }
function runEstimador(){ return comBusy("A calcular a estimativa…",()=>_runEstimador()) }
function runAnalysis(){ busy(true,"A analisar o mapa de quantidades…"); try{ return _runAnalysis() } finally { busy(false); try{ uxTabSync(); }catch(e){} } }

/* ---------- 4. Ergonomia ---------- */

/* triagem de alertas: o que já foi tratado deixa de reaparecer em cada passagem */
function chaveTriagem(){ return 'triagem_'+norm(CTX.nome||"—") }
function guardarTriagem(){
  saveLocal(chaveTriagem(), FINDINGS.filter(f=>f.resolvido).map(f=>f.tipo+"|"+(f.it.code||"")+"|"+(f.it.linha||"")));
}
function renderFindings(){
  _renderFindings();
  const tot=FINDINGS.length, res=FINDINGS.filter(f=>f.resolvido).length;
  const t=document.getElementById('findTag');
  if(t) t.textContent=tot?`${res} de ${tot} tratados`:"";
  /* Fase 6: filtro por severidade em botões (com contagem) — escrevem no seletor #fSev */
  const ch=document.getElementById('fSevChips'), sel=document.getElementById('fSev');
  if(ch&&sel){
    const n=s=>FINDINGS.filter(f=>!s||f.sev===s).length;
    ch.innerHTML=[['','Todos'],['erro','Erros'],['aviso','Avisos'],['info','Notas']].map(([k,l])=>
      '<button type="button" class="lg-chip'+(sel.value===k?' on':'')+'" data-sev="'+k+'" aria-pressed="'+(sel.value===k)+'">'+l+' <b>'+n(k)+'</b></button>').join('');
    ch.querySelectorAll('[data-sev]').forEach(b=>b.onclick=()=>{ sel.value=b.dataset.sev; renderFindings(); });
  }
  try{ lgGuiaAtualizar('analisador'); }catch(e){}
}

/* confirmação antes de apagar ou substituir */
async function cstApagar(id){
  const c=CONSULTAS.find(x=>x.id===id);
  if(!confirmar("Apagar a consulta a "+(c?c.fornecedor:"este fornecedor")+"? Esta ação não pode ser desfeita.")) return;
  return _cstApagar(id);
}
async function apagarRegraCap(id){
  if(!confirmar("Apagar esta regra de reconhecimento de capítulo?")) return;
  return _apagarRegraCap(id);
}
function verRepor(n){
  if(ORC_ROWS.length&&!confirmar("Repor a versão v"+n+" substitui o orçamento que tens aberto. Continuar?")) return;
  return _verRepor(n);
}

/* A roda do rato sobre um <select> altera-lhe o valor sem que o utilizador
   perceba. Numa tabela como a da taxonomia, basta uma passagem de scroll para
   trocar vários drivers sem deixar rasto. Bloqueado. */
document.addEventListener('wheel',e=>{
  if(e.target&&e.target.tagName==='SELECT'&&document.activeElement!==e.target){ e.target.blur(); }
},{passive:true});
document.addEventListener('mousedown',e=>{
  if(e.target&&e.target.tagName==='SELECT') e.target.dataset.tocado='1';
});

/* ---------- 5. Ligação da barra de contexto ---------- */
(function ligarCtx(){
  const inp=document.getElementById('ctxNome');
  if(!inp) return;
  let t=null;
  inp.addEventListener('input',()=>{ clearTimeout(t); t=setTimeout(()=>ctxDefinir(inp.value),450) });
  inp.addEventListener('change',()=>ctxDefinir(inp.value));
})();
async function loadProjetos(){
  await _loadProjetos();
  const dl=document.getElementById('ctxList');
  if(dl) dl.innerHTML=PROJETOS.map(p=>`<option value="${esc(p.nome)}">`).join("");
  if(CTX.nome&&PROJETOS.some(p=>norm(p.nome)===norm(CTX.nome))) CTX.novo=false;
  ctxRender();
}


/* restaurar o último projeto ativo */
(function restaurarCtx(){
  const c=readLocal('ctx');
  if(c&&c.nome){ CTX=Object.assign(CTX,c); ctxAplicar(); }
  else ctxRender();
})();


/* ==========================================================================
   PRICING SHEET COMPLETO — todas as folhas de capítulo
   A folha BOQ-Arq só tem arquitetura. As quantidades de estabilidade,
   movimento de terras, MEP e restantes especialidades estão em ~33 folhas
   próprias, todas com a mesma estrutura: bloco RESUMO, depois
   "MAPA DE QUANTIDADES" e o cabeçalho CAP./DESCRIÇÃO/UN/QT./PREÇO UNIT./TOTAIS.
   Analisar só o BOQ-Arq deixava de fora a maior parte das grandezas.
   ========================================================================== */
const FOLHAS_IGNORAR=/^(WRAP UP|SELLING SHEET|SUMMARY|NECTARI|RESUMO|CAPA|INDICE|ÍNDICE)/i;
function ehFolhaCapitulo(rows){
  for(let i=0;i<Math.min(rows.length,30);i++){
    const r=(rows[i]||[]).map(x=>norm(x));
    if(r.some(x=>/DESCRI[ÇC][ÃA]O|DESIGNA/.test(x))&&r.some(x=>/^QT\.?$|^QUANT/.test(x))&&r.some(x=>/^UN\.?$/.test(x))) return i;
  }
  return -1;
}
function lerFolhaCapitulo(rows,nomeFolha){
  const hr=ehFolhaCapitulo(rows); if(hr<0) return null;
  const cab=(rows[hr]||[]).map(x=>norm(x));
  const iDes=cab.findIndex(x=>/DESCRI[ÇC][ÃA]O|DESIGNA/.test(x));
  const iUn =cab.findIndex(x=>/^UN\.?$/.test(x));
  const iQt =cab.findIndex(x=>/^QT\.?$|^QUANT/.test(x));
  const iPu =cab.findIndex(x=>/PRE[ÇC]O|CUSTO/.test(x));
  const iTot=cab.findIndex(x=>/^TOTA/.test(x));
  const cap=normalizaCap(mapCapitulo(nomeFolha)||nomeFolha);
  const num=v=>{const n=parseFloat(String(v==null?'':v).replace(/\s|€/g,'').replace(',','.'));return isFinite(n)?n:null};
  const arts=[]; let total=0;
  for(let i=hr+1;i<rows.length;i++){
    const r=rows[i]||[];
    const d=String(r[iDes]==null?'':r[iDes]).trim();
    const un=String(r[iUn]==null?'':r[iUn]).trim();
    const qt=num(r[iQt]), pu=num(r[iPu]), pt=num(r[iTot]);
    if(!d) continue;
    if(/^TOTAL/i.test(norm(d))) continue;          // linha de somatório do capítulo
    if(!un||qt==null||qt<=0) continue;             // cabeçalho de secção, não artigo
    arts.push({desc:d,un,qt,pu,pt,cap});
    if(pt) total+=pt;
  }
  return arts.length?{cap,nomeFolha,arts,total}:null;
}
async function analisarPricingCompleto(){
  if(!workbook) return alertx("Carrega primeiro o ficheiro.");
  const folhas=workbook.SheetNames.filter(n=>!FOLHAS_IGNORAR.test(norm(n)));
  const todos=[]; const porCap={}; const semCap=[];
  folhas.forEach(n=>{
    const rows=XLSX.utils.sheet_to_json(workbook.Sheets[n],{header:1,raw:true,defval:null});
    const r=lerFolhaCapitulo(rows,n);
    if(!r){ return; }
    if(!r.cap){ semCap.push(n); return; }
    todos.push(...r.arts);
    porCap[r.cap]=(porCap[r.cap]||0)+r.total;
  });
  if(!todos.length) return alertx("Não reconheci folhas de capítulo neste ficheiro. Confirma que é um pricing sheet.");
  PHYS=extractPhys(todos);
  PRICING_ARTS=todos;
  renderPhys();
  const nq=Object.keys(PHYS).length;
  const tot=Object.values(porCap).reduce((a,b)=>a+b,0);
  document.getElementById('results').classList.remove('hidden');      // o contentor
  document.getElementById('btnGravarAnalise').classList.remove('hidden');
  document.getElementById('physCard').classList.remove('hidden');
  /* Nesta leitura não há alertas de mapa de quantidades: o pricing sheet não é
     um MQ do projetista. Esconder o que não se aplica e explicar porquê. */
  const cardAl=document.getElementById('tbFindings')?document.getElementById('tbFindings').closest('.card'):null;
  if(cardAl){
    const t=document.getElementById('tbFindings');
    t.innerHTML='<tr><td colspan="8" style="color:var(--color-black-70);padding:14px">'+
      'Leitura de pricing sheet — não são gerados alertas de revisão. '+
      'Os alertas aplicam-se a mapas de quantidades entregues pelo projetista.</td></tr>';
    const ne=document.getElementById('noFindings'); if(ne) ne.classList.add('hidden');
  }
  document.getElementById('btnGravarAnalise').scrollIntoView({behavior:'smooth',block:'center'});
  alertx("Pricing sheet completo: "+nq+" grandezas físicas extraídas de "+todos.length+
    " artigos em "+Object.keys(porCap).length+" capítulos. As quantidades é que contam — "+
    "os valores destas folhas são custo da construtora e não entram nos rácios da biblioteca."+
    (semCap.length?" Folhas não reconhecidas: "+semCap.join(", "):""),true);
  try{ uxTabSync(); }catch(e){}
}
let PRICING_ARTS=[];
/* Gravar a análise do MQ — passos por ordem:
   1. guarda contra ficheiro de outra obra
   2. grava projeto + análise (_gravarAnalise)
   3. colhe preços unitários dos artigos do MQ e das folhas de capítulo do pricing sheet
   4. refresca benchmarks, limpa o rascunho local e invalida a cache da base */
async function saveAnalysis(){
  if(typeof workbook!=='undefined'&&workbook&&
     !confereProjeto(workbook,document.getElementById('pNome').value.trim())) return;
  const ok=await _gravarAnalise();
  if(!ok) return;
  const nome=document.getElementById('pNome').value.trim();
  const arts=ITENS.filter(x=>x.tipo==='art'&&(x.pu||x.pt));
  if(SESSION&&arts.length&&nome){
    const n=await colherPU(arts,nome,new Date().getFullYear(),'Orçamento');
    if(n) alertx(n+" preços unitários colhidos para a biblioteca.",true);
  }
  await loadBenchmarks();
  clearLocal('anal');
  invalidarSnapshot();
  try{
    if(SESSION&&PRICING_ARTS.length){
      /* Estes preços são custo da construtora (dry costs), não contrato de
         empreitada. Ficam marcados como tal para não se misturarem com os
         preços colhidos de autos, que são a preços de contrato. */
      const n=await colherPU(PRICING_ARTS,nome,new Date().getFullYear(),'Custo construtora');
      if(n) alertx(n+" preços unitários colhidos (marcados como custo da construtora).",true);
    }
  }catch(e){ console.warn('PU pricing',e); }
}

/* ==========================================================================
   GUARDA CONTRA IMPORTAR PARA O PROJETO ERRADO
   Os ficheiros identificam a obra ("OBRA: L´URBAIN"). Se não bater com o
   projeto ativo, avisa antes de gravar — é um erro fácil de cometer e caro
   de desfazer, porque sobrepõe as quantidades e os preços do outro projeto.
   ========================================================================== */
function obraDoFicheiro(wbk){
  if(!wbk) return null;
  for(const n of wbk.SheetNames.slice(0,8)){
    const rows=XLSX.utils.sheet_to_json(wbk.Sheets[n],{header:1,raw:true,defval:null});
    for(let i=0;i<Math.min(rows.length,40);i++){
      const r=rows[i]||[];
      for(let c=0;c<Math.min(r.length,4);c++){
        if(/^OBRA:?$/i.test(norm(r[c]))){
          for(let d=c+1;d<Math.min(r.length,c+4);d++)
            if(r[d]&&String(r[d]).trim()) return String(r[d]).trim();
        }
      }
    }
  }
  return null;
}
function confereProjeto(wbk,nomeAtivo){
  const obra=obraDoFicheiro(wbk);
  if(!obra||!nomeAtivo) return true;
  if(chaveCap(obra)===chaveCap(nomeAtivo)) return true;
  return confirmar('ATENÇÃO — o ficheiro identifica a obra como:\n\n    "'+obra+'"\n\n'+
    'mas o projeto ativo é:\n\n    "'+nomeAtivo+'"\n\n'+
    'Continuar grava os dados no projeto ativo e substitui o que lá estiver.\n\nTens a certeza?');
}

APP_REGISTAR('08-contexto','3.5.0');
