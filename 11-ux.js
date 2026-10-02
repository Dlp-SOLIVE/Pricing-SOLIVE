/* Solive · Orçamentação — 11-ux.js
   Camada de apresentação: menu lateral, resumo do projeto, separadores de resultados e explicações por separador.
   Versão: ver APP_REGISTAR no fim do ficheiro (tem de ser igual à do index.html). */

/* ═══════════ SOLIVE · reorganização UX ═══════════ */
function uxEl(tag,attrs,html){const e=document.createElement(tag);Object.entries(attrs||{}).forEach(([k,v])=>e.setAttribute(k,v));if(html!=null)e.innerHTML=html;return e;}
function uxFmtEur(n){return (Math.round(n||0)).toLocaleString('pt-PT')+' €';}
function uxFmtM(n){return ((n||0)/1e6).toLocaleString('pt-PT',{minimumFractionDigits:2,maximumFractionDigits:2})+' M€';}
function uxPurpose(eyebrow,title,text){return '<div class="purpose" data-ux><button class="toggle" onclick="foldPurpose(this)">Como funciona</button><div class="eyebrow">'+eyebrow+'</div><h1>'+title+'</h1><p>'+text+'</p></div>';}
/* «Como funciona» em vez de esconder/mostrar */
function foldPurpose(btn){const box=btn.closest('.purpose');const on=box.classList.toggle('open');btn.innerHTML='<i class="icon-'+(on?'x':'circle-help')+'" aria-hidden="true"></i>'+(on?'Fechar':'Como funciona');}

/* ═══════════ Fase 6 · Legendre — shell (menu lateral, cabeçalho, guia) ═══════════ */

/* Cabeçalho de cada ecrã: H1 e botões. O eyebrow é «Área / Separador» (AREAS) e o
   subtítulo vem de HELP[v].s (10-ajuda.js) quando aqui não há outro.
   sec/pri = [texto, função global a chamar]; só aparecem se a função existir. */
const TITULOS={
  resumo:    {h:'Resumo do projeto', s:'O ponto de situação do projeto ativo e o que falta fazer', sec:['Editar descritores','abrirDescritores','pencil']},
  importar:  {h:'Importar ficheiro', s:'Um só sítio para largar qualquer Excel'},
  analisador:{h:'Mapa de quantidades', s:'Rever o MQ do projetista e orçamentá-lo com o custo real', sec:['Gravar análise','saveAnalysis','save'], pri:['Exportar comentários','exportComentarios','download']},
  precomq:   {h:'Mapa de quantidades', s:'Rever o MQ do projetista e orçamentá-lo com o custo real', pri:['Exportar (.xlsx)','vfExportMQ','download']},
  estimador: {h:'Estimativa para o BP', s:'Custo estimado a partir dos descritores e da biblioteca', pri:['Exportar (.xlsx)','exportEstimativa','download']},
  orcamento: {h:'Orçamento', s:'Consolidação por capítulo, com semáforo da fonte do preço', sec:['Exportar (.xlsx)','exportOrcamento','download'], pri:['Gravar versão','saveOrcBoard','save']},
  execucao:  {h:'Adjudicações e desvios', s:'Preço de contrato por pacote e variações em obra', sec:['Exportar (.xlsx)','gxExportar','download'], pri:['Registar adjudicação','gxRegistarAdjudicacao','plus']}
};
/* Guia «Como fazer»: passos curtos por ecrã (o detalhe está na Ajuda).
   Ecrãs redesenhados: textos literais da constante GUIA do protótipo; os restantes são próprios. */
const GUIA={
  resumo:    ['Escolhe o projeto ativo','Confirma os descritores','Vê o estado de cada fase','Segue para a fase por concluir'],
  programa:  ['Indica o mix de tipologias','Preenche a ficha por fogo','Grava o programa'],
  importar:  ['Confirma o projeto ativo','Larga o ficheiro Excel','Confirma o tipo sugerido','Continua no ecrã de destino'],
  estimador: ['Confirma os descritores','Indica o budget do BP','Estima','Compara com o BP'],
  analisador:['Carrega o MQ','Analisa a folha','Revê os alertas','Grava a análise'],
  precomq:   ['MQ carregado','Define uplift e base de custo','Orçamenta','Confirma as linhas por rácio'],
  orcamento: ['Arranca dos rácios ou do resumo','Atualiza o estado de cada capítulo','Acompanha a consolidação'],
  consultas: ['Abre a consulta do pacote','Regista as propostas','Compara-as','Escolhe a proposta'],
  execucao:  ['Regista a adjudicação do pacote','Regista as variações em obra','Acompanha o desvio'],
  verificar: ['Escolhe o projeto e o pacote','Carrega o auto','Revê as diferenças'],
  racios:    ['Filtra por segmento ou projeto','Consulta o €/m² por capítulo'],
  kit:       ['Escolhe o segmento e a tipologia','Compara o padrão com o observado','Fixa os preços por elemento'],
  comparar:  ['Escolhe os projetos','Escolhe a normalização','Lê as diferenças'],
  biblioteca:['Revê drivers e expoentes','Marca os capítulos sensíveis ao segmento','Acrescenta regras de mapeamento','Grava a taxonomia'],
  admin:     ['Escolhe o projeto','Consulta as versões gravadas','Elimina só o que já não é preciso'],
  config:    ['Calcula a sugestão','Ajusta e grava os índices','Escolhe a referência']
};
/* Passo atual do guia por ecrã: função que devolve o índice (0 = primeiro). Os passos anteriores
   aparecem como feitos (✓). Cada ecrã acrescenta a sua regra quando for redesenhado. */
const GUIA_PASSO={
  resumo:()=>{ if(typeof CTX==='undefined'||!CTX.nome) return 0; const D=CTX.D||{}; return (D.abc>0&&D.fogos>0)?2:1; },
  importar:()=>{ if((typeof CTX==='undefined'||!CTX.nome)&&!(typeof IMP!=='undefined'&&IMP.ficheiro)) return 0; return (typeof IMP!=='undefined'&&IMP.ficheiro)?2:1; },
  analisador:()=>{ if(typeof workbook==='undefined'||!workbook) return 0; if(!FINDINGS.length) return 1; return 2; },
  estimador:()=>{ const D=(typeof CTX!=='undefined'&&CTX.D)||{}; if(!(D.abc>0)) return 0; if(!(+(document.getElementById('estBudget')||{}).value>0)&&!EST_LAST) return 1; return EST_LAST?3:2; },
  orcamento:()=>{ if(typeof ORC_ROWS==='undefined'||!ORC_ROWS.length) return 0; return ORC_ROWS.some(r=>r.estado!=='racio')?2:1; },
  execucao:()=>{ if(typeof GX_ROWS==='undefined'||!GX_ROWS.length) return 0; return Object.keys(GX_VARS||{}).length?2:1; },
  precomq:()=>{ if(typeof MQ_FICHEIRO==='undefined'||!MQ_FICHEIRO) return 0; return (window.__mqResults&&window.__mqResults.length)?3:1; }
};
/* vistas que partilham o separador de outra precisam do seu próprio nome no «A seguir» */
const NOME_PROPRIO={precomq:'Orçamentar o MQ'};

function lgIc(n){ return '<i class="icon-'+n+'" aria-hidden="true"></i>'; }
function lgEsc(s){ return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/"/g,'&quot;'); }
function lgNomeVista(v){
  const a=(typeof areaDaVista==='function')?areaDaVista(v):null;
  const t=VISTA_SEPARADOR[v]||v;
  const tab=a?((a.tabs.find(x=>x[0]===t)||[])[1]||''):'';
  return {area:a?a.t:'', tab:tab};
}
/* volta a desenhar o cabeçalho (passo atual do guia) se a vista estiver aberta */
function lgGuiaAtualizar(v){ try{ const e=document.getElementById('view-'+v); if(e&&!e.classList.contains('hidden')) lgCabecalho(v); }catch(e){} }
function lgGuiaOculto(v){ try{ return localStorage.getItem('guia_oculto_'+v)==='1'; }catch(e){ return false; } }
function lgGuiaOcultar(v,on){ try{ if(on) localStorage.setItem('guia_oculto_'+v,'1'); else localStorage.removeItem('guia_oculto_'+v); }catch(e){} lgCabecalho(v); }

function lgCabecalho(v,a){
  const head=document.getElementById('lgHead'); if(!head) return;
  const bar=document.getElementById('areaTabs'); if(bar&&bar.nextElementSibling!==head) bar.after(head);
  const nm=lgNomeVista(v);
  const T=TITULOS[v]||{};
  const H=(typeof HELP!=='undefined'&&HELP[v])||{};
  const h1=T.h||nm.tab||nm.area||'';
  const sub=T.s||H.s||'';
  const passos=GUIA[v]||[];
  const oculto=lgGuiaOculto(v);
  const btn=(def,cls)=>(def&&typeof window[def[1]]==='function')?'<button type="button" class="btn '+cls+' sm" data-noic data-fn="'+def[1]+'">'+(def[2]?lgIc(def[2]):'')+lgEsc(def[0])+'</button>':'';
  let html='<div class="lg-pagehead"><div class="lg-pagehead-tx">'
    +'<div class="lg-eyebrow">'+lgEsc(nm.area)+(nm.tab&&nm.tab!==nm.area?' / '+lgEsc(nm.tab):'')+'</div>'
    +'<h1>'+lgEsc(h1)+'</h1>'+(sub?'<p class="lg-sub">'+lgEsc(sub)+'</p>':'')+'</div>'
    +'<div class="lg-pagehead-act">'
    +(passos.length&&oculto?'<button type="button" class="lg-link" data-guia="mostrar">'+lgIc('eye')+'Mostrar guia</button>':'')
    +btn(T.sec,'ghost')+btn(T.pri,'red')
    +'</div></div>';
  if(passos.length&&!oculto){
    let cur=0; try{ if(GUIA_PASSO[v]) cur=Math.max(0,Math.min(passos.length-1,+GUIA_PASSO[v]()||0)); }catch(e){}
    const nx=H.n; const nxNome=nx?(NOME_PROPRIO[nx]||lgNomeVista(nx).tab||nx):'';
    html+='<div class="lg-guide" role="note" aria-label="Como fazer"><span class="lg-guide-lbl">Como fazer</span><ol>'
      +passos.map((p,i)=>(i?'<li class="arr" aria-hidden="true">→</li>':'')+'<li class="'+(i<cur?'done':(i===cur?'cur':''))+'"'+(i===cur?' aria-current="step"':'')+'><span class="n">'+(i<cur?'✓':(i+1))+'</span>'+lgEsc(p)+'</li>').join('')
      +'</ol><div class="lg-guide-act">'
      +(nx?'<button type="button" class="lg-guide-next" data-to="'+nx+'">A seguir: '+lgEsc(nxNome)+' '+lgIc('arrow-right')+'</button>':'')
      +'<button type="button" class="lg-iconbtn lg-guide-hide" data-guia="ocultar" title="Ocultar o guia neste ecrã" aria-label="Ocultar o guia neste ecrã">'+lgIc('eye-off')+'</button>'
      +'</div></div>';
  }
  head.innerHTML=html;
  head.querySelectorAll('[data-fn]').forEach(b=>b.onclick=()=>{ try{ window[b.dataset.fn](); }catch(e){ console.warn(e); } });
  head.querySelectorAll('[data-guia]').forEach(b=>b.onclick=()=>lgGuiaOcultar(v,b.dataset.guia==='ocultar'));
  head.querySelectorAll('[data-to]').forEach(b=>b.onclick=()=>showView(b.dataset.to));
}

/* menu lateral: áreas (com os separadores da ativa por baixo) e rodapé */
function lgMontarMenu(){
  const nav=document.getElementById('lgNav'), foot=document.getElementById('lgFootNav'); if(!nav||!foot) return;
  const item=a=>'<button type="button" class="lg-nav-item" id="nava-'+a.k+'">'+lgIc(a.ic)+'<span>'+lgEsc(a.t)+'</span></button><div class="lg-nav-sub" id="navsub-'+a.k+'" hidden></div>';
  nav.innerHTML=AREAS.filter(a=>a.k!=='admin').map(item).join('');
  const ad=AREAS.find(a=>a.k==='admin');
  foot.innerHTML=(ad?item(ad):'')+'<button type="button" class="lg-nav-item" id="nav-ajuda">'+lgIc('circle-help')+'<span>Ajuda</span></button>';
  AREAS.forEach(a=>{ const b=document.getElementById('nava-'+a.k); if(b) b.onclick=()=>abrirArea(a.k); });
  document.getElementById('nav-ajuda').onclick=()=>{ try{ abrirAjuda(); }catch(e){} };
  const ver=document.getElementById('lgUserVer'); if(ver&&window.APP) ver.textContent='v'+APP.versao;
}
function lgUtilizador(){
  const u=(typeof SESSION!=='undefined'&&SESSION&&SESSION.user)||null;
  const nomeEl=document.getElementById('lgUserNome'), av=document.getElementById('lgAvatar'); if(!nomeEl||!av) return;
  if(!u){ nomeEl.textContent='Sem sessão'; av.textContent='–'; return; }
  const md=u.user_metadata||{};
  let nome=md.full_name||md.name||'';
  if(!nome&&u.email){ nome=u.email.split('@')[0].split(/[._-]+/).filter(Boolean).map(w=>w[0].toUpperCase()+w.slice(1)).join(' '); }
  nomeEl.textContent=nome||u.email||'Utilizador'; nomeEl.title=u.email||'';
  const ini=(nome||u.email||'?').split(/\s+/).filter(Boolean); av.textContent=((ini[0]||'?')[0]+((ini.length>1?ini[ini.length-1][0]:'')||'')).toUpperCase();
}
/* projeto ativo no menu: uma linha de meta (segmento · ABC · fogos) */
function lgProjMeta(){
  const el=document.getElementById('lgProjMeta'); if(!el||typeof CTX==='undefined') return;
  if(!CTX.nome){ el.textContent='Sem projeto ativo'; return; }
  const D=CTX.D||{}, p=[];
  if(D.segmento){ try{ p.push(segLabel(D.segmento)); }catch(e){ p.push(D.segmento); } }
  if(D.abc>0) p.push(Math.round(D.abc).toLocaleString('pt-PT')+' m² ABC');
  if(D.fogos>0) p.push(D.fogos+' fogos');
  el.textContent=p.length?p.join(' · '):'Descritores por preencher';
  try{ const v=ajudaVistaAtiva(); if(document.getElementById('view-'+v)) lgCabecalho(v); }catch(e){}   // o passo atual do guia pode depender do projeto
  try{ if(typeof IMP!=='undefined'&&IMP.ficheiro) impMostrar(); }catch(e){}   // Importar: o botão Confirmar depende do projeto ativo
}
/* menu em ecrãs estreitos (< 900 px): abre por cima do conteúdo */
function lgMenuMovel(on){
  const b=document.body; const abrir=(on===undefined)?!b.classList.contains('lg-nav-open'):!!on;
  b.classList.toggle('lg-nav-open',abrir);
}

(function uxMount(){
  lgMontarMenu();
  // Mapa de quantidades: resultados em separadores
  uxMountTabs();
  // começar no Resumo
  try{ showView('resumo'); }catch(e){}
})();

/* Separadores dos resultados do MQ. Sem MutationObserver: quem mostra ou esconde um
   cartão de resultados (runAnalysis, analisarPricingCompleto) chama uxTabSync(). */
function uxMountTabs(){
  const res=document.getElementById('results'); if(!res||res.querySelector('.uxtabs')) return;
  const cards=[...res.children].filter(c=>c.classList&&c.classList.contains('card'));
  if(cards.length<3) return;
  const pick=re=>cards.find(c=>re.test((c.querySelector('h2')||{}).textContent||''));
  const T=[['Alertas',pick(/Alertas/)],['Custos',pick(/Custos por cap/)],['Quantidades',pick(/Quantidades f/)],['Rácios',pick(/rácio vs/i)],['Alterações',pick(/Alterações face/)]].filter(x=>x[1]);
  const bar=uxEl('div',{class:'uxtabs'});
  T.forEach(([lbl],i)=>{ const b=uxEl('button',{},lbl); b.onclick=()=>uxTab(i); bar.appendChild(b); });
  cards[0].after(bar);
  window.__uxTabs=T; window.__uxTabBar=bar; window.__uxTabCur=0;
  uxTab(0);
}
function uxTabSync(){
  const T=window.__uxTabs, bar=window.__uxTabBar; if(!T||!bar) return;
  T.forEach(([l,c],i)=>{ const b=bar.children[i]; const off=c.classList.contains('hidden'); if(b) b.hidden=off; });
  if(T[window.__uxTabCur] && T[window.__uxTabCur][1].classList.contains('hidden')) uxTab(0);
}
function uxTab(i){
  const T=window.__uxTabs, bar=window.__uxTabBar; if(!T) return;
  window.__uxTabCur=i;
  T.forEach(([l,c],k)=>{ if(k===i) c.removeAttribute('data-uxhide'); else c.setAttribute('data-uxhide',''); if(bar.children[k]) bar.children[k].classList.toggle('on',k===i); });
  uxTabSync();
}

/* contexto único: seletores de projeto seguem o projeto ativo */
function ctxSeguirSeletores(v){
    const map={execucao:['gxProj','dvProj'],racios:['rxProj'],precomq:['mqProj'],consultas:['mcProj']};
    (map[v]||[]).forEach(id=>{
      const el=document.getElementById(id); if(!el||typeof CTX==='undefined'||!CTX.nome) return;
      if(id==='dvProj'){ try{ vfDvFillProjects(); }catch(e){} }
      setTimeout(()=>{
        if(el.tagName==='SELECT'){ const o=[...el.options].find(x=>norm(x.text)===norm(CTX.nome)||norm(x.value)===norm(CTX.nome)); if(o&&el.value!==o.value){ el.value=o.value; el.dispatchEvent(new Event('change',{bubbles:true})); } }
        else if(el.value!==CTX.nome){ el.value=CTX.nome; el.dispatchEvent(new Event('change',{bubbles:true})); el.dispatchEvent(new Event('input',{bubbles:true})); }
      },120);
    });
}

/* Resumo do projeto — Fase 6 · Legendre: faixa de descritores, ciclo do projeto (4 passos),
   próximas ações por prioridade e orçamento face ao BP. Tudo deriva do que já está gravado. */
const RS_SEMAFORO=['racio','consulta','antiga','firme','compromisso'];   // ordem da barra de consolidação
function lgBadge(txt,tom){ return '<span class="lg-badge" data-tone="'+(tom||'neutral')+'">'+lgEsc(txt)+'</span>'; }
function lgKV(l,v,cls){ return '<div class="lg-kv'+(cls?' '+cls:'')+'"><span>'+l+'</span><b>'+v+'</b></div>'; }
function lgConsBar(porEst,total){
  if(!total) return '';
  return '<div class="lg-consbar" role="img" aria-label="Consolidação por estado">'+RS_SEMAFORO.filter(k=>porEst[k]>0)
    .map(k=>'<span data-e="'+k+'" style="width:'+(porEst[k]/total*100).toFixed(2)+'%" title="'+lgEsc(((typeof ORC_EST!=='undefined'&&ORC_EST[k])||{}).lbl||k)+': '+uxFmtEur(porEst[k])+'"></span>').join('')+'</div>';
}
async function uxRenderResumo(){
  const box=document.getElementById('rsBody'); if(!box) return;
  const nome=(typeof CTX!=='undefined'&&CTX.nome)||'';
  if(!nome){ box.innerHTML=''; return; }   // o estado vazio (.ux-empty) explica o que fazer
  box.innerHTML='<div class="lg-loading">A carregar…</div>';
  const online=(typeof SESSION!=='undefined'&&SESSION&&typeof sb!=='undefined'&&sb);
  const D=CTX.D||{};
  const proj=(typeof PROJETOS!=='undefined'?PROJETOS:[]).find(p=>norm(p.nome)===norm(nome))||null;
  const faltam=[['abc','ABC'],['fogos','nº de fogos'],['implantacao','área de implantação'],['pisosA','pisos acima do solo']].filter(([k])=>!(D[k]>0)).map(x=>x[1]);
  let an=null, orc=null, cons=[], adj=[], ver=null;
  if(online){
    try{ if(proj){ const r=await sb.from('analises').select('*').eq('projeto_id',proj.id).order('id',{ascending:false}).limit(1); an=(r.data&&r.data[0])||null; } }catch(e){}
    try{ orc=await orcLerAtual(nome); }catch(e){}
    try{ if(!CONSULTAS||!CONSULTAS.length) await loadConsultas(); cons=(CONSULTAS||[]).filter(c=>norm(c.projeto)===norm(nome)); }catch(e){}
    try{ const r=await sb.from('adjudicacoes').select('*').eq('projeto',nome); adj=r.data||[]; }catch(e){}
    try{ ver=(await orcVersoes(nome,1))[0]||null; }catch(e){}
  }
  if(((typeof CTX!=='undefined'&&CTX.nome)||'')!==nome) return;   // o projeto mudou entretanto
  /* orçamento */
  const linhas=(orc&&orc.linhas)||[];
  const EST={}; (typeof ORC_ESTADOS!=='undefined'?ORC_ESTADOS:[]).forEach(e=>EST[e.k]=e);
  const mig=e=>{try{return migrarEstado(e)}catch(x){return e}};
  const total=linhas.reduce((s,r)=>s+(+r.valor||0),0);
  const porEst={}; linhas.forEach(r=>{const k=mig(r.estado)||'racio'; porEst[k]=(porEst[k]||0)+(+r.valor||0);});
  const solido=linhas.filter(r=>EST[mig(r.estado)]&&EST[mig(r.estado)].solido).reduce((s,r)=>s+(+r.valor||0),0);
  const pctSol=total?Math.round(solido/total*100):0;
  const racioLin=linhas.filter(r=>mig(r.estado)==='racio'&&(+r.valor||0)>0);
  const racioVal=racioLin.reduce((s,r)=>s+(+r.valor||0),0);
  /* análise do MQ */
  const al=(an&&an.payload&&an.payload.alertas)||[];
  const nErr=al.filter(a=>/err/i.test(a.sev)).length, nAv=al.filter(a=>/av|warn/i.test(a.sev)).length;
  /* consultas e execução */
  const ec=c=>{try{return estadoConsulta(c).k}catch(e){return ''}};
  const cAtr=cons.filter(c=>ec(c)==='atraso'), cAg=cons.filter(c=>ec(c)==='aguarda'), cRec=cons.filter(c=>ec(c)==='recebida');
  const adjTot=adj.reduce((s,a)=>s+(+a.adjudicado||0),0);
  const dt=d=>d?new Date(d).toLocaleDateString('pt-PT'):'';
  const n0=v=>Math.round(v).toLocaleString('pt-PT');

  /* 1 · faixa de descritores */
  let segTxt=''; try{ segTxt=D.segmento?segLabel(D.segmento):''; }catch(e){ segTxt=D.segmento||''; }
  const DESC=[['ABC total',D.abc,'m²'],['Acima solo',D.acima,'m²'],['Fogos',D.fogos,''],
    [D.pisosB?'Pisos (+ enterr.)':'Pisos',(D.pisosA>0||D.pisosB>0)?((D.pisosA||0)+(D.pisosB?' + '+D.pisosB:'')):null,''],['Implantação',D.implantacao,'m²'],['Lote',D.lote,'m²']];
  let html='<section class="lg-desc">'
    +'<div class="lg-desc-id">'+(segTxt?lgBadge(segTxt,'inverse'):lgBadge('Segmento por definir','warning'))
    +((proj&&proj.tipologia)?'<span class="lg-desc-tipo">'+lgEsc(proj.tipologia)+'</span>':'')+'</div>'
    +'<div class="lg-desc-cols">'+DESC.map(([l,v,u])=>'<div class="lg-desc-c"><div class="lg-eyebrow">'+l+'</div><div class="lg-desc-v">'
      +(v!=null&&v!==''&&(typeof v!=='number'||v>0)?(typeof v==='number'?n0(v):lgEsc(v))+(u?'<small>'+u+'</small>':''):'<span class="lg-miss">—</span>')+'</div></div>').join('')+'</div>'
    +'</section>';

  /* 2 · ciclo do projeto */
  const passos=[
    {v:'estimador',n:1,t:'Estimar', feito:!faltam.length,
     badge:faltam.length?['Descritores','warning']:['Concluído','success'],
     val:D.abc>0?(n0(D.abc)+' m² ABC'):'Sem ABC', sub:(D.fogos>0?D.fogos+' fogos · ':'')+(faltam.length?'Falta: '+faltam.join(', '):'Descritores completos'), cta:faltam.length?'Completar':'Abrir estimativa'},
    {v:'analisador',n:2,t:'Rever projeto', feito:!!an&&!(nErr+nAv),
     badge:an?((nErr+nAv)?['A rever','warning']:['Concluído','success']):['Por fazer','neutral'],
     val:an?(al.length+' alerta'+(al.length===1?'':'s')):'—', sub:an?(nErr+' erros · '+nAv+' avisos · '+(an.ficheiro||an.nome||'MQ analisado')):'Ainda sem análise do MQ gravada', cta:an?'Rever MQ':'Carregar MQ'},
    {v:'orcamento',n:3,t:'Orçamentar', feito:total>0&&pctSol>=90,
     badge:total?(pctSol>=90?['Concluído','success']:['Em curso','accent']):['Por iniciar','neutral'],
     val:total?(pctSol+'% consolidado'):'—', bar:total?lgConsBar(porEst,total):'', sub:total?(uxFmtM(total)+(D.abc>0?' · '+n0(total/D.abc)+' €/m²':'')):'Sem orçamento em curso gravado', cta:total?'Abrir orçamento':'Arrancar'},
    {v:'execucao',n:4,t:'Executar', feito:false,
     badge:adj.length?['Em curso','neutral']:['Por iniciar','neutral'],
     val:adj.length?uxFmtM(adjTot):'—', sub:adj.length?(adj.length+' pacote(s) adjudicado(s)'):'Começa depois da transferência para a Produção', cta:'Abrir execução'}
  ];
  const iCur=passos.findIndex(p=>!p.feito);
  html+='<section class="lg-cycle-wrap"><h2 class="lg-section-title">Ciclo do projeto</h2><div class="lg-cycle">'+passos.map((p,i)=>
    '<button type="button" class="lg-stage" data-st="'+(p.feito?'done':(i===iCur?'cur':'next'))+'" data-to="'+p.v+'">'
    +'<span class="lg-stage-h"><span>'+p.n+' · '+p.t+'</span>'+lgBadge(p.badge[0],p.badge[1])+'</span>'
    +'<span class="lg-stage-v">'+lgEsc(p.val)+'</span>'+(p.bar||'')
    +'<span class="lg-stage-s">'+lgEsc(p.sub)+'</span>'
    +'<span class="lg-stage-cta">'+lgEsc(p.cta)+' →</span></button>').join('')+'</div></section>';

  /* 3 · próximas ações (por prioridade) */
  const acts=[];
  if(cAtr.length) acts.push({ic:'triangle-alert',tom:'danger',t:cAtr.length+' consulta(s) sem resposta fora do prazo',s:[...new Set(cAtr.map(c=>c.cap))].slice(0,4).join(' · '),to:'consultas',b:'Abrir consultas'});
  if(an&&(nErr+nAv)) acts.push({ic:'circle-alert',tom:'warning',t:(nErr+nAv)+' alertas na última análise do MQ',s:nErr+' erros · '+nAv+' avisos · '+(an.ficheiro||''),to:'analisador',b:'Rever MQ'});
  if(racioLin.length) acts.push({ic:'wallet',tom:'accent',t:racioLin.length+' capítulo(s) ainda estimados por rácio',s:uxFmtEur(racioVal)+(total?' · '+Math.round(racioVal/total*100)+'% do orçamento':''),to:'consultas',b:'Abrir consulta'});
  if(cAg.length) acts.push({ic:'hourglass',tom:'neutral',t:cAg.length+' consulta(s) a aguardar resposta',s:'Dentro do prazo',to:'consultas',b:'Ver'});
  if(faltam.length) acts.push({ic:'ruler',tom:'neutral',t:'Descritores em falta: '+faltam.join(', '),s:'Sem eles, alguns rácios usam m² de ABC como aproximação',fn:'abrirDescritores',b:'Completar'});
  if(!total) acts.push({ic:'sparkles',tom:'neutral',t:'Arrancar o orçamento',s:'A partir da estimativa por rácios ou de um resumo em Excel',to:'orcamento',b:'Abrir orçamento'});
  const actHtml=acts.length?acts.map(a=>'<div class="lg-act"><span class="lg-act-ic" data-tone="'+a.tom+'">'+lgIc(a.ic)+'</span><div class="lg-act-tx"><b>'+lgEsc(a.t)+'</b><span>'+lgEsc(a.s)+'</span></div>'
    +'<button type="button" class="btn ghost sm" data-noic '+(a.to?'data-to="'+a.to+'"':'data-fn="'+a.fn+'"')+'>'+lgEsc(a.b)+'</button></div>').join('')
    :'<div class="lg-vazio">Nada pendente neste momento.</div>';

  /* 4 · orçamento face ao BP */
  const bp=+(document.getElementById('estBudget')||{}).value||0;
  let right=lgKV('Orçamento em curso',total?uxFmtEur(total):'—')+lgKV('Valor consolidado',total?uxFmtEur(solido)+' ('+pctSol+'%)':'—');
  if(bp){ const f=bp-total; right+=lgKV('Budget do BP (hard costs)',uxFmtEur(bp))+lgKV(f<0?'Excesso face ao BP':'Folga face ao BP','<span class="'+(f<0?'lg-neg':'lg-pos')+'">'+uxFmtEur(Math.abs(f))+'</span>','lg-kv-tot'); }
  else right+=lgKV('Budget do BP','<span class="lg-miss">Indica-o na Estimativa</span>');
  right+=lgKV('Consultas',cons.length+' ('+cRec.length+' com proposta)');
  right+='<p class="lg-meta">'+(ver?('Última versão gravada: rev. '+ver.versao+((ver.criado_em||ver.created_at)?' · '+dt(ver.criado_em||ver.created_at):'')):'Sem versões gravadas')+(orc&&orc.atualizado?' · orçamento atualizado a '+dt(orc.atualizado):'')+'</p>';
  html+='<div class="lg-cols"><section class="lg-section lg-col-main"><h2 class="lg-section-title">Próximas ações</h2><div class="lg-acts">'+actHtml+'</div></section>'
    +'<section class="lg-section lg-col-side"><h2 class="lg-section-title">Orçamento face ao BP</h2><div class="lg-pad">'+right+'</div></section></div>';
  if(!online) html='<div class="lg-note">Modo local: inicia sessão para ver os dados gravados deste projeto.</div>'+html;
  box.innerHTML=html;
  box.querySelectorAll('[data-to]').forEach(b=>b.onclick=()=>showView(b.dataset.to));
  box.querySelectorAll('[data-fn]').forEach(b=>b.onclick=()=>{ try{ window[b.dataset.fn](); }catch(e){ console.warn(e); } });
}

/* ═══════════ Entrega 2 · ícones, títulos curtos, zona de ficheiros, estado vazio ═══════════ */
(function uxE2(){
  const ic=n=>'<i class="icon-'+n+'" aria-hidden="true"></i>';
  const addIc=(el,n)=>{ if(!el||el.querySelector('[class^="icon-"]')) return; el.insertAdjacentHTML('afterbegin',ic(n)); };
  // menu
  document.querySelectorAll('.purpose .toggle').forEach(b=>addIc(b,'circle-help'));
  // ícones nos botões, pelo texto
  const RULES=[[/^exportar|excel|descarregar/i,'download'],[/^gravar|^guardar/i,'save'],[/^importar|^carregar|^largar/i,'upload'],[/arrancar/i,'sparkles'],[/^registar|^adicionar|^novo|^nova|^abrir/i,'plus'],[/^editar/i,'pencil'],[/^eliminar|^apagar/i,'trash-2'],[/^comparar/i,'git-compare'],[/^repor/i,'rotate-ccw'],[/^aplicar/i,'check'],[/^cancelar|^fechar/i,'x'],[/^o que significam/i,'book-open']];
  const iconize=window.uxIcones=root=>(root||document).querySelectorAll('.btn,.btnctx').forEach(b=>{
    if(b.hasAttribute('data-noic')) return;   // Fase 6: botões com ícone (ou sem) escolhido pelo ecrã
    const t=(b.textContent||'').trim(); const r=RULES.find(([re])=>re.test(t)); if(r) addIc(b,r[1]);
    const first=b.firstChild; if(first&&first.nodeType===3&&/^\s*\?\s*/.test(first.nodeValue)&&/\?/.test(first.nodeValue)) first.nodeValue=first.nodeValue.replace(/^\s*\?\s*/,'');
  });
  iconize(document);
  // zona de ficheiros
  document.querySelectorAll('.drop').forEach(d=>{ if(!d.querySelector('.drop-ic')) d.insertAdjacentHTML('afterbegin','<span class="drop-ic">'+ic('upload')+'</span>'); });
  // estado vazio: um só aviso ao centro em vez de repetir em cada bloco
  const NEED=['resumo','estimador','analisador','orcamento','consultas','precomq','execucao','verificar'];
  NEED.forEach(v=>{
    const view=document.getElementById('view-'+v); if(!view||view.querySelector('.ux-empty')) return;
    view.classList.add('needs-project');
    const box=document.createElement('div'); box.className='ux-empty';
    box.innerHTML='<span class="ux-empty-ic">'+ic('folder-open')+'</span><div><h3>Escolhe um projeto para começar</h3><p>Escolhe um projeto existente em «Projeto ativo», no menu lateral, ou escreve o nome de um novo.</p></div><button class="btn red" type="button">'+ic('folder-search')+'Escolher projeto</button>';
    box.querySelector('button').onclick=e=>{ try{ lgMenuMovel(true); }catch(err){} const i=document.getElementById('ctxNome'); if(i){ i.focus(); } try{ toggleCtxLista(e); }catch(err){} };
    const pu=view.querySelector('.purpose'); if(pu) pu.insertAdjacentElement('afterend',box); else view.prepend(box);
  });
  try{ document.body.classList.toggle('no-project',!(CTX&&CTX.nome)); }catch(e){}
  /* conteúdo desenhado depois (tabelas, modais): showView volta a pôr os ícones na vista aberta — sem MutationObserver */
})();

/* Fase 6: o bloco «Como usar a plataforma» do Resumo deu lugar ao ciclo do projeto (uxRenderResumo)
   e ao guia «Como fazer» do cabeçalho; as explicações por separador estão na Ajuda (HELP). */

APP_REGISTAR('11-ux','3.5.1');
