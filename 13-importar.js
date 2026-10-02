/* Solive · Orçamentação — 13-importar.js
   Importador único (Fase 2): uma zona para largar qualquer Excel. A plataforma
   reconhece o tipo de ficheiro, pede confirmação e entrega-o ao processador que
   já existia no ecrã certo (não há um segundo leitor por tipo — reutiliza-se o mesmo).
   Versão: ver APP_REGISTAR no fim do ficheiro (tem de ser igual à do index.html). */

const IMP_TIPOS={
  mq:         {lbl:'Mapa de quantidades',                         ic:'file-spreadsheet', destino:'Orçamentar / Mapa de quantidades',                     projeto:true},
  pricing:    {lbl:'Pricing sheet Legendre',                       ic:'file-spreadsheet', destino:'Orçamentar / Mapa de quantidades · leitura completa',  projeto:true},
  resumo:     {lbl:'Resumo do orçamento',                          ic:'list-checks',      destino:'Orçamentar / Orçamento',                               projeto:true},
  proposta:   {lbl:'Proposta de fornecedor',                       ic:'handshake',        destino:'Orçamentar / Orçamento',                               projeto:true},
  auto:       {lbl:'Auto de medição',                              ic:'ruler',            destino:'Obra / Autos de medição',                              projeto:true},
  transferido:{lbl:'Orçamento transferido',                        ic:'file-check',       destino:'Obra / Adjudicações e desvios',                        projeto:true},
  compras:    {lbl:'Ficheiro de compras',                          ic:'clipboard-list',   destino:'Importar / Biblioteca de compras (neste ecrã)',        projeto:false},
  precos_po:  {lbl:'Preços adjudicados Legendre-PO',               ic:'gavel',            destino:'Importar / Preços adjudicados (neste ecrã)',           projeto:false}
};
/* o que cada tipo traz (lista «O que a plataforma reconhece») */
const IMP_DESC={
  mq:'Artigos do projetista com designação, unidade e quantidade.',
  pricing:'Orçamento do empreiteiro com as folhas de capítulo e o resumo.',
  resumo:'Totais por capítulo com a fonte do preço (proposta recebida, antiga, sem fonte).',
  proposta:'Artigos com preço unitário e total de um subempreiteiro ou fornecedor.',
  auto:'Folha de auto com o total declarado do período.',
  transferido:'O orçamento por linha entregue à Produção.',
  compras:'Contratos e artigos (material e mão de obra) do ficheiro .xlsm.',
  precos_po:'Linhas das adjudicações validadas na Legendre-PO.'
};
let IMP={ficheiro:null, wb:null, sugestoes:[], escolhido:null, outros:false};

/* ---------- vista ---------- */
(function impMount(){
  const main=document.querySelector('main'); if(!main||document.getElementById('view-importar')) return;
  const v=document.createElement('div'); v.id='view-importar'; v.className='hidden';
  v.innerHTML='<div class="lg-cols">'
    +'<div class="lg-col-main lg-stack">'
    +'<div class="lg-drop" id="impDrop" role="button" tabindex="0" aria-label="Escolher ou largar o ficheiro Excel">'
    +'<span class="lg-drop-ic lg-notch"><i class="icon-upload" aria-hidden="true"></i></span>'
    +'<div class="lg-drop-t">Larga aqui o ficheiro Excel</div>'
    +'<p class="lg-drop-s">.xlsx ou .xlsm. A plataforma reconhece o tipo de ficheiro, pede-te confirmação e leva-o para o ecrã certo.</p>'
    +'<button type="button" class="btn ghost sm" data-noic id="impEscolher"><i class="icon-folder-open" aria-hidden="true"></i>Escolher ficheiro</button>'
    +'<div class="lg-drop-f" id="impDropF"></div></div>'
    +'<input type="file" id="impFile" accept=".xlsx,.xls,.xlsm" class="hidden">'
    +'<div id="impOut"></div></div>'
    +'<section class="lg-section lg-col-side"><h2 class="lg-section-title">O que a plataforma reconhece</h2><ul class="lg-imp-tipos">'
    +Object.entries(IMP_TIPOS).map(([k,t])=>'<li><span class="lg-imp-tic">'+lgIc(t.ic)+'</span><div><b>'+esc(t.lbl)+'</b><span>'+esc(IMP_DESC[k]||'')+'</span><span class="lg-imp-dest">→ '+esc(t.destino)+'</span></div></li>').join('')
    +'</ul></section></div>'
    +'<section class="lg-section" id="paCard"><h2 class="lg-section-title">Preços adjudicados · Legendre-PO</h2><div class="lg-pad"><p class="lg-meta" style="margin:8px 0 12px">Linhas das adjudicações <b>validadas</b> na plataforma de Adjudicações (Legendre-PO → <b>Exportações</b> → <b>Preços adjudicados para a Orçamentação (.xlsx)</b>). Entram na biblioteca como fonte «Adjudicação Legendre-PO» e são usadas no Orçamentar MQ e no preço por elemento. Reimportar atualiza as linhas já existentes, não as duplica.</p><div id="paOut"><span class="note" style="display:inline-block;margin:0">Ainda sem informação — inicia sessão.</span></div></div></section>'
    +'<section class="lg-section" id="cmCard"><h2 class="lg-section-title">Biblioteca de compras (fornecedores)</h2><div class="lg-pad"><p class="lg-meta" style="margin:8px 0 12px">Resultado da última importação do ficheiro de Compras (.xlsm). Traz preços de <b>material</b> (FOR/AL) e <b>mão de obra</b> (MO), marcados pelo tipo de contrato, e alimenta o Orçamentar MQ. Substitui a importação anterior.</p>'
    +'<input type="file" id="cmFile" accept=".xlsm,.xlsx" class="hidden"><span id="cmOut" class="note" style="display:inline-block;margin:0">Ainda não importaste o ficheiro de Compras nesta sessão.</span></div></section>';
  main.appendChild(v);
  const drop=document.getElementById('impDrop'), fi=document.getElementById('impFile');
  drop.onclick=()=>fi.click();
  drop.onkeydown=e=>{ if(e.key==='Enter'||e.key===' '){ e.preventDefault(); fi.click(); } };
  drop.ondragover=e=>{e.preventDefault();drop.classList.add('over')};
  drop.ondragleave=()=>drop.classList.remove('over');
  drop.ondrop=e=>{e.preventDefault();drop.classList.remove('over');if(e.dataTransfer.files[0])impCarregar(e.dataTransfer.files[0])};
  fi.onchange=()=>{ if(fi.files[0]) impCarregar(fi.files[0]); fi.value=''; };
})();

/* ---------- leitura e reconhecimento ---------- */
function impCarregar(f){
  const out=document.getElementById('impOut');
  out.innerHTML='<div class="lg-note">A ler <b>'+esc(f.name)+'</b>…</div>';
  const r=new FileReader();
  r.onload=e=>{
    let wb; try{ wb=XLSX.read(new Uint8Array(e.target.result),{type:'array'}); }
    catch(err){ out.innerHTML='<div class="lg-note lg-note-err">Não consegui abrir o ficheiro. Confirma que é um Excel (.xlsx ou .xlsm) válido.</div>'; return; }
    const S=impDetetar(wb,f.name);
    IMP={ficheiro:f, wb, sugestoes:S, escolhido:S[0]?S[0].tipo:null, outros:!S.length};
    const df=document.getElementById('impDropF'); if(df) df.innerHTML='Ficheiro lido: <b>'+esc(f.name)+'</b> — larga outro ou escolhe para trocar';
    impMostrar();
  };
  r.onerror=()=>{ out.innerHTML='<div class="lg-note lg-note-err">Não consegui ler o ficheiro.</div>'; };
  r.readAsArrayBuffer(f);
}

/* Devolve [{tipo, conf (0–100), motivo}] do mais provável para o menos provável.
   Cada teste usa o mesmo leitor do ecrã de destino; um erro num teste não impede os outros. */
function impDetetar(wb,nome){
  const S=[]; const linhas={};
  const rows=sn=>{ if(!linhas[sn]){ try{ linhas[sn]=XLSX.utils.sheet_to_json(wb.Sheets[sn],{header:1,raw:true,defval:null}); }catch(e){ linhas[sn]=[]; } } return linhas[sn]; };
  const add=(tipo,conf,motivo)=>{ const x=S.find(s=>s.tipo===tipo); if(x){ if(conf>x.conf){ x.conf=conf; x.motivo=motivo; } } else S.push({tipo,conf,motivo}); };
  const nomes=wb.SheetNames||[];
  // Preços adjudicados exportados da Legendre-PO (formato fixo, ver impPOCabecalho)
  try{ for(const sn of nomes){ const h=impPOCabecalho(rows(sn)); if(h){ add('precos_po',100,'folha «'+sn+'» exportada da Legendre-PO ('+Math.max(0,rows(sn).length-h.row-1)+' linhas)'); break; } } }catch(e){}
  // Compras: folhas Contratos + Artigos
  try{ const sh={}; nomes.forEach(n=>sh[n]=rows(n)); const p=vfParseCompras(sh);
       if(p&&p.recs&&p.recs.length) add('compras',100,'folhas de contratos e artigos com '+p.recs.length+' preços'); }catch(e){}
  // Auto de medição: folhas com cabeçalho de auto e total declarado
  try{ let n=0; nomes.forEach(sn=>{ const v=vfVerificarSheet(rows(sn),sn); if(v&&v.declared!=null) n++; });
       if(n) add('auto',95,n+' folha(s) de auto de medição com total declarado'); }catch(e){}
  // Resumo do orçamento com colunas de fonte do preço
  try{ const sn=nomes.find(n=>{ const d=detectSummary(rows(n)); return !!d; });
       if(sn) add('resumo',90,'folha «'+sn+'» com colunas de fonte do preço (proposta recebida / sem fonte)'); }catch(e){}
  // Pricing sheet: várias folhas de capítulo com Designação / Un. / Qt.
  let nCap=0;
  try{ nomes.filter(n=>!FOLHAS_IGNORAR.test(norm(n))).forEach(n=>{ const r=lerFolhaCapitulo(rows(n),n); if(r&&r.cap&&r.total>0) nCap++; });
       /* o pricing sheet completo traz também o resumo com a fonte do preço: a leitura completa vem primeiro */
       if(nCap>=3) add('pricing',S.some(s=>s.tipo==='resumo')?92:85,nCap+' folhas de capítulo com artigos e preços'); }catch(e){}
  // Orçamento por linha com totais (o orçamento transferido tem esta forma)
  try{ const sumSheet=nomes.find(sn=>/RESUMO|SUMMARY/i.test(sn));
       const alvo=sumSheet?[sumSheet]:nomes.filter(sn=>!/INDICE|ÍNDICE/i.test(sn));
       let nl=0; alvo.forEach(sn=>{ const m=vfReadOrcamento(rows(sn)); if(m&&m.length) nl+=m.length; });
       if(nl>=5) add('transferido',nCap>=3?60:45,'orçamento por linha com totais ('+nl+' linhas)'); }catch(e){}
  // Mapa de quantidades (com ou sem preços). Com cabeçalho reconhecido (Designação / Un. / Quant.)
  // é um sinal forte; reconhecido só pelo conteúdo das colunas é um sinal fraco.
  try{
    let best=null;
    nomes.forEach(sn=>{ const r=rows(sn); const l=vfReadMQ(r); if(!l||!l.length) return;
      let H=null; try{ H=detectHeader(r); }catch(e){}
      const forte=!!(H&&H.qt>=0&&H.desc>=0);
      if(!best||(forte&&!best.forte)||(forte===best.forte&&l.length>best.n)) best={sn,n:l.length,r,H,forte}; });
    if(best&&(best.forte||best.n>=5)){
      let comPreco=false;
      try{ if(best.H){ const pc=detectPriceCols(best.r,best.H); comPreco=pc&&pc.pUnit>=0; } }catch(e){}
      const base=best.forte?0:-30;
      if(!comPreco) add('mq',80+base,best.n+' artigos na folha «'+best.sn+'», sem preços');
      else{
        add('proposta',(nomes.length<=3?72:55)+base,best.n+' artigos com preço unitário e total');
        add('mq',(nomes.length<=3?60:70)+base,best.n+' artigos na folha «'+best.sn+'», já com preços');
      }
    }
  }catch(e){}
  // pistas pelo nome do ficheiro (só desempatam, nunca decidem sozinhas)
  const nn=norm(nome||'');
  const pista=(re,tipo)=>{ if(re.test(nn)){ const x=S.find(s=>s.tipo===tipo); if(x) x.conf=Math.min(100,x.conf+8); } };
  pista(/\bAUTO\b/,'auto'); pista(/PROPOSTA|OFERTA|ORCAMENTO .*FORNEC/,'proposta'); pista(/COMPRAS/,'compras');
  pista(/PRICING|SELLING/,'pricing'); pista(/RESUMO|SUMMARY/,'resumo'); pista(/\bMQ\b|MAPA DE QUANT|QUANTIDADES/,'mq'); pista(/TRANSFER|PRODUCAO/,'transferido');
  return S.sort((a,b)=>b.conf-a.conf);
}

/* Cartão de deteção: tipo reconhecido, porquê, confiança e destino. «Não é isto?» abre a lista
   dos outros tipos (os também detetados primeiro); escolher um atualiza o cartão; confirmar navega. */
function impNivel(conf){ return conf>=85?['Quase certo','success']:conf>=65?['Provável','warning']:['Pouco seguro','danger']; }
function impMostrar(){
  const out=document.getElementById('impOut'); const S=IMP.sugestoes; const f=IMP.ficheiro; if(!out||!f) return;
  const proj=(typeof CTX!=='undefined'&&CTX.nome)||'';
  const k=IMP.escolhido, T=k?IMP_TIPOS[k]:null, sug=S.find(s=>s.tipo===k)||null;
  const nFolhas=(IMP.wb.SheetNames||[]).length;
  let h='<section class="lg-section lg-imp-det"><div class="lg-imp-det-h"><div class="lg-eyebrow">'+(sug&&sug===S[0]?'Tipo reconhecido':(T?'Tipo escolhido por ti':'Tipo por escolher'))+'</div>'
    +'<span class="lg-meta" style="margin:0">'+esc(f.name)+' · '+nFolhas+' folha'+(nFolhas===1?'':'s')+'</span></div>';
  if(T){
    const nv=sug?impNivel(sug.conf):null;
    h+='<div class="lg-imp-det-t">'+lgIc(T.ic)+'<span>'+esc(T.lbl)+'</span></div><div class="lg-pad" style="padding-top:0">'
      +lgKV('Porquê',sug?esc(sug.motivo):'<span class="lg-miss">Escolhido à mão — o ecrã de destino diz-te se não o conseguir ler</span>')
      +lgKV('Confiança',nv?'<span class="lg-badge" data-tone="'+nv[1]+'">'+nv[0]+' · '+sug.conf+'%</span>':'—')
      +lgKV('Destino',esc(T.destino))
      +(T.projeto?lgKV('Projeto',proj?esc(proj):'<span class="lg-neg">Escolhe primeiro o projeto ativo no menu lateral</span>'):'')
      +'<div class="lg-imp-acts"><button type="button" class="btn red" data-noic id="impConfirmar"'+(T.projeto&&!proj?' disabled':'')+'>'+lgIc('check')+'Confirmar e abrir</button>'
      +'<button type="button" class="lg-link" id="impOutros" aria-expanded="'+(IMP.outros?'true':'false')+'">'+lgIc('file-question')+'Não é isto?</button></div></div>';
  } else {
    h+='<div class="lg-pad"><div class="lg-note" style="margin:8px 0 0">Não reconheci o tipo deste ficheiro. Escolhe abaixo o que é — o ecrã de destino diz-te se não o conseguir ler.</div></div>';
  }
  if(IMP.outros||!T){
    const alt=S.map(s=>s.tipo);
    const ks=Object.keys(IMP_TIPOS).filter(x=>x!==k).sort((a,b)=>(alt.includes(b)?1:0)-(alt.includes(a)?1:0));
    h+='<div class="lg-imp-outros"><div class="lg-eyebrow">Tratar como</div><div class="lg-imp-lista">'+ks.map(x=>{ const s=S.find(y=>y.tipo===x);
      return '<button type="button" class="lg-imp-op" data-tipo="'+x+'">'+lgIc(IMP_TIPOS[x].ic)+'<span><b>'+esc(IMP_TIPOS[x].lbl)+'</b><small>'+esc(IMP_TIPOS[x].destino)+'</small></span>'+(s?'<span class="lg-badge" data-tone="neutral">'+s.conf+'%</span>':'')+'</button>'; }).join('')+'</div></div>';
  }
  h+='</section>';
  out.innerHTML=h;
  try{ if(!document.getElementById('view-importar').classList.contains('hidden')) lgCabecalho('importar'); }catch(e){}   // guia: passo 2
  const bc=document.getElementById('impConfirmar'); if(bc) bc.onclick=()=>impAbrir(IMP.escolhido);
  const bo=document.getElementById('impOutros'); if(bo) bo.onclick=()=>{ IMP.outros=!IMP.outros; impMostrar(); };
  out.querySelectorAll('[data-tipo]').forEach(b=>b.onclick=()=>{ IMP.escolhido=b.dataset.tipo; IMP.outros=false; impMostrar(); });
}

/* ---------- encaminhar para o processador do ecrã de destino ---------- */
const impPausa=ms=>new Promise(r=>setTimeout(r,ms));
async function impAbrir(tipo){
  const f=IMP.ficheiro, T=IMP_TIPOS[tipo]; if(!f||!T) return;
  if(T.projeto&&!((typeof CTX!=='undefined')&&CTX.nome)){ alertx('Escolhe primeiro o projeto ativo no menu lateral — o ficheiro tem de entrar num projeto.'); return; }
  const semInput=()=>alertx('O teu navegador não deixa passar o ficheiro de um ecrã para outro. Abre «'+T.destino+'» e carrega lá o ficheiro.');
  try{
    if(tipo==='mq'||tipo==='pricing'){
      showView('analisador');
      const ok=await loadFile(f); if(!ok) return;
      if(tipo==='pricing'){ await analisarPricingCompleto(); }
      else toast('Mapa de quantidades carregado: escolhe a folha e carrega em «Analisar ficheiro», ou passa a «Orçamentar o MQ».');
    }
    else if(tipo==='resumo'){ showView('orcamento'); loadOrcResumo(f); }
    else if(tipo==='proposta'){ showView('orcamento'); loadOrcProp(f); }
    else if(tipo==='auto'){
      if(!definirFicheiroInput('vfFile',f)) return semInput();
      showView('verificar'); vfVerificarFile();
    }
    else if(tipo==='transferido'){
      if(!definirFicheiroInput('dvFile',f)) return semInput();
      showView('execucao');
      await impPausa(400);   // o seletor de projeto dos desvios segue o projeto ativo
      const sel=document.getElementById('dvProj');
      if(sel&&!sel.value&&CTX.nome){ const o=[...sel.options].find(x=>norm(x.value||x.text)===norm(CTX.nome)); if(o) sel.value=o.value; }
      vfDvImport();
      const card=document.getElementById('vfDvCard'); if(card) card.scrollIntoView({behavior:'smooth'});
    }
    else if(tipo==='precos_po'){
      impPOLer(IMP.wb,f.name);
      const c=document.getElementById('paCard'); if(c) c.scrollIntoView({behavior:'smooth'});
    }
    else if(tipo==='compras'){
      if(!definirFicheiroInput('cmFile',f)) return semInput();
      const o=document.getElementById('cmOut'); if(o) o.textContent='A importar…';
      await vfImportComprasFile();
      const c=document.getElementById('cmCard'); if(c) c.scrollIntoView({behavior:'smooth'});
    }
  }catch(e){ console.warn(e); alertx('Não consegui processar o ficheiro como «'+T.lbl+'»: '+(e.message||e)); }
}

/* ---------- Preços adjudicados da Legendre-PO (Fase 5) ----------
   O ficheiro vem do botão «Preços adjudicados para a Orçamentação (.xlsx)» da Legendre-PO
   (src/lib/precosAdjudicados.ts lá). Cada linha tem o id da linha da adjudicação: é a
   chave que torna a reimportação segura (atualiza em vez de duplicar). */
const IMP_PO_COLS={linha_id:/^ID DA LINHA/, po_numero:/^N.? ?ADJUDICA/, data:/^DATA$/, obra:/^OBRA$/, fornecedor:/^FORNECEDOR/,
  item_ref:/^REF/, descricao:/^DESCRI/, tipo_despesa:/^TIPO DE DESPESA/, rubrica_codigo:/^CODIGO$/, rubrica:/^RUBRICA/,
  quantidade:/^QUANTIDADE/, unidade:/^UNIDADE/, preco_bruto:/^PRECO UNITARIO$/, desconto1:/^DESCONTO 1/, desconto2:/^DESCONTO 2/,
  preco_unit:/^PRECO UNITARIO LIQUIDO/, total:/^TOTAL DA LINHA/};
let IMP_PO=null;
function impPOCabecalho(rows){
  for(let i=0;i<Math.min(rows.length,15);i++){
    const r=(rows[i]||[]).map(x=>norm(x));
    if(!r.some(x=>IMP_PO_COLS.linha_id.test(x))||!r.some(x=>IMP_PO_COLS.po_numero.test(x))) continue;
    const col={}; Object.entries(IMP_PO_COLS).forEach(([k,re])=>{ col[k]=r.findIndex(x=>re.test(x)); });
    if(col.descricao<0||col.preco_unit<0) continue;
    return {row:i,col};
  }
  return null;
}
function impPOData(v){
  if(v==null||v==='') return null;
  if(typeof v==='number'){ const d=new Date(Math.round((v-25569)*86400000)); return isNaN(d)?null:d.toISOString().slice(0,10); }
  const s=String(v).trim(); let m=s.match(/^(\d{4})-(\d{2})-(\d{2})/); if(m) return m[1]+'-'+m[2]+'-'+m[3];
  m=s.match(/^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{4})/); if(m) return m[3]+'-'+m[2].padStart(2,'0')+'-'+m[1].padStart(2,'0');
  return null;
}
function impPOLer(wb,ficheiro){
  const box=document.getElementById('paOut'); if(!box) return;
  let H=null, rows=null;
  for(const sn of wb.SheetNames){ const r=XLSX.utils.sheet_to_json(wb.Sheets[sn],{header:1,raw:true,defval:null}); const h=impPOCabecalho(r); if(h){ H=h; rows=r; break; } }
  if(!H){ box.innerHTML='<div class="note red">Não encontrei as colunas do ficheiro da Legendre-PO (ID da linha, Nº Adjudicação, Descrição, Preço unitário líquido). Confirma que é o ficheiro «legendre-precos-adjudicados.xlsx».</div>'; return; }
  const g=(r,k)=>H.col[k]>=0?r[H.col[k]]:null;
  const txt=v=>v==null?null:(String(v).trim()||null);
  const linhas=[]; let semPreco=0;
  for(let i=H.row+1;i<rows.length;i++){
    const r=rows[i]||[]; const id=txt(g(r,'linha_id')), d=txt(g(r,'descricao')); if(!id||!d) continue;
    const pu=vfNum(g(r,'preco_unit')); if(!(pu>0)){ semPreco++; continue; }
    linhas.push({linha_id:id, po_numero:txt(g(r,'po_numero')), data:impPOData(g(r,'data')), obra:txt(g(r,'obra')), fornecedor:txt(g(r,'fornecedor')),
      item_ref:txt(g(r,'item_ref')), descricao:d, tipo_despesa:txt(g(r,'tipo_despesa')), rubrica_codigo:txt(g(r,'rubrica_codigo')), rubrica:txt(g(r,'rubrica')),
      quantidade:vfNum(g(r,'quantidade')), unidade:txt(g(r,'unidade')), preco_bruto:vfNum(g(r,'preco_bruto')), desconto1:vfNum(g(r,'desconto1')),
      desconto2:vfNum(g(r,'desconto2')), preco_unit:pu, total:vfNum(g(r,'total')), ficheiro:ficheiro});
  }
  if(!linhas.length){ box.innerHTML='<div class="note red">O ficheiro não tem linhas com preço.</div>'; return; }
  // obras da Legendre-PO → projetos desta plataforma (por nome; o utilizador corrige)
  const obras={}; linhas.forEach(l=>{ const k=l.obra||'(sem obra)'; const o=obras[k]||(obras[k]={n:0,tot:0}); o.n++; o.tot+=(+l.total||0); });
  const projs=(typeof PROJETOS!=='undefined'?PROJETOS:[]);
  const tipos={}; linhas.forEach(l=>{ const k=l.tipo_despesa||'(sem tipo)'; tipos[k]=(tipos[k]||0)+1; });
  IMP_PO={linhas,ficheiro};
  const opts=sel=>'<option value="">— não ligar a um projeto —</option>'+projs.map(p=>'<option value="'+p.id+'"'+(sel===p.id?' selected':'')+'>'+esc(p.nome)+'</option>').join('');
  let h='<div class="note" style="margin-bottom:10px"><b>'+linhas.length+'</b> linhas com preço em <b>'+Object.keys(obras).length+'</b> obra(s)'+(semPreco?' · '+semPreco+' sem preço ignoradas':'')+'. Tipos de despesa: '+Object.entries(tipos).map(([k,n])=>esc(k)+' ('+n+')').join(' · ')+'</div>';
  h+='<table style="font-size:13px"><tr><th>Obra na Legendre-PO</th><th style="text-align:right">Linhas</th><th style="text-align:right">Valor</th><th>Projeto nesta plataforma</th></tr>'
    +Object.entries(obras).map(([k,o],i)=>{ const p=projs.find(x=>norm(x.nome)===norm(k)); return '<tr><td>'+esc(k)+'</td><td class="mono" style="text-align:right">'+o.n+'</td><td class="mono" style="text-align:right">'+fmt(o.tot,0)+' €</td><td><select data-obra="'+esc(k)+'" class="paObra" style="min-width:220px">'+opts(p?p.id:null)+'</select></td></tr>'; }).join('')+'</table>';
  h+='<div class="hint" style="margin-top:8px">O projeto dá o segmento aos preços. Uma obra sem projeto entra na mesma, mas só conta nas pesquisas sem filtro de projeto ou segmento.</div>';
  h+='<button type="button" class="btn red" style="margin-top:10px" onclick="impPOGravar()">Gravar '+linhas.length+' linhas na biblioteca</button>';
  box.innerHTML=h;
}
async function impPOGravar(){
  const box=document.getElementById('paOut'); if(!IMP_PO||!box) return;
  if(typeof sb==='undefined'||!sb||!SESSION){ alertx('Inicia sessão para gravar.'); return; }
  const mapa={}; box.querySelectorAll('select.paObra').forEach(s=>{ mapa[s.dataset.obra]=s.value?+s.value:null; });
  const rows=IMP_PO.linhas.map(l=>Object.assign({},l,{projeto_id:mapa[l.obra||'(sem obra)']||null}));
  box.innerHTML='<div class="note">A gravar '+rows.length+' linhas…</div>';
  try{
    for(let i=0;i<rows.length;i+=500){
      const r=await sb.from('preco_adjudicado').upsert(rows.slice(i,i+500),{onConflict:'linha_id'});
      if(r.error) throw r.error;
    }
    IMP_PO=null;
    toast('Preços adjudicados gravados: '+rows.length+' linhas.');
    await impEstadoPO();
  }catch(e){
    const msg=String(e.message||e);
    box.innerHTML='<div class="note red">Erro a gravar: '+esc(msg)+(/preco_adjudicado/.test(msg)&&/exist|relation|schema/i.test(msg)?'<br>Falta correr o SQL <b>F5_01_precos_adjudicados.sql</b> no Supabase.':'')+'</div>';
  }
}
async function impEstadoPO(){
  const box=document.getElementById('paOut'); if(!box||IMP_PO) return;
  if(typeof sb==='undefined'||!sb||!SESSION) return;
  try{
    const r=await sb.from('preco_adjudicado').select('obra,projeto_id,importado_em,total').order('importado_em',{ascending:false}).limit(5000);
    if(r.error) throw r.error;
    const d=r.data||[];
    if(!d.length){ box.innerHTML='<span class="note" style="display:inline-block;margin:0">A biblioteca ainda não tem preços adjudicados. Exporta o ficheiro na Legendre-PO e larga-o acima.</span>'; return; }
    const obras={}; d.forEach(x=>{ const k=x.obra||'(sem obra)'; const o=obras[k]||(obras[k]={n:0,lig:false}); o.n++; if(x.projeto_id) o.lig=true; });
    const ult=d[0].importado_em?new Date(d[0].importado_em).toLocaleDateString('pt-PT'):'—';
    box.innerHTML='<div class="note" style="margin:0">Na biblioteca: <b>'+d.length+'</b> linhas de '+Object.keys(obras).length+' obra(s) · última importação '+ult+'<br>'
      +Object.entries(obras).map(([k,o])=>esc(k)+' ('+o.n+(o.lig?'':' · sem projeto')+')').join(' · ')+'</div>';
  }catch(e){
    box.innerHTML='<span class="note" style="display:inline-block;margin:0">'+(/preco_adjudicado/.test(String(e.message||e))?'Falta correr o SQL F5_01_precos_adjudicados.sql no Supabase.':'Não consegui ler a biblioteca de preços adjudicados.')+'</span>';
  }
}

APP_REGISTAR('13-importar','3.5.0');
