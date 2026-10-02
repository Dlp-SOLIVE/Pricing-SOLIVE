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

(function uxMount(){
  const nav=document.querySelector('header nav'); if(!nav) return;
  /* Fase 6: os ecrãs (Resumo, Administração, Segmentos e referência), os textos dos botões e
     as opções avançadas do Estimador estão diretamente no index.html; aqui só se monta o menu. */
  const B=id=>document.getElementById(id);
  const items=AREAS.filter(a=>a.k!=='admin').map(a=>{ const b=uxEl('button',{id:'nava-'+a.k,type:'button'}); b.textContent=a.t; b.onclick=()=>abrirArea(a.k); return b; });
  items.push(uxEl('div',{class:'navsep'}));
  const ad=uxEl('button',{id:'nava-admin',type:'button'}); ad.textContent='Administração'; ad.onclick=()=>abrirArea('admin'); items.push(ad);
  const aj=uxEl('button',{id:'nav-ajuda',type:'button'}); aj.textContent='Ajuda'; aj.onclick=()=>{try{abrirAjuda()}catch(e){}};
  items.push(aj);
  const out=B('btnLogout');
  nav.innerHTML=''; items.forEach(i=>nav.appendChild(i)); if(out) nav.appendChild(out);
  document.querySelectorAll('.purpose .toggle').forEach(b=>{b.textContent='Como funciona';});
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

/* Resumo do projeto */
async function uxRenderResumo(){
  const box=document.getElementById('rsBody'); if(!box) return;
  const nome=(typeof CTX!=='undefined'&&CTX.nome)||'';
  const h1=document.querySelector('#view-resumo .purpose h1'); if(h1) h1.textContent=nome?('Resumo do projeto · '+nome):'Resumo do projeto';
  if(!nome){ box.innerHTML='<div class="rs-card"><h3>Escolhe o projeto ativo</h3><div class="hint">Escreve ou escolhe um projeto em «Projeto ativo», na barra de topo. Para um projeto novo, escreve o nome e preenche os descritores.</div></div>'; return; }
  box.innerHTML='<div class="hint">A carregar…</div>';
  const online=(typeof SESSION!=='undefined'&&SESSION&&typeof sb!=='undefined'&&sb);
  const D=CTX.D||{};
  const faltam=[['abc','ABC'],['fogos','nº de fogos'],['implantacao','área de implantação'],['pisosA','pisos acima do solo']].filter(([k])=>!(D[k]>0)).map(x=>x[1]);
  let an=null, orc=null, cons=[], adj=[], ver=null;
  if(online){
    const proj=(typeof PROJETOS!=='undefined'?PROJETOS:[]).find(p=>norm(p.nome)===norm(nome));
    try{ if(proj){ const r=await sb.from('analises').select('*').eq('projeto_id',proj.id).order('id',{ascending:false}).limit(1); an=(r.data&&r.data[0])||null; } }catch(e){}
    try{ orc=await orcLerAtual(nome); }catch(e){}
    try{ if(!CONSULTAS||!CONSULTAS.length) await loadConsultas(); cons=(CONSULTAS||[]).filter(c=>norm(c.projeto)===norm(nome)); }catch(e){}
    try{ const r=await sb.from('adjudicacoes').select('*').eq('projeto',nome); adj=r.data||[]; }catch(e){}
    try{ ver=(await orcVersoes(nome,1))[0]||null; }catch(e){}
  }
  // orçamento
  const linhas=(orc&&orc.linhas)||[];
  const EST={}; (typeof ORC_ESTADOS!=='undefined'?ORC_ESTADOS:[]).forEach(e=>EST[e.k]=e);
  const mig=e=>{try{return migrarEstado(e)}catch(x){return e}};
  const total=linhas.reduce((s,r)=>s+(+r.valor||0),0);
  const porEst={}; linhas.forEach(r=>{const k=mig(r.estado)||'racio'; porEst[k]=(porEst[k]||0)+(+r.valor||0);});
  const solido=linhas.filter(r=>EST[mig(r.estado)]&&EST[mig(r.estado)].solido).reduce((s,r)=>s+(+r.valor||0),0);
  const pctSol=total?Math.round(solido/total*100):0;
  const racioLin=linhas.filter(r=>mig(r.estado)==='racio');
  const racioVal=racioLin.reduce((s,r)=>s+(+r.valor||0),0);
  const cores={racio:'#C81F35',consulta:'#B9760A',antiga:'#C9C2BF',firme:'#7CC4A0',compromisso:'#1F8A5B',adjudicado:'#1F8A5B'};
  const bar=total?'<div class="rs-bar">'+Object.keys(cores).filter(k=>porEst[k]).map(k=>'<span style="width:'+(porEst[k]/total*100)+'%;background:'+cores[k]+'"></span>').join('')+'</div>':'';
  // análise
  const al=(an&&an.payload&&an.payload.alertas)||[];
  const nErr=al.filter(a=>/err/i.test(a.sev)).length, nAv=al.filter(a=>/av|warn/i.test(a.sev)).length;
  // consultas
  const ec=c=>{try{return estadoConsulta(c).k}catch(e){return ''}};
  const cAtr=cons.filter(c=>ec(c)==='atraso'), cAg=cons.filter(c=>ec(c)==='aguarda'), cRec=cons.filter(c=>ec(c)==='recebida');
  // execução
  const adjTot=adj.reduce((s,a)=>s+(+a.adjudicado||0),0);
  const dt=d=>d?new Date(d).toLocaleDateString('pt-PT'):'';
  const st=(v,n,badge,cls,val,sub)=>'<div class="rs-st" onclick="showView(\''+v+'\')"><div class="t"><span>'+n+'</span><span class="rs-b '+cls+'">'+badge+'</span></div><div class="v">'+val+'</div>'+(sub||'')+'</div>';
  let html='<div class="rs-stages">';
  html+=st('estimador','1 · Estimar', faltam.length?'Descritores':'Pronto', faltam.length?'rs-warn':'rs-ok', D.abc>0?(Math.round(D.abc).toLocaleString('pt-PT')+' m² ABC'):'Sem ABC', '<div class="s">'+(D.fogos>0?D.fogos+' fogos · ':'')+(faltam.length?'Falta: '+faltam.join(', '):'Descritores completos')+'</div>');
  html+=st('analisador','2 · Rever projeto', an?(nErr+nAv?'A rever':'Sem alertas'):'Por fazer', an?(nErr+nAv?'rs-warn':'rs-ok'):'rs-none', an?esc(an.ficheiro||an.nome||'MQ analisado'):'—', '<div class="s">'+(an?(al.length+' alertas · '+nErr+' erros · '+nAv+' avisos'):'Ainda sem análise do MQ gravada')+'</div>');
  html+=st('orcamento','3 · Orçamentar', total?(pctSol>=90?'Consolidado':'Em curso'):'Por iniciar', total?(pctSol>=90?'rs-ok':'rs-info'):'rs-none', total?(pctSol+'% consolidado'):'—', total?(bar+'<div class="s">'+uxFmtM(total)+(D.abc>0?' · '+Math.round(total/D.abc).toLocaleString('pt-PT')+' €/m²':'')+'</div>'):'<div class="s">Sem orçamento em curso gravado</div>');
  html+=st('execucao','4 · Executar', adj.length?'Em curso':'Por iniciar', adj.length?'rs-info':'rs-none', adj.length?uxFmtM(adjTot):'—', '<div class="s">'+(adj.length?adj.length+' pacote(s) adjudicado(s)':'Começa depois da transferência para a Produção')+'</div>');
  html+='</div>';
  // próximas ações
  const acts=[];
  if(cAtr.length) acts.push(['!','#FBE1E5','#C81F35',cAtr.length+' consulta(s) sem resposta fora do prazo',[...new Set(cAtr.map(c=>c.cap))].slice(0,4).join(' · '),'consultas','Abrir consultas']);
  if(an&&(nErr+nAv)) acts.push(['!','#FBEDD7','#B9760A',(nErr+nAv)+' alertas na última análise do MQ',nErr+' erros · '+nAv+' avisos · '+esc(an.ficheiro||''),'analisador','Rever MQ']);
  if(racioLin.length) acts.push(['€','#F2EFED','#201C1D',racioLin.length+' capítulo(s) ainda estimados por rácio',uxFmtEur(racioVal)+(total?' · '+Math.round(racioVal/total*100)+'% do orçamento':''),'consultas','Abrir consulta']);
  if(cAg.length) acts.push(['…','#F2EFED','#201C1D',cAg.length+' consulta(s) a aguardar resposta','Dentro do prazo','consultas','Ver']);
  if(faltam.length) acts.push(['m²','#F2EFED','#201C1D','Descritores em falta: '+faltam.join(', '),'Sem eles, alguns rácios usam m² de ABC como aproximação',null,'Completar']);
  if(!total) acts.push(['+','#F2EFED','#201C1D','Arrancar o orçamento','A partir da estimativa por rácios ou de um resumo em Excel','orcamento','Abrir orçamento']);
  const actHtml=acts.length?acts.map(a=>'<div class="rs-act"><span class="rs-ic" style="background:'+a[1]+';color:'+a[2]+'">'+a[0]+'</span><div class="tx"><b>'+a[3]+'</b><span>'+a[4]+'</span></div><a onclick="'+(a[5]?'showView(\''+a[5]+'\')':'abrirDescritores()')+'">'+a[6]+'</a></div>').join(''):'<div class="hint">Nada pendente neste momento.</div>';
  // orçamento face ao BP
  const bp=+(document.getElementById('estBudget')||{}).value||0;
  let right='<div class="rs-card"><h3>Orçamento</h3>';
  right+='<div class="rs-kv"><span>Orçamento em curso</span><b>'+(total?uxFmtEur(total):'—')+'</b></div>';
  right+='<div class="rs-kv"><span>Valor consolidado</span><b>'+(total?uxFmtEur(solido)+' ('+pctSol+'%)':'—')+'</b></div>';
  if(bp) right+='<div class="rs-kv"><span>Budget do BP (hard costs)</span><b>'+uxFmtEur(bp)+'</b></div><div class="rs-kv" style="border-top:1px solid var(--line);margin-top:4px;padding-top:10px"><span style="color:var(--ink);font-weight:600">Folga face ao BP</span><b style="color:'+(bp-total<0?'#C81F35':'#1F8A5B')+'">'+uxFmtEur(bp-total)+'</b></div>';
  right+='<div class="rs-kv"><span>Consultas</span><b>'+cons.length+' ('+cRec.length+' com proposta)</b></div>';
  right+='<div class="hint" style="margin-top:8px">'+(ver?('Última versão gravada: rev. '+ver.versao+(ver.criado_em||ver.created_at?' · '+dt(ver.criado_em||ver.created_at):'')):'Sem versões gravadas')+(orc&&orc.atualizado?' · orçamento atualizado a '+dt(orc.atualizado):'')+'</div></div>';
  html+='<div class="rs-grid"><div class="rs-card"><h3>Próximas ações</h3>'+actHtml+'</div>'+right+'</div>';
  if(!online) html='<div class="note" style="margin-bottom:14px">Modo local: inicia sessão para ver os dados gravados deste projeto.</div>'+html;
  box.innerHTML=html;
}

/* ═══════════ Entrega 2 · ícones, títulos curtos, zona de ficheiros, estado vazio ═══════════ */
(function uxE2(){
  const ic=n=>'<i class="icon-'+n+'" aria-hidden="true"></i>';
  const addIc=(el,n)=>{ if(!el||el.querySelector('[class^="icon-"]')) return; el.insertAdjacentHTML('afterbegin',ic(n)); };
  // menu
  AREAS.forEach(a=>addIc(document.getElementById('nava-'+a.k),a.ic));
  addIc(document.getElementById('nav-ajuda'),'circle-help');
  addIc(document.getElementById('btnLogout'),'log-out');
  document.querySelectorAll('.purpose .toggle').forEach(b=>addIc(b,'circle-help'));
  // ícones nos botões, pelo texto
  const RULES=[[/^exportar|excel|descarregar/i,'download'],[/^gravar|^guardar/i,'save'],[/^importar|^carregar|^largar/i,'upload'],[/arrancar/i,'sparkles'],[/^registar|^adicionar|^novo|^nova|^abrir/i,'plus'],[/^editar/i,'pencil'],[/^eliminar|^apagar/i,'trash-2'],[/^comparar/i,'git-compare'],[/^repor/i,'rotate-ccw'],[/^aplicar/i,'check'],[/^cancelar|^fechar/i,'x'],[/^o que significam/i,'book-open']];
  const iconize=window.uxIcones=root=>(root||document).querySelectorAll('.btn,.btnctx').forEach(b=>{
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
    box.innerHTML='<span class="ux-empty-ic">'+ic('folder-open')+'</span><div><h3>Escolhe um projeto para começar</h3><p>Escolhe um projeto existente na barra do topo ou escreve o nome de um novo.</p></div><button class="btn red" type="button">'+ic('folder-search')+'Escolher projeto</button>';
    box.querySelector('button').onclick=e=>{ const i=document.getElementById('ctxNome'); if(i){ i.focus(); } try{ toggleCtxLista(e); }catch(err){} };
    const pu=view.querySelector('.purpose'); if(pu) pu.insertAdjacentElement('afterend',box); else view.prepend(box);
  });
  try{ document.body.classList.toggle('no-project',!(CTX&&CTX.nome)); }catch(e){}
  /* conteúdo desenhado depois (tabelas, modais): showView volta a pôr os ícones na vista aberta — sem MutationObserver */
})();

/* ═══════════ Explicações por separador (para que serve · passos · resultado · ciclo) ═══════════ */
(function uxHowTo(){
  const TX={"resumo":{"s":"O ponto de situação do projeto ativo e o que falta fazer","p":"Ver, num só ecrã, em que fase está o projeto e qual é o passo seguinte.","st":["Escolhe o projeto na barra do topo (ou escreve o nome de um novo).","Vê o estado de cada fase: estimativa, revisão do MQ, orçamento, consultas e execução.","Segue para o separador da fase que ainda não está concluída."],"r":"Sabes o que já está feito e o que falta."},"estimador":{"s":"Uma primeira estimativa de custo, só com os descritores do projeto","p":"Estimar o custo de construção antes de haver projeto de execução, para validar o budget do Business Plan.","st":["Confirma os descritores do projeto (ABC, fogos, pisos…) em «Editar descritores», no topo.","Ajusta os parâmetros do cálculo (segmento e projetos de referência). Se o projeto tiver mix de tipologias (Projeto › Programa e tipologias), os capítulos com elementos são calculados pelo kit-tipo.","Lê a estimativa por capítulo e compara o total com o budget do BP."],"r":"Custo estimado por capítulo, com o intervalo que os projetos históricos implicam.","w":"Na fase de Business Plan, antes de receberes o mapa de quantidades.","n":"analisador"},"analisador":{"s":"Validar o mapa de quantidades do projetista antes de orçamentar","p":"Detetar erros e quantidades fora do padrão no MQ, para comentares ao projetista antes de pedir preços.","st":["Confirma os descritores do projeto: são eles que tornam a comparação rigorosa.","Carrega o MQ (.xlsx). Se as colunas não forem reconhecidas, indica-as uma vez no mapeador — o padrão fica memorizado para o mesmo gabinete.","Revê os alertas: capítulos fora do padrão histórico, rácios invulgares e alterações face à revisão anterior.","Grava a análise: os descritores e as quantidades entram na Biblioteca."],"r":"Lista de alertas e comentários para a equipa projetista.","w":"Sempre que recebes um MQ novo ou uma revisão.","n":"orcamento"},"orcamento":{"s":"Construir o orçamento capítulo a capítulo e ver quanto já é preço firme","p":"Passar de uma estimativa por rácio a um orçamento suportado por preços de mercado.","st":["Arranca dos rácios da biblioteca, ou larga o resumo do orçamento em Excel.","À medida que tens preços, atualiza o estado de cada capítulo: rácio → em consulta → proposta → adjudicado.","Acompanha o semáforo: a percentagem consolidada mostra quanto do orçamento já é sólido."],"r":"Orçamento por capítulo, com a fonte de cada preço à vista.","w":"Depois de revisto o MQ e durante as consultas ao mercado.","n":"consultas"},"consultas":{"s":"Pedir preços ao mercado e escolher a melhor proposta","p":"Registar as consultas aos fornecedores e comparar as propostas lado a lado.","st":["Abre uma consulta por capítulo ou pacote e indica os fornecedores consultados.","Regista as propostas à medida que chegam.","Compara-as no mapa comparativo.","Escolhe a proposta: o preço passa para o Orçamento e fica no histórico do fornecedor."],"r":"Capítulos do orçamento com preço de mercado e histórico de preços por fornecedor.","w":"Quando um capítulo do orçamento ainda está em rácio ou com proposta antiga.","n":"execucao"},"precomq":{"s":"Preencher um mapa de quantidades vazio com os preços reais das tuas obras","p":"Obter uma referência de preço para cada linha do MQ, a partir do custo real já gravado.","st":["Importa o ficheiro de Compras (.xlsm) — basta uma vez, ou quando houver novas adjudicações.","Define o uplift de instalação e a base de custo (todas as obras ou só uma).","Carrega o MQ vazio e clica em «Orçamentar».","Confirma as linhas preenchidas por rácio de capítulo: vêm assinaladas porque não houve correspondência de texto fiável."],"r":"O MQ com preços unitários de custo real, pronto a descarregar.","w":"Antes de lançar consultas, para saberes que preço esperar.","n":"consultas"},"execucao":{"s":"Registar o que foi adjudicado e as variações em obra","p":"Guardar o preço de contrato de cada pacote e os desvios de execução, com o motivo de cada um.","st":["Quando fechas com um subempreiteiro, regista a adjudicação do pacote.","Durante a obra, regista cada variação e o respetivo motivo.","Acompanha o desvio face ao orçado, capítulo a capítulo."],"r":"Desvios medidos (e não estimados) e uma Biblioteca que aprende com o preço de contrato.","w":"A partir da primeira adjudicação e durante toda a obra.","n":"verificar"},"verificar":{"s":"Conferir os autos de medição com o adjudicado","p":"Confirmar que o que o subempreiteiro mede em cada auto está de acordo com o contrato.","st":["Escolhe o projeto e o pacote.","Carrega ou regista o auto de medição.","Revê as diferenças assinaladas face ao adjudicado antes de aprovar."],"r":"Autos conferidos e diferenças identificadas antes do pagamento.","w":"Todos os meses, quando chegam os autos."},"comparar":{"s":"Comparar projetos entre si, normalizados por m², fogo ou implantação","p":"Perceber onde um projeto se afasta do histórico, em descritores, custos e quantidades.","st":["Escolhe os projetos a comparar — o L’Urbain entra sempre como referência.","Escolhe a normalização (por m² de ABC, por fogo ou por implantação).","Lê as diferenças e usa-as para calibrar a estimativa."],"r":"Comparação lado a lado, pronta a usar num relatório.","w":"Para calibrar uma estimativa ou justificar um desvio."},"racios":{"s":"Os rácios de custo real por capítulo, a partir das obras fechadas","p":"Consultar quanto custou, de facto, cada capítulo nas obras da Solive.","st":["Filtra por segmento ou por projeto.","Consulta o €/m² e o €/unidade de cada capítulo."],"r":"Os rácios que alimentam a Estimativa e o Orçamentar MQ."},"biblioteca":{"s":"O conhecimento acumulado da Solive: rácios, quantidades e taxonomia","p":"Ter num só sítio os rácios de custo e de quantidades de todos os projetos, por capítulo e por fase.","st":["Não se preenche à mão: cada projeto entra ao gravares uma análise na Revisão do MQ e no fecho de obra.","Consulta os rácios por capítulo, projeto e fase.","Mantém a taxonomia de capítulos atualizada (quem administra a plataforma)."],"r":"Estimativas mais rigorosas a cada projeto que fechas."},"admin":{"s":"Gerir projetos, versões gravadas e fases","p":"Tarefas de manutenção, separadas das restantes para evitar ações irreversíveis por engano.","st":["Consulta as versões gravadas do orçamento de cada projeto.","Elimina projetos que já não são precisos — esta ação não se pode anular."],"r":"Uma lista de projetos limpa e o histórico de versões à mão."}};
  /* Fase 2: textos do Mapa de quantidades (Rever + Orçamentar) e do Importar */
  TX.analisador={"s":"Rever o MQ do projetista antes de orçamentar","p":"Detetar erros e quantidades fora do padrão no MQ, para comentares ao projetista antes de pedir preços. O mesmo ficheiro serve depois para o orçamentar.","st":["Carrega o MQ (.xlsx) no cartão do topo — ou larga-o em Importar, que o traz para aqui.","Escolhe a folha e carrega em «Analisar ficheiro». Se as colunas não forem reconhecidas, indica-as uma vez no mapeador — o padrão fica memorizado para o mesmo gabinete.","Revê os alertas: capítulos fora do padrão histórico, rácios invulgares e alterações face à revisão anterior.","Grava a análise: os descritores e as quantidades entram na Biblioteca.","Passa a «Orçamentar o MQ» para teres um preço por linha."],"r":"Lista de alertas e comentários para a equipa projetista.","w":"Sempre que recebes um MQ novo ou uma revisão.","n":"precomq"};
  TX.precomq={"s":"Preencher o mapa de quantidades com os preços reais das tuas obras","p":"Obter uma referência de preço para cada linha do MQ, a partir do custo real já gravado.","st":["Carrega o MQ no cartão do topo (é o mesmo do separador «Rever o MQ»).","Define o uplift de instalação e a base de custo (todas as obras, só uma, ou um segmento).","Carrega em «Orçamentar».","Confirma as linhas preenchidas por rácio de capítulo: vêm assinaladas porque não houve correspondência de texto fiável."],"r":"O MQ com preços unitários de custo real, pronto a descarregar.","w":"Antes de lançar consultas, para saberes que preço esperar.","n":"consultas"};
  TX.importar={"s":"Um só sítio para largar qualquer ficheiro","p":"Largas o Excel e a plataforma reconhece o que é — mapa de quantidades, auto de medição, pricing sheet, proposta, resumo do orçamento, orçamento transferido, ficheiro de compras ou preços adjudicados da Legendre-PO — e leva-o para o ecrã certo.","st":["Confirma o projeto ativo na barra do topo (o ficheiro de compras não precisa).","Larga o ficheiro .xlsx/.xlsm na zona de importação.","Confirma o tipo que a plataforma sugere, ou escolhe outro em «Não é isso?».","Continua no ecrã para onde o ficheiro foi levado."],"r":"O ficheiro processado no ecrã certo, sem teres de saber onde ele entra."};
  TX.biblioteca={"s":"Capítulos, drivers de escala e regras de mapeamento","p":"Configurar como a plataforma classifica e escala os custos: a taxonomia de capítulos (driver, expoente, inflação, sensibilidade ao segmento) e todas as regras que levam um texto do Excel a um capítulo ou a uma categoria Legendre.","st":["Revê o driver e o expoente de cada capítulo — é o motor da Estimativa.","Marca os capítulos de acabamento como sensíveis ao segmento.","Quando um ficheiro usa uma designação que a plataforma não reconhece, acrescenta a regra em «Regras de mapeamento».","Grava a taxonomia."],"r":"Estimativas e leituras de ficheiros coerentes, configuradas num só sítio."};
  TX.config={"s":"Índice entre segmentos e projeto de referência","p":"Definir quanto vale cada segmento face ao médio (para converter preços quando falta histórico no segmento do projeto) e qual é o projeto de referência.","st":["Carrega em «Calcular sugestão a partir da biblioteca» para ver o que os dados indicam.","Ajusta os índices e carrega em «Gravar índices».","Escolhe o projeto de referência e carrega em «Gravar referência»."],"r":"Preços de outros segmentos convertidos de forma explícita e uma referência escolhida por ti."};
  TX.admin={"s":"Versões gravadas do orçamento e eliminação de projetos","p":"Tarefas de manutenção, separadas das restantes para evitar ações irreversíveis por engano.","st":["Escolhe o projeto em «Versões do orçamento» para ver as versões gravadas e as diferenças entre elas.","Para eliminar um projeto, escolhe-o em «Gerir / eliminar projetos», confirma as contagens e escreve o nome exato."],"r":"Uma lista de projetos limpa e o histórico de versões à mão."};
  const NAMES={"estimador":"Estimativa para o BP","analisador":"Mapa de quantidades","orcamento":"Orçamento","consultas":"Consultas ao mercado","precomq":"Orçamentar o MQ","execucao":"Adjudicações e desvios","verificar":"Autos de medição"};
  const esc=s=>String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;');
  const ic=n=>'<i class="icon-'+n+'" aria-hidden="true"></i>';
  function build(v){
    const view=document.getElementById('view-'+v); const t=TX[v]; if(!view||!t) return;
    let pu=view.querySelector('.purpose');
    if(!pu){ pu=document.createElement('div'); pu.className='purpose'; pu.innerHTML='<div class="eyebrow"></div><h1>'+(NAMES[v]||'')+'</h1>'; view.prepend(pu); }
    if(pu.dataset.howto) return; pu.dataset.howto='1';
    let tg=pu.querySelector('.toggle');
    if(!tg){ tg=document.createElement('button'); tg.className='toggle'; tg.type='button'; tg.onclick=function(){foldPurpose(this)}; pu.prepend(tg); }
    tg.innerHTML=ic('circle-help')+'Como funciona';
    let sub=pu.querySelector('.subtitle'); const h1=pu.querySelector('h1');
    if(!sub&&h1){ h1.insertAdjacentHTML('afterend','<p class="subtitle"></p>'); sub=pu.querySelector('.subtitle'); }
    if(sub) sub.textContent=t.s;
    pu.querySelectorAll('p:not(.subtitle)').forEach(p=>p.remove());
    let html='<div class="ht-lbl">Para que serve</div><p>'+esc(t.p)+'</p><div class="ht-lbl">Passos</div><ol>'+t.st.map(x=>'<li>'+esc(x)+'</li>').join('')+'</ol>';
    if(t.r) html+='<div class="ht-lbl">Resultado</div><p>'+esc(t.r)+'</p>';
    if(t.w) html+='<div class="ht-lbl">Quando usar</div><p>'+esc(t.w)+'</p>';
    const box=document.createElement('div'); box.className='howto'; box.innerHTML=html;
    (sub||h1||pu.lastChild).insertAdjacentElement('afterend',box);
    if(t.n){
      /* os separadores da área já mostram onde estás; aqui fica só o passo seguinte */
      const cy=document.createElement('div'); cy.className='cycle';
      cy.innerHTML='<button type="button" class="next" data-to="'+t.n+'">A seguir: '+esc(NAMES[t.n]||t.n)+' '+ic('arrow-right')+'</button>';
      cy.querySelectorAll('[data-to]').forEach(b=>b.onclick=()=>{ try{showView(b.dataset.to)}catch(e){} window.scrollTo(0,0); });
      box.insertAdjacentElement('beforebegin',cy);
    }
  }
  function guide(){
    const vr=document.getElementById('view-resumo'); if(!vr||vr.querySelector('.guide')) return;
    const g=document.createElement('div'); g.className='guide';
    const S=[['Importar','Largar um ficheiro','A plataforma reconhece o tipo e leva-o ao ecrã certo.','importar'],['Orçamentar','Estimativa, MQ e orçamento','Do rácio ao preço de mercado, capítulo a capítulo.','estimador'],['Obra','Adjudicações e autos','Registar o contrato e os desvios em obra.','execucao'],['Biblioteca','Rácios, kit-tipo e benchmark','O que as obras feitas ensinam à próxima.','racios']];
    g.innerHTML='<h3>Como usar a plataforma</h3><div class="g-steps">'+S.map(s=>'<div class="g-step" data-to="'+s[3]+'"><span class="g-n">'+s[0]+'</span><span class="g-t">'+s[1]+'</span><span class="g-d">'+s[2]+'</span></div>').join('')+'</div>';
    g.querySelectorAll('[data-to]').forEach(b=>b.onclick=()=>{ try{showView(b.dataset.to)}catch(e){} window.scrollTo(0,0); });
    const pu=vr.querySelector('.purpose'); if(pu) pu.insertAdjacentElement('afterend',g); else vr.prepend(g);
  }
  function all(){ Object.keys(TX).forEach(build); guide(); }
  all();
  // abrir «Como funciona» automaticamente na primeira visita a cada separador
  window.__howtoOnView=function(v){ try{ build(v); guide();
      const k='pr_howto_'+v; if(TX[v]&&!localStorage.getItem(k)){ const pu=document.querySelector('#view-'+v+' .purpose'); const tg=pu&&pu.querySelector('.toggle'); if(pu&&!pu.classList.contains('open')&&tg){ foldPurpose(tg); } localStorage.setItem(k,'1'); }
    }catch(e){} };
})();

APP_REGISTAR('11-ux','3.3.0');
