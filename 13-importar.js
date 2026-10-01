/* Solive · Orçamentação — 13-importar.js
   Importador único (Fase 2): uma zona para largar qualquer Excel. A plataforma
   reconhece o tipo de ficheiro, pede confirmação e entrega-o ao processador que
   já existia no ecrã certo (não há um segundo leitor por tipo — reutiliza-se o mesmo).
   Versão: ver APP_REGISTAR no fim do ficheiro (tem de ser igual à do index.html). */

const IMP_TIPOS={
  mq:         {lbl:'Mapa de quantidades',                     destino:'Orçamentar › Mapa de quantidades',            projeto:true},
  pricing:    {lbl:'Pricing sheet (orçamento do empreiteiro)', destino:'Orçamentar › Mapa de quantidades · leitura completa', projeto:true},
  resumo:     {lbl:'Resumo do orçamento com fonte do preço',   destino:'Orçamentar › Orçamento',                      projeto:true},
  proposta:   {lbl:'Proposta de fornecedor',                   destino:'Orçamentar › Orçamento',                      projeto:true},
  auto:       {lbl:'Auto de medição',                          destino:'Obra › Autos de medição',                     projeto:true},
  transferido:{lbl:'Orçamento transferido para a Produção',    destino:'Obra › Adjudicações e desvios',               projeto:true},
  compras:    {lbl:'Ficheiro de Compras (material e mão de obra)', destino:'Biblioteca de compras (fica neste ecrã)', projeto:false}
};
let IMP={ficheiro:null, wb:null, sugestoes:[]};

/* ---------- vista ---------- */
(function impMount(){
  const main=document.querySelector('main'); if(!main||document.getElementById('view-importar')) return;
  const v=document.createElement('div'); v.id='view-importar'; v.className='hidden';
  v.innerHTML=uxPurpose('Importar','Importar ficheiro','Larga qualquer Excel: a plataforma reconhece o tipo de ficheiro e leva-o para o ecrã certo.')
    +'<div class="card"><div class="drop" id="impDrop"><span class="drop-ic"><i class="icon-upload" aria-hidden="true"></i></span>Larga aqui o ficheiro <b>.xlsx</b> ou <b>.xlsm</b> ou clica para escolher</div>'
    +'<input type="file" id="impFile" accept=".xlsx,.xls,.xlsm" class="hidden">'
    +'<div class="hint" style="margin-top:10px">Reconhece: mapa de quantidades · pricing sheet do empreiteiro · resumo do orçamento · proposta de fornecedor · auto de medição · orçamento transferido para a Produção · ficheiro de Compras.</div></div>'
    +'<div id="impOut"></div>'
    +'<div class="card" id="cmCard"><h2>Biblioteca de compras (fornecedores)</h2><div class="hint">Resultado da última importação do ficheiro de Compras (.xlsm). Traz preços de <b>material</b> (FOR/AL) e <b>mão de obra</b> (MO), marcados pelo tipo de contrato, e alimenta o Orçamentar MQ. Substitui a importação anterior.</div>'
    +'<input type="file" id="cmFile" accept=".xlsm,.xlsx" class="hidden"><span id="cmOut" class="note" style="display:inline-block;margin:0">Ainda não importaste o ficheiro de Compras nesta sessão.</span></div>';
  main.appendChild(v);
  const drop=document.getElementById('impDrop'), fi=document.getElementById('impFile');
  drop.onclick=()=>fi.click();
  drop.ondragover=e=>{e.preventDefault();drop.classList.add('over')};
  drop.ondragleave=()=>drop.classList.remove('over');
  drop.ondrop=e=>{e.preventDefault();drop.classList.remove('over');if(e.dataTransfer.files[0])impCarregar(e.dataTransfer.files[0])};
  fi.onchange=()=>{ if(fi.files[0]) impCarregar(fi.files[0]); fi.value=''; };
})();

/* ---------- leitura e reconhecimento ---------- */
function impCarregar(f){
  const out=document.getElementById('impOut');
  out.innerHTML='<div class="note">A ler <b>'+esc(f.name)+'</b>…</div>';
  const r=new FileReader();
  r.onload=e=>{
    let wb; try{ wb=XLSX.read(new Uint8Array(e.target.result),{type:'array'}); }
    catch(err){ out.innerHTML='<div class="note red">Não consegui abrir o ficheiro. Confirma que é um Excel (.xlsx ou .xlsm) válido.</div>'; return; }
    IMP={ficheiro:f, wb, sugestoes:impDetetar(wb,f.name)};
    document.getElementById('impDrop').innerHTML='<span class="drop-ic"><i class="icon-upload" aria-hidden="true"></i></span>Ficheiro: <b>'+esc(f.name)+'</b> — clica ou larga outro para trocar';
    impMostrar();
  };
  r.onerror=()=>{ out.innerHTML='<div class="note red">Não consegui ler o ficheiro.</div>'; };
  r.readAsArrayBuffer(f);
}

/* Devolve [{tipo, conf (0–100), motivo}] do mais provável para o menos provável.
   Cada teste usa o mesmo leitor do ecrã de destino; um erro num teste não impede os outros. */
function impDetetar(wb,nome){
  const S=[]; const linhas={};
  const rows=sn=>{ if(!linhas[sn]){ try{ linhas[sn]=XLSX.utils.sheet_to_json(wb.Sheets[sn],{header:1,raw:true,defval:null}); }catch(e){ linhas[sn]=[]; } } return linhas[sn]; };
  const add=(tipo,conf,motivo)=>{ const x=S.find(s=>s.tipo===tipo); if(x){ if(conf>x.conf){ x.conf=conf; x.motivo=motivo; } } else S.push({tipo,conf,motivo}); };
  const nomes=wb.SheetNames||[];
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

function impMostrar(){
  const out=document.getElementById('impOut'); const S=IMP.sugestoes; const f=IMP.ficheiro;
  const proj=(typeof CTX!=='undefined'&&CTX.nome)||'';
  const top=S[0];
  const btnTipo=(k,principal)=>'<button type="button" class="btn '+(principal?'red':'ghost')+'" onclick="impAbrir(\''+k+'\')">'+(principal?'Confirmar e abrir em ':'')+esc(principal?IMP_TIPOS[k].destino:IMP_TIPOS[k].lbl)+'</button>';
  let h='<div class="card"><h2>O que é este ficheiro?</h2>';
  if(top){
    const nivel=top.conf>=85?'Quase certo':top.conf>=65?'Provável':'Pouco seguro';
    h+='<div class="imp-sug"><div><div class="imp-k">Parece</div><div class="imp-t">'+esc(IMP_TIPOS[top.tipo].lbl)+'</div><div class="hint" style="margin:2px 0 0">'+nivel+' · '+esc(top.motivo)+'</div></div></div>';
    h+=IMP_TIPOS[top.tipo].projeto?('<div class="hint" style="margin-top:10px">'+(proj?'Entra no projeto ativo: <b>'+esc(proj)+'</b>. Se não for este, troca-o na barra do topo antes de confirmar.':'<span style="color:var(--err)"><b>Escolhe primeiro o projeto ativo</b> na barra do topo.</span>')+'</div>'):'';
    h+='<div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:12px">'+btnTipo(top.tipo,true)+'</div>';
  } else {
    h+='<div class="note">Não reconheci o tipo deste ficheiro. Escolhe abaixo o que é — o ecrã de destino diz-te se não o conseguir ler.</div>';
  }
  const outros=Object.keys(IMP_TIPOS).filter(k=>!top||k!==top.tipo);
  const alt=S.slice(1).map(s=>s.tipo);
  outros.sort((a,b)=>(alt.includes(b)?1:0)-(alt.includes(a)?1:0));
  h+='<div class="imp-outros"><div class="imp-k">'+(top?'Não é isso? Tratar como':'Tratar como')+'</div><div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:6px">'+outros.map(k=>btnTipo(k,false)).join('')+'</div></div>';
  h+='<div class="hint" style="margin-top:10px">Ficheiro: '+esc(f.name)+' · '+(IMP.wb.SheetNames||[]).length+' folha(s)</div></div>';
  out.innerHTML=h;
}

/* ---------- encaminhar para o processador do ecrã de destino ---------- */
const impPausa=ms=>new Promise(r=>setTimeout(r,ms));
async function impAbrir(tipo){
  const f=IMP.ficheiro, T=IMP_TIPOS[tipo]; if(!f||!T) return;
  if(T.projeto&&!((typeof CTX!=='undefined')&&CTX.nome)){ alertx('Escolhe primeiro o projeto ativo na barra do topo — o ficheiro tem de entrar num projeto.'); return; }
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
    else if(tipo==='compras'){
      if(!definirFicheiroInput('cmFile',f)) return semInput();
      const o=document.getElementById('cmOut'); if(o) o.textContent='A importar…';
      await vfImportComprasFile();
      const c=document.getElementById('cmCard'); if(c) c.scrollIntoView({behavior:'smooth'});
    }
  }catch(e){ console.warn(e); alertx('Não consegui processar o ficheiro como «'+T.lbl+'»: '+(e.message||e)); }
}

APP_REGISTAR('13-importar','3.0.0');
