/* Solive · Orçamentação — 06-estimador-comparar.js
   Estimador por rácios/drivers e Comparar projetos.
   Versão: ver APP_REGISTAR no fim do ficheiro (tem de ser igual à do index.html). */

/* ================= ESTIMADOR ================= */
async function _runEstimador(){
  const D=estDescritores();
  const base=document.getElementById('estBase').value;
  const pref=document.getElementById('estFonte').value;
  const infl=parseFloat(document.getElementById('estInfl').value)||0;
  const inflModo=document.getElementById('estInflModo').value;
  const alvo=parseInt(document.getElementById('estAno').value)||new Date().getFullYear();
  const budget=parseFloat(document.getElementById('estBudget').value)||null;
  const usarPU=document.getElementById('estPU').value==='auto';
  const calibOn=document.getElementById('estCalib').value==='on';
  const softOn=document.getElementById('estSoft').value==='on';
  const kitOn=((document.getElementById('estKit')||{}).value||'auto')==='auto';

  if(base==='abc'&&!D.abc){return alertx("Introduz a ABC (ou muda a base de cálculo).")}
  if(base==='fogo'&&!D.fogos){return alertx("Introduz o nº de fogos para a base €/fogo.")}
  if(base==='media'&&(!D.abc||!D.fogos)){return alertx("A base 'média' precisa de ABC e de fogos.")}
  if(base==='driver'&&!D.abc&&!D.fogos){return alertx("Introduz pelo menos a ABC ou o nº de fogos.")}

  const projData=await gatherProjectData(pref);
  if(!projData.length){
    document.getElementById('estResults').classList.add('hidden');
    return alertx(pref==='adjudicado'
      ? "Ainda não há preços adjudicados registados no separador Execução. Escolhe outra fonte dos rácios."
      : "Não há projetos na base para calcular rácios.");
  }
  const calib=calibOn?await calibracaoDesvios():{};
  const puEst=usarPU?estimativaPorPU(D):null;
  /* Kit-tipo (Fase 4b): nos capítulos com elementos (cozinhas, carpintarias, AVAC, elevadores…)
     o valor vem do mix de tipologias × quantidades do kit × preço do elemento. */
  let kitEst=null;
  if(kitOn){ try{ kitEst=await tpElementosPorCapitulo(); }catch(e){ console.warn('kit',e); kitEst={erro:'falha'}; } }
  const kitCaps=(kitEst&&kitEst.porCap)||{};
  const kitDe=cap=>{ const k=Object.keys(kitCaps).find(x=>norm(x)===norm(cap)); return k?kitCaps[k]:null; };
  const KIT_MIN=0.6;   // abaixo de 60% do rácio, os elementos não representam o capítulo inteiro

  /* rácio por capítulo = total histórico / driver histórico, escalado por (driver_alvo/driver_hist)^expoente */
  const perCap={};
  /* Fase 6: capítulos de acabamento vindos de projetos de outro segmento convertem-se pelo índice de segmento */
  const segAlvo=((typeof tpProj==='function'&&tpProj())||{}).segmento||((typeof CTX!=='undefined'&&CTX.D)||{}).segmento||null;
  const segConv={};
  projData.forEach(pd=>{
    Object.entries(pd.caps).forEach(([cap,total0])=>{
      const t=TAXO[cap]||TAXO_DEFAULT;
      const sf=(t.sens&&segAlvo&&pd.D&&pd.D.segmento)?segFator(pd.D.segmento,segAlvo):1;
      if(sf!==1){ (segConv[cap]=segConv[cap]||new Set()).add(pd.D.segmento); }
      const total=total0*sf;
      const f=fatorInflacao(infl,inflModo,t.idx,alvo-pd.ano);
      const dh=driverValue(t.driver,pd.D), dt=driverValue(t.driver,D);
      let val=null, modo=null, rc=null;
      if(base==='driver'&&dh>0&&dt>0){
        val=total*f*Math.pow(dt/dh,t.exp); rc=total/dh; modo='drv';
      } else {
        const ah=pd.D.abc, fh=pd.D.fogos;
        const porAbc=(ah>0&&D.abc>0)?total*f/ah*D.abc:null;
        const porFogo=(fh>0&&D.fogos>0)?total*f/fh*D.fogos:null;
        if(base==='fogo'&&porFogo!=null){val=porFogo;rc=total/fh;}
        else if(base==='media'&&porAbc!=null&&porFogo!=null){val=(porAbc+porFogo)/2;rc=total/ah;}
        else if(porAbc!=null){val=porAbc;rc=total/ah;}
        else if(porFogo!=null){val=porFogo;rc=total/fh;}
        modo='lin';
      }
      if(val==null||!isFinite(val))return;
      (perCap[cap]=perCap[cap]||[]).push({val,rc,modo,proj:pd.nome});
    });
  });

  const ordemCap=capsOrd().concat(Object.keys(perCap).filter(c=>!CAPS.includes(c)));
  const rows=[]; let tC=0,tLo=0,tHi=0;
  ordemCap.forEach(cap=>{
    const lst=perCap[cap]; if(!lst||!lst.length)return;
    const t=TAXO[cap]||TAXO_DEFAULT;
    const ests=lst.map(x=>x.val);
    let central=med(ests), lo=Math.min(...ests), hi=Math.max(...ests);
    let fonte=(base==='driver'&&lst[0].modo==='drv')?'drv':'lin';
    // preços unitários sobrepõem-se ao rácio quando existe medição e amostra suficiente
    const pu=puEst&&puEst.porCap[cap];
    if(pu&&pu.cobertura>=0.6){
      central=pu.valor; lo=pu.lo; hi=pu.hi; fonte='qt';
    }
    const k=calib[cap];
    let kf=(calibOn&&k&&k.n>=1)?k.fator:1;
    central*=kf; lo*=kf; hi*=kf;
    const kit=kitDe(cap); let kitInfo=null;
    if(kit&&kit.valor>0&&fonte!=='qt'){
      const cob=central>0?kit.valor/central:1;
      kitInfo={valor:kit.valor,racio:central,cob,itens:kit.itens,semPreco:kit.semPreco};
      if(cob>=KIT_MIN){ central=kit.valor; lo=Math.min(lo,kit.valor); hi=Math.max(hi,kit.valor); fonte='kit'; kf=1; }
      else kitInfo.parcial=true;
    }
    if(kit) kit.usado=true;
    rows.push({cap,n:ests.length,rc:med(lst.map(x=>x.rc).filter(v=>v!=null)),
               central,lo,hi,fonte,drv:t.driver,exp:t.exp,kf,kn:k?k.n:0,kit:kitInfo});
    tC+=central; tLo+=lo; tHi+=hi;
  });

  /* capítulos de elementos sem histórico na base: entram só pelo kit */
  Object.entries(kitCaps).forEach(([cap,kit])=>{
    if(kit.usado||!(kit.valor>0)) return;
    const t=TAXO[cap]||TAXO_DEFAULT;
    rows.push({cap,n:0,rc:null,central:kit.valor,lo:kit.valor,hi:kit.valor,fonte:'kit',drv:t.driver,exp:t.exp,kf:1,kn:0,
               kit:{valor:kit.valor,racio:null,cob:null,itens:kit.itens,semPreco:kit.semPreco}});
    tC+=kit.valor; tLo+=kit.valor; tHi+=kit.valor;
  });

  const baseLbl={driver:"driver físico",abc:"€/m² ABC",fogo:"€/fogo",media:"média ABC+fogo"}[base];
  document.getElementById('estResults').classList.remove('hidden');
  { const ev=document.getElementById('estVazio'); if(ev) ev.classList.add('hidden'); }
  document.getElementById('estTag').textContent=baseLbl+" · infl. "+infl+"%/ano → "+alvo+(calibOn?" · calibrado":"");
  document.getElementById('estKTotal').textContent=fmt(tC,0)+" €";
  document.getElementById('estKRange').textContent=fmt(tLo/1e6,2)+" – "+fmt(tHi/1e6,2)+" M€";
  document.getElementById('estKM2').textContent=D.abc?fmt(tC/D.abc,0):"—";
  document.getElementById('estKProj').textContent=projData.length;

  /* soft costs */
  let soft=0;
  const softCard=document.getElementById('estSoftCard');
  if(softOn){ soft=renderSoftCosts(tC); softCard.classList.remove('hidden'); }
  else softCard.classList.add('hidden');
  const totalBP=tC+soft;

  const bb=document.getElementById('estKBudgetBox'), bv=document.getElementById('estKBudget');
  const bs=document.getElementById('estKBudgetS');
  if(budget){ const dv=totalBP-budget, d=dv/budget;
    bv.textContent=(d>0?"+":"")+fmt(d*100,1)+"%"; bb.dataset.tone=d>0?'neg':'pos';
    if(bs) bs.textContent=(dv>0?'Excesso de ':'Folga de ')+fmt(Math.abs(dv),0)+' €'; }
  else{ bv.textContent="—"; bb.dataset.tone=''; if(bs) bs.textContent='Sem budget indicado'; }
  estDesenharBP(tLo,tC,tHi,soft,budget);

  const nQt=rows.filter(r=>r.fonte==='qt').length, nDrv=rows.filter(r=>r.fonte==='drv').length;
  const nota=document.getElementById('estNota');
  const partes=[];
  if(projData.length<=1) partes.push("<b>Base com 1 projeto</b> — sem dispersão real. O intervalo é nulo e a estimativa depende inteiramente desse projeto. Fecha obras e grava orçamentos para ganhar fiabilidade.");
  else partes.push("Estimativa central por mediana; intervalo = envelope mín–máx dos "+projData.length+" projetos na base. Não é um intervalo estatístico — é o que os projetos reais implicam.");
  if(nQt) partes.push("<b>"+nQt+" capítulo(s)</b> estimados por quantidade × preço unitário da biblioteca — o método mais preciso disponível.");
  if(nDrv) partes.push(nDrv+" capítulo(s) escalados pelo seu driver físico próprio.");
  const nConv=Object.keys(segConv).length;
  if(nConv) partes.push("<b>"+nConv+" capítulo(s) de acabamento</b> com projetos de outro segmento convertidos para "+esc(segLabel(segAlvo))+" pelo índice de segmento ("+[...new Set(Object.values(segConv).flatMap(s=>[...s]))].map(s=>esc(segLabel(s))+" ×"+fmt(segFator(s,segAlvo),2)).join(", ")+").");
  const nKit=rows.filter(r=>r.fonte==='kit').length, nKitP=rows.filter(r=>r.kit&&r.kit.parcial).length;
  if(kitOn){
    if(kitEst&&kitEst.erro==='sem_mix') partes.push("<b>Kit-tipo não usado</b>: o projeto ainda não tem mix de tipologias — define-o em <a style=\"cursor:pointer;text-decoration:underline\" onclick=\"showView('programa')\">Programa e tipologias</a>.");
    else if(kitEst&&kitEst.erro==='sem_projeto') partes.push("Kit-tipo não usado: o projeto ainda não está gravado.");
    else if(nKit||nKitP) partes.push((nKit?"<b>"+nKit+" capítulo(s)</b> calculados pelo kit-tipo (mix de tipologias × quantidade por fogo × preço do elemento, sem ajuste de inflação). ":"")+(nKitP?nKitP+" capítulo(s) com elementos que cobrem menos de "+Math.round(KIT_MIN*100)+"% do rácio ficaram pelo rácio (o kit aparece ao lado como referência).":""));
  }
  if(calibOn){const nc=rows.filter(r=>r.kn>0).length; partes.push(nc?("Calibração aplicada em "+nc+" capítulo(s) com histórico de desvio orçamento→real."):"Calibração ligada mas sem obras fechadas suficientes — sem efeito.");}
  if(softOn) partes.push("Soft costs: <b>"+fmt(soft,0)+" €</b> · total para o BP <b>"+fmt(totalBP,0)+" €</b>.");
  nota.innerHTML=partes.join(" ");

  const tb=document.getElementById('tbEst'); tb.innerHTML="";
  const escala=Math.max(1,...rows.map(r=>r.hi||0));
  const faixa=(lo,ce,hi)=>'<div class="lg-range" title="'+fmt(lo,0)+' – '+fmt(hi,0)+' €"><span class="lg-range-seg" style="left:'+(lo/escala*100).toFixed(2)+'%;width:'+Math.max(.6,(hi-lo)/escala*100).toFixed(2)+'%"></span><span class="lg-range-mk" style="left:'+(ce/escala*100).toFixed(2)+'%"></span></div>'
    +'<span class="lg-sub-l">'+fmt(lo,0)+' – '+fmt(hi,0)+'</span>';
  const FONTE_B={qt:['QT×PU','success'],drv:['Driver','info'],lin:['ABC','neutral'],kit:['Kit','accent']};
  rows.forEach(r=>{
    const fb=FONTE_B[r.fonte]||[r.fonte,'neutral'];
    let chip='<span class="lg-badge" data-tone="'+fb[1]+'">'+fb[0]+'</span>';
    if(r.kit){
      const det=r.kit.itens.map(l=>l.el.nome+': '+fmt(l.qt,1)+' '+l.el.unidade+' × '+fmt(l.preco.pu,0)+' € = '+fmt(l.total,0)+' €').join('\n')
        +(r.kit.semPreco.length?'\nSem preço: '+r.kit.semPreco.join(', '):'')+(r.kit.racio!=null?'\nPelo rácio do capítulo: '+fmt(r.kit.racio,0)+' €':'');
      chip+='<span class="lg-sub-l" style="cursor:help" title="'+esc(det)+'">'+(r.kit.parcial?'kit '+fmt(r.kit.valor,0)+' € · cobre '+Math.round(r.kit.cob*100)+'%':(r.kit.racio!=null?'rácio seria '+fmt(r.kit.racio,0)+' €':'só kit (sem histórico)'))+'</span>';
    }
    const tr=document.createElement('tr');
    tr.innerHTML=`<td>${esc(r.cap)}</td><td class="num">${r.n}</td>
      <td style="font-size:12px">${esc(DRIVER_LBL[r.drv]||r.drv)}${r.exp!==1?` <span class="lg-sub-l" style="display:inline" title="expoente de escala">^${r.exp}</span>`:""}</td>
      <td>${chip}</td>
      <td class="num">${r.rc!=null?fmt(r.rc,2):'—'}</td>
      <td class="num">${r.kf!==1?"×"+fmt(r.kf,2):'<span class="lg-miss">—</span>'}</td>
      <td class="num" style="font-weight:600">${fmt(r.central,0)}</td>
      <td>${faixa(r.lo||0,r.central||0,r.hi||0)}</td>`;
    tb.appendChild(tr);
  });
  const tf=tb.closest('table'); let ft=tf.querySelector('tfoot'); if(!ft){ ft=document.createElement('tfoot'); tf.appendChild(ft); }
  ft.innerHTML=`<tr><td>Total hard costs</td><td></td><td></td><td></td><td></td><td></td><td class="num">${fmt(tC,0)}</td><td class="num" style="text-align:left">${fmt(tLo,0)} – ${fmt(tHi,0)}</td></tr>`;

  EST_LAST={nome:document.getElementById('estNome').value||"Projeto",base:baseLbl,pref,infl,inflModo,alvo,
            D,budget,rows,tC,tLo,tHi,soft,totalBP,nproj:projData.length,calibOn,softOn};
  document.getElementById('estResults').scrollIntoView({behavior:'smooth'});
  saveLocal('est',estInputs());
  try{ lgGuiaAtualizar('estimador'); }catch(e){}
}
let EST_LAST=null;
/* Fase 6: comparação do total (hard + soft) com o budget do BP — barra com o intervalo
   histórico, a estimativa central e a marca do budget; folga ou excesso em €. */
function estDesenharBP(lo,ce,hi,soft,budget){
  const box=document.getElementById('estBP'); if(!box) return;
  if(!budget){ box.classList.add('hidden'); box.innerHTML=''; return; }
  const s=soft||0, L=lo+s, C=ce+s, H=hi+s;
  const max=Math.max(H,budget)*1.08, pc=v=>(v/max*100).toFixed(2)+'%';
  const dv=C-budget, exc=dv>0;
  const pLo=budget<L?'abaixo de todo o intervalo histórico':(budget>H?'acima de todo o intervalo histórico':'dentro do intervalo histórico');
  box.innerHTML='<div class="lg-section-head"><h2 class="lg-section-title">Comparação com o BP</h2><span class="lg-badge" data-tone="'+(exc?'danger':'success')+'">'+(exc?'Excesso':'Folga')+' de '+fmt(Math.abs(dv),0)+' €</span></div>'
    +'<div class="lg-pad" style="padding-top:16px"><div class="lg-bp">'
    +'<span class="lg-bp-rng" style="left:'+pc(L)+';width:'+pc(H-L)+'"></span>'
    +'<span class="lg-bp-est" style="left:'+pc(C)+'"><b>Estimativa '+fmt(C/1e6,2)+' M€</b></span>'
    +'<span class="lg-bp-bud" style="left:'+pc(budget)+'"><b>BP '+fmt(budget/1e6,2)+' M€</b></span></div>'
    +lgKV('Estimativa central'+(s?' (com soft costs)':''),fmt(C,0)+' €')+lgKV('Budget do BP',fmt(budget,0)+' €')
    +lgKV(exc?'Excesso face ao BP':'Folga face ao BP','<span class="'+(exc?'lg-neg':'lg-pos')+'">'+fmt(Math.abs(dv),0)+' € ('+(dv>0?'+':'')+fmt(dv/budget*100,1)+'%)</span>','lg-kv-tot')
    +'<p class="lg-meta">O budget está '+pLo+' ('+fmt(L,0)+' – '+fmt(H,0)+' €).</p></div>';
  box.classList.remove('hidden');
}
/* descritores do projeto ativo na coluna da esquerda */
function estPainelDescritores(){
  const box=document.getElementById('estDesc'); if(!box||typeof CTX==='undefined') return;
  const D=CTX.D||{}; const v=(x,u)=>(x>0)?fmt(x,0)+(u?' '+u:''):'<span class="lg-miss">por preencher</span>';
  let seg=''; try{ seg=D.segmento?segLabel(D.segmento):''; }catch(e){ seg=D.segmento||''; }
  box.innerHTML=(CTX.nome?'<div class="lg-est-nome">'+esc(CTX.nome)+(seg?' <span class="lg-badge" data-tone="inverse">'+esc(seg)+'</span>':'')+'</div>':'')
    +lgKV('ABC total',v(D.abc,'m²'))+lgKV('Acima solo',v(D.acima,'m²'))+lgKV('Abaixo solo',v(D.abaixo,'m²'))+lgKV('Fogos',v(D.fogos))
    +lgKV('Pisos elevados',v(D.pisosA))+lgKV('Pisos enterrados',v(D.pisosB))+lgKV('Implantação',v(D.implantacao,'m²'))+lgKV('Lote',v(D.lote,'m²'));
}
function exportEstimativa(){
  if(!EST_LAST){toast("Corre uma estimativa primeiro.");return}
  const E=EST_LAST, D=E.D;
  const head=[["SOLIVE — ESTIMATIVA PRELIMINAR (Business Plan)"],
    ["Projeto: "+E.nome+"   ·   Data: "+new Date().toLocaleDateString('pt-PT')],
    ["Base de cálculo: "+E.base+"   ·   Fonte dos rácios: "+E.pref+"   ·   Projetos na base: "+E.nproj],
    ["Inflação: "+E.infl+"%/ano ("+(E.inflModo==='split'?"diferenciada por índice":"uniforme")+") → ano-alvo "+E.alvo],
    ["Calibração pelo desvio histórico: "+(E.calibOn?"LIGADA":"desligada")],
    ["Descritores — ABC: "+(D.abc||"—")+" m² · acima: "+(D.acima||"—")+" · abaixo: "+(D.abaixo||"—")+" · implantação: "+(D.implantacao||"—")+" · lote: "+(D.lote||"—")+" · fogos: "+(D.fogos||"—")+" · pisos "+(D.pisosA||"—")+"/"+(D.pisosB||"—")+" · estacionamento: "+(D.park||"—")],
    [],
    ["METODOLOGIA"],
    ["Cada capítulo é escalado pela grandeza física que comanda o seu custo (driver), não uniformemente por m² de ABC."],
    ["Fórmula: estimativa = total_histórico × (driver_novo / driver_histórico) ^ expoente × fator_inflação × fator_calibração"],
    ["Expoente < 1 significa que o capítulo tem componente fixa e cresce menos que proporcionalmente à dimensão."],
    ["Fonte QT×PU = estimado por quantidade medida × preço unitário da biblioteca (método mais preciso)."],
    ["Fonte DRIVER = rácio do capítulo escalado pelo driver físico. Fonte ABC = recurso a m² por falta de driver."],
    ["Fonte KIT-TIPO = mix de tipologias × quantidade por fogo (ficha / kit-tipo / observado) × preço do elemento na biblioteca."],
    [],
    ["Capítulo","Nº projetos","Driver","Expoente","Fonte","Rácio central","Calibração","Estimativa (€)","Mínimo (€)","Máximo (€)"]];
  const fonteLbl={qt:"QT×PU",drv:"DRIVER",lin:"ABC",kit:"KIT-TIPO"};
  const body=E.rows.map(r=>[r.cap,r.n,DRIVER_LBL[r.drv]||r.drv,r.exp,fonteLbl[r.fonte],
    r.rc!=null?Math.round(r.rc*100)/100:"",r.kf!==1?Math.round(r.kf*100)/100:"",
    Math.round(r.central),Math.round(r.lo),Math.round(r.hi)]);
  body.push(["TOTAL HARD COSTS","","","","","","",Math.round(E.tC),Math.round(E.tLo),Math.round(E.tHi)]);
  if(E.softOn&&SOFT_ROWS.length){
    body.push([]);
    body.push(["SOFT COSTS","","","","","% s/ hard costs","","Valor (€)"]);
    SOFT_ROWS.forEach(s=>body.push([s.lbl,"","","","",s.pct+"%","",Math.round(E.tC*s.pct/100)]));
    body.push(["TOTAL SOFT COSTS","","","","","","",Math.round(E.soft)]);
    body.push(["TOTAL PARA O BUSINESS PLAN","","","","","","",Math.round(E.totalBP)]);
  }
  if(E.budget){
    body.push([]);
    body.push(["Budget do BP","","","","","","",Math.round(E.budget)]);
    body.push(["Desvio estimativa vs. budget","","","","","","",Math.round(E.totalBP-E.budget),"",
      (((E.totalBP-E.budget)/E.budget*100).toFixed(1))+"%"]);
  }
  const ws=XLSX.utils.aoa_to_sheet(head.concat(body));
  ws['!cols']=[{wch:44},{wch:11},{wch:24},{wch:10},{wch:10},{wch:14},{wch:11},{wch:16},{wch:14},{wch:14}];
  const wb=XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb,ws,"Estimativa");
  XLSX.writeFile(wb,("Estimativa_"+E.nome).replace(/\s+/g,"_")+".xlsx");
}

/* ================= COMPARAR ================= */
let CMP_SEQ=0;
async function _renderComparar(){
  const _s=++CMP_SEQ, _vivo=()=>_s===CMP_SEQ;
  const off=document.getElementById('cmpOffline');
  // referência embutida (só usada isolada offline, ou como preenchimento do L'Urbain gravado)
  const lurbTotal=REF.capitulos.reduce((s,c)=>s+c.total,0);
  const refMetricas=Object.fromEntries(Object.entries(REF.qty).flatMap(([cap,us])=>Object.entries(us).map(([u,q])=>[cap+" ("+u+")",{un:u,q}])));
  const ref={
    nome:"L'Urbain (ref.)", gfa:REF.gfa, gca:REF.gca, ac_abaixo:null, fogos:REF.fogos,
    pisos_acima:null, pisos_enterrados:2, area_implantacao:null, area_lote:null, estacionamento:null,
    metricas:refMetricas, _total:lurbTotal, _fonte:"referência"
  };
  let cols=[];
  if(SESSION && PROJETOS.length){
    off.className='note'; off.textContent="A comparar os projetos gravados na biblioteca. O custo é o CUSTO REAL gravado (autos), consistente com os Rácios e os Desvios.";
    // custo real por projeto a partir de custo_linha (paginado), via import_id -> projeto_ref
    let realByProj={};
    try{
      let __all=[]; for(let __f=0;__f<200000;__f+=1000){ const __q=await sb.from('custo_linha').select('import_id,total').range(__f,__f+999); if(__q.error)break; const __b=__q.data||[]; __all=__all.concat(__b); if(__b.length<1000)break; }
      const __imp={}; const __qi=await sb.from('custo_import').select('id,projeto_ref'); (__qi.data||[]).forEach(r=>{ __imp[r.id]=r.projeto_ref||null; });
      __all.forEach(l=>{ const pr=__imp[l.import_id]; if(pr){ const k=norm(pr); realByProj[k]=(realByProj[k]||0)+(Number(l.total)||0); } });
    }catch(e){ console.warn('custo real por projeto',e); }
    if(!_vivo())return;
    for(const p of PROJETOS){
      // custo REAL gravado (custo_linha); só recorre às fases antigas se o projeto ainda não tem autos
      let total=null, fonte=null;
      const __rk=norm(p.nome);
      if(realByProj[__rk]!=null && realByProj[__rk]>0){ total=Math.round(realByProj[__rk]*100)/100; fonte='Custo real'; }
      else {
        const {data:fs}=await sb.from('fases').select('*').eq('projeto_id',p.id);
        if(!_vivo())return;
        if(fs&&fs.length){ for(const tipo of ['Real','Contrato','Orçamento']){ const m=fs.filter(x=>x.fase===tipo); if(m.length){ const f=m.sort((a,b)=>(b.data||'').localeCompare(a.data||''))[0]; total=+f.total||null; fonte=tipo; break; } } }
      }
      const col=Object.assign({},p,{_total:total,_fonte:fonte});
      // completar o L'Urbain gravado com a referência embutida onde estiver vazio
      if(norm(p.nome).includes("URBAIN")){
        ['gfa','gca','fogos','pisos_enterrados','ac_abaixo','area_implantacao','area_lote','estacionamento'].forEach(k=>{ if(col[k]==null && ref[k]!=null) col[k]=ref[k]; });
        if(!col.metricas || !Object.keys(col.metricas).length) col.metricas=refMetricas;
        /* NÃO preencher o custo com o pricing sheet embutido — usa-se o custo real de custo_linha. */
      }
      cols.push(col);
    }
    /* Fase 6: o projeto de referência na primeira coluna */
    const rp=(typeof refProjeto==='function')?refProjeto():null;
    if(rp) cols.sort((a,b)=>(b.id===rp.id)-(a.id===rp.id));
  } else {
    off.className='note red'; off.textContent="Sem sessão — a mostrar apenas a referência L'Urbain. Inicia sessão para comparar os projetos da biblioteca.";
    cols=[ref];
  }

  // definição das linhas: [secção, rótulo, função(col)->valor, casas decimais]
  const num=(v,d)=>v==null||isNaN(v)?"—":fmt(v,d);
  const mq=(c,chave,unPref)=>{ // quantidade física por nome aproximado (unidade preferida opcional)
    if(!c.metricas)return null;
    const cands=Object.keys(c.metricas).filter(k=>norm(k).startsWith(norm(chave)));
    if(!cands.length)return null;
    if(unPref){const pk=cands.find(k=>norm(c.metricas[k].un||"").replace("2","²").replace("3","³")===unPref);if(pk)return c.metricas[pk].q;}
    // preferir maior grandeza (área costuma dominar sobre remates lineares)
    return cands.map(k=>c.metricas[k].q).reduce((a,b)=>Math.max(a,b),0);
  };
  const rows=[
    ["DESCRITORES","Nº de fogos",c=>c.fogos,0],
    [null,"ABC total (m²)",c=>c.gfa,0],
    [null,"Acima do solo (m²)",c=>c.gca,0],
    [null,"Abaixo do solo (m²)",c=>c.ac_abaixo,0],
    [null,"Pisos elevados",c=>c.pisos_acima,0],
    [null,"Pisos enterrados",c=>c.pisos_enterrados,0],
    [null,"Área implantação (m²)",c=>c.area_implantacao,0],
    [null,"Área do lote (m²)",c=>c.area_lote,0],
    [null,"Estacionamento (lug.)",c=>c.estacionamento,0],
    ["CUSTO","Custo total (€)",c=>c._total,0],
    [null,"€/m² ABC",c=>c._total&&c.gfa?c._total/c.gfa:null,0],
    [null,"€/m² acima do solo",c=>c._total&&c.gca?c._total/c.gca:null,0],
    [null,"€/m² abaixo do solo",c=>c._total&&c.ac_abaixo?c._total/c.ac_abaixo:null,0],
    [null,"€/m² implantação",c=>c._total&&c.area_implantacao?c._total/c.area_implantacao:null,0],
    [null,"€/fogo",c=>c._total&&c.fogos?c._total/c.fogos:null,0],
    ["QUANTIDADES FÍSICAS","Grandezas captadas",c=>c.metricas?Object.keys(c.metricas).length:null,0],
    [null,"Escavação (m³)",c=>mq(c,"Escava","m³"),0],
    [null,"Betão e estruturas (m³)",c=>mq(c,"Betão","m³"),0],
    [null,"Fachada / ETICS (m²)",c=>mq(c,"Fachada","m²")||mq(c,"ETICS","m²"),0],
    [null,"Cerâmicos (m²)",c=>mq(c,"Cerâmic","m²"),0],
    [null,"Rev. pavimentos (m²)",c=>mq(c,"Revestimentos de pav","m²"),0],
    [null,"Carpintarias (un)",c=>mq(c,"Carpint","un"),0],
    ["RÁCIOS FÍSICOS","Escavação / m² implantação",c=>{const e=mq(c,"Escava","m³");return e&&c.area_implantacao?e/c.area_implantacao:null},2],
    [null,"Betão / m² ABC",c=>{const b=mq(c,"Betão","m³");return b&&c.gfa?b/c.gfa:null},3],
    [null,"Betão / fogo",c=>{const b=mq(c,"Betão","m³");return b&&c.fogos?b/c.fogos:null},2],
    [null,"Fachada / m² ABC",c=>{const f=mq(c,"Fachada","m²")||mq(c,"ETICS","m²");return f&&c.gfa?f/c.gfa:null},3],
    [null,"Rev. pavimentos / m² ABC",c=>{const x=mq(c,"Revestimentos de pav","m²");return x&&c.gfa?x/c.gfa:null},3],
    [null,"Rev. pavimentos / fogo",c=>{const x=mq(c,"Revestimentos de pav","m²");return x&&c.fogos?x/c.fogos:null},1]
  ];

  document.getElementById('cmpHead').innerHTML='<th style="min-width:220px">Indicador</th>'+cols.map(c=>`<th style="text-align:right;min-width:140px">${esc(c.nome)}${c._fonte&&c._fonte!=="referência"?`<div style="font-weight:400;font-size:12px;color:#8794a8">custo: ${esc(c._fonte)}</div>`:""}</th>`).join("");
  const body=document.getElementById('cmpBody');body.innerHTML="";
  rows.forEach(([sec,label,fn,d])=>{
    if(sec){
      const trs=document.createElement('tr');
      trs.innerHTML=`<td colspan="${cols.length+1}" style="background:#F2EFED;font-weight:600;color:var(--navy);font-size:12px;letter-spacing:.5px;text-transform:uppercase">${esc(sec)}</td>`;
      body.appendChild(trs);
    }
    const tr=document.createElement('tr');
    tr.innerHTML=`<td>${esc(label)}</td>`+cols.map(c=>`<td class="num">${num(fn(c),d)}</td>`).join("");
    body.appendChild(tr);
  });
}

APP_REGISTAR('06-estimador-comparar','3.5.1');
