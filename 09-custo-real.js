/* Solive · Orçamentação — 09-custo-real.js
   Custo real: verificar autos, rácios por elemento, orçamentar MQ, compras, desvios orçamento transferido vs real e relatório para a Administração.
   Versão: ver APP_REGISTAR no fim do ficheiro (tem de ser igual à do index.html). */

/* IMPORTAÇÃO CONFIÁVEL — ETAPAS 2 e 3 (bloco injetado) */
/* ==========================================================================
   IMPORTAÇÃO CONFIÁVEL — ETAPAS 2 e 3
   Etapa 2: lê um auto (formato Legendre), reconcilia a soma das linhas
            contra o total declarado, mostra veredicto + avisos. (só leitura)
   Etapa 3: mapeia os capítulos de origem -> taxonomia L'Urbain (confirmar
            uma vez) e GRAVA o custo com proveniência (custo_import +
            custo_linha + mapa_capitulo). Só grava se reconciliar e todos os
            capítulos estiverem mapeados.
   ========================================================================== */
function vfNorm(s){return String(s==null?"":s).normalize("NFD").replace(/[̀-ͯ]/g,"").replace(/\s+/g," ").toUpperCase().trim();}
function vfNum(v){
  if(v==null) return null;
  if(typeof v==="number") return isFinite(v)?v:null;
  const n=parseFloat(String(v).replace(/\s|€/g,"").replace(/\.(?=\d{3}(\D|$))/g,"").replace(",","."));
  return isFinite(n)?n:null;
}
const VF_ROMAN=/^M{0,4}(CM|CD|D?C{0,3})(XC|XL|L?X{0,3})(IX|IV|V?I{0,3})$/i;
/* marcador de linha/capítulo só de mão de obra (montagem sem fornecimento) */
const VF_MONTAGEM=/APENAS MONTAGEM|S[ÓO] MONTAGEM|EXCLUI FORNECIMENTO|SEM FORNECIMENTO|APENAS ASSENTAMENTO/;
function vfHeaderVal(rows,re){
  for(let i=0;i<Math.min(rows.length,14);i++){
    const r=rows[i]||[];
    for(let c=0;c<r.length;c++){ if(re.test(vfNorm(r[c]))){
      for(let k=c+1;k<r.length;k++){ if(r[k]!=null&&String(r[k]).trim()!=="") return r[k]; } } }
  }
  return null;
}
function vfFindHeader(rows){
  for(let i=0;i<Math.min(rows.length,25);i++){
    const r=(rows[i]||[]).map(vfNorm);
    const des=r.findIndex(x=>/DESIGNA/.test(x));
    const un=r.findIndex(x=>/^UN\.?$/.test(x));
    const con=r.findIndex(x=>/TOTAIS? FINA/.test(x));
    if(des>=0&&un>=0&&con>=0) return {row:i,des,un,qty:un+1,price:un+2,con};
  }
  return null;
}
function vfVerificarSheet(rows,sheetName){
  const H=vfFindHeader(rows);
  if(!H) return null;
  const contrato=vfHeaderVal(rows,/^CONTRATO N/);
  const subemp=vfHeaderVal(rows,/^SUBEMPREITEIRO/);
  const nif=vfHeaderVal(rows,/^NIF/);
  const obra=vfHeaderVal(rows,/CODIGO OBRA/);
  let autoNum=null;
  for(let i=0;i<Math.min(rows.length,6)&&autoNum==null;i++){
    const r=rows[i]||[];
    for(const cell of r){ const m=vfNorm(cell).match(/AUTO DE MEDICAO N\D*(\d+)/); if(m){ autoNum=parseInt(m[1],10); break; } }
  }
  const leaves=[]; const decContr=[]; let decGlobal=null; let secao=null, secaoNat='full', aditCtx=null;
  for(let i=H.row+1;i<rows.length;i++){
    const r=rows[i]||[];
    const a=String(r[0]==null?"":r[0]).trim();
    const d=String(r[H.des]==null?"":r[H.des]).trim();
    const un=String(r[H.un]==null?"":r[H.un]).trim();
    const q=vfNum(r[H.qty]),pu=vfNum(r[H.price]),tot=vfNum(r[H.con]);
    const dn=vfNorm(d);
    if(/^TOTAL DO CONTRATO/.test(dn)){ decContr.push(tot); aditCtx=null; continue; }
    if(/^VALOR GLOBAL/.test(dn)){ decGlobal=tot; break; }
    if(/^TOTAL DO ADITAMENTO/.test(dn)){ aditCtx=null; continue; }
    if(/^AD?\s?\d+$/i.test(a)&&d&&!un){ aditCtx=a; continue; }
    const isLeaf = un!=="" && q!=null && pu!=null && tot!=null;
    if(isLeaf){ const nat=VF_MONTAGEM.test(dn)?'labour':secaoNat; leaves.push({pos:i,a,d,un,q,pu,tot,cap:secao||"(sem capítulo)",adit:aditCtx,nat}); }
    else if(d&&!un){ if(VF_ROMAN.test(a)&&a){ secao=d; secaoNat=VF_MONTAGEM.test(dn)?'labour':'full'; } }
  }
  const sumLeaf=Math.round(leaves.reduce((s,l)=>s+l.tot,0)*100)/100;
  const declaredRaw = decGlobal!=null ? decGlobal
                    : decContr.reduce((s,x)=>s+(x||0),0);
  const declared = declaredRaw!=null ? Math.round(declaredRaw*100)/100 : null;
  const reconcilia = declared!=null && Math.abs(sumLeaf-declared)<0.005;
  const codes={}; leaves.forEach(l=>{ if(l.a) codes[l.a]=(codes[l.a]||0)+1; });
  const dupCodes=Object.keys(codes).filter(k=>codes[k]>1);
  const blankCodes=leaves.filter(l=>!l.a).length;
  const arithBad=leaves.filter(l=>Math.abs(Math.round(l.q*l.pu*100)/100-Math.round(l.tot*100)/100)>0.02).length;
  const chapters=[...new Set(leaves.map(l=>l.cap).filter(Boolean))];
  return {sheetName,contrato,subemp,nif,obra,autoNum,leaves,
          nLinhas:leaves.length,sumLeaf,declared,reconcilia,
          dupCodes,blankCodes,arithBad,chapters};
}
/* lista canónica de capítulos = referência L'Urbain (CAPS runtime, senão CAPS_BASE) */
function vfCanon(){
  try{ if(typeof CAPS!=="undefined"&&CAPS&&CAPS.length) return CAPS; }catch(e){}
  try{ if(typeof CAPS_BASE!=="undefined"&&CAPS_BASE&&CAPS_BASE.length) return CAPS_BASE; }catch(e){}
  return [];
}
function vfGuess(origem){ try{ return (typeof mapCapitulo==="function"&&mapCapitulo(origem))||""; }catch(e){ return ""; } }
function vfMoeda(n){ return (typeof fmt==="function")?fmt(n,2)+" €":Number(n).toFixed(2); }

/* --- ETAPA 3: construção do payload de gravação (função pura, testável) --- */
function vfBuildPayload(v, mapping){
  const header={
    projeto_ref: v.obra||null,
    contrato: v.contrato||null,
    subempreiteiro: v.subemp||null,
    nif: v.nif!=null?String(v.nif):null,
    obra_codigo: v.obra||null,
    segmento: (typeof CTX!=='undefined'&&CTX&&CTX.D&&CTX.D.segmento)||null,
    auto_numero: v.autoNum!=null?parseInt(v.autoNum,10)||null:null,
    ficheiro_nome: v.ficheiro||v.sheetName||null,
    total_declarado: v.declared,
    total_calculado: v.sumLeaf,
    reconcilia: !!v.reconcilia,
    estado: 'confirmado',
    avisos: {dupCodes:v.dupCodes, blankCodes:v.blankCodes, arithBad:v.arithBad}
  };
  const linhas=v.leaves.map(l=>({
    contrato: v.contrato||null,
    linha_pos: l.pos,
    art_codigo: l.a||null,
    capitulo_origem: l.cap||null,
    capitulo_canonico: mapping[l.cap]||null,
    designacao: l.d||null,
    unidade: l.un||null,
    quantidade: l.q,
    preco_unit: l.pu,
    total: l.tot,
    is_aditamento: !!l.adit,
    aditamento_ref: l.adit||null,
    natureza: l.nat||'full'
  }));
  const mapas=Object.keys(mapping).filter(k=>mapping[k]).map(k=>({capitulo_origem:k, capitulo_canonico:mapping[k]}));
  return {header, linhas, mapas};
}
/* grava no Supabase: apaga o custo anterior do mesmo contrato e insere de novo
   (o custo representa o CONTRATO — importar um auto mais recente refresca-o). */
async function vfGravar(sheetName){
  const v=(window.__vfState||{})[sheetName];
  if(!v){ toast("Verifica o ficheiro primeiro."); return; }
  if(!v.reconcilia){ toast("Não grava: o auto não reconcilia."); return; }
  const mapping={};
  let faltam=0;
  v.chapters.forEach((c,idx)=>{
    const sel=document.getElementById('vfmap_'+sheetName.replace(/\W/g,'')+'_'+idx);
    const val=sel?sel.value:"";
    if(!val) faltam++; else mapping[c]=val;
  });
  if(faltam){ toast("Faltam "+faltam+" capítulo(s) por mapear."); return; }
  if(typeof sb==="undefined"||!sb){ toast("Precisas de estar ligado e com sessão iniciada."); return; }
  const {header,linhas,mapas}=vfBuildPayload({...v,ficheiro:v.ficheiro||sheetName}, mapping);
  try{
    await sb.from('custo_import').delete().eq('contrato',header.contrato);
    const ins=await sb.from('custo_import').insert(header).select('id').single();
    if(ins.error) throw ins.error;
    const impId=ins.data.id;
    const withId=linhas.map(l=>({...l,import_id:impId}));
    const li=await sb.from('custo_linha').insert(withId);
    if(li.error) throw li.error;
    if(mapas.length) await sb.from('mapa_capitulo').upsert(mapas,{onConflict:'capitulo_origem,capitulo_canonico',ignoreDuplicates:true});
    toast("Custo gravado: "+linhas.length+" linhas · "+vfMoeda(header.total_calculado));
    const btn=document.getElementById('vfgrav_'+sheetName.replace(/\W/g,''));
    if(btn){ btn.textContent="✓ Gravado"; btn.disabled=true; }
  }catch(err){ toast("Erro a gravar: "+(err.message||err)); }
}

function vfVerificarFile(){
  const inp=document.getElementById('vfFile');
  const out=document.getElementById('vfOut');
  if(!inp.files||!inp.files[0]){ out.innerHTML='<div class="note">Escolhe um ficheiro .xlsx primeiro.</div>'; return; }
  const f=inp.files[0];
  const rd=new FileReader();
  rd.onload=e=>{
    let wb; try{ wb=XLSX.read(new Uint8Array(e.target.result),{type:'array'}); }
    catch(err){ out.innerHTML='<div class="note">Não consegui abrir o ficheiro.</div>'; return; }
    window.__vfState={};
    const cards=[];
    wb.SheetNames.forEach(sn=>{
      const rows=XLSX.utils.sheet_to_json(wb.Sheets[sn],{header:1,raw:true,defval:null});
      const v=vfVerificarSheet(rows,sn);
      if(!v||v.declared==null) return;
      v.ficheiro=f.name;
      window.__vfState[sn]=v;
      const key=sn.replace(/\W/g,'');
      const badge = v.reconcilia
        ? '<span style="background:#1c7c46;color:#fff;padding:2px 10px;border-radius:20px;font-weight:600;font-size:12px">RECONCILIA ✓</span>'
        : '<span style="background:#E62336;color:#fff;padding:2px 10px;border-radius:20px;font-weight:600;font-size:12px">NÃO RECONCILIA ✗</span>';
      const dif=Math.round((v.sumLeaf-v.declared)*100)/100;
      const avisos=[];
      if(v.dupCodes.length) avisos.push('Códigos de artigo repetidos: <b>'+esc(v.dupCodes.join(', '))+'</b>');
      if(v.blankCodes) avisos.push('<b>'+v.blankCodes+'</b> linhas sem código (identidade posicional)');
      if(v.arithBad) avisos.push('<b>'+v.arithBad+'</b> linhas onde Quant × Preço ≠ Total');
      const avHtml = avisos.length ? '<ul style="margin:8px 0 0 18px">'+avisos.map(a=>'<li>'+a+'</li>').join('')+'</ul>':'';
      // Etapa 3 — mapeamento de capítulos (só se reconcilia)
      let mapHtml='';
      if(v.reconcilia){
        const canon=vfCanon();
        const opts=cap=>{ const g=vfGuess(cap); return '<option value="">— escolher —</option>'+
          canon.map(c=>'<option'+(vfNorm(c)===vfNorm(g)?' selected':'')+'>'+esc(c)+'</option>').join(''); };
        mapHtml='<div style="margin-top:10px"><b>Mapear capítulos para a taxonomia L\u2019Urbain</b>'
          +'<table style="margin-top:6px;font-size:13px"><tr><th>Capítulo no ficheiro</th><th>Capítulo canónico</th></tr>'
          +v.chapters.map((c,idx)=>'<tr><td>'+esc(c)+'</td><td><select id="vfmap_'+key+'_'+idx+'" style="min-width:220px">'+opts(c)+'</select></td></tr>').join('')
          +'</table>'
          +'<button class="btn red" id="vfgrav_'+key+'" style="margin-top:10px" onclick="vfGravar(\''+sn.replace(/'/g,"\\'")+'\')">Gravar custo (confirmar)</button>'
          +' <span class="note" style="font-size:12px">Grava com proveniência. Reimportar um auto mais recente do mesmo contrato substitui o custo.</span></div>';
      }
      cards.push(
        '<div class="card" style="border-left:5px solid '+(v.reconcilia?'#1c7c46':'#E62336')+'">'
        +'<div style="display:flex;justify-content:space-between;align-items:center;gap:10px">'
        +'<div><b>'+esc(sn)+'</b> &middot; <span class="mono">'+esc(v.contrato||'—')+'</span><br>'
        +'<span style="font-size:13px;color:#48566b">'+esc((v.subemp||'').toString().slice(0,48))+'</span></div>'+badge+'</div>'
        +'<table style="margin-top:10px;font-size:13px"><tr><th>Linhas</th><th>Soma das linhas</th><th>Total declarado</th><th>Diferença</th></tr>'
        +'<tr><td class="mono">'+v.nLinhas+'</td><td class="mono">'+vfMoeda(v.sumLeaf)+'</td><td class="mono">'+vfMoeda(v.declared)+'</td>'
        +'<td class="mono" style="color:'+(Math.abs(dif)<0.005?'#1c7c46':'#E62336')+'">'+vfMoeda(dif)+'</td></tr></table>'
        +'<div style="margin-top:8px;font-size:13px;color:#48566b">Capítulos detetados: '+(v.chapters.length?esc(v.chapters.join(' · ')):'—')+'</div>'
        +avHtml+mapHtml+'</div>');
    });
    out.innerHTML = cards.length
      ? '<div class="note" style="margin-bottom:8px">A verificação é só de leitura. A gravação só fica disponível se o auto reconciliar e todos os capítulos estiverem mapeados.</div>'+cards.join('')
      : '<div class="note">Nenhuma folha reconhecida como auto de medição neste ficheiro.</div>';
  };
  rd.readAsArrayBuffer(f);
}
/* injeta o botão de navegação e a vista, sem editar o HTML existente */
(function vfMount(){
  if(document.getElementById('view-verificar')) return;
  const host=document.getElementById('view-comparar')||document.getElementById('view-consultas');
  if(host){
    const div=document.createElement('div');
    div.id='view-verificar'; div.className='hidden';
    div.innerHTML=
      '<h2 style="color:#201C1D">Verificar e Gravar Auto de Medição</h2>'
      +'<div class="note">Confirma que um auto <b>bate certo</b> (soma das linhas = total declarado, ao cêntimo), mapeia os capítulos para a taxonomia L\u2019Urbain, e grava o custo com proveniência. Reimportar um auto mais recente do mesmo contrato substitui o custo anterior.</div>'
      +'<div class="card" style="margin-top:10px"><label>Ficheiro do auto (.xlsx)</label> '
      +'<input type="file" id="vfFile" accept=".xlsx"> '
      +'<button class="btn navy" onclick="vfVerificarFile()">Verificar</button></div>'
      +'<div id="vfOut" style="margin-top:12px"></div>';
    host.parentNode.appendChild(div);
  }
})();

/* ==========================================================================
   ETAPA 4 — RÁCIOS a partir do custo real gravado
   ========================================================================== */
function vfRefEurM2(cap){
  try{ const c=REF.capitulos.find(x=>vfNorm(x.cap)===vfNorm(cap)); if(c&&REF.gfa) return c.total/REF.gfa; }catch(e){}
  return null;
}
/* Rácios por capítulo. Cada projeto é dividido pelos SEUS descritores (ABC e fogos
   gravados no projeto) e só depois se tira a mediana entre projetos. Antes, com
   "Todos os projetos", somava-se o custo de todos e dividia-se pela área de um só. */
function vfDescProj(nome){
  const pr=(typeof PROJETOS!=='undefined'?PROJETOS:[]).find(x=>vfNorm(x.nome)===vfNorm(nome));
  let abc=pr&&+pr.gfa>0?+pr.gfa:null, fogos=pr&&+pr.fogos>0?+pr.fogos:null;
  if(abc==null&&/URBAIN/i.test(nome||'')){ abc=REF.gfa; fogos=fogos||REF.fogos; }
  return {abc,fogos};
}
function vfRatios(lines){
  const g={};
  lines.forEach(l=>{
    const cap=l.capitulo_canonico||l.capitulo_origem||"(sem capítulo)";
    const nat=l.natureza||'full';
    const proj=l.__proj||'(sem projeto)';
    if(!g[cap]) g[cap]={cap,custo:0,nL:0,contratos:{},natCusto:{full:0,material:0,labour:0},natUnits:{},porProj:{}};
    const t=Number(l.total)||0; g[cap].custo+=t; g[cap].nL++;
    g[cap].porProj[proj]=(g[cap].porProj[proj]||0)+t;
    const cid=l.contrato||''; if(cid) g[cap].contratos[cid]=1;
    g[cap].natCusto[nat]=(g[cap].natCusto[nat]||0)+t;
    const u=vfUnit(l.unidade);
    if(u){ const key=nat+'|'+u; if(!g[cap].natUnits[key]) g[cap].natUnits[key]={nat,un:l.unidade,custo:0,qt:0}; g[cap].natUnits[key].custo+=t; g[cap].natUnits[key].qt+=Number(l.quantidade)||0; }
  });
  return Object.values(g).map(o=>{
    const custo=Math.round(o.custo*100)/100;
    const m2=[], fg=[], semDesc=[];
    Object.entries(o.porProj).forEach(([nome,v])=>{
      const d=vfDescProj(nome);
      if(d.abc) m2.push(v/d.abc); else semDesc.push(nome);
      if(d.fogos) fg.push(v/d.fogos);
    });
    const eur_m2=m2.length?vfMedian(m2):null, eur_fogo=fg.length?vfMedian(fg):null;
    const ref=vfRefEurM2(o.cap);
    const delta=(ref&&eur_m2!=null)?(eur_m2-ref)/ref:null;
    let domNat='full',best=-1; Object.keys(o.natCusto).forEach(k=>{ if(o.natCusto[k]>best){best=o.natCusto[k];domNat=k;} });
    let dom=null; Object.values(o.natUnits).forEach(u=>{ if(u.nat===domNat && (!dom||u.custo>dom.custo)) dom=u; });
    const domUn=dom?dom.un:null, eurUn=(dom&&dom.qt>0)?dom.custo/dom.qt:null;
    return {cap:o.cap,custo,eur_m2,eur_fogo,m2min:m2.length?Math.min(...m2):null,m2max:m2.length?Math.max(...m2):null,
            nProj:Object.keys(o.porProj).length,nProjM2:m2.length,semDesc,ref_eur_m2:ref,delta,nL:o.nL,
            nContratos:Object.keys(o.contratos).length,domUn,eurUn,nat:domNat,natCusto:o.natCusto};
  }).sort((a,b)=>b.custo-a.custo);
}
async function vfLoadRatios(){
  const out=document.getElementById('rxOut');
  if(typeof sb==="undefined"||!sb){ out.innerHTML='<div class="note">Precisas de estar ligado e com sessão iniciada.</div>'; return; }
  out.innerHTML='<div class="note">A carregar custo gravado…</div>';
  /* Custo real dos autos verificados, a partir da vista única (Fase 1): o projeto e o
     segmento vêm do projeto (projeto_id), não do texto do ficheiro. */
  const vl=await lerLinhasCusto(q=>q.eq('fonte','auto'));
  const lines=vl.map(l=>({contrato:l.ref, capitulo_canonico:l.capitulo, capitulo_origem:null, designacao:l.descricao,
    unidade:l.unidade, quantidade:l.quantidade, preco_unit:l.preco_unit, total:l.total, natureza:naturezaDeAmbito(l.ambito),
    __proj:l.projeto||null, __seg:l.segmento?segLabel(l.segmento):null}));
  window.__rxLines=lines;
  const nMap=lines.filter(l=>l.__proj).length;
  window.__rxDiag='motor rácios r5 (vista única) · linhas lidas '+lines.length+' · com projeto '+nMap;
  // opções construídas a partir das linhas realmente mapeadas (cada opção garante resultados)
  const projSet={}, segSet={};
  lines.forEach(l=>{ if(l.__proj) projSet[l.__proj]=1; if(l.__seg) segSet[l.__seg]=1; });
  const segSel=document.getElementById('rxSeg');
  if(segSel){ const segs=Object.keys(segSet).sort(); const cur=segSel.value;
    segSel.innerHTML='<option value="">Todos os segmentos</option>'+segs.map(s=>'<option'+(vfNorm(s)===vfNorm(cur)?' selected':'')+'>'+esc(s)+'</option>').join(''); }
  const projSel=document.getElementById('rxProj');
  if(projSel){ const projs=Object.keys(projSet).sort(); const curp=projSel.value;
    projSel.innerHTML='<option value="">Todos os projetos</option>'+projs.map(p=>'<option'+(vfNorm(p)===vfNorm(curp)?' selected':'')+'>'+esc(p)+'</option>').join(''); }
  if(!lines.length){ out.innerHTML='<div class="note">Ainda não há custo gravado. Importa autos no separador “Verificar Auto”.</div>'; return; }
  const seg=segSel?segSel.value:'';
  const proj=projSel?projSel.value:'';
  let filtered=lines;
  if(proj) filtered=filtered.filter(l=>vfNorm(l.__proj)===vfNorm(proj));
  if(seg)  filtered=filtered.filter(l=>vfNorm(l.__seg)===vfNorm(seg));
  if(!filtered.length){ out.innerHTML='<div class="note">Sem custo gravado para os filtros escolhidos'+(proj?' · projeto «'+esc(proj)+'»':'')+(seg?' · segmento «'+esc(seg)+'»':'')+'.</div>'; return; }
  vfRenderRatios(vfRatios(filtered), seg, proj);
}
function vfRenderRatios(rows, seg, proj){
  const out=document.getElementById('rxOut');
  const natB=n=>{ const m={full:['#1c7c46','completo'],material:['#b26a00','material'],labour:['#298893','mão de obra']}[n]||['#8391a3',n]; return '<span style="background:'+m[0]+';color:#fff;padding:1px 7px;border-radius:20px;font-size:12px;font-weight:600">'+m[1]+'</span>'; };
  const th='<tr><th>Capítulo (elemento)</th><th>Natureza</th><th style="text-align:right">Custo (€)</th><th>Un.</th><th style="text-align:right">€/unidade</th><th style="text-align:right">€/m² ABC</th><th style="text-align:right">€/fogo</th><th style="text-align:right">Ref €/m²</th><th style="text-align:right">Δ</th><th style="text-align:right">Proj.</th><th style="text-align:right">Contr.</th></tr>';
  const body=rows.map(r=>{
    const dpct=r.delta==null?'—':(r.delta>0?'+':'')+(r.delta*100).toFixed(0)+'%';
    const dcol=r.delta==null?'#48566b':(r.delta>0?'#b26a00':'#1c7c46');
    return '<tr style="cursor:pointer" onclick="vfDrill(\''+String(r.cap).replace(/\\/g,'').replace(/'/g,"\\'")+'\')">'
      +'<td>'+esc(r.cap)+'</td>'
      +'<td>'+natB(r.nat)+'</td>'
      +'<td class="mono" style="text-align:right">'+vfMoeda(r.custo)+'</td>'
      +'<td>'+esc(r.domUn||'—')+'</td>'
      +'<td class="mono" style="text-align:right;font-weight:600">'+(r.eurUn==null?'—':fmt(r.eurUn,2))+'</td>'
      +'<td class="mono" style="text-align:right" title="'+(r.nProjM2>1?'Mediana de '+r.nProjM2+' projetos · mín '+fmt(r.m2min,1)+' · máx '+fmt(r.m2max,1):'1 projeto')+(r.semDesc.length?' · sem ABC: '+esc(r.semDesc.join(', ')):'')+'">'+(r.eur_m2==null?'—':fmt(r.eur_m2,1))+'</td>'
      +'<td class="mono" style="text-align:right">'+(r.eur_fogo==null?'—':fmt(r.eur_fogo,0))+'</td>'
      +'<td class="mono" style="text-align:right;color:#48566b">'+(r.ref_eur_m2==null?'—':fmt(r.ref_eur_m2,1))+'</td>'
      +'<td class="mono" style="text-align:right;color:'+dcol+'">'+dpct+'</td>'
      +'<td class="mono" style="text-align:right">'+r.nProj+'</td>'
      +'<td class="mono" style="text-align:right">'+r.nContratos+'</td></tr>';
  }).join('');
  const totCusto=rows.reduce((s,r)=>s+r.custo,0);
  out.innerHTML='<div class="note" style="margin-bottom:8px"><b>€/unidade</b> é o rácio do elemento na tua grandeza natural (ex.: vãos €/un, rodapé €/ml, pavimento €/m²) — o driver de cada capítulo. €/m² ABC e €/fogo usam a ABC e os fogos <b>de cada projeto</b> (descritores gravados); com vários projetos mostra-se a <b>mediana</b> entre eles (passa o rato por cima para ver mín–máx). Projeto: <b>'+(proj?esc(proj):'todos')+'</b> · Segmento: <b>'+(seg?esc(seg):'todos')+'</b>. Clica numa linha para ver a origem (com a especificação de cada artigo). Enquanto nem todos os subcontratos estiverem importados, os rácios são parciais.<br><span style="font-size:12px;color:#8391a3">'+(window.__rxDiag||'motor rácios r4')+'</span></div>'
    +'<table style="font-size:13px">'+th+body
    +'<tr style="font-weight:600"><td>TOTAL</td><td></td><td class="mono" style="text-align:right">'+vfMoeda(totCusto)+'</td><td colspan="8"></td></tr></table>'
    +'<div id="rxDrill" style="margin-top:12px"></div>';
}
function vfDrill(cap){
  const lines=(window.__rxLines||[]).filter(l=>vfNorm(l.capitulo_canonico||l.capitulo_origem)===vfNorm(cap));
  const d=document.getElementById('rxDrill'); if(!d) return;
  const th='<tr><th>Contrato</th><th>Designação</th><th>Un.</th><th style="text-align:right">Qt.</th><th style="text-align:right">€/un</th><th style="text-align:right">Total</th></tr>';
  const body=lines.map(l=>'<tr><td class="mono">'+esc(l.contrato||'')+'</td><td>'+esc(String(l.designacao||'').slice(0,70))+'</td>'
    +'<td>'+esc(l.unidade||'')+'</td><td class="mono" style="text-align:right">'+fmt(l.quantidade,2)+'</td>'
    +'<td class="mono" style="text-align:right">'+fmt(l.preco_unit,2)+'</td><td class="mono" style="text-align:right">'+vfMoeda(l.total)+'</td></tr>').join('');
  d.innerHTML='<div class="card"><b>'+esc(cap)+'</b> — '+lines.length+' linhas de origem<table style="margin-top:8px;font-size:13px">'+th+body+'</table></div>';
}
(function vfMountRacios(){
  if(document.getElementById('view-racios')) return;
  const host=document.getElementById('view-verificar');
  if(host){
    const rx=document.createElement('div'); rx.id='view-racios'; rx.className='hidden';
    rx.innerHTML='<h2 style="color:#201C1D">Rácios por Elemento (custo real)</h2>'
      +'<div class="note">€/m² e €/fogo a partir do custo gravado, por capítulo canónico, comparados com a referência L\u2019Urbain. Cada linha é rastreável até aos subcontratos.</div>'
      +'<div class="card" style="margin-top:10px"><label>Projeto</label> <select id="rxProj" onchange="vfLoadRatios()" style="min-width:200px"><option value="">Todos os projetos</option></select> &nbsp;'
      +'<label>Segmento</label> <select id="rxSeg" onchange="vfLoadRatios()" style="min-width:200px"><option value="">Todos os segmentos</option></select> &nbsp;'
      +'<button class="btn navy" onclick="vfLoadRatios()">Calcular</button></div>'
      +'<div id="rxOut" style="margin-top:12px"></div>';
    host.parentNode.appendChild(rx);
  }
})();

/* ==========================================================================
   ETAPA 5 — MOTOR DE ORÇAMENTAÇÃO DE MQ (empty bill of quantities)
   Lê um MQ vazio (Art/Designação/Un/Quant, sem preço), e para cada linha
   procura no custo gravado o preço MELHOR SUPORTADO (mesma unidade + maior
   semelhança de descrição), devolvendo preço recomendado + nº de registos +
   amplitude min–mediana–max + confiança, rastreável até à origem.
   Regra: preenche automaticamente o que é seguro; assinala o resto.
   ========================================================================== */
const VF_STOP=new Set(['DE','DA','DO','DAS','DOS','E','EM','PARA','COM','A','O','AS','OS','AO','NO','NA','POR','UM','UMA','INCLUINDO','INCL','TIPO','OU','SEM','SOB','ATE','ENTRE','MODELO','REF','C']);
/* normaliza unidades: maiúsculas sem acentos, sem pontos/espaços, ² -> 2, ³ -> 3,
   para que "m²"="m2", "Un."="UN", "vg"="VG" contem como a mesma unidade */
function vfUnit(u){ return vfNorm(u).replace(/²/g,'2').replace(/³/g,'3').replace(/[^A-Z0-9]/g,''); }
function vfTokens(s){
  return new Set(vfNorm(s).split(/[^A-Z0-9]+/).filter(t=>t.length>1&&!VF_STOP.has(t)));
}
function vfDice(a,b){
  if(!a.size||!b.size) return 0;
  let inter=0; a.forEach(t=>{ if(b.has(t)) inter++; });
  return (2*inter)/(a.size+b.size);
}
function vfMedian(arr){
  const s=arr.slice().sort((x,y)=>x-y); const n=s.length; if(!n) return null;
  return n%2? s[(n-1)/2] : (s[n/2-1]+s[n/2])/2;
}
/* procura o preço melhor suportado para uma linha de MQ.
   Pooling em torno do MELHOR match (não um limiar fixo), para não juntar
   artigos parecidos mas diferentes (ex.: armários de tamanhos distintos que
   partilham "folhas/abrir"). O preço vem de itens quase idênticos ao melhor. */
function vfMatchLine(line, lib){
  const un=vfUnit(line.unidade);
  const lt=vfTokens(line.designacao);
  const scored=lib.filter(r=>vfUnit(r.unidade)===un && Number(r.preco_unit)>0)
    .map(r=>({r,score:vfDice(lt,vfTokens(r.designacao))}))
    .sort((a,b)=>b.score-a.score);
  const best=scored.length?scored[0].score:0;
  if(best<0.4) return {rec:null,n:0,min:null,med:null,max:null,conf:'sem',best,cands:scored.slice(0,5).map(x=>({desc:x.r.designacao,pu:Number(x.r.preco_unit),contrato:x.r.contrato,score:x.score}))};
  // pool = itens tão semelhantes como o melhor (dentro de 0.08), com piso em 0.6
  const floor=Math.max(best>=0.6?0.6:0.4, best-0.08);
  const pool=scored.filter(x=>x.score>=floor);
  const prices=pool.map(x=>Number(x.r.preco_unit));
  const med=vfMedian(prices), min=Math.min(...prices), max=Math.max(...prices);
  const spread=med?(max-min)/med:1;
  let conf;
  if(best>=0.85) conf=(pool.length>=2 && spread<=0.35)?'alta':'média';
  else if(best>=0.6) conf=(pool.length>=2 && spread<=0.5)?'média':'baixa';
  else conf='baixa';
  return {rec:med,n:pool.length,min,med,max,conf,best,
          cands:pool.slice(0,6).map(x=>({desc:x.r.designacao,pu:Number(x.r.preco_unit),contrato:x.r.contrato,score:x.score}))};
}
/* leitor de MQ vazio (mesma família de template; não exige colunas de preço) */
/* Quando não há cabeçalho reconhecível: deduz as colunas pelo CONTEÚDO.
   unidade = coluna com mais valores tipo m², m, un, vg, kg…; quantidade = coluna numérica
   mais próxima à direita da unidade; descrição = coluna com mais textos longos. */
const VF_RE_UNID=/^(M2|M²|M3|M³|M|ML|UN|UND|UNID|U|VG|KG|TON|T|L|LT|CJ|CONJ|PC|PÇ|PCS|H|HR|DIA|MES|MÊS|SEM|M\.L\.|M\/L)\.?$/;
function vfInferirColunas(rows){
  const N=Math.min(rows.length,600); let nc=0;
  for(let i=0;i<N;i++) nc=Math.max(nc,(rows[i]||[]).length);
  if(!nc) return null;
  const st=Array.from({length:nc},()=>({un:0,num:0,txt:0,first:-1}));
  for(let i=0;i<N;i++){ const r=rows[i]||[];
    for(let j=0;j<nc;j++){ const v=r[j]; if(v==null||v==='') continue;
      const s=String(v).trim(), sn=vfNorm(s);
      if(VF_RE_UNID.test(sn)){ st[j].un++; if(st[j].first<0) st[j].first=i; }
      else if(typeof v==='number'||vfNum(s)!=null) st[j].num++;
      else if(s.length>15) st[j].txt++;
    } }
  let un=-1; st.forEach((s,j)=>{ if(s.un>=3&&(un<0||s.un>st[un].un)) un=j; });
  if(un<0) return null;
  let qty=-1; for(let k=1;k<=4&&qty<0;k++){ const j=un+k; if(j<nc&&st[j].num>=3) qty=j; }
  if(qty<0) for(let k=1;k<=3&&qty<0;k++){ const j=un-k; if(j>=0&&st[j].num>=3) qty=j; }
  if(qty<0) return null;
  let des=-1; st.forEach((s,j)=>{ if(j!==un&&j!==qty&&s.txt>=3&&(des<0||s.txt>st[des].txt)) des=j; });
  if(des<0) return null;
  /* sem cabeçalho fiável: lê desde o início (as linhas sem unidade viram títulos de capítulo) */
  return {row:-1, des, un, qty, code: des>0?des-1:-1, inferido:true};
}
/* Colunas escolhidas à mão (painel "Definir colunas à mão") */
function vfReadMQComMapa(rows, m){
  const out=[]; let secao=null;
  for(let i=Math.max(0,m.inicio);i<rows.length;i++){
    const r=rows[i]||[];
    const a=m.code>=0?String(r[m.code]==null?"":r[m.code]).trim():"";
    const d=String(r[m.des]==null?"":r[m.des]).trim();
    const un=String(r[m.un]==null?"":r[m.un]).trim();
    const q=vfNum(r[m.qty]);
    if(!d) continue;
    const dn=vfNorm(d);
    if(RE_SOMA.test(dn)) continue;
    if(un!==""&&q!=null) out.push({pos:i,art:a,designacao:d,unidade:un,quantidade:q,cap:secao||null});
    else if(un==="") secao=d;
  }
  return out;
}
function vfReadMQ(rows){
  /* Cabeçalho: primeiro o detetor do Analisador (aceita Designação/Descrição/Artigo,
     Un./Unid./Unidade, Quant./Quantidade/Qt./Qtd. e cabeçalhos em duas linhas);
     se falhar, uma procura mais larga nas primeiras 60 linhas. */
  let H=null;
  try{ const d=(typeof detectHeader==='function')?detectHeader(rows):null;
       if(d) H={row:d.row,des:d.desc,un:d.un,qty:d.qt,code:(d.code>=0&&d.code!==d.desc)?d.code:0}; }catch(e){}
  if(!H){
    for(let i=0;i<Math.min(rows.length,60);i++){
      const r=(rows[i]||[]).map(vfNorm);
      const des=r.findIndex(x=>/DESIGNA|DESCRI|ARTIGO|TRABALHOS?$/.test(x));
      const un=r.findIndex(x=>/^UN(\.|ID\.?|IDADE|IDADES)?$|^UNIT/.test(x));
      const qt=r.findIndex(x=>/^QUANT|^QT|^QTD|^QTY/.test(x));
      if(des>=0&&un>=0&&qt>=0){ H={row:i,des,un,qty:qt,code:0}; break; }
    }
  }
  if(!H) H=vfInferirColunas(rows);
  if(!H) return null;
  /* cabeçalho a dois níveis ("Quantidades" por cima de "Un." e "Quant."): a unidade e a
     quantidade não podem ser a mesma coluna — procurar a quantidade na linha do cabeçalho */
  if(H.un===H.qty){
    const hr=(rows[H.row]||[]).map(vfNorm);
    const q2=hr.findIndex((x,j)=>j!==H.un&&/^QUANT|^QT|^QTD|^QTY/.test(x));
    if(q2>=0) H.qty=q2;
    const u2=hr.findIndex((x,j)=>j!==H.qty&&/^UN(\.|ID\.?|IDADE|IDADES)?$|^UNIT/.test(x));
    if(u2>=0) H.un=u2;
  }
  const out=[]; let secao=null;
  for(let i=H.row+1;i<rows.length;i++){
    const r=rows[i]||[];
    const a=H.code>=0?String(r[H.code]==null?"":r[H.code]).trim():"";
    const d=String(r[H.des]==null?"":r[H.des]).trim();
    const un=String(r[H.un]==null?"":r[H.un]).trim();
    const q=vfNum(r[H.qty]);
    const dn=vfNorm(d);
    if(!d) continue;
    if(/^VALOR GLOBAL|^TOTAL DO CONTRATO/.test(dn) || RE_SOMA.test(dn)) continue;
    if(un!=="" && q!=null){ out.push({pos:i,art:a,designacao:d,unidade:un,quantidade:q,cap:secao||null}); }
    else if(un===""){
      /* título de capítulo: código curto (I, 2, 3., A) ou texto todo em maiúsculas */
      if((a && (VF_ROMAN.test(a) || /^\d{1,2}\.?$|^[A-Z]\.?$/i.test(a))) || (d.length>3 && d===d.toUpperCase() && /[A-ZÀ-Ú]/.test(d))) secao=d;
    }
  }
  return out;
}
async function vfMQFillProjects(){
  const sel=document.getElementById('mqProj'); if(!sel||typeof sb==='undefined'||!sb) return;
  try{
    const projs=[...new Set((typeof PROJETOS!=='undefined'?PROJETOS:[]).map(p=>p.nome).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'pt'));
    const cur=sel.value;
    sel.innerHTML='<option value="">Todos os projetos (combina tudo)</option>'+projs.map(p=>'<option'+(vfNorm(p)===vfNorm(cur)?' selected':'')+'>'+esc(p)+'</option>').join('');
  }catch(e){}
}
async function vfPriceMQFile(){
  const inp=document.getElementById('mqFile'); const out=document.getElementById('mqOut');
  if(!inp.files||!inp.files[0]){ out.innerHTML='<div class="note">Carrega primeiro o mapa de quantidades (.xlsx) no cartão de cima.</div>'; return; }
  if(typeof sb==="undefined"||!sb){ out.innerHTML='<div class="note">Precisas de estar ligado e com sessão iniciada.</div>'; return; }
  out.innerHTML='<div class="note">A carregar biblioteca de custo…</div>';
  /* Biblioteca = vista única v_linha_custo (Fase 1), só preços ao nível do artigo:
     autos verificados, subempreitadas reais, compostos, compras, preços colhidos de autos
     e — se pedido — orçamentos do empreiteiro (pricing sheets). */
  const projSel=(document.getElementById('mqProj')||{}).value||'';
  const segSel=(document.getElementById('mqSeg')||{}).value||'';
  const comOrc=!!(document.getElementById('mqOrc')||{}).checked;
  const FONTE_LBL={auto:'Auto',subempreitada:'Subempr.',composto:'Composto',compra:'Compra',compra_po:'Adj. Legendre-PO',auto_pu:'Auto (PU)',orcamento_empreiteiro:'Orç. empreiteiro',mq:'MQ',pu:'PU'};
  let vl=await lerLinhasCusto(q=>q.eq('nivel','artigo').gt('preco_unit',0));
  if(!comOrc) vl=vl.filter(r=>r.fonte!=='orcamento_empreiteiro'&&r.fonte!=='mq');
  // preços colhidos de autos antigos repetem os autos verificados do mesmo projeto: não contar duas vezes
  const comAuto=new Set(vl.filter(r=>r.fonte==='auto').map(r=>r.projeto_id));
  vl=vl.filter(r=>!(r.fonte==='auto_pu'&&comAuto.has(r.projeto_id)));
  // compras não têm projeto: entram sempre; o resto segue os filtros
  if(projSel) vl=vl.filter(r=>r.fonte==='compra'||vfNorm(r.projeto)===vfNorm(projSel));
  if(segSel)  vl=vl.filter(r=>r.fonte==='compra'||r.segmento===segSel);
  const cl=vl.map(r=>({designacao:r.descricao, unidade:r.unidade, preco_unit:Number(r.preco_unit), total:r.total, quantidade:r.quantidade,
    capitulo_canonico:r.capitulo, natureza:naturezaDeAmbito(r.ambito), fonte:r.fonte,
    contrato:(FONTE_LBL[r.fonte]||r.fonte)+' · '+(r.ref||r.fornecedor||'')+(r.projeto?' · '+r.projeto:'')}));
  if((projSel||segSel) && !cl.some(r=>r.fonte!=='compra')){ out.innerHTML='<div class="note">Sem preços para os filtros escolhidos'+(projSel?' · projeto «'+esc(projSel)+'»':'')+(segSel?' · segmento «'+esc(segLabel(segSel))+'»':'')+'. Alarga os filtros.</div>'; return; }
  const natOf=r=>r.natureza||'full';
  const libFull=cl.filter(r=>natOf(r)==='full');
  const libMat=cl.filter(r=>natOf(r)==='material');
  const libLab=cl.filter(r=>natOf(r)==='labour');
  if(!libFull.length&&!libMat.length){ out.innerHTML='<div class="note">Sem preços na biblioteca ainda — importa autos (Autos de medição) e/ou o ficheiro de Compras primeiro.</div>'; return; }
  // Rácios por capítulo (custo completo) — €/unidade médio por capítulo canónico + unidade.
  // Preenche as linhas do MQ que não casam por texto, com o rácio do elemento.
  const chap={};
  cl.filter(r=>natOf(r)==='full'&&r.fonte==='auto').forEach(r=>{
    const c=r.capitulo_canonico, u=vfUnit(r.unidade);
    const t=Number(r.total)||0, qn=Number(r.quantidade)||0;
    if(!c||!u||qn<=0) return;
    const k=vfNorm(c);
    if(!chap[k]) chap[k]={};
    if(!chap[k][u]) chap[k][u]={cap:c,eurNum:0,eurDen:0,n:0};
    chap[k][u].eurNum+=t; chap[k][u].eurDen+=qn; chap[k][u].n++;
  });
  const uplift=parseFloat((document.getElementById('mqUplift')||{}).value)||0;
  const f=inp.files[0]; const rd=new FileReader();
  rd.onload=e=>{
    let wb; try{ wb=XLSX.read(new Uint8Array(e.target.result),{type:'array'}); }
    catch(err){ out.innerHTML='<div class="note">Não consegui abrir o ficheiro.</div>'; return; }
    let mq=[];
    for(const sn of wb.SheetNames){
      if(/INDICE|ÍNDICE/i.test(sn)) continue;
      const rows=XLSX.utils.sheet_to_json(wb.Sheets[sn],{header:1,raw:true,defval:null});
      const mapa=window.__mqMap;
      if(mapa && mapa.sheet!==sn) continue;
      const m=mapa?vfReadMQComMapa(rows,mapa):vfReadMQ(rows);
      if(m&&m.length){ m.forEach(l=>{ l.__sheet=sn; if(!l.cap||l.cap==='(sem capítulo)') l.cap=sn; }); mq.push(...m); }
    }
    if(!mq.length){ out.innerHTML='<div class="note">Não reconheci um mapa de quantidades em nenhuma das '+wb.SheetNames.length+' folha(s) deste ficheiro ('+esc(wb.SheetNames.join(', '))+'). Preciso de uma linha de cabeçalho com uma coluna de descrição (Designação / Descrição / Artigo), uma de unidade (Un. / Unid. / Unidade) e uma de quantidade (Quant. / Quantidade / Qtd.), e de linhas com unidade e quantidade preenchidas. Usa <b>Definir colunas à mão</b> para indicar as colunas.</div>'; vfMQMapaAbrir(); return; }
    const results=mq.map(l=>{ const canon=vfCanonMQ(l); l.__canon=canon;
      return {l,m:vfPriceLine(l,libFull,libMat,libLab,uplift,chap,canon)}; });
    window.__mqResults=results;
    const scope=(projSel||'todos os projetos (combinado)')+(segSel?' · segmento '+segLabel(segSel):'')+(comOrc?' · inclui orçamentos do empreiteiro':' · só custo real');
    window.__mqScope=scope; window.__mqFileName=f.name||'';
    vfRenderMQ(results,libFull.length,libMat.length,scope);
  };
  rd.readAsArrayBuffer(f);
}
/* compõe o preço de uma linha: preço completo (subcontrato) se houver; senão
   material (compra) + instalação (mão de obra registada, ou uplift %). */
/* capítulo de uma linha de MQ: a secção do próprio MQ manda; senão, pela
   descrição, com prioridade para o OFÍCIO sobre a localização (ex.:
   "impermeabilização de coberturas" é IMPERMEABILIZAÇÕES, não COBERTURAS). */
function vfCanonMQ(l){
  let c=vfGuess(l.cap); if(c) return c;
  const t=vfNorm(l.designacao);
  if(/IMPERMEABILIZA|ISOLAMENTO/.test(t)) return 'IMPERMEABILIZAÇÕES E ISOLAMENTOS';
  if(/GESSO CARTONADO|PLADUR|PLACA (SIMPLES|DUPLA)/.test(t)) return 'GESSO CARTONADO';
  if(/BLOCO|TIJOLO|ALVENARIA/.test(t)) return 'ALVENARIAS';
  if(/REBOCO|SALPICO|EMBO[ÇC]O|ARGAMASSA/.test(t)) return 'ARGAMASSAS';
  if(/BETONILHA/.test(t)) return 'BETONILHAS';
  if(/REVESTIMENTO.*PAVIMENTO|PAVIMENTO.*REVESTIMENTO/.test(t)) return 'REVESTIMENTOS DE PAVIMENTOS';
  if(/DESE[MN]FUMAG/.test(t)) return 'SCIE';
  return vfGuess(l.designacao)||null;
}
/* Roupeiros/armários: o custo cresce com o nº de portas/módulos. Deriva €/módulo da
   biblioteca (mediana, ≥3 registos com nº de módulos na descrição) e multiplica pelo nº
   de módulos da linha do MQ. Backtest no L'Urbain: erro ~23% contra ~46% do preço plano. */
function vfModulosDe(desc){
  const d=String(desc||'').toLowerCase(); let m;
  if((m=d.match(/(\d+)\s*(?:portas?\s+de\s+batente|portas?\s+de\s+correr|folhas?\s+de\s+abrir|folhas?)/))) return parseInt(m[1]);
  if((m=d.match(/(?:em|com)\s+(\d+)\s*m[óo]dulos?/))) return parseInt(m[1]);
  if((m=d.match(/(\d+)\s*m[óo]dulos?/))) return parseInt(m[1]);
  if((m=d.match(/(\d+)\s*pain[eé]is?/))) return parseInt(m[1]);
  if((m=d.match(/(\d+)\s*gavet[õo]es?/))) return parseInt(m[1]);
  if((m=d.match(/(\d+)\s*gavetas?/))) return parseInt(m[1]);
  if((m=d.match(/(\d+)\s*portas?/))) return parseInt(m[1]);
  return null;
}
function vfPrecoPorModulo(line, lib){
  const RE=/ROUPEIRO|ARMARIO/;
  if(!RE.test(vfNorm(line.designacao))) return null;
  if(!/^(UN|CJ|VG|U|UND)$/.test(vfUnit(line.unidade))) return null;
  const n=vfModulosDe(line.designacao); if(!n) return null;
  const usados=[], rates=[];
  (lib||[]).forEach(r=>{ if(!RE.test(vfNorm(r.designacao))) return; if(!/^(UN|CJ|VG|U|UND)$/.test(vfUnit(r.unidade))) return;
    const k=vfModulosDe(r.designacao); const pu=Number(r.preco_unit); if(!k||!(pu>0)) return; rates.push(pu/k); usados.push({r,k}); });
  if(rates.length<3) return null;
  const med=vfMedian(rates);
  return {rec:Math.round(n*med*100)/100, n:rates.length, min:n*Math.min(...rates), max:n*Math.max(...rates), med:n*med, conf:'média', best:1,
          kind:'escala (módulo)', escala:{modulos:n, eurModulo:med},
          cands:usados.slice(0,8).map(x=>({desc:x.r.designacao+' — '+x.k+' módulo(s)', pu:Number(x.r.preco_unit), contrato:x.r.contrato, score:null}))};
}
function vfPriceLine(line, libFull, libMat, libLab, upliftPct, chap, canon){
  const esc_=vfPrecoPorModulo(line, libFull); if(esc_) return esc_;
  const full=vfMatchLine(line, libFull);
  if(full.conf==='alta'||full.conf==='média'){ full.kind='completo'; return full; }
  const mat=(libMat&&libMat.length)?vfMatchLine(line, libMat):{rec:null,conf:'sem'};
  if(mat.rec!=null){
    const lab=(libLab&&libLab.length)?vfMatchLine(line, libLab):{rec:null};
    if(lab.rec!=null){
      return {rec:Math.round((mat.rec+lab.rec)*100)/100,n:mat.n,min:mat.min,max:mat.max,best:mat.best,
              conf:mat.conf,kind:'composto',parts:{material:mat.rec,instalacao:lab.rec},cands:mat.cands};
    }
    const up=upliftPct||0; const inst=up>0?Math.round(mat.rec*up/100*100)/100:null;
    return {rec:Math.round(mat.rec*(1+up/100)*100)/100,n:mat.n,min:mat.min,max:mat.max,best:mat.best,
            conf:'baixa',kind:up>0?'material+inst.%':'só material',parts:{material:mat.rec,instalacao:inst},cands:mat.cands};
  }
  /* um registo com descrição bem parecida (≥60%) vale mais do que a média do capítulo,
     mesmo sendo só um: fica com confiança baixa, mas é o preço daquele elemento */
  if(full.rec!=null && full.best>=0.6){ full.kind='completo'; return full; }
  // FALLBACK: sem match de texto -> rácio do capítulo (custo completo) na mesma unidade.
  // É a tua visão "€/elemento na unidade natural" — usa o €/un médio do capítulo do custo real.
  if(chap && canon){
    const u=vfUnit(line.unidade);
    const cr=(chap[vfNorm(canon)]||{})[u];
    if(cr && cr.eurDen>0){
      const eur=Math.round(cr.eurNum/cr.eurDen*100)/100;
      return {rec:eur,n:cr.n,min:null,med:eur,max:null,best:full.best,conf:'baixa',
              kind:'rácio cap.',cap:cr.cap,viaCap:true,cands:(full.cands||[])};
    }
  }
  full.kind='—'; return full;
}
/* importa o ficheiro de Compras (.xlsm): Contratos -> tipo; Artigos_Guias -> linhas */
const VF_CKIND={SUB:'full',GLOB:'full',FOR:'material',AL:'material',MO:'labour'};
function vfParseCompras(sheets){
  const findSheet=re=>Object.keys(sheets).find(n=>re.test(vfNorm(n)));
  const cN=findSheet(/CONTRATO/), aN=findSheet(/ARTIGO/);
  if(!cN||!aN) return null;
  const C=sheets[cN], A=sheets[aN];
  // Contratos: header row com '#' e 'TIPO'
  let ch=-1,numCol=-1,tipoCol=-1;
  for(let i=0;i<Math.min(C.length,20);i++){ const r=(C[i]||[]).map(vfNorm);
    const t=r.findIndex(x=>x==='TIPO'), n=r.findIndex(x=>x==='#');
    if(t>=0&&n>=0){ ch=i;numCol=n;tipoCol=t;break; } }
  const tipoByNum={};
  if(ch>=0) for(let i=ch+1;i<C.length;i++){ const num=C[i][numCol], tp=C[i][tipoCol];
    if(num!=null&&tp) tipoByNum[String(typeof num==='number'?Math.round(num):num).trim()]=String(tp).trim(); }
  // Artigos: header com CONT / DESCRI / PRECO
  let ah=-1,cont=-1,desc=-1,un=-1,pu=-1;
  for(let i=0;i<Math.min(A.length,8);i++){ const r=(A[i]||[]).map(vfNorm);
    const c=r.findIndex(x=>/CONT/.test(x)), d=r.findIndex(x=>/DESCRI|DESIGNA/.test(x)),
          u=r.findIndex(x=>/^UN\.?$/.test(x)), p=r.findIndex(x=>/PRECO/.test(x));
    if(c>=0&&d>=0&&p>=0){ ah=i;cont=c;desc=d;un=u;pu=p;break; } }
  if(ah<0) return null;
  const recs=[]; const counts={material:0,labour:0,full:0,skip:0};
  for(let i=ah+1;i<A.length;i++){ const r=A[i]||[];
    const cn=r[cont], d=r[desc], u=un>=0?r[un]:'', p=vfNum(r[pu]);
    if(cn==null||!d||p==null||p<=0) continue;
    const key=String(typeof cn==='number'?Math.round(cn):cn).trim();
    const tipo=(tipoByNum[key]||'').toUpperCase().split('.')[0];
    const kind=VF_CKIND[tipo];
    if(!kind){ counts.skip++; continue; }
    counts[kind]++;
    recs.push({descricao:String(d),unidade:String(u||''),preco_unit:p,kind,tipo,ref:key});
  }
  return {recs,counts};
}
async function vfImportComprasFile(){
  const inp=document.getElementById('cmFile'); const out=document.getElementById('cmOut');
  if(!inp.files||!inp.files[0]){ out.textContent='Escolhe o ficheiro de Compras.'; return; }
  if(typeof sb==="undefined"||!sb){ out.textContent='Precisas de sessão iniciada.'; return; }
  const f=inp.files[0]; const rd=new FileReader();
  rd.onload=async e=>{
    let wb; try{ wb=XLSX.read(new Uint8Array(e.target.result),{type:'array'}); }
    catch(err){ out.textContent='Não consegui abrir o ficheiro.'; return; }
    const sheets={}; wb.SheetNames.forEach(n=>{ sheets[n]=XLSX.utils.sheet_to_json(wb.Sheets[n],{header:1,raw:true,defval:null}); });
    const p=vfParseCompras(sheets);
    if(!p||!p.recs.length){ out.textContent='Não reconheci Contratos/Artigos_Guias no ficheiro.'; return; }
    try{
      await sb.from('custo_compra').delete().neq('id',-1);   // limpa a biblioteca de compras
      const rows=p.recs.map(r=>({...r,ficheiro:f.name}));
      // insere em lotes de 500
      for(let i=0;i<rows.length;i+=500){ const chunk=rows.slice(i,i+500); const ins=await sb.from('custo_compra').insert(chunk); if(ins.error) throw ins.error; }
      out.textContent='Compras importadas: '+p.counts.material+' material · '+p.counts.labour+' mão de obra ('+p.recs.length+' registos).';
    }catch(err){ out.textContent='Erro a gravar compras: '+(err.message||err); }
  };
  rd.readAsArrayBuffer(f);
}
function vfConfBadge(c){
  const map={alta:['#1c7c46','alta'],'média':['#298893','média'],baixa:['#b26a00','baixa'],sem:['#E62336','sem match']};
  const m=map[c]||map.sem;
  return '<span style="background:'+m[0]+';color:#fff;padding:1px 8px;border-radius:20px;font-size:12px;font-weight:600">'+m[1]+'</span>';
}
function vfKindBadge(k){
  const m={completo:['#1c7c46','completo'],composto:['#298893','mat+inst'],'só material':['#b26a00','só material'],'material+inst.%':['#b26a00','mat+inst %'],'rácio cap.':['#2E6DB0','rácio cap.'],'escala (módulo)':['#5B4BA0','por módulo']}[k];
  return m?'<span style="background:'+m[0]+';color:#fff;padding:1px 7px;border-radius:20px;font-size:12px;font-weight:600">'+m[1]+'</span>':'—';
}
function vfRenderMQ(results, libFullN, libMatN, scope){
  const out=document.getElementById('mqOut');
  const th='<tr><th>Designação (MQ)</th><th>Un</th><th style="text-align:right">Qt</th><th>Origem</th><th style="text-align:right">€/un recomendado</th><th style="text-align:right">Apoio</th><th>Confiança</th><th style="text-align:right">Total linha</th></tr>';
  const body=results.map((x,i)=>{
    const m=x.m; const rec=m.rec;
    const inp='<input type="number" id="mqp_'+i+'" value="'+(rec!=null?rec.toFixed(2):'')+'" style="width:90px;text-align:right" oninput="vfMQTotal()">';
    return '<tr id="mqr_'+i+'" style="cursor:pointer" onclick="vfMQDrill('+i+')" title="Clica para ver a origem do preço">'
      +'<td style="min-width:280px;max-width:520px;white-space:normal">'+(x.l.cap?'<div style="font-size:11px;color:var(--ink-500,#8391a3)">'+esc(String(x.l.cap).slice(0,60))+'</div>':'')+esc(String(x.l.designacao).slice(0,220))+'</td>'
      +'<td>'+esc(x.l.unidade)+'</td>'
      +'<td class="mono" style="text-align:right">'+fmt(x.l.quantidade,2)+'</td>'
      +'<td>'+vfKindBadge(m.kind)+'</td>'
      +'<td class="mono" style="text-align:right" onclick="event.stopPropagation()">'+inp+'</td>'
      +'<td class="mono" style="text-align:right">'+(m.n||'—')+'</td>'
      +'<td>'+vfConfBadge(m.conf)+'</td>'
      +'<td class="mono" style="text-align:right" id="mqt_'+i+'">'+(rec!=null?vfMoeda(rec*x.l.quantidade):'—')+'</td></tr>';
  }).join('');
  const fiavel=results.filter(x=>x.m.conf==='alta'||x.m.conf==='média').length;
  const comMat=results.filter(x=>x.m.kind==='só material'||x.m.kind==='material+inst.%'||x.m.kind==='composto').length;
  const porCap=results.filter(x=>x.m.kind==='rácio cap.').length;
  const semNada=results.filter(x=>x.m.rec==null).length;
  out.innerHTML='<div class="note" style="margin-bottom:8px">Base de custo: <b>'+esc(scope||'todos os projetos')+'</b> · '+libFullN+' preços completos + '+(libMatN||0)+' de material. <b>'+fiavel+'</b> com preço fiável (match de texto) · <b>'+comMat+'</b> via material · <b>'+porCap+'</b> via rácio de capítulo · <b>'+semNada+'</b> sem preço (manual). Ajusta o que precisares e o total actualiza. Clica numa linha para ver a origem.</div>'
    +'<div style="overflow-x:auto"><table style="font-size:13px">'+th+body+'</table></div>'
    +'<div style="margin-top:10px;font-size:14px;display:flex;align-items:center;gap:14px"><b>Estimativa total: <span id="mqTotal">—</span></b> <button class="btn navy" onclick="vfExportMQ()">Exportar Excel</button></div>'
    +'<div id="mqDrill" style="margin-top:12px"></div>';
  vfMQTotal();
}
/* Exporta o resultado do Preço MQ (inclui os €/un editados à mão) — uma linha por artigo,
   com folha e linha de origem para permitir cruzar com o orçamento existente. */
function vfExportMQ(){
  const results=window.__mqResults||[];
  if(!results.length){ alertx("Corre primeiro o Orçamentar."); return; }
  const r2=v=>(v==null||!isFinite(v))?"":Math.round(v*100)/100;
  const head=[["SOLIVE — PREÇO MQ PELO CUSTO REAL"],
    ["Ficheiro: "+(window.__mqFileName||"")+"   ·   Base de custo: "+(window.__mqScope||"")+"   ·   Data: "+new Date().toLocaleDateString('pt-PT')],
    [],
    ["Folha","Linha","Item","Designação","Un","Quant.","Origem","€/un recomendado","€/un (final)","Total","Apoio (n)","Mín","Máx","Confiança","Capítulo canónico","Melhor correspondência","Contrato","Score"]];
  let tot=0;
  const rows=results.map((x,i)=>{
    const m=x.m||{}, l=x.l||{};
    const el=document.getElementById('mqp_'+i); const v=el?parseFloat(el.value):NaN;
    const fin=isFinite(v)?v:null; const lt=fin!=null?fin*(l.quantidade||0):null; if(lt!=null) tot+=lt;
    const c0=(m.cands&&m.cands[0])||{};
    return [l.__sheet||l.cap||"", (l.pos!=null?l.pos+1:""), l.art||"", l.designacao||"", l.unidade||"", l.quantidade,
      m.kind||"—", r2(m.rec), r2(fin), r2(lt), m.n||"", r2(m.min), r2(m.max), m.conf||"sem",
      l.__canon||"", c0.desc||"", c0.contrato||"", c0.score!=null?Math.round(c0.score*100)/100:""];
  });
  const aoa=head.concat(rows,[[],["","","","TOTAL","","","","","",r2(tot)]]);
  const ws=XLSX.utils.aoa_to_sheet(aoa);
  ws['!cols']=[{wch:22},{wch:6},{wch:8},{wch:60},{wch:6},{wch:10},{wch:14},{wch:12},{wch:12},{wch:14},{wch:8},{wch:10},{wch:10},{wch:10},{wch:26},{wch:50},{wch:24},{wch:7}];
  ws['!autofilter']={ref:"A4:R"+(4+rows.length)};
  const wb=XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb,ws,"Preço MQ");
  const base=(window.__mqFileName||"MQ").replace(/\.xlsx?$/i,"");
  XLSX.writeFile(wb,("PrecoMQ_"+base+"_"+new Date().toISOString().slice(0,10)).replace(/[^\w\-]+/g,"_")+".xlsx");
  toast("Exportado: "+rows.length+" artigos.");
}
function vfMQTotal(){
  const results=window.__mqResults||[]; let tot=0;
  results.forEach((x,i)=>{
    const el=document.getElementById('mqp_'+i); const v=el?parseFloat(el.value):NaN;
    const cell=document.getElementById('mqt_'+i);
    if(isFinite(v)){ const lt=v*x.l.quantidade; tot+=lt; if(cell) cell.textContent=vfMoeda(lt); }
    else if(cell) cell.textContent='—';
  });
  const t=document.getElementById('mqTotal'); if(t) t.textContent=vfMoeda(tot);
}
/* Origem do preço: abre por baixo da própria linha (antes aparecia no fundo da tabela). */
function vfMQDrill(i){
  const x=(window.__mqResults||[])[i]; const tr=document.getElementById('mqr_'+i); if(!x||!tr) return;
  const aberto=document.getElementById('mqd_'+i);
  if(aberto){ aberto.remove(); tr.style.background=''; return; }
  const c=x.m.cands||[];
  const th='<tr><th>Registo de custo</th><th>Origem · referência · projeto</th><th style="text-align:right">€/un</th><th style="text-align:right">Semelhança</th></tr>';
  const body=c.length?c.map(k=>'<tr><td style="white-space:normal">'+esc(String(k.desc||'').slice(0,160))+'</td><td>'+esc(k.contrato||'')+'</td><td class="mono" style="text-align:right">'+fmt(k.pu,2)+'</td><td class="mono" style="text-align:right">'+(k.score!=null?(k.score*100).toFixed(0)+'%':'—')+'</td></tr>').join('')
    :'<tr><td colspan="4">Sem registos comparáveis por texto na mesma unidade ('+esc(x.l.unidade)+').</td></tr>';
  const capNota=x.m.viaCap?'<div class="note" style="margin:6px 0">Preço por <b>rácio de capítulo</b>: '+esc(x.m.cap||'')+' · €/'+esc(x.l.unidade)+' médio do custo real ('+(x.m.n||0)+' registos). Usado por não haver correspondência de texto fiável — confirma antes de fechar.</div>':'';
  const escNota=x.m.escala?'<div class="note" style="margin:6px 0">Preço por <b>escala</b>: '+x.m.escala.modulos+' módulo(s) × '+fmt(x.m.escala.eurModulo,2)+' €/módulo (mediana de '+x.m.n+' registos com nº de módulos na descrição).</div>':'';
  const partes=x.m.parts?'<div class="note" style="margin:6px 0">Composição: material '+fmt(x.m.parts.material,2)+' €'+(x.m.parts.instalacao!=null?' + instalação '+fmt(x.m.parts.instalacao,2)+' €':'')+'.</div>':'';
  const fx=(x.m.min!=null&&x.m.max!=null)?'<div class="hint">Intervalo dos registos usados: '+fmt(x.m.min,2)+' – '+fmt(x.m.max,2)+' €/'+esc(x.l.unidade)+' · mediana '+fmt(x.m.med!=null?x.m.med:x.m.rec,2)+'</div>':'';
  const row=document.createElement('tr'); row.id='mqd_'+i;
  row.innerHTML='<td colspan="8" style="background:#f6f8fb;padding:10px 14px"><div><b>'+esc(String(x.l.designacao).slice(0,200))+'</b> · '+esc(x.l.unidade)+' · '+fmt(x.l.quantidade,2)+'</div>'+capNota+escNota+partes+fx
    +'<table style="margin-top:8px;font-size:12.5px;width:100%">'+th+body+'</table></td>';
  tr.after(row); tr.style.background='#eef3fa';
}
/* Painel para indicar as colunas à mão quando o formato não é reconhecido (ou para forçar) */
function vfMQMapaAbrir(){
  const inp=document.getElementById('mqFile'); const box=document.getElementById('mqMapPanel');
  if(!box) return;
  if(!inp||!inp.files||!inp.files[0]){ box.innerHTML='<div class="note">Escolhe primeiro o ficheiro do MQ.</div>'; box.classList.remove('hidden'); return; }
  const rd=new FileReader();
  rd.onload=e=>{
    let wb; try{ wb=XLSX.read(new Uint8Array(e.target.result),{type:'array'}); }catch(err){ box.innerHTML='<div class="note">Não consegui abrir o ficheiro.</div>'; return; }
    window.__mqMapWB=wb;
    const sheets=wb.SheetNames;
    box.innerHTML='<div class="card"><b>Definir colunas à mão</b><div class="hint">Escolhe a folha, as colunas e a primeira linha de artigos. As linhas sem unidade passam a título de capítulo.</div>'
      +'<div style="display:flex;flex-wrap:wrap;gap:10px;margin-top:8px;align-items:end">'
      +'<div><label>Folha</label><br><select id="mqmSheet" onchange="vfMQMapaPreview()">'+sheets.map(s=>'<option>'+esc(s)+'</option>').join('')+'</select></div>'
      +'<div><label>Código (opcional)</label><br><select id="mqmCode"></select></div>'
      +'<div><label>Descrição</label><br><select id="mqmDes"></select></div>'
      +'<div><label>Unidade</label><br><select id="mqmUn"></select></div>'
      +'<div><label>Quantidade</label><br><select id="mqmQty"></select></div>'
      +'<div><label>1ª linha de artigos</label><br><input type="number" id="mqmIni" value="2" min="1" style="width:80px"></div>'
      +'<button class="btn navy" onclick="vfMQMapaAplicar()">Aplicar e orçamentar</button>'
      +'<button class="btn ghost" onclick="vfMQMapaLimpar()">Voltar à deteção automática</button></div>'
      +'<div id="mqmPrev" style="overflow-x:auto;margin-top:10px"></div></div>';
    box.classList.remove('hidden');
    vfMQMapaPreview();
  };
  rd.readAsArrayBuffer(inp.files[0]);
}
function vfMQColLetra(j){ let s=''; j++; while(j>0){ const m=(j-1)%26; s=String.fromCharCode(65+m)+s; j=Math.floor((j-1)/26); } return s; }
function vfMQMapaPreview(){
  const wb=window.__mqMapWB; if(!wb) return;
  const sn=document.getElementById('mqmSheet').value;
  const rows=XLSX.utils.sheet_to_json(wb.Sheets[sn],{header:1,raw:true,defval:null});
  let nc=0; rows.slice(0,40).forEach(r=>nc=Math.max(nc,(r||[]).length));
  const g=vfInferirColunas(rows)||{};
  const opts=(sel,vazio)=>(vazio?'<option value="-1">—</option>':'')+Array.from({length:nc},(_,j)=>'<option value="'+j+'"'+(j===sel?' selected':'')+'>'+vfMQColLetra(j)+'</option>').join('');
  document.getElementById('mqmCode').innerHTML=opts(g.code!=null?g.code:-1,true);
  document.getElementById('mqmDes').innerHTML=opts(g.des);
  document.getElementById('mqmUn').innerHTML=opts(g.un);
  document.getElementById('mqmQty').innerHTML=opts(g.qty);
  if(g.row!=null) document.getElementById('mqmIni').value=g.row+2;
  const prev=rows.slice(0,15);
  document.getElementById('mqmPrev').innerHTML='<table style="font-size:12px"><tr><th>#</th>'+Array.from({length:nc},(_,j)=>'<th>'+vfMQColLetra(j)+'</th>').join('')+'</tr>'
    +prev.map((r,i)=>'<tr><td class="mono">'+(i+1)+'</td>'+Array.from({length:nc},(_,j)=>'<td>'+esc(String((r||[])[j]==null?'':(r||[])[j]).slice(0,40))+'</td>').join('')+'</tr>').join('')+'</table>';
}
function vfMQMapaAplicar(){
  const v=id=>parseInt(document.getElementById(id).value,10);
  window.__mqMap={sheet:document.getElementById('mqmSheet').value, code:v('mqmCode'), des:v('mqmDes'), un:v('mqmUn'), qty:v('mqmQty'), inicio:Math.max(0,v('mqmIni')-1)};
  vfPriceMQFile();
}
function vfMQMapaLimpar(){ window.__mqMap=null; const b=document.getElementById('mqMapPanel'); if(b){ b.classList.add('hidden'); b.innerHTML=''; } }
(function vfMountMQ(){
  if(document.getElementById('view-precomq')) return;
  const host=document.getElementById('view-racios')||document.getElementById('view-verificar');
  if(host){
    const mv=document.createElement('div'); mv.id='view-precomq'; mv.className='hidden';
    mv.innerHTML='<div class="purpose"><div class="eyebrow">3 · Orçamentar</div><h1>Mapa de quantidades</h1><p class="subtitle">Preencher um mapa de quantidades vazio com o custo real gravado</p></div>'
      +'<div class="note">Carrega um mapa de quantidades <b>vazio</b> (sem preços). Para cada linha, a plataforma procura no custo gravado o preço <b>melhor suportado</b> (mesma unidade + descrição semelhante). Onde não há correspondência de texto fiável, usa o <b>rácio do capítulo</b> (€/unidade médio do elemento no custo real). Preenche o seguro; confirma os que vêm por rácio. Nada é inventado — só custo real.</div>'
      +'<div class="card" style="margin-top:10px"><label>Uplift de instalação sobre material (%)</label> <input type="number" id="mqUplift" value="0" style="width:80px"> <span class="note">Aplica-se às linhas onde só há preço de material (sem mão de obra registada).</span></div>'
      +'<div class="card" style="margin-top:10px"><label>Base de custo a usar</label> <select id="mqProj" style="min-width:250px" onmousedown="vfMQFillProjects()"><option value="">Todos os projetos (combina tudo)</option></select> &nbsp; <label>Segmento</label> <select id="mqSeg" style="min-width:160px"><option value="">Todos</option><option value="medio">Médio</option><option value="medio_alto">Médio-alto</option><option value="premium">Premium</option></select> &nbsp; <label style="display:inline-flex;align-items:center;gap:6px"><input type="checkbox" id="mqOrc"> Incluir orçamentos do empreiteiro (pricing sheets)</label> <span class="note">Escolhe um projeto (ex.: só L’Urbain) para orçamentar apenas com o custo real dessa obra, em vez da média de todas. Aplica-se ao match de texto e aos rácios de capítulo.</span></div>'
      +'<div class="card" style="margin-top:10px"><input type="file" id="mqFile" accept=".xlsx,.xls,.xlsm" class="hidden" onchange="vfMQMapaLimpar()"><div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap"><button class="btn red" onclick="vfPriceMQFile()">Orçamentar</button> <button class="btn ghost" onclick="vfMQMapaAbrir()">Definir colunas à mão</button> <span id="mqFicheiroNome" class="note" style="margin:0">Carrega o mapa de quantidades no cartão de cima.</span></div><div class="note" style="margin-top:8px">Os preços de compras (material e mão de obra) importam-se em <a href="#" onclick="showView(\'importar\');return false">Importar</a>.</div></div>'
      +'<div id="mqMapPanel" class="hidden" style="margin-top:10px"></div>'
      +'<div id="mqOut" style="margin-top:12px"></div>';
    host.parentNode.appendChild(mv);
  }
})();


/* ==========================================================================
   MIGRAÇÃO M1 — Comparar e Estimador lêem da base de CUSTO REAL (custo_linha),
   não das fases de promotor. gatherProjectData é a fonte partilhada dos dois;
   re-aponto-a por override, com fallback seguro ao comportamento antigo se
   ainda não houver custo gravado. Só usa linhas de natureza 'full'.
   ========================================================================== */
/* custo real (custo_linha) agregado por projeto. Paginado: o Supabase devolve no
   máximo 1000 linhas por pedido. Junção ao projeto por import_id (estável), com o
   contrato em texto só como recurso. */
/* Vista única de preços (v_linha_custo, Fase 1): uma linha por preço, de todas
   as fontes, já com projeto_id, projeto e segmento. Paginada (1000 por pedido).
   filtro: função que recebe a query do Supabase e lhe acrescenta .eq/.in/... */
async function lerLinhasCusto(filtro, colunas){
  if(typeof sb==='undefined'||!sb) return [];
  const SEL=colunas||'fonte,nivel,projeto_id,projeto,segmento,data,ref,fornecedor,capitulo,familia,descricao,unidade,quantidade,preco_unit,total,ambito,confianca,origem,origem_id';
  let out=[];
  for(let from=0; from<300000; from+=1000){
    let q=sb.from('v_linha_custo').select(SEL);
    if(filtro) q=filtro(q);
    const r=await q.range(from,from+999);
    if(r.error){ console.warn('v_linha_custo',r.error); alertx("Não consegui ler a vista de preços (v_linha_custo): "+r.error.message+". Confirma que o SQL da Fase 1 foi corrido."); return out; }
    const b=r.data||[]; out=out.concat(b);
    if(b.length<1000) break;
  }
  return out;
}
/* natureza antiga (full/material/labour) a partir do âmbito da vista */
function naturezaDeAmbito(a){ return a==='mao_obra'?'labour':(a==='fornecimento'?'material':'full'); }
/* custo real (autos verificados) agregado por projeto — só custo completo (F&A) */
async function gpdCustoReal(){
  const li=await lerLinhasCusto(q=>q.eq('fonte','auto').eq('ambito','F&A'),'projeto_id,projeto,segmento,capitulo,total');
  if(!li.length) return [];
  const byProj={};
  li.forEach(l=>{ const k=l.projeto||'(sem projeto)';
    if(!byProj[k]) byProj[k]={nome:k,seg:l.segmento||null,caps:{}};
    const cap=l.capitulo||'(sem capítulo)';
    byProj[k].caps[cap]=(byProj[k].caps[cap]||0)+(Number(l.total)||0); });
  return Object.values(byProj).map(p=>{
    let gfa=null,fogos=null,D=null;
    const pr=(typeof PROJETOS!=='undefined'?PROJETOS:[]).find(x=>vfNorm(x.nome)===vfNorm(p.nome));
    if(pr){ gfa=pr.gfa; fogos=pr.fogos; D=descritoresDe(pr); }
    if(gfa==null && /URBAIN/i.test(p.nome||'')){ gfa=REF.gfa; fogos=REF.fogos; }
    return {nome:p.nome,ano:(new Date()).getFullYear(),gfa,fogos,caps:p.caps,fase:'Custo real',
            D:Object.assign({abc:gfa,fogos},D||{},{segmento:(D&&D.segmento)||p.seg||null})};
  });
}
/* Fonte única dos rácios do Estimador e do Comparar.
   - "Preferir Adjudicado": só preços de contrato do portão de execução.
   - restantes: custo real (autos verificados) quando existe; senão, fases de promotor. */
async function gatherProjectData(pref){
  if(pref==='adjudicado') return gpdAdjudicado();
  try{ const real=await gpdCustoReal(); if(real.length) return real; }catch(e){ console.warn('custo real',e); }
  return gpdFases(pref);
}

/* ==========================================================================
   DESVIOS — Orçamento transferido (Produção) vs Custo real executado.
   Vive no separador Comparar. Base: ficheiro do orçamento, congelado por
   capítulo em orcamento_producao. Real: custo_linha por capítulo canónico.
   ========================================================================== */
function vfReadOrcamento(rows){
  // 1) formato AO NÍVEL DO ARTIGO (Designação + Un. + Total, capítulos em cabeçalhos)
  let H=null;
  for(let i=0;i<Math.min(rows.length,30);i++){
    const r=(rows[i]||[]).map(vfNorm);
    const des=r.findIndex(x=>/DESIGNA/.test(x));
    const un=r.findIndex(x=>/^UN\.?$/.test(x));
    let tot=-1; r.forEach((x,idx)=>{ if(/TOTA|VALOR|IMPORT[ÂA]NCIA/.test(x)) tot=idx; });
    if(des>=0&&un>=0&&tot>=0){ H={row:i,des,un,tot}; break; }
  }
  if(H){
    const out=[]; let secao=null;
    for(let i=H.row+1;i<rows.length;i++){
      const r=rows[i]||[];
      const a=String(r[0]==null?"":r[0]).trim();
      const d=String(r[H.des]==null?"":r[H.des]).trim();
      const un=String(r[H.un]==null?"":r[H.un]).trim();
      const tv=vfNum(r[H.tot]);
      const dn=vfNorm(d);
      if(/^VALOR GLOBAL|^TOTAL/.test(dn)) continue;
      if(un!=="" && tv!=null){ out.push({designacao:d,total:tv,cap:secao}); }
      else if(d && un==="" && tv==null){ if((VF_ROMAN.test(a)&&a) || vfGuess(d)) secao=d; }
    }
    if(out.length) return out;
  }
  // 2) formato RESUMO POR CAPÍTULO (uma linha por capítulo: "TOTAL <cap>" + valor + peso%)
  return vfReadResumo(rows);
}
function vfReadResumo(rows){
  const out=[];
  for(const r0 of (rows||[])){
    const r=r0||[]; let txt=null; const nums=[];
    for(let c=0;c<r.length;c++){ const v=r[c]; if(v==null) continue;
      if(typeof v==='number'){ if(isFinite(v)) nums.push(v); }
      else { const s=String(v).trim(); if(s && txt==null && !/^\d+([.,]\d+)?$/.test(s)) txt=s; } }
    if(!txt) continue;
    const tn=vfNorm(txt);
    if(/^(CLIENTE|OBRA|FASE|DATA)\b/.test(tn)) continue;                 // cabeçalho do resumo
    if(/RESUMO/.test(tn)) continue;                                      // linha de título
    if(/^VALOR GLOBAL|^TOTAL DO CONTRATO/.test(tn)) continue;
    if(/^TOTAL\s+(PROJE|GERAL|DA OBRA|EMPREITADA|OBRA)/.test(tn)) continue;  // total geral do orçamento
    const cand=nums.filter(n=>Math.abs(n)>=1000);                        // totais de custo (ignora índice e peso %)
    if(!cand.length) continue;                                          // linha de título/vazia
    out.push({designacao:txt.replace(/^TOTAL\s+/i,'').trim(), total:Math.max(...cand), cap:null});
  }
  return out.length?out:null;
}
function vfDvAggOrc(leaves){
  const g={};
  leaves.forEach(l=>{ const canon=vfCanonMQ({cap:l.cap,designacao:l.designacao})||'(sem capítulo)';
    g[canon]=(g[canon]||0)+(Number(l.total)||0); });
  return g;
}
async function vfDvFillProjects(){
  const sel=document.getElementById('dvProj'); if(!sel||typeof sb==='undefined'||!sb) return;
  const set={};
  try{ const a=await sb.from('custo_import').select('projeto_ref'); (a.data||[]).forEach(r=>{ if(r.projeto_ref) set[r.projeto_ref]=1; }); }catch(e){}
  try{ const b=await sb.from('orcamento_producao').select('projeto_ref'); (b.data||[]).forEach(r=>{ if(r.projeto_ref) set[r.projeto_ref]=1; }); }catch(e){}
  const projs=Object.keys(set).sort(); const cur=sel.value;
  sel.innerHTML='<option value="">—</option>'+projs.map(p=>'<option'+(vfNorm(p)===vfNorm(cur)?' selected':'')+'>'+esc(p)+'</option>').join('');
}
function vfDvImport(){
  const inp=document.getElementById('dvFile'); const out=document.getElementById('dvOut');
  const proj=(document.getElementById('dvProj')||{}).value||'';
  if(!proj){ out.innerHTML='<div class="note">Escolhe primeiro o projeto.</div>'; return; }
  if(!inp.files||!inp.files[0]){ out.innerHTML='<div class="note">Escolhe o ficheiro do orçamento (.xlsx).</div>'; return; }
  const f=inp.files[0]; const rd=new FileReader();
  rd.onload=e=>{
    let wb; try{ wb=XLSX.read(new Uint8Array(e.target.result),{type:'array'}); }catch(err){ out.innerHTML='<div class="note">Não consegui abrir o ficheiro.</div>'; return; }
    let leaves=[];
    // Se houver folha de RESUMO/SUMMARY, lê SÓ essa (as outras são o detalhe artigo-a-artigo
    // de cada capítulo — somá-las multiplicaria o valor). Senão, lê todas.
    const sumSheet=wb.SheetNames.find(sn=>/RESUMO|SUMMARY/i.test(sn));
    const sheets=sumSheet?[sumSheet]:wb.SheetNames.filter(sn=>!/INDICE|ÍNDICE/i.test(sn));
    for(const sn of sheets){
      const rows=XLSX.utils.sheet_to_json(wb.Sheets[sn],{header:1,raw:true,defval:null});
      const m=vfReadOrcamento(rows); if(m&&m.length){ m.forEach(l=>{ if(!l.cap) l.cap=sn; }); leaves.push(...m); } }
    if(!leaves.length){ out.innerHTML='<div class="note">Não reconheci um orçamento por linha (preciso de colunas Designação / Un. / Total). Confirma que é o orçamento de custo, ao nível do artigo.</div>'; return; }
    const g=vfDvAggOrc(leaves);
    const tot=Object.values(g).reduce((s,x)=>s+x,0);
    window.__dvOrc={proj, chapters:g, ficheiro:f.name, tot};
    const rowsH=Object.keys(g).sort().map(c=>'<tr><td>'+esc(c)+'</td><td class="mono" style="text-align:right">'+vfMoeda(g[c])+'</td></tr>').join('');
    out.innerHTML='<div class="note">Lido de <b>'+esc(f.name)+'</b>: '+leaves.length+' linhas → '+Object.keys(g).length+' capítulos · total '+vfMoeda(tot)+'. Confere o mapeamento e congela como base para <b>'+esc(proj)+'</b>.</div>'
      +'<table style="font-size:13px;max-width:540px"><tr><th>Capítulo</th><th style="text-align:right">Orçamento transferido</th></tr>'+rowsH+'</table>'
      +'<button class="btn red" style="margin-top:10px" onclick="vfDvFreeze()">Congelar como orçamento transferido</button>';
  };
  rd.readAsArrayBuffer(f);
}
async function vfDvFreeze(){
  const d=window.__dvOrc; const out=document.getElementById('dvOut');
  if(!d||!d.proj) return;
  if(typeof sb==='undefined'||!sb){ out.innerHTML='<div class="note">Precisas de sessão iniciada.</div>'; return; }
  try{
    await sb.from('orcamento_producao').delete().eq('projeto_ref',d.proj);
    const rows=Object.keys(d.chapters).map(c=>({projeto_ref:d.proj,capitulo_canonico:c,total_orcado:Math.round(d.chapters[c]*100)/100,ficheiro:d.ficheiro}));
    for(let i=0;i<rows.length;i+=500){ const ins=await sb.from('orcamento_producao').insert(rows.slice(i,i+500)); if(ins.error) throw ins.error; }
    await vfDvRender();
  }catch(err){ out.innerHTML='<div class="note">Erro a congelar: '+esc(err.message||String(err))+'</div>'; }
}
function vfDvSetMode(m){ window.__dvMode=m;
  ['solive','legendre'].forEach(x=>{ const b=document.getElementById('dvmode-'+x); if(b) b.classList.toggle('on', x===m); });
  vfDvRender();
}
async function vfDvRender(){
  if(window.__dvMode==='legendre') return vfDvRenderLegendre();
  const out=document.getElementById('dvOut'); const proj=(document.getElementById('dvProj')||{}).value||'';
  if(!out) return;
  if(!proj){ out.innerHTML=''; return; }
  if(typeof sb==='undefined'||!sb){ out.innerHTML='<div class="note">Precisas de sessão iniciada.</div>'; return; }
  let orc={}; try{ const o=await sb.from('orcamento_producao').select('capitulo_canonico,total_orcado').eq('projeto_ref',proj);
    (o.data||[]).forEach(r=>{ orc[vfNorm(r.capitulo_canonico)]={cap:r.capitulo_canonico,v:Number(r.total_orcado)||0}; }); }catch(e){}
  if(!Object.keys(orc).length){ out.innerHTML='<div class="note">Sem orçamento transferido congelado para <b>'+esc(proj)+'</b>. Importa o ficheiro do orçamento acima e congela.</div>'; return; }
  const impIds={}; try{ const qi=await sb.from('custo_import').select('id,projeto_ref'); (qi.data||[]).forEach(r=>{ if(vfNorm(r.projeto_ref)===vfNorm(proj)) impIds[r.id]=1; }); }catch(e){}
  let real={};
  for(let from=0; from<200000; from+=1000){
    const q=await sb.from('custo_linha').select('import_id,capitulo_canonico,total').range(from,from+999);
    if(q.error) break; const batch=q.data||[];
    batch.forEach(r=>{ if(impIds[r.import_id]){ const k=vfNorm(r.capitulo_canonico); if(!real[k]) real[k]={cap:r.capitulo_canonico,v:0}; real[k].v+=Number(r.total)||0; } });
    if(batch.length<1000) break;
  }
  const keys=[...new Set([...Object.keys(orc),...Object.keys(real)])];
  const rows=keys.map(k=>{ const o=(orc[k]||{}).v||0, rr=(real[k]||{}).v||0; const cap=((orc[k]||real[k])||{}).cap||k;
    const temAuto=rr>0; const dv=temAuto?rr-o:null, pct=(temAuto&&o)?dv/o:null;
    return {cap,o,rr,temAuto,dv,pct}; }).sort((a,b)=>{ if(a.temAuto!==b.temAuto) return a.temAuto?-1:1;
      return a.temAuto ? Math.abs(b.dv)-Math.abs(a.dv) : b.o-a.o; });
  const totO=rows.reduce((s,r)=>s+r.o,0), totR=rows.reduce((s,r)=>s+r.rr,0);
  const covO=rows.filter(r=>r.temAuto).reduce((s,r)=>s+r.o,0);   // orçamento dos capítulos COM auto
  const covR=rows.filter(r=>r.temAuto).reduce((s,r)=>s+r.rr,0);  // real dos capítulos com auto
  const covD=covR-covO;
  const cobertura=totO?covO/totO:0;                              // % do orçamento coberto por autos
  const cobPct=(cobertura*100).toFixed(0);
  const cobCol=cobertura>=0.9?'#1c7c46':(cobertura>=0.5?'#b26a00':'#E62336');
  const body=rows.map(r=>{
    if(!r.temAuto){ return '<tr style="color:#8391a3"><td>'+esc(r.cap)+'</td>'
      +'<td class="mono" style="text-align:right">'+vfMoeda(r.o)+'</td>'
      +'<td style="text-align:right"><span style="background:#eef1f5;color:#8391a3;padding:1px 8px;border-radius:20px;font-size:12px;font-weight:600">sem auto</span></td>'
      +'<td style="text-align:right">—</td><td style="text-align:right">—</td></tr>'; }
    const col=r.dv>0?'#b26a00':(r.dv<0?'#1c7c46':'#48566b');
    return '<tr><td>'+esc(r.cap)+'</td>'
      +'<td class="mono" style="text-align:right">'+vfMoeda(r.o)+'</td>'
      +'<td class="mono" style="text-align:right">'+vfMoeda(r.rr)+'</td>'
      +'<td class="mono" style="text-align:right;color:'+col+'">'+(r.dv>0?'+':'')+vfMoeda(r.dv)+'</td>'
      +'<td class="mono" style="text-align:right;color:'+col+'">'+(r.pct==null?'—':(r.pct>0?'+':'')+(r.pct*100).toFixed(0)+'%')+'</td></tr>'; }).join('');
  const dcol=covD>0?'#b26a00':(covD<0?'#1c7c46':'#48566b');
  out.innerHTML=
    '<div class="note" style="margin-bottom:8px;padding:10px 12px;background:#f6f8fb;border:1px solid #e1e7ef;border-radius:8px">'
      +'<b style="color:'+cobCol+'">Cobertura de autos: '+cobPct+'%</b> do orçamento transferido ('+vfMoeda(covO)+' de '+vfMoeda(totO)+'). '
      +'Faltam autos em <b>'+((1-cobertura)*100).toFixed(0)+'%</b> do âmbito, por isso o custo real ainda não é o custo final da obra. '
      +'O <b>desvio só é fiável nos capítulos que já têm auto</b>.'
    +'</div>'
    +'<div class="note" style="margin-bottom:8px"><span style="color:#1c7c46">Verde</span> = abaixo do orçamento; <span style="color:#b26a00">laranja</span> = acima; <b>sem auto</b> = capítulo orçamentado ainda sem medição (não é poupança).</div>'
    +'<table style="font-size:13px"><tr><th>Capítulo</th><th style="text-align:right">Orçamento transferido</th><th style="text-align:right">Real executado</th><th style="text-align:right">Δ €</th><th style="text-align:right">Δ %</th></tr>'
    +body
    +'<tr style="font-weight:600;border-top:2px solid #201C1D"><td>DESVIO FIÁVEL (só capítulos com auto)</td>'
      +'<td class="mono" style="text-align:right">'+vfMoeda(covO)+'</td>'
      +'<td class="mono" style="text-align:right">'+vfMoeda(covR)+'</td>'
      +'<td class="mono" style="text-align:right;color:'+dcol+'">'+(covD>0?'+':'')+vfMoeda(covD)+'</td>'
      +'<td class="mono" style="text-align:right;color:'+dcol+'">'+(covO?((covD/covO>0?'+':'')+(covD/covO*100).toFixed(0)+'%'):'—')+'</td></tr>'
    +'<tr style="color:#5b6b7f"><td>Orçamento total (âmbito completo)</td><td class="mono" style="text-align:right">'+vfMoeda(totO)+'</td><td class="mono" style="text-align:right">'+vfMoeda(totR)+' <span style="font-size:12px">(real parcial · '+cobPct+'%)</span></td><td style="text-align:right">—</td><td style="text-align:right">—</td></tr>'
    +'</table>';
}
/* LENTE LEGENDRE — desvios nas categorias oficiais (Transfert), para a monitorização
   da obra. Real = autos, mapeados capítulo Solive -> categoria Legendre (mapa_legendre).
   Baseline = orcamento_legendre (Transfert congelado no trespasse). Só leitura. */
async function vfDvRenderLegendre(){
  const out=document.getElementById('dvOut'); const proj=(document.getElementById('dvProj')||{}).value||'';
  if(!out) return;
  if(!proj){ out.innerHTML=''; return; }
  if(typeof sb==='undefined'||!sb){ out.innerHTML='<div class="note">Precisas de sessão iniciada.</div>'; return; }
  let orc={}; try{ const o=await sb.from('orcamento_legendre').select('legendre_categoria,total_transferido').eq('projeto_ref',proj);
    (o.data||[]).forEach(r=>{ orc[r.legendre_categoria]=(orc[r.legendre_categoria]||0)+(Number(r.total_transferido)||0); }); }catch(e){}
  if(!Object.keys(orc).length){ out.innerHTML='<div class="note">Sem orçamento Legendre congelado para <b>'+esc(proj)+'</b>. Corre o <b>etapa_legendre.sql</b> no Supabase.</div>'; return; }
  let map={}; try{ const m=await sb.from('mapa_legendre').select('capitulo_solive,legendre_categoria'); (m.data||[]).forEach(r=>{ map[vfNorm(r.capitulo_solive)]=r.legendre_categoria; }); }catch(e){}
  let sub={}; try{ const sq=await sb.from('mapa_legendre_sub').select('import_id,legendre_categoria'); (sq.data||[]).forEach(r=>{ sub[r.import_id]=r.legendre_categoria; }); }catch(e){}
  const impIds={}; try{ const qi=await sb.from('custo_import').select('id,projeto_ref'); (qi.data||[]).forEach(r=>{ if(vfNorm(r.projeto_ref)===vfNorm(proj)) impIds[r.id]=1; }); }catch(e){}
  let real={}, semMapa=0, nOver=0;
  for(let from=0; from<200000; from+=1000){
    const q=await sb.from('custo_linha').select('import_id,capitulo_canonico,total').range(from,from+999);
    if(q.error) break; const batch=q.data||[];
    batch.forEach(r=>{ if(impIds[r.import_id]){ const ov=sub[r.import_id]; const lg=ov||map[vfNorm(r.capitulo_canonico)]; const t=Number(r.total)||0; if(ov) nOver++; if(lg) real[lg]=(real[lg]||0)+t; else semMapa+=t; } });
    if(batch.length<1000) break;
  }
  const keys=[...new Set([...Object.keys(orc),...Object.keys(real)])];
  const rows=keys.map(k=>{ const o=orc[k]||0, rr=real[k]||0; const temAuto=rr>0; const dv=temAuto?rr-o:null, pct=(temAuto&&o)?dv/o:null;
    return {cat:k,o,rr,temAuto,dv,pct}; });
  // com rubrica no Transfert (o>0) vs real sem rubrica (o=0 e há auto) — estes últimos NÃO entram no desvio fiável
  const withB=rows.filter(r=>r.o>0).sort((a,b)=>{ if(a.temAuto!==b.temAuto) return a.temAuto?-1:1; return a.temAuto?Math.abs(b.dv)-Math.abs(a.dv):b.o-a.o; });
  const semB=rows.filter(r=>r.o===0&&r.rr>0).sort((a,b)=>b.rr-a.rr);
  const covRows=withB.filter(r=>r.temAuto);
  const covO=covRows.reduce((s,r)=>s+r.o,0), covR=covRows.reduce((s,r)=>s+r.rr,0), covD=covR-covO;
  const totO=rows.reduce((s,r)=>s+r.o,0);
  const semBtot=semB.reduce((s,r)=>s+r.rr,0);
  const cob=totO?covO/totO:0, cobPct=(cob*100).toFixed(0), cobCol=cob>=0.9?'#1c7c46':(cob>=0.5?'#b26a00':'#E62336');
  const body=withB.map(r=>{
    if(!r.temAuto){ return '<tr style="color:#8391a3"><td>'+esc(r.cat)+'</td><td class="mono" style="text-align:right">'+vfMoeda(r.o)+'</td><td style="text-align:right"><span style="background:#eef1f5;color:#8391a3;padding:1px 8px;border-radius:20px;font-size:12px;font-weight:600">sem auto</span></td><td style="text-align:right">—</td><td style="text-align:right">—</td></tr>'; }
    const col=r.dv>0?'#b26a00':(r.dv<0?'#1c7c46':'#48566b');
    return '<tr><td>'+esc(r.cat)+'</td><td class="mono" style="text-align:right">'+vfMoeda(r.o)+'</td><td class="mono" style="text-align:right">'+vfMoeda(r.rr)+'</td><td class="mono" style="text-align:right;color:'+col+'">'+(r.dv>0?'+':'')+vfMoeda(r.dv)+'</td><td class="mono" style="text-align:right;color:'+col+'">'+(r.pct==null?'—':(r.pct>0?'+':'')+(r.pct*100).toFixed(0)+'%')+'</td></tr>';
  }).join('');
  const dcol=covD>0?'#b26a00':(covD<0?'#1c7c46':'#48566b');
  const semBody = semB.length ? (
     '<tr style="background:#fff8ec"><td colspan="5" style="font-weight:600;color:#b26a00;font-size:12px;padding:7px 4px">CUSTO REAL SEM RUBRICA NO TRANSFERT — a alocar a uma categoria oficial ('+vfMoeda(semBtot)+')</td></tr>'
     + semB.map(r=>'<tr style="background:#fffdf7"><td>'+esc(r.cat)+'</td><td style="text-align:right;color:#b26a00">—</td><td class="mono" style="text-align:right">'+vfMoeda(r.rr)+'</td><td style="text-align:right"><span style="background:#fce9c9;color:#b26a00;padding:1px 8px;border-radius:20px;font-size:12px;font-weight:600">a alocar</span></td><td style="text-align:right">—</td></tr>').join('')
  ) : '';
  out.innerHTML=
    '<div class="note" style="margin-bottom:8px;padding:10px 12px;background:#f0f4fb;border:1px solid #d5e0f0;border-radius:8px">'
     +'<b style="color:#201C1D">Lente Legendre (Fondamental 7)</b> — desvios nas categorias oficiais que a obra monitoriza. '
     +'<b style="color:'+cobCol+'">Cobertura: '+cobPct+'%</b> do âmbito subcontratado ('+vfMoeda(covO)+' de '+vfMoeda(totO)+').'
     +(semBtot>0?' <span style="color:#b26a00">'+vfMoeda(semBtot)+' de real em categorias sem rubrica no Transfert (ver «a alocar»; usa o painel de subcontratos para as reencaminhar).</span>':'')
     +(semMapa>0?' <span style="color:#b26a00">'+vfMoeda(semMapa)+' de real ainda sem categoria Legendre (capítulo por mapear).</span>':'')
    +'</div>'
    +'<table style="font-size:13px"><tr><th>Categoria Legendre</th><th style="text-align:right">Orçamento transferido</th><th style="text-align:right">Real executado</th><th style="text-align:right">Δ €</th><th style="text-align:right">Δ %</th></tr>'
    +body
    +'<tr style="font-weight:600;border-top:2px solid #201C1D"><td>DESVIO FIÁVEL (categorias com auto e rubrica)</td><td class="mono" style="text-align:right">'+vfMoeda(covO)+'</td><td class="mono" style="text-align:right">'+vfMoeda(covR)+'</td><td class="mono" style="text-align:right;color:'+dcol+'">'+(covD>0?'+':'')+vfMoeda(covD)+'</td><td class="mono" style="text-align:right;color:'+dcol+'">'+(covO?((covD/covO>0?'+':'')+(covD/covO*100).toFixed(0)+'%'):'—')+'</td></tr>'
    +semBody
    +'</table>'
    +'<div style="margin-top:12px"><button class="btn" onclick="vfLegSubToggle()">Afinar categorias por subcontrato</button>'
      +(nOver>0?' <span class="note" style="color:#1c7c46">'+nOver+' linha(s) já afinadas por subcontrato</span>':'')
    +'</div><div id="dvSubPanel" data-open="0" style="margin-top:10px"></div>';
}
/* Lista completa das categorias Legendre (Fondamental 7) para os dropdowns de override. */
const LEG_CATS=['BLINDS','BLOCKWORKS','CLADDING','CONTAINMENT WORKS','EARTHWORK','EXTERIOR METALWORK','FACADE CLADDING','FIRE PROTECTION','FLOOR FORMWORK/SHORING','FLOORS','HARD FLOORING','HEAVY CURRENT ELECTRICITY','HVAC','INDUSTRIAL FLUIDS','INTERIOR FITTINGS','INTERIOR JOINERY','KITCHENS','LIFT','LOW VOLTAGE ELECTRICITY','METAL FRAMEWORK','METALWORK','PAINTING-WALL COVERING','PARTITIONS','PLUMBING-SANITARY','REINFORCING','ROOFING','SCAFFOLDING','SCREEDS','SIGNAGE','SITE CLEANING','SOFT FLOORING','SOFT LANDSCAPE','VARIOUS SECONDARY','WATERPROOFING'];
function vfLegSelect(id,cur,def){ let o='<option value="">— (usar capítulo'+(def?': '+esc(def):'')+')</option>'; LEG_CATS.forEach(c=>{ o+='<option value="'+esc(c)+'"'+(c===cur?' selected':'')+'>'+esc(c)+'</option>'; }); return '<select id="'+id+'" style="min-width:210px">'+o+'</select>'; }
async function vfLegSubToggle(){ const p=document.getElementById('dvSubPanel'); if(!p) return;
  if(p.getAttribute('data-open')==='1'){ p.innerHTML=''; p.setAttribute('data-open','0'); return; }
  p.setAttribute('data-open','1'); await vfLegSubRender(); }
async function vfLegSubRender(){
  const p=document.getElementById('dvSubPanel'); const proj=(document.getElementById('dvProj')||{}).value||''; if(!p||!proj) return;
  if(typeof sb==='undefined'||!sb){ p.innerHTML='<div class="note">Precisas de sessão iniciada.</div>'; return; }
  p.innerHTML='<div class="note">A carregar subcontratos…</div>';
  const imps={}; try{ const qi=await sb.from('custo_import').select('id,projeto_ref,subempreiteiro,contrato'); (qi.data||[]).forEach(r=>{ if(vfNorm(r.projeto_ref)===vfNorm(proj)) imps[r.id]={sub:r.subempreiteiro||'',contr:r.contrato||'',tot:0,caps:{}}; }); }catch(e){}
  for(let from=0; from<200000; from+=1000){ const q=await sb.from('custo_linha').select('import_id,capitulo_canonico,total').range(from,from+999); if(q.error) break; const b=q.data||[]; b.forEach(r=>{ const im=imps[r.import_id]; if(im){ const t=Number(r.total)||0; im.tot+=t; const k=r.capitulo_canonico||'—'; im.caps[k]=(im.caps[k]||0)+t; } }); if(b.length<1000) break; }
  let map={}; try{ const m=await sb.from('mapa_legendre').select('capitulo_solive,legendre_categoria'); (m.data||[]).forEach(r=>{ map[vfNorm(r.capitulo_solive)]=r.legendre_categoria; }); }catch(e){}
  let sub={}; try{ const sq=await sb.from('mapa_legendre_sub').select('import_id,legendre_categoria'); (sq.data||[]).forEach(r=>{ sub[r.import_id]=r.legendre_categoria; }); }catch(e){}
  const rows=Object.keys(imps).map(id=>{ const im=imps[id]; const domCap=Object.keys(im.caps).sort((a,b)=>im.caps[b]-im.caps[a])[0]||''; const def=map[vfNorm(domCap)]||''; return {id,sub:im.sub,contr:im.contr,tot:im.tot,domCap,def,cur:sub[id]||''}; }).sort((a,b)=>b.tot-a.tot);
  if(!rows.length){ p.innerHTML='<div class="note">Sem subcontratos gravados para este projeto.</div>'; return; }
  const body=rows.map(r=>'<tr><td>'+esc(r.sub||'—')+(r.contr?'<div style="font-size:12px;color:#8391a3">'+esc(r.contr)+'</div>':'')+'</td>'
    +'<td style="font-size:12px">'+esc(r.domCap)+'</td>'
    +'<td style="color:#8391a3;font-size:12px">'+esc(r.def||'—')+'</td>'
    +'<td>'+vfLegSelect('legsub_'+r.id, r.cur, r.def)+'</td>'
    +'<td class="mono" style="text-align:right">'+vfMoeda(r.tot)+'</td></tr>').join('');
  p.innerHTML='<div class="note" style="margin:6px 0;padding:8px 10px;background:#f6f8fb;border:1px solid #e1e7ef;border-radius:8px">Atribui cada subcontrato à categoria Legendre certa. Em branco = usa o capítulo por omissão. É aqui que separas os capítulos que se dividem — <b>vãos</b> (caixilharia → Facade Cladding), <b>estabilidade</b> (armadura → Reinforcing), <b>estaleiro</b> (limpeza → Site Cleaning), <b>terras</b> (contenção → Containment Works).</div>'
    +'<table style="font-size:13px"><tr><th>Subempreiteiro</th><th>Capítulo dominante</th><th>Legendre (omissão)</th><th>Override Legendre</th><th style="text-align:right">Total</th></tr>'+body+'</table>'
    +'<button class="btn navy" style="margin-top:8px" onclick="vfLegSubSave()">Guardar afinação</button> <span id="legSubOut" class="note"></span>';
}
async function vfLegSubSave(){ const out=document.getElementById('legSubOut'); const sels=document.querySelectorAll('[id^=legsub_]'); const up=[], del=[];
  sels.forEach(s=>{ const id=parseInt(s.id.replace('legsub_',''),10); const v=s.value; if(v) up.push({import_id:id,legendre_categoria:v}); else del.push(id); });
  try{ if(up.length){ const r=await sb.from('mapa_legendre_sub').upsert(up,{onConflict:'import_id'}); if(r.error) throw r.error; }
    for(const id of del){ await sb.from('mapa_legendre_sub').delete().eq('import_id',id); }
    if(out) out.textContent='Guardado ✓ a atualizar…'; await vfDvRenderLegendre(); }
  catch(err){ if(out) out.textContent='Erro: '+esc(err.message||String(err)); }
}
(function vfMountDesvios(){
  const host=document.getElementById('view-comparar');
  if(!host||document.getElementById('vfDvCard')) return;
  // Relatório para a Administração (Board)
  const rb=document.createElement('div'); rb.id='vfBoardCard'; rb.className='card'; rb.style.marginTop='14px';
  rb.innerHTML='<h2 style="color:#201C1D">Relatório resumo</h2>'
   +'<div class="note">Um resumo de <b>uma página (PDF)</b> com os dados mais relevantes: custo real por projeto, rácios €/m² e €/fogo, rigor dos orçamentos (desvios) e a estrutura de custo. Gerado a partir dos dados atuais.</div>'
   +'<button class="btn navy" style="margin-top:8px" onclick="vfBoardReport()">Gerar relatório (PDF)</button> <span id="rbOut" class="note"></span>';
  host.appendChild(rb);
  const div=document.createElement('div'); div.id='vfDvCard'; div.className='card'; div.style.marginTop='14px';
  div.innerHTML='<h2 style="color:#201C1D">Desvios — Orçamento transferido vs Real</h2>'
   +'<div class="note">Compara, por capítulo, o <b>orçamento que transferiste para a Produção</b> (custo, sem margem) com o <b>custo real executado</b> (autos). Mostra quão rigorosa foi a estimativa e onde os desvios vieram de trabalhos a mais ou alterações de projeto.</div>'
   +'<div class="filters" style="margin-top:8px">'
   +'<div style="min-width:220px"><label>Projeto</label><br><select id="dvProj" onmousedown="vfDvFillProjects()" onchange="vfDvRender()" style="min-width:220px"><option value="">—</option></select></div>'
   +'<div style="min-width:360px"><label>Importar orçamento transferido (.xlsx)</label><br><input type="file" id="dvFile" accept=".xlsx,.xls"> <button class="btn navy" onclick="vfDvImport()">Ler orçamento</button></div>'
   +'</div>'
   +'<div class="subtabs" style="margin-top:10px"><button id="dvmode-solive" class="on" onclick="vfDvSetMode(\'solive\')">As minhas categorias</button><button id="dvmode-legendre" onclick="vfDvSetMode(\'legendre\')">Categorias Legendre (monitorização)</button></div>'
   +'<div id="dvOut" style="margin-top:12px"></div>';
  host.appendChild(div);
})();

/* ==========================================================================
   RELATÓRIO PARA A ADMINISTRAÇÃO (Board) — PDF de uma página, dados vivos.
   Custo real por projeto (€/m², €/fogo), rigor (desvio vs orçamento transferido,
   só nos capítulos já executados) e estrutura de custo (principais capítulos).
   ========================================================================== */
function vfEnsureJsPDF(){
  return new Promise((res,rej)=>{
    if(window.jspdf&&window.jspdf.jsPDF) return res();
    const s=document.createElement('script');
    s.src='https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
    s.onload=()=>res(); s.onerror=()=>rej(new Error('Não consegui carregar o gerador de PDF.'));
    document.head.appendChild(s);
  });
}
function vfBuildBoardPDF(m, JsPDF){
  const doc=new JsPDF({unit:'mm',format:'a4'});
  const NAVY=[20,58,103], TEAL=[41,136,147], MUT=[91,107,127], AMBER=[178,106,0], OKG=[28,124,70], BG=[244,247,251], INK=[31,43,58];
  const E=n=>(n==null?'—':Math.round(n).toLocaleString('pt-PT')+' €');
  const N=(n,d)=>(n==null?'—':Number(n).toLocaleString('pt-PT',{minimumFractionDigits:d||0,maximumFractionDigits:d||0}));
  doc.setFillColor(NAVY[0],NAVY[1],NAVY[2]); doc.rect(0,0,210,26,'F');
  doc.setTextColor(255,255,255); doc.setFont('helvetica','bold'); doc.setFontSize(17);
  doc.text('Relatório de Custo de Construção',15,13);
  doc.setFont('helvetica','normal'); doc.setFontSize(10); doc.setTextColor(191,212,236);
  doc.text('Relatório resumo · Solive',15,20);
  doc.text(m.data,195,20,{align:'right'});
  const kpis=[[String(m.nProj),'projetos com custo real'],[E(m.totalReal),'custo real registado'],[m.avgM2?N(m.avgM2)+' €/m2':'—','custo médio por m2 (ABC)']];
  let kx=15; const kw=56;
  kpis.forEach(k=>{ doc.setFillColor(BG[0],BG[1],BG[2]); doc.roundedRect(kx,32,kw,20,2,2,'F');
    doc.setTextColor(NAVY[0],NAVY[1],NAVY[2]); doc.setFont('helvetica','bold'); doc.setFontSize(15); doc.text(k[0],kx+kw/2,42,{align:'center'});
    doc.setTextColor(MUT[0],MUT[1],MUT[2]); doc.setFont('helvetica','normal'); doc.setFontSize(8.5); doc.text(k[1],kx+kw/2,48,{align:'center'}); kx+=kw+6; });
  let y=63;
  doc.setTextColor(NAVY[0],NAVY[1],NAVY[2]); doc.setFont('helvetica','bold'); doc.setFontSize(12); doc.text('Benchmarks e rigor por projeto',15,y); y+=7;
  const RED=[230,35,54];
  doc.setFontSize(8); doc.setTextColor(MUT[0],MUT[1],MUT[2]); doc.setFont('helvetica','bold');
  doc.text('Projeto',15,y); doc.text('Segmento',50,y);
  doc.text('Custo real',108,y,{align:'right'}); doc.text('€/m2',126,y,{align:'right'}); doc.text('€/fogo',148,y,{align:'right'}); doc.text('Cobertura',171,y,{align:'right'}); doc.text('Desvio*',195,y,{align:'right'});
  y+=1.6; doc.setDrawColor(210,215,225); doc.line(15,y,195,y); y+=5.5;
  m.projetos.forEach(p=>{
    doc.setTextColor(INK[0],INK[1],INK[2]); doc.setFont('helvetica','bold'); doc.setFontSize(8.7); doc.text(String(p.nome).slice(0,22),15,y);
    doc.setFont('helvetica','normal'); doc.setTextColor(MUT[0],MUT[1],MUT[2]); doc.setFontSize(8); doc.text(String(p.seg||'—').slice(0,20),50,y);
    doc.setFontSize(8.7); doc.setTextColor(INK[0],INK[1],INK[2]);
    doc.text(E(p.real),108,y,{align:'right'});
    doc.text(p.eur_m2?N(p.eur_m2):'—',126,y,{align:'right'});
    doc.text(p.eur_fogo?N(p.eur_fogo):'—',148,y,{align:'right'});
    if(p.cobertura==null){ doc.setTextColor(MUT[0],MUT[1],MUT[2]); doc.text('—',171,y,{align:'right'}); }
    else { const cc=p.cobertura>=0.9?OKG:(p.cobertura>=0.5?AMBER:RED); doc.setTextColor(cc[0],cc[1],cc[2]); doc.text((p.cobertura*100).toFixed(0)+'%',171,y,{align:'right'}); }
    if(p.desvioPct==null){ doc.setTextColor(MUT[0],MUT[1],MUT[2]); doc.text('—',195,y,{align:'right'}); }
    else { const c=p.desvioPct>0?AMBER:OKG; doc.setTextColor(c[0],c[1],c[2]); doc.text((p.desvioPct>0?'+':'')+N(p.desvioPct*100)+'%',195,y,{align:'right'}); }
    y+=7;
  });
  y+=7;
  doc.setTextColor(NAVY[0],NAVY[1],NAVY[2]); doc.setFont('helvetica','bold'); doc.setFontSize(12); doc.text('Onde vai o custo — principais capítulos',15,y); y+=8;
  const maxPct=Math.max.apply(null,m.topCaps.map(c=>c.pct).concat([0.0001]));
  m.topCaps.forEach(c=>{
    doc.setFont('helvetica','normal'); doc.setFontSize(9); doc.setTextColor(INK[0],INK[1],INK[2]); doc.text(String(c.cap).slice(0,30),15,y);
    const bw=(c.pct/maxPct)*66;
    doc.setFillColor(TEAL[0],TEAL[1],TEAL[2]); doc.roundedRect(78,y-3.3,Math.max(bw,1),4,0.6,0.6,'F');
    doc.setTextColor(MUT[0],MUT[1],MUT[2]); doc.setFontSize(8.5); doc.text(E(c.valor)+'  ('+N(c.pct*100)+'%)',195,y,{align:'right'});
    y+=8;
  });
  if(m.notas&&m.notas.length){
    y+=4;
    doc.setFont('helvetica','normal'); doc.setFontSize(9.5);
    const perLine=3.9, gap=1.9;
    const wrapped=m.notas.map(t=>doc.splitTextToSize(String(t),164));
    const bodyH=wrapped.reduce((s,w)=>s+w.length*perLine,0)+(wrapped.length-1)*gap;
    const bh=12+bodyH+2;
    doc.setFillColor(BG[0],BG[1],BG[2]); doc.roundedRect(15,y,180,bh,2,2,'F');
    doc.setTextColor(NAVY[0],NAVY[1],NAVY[2]); doc.setFont('helvetica','bold'); doc.setFontSize(11); doc.text('Leitura rápida',20,y+7);
    doc.setFont('helvetica','normal'); doc.setFontSize(9.5); doc.setTextColor(INK[0],INK[1],INK[2]);
    let ly=y+13.5;
    wrapped.forEach(w=>{ doc.setFillColor(TEAL[0],TEAL[1],TEAL[2]); doc.circle(22,ly-1.3,0.8,'F');
      w.forEach((ln,i)=>doc.text(ln,26,ly+i*perLine)); ly+=w.length*perLine+gap; });
  }
  doc.setDrawColor(220,225,232); doc.line(15,283,195,283);
  doc.setFont('helvetica','normal'); doc.setFontSize(7.5); doc.setTextColor(MUT[0],MUT[1],MUT[2]);
  doc.text('* Desvio só nos capítulos já executados. Cobertura = % do orçamento transferido já com auto submetido; o restante ainda não é custo final.',15,288);
  doc.text('Custo real gravado dos autos de medição, reconciliado. A margem é aplicada fora da plataforma. Gerado pela Plataforma de Orçamentação Solive.',15,292);
  return doc;
}
async function vfBoardReport(){
  const out=document.getElementById('rbOut');
  if(typeof sb==='undefined'||!sb){ if(out)out.textContent='Precisas de estar ligado e com sessão iniciada.'; return; }
  if(out) out.textContent='A gerar…';
  try{
    let lines=[]; for(let f=0;f<200000;f+=1000){ const q=await sb.from('custo_linha').select('import_id,capitulo_canonico,total').range(f,f+999); if(q.error)break; const b=q.data||[]; lines=lines.concat(b); if(b.length<1000)break; }
    const imp={}; try{ const qi=await sb.from('custo_import').select('id,projeto_ref,segmento'); (qi.data||[]).forEach(r=>{ imp[r.id]={proj:r.projeto_ref,seg:r.segmento}; }); }catch(e){}
    const orc={}; try{ const qo=await sb.from('orcamento_producao').select('projeto_ref,capitulo_canonico,total_orcado'); (qo.data||[]).forEach(r=>{ const k=vfNorm(r.projeto_ref); (orc[k]=orc[k]||{}); const ck=vfNorm(r.capitulo_canonico); orc[k][ck]=(orc[k][ck]||0)+(Number(r.total_orcado)||0); }); }catch(e){}
    const realProj={}, realProjCap={}, capTot={}, segOf={};
    lines.forEach(l=>{ const im=imp[l.import_id]; if(!im||!im.proj) return; const proj=im.proj; { const sp=(typeof segDoProjeto==='function')?segDoProjeto(proj):null; if(sp) segOf[proj]=segLabel(sp); else if(im.seg) segOf[proj]=im.seg; }
      const c=l.capitulo_canonico||'(sem capítulo)'; const t=Number(l.total)||0;
      realProj[proj]=(realProj[proj]||0)+t; capTot[c]=(capTot[c]||0)+t;
      (realProjCap[proj]=realProjCap[proj]||{}); const ck=vfNorm(c); realProjCap[proj][ck]=(realProjCap[proj][ck]||0)+t; });
    const dim=nome=>{ let gfa=null,fogos=null; try{ const pr=(typeof PROJETOS!=='undefined'?PROJETOS:[]).find(x=>vfNorm(x.nome)===vfNorm(nome)); if(pr){gfa=pr.gfa;fogos=pr.fogos;} }catch(e){} if((gfa==null)&&/URBAIN/i.test(nome||'')){ try{gfa=REF.gfa;fogos=REF.fogos;}catch(e){} } return {gfa,fogos}; };
    const projetos=Object.keys(realProj).map(nome=>{ const d=dim(nome); const real=realProj[nome]; const ob=orc[vfNorm(nome)]||{}; const rc=realProjCap[nome]||{};
      let cb=0,cr=0; Object.keys(rc).forEach(ck=>{ if(rc[ck]>0 && ob[ck]!=null){ cb+=ob[ck]; cr+=rc[ck]; } });
      const orcTot=Object.values(ob).reduce((s,x)=>s+x,0);          // âmbito total orçamentado
      const cobertura=orcTot>0?cb/orcTot:null;                      // % do orçamento com auto
      return {nome, seg:segOf[nome]||null, real, abc:d.gfa, fogos:d.fogos, eur_m2:d.gfa?real/d.gfa:null, eur_fogo:d.fogos?real/d.fogos:null, cobertura, desvioPct:(cb>0)?(cr-cb)/cb:null }; })
      .sort((a,b)=>b.real-a.real);
    const totalReal=projetos.reduce((s,p)=>s+p.real,0);
    const abcSum=projetos.reduce((s,p)=>s+(p.abc||0),0);
    const avgM2=abcSum?totalReal/abcSum:null;
    const topCaps=Object.entries(capTot).filter(([c])=>c!=='(sem capítulo)').sort((a,b)=>b[1]-a[1]).slice(0,6).map(([cap,v])=>({cap,valor:v,pct:totalReal?v/totalReal:0}));
    if(!projetos.length){ if(out)out.textContent='Ainda não há custo real gravado.'; return; }
    // Leitura rápida (conclusões factuais)
    const notas=[];
    const bySeg={}; projetos.forEach(p=>{ if(p.seg&&p.abc){ (bySeg[p.seg]=bySeg[p.seg]||{r:0,a:0}); bySeg[p.seg].r+=p.real; bySeg[p.seg].a+=p.abc; } });
    const segs=Object.keys(bySeg);
    if(segs.length){ notas.push('Custo por segmento: '+segs.map(s=>s+' — '+Math.round(bySeg[s].r/bySeg[s].a).toLocaleString('pt-PT')+' €/m2').join(' · ')+'.'); }
    const dvs=projetos.filter(p=>p.desvioPct!=null).map(p=>Math.abs(p.desvioPct));
    const cobs=projetos.filter(p=>p.cobertura!=null).map(p=>p.cobertura);
    if(cobs.length){ const mc=cobs.reduce((s,x)=>s+x,0)/cobs.length; notas.push('Cobertura de autos: '+(mc*100).toFixed(0)+'% do orçamento transferido em média — o restante ainda sem medição (custo real parcial).'); }
    if(dvs.length){ const md=dvs.reduce((s,x)=>s+x,0)/dvs.length; notas.push('Rigor da orçamentação: desvio médio ±'+(md*100).toFixed(0)+'% (só nos capítulos já executados).'); }
    if(topCaps.length>=3){ const c3=topCaps.slice(0,3).reduce((s,c)=>s+c.pct,0); notas.push('Concentração: os 3 maiores capítulos valem '+(c3*100).toFixed(0)+'% do custo real total.'); }
    const model={data:(new Date()).toISOString().slice(0,10), projetos, totalReal, nProj:projetos.length, avgM2, topCaps, notas};
    await vfEnsureJsPDF();
    const doc=vfBuildBoardPDF(model, window.jspdf.jsPDF);
    doc.save('Relatorio_Resumo_Solive_'+model.data+'.pdf');
    if(out) out.textContent='Relatório gerado ('+model.data+').';
  }catch(e){ if(out) out.textContent='Erro: '+(e.message||e); }
}

APP_REGISTAR('09-custo-real','3.2.0');
