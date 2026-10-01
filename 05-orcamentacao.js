/* Solive · Orçamentação — 05-orcamentacao.js
   Orçamentação: quadro com semáforo de consolidação e contingência.
   Versão: ver APP_REGISTAR no fim do ficheiro (tem de ser igual à do index.html). */

/* ================= ORÇAMENTAÇÃO (semáforo de consolidação) ================= */
function detectSummary(rows){
  let hr=-1;
  for(let i=0;i<Math.min(rows.length,15);i++){
    const cs=(rows[i]||[]).map(norm);
    if(cs.some(c=>/RECEIVED OFFER|PROPOSTA RECEBIDA/.test(c))||cs.some(c=>/NO SOURCE|SEM FONTE/.test(c))){hr=i;break;}
  }
  if(hr<0)return null;
  const cs=(rows[hr]||[]).map(norm);
  const recv=[],old=[],nos=[];
  cs.forEach((c,j)=>{
    if(/RECEIVED OFFER|PROPOSTA RECEBIDA/.test(c))recv.push(j);
    else if(/OFFER.*2\s*YEAR|<\s*2\s*YEAR|PROPOSTA.*ANTIG|>\s*2\s*ANOS/.test(c))old.push(j);
    else if(/NO SOURCE|SEM FONTE/.test(c))nos.push(j);
  });
  if(!recv.length&&!old.length&&!nos.length)return null;
  return {hr,recv,old,nos};
}
function extractSummary(rows){
  const d=detectSummary(rows); if(!d)return null;
  const out=[];
  for(let i=d.hr+1;i<rows.length;i++){
    const r=rows[i]||[];
    let nameCol=-1,name='';
    for(let j=0;j<6;j++){if(typeof r[j]==='string'&&/TOTAL|CAP[IÍ]TULO/i.test(r[j])){nameCol=j;name=r[j];break;}}
    if(nameCol<0){ // aceitar também nome sem "TOTAL" se a linha tiver um total numérico e fontes
      for(let j=0;j<3;j++){if(typeof r[j]==='string'&&r[j].trim().length>3){nameCol=j;name=r[j];break;}}
      if(nameCol<0)continue;
    }
    let total=null;
    for(let j=nameCol+1;j<nameCol+4;j++){if(typeof r[j]==='number'){total=r[j];break;}}
    if(total==null||total<=0)continue;
    const sum=cols=>cols.reduce((s,c)=>s+(typeof r[c]==='number'?r[c]:0),0);
    if(/TOTAL\s+PROJETO|TOTAL\s+GERAL/i.test(name))continue;
    out.push({name:name.replace(/^TOTAL\s+/i,'').trim(),total,recebida:sum(d.recv),antiga:sum(d.old),sem:sum(d.nos)});
  }
  return out;
}
function estadoPorFonte(recebida,antiga,sem){
  const m=Math.max(recebida,antiga,sem);
  if(m<=0)return "racio";
  if(recebida===m)return "firme";
  if(antiga===m)return "antiga";
  return "racio";
}
const ORC_ESTADOS=[
  {k:"racio",lbl:"Rácio histórico",cls:"e-racio",cb:"cb-racio",solido:false},
  {k:"consulta",lbl:"Em consulta",cls:"e-consulta",cb:"cb-consulta",solido:false},
  {k:"antiga",lbl:"Proposta antiga (>2 anos)",cls:"e-antiga",cb:"cb-antiga",solido:false},
  {k:"firme",lbl:"Proposta firme",cls:"e-firme",cb:"cb-firme",solido:true},
  {k:"compromisso",lbl:"Compromisso do subempreiteiro",cls:"e-compromisso",cb:"cb-compromisso",solido:true}
];
const ORC_EST=Object.fromEntries(ORC_ESTADOS.map(e=>[e.k,e]));
let ORC_ROWS=[], ORC_META={}, ORC_DIRTY=false;
/* compatibilidade: orçamentos gravados antes de "Adjudicado" passar a "Compromisso" */
function migrarEstado(e){ return e==='adjudicado'?'compromisso':e }
window.addEventListener('beforeunload',e=>{
  if(ORC_DIRTY&&ORC_ROWS.length){e.preventDefault();e.returnValue="Tens alterações por gravar no orçamento.";}
});
async function _saveOrcBoard(){
  if(!SESSION){toast("Inicia sessão para gravar o orçamento em curso.");return}
  if(!ORC_ROWS.length){toast("Nada para gravar — arranca o orçamento primeiro.");return}
  const nome=(ORC_META.nome||document.getElementById('orcNome').value.trim()||"Projeto");
  const {error}=await sb.from('orcamentos').upsert({projeto_nome:nome,meta:ORC_META,linhas:ORC_ROWS,atualizado:new Date().toISOString()},{onConflict:'projeto_nome'});
  if(error){alertx("Erro a gravar o orçamento: "+error.message+"\n(Corre o supabase_update_orcamentos.sql se ainda não o fizeste.)");return}
  ORC_DIRTY=false; renderOrcKpis();
  toast("Orçamento em curso gravado — "+nome+".");
}
async function loadOrcBoard(nome){
  if(!SESSION||!nome)return false;
  const {data}=await sb.from('orcamentos').select('*').eq('projeto_nome',nome).maybeSingle();
  if(!data)return false;
  ORC_META=data.meta||{nome};
  ORC_ROWS=(data.linhas||[]).map(r=>Object.assign(r,{estado:migrarEstado(r.estado)}));
  if(ORC_META.abc)document.getElementById('orcAbc').value=ORC_META.abc;
  if(ORC_META.fogos)document.getElementById('orcFogos').value=ORC_META.fogos;
  document.getElementById('orcBoard').classList.remove('hidden');
  document.getElementById('orcTag').textContent=nome+" · retomado ("+new Date(data.atualizado).toLocaleDateString('pt-PT')+")";
  renderOrc(); ORC_DIRTY=false;
  toast("Orçamento em curso retomado — "+nome+".");
  return true;
}
function refreshOrcamento(){
  const dl=document.getElementById('orcProjList');
  if(SESSION&&dl) dl.innerHTML=PROJETOS.map(p=>`<option value="${esc(p.nome)}">`).join("");
}
document.addEventListener('change',e=>{
  if(e.target&&e.target.id==='orcNome'&&SESSION){ loadOrcBoard(e.target.value.trim()); }
});
document.addEventListener('input',e=>{
  if(e.target&&e.target.id==='pNome'){
    const p=PROJETOS.find(x=>norm(x.nome)===norm(e.target.value));
    if(p){
      const map={pGFA:'gfa',pGCA:'gca',pAbaixo:'ac_abaixo',pFogos:'fogos',pPisosAcima:'pisos_acima',pPisosAbaixo:'pisos_enterrados',pImplantacao:'area_implantacao',pLote:'area_lote',pEstacionamento:'estacionamento'};
      Object.entries(map).forEach(([id,k])=>{const el=document.getElementById(id);if(el&&!el.value&&p[k]!=null)el.value=p[k];});
    }
  }
});
let ORC_RESUMO_WB=null;
(function wireOrcResumo(){
  const drop=document.getElementById('orcResumoDrop'), fi=document.getElementById('orcResumoFile');
  if(!drop) return;
  drop.onclick=()=>fi.click();
  drop.ondragover=e=>{e.preventDefault();drop.classList.add('over')};
  drop.ondragleave=()=>drop.classList.remove('over');
  drop.ondrop=e=>{e.preventDefault();drop.classList.remove('over');if(e.dataTransfer.files[0])loadOrcResumo(e.dataTransfer.files[0])};
  fi.onchange=()=>{if(fi.files[0])loadOrcResumo(fi.files[0])};
})();
function loadOrcResumo(f){
  const r=new FileReader();
  r.onload=e=>{
    try{ ORC_RESUMO_WB=XLSX.read(new Uint8Array(e.target.result),{type:'array'}); }
    catch(err){alertx("Não foi possível ler o ficheiro.");return}
    document.getElementById('orcResumoDrop').innerHTML="Resumo carregado: <b>"+esc(f.name)+"</b> — clica para trocar";
    const pick=document.getElementById('orcResumoSheet'), pills=document.getElementById('orcResumoPills');
    if(ORC_RESUMO_WB.SheetNames.length>1){
      pick.classList.remove('hidden'); pills.innerHTML="";
      const guess=ORC_RESUMO_WB.SheetNames.find(n=>/summary|resumo/i.test(n))||ORC_RESUMO_WB.SheetNames[0];
      ORC_RESUMO_WB.SheetNames.forEach(n=>{
        const b=document.createElement('button');b.className='pill'+(n===guess?' on':'');b.textContent=n;
        b.onclick=()=>{[...pills.children].forEach(c=>c.classList.remove('on'));b.classList.add('on');processOrcResumo(n);};
        pills.appendChild(b);
      });
      processOrcResumo(guess);
    } else { pick.classList.add('hidden'); processOrcResumo(ORC_RESUMO_WB.SheetNames[0]); }
  };
  r.readAsArrayBuffer(f);
}
function processOrcResumo(sheet){
  const rows=XLSX.utils.sheet_to_json(ORC_RESUMO_WB.Sheets[sheet],{header:1,raw:true,defval:null});
  const data=extractSummary(rows);
  if(!data||!data.length){alertx("Não encontrei colunas de fonte (RECEIVED OFFER / NO SOURCE) neste ficheiro. Confirma que é o resumo com o semáforo de fonte.");return}
  const nome=document.getElementById('orcNome').value.trim()||"Projeto";
  const abc=parseFloat(document.getElementById('orcAbc').value)||null;
  const fogos=parseFloat(document.getElementById('orcFogos').value)||null;
  ORC_META={nome,abc,fogos};
  // construir linhas a partir do resumo: mapear ao capítulo standard, estado pela fonte dominante
  const byCap={};
  data.forEach(d=>{
    const std=CAPS.find(c=>norm(c)===norm(d.name))||mapCapitulo(d.name);
    if(!std)return;
    byCap[std]=byCap[std]||{total:0,recebida:0,antiga:0,sem:0};
    byCap[std].total+=d.total; byCap[std].recebida+=d.recebida; byCap[std].antiga+=d.antiga; byCap[std].sem+=d.sem;
  });
  ORC_ROWS=capsOrd().map(cap=>{
    const b=byCap[cap];
    if(!b) return {cap,valor:0,estado:"racio",nota:"",origem:"—"};
    const pct=v=>b.total?Math.round(v/b.total*100):0;
    const remainder=Math.max(0,b.total-b.recebida-b.antiga-b.sem);
    const nota="Recebida "+pct(b.recebida)+"% · <2 anos "+pct(b.antiga)+"% · sem fonte "+pct(b.sem+remainder)+"%";
    return {cap,valor:Math.round(b.total),estado:estadoPorFonte(b.recebida,b.antiga,b.sem+remainder),nota,origem:"resumo importado"};
  });
  document.getElementById('orcBoard').classList.remove('hidden');
  document.getElementById('orcTag').textContent=nome+" · resumo importado"+(abc?" · ABC "+fmt(abc)+" m²":"");
  renderOrc();
  document.getElementById('orcBoard').scrollIntoView({behavior:'smooth'});
}
let ORC_PROP_WB=null;
(function wireOrcProp(){
  const drop=document.getElementById('orcPropDrop'), fi=document.getElementById('orcPropFile');
  if(!drop) return;
  drop.onclick=()=>fi.click();
  drop.ondragover=e=>{e.preventDefault();drop.classList.add('over')};
  drop.ondragleave=()=>drop.classList.remove('over');
  drop.ondrop=e=>{e.preventDefault();drop.classList.remove('over');if(e.dataTransfer.files[0])loadOrcProp(e.dataTransfer.files[0])};
  fi.onchange=()=>{if(fi.files[0])loadOrcProp(fi.files[0])};
})();
// Corre o parser de custos num ficheiro sem perturbar o estado do Analisador
function parseCostsFrom(wb,sheet){
  const savW=workbook,savS=chosenSheet,savH=MANUAL_H;
  workbook=wb; chosenSheet=sheet; MANUAL_H=null;
  let out={};
  try{ const it=parseSheet(); const arts=it?it.filter(x=>x.tipo==='art'):[]; out=extractCustos(arts).out; }
  catch(e){ out={}; }
  workbook=savW; chosenSheet=savS; MANUAL_H=savH;
  return out;
}
function loadOrcProp(f){
  const r=new FileReader();
  r.onload=e=>{
    try{ ORC_PROP_WB=XLSX.read(new Uint8Array(e.target.result),{type:'array'}); }
    catch(err){alertx("Não foi possível ler o ficheiro.");return}
    document.getElementById('orcPropDrop').innerHTML="Proposta carregada: <b>"+esc(f.name)+"</b> — clica para trocar";
    const pick=document.getElementById('orcPropSheet'), pills=document.getElementById('orcPropPills');
    if(ORC_PROP_WB.SheetNames.length>1){
      pick.classList.remove('hidden'); pills.innerHTML="";
      const guess=ORC_PROP_WB.SheetNames[0];
      ORC_PROP_WB.SheetNames.forEach(n=>{
        const b=document.createElement('button');b.className='pill'+(n===guess?' on':'');b.textContent=n;
        b.onclick=()=>{[...pills.children].forEach(c=>c.classList.remove('on'));b.classList.add('on');processOrcProp(n,f.name);};
        pills.appendChild(b);
      });
      processOrcProp(guess,f.name);
    } else { pick.classList.add('hidden'); processOrcProp(ORC_PROP_WB.SheetNames[0],f.name); }
  };
  r.readAsArrayBuffer(f);
}
function processOrcProp(sheet,fname){
  const custos=parseCostsFrom(ORC_PROP_WB,sheet);
  const caps=Object.entries(custos).filter(([c,v])=>c!=="(sem capítulo)"&&v>0);
  if(!caps.length){alertx("Não encontrei preços por capítulo nesta proposta. Confirma que o ficheiro tem colunas de preço.");return}
  // garantir board: se ainda não há, inicializar vazio com os 33 capítulos
  if(!ORC_ROWS.length){
    ORC_META={nome:document.getElementById('orcNome').value.trim()||"Projeto",abc:parseFloat(document.getElementById('orcAbc').value)||null,fogos:parseFloat(document.getElementById('orcFogos').value)||null};
    ORC_ROWS=capsOrd().map(cap=>({cap,valor:0,estado:"racio",nota:"",origem:"—"}));
    document.getElementById('orcBoard').classList.remove('hidden');
    document.getElementById('orcTag').textContent=ORC_META.nome;
  }
  const forn=document.getElementById('orcForn').value.trim()||"Fornecedor";
  // mapear cada capítulo da proposta ao standard e atualizar o board
  const cobertos=[]; let totalProp=0;
  caps.forEach(([cap,v])=>{
    const std=normalizaCap(CAPS.find(c=>norm(c)===norm(cap))||mapCapitulo(cap)||cap);
    if(!std)return;
    const row=ORC_ROWS.find(r=>r.cap===std);
    if(row){
      row.valor=Math.round(v);
      row.estado="firme";
      row.origem="proposta:"+forn;
      row.nota="Proposta "+forn;
      cobertos.push(std); totalProp+=v;
    }
  });
  // capítulos NÃO cobertos pela proposta (potenciais exclusões a confirmar)
  const naoCobertos=CAPS.filter(c=>!cobertos.includes(c));
  renderOrc();
  const box=document.getElementById('orcPropCober');
  box.className="note";
  box.innerHTML="<b>"+forn+"</b> cobre <b>"+cobertos.length+" capítulo(s)</b> ("+fmt(totalProp,0)+" €), marcados como proposta recebida: "+
    cobertos.map(esc).join(", ")+".<br><span style='color:#8794a8'>Não abrangidos por esta proposta (confirmar se são exclusões ou de outro fornecedor): "+
    naoCobertos.slice(0,12).map(esc).join(", ")+(naoCobertos.length>12?"…":"")+".</span><br><span style='color:#8794a8;font-size:12px'>Exclusões e condições escritas em texto livre não são extraídas automaticamente — regista-as na nota de cada capítulo.</span>";
  document.getElementById('orcBoard').scrollIntoView({behavior:'smooth'});
  ORC_DIRTY=true;
}
async function orcSeed(){
  const nome=document.getElementById('orcNome').value.trim()||"Projeto";
  const abc=parseFloat(document.getElementById('orcAbc').value)||null;
  const fogos=parseFloat(document.getElementById('orcFogos').value)||null;
  ORC_META={nome,abc,fogos};
  // arrancar dos rácios: usar mediana por capítulo da biblioteca (como o estimador, base ABC)
  let seedByCap={};
  if(abc){
    const projData=await gatherProjectData('real'); // prefere Real
    const per={};
    projData.forEach(pd=>{Object.entries(pd.caps).forEach(([cap,total])=>{if(pd.gfa){(per[cap]=per[cap]||[]).push(total/pd.gfa);}})});
    const med=arr=>{const a=arr.slice().sort((x,y)=>x-y);const n=a.length;return n?(n%2?a[(n-1)/2]:(a[n/2-1]+a[n/2])/2):null};
    Object.keys(per).forEach(cap=>{const m=med(per[cap]);if(m!=null)seedByCap[cap]=Math.round(m*abc);});
  }
  // construir linhas: todos os 33 capítulos, valor do seed (ou 0), estado inicial rácio
  ORC_ROWS=capsOrd().map(cap=>({cap,valor:seedByCap[cap]!=null?seedByCap[cap]:0,estado:"racio",nota:"",origem:seedByCap[cap]!=null?"rácio biblioteca":"—"}));
  document.getElementById('orcBoard').classList.remove('hidden');
  document.getElementById('orcTag').textContent=nome+(abc?" · ABC "+fmt(abc)+" m²":"");
  renderOrc();
  document.getElementById('orcBoard').scrollIntoView({behavior:'smooth'});
}
function renderOrc(){
  const tb=document.getElementById('tbOrc'); tb.innerHTML="";
  const abc=ORC_META.abc;
  ORC_ROWS.forEach((r,i)=>{
    const opts=ORC_ESTADOS.map(e=>`<option value="${e.k}" ${r.estado===e.k?'selected':''}>${e.lbl}</option>`).join("");
    const tr=document.createElement('tr');
    tr.innerHTML=`<td>${esc(r.cap)}<div style="color:#8794a8;font-size:12px">origem: ${esc(r.origem)}</div></td>
      <td class="num"><input type="number" step="1" class="orcVal" data-i="${i}" value="${r.valor||0}" style="text-align:right"></td>
      <td><select class="estado-sel ${ORC_EST[r.estado].cls} orcEst" data-i="${i}">${opts}</select></td>
      <td class="num">${abc&&r.valor?fmt(r.valor/abc,0):"—"}</td>
      <td><input type="text" class="orcNota" data-i="${i}" value="${esc(r.nota||'')}" placeholder="fornecedor, exclusões…" style="width:100%;border:1px solid var(--line);border-radius:6px;padding:6px 8px;font-size:12px"></td>`;
    tb.appendChild(tr);
  });
  tb.querySelectorAll('.orcVal').forEach(el=>el.addEventListener('input',e=>{ORC_ROWS[+e.target.dataset.i].valor=parseFloat(e.target.value)||0;ORC_DIRTY=true;renderOrcKpis();}));
  tb.querySelectorAll('.orcEst').forEach(el=>el.addEventListener('change',e=>{const i=+e.target.dataset.i;ORC_ROWS[i].estado=e.target.value;ORC_DIRTY=true;e.target.className='estado-sel '+ORC_EST[e.target.value].cls+' orcEst';renderOrcKpis();}));
  tb.querySelectorAll('.orcNota').forEach(el=>el.addEventListener('input',e=>{ORC_ROWS[+e.target.dataset.i].nota=e.target.value;ORC_DIRTY=true;}));
  renderOrcKpis();
}
function renderOrcKpis(){
  const tag=document.getElementById('orcTag');
  if(tag){const base=tag.textContent.replace(/ · por gravar$/,"");tag.textContent=ORC_DIRTY?base+" · por gravar":base;}
  const abc=ORC_META.abc;
  const total=ORC_ROWS.reduce((s,r)=>s+(r.valor||0),0);
  const solido=ORC_ROWS.filter(r=>ORC_EST[r.estado].solido).reduce((s,r)=>s+(r.valor||0),0);
  const capsComValor=ORC_ROWS.filter(r=>r.valor>0);
  const capsSolidos=capsComValor.filter(r=>ORC_EST[r.estado].solido).length;
  document.getElementById('orcKTotal').textContent=fmt(total,0)+" €";
  document.getElementById('orcKValor').textContent=total?fmt(solido/total*100,0)+"%":"—";
  document.getElementById('orcKCaps').textContent=capsSolidos+" / "+capsComValor.length;
  document.getElementById('orcKm2').textContent=abc&&total?fmt(total/abc,0):"—";
  // barra de consolidação por estado
  const bar=document.getElementById('orcConsBar'); bar.innerHTML="";
  if(total>0){
    ORC_ESTADOS.forEach(e=>{
      const v=ORC_ROWS.filter(r=>r.estado===e.k).reduce((s,r)=>s+(r.valor||0),0);
      if(v>0){const d=document.createElement('div');d.className=e.cb;d.style.width=(v/total*100)+"%";d.title=e.lbl+": "+fmt(v,0)+" € ("+fmt(v/total*100,0)+"%)";bar.appendChild(d);}
    });
  }
  renderContingencia(total);
}
function orcTier(estado){ const e=ORC_EST[estado]; if(!e) return 'estim'; if(e.solido) return 'firme'; if(estado==='racio') return 'estim'; return 'inter'; }
function renderContingencia(total){
  const box=document.getElementById('orcConting'); if(!box) return;
  const gp=id=>{const el=document.getElementById(id); return el?(parseFloat(el.value)||0):0;};
  const pf=gp('orcPctFirme'), pi=gp('orcPctInter'), pe=gp('orcPctEstim');
  let vf=0,vi=0,ve=0;
  ORC_ROWS.forEach(r=>{ const v=r.valor||0; const t=orcTier(r.estado); if(t==='firme')vf+=v; else if(t==='inter')vi+=v; else ve+=v; });
  const cf=vf*pf/100, ci=vi*pi/100, ce=ve*pe/100, ct=cf+ci+ce;
  const set=(id,val)=>{const el=document.getElementById(id); if(el) el.textContent=val;};
  set('orcContFirmeV',fmt(vf,0)+' €'); set('orcContFirmeC',fmt(cf,0)+' €');
  set('orcContInterV',fmt(vi,0)+' €'); set('orcContInterC',fmt(ci,0)+' €');
  set('orcContEstimV',fmt(ve,0)+' €'); set('orcContEstimC',fmt(ce,0)+' €');
  set('orcContTotal',fmt(ct,0)+' €');
  set('orcContPct', total?fmt(ct/total*100,1)+'%':'—');
  set('orcTotalCC', fmt(total+ct,0)+' €');
}
// Wrap up Legendre vivo — alimentado pelos capítulos em tempo real
function exportOrcamento(){
  if(!ORC_ROWS.length){toast("Arranca o orçamento primeiro.");return}
  const abc=ORC_META.abc;
  const total=ORC_ROWS.reduce((s,r)=>s+(r.valor||0),0);
  const solido=ORC_ROWS.filter(r=>ORC_EST[r.estado].solido).reduce((s,r)=>s+(r.valor||0),0);
  const head=[["SOLIVE — ORÇAMENTO PRELIMINAR · CONSOLIDAÇÃO"],
    ["Projeto: "+ORC_META.nome+"   ·   ABC: "+(abc||"—")+" m²   ·   Data: "+new Date().toLocaleDateString('pt-PT')],
    ["Total: "+fmt(total,0)+" €   ·   Consolidado (proposta firme ou compromisso): "+(total?fmt(solido/total*100,0):"0")+"%"],
    [],
    ["Capítulo","Valor (€)","Estado","€/m² ABC","Origem","Nota / fornecedor / exclusões"]];
  const body=ORC_ROWS.map(r=>[r.cap,Math.round(r.valor||0),ORC_EST[r.estado].lbl,abc&&r.valor?Math.round(r.valor/abc):"",r.origem,r.nota||""]);
  body.push([]);
  body.push(["TOTAL",Math.round(total),"",abc?Math.round(total/abc):"","",""]);
  const ws=XLSX.utils.aoa_to_sheet(head.concat(body));
  ws['!cols']=[{wch:44},{wch:14},{wch:24},{wch:12},{wch:18},{wch:40}];
  const wb=XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb,ws,"Orçamento");
  XLSX.writeFile(wb,("Orcamento_"+ORC_META.nome).replace(/[^\w]+/g,"_")+".xlsx");
}

APP_REGISTAR('05-orcamentacao','2.7.2');
