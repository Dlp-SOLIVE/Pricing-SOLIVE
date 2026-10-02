/* Solive · Orçamentação — 12-tipologias.js
   Fase 3: programa e tipologias do projeto, ficha de programa, kit-tipo por segmento × tipologia e quantidades a orçamentar.
   Versão: ver APP_REGISTAR no fim do ficheiro (tem de ser igual à do index.html). */

/* ═══════════ FASE 3 · Programa e tipologias · Kit-tipo ═══════════
   Mix de tipologias por projeto (T0–T5+, apartamento/moradia), ficha de programa
   (quantidades de cada elemento por fogo e tipologia), rácios observados entre
   projetos e kit-tipo por segmento × tipologia. Tabelas: projeto_tipologia,
   elemento, projeto_elemento_qt, kit_tipo; vista v_racio_tipologia. */
const TP_TIPOLOGIAS=['T0','T1','T2','T3','T4','T5+'];
const TP_TIPOS=[['apartamento','Apartamento'],['moradia','Moradia']];
let TP_ELEM=[], TP_MIX=[], TP_FICHA=[];
function tpLbl(tipo,tip){ return (tipo==='moradia'?'Moradia ':'')+tip; }
function tpNum(v){ const n=parseFloat(String(v==null?'':v).replace(',','.')); return isFinite(n)?n:null; }
function tpProj(){
  const nome=(typeof CTX!=='undefined'&&CTX.nome)||'';
  return (typeof PROJETOS!=='undefined'?PROJETOS:[]).find(p=>norm(p.nome)===norm(nome))||null;
}
function tpMed(a){ const s=a.filter(x=>x!=null&&isFinite(x)).sort((x,y)=>x-y); const n=s.length; if(!n) return null; return n%2?s[(n-1)/2]:(s[n/2-1]+s[n/2])/2; }
function tpFmt(v,d){ return v==null?'—':fmt(v,d==null?2:d); }
async function tpLoadElem(){
  const r=await sbq(sb.from('elemento').select('*').eq('ativo',true).order('ordem'),"Ler elementos");
  TP_ELEM=r.data||[];
  return TP_ELEM;
}

/* ---------- vistas ---------- */
(function tpMount(){
  const main=document.querySelector('main'); if(!main||document.getElementById('view-programa')) return;
  const vp=uxEl('div',{id:'view-programa',class:'hidden'},
    uxPurpose('1 · Estimar','Programa e tipologias',
      'O programa do projeto ativo: quantos fogos de cada tipologia e, para cada elemento (cozinhas, roupeiros, portas, instalações sanitárias, AVAC, vãos, elevadores), a quantidade por fogo. É daqui que nascem os rácios por tipologia de todos os projetos.')
    +'<div id="tpProgBody"></div>');
  const vk=uxEl('div',{id:'view-kit',class:'hidden'},
    uxPurpose('Conhecimento','Kit-tipo por tipologia',
      'Quanto de cada elemento se deve quantificar por tipologia, em cada segmento. Mostra o observado nos projetos (mediana e nº de projetos) ao lado do padrão que defines. Com o mix de tipologias do projeto ativo, calcula as quantidades a orçamentar.')
    +'<div id="tpKitBody"></div>');
  main.appendChild(vp); main.appendChild(vk);
})();

/* ---------- PROGRAMA DO PROJETO ATIVO ---------- */
async function tpRenderPrograma(){
  const box=document.getElementById('tpProgBody'); if(!box) return;
  if(!SESSION){ box.innerHTML='<div class="note">Inicia sessão para ver e gravar o programa.</div>'; return; }
  const p=tpProj();
  if(!p){ box.innerHTML='<div class="note">Escolhe o projeto ativo na barra de cima. Se for um projeto novo, grava primeiro os descritores (<b>Editar descritores</b>).</div>'; return; }
  box.innerHTML='<div class="note">A carregar…</div>';
  await tpLoadElem();
  const [m,f]=await Promise.all([
    sbq(sb.from('projeto_tipologia').select('*').eq('projeto_id',p.id),"Ler tipologias"),
    sbq(sb.from('projeto_elemento_qt').select('*').eq('projeto_id',p.id),"Ler ficha de programa")]);
  TP_MIX=(m.data||[]).sort((a,b)=>(a.tipo_fogo+a.tipologia).localeCompare(b.tipo_fogo+b.tipologia));
  TP_FICHA=f.data||[];
  tpDesenharPrograma(p);
}
function tpDesenharPrograma(p){
  const box=document.getElementById('tpProgBody');
  const totFogos=TP_MIX.reduce((s,r)=>s+(+r.n_fogos||0),0);
  const aviso=(p.fogos&&totFogos&&totFogos!==+p.fogos)?'<div class="note red" style="margin-top:8px">A soma do mix ('+totFogos+' fogos) não bate com o nº de fogos dos descritores ('+p.fogos+').</div>':'';
  const linhaMix=(r,i)=>'<tr>'
    +'<td><select data-k="tipo_fogo" data-i="'+i+'">'+TP_TIPOS.map(([v,l])=>'<option value="'+v+'"'+(r.tipo_fogo===v?' selected':'')+'>'+l+'</option>').join('')+'</select></td>'
    +'<td><select data-k="tipologia" data-i="'+i+'">'+TP_TIPOLOGIAS.map(t=>'<option'+(r.tipologia===t?' selected':'')+'>'+t+'</option>').join('')+'</select></td>'
    +'<td><input type="number" min="0" step="1" data-k="n_fogos" data-i="'+i+'" value="'+(r.n_fogos!=null?r.n_fogos:'')+'" style="width:80px"></td>'
    +'<td><input type="text" inputmode="decimal" data-k="area_util_media" data-i="'+i+'" value="'+(r.area_util_media!=null?r.area_util_media:'')+'" style="width:100px"></td>'
    +'<td><input type="text" inputmode="decimal" data-k="n_wc" data-i="'+i+'" value="'+(r.n_wc!=null?r.n_wc:'')+'" style="width:70px"></td>'
    +'<td><button class="btn ghost" onclick="tpMixDel('+i+')">Remover</button></td></tr>';
  const cols=TP_MIX.map(r=>({tipo:r.tipo_fogo,tip:r.tipologia,n:+r.n_fogos||0}));
  const qtDe=(el,c)=>{ const q=TP_FICHA.find(x=>String(x.elemento_id)===String(el.id)&&(c?(x.tipo_fogo===c.tipo&&x.tipologia===c.tip):!x.tipologia)); return q?(c?q.qt_por_fogo:q.qt_total):null; };
  const linhaEl=el=>{
    let tot=0, tem=false;
    const cel=el.base==='projeto'
      ? '<td colspan="'+Math.max(cols.length,1)+'"><input type="text" inputmode="decimal" data-el="'+el.id+'" data-proj="1" value="'+(qtDe(el,null)!=null?qtDe(el,null):'')+'" style="width:90px"> <span class="hint">total do edifício</span></td>'
      : (cols.length?cols.map(c=>{ const v=qtDe(el,c); if(v!=null){tot+=v*c.n;tem=true;} return '<td><input type="text" inputmode="decimal" data-el="'+el.id+'" data-tipo="'+c.tipo+'" data-tip="'+c.tip+'" value="'+(v!=null?v:'')+'" style="width:80px"></td>'; }).join(''):'<td class="hint">define primeiro o mix</td>');
    if(el.base==='projeto'){ const v=qtDe(el,null); if(v!=null){tot=v;tem=true;} }
    return '<tr><td>'+esc(el.nome)+'</td><td>'+esc(el.unidade)+'</td>'+cel+'<td class="mono" style="text-align:right">'+(tem?fmt(tot,2):'—')+'</td></tr>';
  };
  box.innerHTML=
    '<div class="card"><h2 style="margin-top:0">Mix de tipologias · '+esc(p.nome)+'</h2>'
    +'<div class="hint">Um registo por tipologia. Nº de WC = instalações sanitárias por fogo (ex.: 1,5 se metade tiver suite).</div>'
    +'<table style="margin-top:8px"><tr><th>Tipo</th><th>Tipologia</th><th>Nº de fogos</th><th>Área útil média (m²)</th><th>WC por fogo</th><th></th></tr>'
    +TP_MIX.map(linhaMix).join('')+'</table>'
    +'<div style="display:flex;gap:10px;margin-top:8px;flex-wrap:wrap;align-items:center"><button class="btn ghost" onclick="tpMixAdd()">Acrescentar tipologia</button>'
    +'<span class="hint">Total: <b>'+totFogos+'</b> fogos</span></div>'+aviso
    +'<div style="display:flex;gap:14px;margin-top:14px;flex-wrap:wrap;align-items:end">'
    +'<div><label>Elevadores (nº de caixas)</label><br><input type="number" min="0" id="tpCaixas" value="'+(p.n_caixas_elevador!=null?p.n_caixas_elevador:'')+'" style="width:90px"></div>'
    +'<div><label>Paragens (total)</label><br><input type="number" min="0" id="tpParagens" value="'+(p.n_paragens!=null?p.n_paragens:'')+'" style="width:90px"></div>'
    +'<button class="btn navy" onclick="tpMixGravar()">Gravar mix</button></div></div>'
    +'<div class="card" style="margin-top:14px"><h2 style="margin-top:0">Ficha de programa — quantidade por fogo</h2>'
    +'<div class="hint">Para cada elemento, quanto leva <b>um fogo</b> de cada tipologia (ex.: T2 → 3,6 ml de cozinha, 2 portas de roupeiro × 1,2 m = 2,4 ml). Elevadores e paragens são o total do edifício. A coluna Total multiplica pelo nº de fogos. Fonte destes valores:'
    +' <select id="tpFonte"><option value="ficha">Ficha (projeto / medição)</option><option value="proposta">Proposta recebida</option><option value="mq">Mapa de quantidades</option><option value="auto">Auto / obra executada</option></select></div>'
    +'<div style="overflow-x:auto"><table style="margin-top:8px"><tr><th>Elemento</th><th>Un.</th>'
    +(cols.length?cols.map(c=>'<th>'+esc(tpLbl(c.tipo,c.tip))+'<div class="hint" style="font-weight:400">'+c.n+' fogos</div></th>').join(''):'<th></th>')
    +'<th style="text-align:right">Total</th></tr>'+TP_ELEM.filter(el=>el.base!=='projeto').map(linhaEl).join('')+'</table></div>'
    +'<div class="hint" style="margin-top:6px">Elevadores e paragens: indicados no quadro do mix, acima.</div>'
    +'<div style="margin-top:10px"><button class="btn navy" onclick="tpFichaGravar()">Gravar ficha</button></div></div>';
  const fonteAtual=(TP_FICHA[0]||{}).fonte; if(fonteAtual) document.getElementById('tpFonte').value=fonteAtual;
  box.querySelectorAll('[data-k]').forEach(e=>e.addEventListener('change',ev=>{
    const i=+ev.target.dataset.i, k=ev.target.dataset.k; const v=ev.target.value;
    TP_MIX[i][k]=(k==='tipo_fogo'||k==='tipologia')?v:tpNum(v);
  }));
}
function tpMixAdd(){
  const usadas=new Set(TP_MIX.map(r=>r.tipo_fogo+'|'+r.tipologia));
  const t=TP_TIPOLOGIAS.find(x=>!usadas.has('apartamento|'+x))||'T2';
  TP_MIX.push({tipo_fogo:'apartamento',tipologia:t,n_fogos:null,area_util_media:null,n_wc:null});
  const p=tpProj(); if(p) tpDesenharPrograma(p);
}
function tpMixDel(i){ TP_MIX.splice(i,1); const p=tpProj(); if(p) tpDesenharPrograma(p); }
async function tpMixGravar(){
  const p=tpProj(); if(!p) return alertx("Escolhe o projeto ativo.");
  const chaves=TP_MIX.map(r=>r.tipo_fogo+'|'+r.tipologia);
  if(new Set(chaves).size!==chaves.length) return alertx("Há tipologias repetidas no mix. Junta-as numa só linha.");
  const rows=TP_MIX.filter(r=>r.n_fogos>0).map(r=>({projeto_id:p.id,tipo_fogo:r.tipo_fogo,tipologia:r.tipologia,n_fogos:Math.round(r.n_fogos),area_util_media:r.area_util_media,n_wc:r.n_wc}));
  let r=await sbq(sb.from('projeto_tipologia').delete().eq('projeto_id',p.id),"Limpar mix anterior"); if(r.error) return;
  if(rows.length){ r=await sbq(sb.from('projeto_tipologia').insert(rows),"Gravar mix"); if(r.error) return; }
  r=await sbq(sb.from('projetos').update({n_caixas_elevador:tpNum(document.getElementById('tpCaixas').value),n_paragens:tpNum(document.getElementById('tpParagens').value)}).eq('id',p.id),"Gravar elevadores");
  if(r.error) return;
  alertx("Mix de tipologias gravado ("+rows.length+" tipologia(s)).",true);
  await loadProjetos(); await tpRenderPrograma();
}
async function tpFichaGravar(){
  const p=tpProj(); if(!p) return alertx("Escolhe o projeto ativo.");
  const fonte=document.getElementById('tpFonte').value;
  const rows=[];
  document.querySelectorAll('#tpProgBody input[data-el]').forEach(e=>{
    const v=tpNum(e.value); if(v==null) return;
    if(e.dataset.proj) rows.push({projeto_id:p.id,elemento_id:+e.dataset.el,tipo_fogo:null,tipologia:null,qt_por_fogo:null,qt_total:v,fonte});
    else rows.push({projeto_id:p.id,elemento_id:+e.dataset.el,tipo_fogo:e.dataset.tipo,tipologia:e.dataset.tip,qt_por_fogo:v,qt_total:null,fonte});
  });
  let r=await sbq(sb.from('projeto_elemento_qt').delete().eq('projeto_id',p.id),"Limpar ficha anterior"); if(r.error) return;
  if(rows.length){ r=await sbq(sb.from('projeto_elemento_qt').insert(rows),"Gravar ficha"); if(r.error) return; }
  alertx("Ficha de programa gravada ("+rows.length+" valores).",true);
  await tpRenderPrograma();
}

/* ---------- KIT-TIPO (biblioteca) ---------- */
let TP_KIT=[], TP_OBS=[];
async function tpRenderKit(){
  const box=document.getElementById('tpKitBody'); if(!box) return;
  if(!SESSION){ box.innerHTML='<div class="note">Inicia sessão para ver o kit-tipo.</div>'; return; }
  const segAtivo=(tpProj()||{}).segmento||'premium';
  const segAtual=(document.getElementById('tkSeg')||{}).value||segAtivo;
  const tipoAtual=(document.getElementById('tkTipo')||{}).value||'apartamento';
  box.innerHTML='<div class="note">A carregar…</div>';
  await tpLoadElem();
  const [k,o]=await Promise.all([
    sbq(sb.from('kit_tipo').select('*'),"Ler kit-tipo"),
    sbq(sb.from('v_racio_tipologia').select('*'),"Ler rácios por tipologia")]);
  TP_KIT=k.data||[]; TP_OBS=o.data||[]; TP_KIT_T=Date.now();
  const tips=TP_TIPOLOGIAS;
  const obsDe=(el,tip)=>{
    // elementos sensíveis ao segmento: só projetos do mesmo segmento; os outros: todos
    const rows=TP_OBS.filter(r=>String(r.elemento_id)===String(el.id)&&r.tipo_fogo===(el.base==='projeto'?r.tipo_fogo:tipoAtual)&&r.tipologia===tip&&(!el.sensivel_segmento||r.segmento===segAtual));
    const vals=rows.map(r=>el.base==='projeto'?+r.qt_total:+r.qt_por_fogo).filter(v=>isFinite(v));
    return {med:tpMed(vals),n:new Set(rows.map(r=>r.projeto_id)).size,min:vals.length?Math.min(...vals):null,max:vals.length?Math.max(...vals):null};
  };
  const padDe=(el,tip)=>{ const r=TP_KIT.find(x=>String(x.elemento_id)===String(el.id)&&x.segmento===segAtual&&x.tipo_fogo===tipoAtual&&x.tipologia===tip); return r?+r.qt_padrao:null; };
  const cel=(el,tip)=>{ const o=obsDe(el,tip), pd=padDe(el,tip);
    return '<td><input type="text" inputmode="decimal" data-kel="'+el.id+'" data-ktip="'+tip+'" value="'+(pd!=null?pd:'')+'" placeholder="'+(o.med!=null?fmt(o.med,2):'')+'" style="width:76px">'
      +'<div class="hint" style="font-size:11px" title="'+(o.n?'mín '+tpFmt(o.min)+' · máx '+tpFmt(o.max):'sem projetos com este dado')+'">obs. '+(o.med!=null?fmt(o.med,2)+' ('+o.n+')':'—')+'</div></td>'; };
  const segOpts=SEGMENTOS.map(s=>'<option value="'+s.v+'"'+(s.v===segAtual?' selected':'')+'>'+esc(s.l)+'</option>').join('');
  const tipoOpts=TP_TIPOS.map(([v,l])=>'<option value="'+v+'"'+(v===tipoAtual?' selected':'')+'>'+l+'</option>').join('');
  const fogoEl=TP_ELEM.filter(e=>e.base!=='projeto'), projEl=TP_ELEM.filter(e=>e.base==='projeto');
  box.innerHTML='<div class="card"><div style="display:flex;gap:14px;flex-wrap:wrap;align-items:end">'
    +'<div><label>Segmento</label><br><select id="tkSeg" onchange="tpRenderKit()">'+segOpts+'</select></div>'
    +'<div><label>Tipo de fogo</label><br><select id="tkTipo" onchange="tpRenderKit()">'+tipoOpts+'</select></div>'
    +'<button class="btn navy" onclick="tpKitGravar()">Gravar padrão</button></div>'
    +'<div class="hint" style="margin-top:8px">Cada célula: <b>padrão</b> (o que defines, por fogo) e por baixo o <b>observado</b> = mediana dos projetos com ficha de programa (nº de projetos entre parênteses). Elementos marcados com • comparam só projetos do mesmo segmento. Vazio = usa o observado.</div>'
    +'<div style="overflow-x:auto"><table style="margin-top:8px"><tr><th>Elemento (por fogo)</th><th>Un.</th>'+tips.map(t=>'<th>'+esc(tpLbl(tipoAtual,t))+'</th>').join('')+'</tr>'
    +fogoEl.map(el=>'<tr><td>'+(el.sensivel_segmento?'• ':'')+esc(el.nome)+'</td><td>'+esc(el.unidade)+'</td>'+tips.map(t=>cel(el,t)).join('')+'</tr>').join('')
    +'</table></div>'
    +(projEl.length?'<div class="hint" style="margin-top:10px">Elevadores (definidos em Programa e tipologias de cada projeto): '
      +((typeof PROJETOS!=='undefined'?PROJETOS:[]).filter(x=>x.n_caixas_elevador!=null).map(x=>esc(x.nome)+' — '+x.n_caixas_elevador+' caixa(s)'+(x.n_paragens!=null?', '+x.n_paragens+' paragens':'')+(x.fogos?' para '+x.fogos+' fogos':'')).join(' · ')||'ainda sem projetos com elevadores indicados')+'.</div>':'')
    +'</div>'
    +'<div class="card" style="margin-top:14px"><h2 style="margin-top:0">Quantidades e preço por elemento · projeto ativo</h2><div id="tkEstimar"></div></div>';
  tpEstimarAtivo(segAtual);
}
async function tpKitGravar(){
  const seg=document.getElementById('tkSeg').value, tipo=document.getElementById('tkTipo').value;
  const rows=[];
  document.querySelectorAll('#tpKitBody input[data-kel]').forEach(e=>{ const v=tpNum(e.value); if(v==null) return;
    rows.push({segmento:seg,tipo_fogo:tipo,tipologia:e.dataset.ktip,elemento_id:+e.dataset.kel,qt_padrao:v}); });
  let r=await sbq(sb.from('kit_tipo').delete().eq('segmento',seg).eq('tipo_fogo',tipo),"Limpar padrão anterior"); if(r.error) return;
  if(rows.length){ r=await sbq(sb.from('kit_tipo').insert(rows),"Gravar padrão"); if(r.error) return; }
  alertx("Kit-tipo gravado: "+segLabel(seg)+" · "+(tipo==='moradia'?'moradias':'apartamentos')+" ("+rows.length+" valores).",true);
  await tpRenderKit();
}
/* mix do projeto ativo × (padrão do kit ou, na falta, observado) = quantidades */
/* Cálculo puro (sem desenhar): quantidades e preço de cada elemento para o projeto p.
   Usado pelo ecrã Kit-tipo e pela Estimativa para o BP. Devolve {erro:'sem_mix'} se o
   projeto ainda não tiver mix de tipologias. */
let TP_KIT_T=0;
async function tpCalcular(p,segKit){
  if(!TP_ELEM.length) await tpLoadElem();
  if(!TP_KIT_T||Date.now()-TP_KIT_T>60000){
    const [k,o]=await Promise.all([sbq(sb.from('kit_tipo').select('*'),"Ler kit-tipo"),sbq(sb.from('v_racio_tipologia').select('*'),"Ler rácios por tipologia")]);
    TP_KIT=k.data||[]; TP_OBS=o.data||[]; TP_KIT_T=Date.now();
  }
  const seg=p.segmento||segKit;
  const {data:mix}=await sbq(sb.from('projeto_tipologia').select('*').eq('projeto_id',p.id),"Ler mix");
  if(!mix||!mix.length) return {erro:'sem_mix',p,seg};
  const linhas=[];
  TP_ELEM.forEach(el=>{
    if(el.base==='projeto'){
      const proprio=el.codigo==='elevador'?p.n_caixas_elevador:(el.codigo==='elev_paragens'?p.n_paragens:null);
      linhas.push({el,qt:proprio!=null?+proprio:null,fonte:proprio!=null?'descritores do projeto':'por definir',det:''});
      return;
    }
    let tot=0, partes=[], falta=[], fontes=new Set();
    mix.forEach(m=>{
      /* 1º a ficha do próprio projeto; 2º o padrão do kit; 3º a mediana observada nos outros projetos */
      const proprio=TP_OBS.find(r=>r.projeto_id===p.id&&String(r.elemento_id)===String(el.id)&&r.tipo_fogo===m.tipo_fogo&&r.tipologia===m.tipologia&&r.qt_por_fogo!=null);
      if(proprio){ const v=+proprio.qt_por_fogo; tot+=v*(+m.n_fogos||0); fontes.add('ficha do projeto'); partes.push(m.n_fogos+'×'+fmt(v,2)+' ('+tpLbl(m.tipo_fogo,m.tipologia)+')'); return; }
      const pad=TP_KIT.find(x=>String(x.elemento_id)===String(el.id)&&x.segmento===seg&&x.tipo_fogo===m.tipo_fogo&&x.tipologia===m.tipologia);
      let v=pad?+pad.qt_padrao:null, f='padrão';
      if(v==null){
        const rows=TP_OBS.filter(r=>String(r.elemento_id)===String(el.id)&&r.tipo_fogo===m.tipo_fogo&&r.tipologia===m.tipologia&&(!el.sensivel_segmento||r.segmento===seg)&&r.projeto_id!==p.id);
        v=tpMed(rows.map(r=>+r.qt_por_fogo)); f=v!=null?'observado ('+new Set(rows.map(r=>r.projeto_id)).size+' proj.)':null;
      }
      if(v==null){ falta.push(tpLbl(m.tipo_fogo,m.tipologia)); return; }
      tot+=v*(+m.n_fogos||0); fontes.add(f); partes.push(m.n_fogos+'×'+fmt(v,2)+' ('+tpLbl(m.tipo_fogo,m.tipologia)+')');
    });
    linhas.push({el,qt:partes.length?tot:null,fonte:[...fontes].join(' + ')+(falta.length?(fontes.size?' · ':'')+'sem dado: '+falta.join(', '):''),det:partes.join(' + ')});
  });
  /* FASE 4 — preço de cada elemento: 1º preço fixado à mão (segmento do projeto);
     2º mediana da biblioteca (custo real) no mesmo segmento; 3º outros segmentos;
     4º orçamentos do empreiteiro / compras. Sempre com a origem à vista. */
  await tpLoadPrecos();
  const nFogos=mix.reduce((s,m)=>s+(+m.n_fogos||0),0);
  linhas.forEach(l=>{ l.preco=tpPrecoElemento(l.el,seg); l.total=(l.qt!=null&&l.preco.pu!=null)?l.qt*l.preco.pu:null; });
  return {p,seg,mix,linhas,nFogos};
}
/* Para a Estimativa: total dos elementos por capítulo do projeto ativo. */
async function tpElementosPorCapitulo(){
  const p=tpProj(); if(!p) return {erro:'sem_projeto'};
  const r=await tpCalcular(p,p.segmento||'premium'); if(r.erro) return r;
  const porCap={};
  r.linhas.forEach(l=>{
    if(!l.el.capitulo||!(l.qt>0)) return;
    const cap=(typeof normalizaCap==='function'&&normalizaCap(l.el.capitulo))||l.el.capitulo;
    const o=porCap[cap]||(porCap[cap]={valor:0,itens:[],semPreco:[]});
    if(l.total!=null){ o.valor+=l.total; o.itens.push(l); } else o.semPreco.push(l.el.nome);
  });
  return {p:r.p,seg:r.seg,nFogos:r.nFogos,porCap};
}
async function tpEstimarAtivo(segKit){
  const out=document.getElementById('tkEstimar'); if(!out) return;
  const p=tpProj();
  if(!p){ out.innerHTML='<div class="note">Escolhe o projeto ativo para calcular as quantidades.</div>'; return; }
  const R=await tpCalcular(p,segKit);
  if(R.erro){ out.innerHTML='<div class="note">O projeto <b>'+esc(p.nome)+'</b> ainda não tem mix de tipologias. Define-o em <a onclick="showView(\'programa\')" style="cursor:pointer;text-decoration:underline">Programa e tipologias</a>.</div>'; return; }
  const {seg,linhas,nFogos}=R;
  window.__tpEstim={projeto:p.nome,segmento:seg,linhas,nFogos};
  const totGeral=linhas.reduce((s,l)=>s+(l.total||0),0);
  const semPreco=linhas.filter(l=>l.qt!=null&&l.qt>0&&l.preco.pu==null).length;
  const porCap={}; linhas.forEach(l=>{ if(l.total!=null){ const c=l.el.capitulo||'(sem capítulo)'; porCap[c]=(porCap[c]||0)+l.total; } });
  out.innerHTML='<div class="hint">Projeto <b>'+esc(p.nome)+'</b> · segmento <b>'+esc(segLabel(seg))+'</b> · '+nFogos+' fogos. Quantidades: ficha de programa do próprio projeto → padrão do kit-tipo → mediana observada noutros projetos. Preços: fixado à mão → biblioteca de custo real no mesmo segmento → outros segmentos → orçamentos do empreiteiro. Sem nenhum, fica assinalado — não se inventa. Clica numa linha para ver a origem do preço.</div>'
    +'<div style="overflow-x:auto"><table style="margin-top:8px"><tr><th>Elemento</th><th>Un.</th><th style="text-align:right">Quantidade</th><th>Origem da quantidade</th><th style="text-align:right">€/un</th><th>Origem do preço</th><th style="text-align:right">Total (€)</th><th>Fixar €/un</th></tr>'
    +linhas.map((l,i)=>'<tr id="tpr_'+i+'" style="cursor:pointer" onclick="tpPrecoDrill('+i+')" title="'+esc(l.det||'')+'">'
      +'<td>'+esc(l.el.nome)+'</td><td>'+esc(l.el.unidade)+'</td>'
      +'<td class="mono" style="text-align:right">'+(l.qt!=null?fmt(l.qt,2):'—')+'</td><td>'+esc(l.fonte||'')+'</td>'
      +'<td class="mono" style="text-align:right">'+(l.preco.pu!=null?fmt(l.preco.pu,2):'—')+'</td>'
      +'<td>'+esc(l.preco.fonte||'')+'</td>'
      +'<td class="mono" style="text-align:right;font-weight:600">'+(l.total!=null?fmt(l.total,0):'—')+'</td>'
      +'<td onclick="event.stopPropagation()"><input type="text" inputmode="decimal" data-fix="'+l.el.id+'" value="'+(l.preco.fixado!=null?l.preco.fixado:'')+'" placeholder="€/'+esc(l.el.unidade)+'" style="width:86px"></td></tr>').join('')
    +'<tr style="font-weight:600"><td colspan="6">TOTAL dos elementos'+(semPreco?' <span class="hint" style="font-weight:400">('+semPreco+' elemento(s) com quantidade mas sem preço)</span>':'')+'</td><td class="mono" style="text-align:right">'+fmt(totGeral,0)+'</td><td></td></tr>'
    +'</table></div>'
    +'<div class="hint" style="margin-top:6px">'+(nFogos?'≈ <b>'+fmt(totGeral/nFogos,0)+' €/fogo</b> nos elementos com preço · ':'')+Object.entries(porCap).map(([c,v])=>esc(c)+' '+fmt(v,0)+' €'+(nFogos?' ('+fmt(v/nFogos,0)+' €/fogo)':'')).join(' · ')+'</div>'
    +'<div style="margin-top:10px;display:flex;gap:10px;flex-wrap:wrap"><button class="btn navy" onclick="tpGuardarFixos()">Guardar preços fixados ('+esc(segLabel(seg))+')</button><button class="btn ghost" onclick="tpExportar()">Exportar (.xlsx)</button></div>';
}
/* ---------- FASE 4 · preço por elemento ---------- */
let TP_LIB=null, TP_LIB_T=0, TP_FIX=[];
async function tpLoadPrecos(){
  if(!TP_LIB||Date.now()-TP_LIB_T>60000){
    TP_LIB=await lerLinhasCusto(q=>q.eq('nivel','artigo').gt('preco_unit',0));
    TP_LIB_T=Date.now();
  }
  const r=await sbq(sb.from('elemento_preco').select('*'),"Ler preços fixados"); TP_FIX=r.data||[];
}
function tpUnidade(u){ return vfUnit(u||''); }
function tpCasa(el,r){
  if(!el.padrao_texto) return false;
  const d=vfNorm(r.descricao||'')+' '+vfNorm(r.familia||'');
  try{
    if(!new RegExp(el.padrao_texto).test(d)) return false;
    if(el.excluir_texto && new RegExp(el.excluir_texto).test(d)) return false;
  }catch(e){ return false; }
  return true;
}
function tpPrecoElemento(el,seg){
  const fix=TP_FIX.find(x=>String(x.elemento_id)===String(el.id)&&x.segmento===seg);
  if(fix) return {pu:+fix.preco_unit,fixado:+fix.preco_unit,fonte:'fixado à mão'+(fix.nota?' · '+fix.nota:''),n:1,cands:[]};
  if(!el.padrao_texto) return {pu:null,fonte:'sem padrão — fixar à mão',cands:[]};
  const uns=String(el.unidades_preco||el.unidade||'').split(',').map(x=>tpUnidade(x)).filter(Boolean);
  let rows=(TP_LIB||[]).filter(r=>tpCasa(el,r));
  const comAuto=new Set(rows.filter(r=>r.fonte==='auto').map(r=>r.projeto_id));
  rows=rows.filter(r=>!(r.fonte==='auto_pu'&&comAuto.has(r.projeto_id)));
  const naUn=rows.filter(r=>uns.includes(tpUnidade(r.unidade)));
  const REAL=['auto','subempreitada','composto','auto_pu','pu'];
  const camadas=[
    ['custo real · '+segLabel(seg), r=>REAL.includes(r.fonte)&&(!el.sensivel_segmento||r.segmento===seg)],
    ['custo real · outros segmentos', r=>REAL.includes(r.fonte)],
    ['orçamento do empreiteiro / compras', r=>r.fonte==='orcamento_empreiteiro'||r.fonte==='mq'||r.fonte==='compra'||r.fonte==='compra_po']];
  /* alternativa: a biblioteca só tem o elemento por unidade (ex.: cozinha completa €/un) */
  const altRows=rows.filter(r=>!uns.includes(tpUnidade(r.unidade))&&/^(UN|CJ|VG)$/.test(tpUnidade(r.unidade))&&REAL.includes(r.fonte));
  const alt=altRows.length?{med:tpMed(altRows.map(r=>+r.preco_unit)),n:altRows.length,un:altRows[0].unidade}:null;
  for(const [lbl,f] of camadas){
    const c=naUn.filter(f);
    if(c.length){
      /* Fase 6: elemento de acabamento com preços de outro segmento → convertidos pelo índice de segmento */
      let conv=0;
      const ps=c.map(r=>{ const f=(el.sensivel_segmento&&r.segmento&&typeof segFator==='function')?segFator(r.segmento,seg):1; if(f!==1) conv++; return +r.preco_unit*f; });
      return {pu:tpMed(ps),fonte:lbl+' · mediana de '+c.length+(conv?' · '+conv+' convertido(s) pelo índice de segmento':''),n:c.length,min:Math.min(...ps),max:Math.max(...ps),
              cands:c.sort((a,b)=>(+a.preco_unit)-(+b.preco_unit)).slice(0,12),alt};
    }
  }
  return {pu:null,fonte:alt?'sem preço em '+el.unidade+' (ver alternativa)':'sem registos na biblioteca',cands:[],alt};
}
function tpPrecoDrill(i){
  const e=window.__tpEstim; const l=e&&e.linhas[i]; const tr=document.getElementById('tpr_'+i); if(!l||!tr) return;
  const ab=document.getElementById('tpd_'+i); if(ab){ ab.remove(); tr.style.background=''; return; }
  const P=l.preco;
  const LBL={auto:'Auto',subempreitada:'Subempr.',composto:'Composto',compra:'Compra',compra_po:'Adj. Legendre-PO',auto_pu:'Auto (PU)',orcamento_empreiteiro:'Orç. empreiteiro',mq:'MQ',pu:'PU'};
  const body=(P.cands||[]).map(r=>'<tr><td style="white-space:normal">'+esc(String(r.descricao||'').slice(0,140))+'</td><td>'+esc((LBL[r.fonte]||r.fonte)+' · '+(r.ref||r.fornecedor||'')+(r.projeto?' · '+r.projeto:''))+'</td><td>'+esc(r.segmento?segLabel(r.segmento):'—')+'</td><td>'+esc(r.unidade||'')+'</td><td class="mono" style="text-align:right">'+fmt(r.preco_unit,2)+'</td></tr>').join('');
  const row=document.createElement('tr'); row.id='tpd_'+i;
  row.innerHTML='<td colspan="8" style="background:#f6f8fb;padding:10px 14px">'
    +'<div><b>'+esc(l.el.nome)+'</b> · quantidade: '+esc(l.det||l.fonte||'—')+'</div>'
    +(P.min!=null?'<div class="hint">Intervalo: '+fmt(P.min,2)+' – '+fmt(P.max,2)+' €/'+esc(l.el.unidade)+' · mediana '+fmt(P.pu,2)+'</div>':'')
    +(P.alt?'<div class="note" style="margin:6px 0">A biblioteca também tem este elemento por <b>'+esc(P.alt.un)+'</b>: mediana '+fmt(P.alt.med,2)+' € ('+P.alt.n+' registos). Não é convertível automaticamente para '+esc(l.el.unidade)+'; se fizer sentido (ex.: cozinha completa por fogo), fixa o €/'+esc(l.el.unidade)+' à mão.</div>':'')
    +(body?'<table style="margin-top:8px;font-size:12.5px;width:100%"><tr><th>Registo</th><th>Origem</th><th>Segmento</th><th>Un.</th><th style="text-align:right">€/un</th></tr>'+body+'</table>':'<div class="hint">'+esc(P.fonte||'')+'</div>')
    +'<div class="hint" style="margin-top:6px">Reconhecido na biblioteca por: '+esc(l.el.padrao_texto||'—')+(l.el.excluir_texto?' · exclui: '+esc(l.el.excluir_texto):'')+'</div></td>';
  tr.after(row); tr.style.background='#eef3fa';
}
async function tpGuardarFixos(){
  const e=window.__tpEstim; if(!e) return;
  const seg=e.segmento; const ins=[], del=[];
  document.querySelectorAll('#tkEstimar input[data-fix]').forEach(x=>{ const v=tpNum(x.value), id=+x.dataset.fix;
    if(v!=null&&v>0) ins.push({segmento:seg,elemento_id:id,preco_unit:v,fonte:'manual',nota:'Fixado em '+new Date().toLocaleDateString('pt-PT')+' ('+e.projeto+')'});
    else if(TP_FIX.some(f=>String(f.elemento_id)===String(id)&&f.segmento===seg)) del.push(id); });
  let r;
  for(const id of del){ r=await sbq(sb.from('elemento_preco').delete().eq('segmento',seg).eq('elemento_id',id),"Retirar preço fixado"); if(r.error) return; }
  if(ins.length){ r=await sbq(sb.from('elemento_preco').upsert(ins,{onConflict:'segmento,elemento_id'}),"Guardar preços fixados"); if(r.error) return; }
  alertx("Preços fixados guardados para "+segLabel(seg)+": "+ins.length+(del.length?" · retirados "+del.length:"")+".",true);
  await tpEstimarAtivo(seg);
}
function tpExportar(){
  const e=window.__tpEstim; if(!e) return;
  const aoa=[["SOLIVE — Quantidades e preços por elemento"],["Projeto: "+e.projeto+"   ·   Segmento: "+segLabel(e.segmento)+"   ·   "+(e.nFogos||'')+" fogos   ·   "+new Date().toLocaleDateString('pt-PT')],[],
    ["Elemento","Capítulo","Un.","Quantidade","Origem da quantidade","€/un","Origem do preço","Total (€)","Cálculo da quantidade"]]
    .concat(e.linhas.map(l=>[l.el.nome,l.el.capitulo||"",l.el.unidade,l.qt!=null?Math.round(l.qt*100)/100:"",l.fonte||"",l.preco&&l.preco.pu!=null?Math.round(l.preco.pu*100)/100:"",l.preco?l.preco.fonte||"":"",l.total!=null?Math.round(l.total):"",l.det||""]));
  const tot=e.linhas.reduce((s,l)=>s+(l.total||0),0);
  aoa.push([],["TOTAL","","","","","","",Math.round(tot)]);
  const ws=XLSX.utils.aoa_to_sheet(aoa); ws['!cols']=[{wch:38},{wch:22},{wch:6},{wch:11},{wch:30},{wch:10},{wch:36},{wch:12},{wch:50}];
  const wb=XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb,ws,"Elementos");
  XLSX.writeFile(wb,("Elementos_"+e.projeto).replace(/[^\w]+/g,"_")+".xlsx");
}

APP_REGISTAR('12-tipologias','3.3.0');
