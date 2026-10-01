/* Solive · Orçamentação — 07-motor.js
   Motor partilhado: erros visíveis, utilitários, taxonomia/drivers, preços unitários, benchmarks, consultas, versões, taxonomia editável, autotestes e arranque pós-login.
   Versão: ver APP_REGISTAR no fim do ficheiro (tem de ser igual à do index.html). */

/* ==========================================================================
   v2.1 — MOTOR DE DRIVERS, PREÇOS UNITÁRIOS, CONSULTAS, VERSÕES, PONTE DPR
   ========================================================================== */

/* ---------- 0. Robustez: erros visíveis, nunca silenciosos ---------- */
function alertx(msg,ok){
  document.querySelectorAll('.banner').forEach(b=>b.remove());
  const b=document.createElement('div');
  b.className='banner'+(ok?' ok':'');
  b.innerHTML='<span class="x" onclick="this.parentNode.remove()">×</span><b>'+(ok?'Feito':'Atenção')+'</b>'+esc(msg);
  document.body.appendChild(b);
  setTimeout(()=>b.remove(), ok?5000:11000);
}
/* Envolve qualquer chamada ao Supabase: um erro passa a ser visível em vez de
   devolver silenciosamente uma lista vazia — o pior modo de falha possível
   numa ferramenta em que se confia para produzir números. */
async function sbq(promise,ctx){
  try{
    const r=await promise;
    if(r&&r.error){ console.error(ctx,r.error); alertx(ctx+": "+r.error.message); return {data:null,error:r.error}; }
    return r;
  }catch(e){ console.error(ctx,e); alertx(ctx+": "+(e.message||e)); return {data:null,error:e}; }
}
window.addEventListener('error',e=>{
  if(e.message&&!/ResizeObserver/.test(e.message)){
    console.error('[erro]',e.message,e.filename,e.lineno);
    alertx("Erro inesperado: "+e.message+"\n\nSe voltar a acontecer, comunica esta mensagem.");
  }
});
/* promessas rejeitadas sem catch: era assim que os erros nos botões desapareciam
   sem deixar rasto e a plataforma parecia simplesmente não fazer nada */
window.addEventListener('unhandledrejection',e=>{
  const m=(e.reason&&e.reason.message)||String(e.reason||'');
  if(!m)return;
  console.error('[promessa]',m);
  alertx("A ação falhou: "+m+"\n\nComunica esta mensagem para eu corrigir.");
});

/* Autosave local: uma atualização de página deixava de custar uma sessão inteira de análise. */
const LS='solive_orc_v21_';
function saveLocal(k,v){ try{ localStorage.setItem(LS+k,JSON.stringify(v)) }catch(e){} }
function readLocal(k){ try{ const s=localStorage.getItem(LS+k); return s?JSON.parse(s):null }catch(e){ return null } }
function clearLocal(k){ try{ localStorage.removeItem(LS+k) }catch(e){} }

/* ---------- 1. Utilitários partilhados ---------- */
const RE_SOMA=/^(TOTAL|SUB[\s-]?TOTAL|SOMA|PARCIAL|A\s+TRANSPORTAR|TRANSPORTE|RESUMO|TOTAIS)\b/i;
const UNIDADES_RACIO=["m²","m³","m","un","kg","ton"];
function normUn(u){
  let s=String(u||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().trim();
  s=s.replace(/[.\s]/g,"");
  if(/^(m2|m²|mq)$/.test(s))return "m²";
  if(/^(m3|m³|mc)$/.test(s))return "m³";
  if(/^(ml|m|mts?|metro?s?)$/.test(s))return "m";
  if(/^(un|und|uni|unid|pc|pcs|peca|pecas|cj|conj)$/.test(s))return "un";
  if(/^(kg|kgs|quilo)$/.test(s))return "kg";
  if(/^(ton|tn|t)$/.test(s))return "ton";
  if(/^(vg|vgl|glob)$/.test(s))return "vg";
  return s;
}
function tokenSet(s){
  const stop=new Set(["de","da","do","das","dos","em","com","para","por","e","a","o","as","os","no","na","nos","nas","ao","aos","incluindo","inclui","tipo","conforme","todos","trabalhos"]);
  /* radicalização leve: sem isto, "pavimento" e "pavimentos" contam como palavras
     diferentes e um duplicado evidente passa despercebido */
  const stem=w=>{
    let x=w.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"");
    if(x.length>4&&/oes$/.test(x)) return x.slice(0,-3)+"ao";
    if(x.length>4&&/(is|ns)$/.test(x)) return x.slice(0,-2);
    if(x.length>3&&/s$/.test(x)) return x.slice(0,-1);
    return x;
  };
  return new Set(String(s).split(/[^A-Za-zÀ-ÿ0-9]+/).filter(w=>w.length>2&&!stop.has(w.toLowerCase())).map(stem));
}
function jaccard(a,b){ let i=0; a.forEach(x=>{if(b.has(x))i++}); const u=a.size+b.size-i; return u?i/u:0 }
function med(arr){const a=arr.filter(v=>v!=null&&isFinite(v)).sort((x,y)=>x-y);const n=a.length;return n?(n%2?a[(n-1)/2]:(a[n/2-1]+a[n/2])/2):null}
function pct(arr,p){const a=arr.filter(v=>v!=null&&isFinite(v)).sort((x,y)=>x-y);if(!a.length)return null;const i=(a.length-1)*p;const lo=Math.floor(i),hi=Math.ceil(i);return lo===hi?a[lo]:a[lo]+(a[hi]-a[lo])*(i-lo)}

/* ---------- 2. Taxonomia: driver físico, expoente de escala e índice de inflação ----------
   O erro estrutural da v2.0 era escalar todos os capítulos por m² de ABC. Estaleiro cresce
   com a duração, escavação com o volume enterrado, cozinhas com o número de fogos.
   Expoente < 1 = o capítulo tem componente fixa e não duplica quando o projeto duplica. */
const DRIVER_LBL={
  abc:"ABC total (m²)", acima:"Área acima do solo (m²)", abaixo:"Área abaixo do solo (m²)",
  implantacao:"Área de implantação (m²)", escavacao:"Volume de escavação (m³)",
  fogos:"Nº de fogos", pisos:"Nº total de pisos", exterior:"Área exterior do lote (m²)",
  park:"Lugares de estacionamento", fachada:"Área de fachada (m²)"
};
const TAXO_DEFAULT={driver:"abc",exp:1,idx:"mat",racional:"Sem driver específico definido."};
const TAXO_BASE={
 "ESTALEIRO":                {driver:"abc",exp:0.70,idx:"mo", racional:"Comanda-se pela duração e pela dimensão do estaleiro, não pela área. Expoente 0,70: um projeto com o dobro da área não tem o dobro do estaleiro."},
 "ESTABILIDADE":             {driver:"abc",exp:1.00,idx:"mat",racional:"Estrutura escala com a área construída total. Pisos enterrados encarecem o m² — captado pelo driver de escavação no capítulo vizinho."},
 "MOVIMENTO DE TERRAS E CONTENÇÃO PERIFÉRICA":{driver:"escavacao",exp:0.90,idx:"mo",racional:"Comanda-se pelo volume a escavar (implantação × pisos enterrados × pé-direito), não pela área construída. Contenção periférica escala com o perímetro, daí o expoente 0,90."},
 "COBERTURAS":               {driver:"implantacao",exp:1.00,idx:"mat",racional:"A cobertura é a área de implantação, independentemente do número de pisos."},
 "IMPERMEABILIZAÇÕES E ISOLAMENTOS":{driver:"abc",exp:1.00,idx:"mat",racional:"Distribui-se entre cobertura, caves e zonas húmidas — escala com a área construída total."},
 "ALVENARIAS":               {driver:"acima",exp:1.00,idx:"mat",racional:"Paredes interiores e exteriores concentram-se nos pisos acima do solo."},
 "PEDRA":                    {driver:"acima",exp:1.00,idx:"mat",racional:"Revestimento nobre aplicado em zonas acima do solo."},
 "ETICS":                    {driver:"fachada",exp:1.00,idx:"mat",racional:"Comanda-se pela área de fachada. Na ausência do valor, estima-se por área acima do solo."},
 "ARGAMASSAS":               {driver:"acima",exp:1.00,idx:"mat",racional:"Rebocos e regularizações seguem a área acima do solo."},
 "CERÂMICOS":                {driver:"fogos",exp:1.00,idx:"mat",racional:"Cozinhas e instalações sanitárias — comanda-se pelo número de fogos, não pela área."},
 "GESSO CARTONADO":          {driver:"acima",exp:1.00,idx:"mat",racional:"Divisórias e tetos falsos dos pisos habitacionais."},
 "BETONILHAS":               {driver:"acima",exp:1.00,idx:"mat",racional:"Regularização de pavimentos dos pisos acima do solo."},
 "PAVIMENTOS DIVERSOS":      {driver:"acima",exp:1.00,idx:"mat",racional:"Pavimentos de acabamento das áreas habitacionais."},
 "PINTURAS":                 {driver:"acima",exp:1.00,idx:"mo", racional:"Mão-de-obra intensiva; escala com as superfícies dos pisos acima do solo."},
 "CANTARIAS":                {driver:"fogos",exp:1.00,idx:"mat",racional:"Soleiras, peitoris e bancadas — proporcionais ao número de fogos."},
 "SERRALHARIAS":             {driver:"abc",exp:0.95,idx:"mat",racional:"Guardas, portões e elementos comuns — parcialmente independentes da dimensão."},
 "VÃOS":                     {driver:"fachada",exp:1.00,idx:"mat",racional:"Caixilharia comanda-se pela fachada. Sem esse valor, aproxima-se pela área acima do solo."},
 "CARPINTARIAS":             {driver:"fogos",exp:1.00,idx:"mat",racional:"Portas interiores e roupeiros — contam-se por fogo."},
 "EQUIPAMENTOS SANITÁRIOS":  {driver:"fogos",exp:1.00,idx:"mat",racional:"Louças e torneiras contam-se por instalação sanitária, logo por fogo."},
 "COZINHAS":                 {driver:"fogos",exp:1.00,idx:"mat",racional:"Uma cozinha por fogo. Escalar por m² é o erro clássico."},
 "PISCINA":                  {driver:"abc",exp:0.30,idx:"mat",racional:"Equipamento singular: existe ou não existe, e o custo quase não varia com a dimensão do edifício."},
 "ELEVADORES":               {driver:"pisos",exp:0.85,idx:"mep",racional:"Comanda-se pelo número de paragens e de caixas, não pela área. Custo por paragem decresce com a altura."},
 "REDE DE ESGOTOS":          {driver:"fogos",exp:1.00,idx:"mep",racional:"Ramais e prumadas contam-se por fogo."},
 "REDE DE ÁGUAS":            {driver:"fogos",exp:1.00,idx:"mep",racional:"Ramais e equipamento por fogo."},
 "REDE DE ÁGUAS PLUVIAIS":   {driver:"implantacao",exp:1.00,idx:"mep",racional:"Drenagem pluvial comanda-se pela área de cobertura, isto é, pela implantação."},
 "REDE DE GÁS":              {driver:"fogos",exp:1.00,idx:"mep",racional:"Ramais por fogo."},
 "ELETRICIDADE E ILUMINAÇÃO":{driver:"abc",exp:1.00,idx:"mep",racional:"Distribui-se por toda a área construída, incluindo caves e comuns."},
 "SEGURANÇA INTEGRADA":      {driver:"abc",exp:0.90,idx:"mep",racional:"Centrais e equipamento comum têm componente fixa relevante."},
 "ITED":                     {driver:"fogos",exp:0.95,idx:"mep",racional:"Tomadas e ATI por fogo, com bastidor comum de custo fixo."},
 "SCIE":                     {driver:"abc",exp:0.85,idx:"mep",racional:"Central de deteção e pressurização são custos de patamar, pouco sensíveis à área."},
 "AVAC":                     {driver:"fogos",exp:1.00,idx:"mep",racional:"Unidades interiores e exteriores por fogo; ventilação de caves acompanha o programa."},
 "PAISAGISMO":               {driver:"exterior",exp:1.00,idx:"mo", racional:"Comanda-se pela área exterior livre (lote menos implantação), não pela área construída."},
 "DIVERSOS":                 {driver:"abc",exp:1.00,idx:"mat",racional:"Rubrica residual — escala com a dimensão global."}
};
let TAXO=JSON.parse(JSON.stringify(TAXO_BASE));
let REGRAS_CAP=[];   /* regras de reconhecimento acrescentadas pelo utilizador */

/* Índices de inflação diferenciados. A inflação da construção não é uniforme:
   mão-de-obra, material e MEP divergiram fortemente nos últimos anos. */
const INFL_PESO={mo:1.25, mat:1.00, mep:0.85};
function fatorInflacao(taxa,modo,idx,anos){
  if(!taxa||!anos)return 1;
  const t=(modo==='split')?taxa*(INFL_PESO[idx]||1):taxa;
  return Math.pow(1+t/100,anos);
}

/* ---------- 3. Descritores e cálculo de drivers ---------- */
const PE_DIREITO_CAVE=2.9;   /* pé-direito médio assumido para converter pisos enterrados em volume */
function descritoresDe(p){
  /* segmento incluído para agrupar preços por semelhança */
  const abc=+p.gfa||null, abaixo=+p.ac_abaixo||null;
  return {abc, acima:+p.gca||(abc&&abaixo?abc-abaixo:null), abaixo,
          implantacao:+p.area_implantacao||null, lote:+p.area_lote||null,
          fogos:+p.fogos||null, pisosA:+p.pisos_acima||null, pisosB:+p.pisos_enterrados||null,
          park:+p.estacionamento||null, segmento:p.segmento||null};
}
function descritoresRef(){
  return {abc:REF.gfa, acima:REF.gca, abaixo:REF.gfa-REF.gca, implantacao:null, lote:null,
          fogos:REF.fogos, pisosA:null, pisosB:2, park:null};
}
function estDescritores(){
  const g=id=>{const v=parseFloat((document.getElementById(id)||{}).value);return isFinite(v)&&v>0?v:null};
  const abc=g('estAbc'), abaixo=g('estAbaixo');
  return {abc, acima:g('estAcima')||(abc&&abaixo?abc-abaixo:null), abaixo,
          implantacao:g('estImpl'), lote:g('estLote'), fogos:g('estFogos'),
          pisosA:g('estPisosA'), pisosB:g('estPisosB'), park:g('estPark')};
}
function estInputs(){const o={};['estNome','estAbc','estFogos','estAcima','estAbaixo','estImpl','estLote','estPisosA','estPisosB','estPark','estBudget','estBase','estFonte','estInfl','estAno','estInflModo','estPU','estCalib','estSoft'].forEach(id=>{const e=document.getElementById(id);if(e)o[id]=e.value});return o}
function restoreEstInputs(){const o=readLocal('est');if(!o)return;Object.entries(o).forEach(([id,v])=>{const e=document.getElementById(id);if(e&&v!=="")e.value=v})}

/* Valor do driver. Cadeia de recurso explícita: se a grandeza própria não estiver
   disponível, cai para a aproximação seguinte e a tabela mostra que caiu. */
function driverValue(key,D){
  if(!D)return null;
  const acima=D.acima||(D.abc&&D.abaixo?D.abc-D.abaixo:D.abc);
  switch(key){
    case 'abc':          return D.abc;
    case 'acima':        return acima||D.abc;
    case 'abaixo':       return D.abaixo||null;
    case 'implantacao':  return D.implantacao||(D.abc&&D.pisosA?D.abc/D.pisosA:null);
    case 'escavacao':    return (D.implantacao&&D.pisosB)?D.implantacao*D.pisosB*PE_DIREITO_CAVE
                                : (D.abaixo?D.abaixo*PE_DIREITO_CAVE:null);
    case 'fogos':        return D.fogos;
    case 'pisos':        return (D.pisosA||0)+(D.pisosB||0)||null;
    case 'exterior':     return (D.lote&&D.implantacao)?Math.max(D.lote-D.implantacao,0)||null:null;
    case 'park':         return D.park;
    case 'fachada':      return D.fachada||(acima||null);   /* aproximação: sem levantamento de fachada usa-se a área acima do solo */
    default:             return D.abc;
  }
}

/* ---------- 4. Calibração pelo desvio histórico orçamento → real ----------
   O ciclo fechava-se só visualmente: o desvio era mostrado mas nunca voltava
   ao estimador. Passa a ser um fator multiplicativo por capítulo. */
let CALIB_CACHE=null;

/* ---------- 5. Biblioteca de preços unitários ----------
   O ganho de precisão maior disponível: os mapas já traziam quantidade e preço
   artigo a artigo, e o estimador ignorava tudo isso para usar €/m² de capítulo. */
const FAMILIAS=[
 [/bet[ãa]o\s*(armado|c\d|ciclo|leve)?.*(pilar|viga|laje|parede|sapata|muro|funda)/i,"Betão armado em estrutura"],
 [/\bbet[ãa]o\b(?!ilha)/i,"Betão (genérico)"],
 [/a[çc]o.*(a\s?500|nerv|arma)|armadura|varão/i,"Aço em armaduras"],
 [/cofrag/i,"Cofragem"],
 [/escava[çc]/i,"Escavação"],
 [/aterro|enchimento/i,"Aterro e enchimento"],
 [/estaca|jet\s?grout|parede moldada|micro\s?estaca|ancorag/i,"Contenção periférica"],
 [/alvenaria.*(tijolo|bloco)|parede.*tijolo/i,"Alvenaria de tijolo/bloco"],
 [/etics|capoto|isolamento.*fachada/i,"ETICS / isolamento de fachada"],
 [/impermeabiliza/i,"Impermeabilização"],
 [/isolamento.*(t[ée]rmico|xps|eps|l[ãa] de rocha|l[ãa] mineral)/i,"Isolamento térmico"],
 [/isolamento ac[úu]stico/i,"Isolamento acústico"],
 [/reboco|argamassa|estuque/i,"Reboco / argamassa"],
 [/betonilha|camada de regulariza/i,"Betonilha"],
 [/gesso cartonado|pladur|placa de gesso/i,"Gesso cartonado"],
 [/te[ct]?to falso|sanca/i,"Teto falso"],
 [/mosaico|cer[âa]mic|gr[ée]s|porcelan(?:ato|[íi]c)/i,"Revestimento cerâmico"],
 [/soalho|flutuante|v[íi]nil|lvt|parquet|madeira.*pavimento/i,"Pavimento em madeira/vinílico"],
 [/rodap[ée]/i,"Rodapé"],
 [/pintura.*(te[ct]|paredes|interior)/i,"Pintura interior"],
 [/pintura.*(exterior|fachada)/i,"Pintura exterior"],
 [/\bprimário|subcapa|barramento/i,"Preparação de pintura"],
 [/porta.*(corta.?fogo)/i,"Porta corta-fogo"],
 [/porta.*(interior|lisa|batente|correr)/i,"Porta interior"],
 [/porta.*(entrada|seguran[çc]a|blindada)/i,"Porta de entrada"],
 [/roupeiro|arm[áa]rio/i,"Roupeiro / armário"],
 [/cozinha.*(m[óo]vel|bancada|equipa)|m[óo]vel de cozinha/i,"Móvel de cozinha"],
 [/caixilh|janela|vão.*(alum[íi]nio|pvc|madeira)|envidra[çc]/i,"Caixilharia"],
 [/estore|persiana|blackout/i,"Estore / persiana"],
 [/guarda.?corpo|corrim[ãa]o|gradeamento/i,"Guarda-corpos / corrimão"],
 [/soleira|peitoril|cantaria|bancada.*(pedra|m[áa]rmore|granito|silestone)/i,"Cantaria / bancada em pedra"],
 [/sanita|bacia de retrete/i,"Sanita"],
 [/lavat[óo]rio/i,"Lavatório"],
 [/base de duche|banheira/i,"Base de duche / banheira"],
 [/torneira|misturadora/i,"Torneira / misturadora"],
 [/tubagem|tubo.*(ppr|pex|pvc|multicamada)|prumada/i,"Tubagem"],
 [/caixa de visita|caleira|ralo|sif[ãa]o/i,"Acessórios de drenagem"],
 [/cabo.*(xv|h07|rz1)|condutor el[ée]tr/i,"Cabo elétrico"],
 [/tomada|interruptor|comutador/i,"Aparelhagem elétrica"],
 [/quadro el[ée]tr|qe\b|disjuntor/i,"Quadro elétrico"],
 [/lumin[áa]ria|foco|downlight|fita led/i,"Luminária"],
 [/unidade\s+exterior|\bU\.?E\.?\s?\d|multi\s?split.*exterior/i,"Unidade exterior AVAC"],
 [/unidade\s+interior|\bU\.?I\.?\s?\d/i,"Unidade interior AVAC"],
 [/ventilador|exutor|recupera[çc][ãa]o de calor/i,"Ventilador / exutor"],
 [/registo\s+corta.?fogo|\bRCF\b|registo de desenfumagem/i,"Registo corta-fogo / desenfumagem"],
 [/unidade (interior|exterior)|multi\s?split|bomba de calor|termoac|dep[óo]sito de aqs|dep[óo]sito de in[ée]rcia/i,"Equipamento AVAC"],
 [/conduta|grelha de (insu|extra)|difusor|\bpleno\b|grelha de press/i,"Conduta / difusão AVAC"],
 [/detetor|central de dete[çc]|sprinkler|boca de inc[êe]ndio|extintor/i,"Segurança contra incêndio"],
 [/elevador|plataforma elevat/i,"Elevador"],
 [/pavimento exterior|lajeta|deck|calçada/i,"Pavimento exterior"],
 [/plantação|árvore|arbusto|relva|rega/i,"Paisagismo"]
];
function familiaArtigo(desc,un){
  const d=String(desc||"");
  if(d.length<8)return null;
  const _D=d.toUpperCase();
  if(/COZINHA/.test(_D)&&/ARM[ÁA]RIO|M[ÓO]VEL|BANCADA/.test(_D)) return "Móvel de cozinha";
  if(/BOCA DE INC[ÊE]NDIO|EXTINTOR|CARRETEL|SPRINKLER/.test(_D)) return "Segurança contra incêndio";
  if(/ESPELHO/.test(_D)) return "Espelho";
  if(/RESGUARDO/.test(_D)) return "Resguardo de duche";
  if(/ASCENSOR|MONTAGEM DE (UM )?ELEVADOR|ELEVADOR.*(PARAGEN|EMBARQUE|SMART)/.test(_D)) return "Elevador";
  if(/ROUPEIRO|MALEIRO|M[ÓO]DULO\s+ARM[ÁA]RIO|ARM[ÁA]RIO\s+(ALTO|BAIXO|SUPERIOR)/.test(_D)) return "Roupeiro / armário";
  for(const [re,fam] of FAMILIAS) if(re.test(d)) return fam;
  return null;
}
let PU_ROWS=[], PU_STATS={};
async function loadPU(){
  PU_ROWS=[]; PU_STATS={};
  if(!SESSION)return;
  const {data}=await sbq(sb.from('precos_unitarios').select('*'),"Ler preços unitários");
  if(!data)return;
  PU_ROWS=data;
  buildPUStats();
}
function segDoProjeto(nome){ const p=PROJETOS.find(x=>norm(x.nome)===norm(nome||"")); return p?p.segmento:null; }
function buildPUStats(base,segFiltro){
  const g={};
  /* segFiltro: quando ligado, só entram preços de obras do mesmo segmento que o
     projeto ativo. É o que permite basear-se em obras de natureza semelhante em
     vez da mediana transversal de tudo. */
  const segAtivo = segFiltro==='ativo' ? (CTX.D&&CTX.D.segmento) : null;
  PU_ROWS.filter(r=>{
    if(base){ const f=norm(r.fase||""); if(base==='Custo construtora' ? !f.includes('CUSTO') : f.includes('CUSTO')) return false; }
    if(segFiltro==='ativo'){ if(!segAtivo) return false; if(segDoProjeto(r.projeto)!==segAtivo) return false; }
    return true;
  }).forEach(r=>{
    const k=r.familia+"|"+normUn(r.un);
    (g[k]=g[k]||{v:[],projs:new Set()});
    g[k].v.push(+r.pu); g[k].projs.add(r.projeto);
  });
  PU_STATS={};
  Object.entries(g).forEach(([k,o])=>{
    PU_STATS[k]={n:o.v.length, mediana:med(o.v), p10:pct(o.v,0.10), p90:pct(o.v,0.90),
                 min:Math.min(...o.v), max:Math.max(...o.v), projs:[...o.projs]};
  });
}
/* Colheita: chamada ao gravar uma análise com preços ou um auto ao nível do artigo */
async function colherPU(arts,projeto,ano,fase){
  if(!SESSION)return 0;
  const linhas=[];
  arts.forEach(a=>{
    const pu=a.pu!=null&&a.pu>0?a.pu:(a.pt&&a.qt?a.pt/a.qt:null);
    if(!pu||!isFinite(pu)||pu<=0)return;
    const fam=familiaArtigo(a.desc,a.un); if(!fam)return;
    const u=normUn(a.un); if(u==="vg")return;
    linhas.push({familia:fam,un:u,pu:Math.round(pu*100)/100,projeto,ano,fase,
                 cap:a.cap||null,descricao:String(a.desc).slice(0,240)});
  });
  if(!linhas.length)return 0;
  await sbq(sb.from('precos_unitarios').delete().eq('projeto',projeto).eq('fase',fase),"Limpar preços anteriores");
  const {error}=await sbq(sb.from('precos_unitarios').insert(linhas),"Gravar preços unitários");
  if(!error){ await loadPU(); }
  return linhas.length;
}
/* Estimativa por quantidade × preço unitário, usando o MQ analisado do projeto alvo */
function estimativaPorPU(D){
  if(!ITENS.length||!Object.keys(PU_STATS).length)return null;
  const arts=ITENS.filter(x=>x.tipo==='art'&&x.qt!=null&&x.qt>0);
  if(!arts.length)return null;
  const porCap={};
  arts.forEach(a=>{
    const cap=a.cap; if(!cap)return;
    const o=porCap[cap]=porCap[cap]||{cobertos:0,total:0,valor:0,lo:0,hi:0};
    o.total++;
    const fam=familiaArtigo(a.desc,a.un); if(!fam)return;
    const st=PU_STATS[fam+"|"+normUn(a.un)]; if(!st||st.n<2)return;
    o.cobertos++;
    o.valor+=a.qt*st.mediana; o.lo+=a.qt*st.p10; o.hi+=a.qt*st.p90;
  });
  Object.values(porCap).forEach(o=>{ o.cobertura=o.total?o.cobertos/o.total:0;
    if(o.cobertura>0&&o.cobertura<1){ const esc=1/o.cobertura; o.valor*=esc; o.lo*=esc; o.hi*=esc; } });
  return {porCap};
}

/* ---------- 6. Benchmarks de quantidade a partir de toda a biblioteca ----------
   Antes: comparava-se sempre contra o L'Urbain embutido, e o teste nunca melhorava
   à medida que a biblioteca crescia. */
let BENCH={};   /* cap|un -> {vals:[q/abc], projs:[]} */
async function loadBenchmarks(){
  BENCH={};
  const addRef=(cap,u,q,abc,nome)=>{ if(!q||!abc)return; const k=cap+"|"+normUn(u);
    (BENCH[k]=BENCH[k]||{vals:[],projs:[]}); BENCH[k].vals.push(q/abc); BENCH[k].projs.push(nome); };
  Object.entries(REF.qty).forEach(([cap,us])=>Object.entries(us).forEach(([u,q])=>addRef(cap,u,q,REF.gfa,"L'Urbain")));
  if(!SESSION)return;
  for(const p of PROJETOS){
    if(!p.metricas||!p.gfa)continue;
    Object.entries(p.metricas).forEach(([k,v])=>{
      const cap=k.replace(/\s*\([^)]*\)\s*$/,"").trim();
      if(norm(p.nome).includes("URBAIN"))return;   /* já entrou pela referência */
      addRef(cap,v.un||"",v.q,p.gfa,p.nome);
    });
  }
}
function benchmark(cap,u){
  const b=BENCH[cap+"|"+normUn(u)];
  if(!b||!b.vals.length)return null;
  return {n:b.vals.length, mediana:med(b.vals), lo:Math.min(...b.vals), hi:Math.max(...b.vals),
          fonte:b.projs.join(", ")};
}

/* ---------- 7. Coerência entre capítulos ----------
   As omissões reais de medição aparecem no confronto entre capítulos, não no
   confronto de um capítulo com a história: o rácio interno é muito mais portável
   entre projetos do que o rácio absoluto face a um projeto de referência. */
const REGRAS_CRUZADAS=[
 {a:["BETONILHAS","m²"], b:["REVESTIMENTOS DE PAVIMENTOS","m²"], min:0.75, max:1.30,
  lbl:"Betonilha vs. revestimento de pavimento",
  msg:"A área de betonilha e a área de revestimento de pavimento devem ser da mesma ordem. Uma diferença grande indica omissão de medição num dos dois capítulos."},
 {a:["REVESTIMENTOS DE TECTOS","m²"], b:["REVESTIMENTOS DE PAVIMENTOS","m²"], min:0.55, max:1.25,
  lbl:"Revestimento de tetos vs. de pavimentos",
  msg:"A área de tetos aproxima-se da área de pavimentos (descontando zonas sem teto falso). Um desvio grande sugere teto falso não medido."},
 {a:["PINTURAS","m²"], b:["REVESTIMENTOS DE PAREDES","m²"], min:0.60, max:3.50,
  lbl:"Pintura vs. revestimento de paredes",
  msg:"A pintura cobre as paredes e tetos não revestidos. Um valor muito baixo indica superfícies por pintar não medidas."},
 {a:["IMPERMEABILIZAÇÕES E ISOLAMENTOS","m²"], b:["COBERTURAS","m²"], min:0.80, max:6.00,
  lbl:"Impermeabilização vs. cobertura",
  msg:"A impermeabilização cobre pelo menos a cobertura, mais caves e zonas húmidas. Menos do que a cobertura é omissão certa."},
 {a:["CANTARIAS","m"], b:["VÃOS","un"], min:0.60, max:5.00, porUnidade:true,
  lbl:"Cantarias vs. nº de vãos",
  msg:"Cada vão exige soleira e/ou peitoril. Menos de 0,6 m de cantaria por vão sugere peitoris não medidos."},
 {a:["CARPINTARIAS","un"], b:["VÃOS","un"], min:0.30, max:4.00,
  lbl:"Carpintarias vs. vãos",
  msg:"O número de portas interiores e o número de vãos exteriores mantêm uma relação estável em habitação. Verificar se faltam portas ou roupeiros."}
];
function crossChecks(agg,add){
  const val=(k)=>agg[k[0]+"|"+normUn(k[1])];
  REGRAS_CRUZADAS.forEach(r=>{
    const va=val(r.a), vb=val(r.b);
    if(!va||!vb||vb<=0)return;
    const rel=va/vb;
    if(rel>=r.min&&rel<=r.max)return;
    const dir=rel<r.min?"baixo":"alto";
    add({tipo:'art',code:"—",desc:r.lbl,un:"—",qt:null,cap:r.a[0],linha:"—"},
      "Coerência entre capítulos","aviso",
      `${r.lbl}: ${fmt(va,1)} ${r.a[1]} para ${fmt(vb,1)} ${r.b[1]} (rácio ${fmt(rel,2)}, esperado ${r.min}–${r.max}) — demasiado ${dir}.`,
      `${r.msg} Rácio medido: ${fmt(rel,2)} (esperado entre ${r.min} e ${r.max}).`);
  });
  /* verificações contra os descritores do projeto */
  const fogos=parseFloat((document.getElementById('pFogos')||{}).value);
  if(fogos>0){
    const cz=agg["COZINHAS|un"];
    if(cz!=null&&cz>0&&(cz<fogos*0.8||cz>fogos*1.5))
      add({tipo:'art',code:"—",desc:"Cozinhas vs. nº de fogos",un:"un",qt:cz,cap:"COZINHAS",linha:"—"},
        "Coerência entre capítulos","aviso",
        `${fmt(cz,0)} unidades de cozinha para ${fmt(fogos,0)} fogos.`,
        `O número de equipamentos de cozinha medidos não corresponde ao número de fogos do programa — confirmar.`);
    const sn=agg["EQUIPAMENTOS SANITÁRIOS|un"];
    if(sn!=null&&sn>0&&sn<fogos*2)
      add({tipo:'art',code:"—",desc:"Equipamentos sanitários vs. fogos",un:"un",qt:sn,cap:"EQUIPAMENTOS SANITÁRIOS",linha:"—"},
        "Coerência entre capítulos","aviso",
        `${fmt(sn,0)} equipamentos sanitários para ${fmt(fogos,0)} fogos (menos de 2 por fogo).`,
        `Contagem de louças sanitárias abaixo do mínimo plausível por fogo — verificar se falta medir uma instalação sanitária.`);
  }
  const impl=parseFloat((document.getElementById('pImplantacao')||{}).value);
  if(impl>0){
    const cob=agg["COBERTURAS|m²"];
    if(cob!=null&&cob>0&&(cob<impl*0.5||cob>impl*2.0))
      add({tipo:'art',code:"—",desc:"Cobertura vs. área de implantação",un:"m²",qt:cob,cap:"COBERTURAS",linha:"—"},
        "Coerência entre capítulos","aviso",
        `${fmt(cob,0)} m² de cobertura para ${fmt(impl,0)} m² de implantação.`,
        `A área de cobertura afasta-se significativamente da área de implantação — confirmar contra as peças desenhadas.`);
  }
}

/* ---------- 8. Soft costs ---------- */
let SOFT_ROWS=[
 {k:'proj', lbl:"Projeto e assistência técnica", pct:4.5, nota:"Arquitetura, especialidades e coordenação"},
 {k:'fisc', lbl:"Fiscalização e coordenação de segurança", pct:1.8, nota:"Equipa de obra do dono da obra"},
 {k:'lic',  lbl:"Licenças, taxas e compensações", pct:2.5, nota:"Câmara, TRIU, ligações às redes"},
 {k:'seg',  lbl:"Seguros e garantias", pct:0.8, nota:"CAR, responsabilidade civil, garantias bancárias"},
 {k:'ctg',  lbl:"Contingência de construção", pct:5.0, nota:"Imprevistos e trabalhos a mais"},
 {k:'ger',  lbl:"Estrutura e gestão do promotor", pct:2.0, nota:"Custos internos afetos ao projeto"}
];
function renderSoftCosts(hard){
  const tb=document.getElementById('tbSoft'); tb.innerHTML="";
  let tot=0;
  SOFT_ROWS.forEach((s,i)=>{
    const v=hard*s.pct/100; tot+=v;
    const tr=document.createElement('tr');
    tr.innerHTML=`<td>${esc(s.lbl)}</td>
      <td class="num"><input type="number" step="0.1" value="${s.pct}" style="text-align:right;padding:5px 7px" onchange="SOFT_ROWS[${i}].pct=parseFloat(this.value)||0;runEstimador()"></td>
      <td class="num" style="font-weight:600">${fmt(v,0)}</td><td style="color:#79726F;font-size:12px">${esc(s.nota)}</td>`;
    tb.appendChild(tr);
  });
  const tr=document.createElement('tr');
  tr.innerHTML=`<td style="font-weight:600">TOTAL SOFT COSTS</td><td class="num" style="font-weight:600">${fmt(tot/hard*100,1)}%</td><td class="num" style="font-weight:600">${fmt(tot,0)}</td><td></td>`;
  tb.appendChild(tr);
  return tot;
}

/* ---------- 9. CONSULTAS AO MERCADO E MAPA COMPARATIVO ----------
   Antes, "em consulta" e "proposta firme" eram apenas cores: não existia registo
   de a quem se consultou, quando, nem com que prazo, e as propostas não podiam
   ser comparadas lado a lado. */
let CONSULTAS=[], FORNECEDORES=[];
function cstTab(t){
  ['reg','map','hist'].forEach(x=>{
    document.getElementById('cst-pane-'+x).classList.toggle('hidden',x!==t);
    document.getElementById('cst-tab-'+x).classList.toggle('on',x===t);
  });
  if(t==='map') renderMapaComp();
  if(t==='hist') renderFornHist();
}
async function refreshConsultas(){
  const selCap=document.getElementById('cstCap');
  if(selCap&&!selCap.options.length) selCap.innerHTML=capsOrd().map(c=>`<option>${esc(c)}</option>`).join("");
  const tc=document.getElementById('taxCap');
  if(tc&&!tc.options.length) tc.innerHTML=capsOrd().map(c=>`<option>${esc(c)}</option>`).join("");
  if(SESSION){
    document.getElementById('cstProjList').innerHTML=PROJETOS.map(p=>`<option value="${esc(p.nome)}">`).join("");
    await loadConsultas();
  }
  renderConsultas();
  const mc=document.getElementById('mcProj');
  const nomes=[...new Set(CONSULTAS.map(c=>c.projeto))];
  if(mc) mc.innerHTML=nomes.map(n=>`<option>${esc(n)}</option>`).join("")||'<option value="">—</option>';
}
async function loadConsultas(){
  const {data}=await sbq(sb.from('consultas').select('*').order('data_envio',{ascending:false}),"Ler consultas");
  CONSULTAS=data||[];
  FORNECEDORES=[...new Set(CONSULTAS.map(c=>c.fornecedor))].sort();
  const dl=document.getElementById('cstFornList');
  if(dl) dl.innerHTML=FORNECEDORES.map(f=>`<option value="${esc(f)}">`).join("");
}
async function cstAbrir(){
  if(!SESSION)return alertx("Inicia sessão para registar consultas.");
  const projeto=document.getElementById('cstProj').value.trim();
  const cap=document.getElementById('cstCap').value;
  const envio=document.getElementById('cstEnvio').value||new Date().toISOString().slice(0,10);
  const prazo=document.getElementById('cstPrazo').value||null;
  const forns=document.getElementById('cstForn').value.split(/[,;]/).map(s=>s.trim()).filter(Boolean);
  if(!projeto)return alertx("Indica o projeto.");
  if(!forns.length)return alertx("Indica pelo menos um fornecedor.");
  const linhas=forns.map(f=>({projeto,cap,fornecedor:f,data_envio:envio,prazo,estado:'enviada',valor:null,data_proposta:null}));
  const {error}=await sbq(sb.from('consultas').insert(linhas),"Registar consulta");
  if(error)return;
  document.getElementById('cstForn').value="";
  await loadConsultas(); renderConsultas();
  alertx(forns.length+" consulta(s) registada(s) para "+cap+".",true);
}
function estadoConsulta(c){
  if(c.valor!=null) return {k:'recebida',lbl:'Proposta recebida',cls:'mf-ok'};
  const hoje=new Date().toISOString().slice(0,10);
  if(c.prazo&&c.prazo<hoje) return {k:'atraso',lbl:'Em atraso',cls:'mf-err'};
  return {k:'aguarda',lbl:'A aguardar',cls:'mf-warn'};
}
function renderConsultas(){
  const tb=document.getElementById('tbCst'); if(!tb)return;
  tb.innerHTML="";
  document.getElementById('cstEmpty').classList.toggle('hidden',CONSULTAS.length>0);
  let atraso=0, rec=0;
  CONSULTAS.forEach(c=>{
    const st=estadoConsulta(c);
    if(st.k==='atraso')atraso++; if(st.k==='recebida')rec++;
    const tr=document.createElement('tr');
    tr.innerHTML=`<td>${esc(c.projeto)}</td><td style="font-size:12px">${esc(c.cap)}</td><td>${esc(c.fornecedor)}</td>
      <td class="mono">${esc(c.data_envio||"—")}</td><td class="mono">${esc(c.prazo||"—")}</td>
      <td><span class="miniflag ${st.cls}"></span>${st.lbl}</td>
      <td class="num"><input type="number" value="${c.valor!=null?c.valor:''}" placeholder="—" style="text-align:right;padding:5px 7px" onchange="cstValor(${c.id},this.value)"></td>
      <td><input type="date" value="${c.data_proposta||''}" style="padding:5px 7px;font-size:12px" onchange="cstData(${c.id},this.value)"></td>
      <td><button class="btn ghost" style="padding:4px 9px;font-size:12px" onclick="cstApagar(${c.id})">✕</button></td>`;
    tb.appendChild(tr);
  });
  document.getElementById('cstTag').textContent=CONSULTAS.length+" linhas · "+rec+" com proposta"+(atraso?" · "+atraso+" em atraso":"");
}
async function cstValor(id,v){
  const val=v===""?null:parseFloat(v);
  const patch={valor:val}; if(val!=null&&!CONSULTAS.find(c=>c.id===id).data_proposta) patch.data_proposta=new Date().toISOString().slice(0,10);
  await sbq(sb.from('consultas').update(patch).eq('id',id),"Gravar proposta");
  await loadConsultas(); renderConsultas();
}
async function cstData(id,v){
  await sbq(sb.from('consultas').update({data_proposta:v||null}).eq('id',id),"Gravar data");
  await loadConsultas();
}
async function _cstApagar(id){
  await sbq(sb.from('consultas').delete().eq('id',id),"Apagar consulta");
  await loadConsultas(); renderConsultas();
}
function propostasDoProjeto(projeto){
  const caps={}, forns=new Set();
  CONSULTAS.filter(c=>c.projeto===projeto&&c.valor!=null).forEach(c=>{
    (caps[c.cap]=caps[c.cap]||{})[c.fornecedor]=c.valor; forns.add(c.fornecedor);
  });
  return {caps,forns:[...forns].sort()};
}
function renderMapaComp(){
  const proj=(document.getElementById('mcProj')||{}).value;
  const head=document.getElementById('mcHead'), body=document.getElementById('mcBody');
  if(!head)return;
  head.innerHTML=""; body.innerHTML="";
  if(!proj){document.getElementById('mcNota').textContent="Sem propostas registadas.";return}
  const {caps,forns}=propostasDoProjeto(proj);
  const capList=CAPS.filter(c=>caps[c]).concat(Object.keys(caps).filter(c=>!CAPS.includes(c)));
  if(!capList.length){document.getElementById('mcNota').textContent="Este projeto ainda não tem propostas lançadas.";return}
  const orcMap={}; ORC_ROWS.forEach(r=>orcMap[r.cap]=r.valor);
  head.innerHTML='<tr><th style="min-width:230px">Capítulo</th>'+
    forns.map(f=>`<th class="sup" style="text-align:right">${esc(f)}</th>`).join("")+
    '<th style="text-align:right">Melhor (€)</th><th style="text-align:right">Amplitude</th><th style="text-align:right">Estimativa (€)</th><th style="text-align:right">vs. estim.</th></tr>';
  let tMelhor=0, tEst=0;
  capList.forEach(cap=>{
    const linha=caps[cap], vals=forns.map(f=>linha[f]).filter(v=>v!=null);
    const mn=vals.length?Math.min(...vals):null, mx=vals.length?Math.max(...vals):null;
    const est=orcMap[cap]!=null?orcMap[cap]:null;
    if(mn!=null)tMelhor+=mn; if(est!=null)tEst+=est;
    const amp=(mn&&mx&&mn>0)?(mx-mn)/mn:null;
    const dv=(est&&mn)?(mn-est)/est:null;
    const tr=document.createElement('tr');
    tr.innerHTML=`<td style="font-size:13px">${esc(cap)}</td>`+
      forns.map(f=>{const v=linha[f];
        const cls=v==null?"":(v===mn?"best":(v===mx&&vals.length>1?"worst":""));
        return `<td class="num ${cls}">${v==null?"—":fmt(v,0)}</td>`}).join("")+
      `<td class="num" style="font-weight:600">${mn==null?"—":fmt(mn,0)}</td>
       <td class="num" style="color:${amp>0.25?'var(--err)':'#8794a8'}">${amp==null?"—":fmt(amp*100,0)+"%"}</td>
       <td class="num" style="color:#8794a8">${est==null?"—":fmt(est,0)}</td>
       <td class="num" style="color:${dv==null?'#8794a8':(dv>0.1?'var(--err)':dv<-0.1?'var(--ok)':'#8794a8')}">${dv==null?"—":(dv>0?"+":"")+fmt(dv*100,0)+"%"}</td>`;
    body.appendChild(tr);
  });
  const tr=document.createElement('tr');
  tr.innerHTML=`<td style="font-weight:600">TOTAL CONSULTADO</td>`+forns.map(()=>'<td></td>').join("")+
    `<td class="num" style="font-weight:600">${fmt(tMelhor,0)}</td><td></td>
     <td class="num" style="font-weight:600;color:#8794a8">${tEst?fmt(tEst,0):"—"}</td>
     <td class="num" style="font-weight:600">${tEst?((tMelhor-tEst)/tEst>0?"+":"")+fmt((tMelhor-tEst)/tEst*100,0)+"%":"—"}</td>`;
  body.appendChild(tr);
  const grandes=capList.filter(cap=>{const v=forns.map(f=>caps[cap][f]).filter(x=>x!=null);
    return v.length>1&&(Math.max(...v)-Math.min(...v))/Math.min(...v)>0.30});
  document.getElementById('mcNota').innerHTML=
    "Uma amplitude superior a 30% entre propostas do mesmo capítulo raramente é preço: é âmbito lido de maneira diferente. "+
    (grandes.length?("Capítulos a rever antes de adjudicar: <b>"+grandes.join(", ")+"</b>.")
                   :"Nenhum capítulo com amplitude anómala.");
}
function adotarMelhores(){
  const proj=(document.getElementById('mcProj')||{}).value;
  if(!proj)return alertx("Escolhe um projeto.");
  if(!ORC_ROWS.length)return alertx("Abre primeiro o orçamento deste projeto no separador Orçamentação.");
  const {caps}=propostasDoProjeto(proj);
  let n=0;
  Object.entries(caps).forEach(([cap,linha])=>{
    const pares=Object.entries(linha).filter(([,v])=>v!=null);
    if(!pares.length)return;
    const [forn,val]=pares.sort((a,b)=>a[1]-b[1])[0];
    const r=ORC_ROWS.find(x=>x.cap===cap);
    if(r){ r.valor=val; r.estado='firme'; r.nota=forn+" · proposta adotada "+new Date().toLocaleDateString('pt-PT'); n++; }
  });
  ORC_DIRTY=true; renderOrc();
  alertx(n+" capítulo(s) atualizados com a melhor proposta e marcados como proposta firme.",true);
  showView('orcamento');
}
function exportMapaComp(){
  const proj=(document.getElementById('mcProj')||{}).value;
  if(!proj)return alertx("Escolhe um projeto.");
  const {caps,forns}=propostasDoProjeto(proj);
  const capList=CAPS.filter(c=>caps[c]).concat(Object.keys(caps).filter(c=>!CAPS.includes(c)));
  const orcMap={}; ORC_ROWS.forEach(r=>orcMap[r.cap]=r.valor);
  const head=[["SOLIVE — MAPA COMPARATIVO DE PROPOSTAS"],["Projeto: "+proj+"   ·   Data: "+new Date().toLocaleDateString('pt-PT')],
    ["Amplitude > 30% entre propostas do mesmo capítulo indica normalmente âmbito interpretado de forma diferente, não preço."],[],
    ["Capítulo",...forns,"Melhor (€)","Amplitude %","Estimativa (€)","Desvio vs. estimativa %"]];
  const body=capList.map(cap=>{
    const vals=forns.map(f=>caps[cap][f]!=null?Math.round(caps[cap][f]):"");
    const nums=vals.filter(v=>v!=="");
    const mn=nums.length?Math.min(...nums):"", mx=nums.length?Math.max(...nums):"";
    const est=orcMap[cap]!=null?Math.round(orcMap[cap]):"";
    return [cap,...vals,mn,(mn&&mx&&mn>0)?Math.round((mx-mn)/mn*100):"",est,(est&&mn)?Math.round((mn-est)/est*100):""];
  });
  const ws=XLSX.utils.aoa_to_sheet(head.concat(body));
  ws['!cols']=[{wch:42},...forns.map(()=>({wch:15})),{wch:14},{wch:12},{wch:15},{wch:20}];
  const wb=XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb,ws,"Mapa comparativo");
  XLSX.writeFile(wb,("Mapa_Comparativo_"+proj).replace(/\s+/g,"_")+".xlsx");
}
function renderFornHist(){
  const tb=document.getElementById('tbFornHist'); if(!tb)return;
  tb.innerHTML="";
  const g={};
  CONSULTAS.filter(c=>c.valor!=null).forEach(c=>{
    const p=PROJETOS.find(x=>norm(x.nome)===norm(c.projeto));
    const abc=p&&p.gfa?p.gfa:null;
    const k=c.fornecedor+"|"+c.cap;
    (g[k]=g[k]||{forn:c.fornecedor,cap:c.cap,vals:[],rac:[],projs:new Set(),ult:null,ultD:""});
    g[k].vals.push(c.valor); if(abc)g[k].rac.push(c.valor/abc);
    g[k].projs.add(c.projeto);
    if(!g[k].ultD||(c.data_proposta||"")>g[k].ultD){g[k].ultD=c.data_proposta||"";g[k].ult=c.valor}
  });
  const rows=Object.values(g).sort((a,b)=>a.forn.localeCompare(b.forn)||a.cap.localeCompare(b.cap));
  document.getElementById('fhEmpty').classList.toggle('hidden',rows.length>0);
  rows.forEach(r=>{
    const m=r.rac.length?med(r.rac):null;
    const tr=document.createElement('tr');
    tr.innerHTML=`<td style="font-weight:500">${esc(r.forn)}</td><td style="font-size:12px">${esc(r.cap)}</td>
      <td class="num">${r.vals.length}</td><td class="num">${fmt(r.ult,0)}</td>
      <td class="num">${m==null?"—":fmt(m,1)}</td>
      <td class="num" style="color:#8794a8">${r.rac.length>1?fmt(Math.min(...r.rac),1)+" – "+fmt(Math.max(...r.rac),1):"—"}</td>
      <td style="font-size:12px;color:#79726F">${esc([...r.projs].join(", "))}</td>`;
    tb.appendChild(tr);
  });
}

/* ---------- 10. VERSÕES DO ORÇAMENTO ----------
   Antes o orçamento era um upsert sobre o nome do projeto: cada gravação apagava
   a anterior e não havia rasto por trás de um trespasse congelado. */
async function gravarVersao(nome,comentario){
  if(!SESSION)return null;
  const {data:ult}=await sbq(sb.from('orcamento_versoes').select('versao').eq('projeto_nome',nome)
    .order('versao',{ascending:false}).limit(1),"Ler versões");
  const v=(ult&&ult.length?ult[0].versao:0)+1;
  const total=ORC_ROWS.reduce((s,r)=>s+(r.valor||0),0);
  const solido=ORC_ROWS.filter(r=>ORC_EST[r.estado]&&ORC_EST[r.estado].solido).reduce((s,r)=>s+(r.valor||0),0);
  const {error}=await sbq(sb.from('orcamento_versoes').insert({
    projeto_nome:nome, versao:v, comentario:comentario||null,
    total:Math.round(total), consolidado:total?Math.round(solido/total*100):0,
    meta:ORC_META, linhas:ORC_ROWS, criado:new Date().toISOString()
  }),"Gravar versão");
  return error?null:v;
}
let VERSOES=[];
let VER_SEQ=0;
async function renderVersoes(){
  const _s=++VER_SEQ, _vivo=()=>_s===VER_SEQ;
  const sel=document.getElementById('verProj'); const box=document.getElementById('verLista');
  if(!sel||!box)return;
  await renderFasesProjeto(sel.value);
  if(!_vivo())return;
  const nome=sel.value; box.innerHTML="";
  document.getElementById('verDiffBox').classList.add('hidden');
  if(!SESSION||!nome){document.getElementById('verEmpty').classList.remove('hidden');return}
  const {data}=await sbq(sb.from('orcamento_versoes').select('*').eq('projeto_nome',nome)
    .order('versao',{ascending:false}),"Ler versões");
  VERSOES=data||[];
  document.getElementById('verEmpty').classList.toggle('hidden',VERSOES.length>0);
  VERSOES.forEach((v,i)=>{
    const d=document.createElement('div');
    d.className='vrow'+(i===0?' cur':'');
    d.innerHTML=`<span class="vn">v${v.versao}</span>
      <span class="mono" style="min-width:150px">${fmt(v.total,0)} €</span>
      <span style="min-width:110px;color:${v.consolidado>=70?'var(--ok)':v.consolidado>=40?'var(--warn)':'var(--err)'}">${v.consolidado}% consolidado</span>
      <span class="vc">${esc(v.comentario||"(sem comentário)")}</span>
      <span style="color:#8794a8;font-size:12px">${new Date(v.criado).toLocaleString('pt-PT')}</span>
      <button class="btn ghost" style="padding:4px 10px;font-size:12px" onclick="verDiff(${v.versao})">Diferenças</button>
      <button class="btn ghost" style="padding:4px 10px;font-size:12px" onclick="verRepor(${v.versao})">Repor</button>`;
    box.appendChild(d);
  });
}
/* As importações do Fecho de Obra criam fases, não versões. Ambas são histórico
   do projeto e ambas têm de ser visíveis — era isto que dava a impressão de que
   nada tinha sido gravado. */
let FAS_SEQ=0;
async function renderFasesProjeto(nome){
  const _s=++FAS_SEQ, _vivo=()=>_s===FAS_SEQ;
  const box=document.getElementById('verFases'); if(!box)return;
  box.innerHTML="";
  const p=PROJETOS.find(x=>norm(x.nome)===norm(nome||""));
  if(!SESSION||!p){ box.innerHTML='<div class="empty">Sem fases gravadas.</div>'; return; }
  const {data:fases}=await sbq(sb.from('fases').select('*').eq('projeto_id',p.id).order('data',{ascending:false}),"Ler fases");
  if(!_vivo())return;
  if(!fases||!fases.length){ box.innerHTML='<div class="empty">Sem fases gravadas para este projeto.</div>'; return; }
  const {data:caps}=await sbq(sb.from('capitulos').select('fase_id,total,adicionais'),"Ler capítulos");
  if(!_vivo())return;
  const porFase={}; (caps||[]).forEach(c=>{const o=porFase[c.fase_id]=porFase[c.fase_id]||{n:0,t:0,a:0};
    o.n++; o.t+=+c.total; o.a+=(+c.adicionais||0)});
  const cor={'Orçamento':'var(--navy)','Contrato':'var(--warn)','Real':'var(--teal)'};
  fases.forEach(f=>{
    const o=porFase[f.id]||{n:0,t:0,a:0};
    const d=document.createElement('div'); d.className='vrow';
    d.innerHTML=`<span class="vn" style="color:${cor[f.fase]||'var(--navy)'};min-width:74px">${esc(f.fase)}</span>
      <span class="mono" style="min-width:135px">${fmt(o.t,0)} €</span>
      <span style="min-width:120px;color:${o.a?'var(--warn)':'#c4ccd8'};font-size:12px">${o.a?'adic. '+fmt(o.a,0)+' €':'sem adicionais'}</span>
      <span style="min-width:78px;color:#8794a8;font-size:12px">${o.n} cap.</span>
      <span class="vc">${esc(f.etiqueta||"")}</span>
      <span style="color:#8794a8;font-size:12px;white-space:nowrap">${esc(f.data||"")}</span>`;
    box.appendChild(d);
  });
  const t=document.getElementById('verTag');
  if(t) t.textContent=fases.length+" fase(s)";
}
function verDiff(n){
  const cur=VERSOES.find(v=>v.versao===n), prev=VERSOES.find(v=>v.versao===n-1);
  if(!cur)return;
  const box=document.getElementById('verDiffBox'), tb=document.getElementById('tbVerDiff');
  box.classList.remove('hidden'); tb.innerHTML="";
  document.getElementById('verDiffTag').textContent=prev?("v"+(n-1)+" → v"+n):("v"+n+" (primeira versão)");
  const mp={}; (prev?prev.linhas:[]).forEach(r=>mp[r.cap]=r);
  const caps=[...new Set([...(prev?prev.linhas:[]).map(r=>r.cap),...cur.linhas.map(r=>r.cap)])];
  let td=0;
  caps.forEach(cap=>{
    const a=mp[cap], b=cur.linhas.find(r=>r.cap===cap);
    const va=a?a.valor||0:0, vb=b?b.valor||0:0, d=vb-va;
    if(Math.abs(d)<1)return;
    td+=d;
    const tr=document.createElement('tr');
    tr.innerHTML=`<td>${esc(cap)}</td><td class="num">${a?fmt(va,0):"—"}</td><td class="num">${b?fmt(vb,0):"—"}</td>
      <td class="num" style="font-weight:600;color:${d>0?'var(--err)':'var(--ok)'}">${d>0?"+":""}${fmt(d,0)}</td>
      <td>${b?esc((ORC_EST[b.estado]||{}).lbl||b.estado):"removido"}</td>`;
    tb.appendChild(tr);
  });
  const tr=document.createElement('tr');
  tr.innerHTML=`<td style="font-weight:600">VARIAÇÃO TOTAL</td><td></td><td></td><td class="num" style="font-weight:600;color:${td>0?'var(--err)':'var(--ok)'}">${td>0?"+":""}${fmt(td,0)}</td><td></td>`;
  tb.appendChild(tr);
}
function _verRepor(n){
  const v=VERSOES.find(x=>x.versao===n); if(!v)return;
  ORC_ROWS=JSON.parse(JSON.stringify(v.linhas)); ORC_META=v.meta||ORC_META; ORC_DIRTY=true;
  document.getElementById('orcBoard').classList.remove('hidden');
  document.getElementById('orcTag').textContent=(ORC_META.nome||"")+" · reposta a v"+n;
  renderOrc(); showView('orcamento');
  alertx("Versão v"+n+" reposta no quadro de orçamentação. Grava para criar uma nova versão.",true);
}

/* ---------- 11. TAXONOMIA EDITÁVEL ----------
   Os 33 capítulos e as ~50 expressões de reconhecimento estavam fixos no código:
   cada designação nova de um projetista obrigava a republicar a plataforma. */
async function loadTaxonomia(){
  TAXO=JSON.parse(JSON.stringify(TAXO_BASE));
  REGRAS_CAP=[];
  if(!SESSION)return;
  const {data}=await sbq(sb.from('taxonomia').select('*'),"Ler taxonomia");
  if(data&&data.length){
    data.forEach(t=>{ TAXO[t.cap]={driver:t.driver,exp:+t.expoente,idx:t.indice,racional:t.racional||""} });
    CAPS=data.slice().sort((a,b)=>(a.ordem??999)-(b.ordem??999)).map(t=>t.cap);
    /* separadores que constroem listas a partir dos capítulos têm de ser reconstruídos */
    const cc=document.getElementById('cstCap'), tc=document.getElementById('taxCap');
    if(cc) cc.innerHTML=capsOrd().map(c=>`<option>${esc(c)}</option>`).join("");
    if(tc) tc.innerHTML=capsOrd().map(c=>`<option>${esc(c)}</option>`).join("");
  }
  const {data:r}=await sbq(sb.from('taxonomia_regras').select('*').order('id'),"Ler regras de capítulo");
  if(r){ REGRAS_CAP=r; aplicarRegrasCap(); }
}
function aplicarRegrasCap(){
  /* as regras do utilizador entram à frente das regras embutidas */
  REGRAS_CAP.slice().reverse().forEach(r=>{
    try{ CAP_MAP.unshift([new RegExp(r.expressao,"i"), r.cap]); }catch(e){ console.warn("regra inválida",r); }
  });
}
function renderTaxonomia(){
  const nd=document.getElementById('novoCapDrv');
  if(nd&&!nd.options.length) nd.innerHTML=Object.entries(DRIVER_LBL).map(([k,l])=>`<option value="${k}">${esc(l)}</option>`).join("");
  const tb=document.getElementById('tbTax'); if(!tb)return;
  tb.innerHTML="";
  capsOrd().forEach(cap=>{
    const t=TAXO[cap]||TAXO_DEFAULT;
    const base=TAXO_BASE[cap]||TAXO_DEFAULT;
    const alterado=base.driver!==t.driver||base.exp!==t.exp;
    const tr=document.createElement('tr');
    tr.innerHTML=`<td style="font-size:13px;font-weight:500">${esc(cap)}</td>
      <td><select style="padding:5px 7px;font-size:12px" onchange="TAXO['${cap.replace(/'/g,"\\'")}'].driver=this.value">
        ${Object.entries(DRIVER_LBL).map(([k,l])=>`<option value="${k}" ${t.driver===k?'selected':''}>${esc(l)}</option>`).join("")}
      </select></td>
      <td class="num"><input type="number" step="0.05" min="0.1" max="1.5" value="${t.exp}" style="text-align:right;padding:5px 7px" onchange="TAXO['${cap.replace(/'/g,"\\'")}'].exp=parseFloat(this.value)||1"></td>
      <td><select style="padding:5px 7px;font-size:12px" onchange="TAXO['${cap.replace(/'/g,"\\'")}'].idx=this.value">
        <option value="mo" ${t.idx==='mo'?'selected':''}>Mão-de-obra intensiva</option>
        <option value="mat" ${t.idx==='mat'?'selected':''}>Material</option>
        <option value="mep" ${t.idx==='mep'?'selected':''}>MEP / equipamento</option>
      </select></td>
      <td style="max-width:320px"><textarea data-r="${esc(cap)}" class="taxRac" rows="2"
        style="width:100%;font-size:12px;color:#79726F;padding:5px 7px;min-height:0"
        placeholder="Porque é que este capítulo escala assim">${esc(t.racional||"")}</textarea>
        ${alterado?'<div style="font-size:12px;color:var(--warn);margin-top:3px">Driver alterado face ao standard ('+esc(DRIVER_LBL[base.driver]||base.driver)+')</div>':''}</td>
      <td>${CAPS_BASE.includes(cap)?'<span style="color:#c4ccd8;font-size:12px" title="Capítulo do standard">std</span>':`<button class="btn ghost" style="padding:3px 8px;font-size:12px" onclick="apagarCapitulo('${cap.replace(/'/g,"\\'")}')">✕</button>`}</td>`;
    tb.appendChild(tr);
  });
  tb.querySelectorAll('.taxRac').forEach(t=>t.addEventListener('input',e=>{
    const c=e.target.dataset.r; if(TAXO[c]) TAXO[c].racional=e.target.value;
  }));
  const tr2=document.getElementById('tbRegras'); if(!tr2)return;
  tr2.innerHTML="";
  REGRAS_CAP.forEach(r=>{
    const tr=document.createElement('tr');
    tr.innerHTML=`<td class="mono">${esc(r.expressao)}</td><td>${esc(r.cap)}</td>
      <td><button class="btn ghost" style="padding:3px 8px;font-size:12px" onclick="apagarRegraCap(${r.id})">✕</button></td>`;
    tr2.appendChild(tr);
  });
}
function reporTaxonomia(){
  if(!confirmar("Repor todos os drivers, expoentes e racionais nos valores do standard?\n\nPerdes as alterações que fizeste nesta tabela."))return;
  TAXO=JSON.parse(JSON.stringify(TAXO_BASE));
  renderTaxonomia();
  alertx("Taxonomia reposta no standard. Grava para confirmar na base.",true);
}
async function saveTaxonomia(){
  if(!SESSION)return alertx("Inicia sessão para gravar a taxonomia.");
  const linhas=CAPS.map((cap,i)=>{const t=TAXO[cap]||TAXO_DEFAULT;
    return {cap,ordem:i,driver:t.driver,expoente:t.exp,indice:t.idx,racional:t.racional||null}});
  const {error}=await sbq(sb.from('taxonomia').upsert(linhas,{onConflict:'cap'}),"Gravar taxonomia");
  if(!error){CALIB_CACHE=null;alertx("Taxonomia gravada. O estimador passa a usar estes drivers.",true)}
}
async function addCapitulo(){
  if(!SESSION) return alertx("Inicia sessão para acrescentar capítulos.");
  const nome=(document.getElementById('novoCapNome').value||"").trim().toUpperCase();
  if(!nome) return alertx("Escreve o nome do capítulo.");
  if(CAPS.some(c=>norm(c)===norm(nome))) return alertx("Já existe um capítulo com esse nome.");
  const drv=document.getElementById('novoCapDrv').value;
  const exp=parseFloat(document.getElementById('novoCapExp').value)||1;
  const idx=document.getElementById('novoCapIdx').value;
  const {error}=await sbq(sb.from('taxonomia').insert({cap:nome,ordem:CAPS.length,driver:drv,expoente:exp,
    indice:idx,racional:"Capítulo acrescentado manualmente."}),"Gravar capítulo");
  if(error) return;
  document.getElementById('novoCapNome').value="";
  await loadTaxonomia(); renderTaxonomia();
  alertx("Capítulo \""+nome+"\" acrescentado. Já aparece no orçamento, nas consultas e no fecho de obra.",true);
}
async function apagarCapitulo(cap){
  if(!confirmar("Apagar o capítulo \""+cap+"\"?\n\nOs valores já gravados na biblioteca com este capítulo não são apagados, mas deixa de aparecer nas listas.")) return;
  await sbq(sb.from('taxonomia').delete().eq('cap',cap),"Apagar capítulo");
  await loadTaxonomia(); renderTaxonomia();
}
async function addRegraCap(){
  if(!SESSION)return alertx("Inicia sessão para acrescentar regras.");
  const expressao=document.getElementById('taxRegex').value.trim().toUpperCase();
  const cap=document.getElementById('taxCap').value;
  if(!expressao)return alertx("Escreve a expressão a reconhecer.");
  const {error}=await sbq(sb.from('taxonomia_regras').insert({expressao,cap}),"Gravar regra");
  if(error)return;
  document.getElementById('taxRegex').value="";
  await loadTaxonomia(); renderTaxonomia();
  alertx("Regra acrescentada. Aplica-se a partir do próximo mapa analisado.",true);
}
async function _apagarRegraCap(id){
  await sbq(sb.from('taxonomia_regras').delete().eq('id',id),"Apagar regra");
  await loadTaxonomia(); renderTaxonomia();
}


/* ---------- 13. VISTAS DA BIBLIOTECA ---------- */
function toggleGloss(){ const g=document.getElementById('glossBox'); if(g) g.classList.toggle('hidden'); }
function libTab(t){
  ['tax','gerir','ver'].forEach(x=>{
    document.getElementById('lib-pane-'+x).classList.toggle('hidden',x!==t);
    document.getElementById('lib-tab-'+x).classList.toggle('on',x===t);
  });
  if(t==='ver'){ preencherProjSelect('verProj');
    const sv=document.getElementById('verProj');
    if(sv&&CTX.nome){const o=[...sv.options].find(x=>norm(x.value)===norm(CTX.nome)); if(o)sv.value=o.value}
    renderVersoes(); }
  if(t==='tax') renderTaxonomia();
  if(t==='gerir') gpRender();
}
function preencherProjSelect(id){
  const s=document.getElementById(id); if(!s)return;
  const atual=s.value;
  const nomes=[...new Set([...PROJETOS.map(p=>p.nome), ...(ORC_META.nome?[ORC_META.nome]:[])])];
  s.innerHTML=nomes.map(n=>`<option>${esc(n)}</option>`).join("")||'<option value="">—</option>';
  if(atual&&nomes.includes(atual))s.value=atual;
}


/* ---------- 14. AUTOTESTES ----------
   A lógica de leitura de mapas é o núcleo de valor da plataforma e estava validada
   uma única vez, à mão. Passa a haver um conjunto de casos que corre em ?test=1. */
const FIXTURES=[
  {nome:"Linha de soma não é artigo",
   f:()=>RE_SOMA.test("SUBTOTAL")&&RE_SOMA.test("Total do capítulo")&&RE_SOMA.test("A transportar")&&!RE_SOMA.test("Totalidade da parede")},
  {nome:"Normalização de unidades",
   f:()=>normUn("M2")==="m²"&&normUn("m³")==="m³"&&normUn("ml")==="m"&&normUn("Und.")==="un"&&normUn("m 3")==="m³"},
  {nome:"m³ entra nos rácios",
   f:()=>UNIDADES_RACIO.includes("m³")},
  {nome:"Duplicado aproximado detetado",
   f:()=>jaccard(tokenSet("Fornecimento e assentamento de mosaico cerâmico 60x60 em pavimento"),
                 tokenSet("Assentamento e fornecimento de mosaico cerâmico 60x60 em pavimentos"))>=0.82},
  {nome:"Descrições distintas não são duplicados",
   f:()=>jaccard(tokenSet("Fornecimento e montagem de porta interior lisa em MDF lacado"),
                 tokenSet("Fornecimento e aplicação de betonilha de regularização com 5 cm"))<0.5},
  {nome:"Classificação em família de artigo",
   f:()=>familiaArtigo("Betão armado C30/37 em pilares e vigas","m³")==="Betão armado em estrutura"
      && familiaArtigo("Fornecimento e aplicação de sistema ETICS com 8cm de EPS","m²")==="ETICS / isolamento de fachada"
      && familiaArtigo("xx","un")===null},
  {nome:"Driver de escavação usa implantação × pisos enterrados",
   f:()=>Math.abs(driverValue('escavacao',{implantacao:800,pisosB:2})-800*2*PE_DIREITO_CAVE)<0.01},
  {nome:"Driver cai para ABC quando falta a grandeza própria",
   f:()=>driverValue('acima',{abc:5000})===5000},
  {nome:"Área exterior = lote menos implantação",
   f:()=>driverValue('exterior',{lote:1200,implantacao:800})===400},
  {nome:"Expoente <1 modera o crescimento do estaleiro",
   f:()=>{const t=TAXO_BASE["ESTALEIRO"];return Math.pow(2,t.exp)<2&&t.exp<1}},
  {nome:"Inflação diferenciada agrava mão-de-obra face a MEP",
   f:()=>fatorInflacao(4,'split','mo',3)>fatorInflacao(4,'split','mep',3)},
  {nome:"Inflação uniforme ignora o índice",
   f:()=>fatorInflacao(4,'flat','mo',3)===fatorInflacao(4,'flat','mep',3)},
  {nome:"Mediana e percentis",
   f:()=>med([1,2,3,4])===2.5&&med([5,1,3])===3&&pct([1,2,3,4,5],0.5)===3},
  {nome:"Coerência cruzada dispara com betonilha a menos",
   f:()=>{const F=[];crossChecks({"BETONILHAS|m²":300,"REVESTIMENTOS DE PAVIMENTOS|m²":1000},
          (it,tipo,sev,msg,c)=>F.push(tipo));return F.includes("Coerência entre capítulos")}},
  {nome:"Coerência cruzada silenciosa quando as áreas batem certo",
   f:()=>{const F=[];crossChecks({"BETONILHAS|m²":980,"REVESTIMENTOS DE PAVIMENTOS|m²":1000},
          (it,tipo,sev,msg,c)=>F.push(tipo));return F.length===0}},
  {nome:"Calibração limitada a um intervalo defensável",
   f:()=>{const v=Math.min(Math.max(3.0,0.75),1.40);return v===1.40}},
  /* --- ponta a ponta: mapa sintético com erros conhecidos --- */
  {nome:"E2E · mapa limpo não gera erros",
   f:()=>{const r=runChecks(MQ_LIMPO());return r.F.filter(x=>x.sev==='erro').length===0}},
  {nome:"E2E · unidade em falta é erro",
   f:()=>{const it=MQ_LIMPO();it[1].un="";return runChecks(it).F.some(x=>x.tipo==="Unidade em falta")}},
  {nome:"E2E · quantidade negativa é erro",
   f:()=>{const it=MQ_LIMPO();it[1].qt=-5;return runChecks(it).F.some(x=>x.tipo==="Quantidade negativa")}},
  {nome:"E2E · erro aritmético qt×pu≠total é detetado",
   f:()=>{const it=MQ_LIMPO();it[1].pt=it[1].pt*1.3;return runChecks(it).F.some(x=>x.tipo==="Erro aritmético")}},
  {nome:"E2E · aritmética correta não dispara falso positivo",
   f:()=>{return runChecks(MQ_LIMPO()).F.every(x=>x.tipo!=="Erro aritmético")}},
  {nome:"E2E · quantidade fracionada em unidade contável",
   f:()=>{const it=MQ_LIMPO();it[3].qt=12.4;return runChecks(it).F.some(x=>x.tipo==="Quantidade fracionada")}},
  {nome:"Acumular ficheiros soma quantidades, não substitui",
   f:()=>{
     const prev={"Escavação":{un:"m³",q:100}};
     const novo={"Escavação":{un:"m³",q:50},"Betão e estruturas":{un:"m³",q:20}};
     Object.entries(prev).forEach(([k,v])=>{
       if(novo[k]&&uEq(novo[k].un,v.un)) novo[k].q+=v.q;
       else if(!novo[k]) novo[k]=v;
     });
     return novo["Escavação"].q===150 && novo["Betão e estruturas"].q===20}},
  {nome:"Referência embutida sai quando o projeto entra na base",
   f:()=>{const s0=SESSION, orig=PROJETOS.slice();
     SESSION={teste:true}; PROJETOS.length=0;
     const semBase=lurbainNaBase();                 /* base vazia -> semente entra */
     PROJETOS.push({nome:"L'Urbain"});
     const comBase=lurbainNaBase();                 /* projeto na base -> semente sai */
     PROJETOS.length=0; orig.forEach(p=>PROJETOS.push(p)); SESSION=s0;
     return semBase===false && comBase===true}},
  {nome:"Lista de capítulos é dinâmica, não fixa em 33",
   f:()=>{const n=CAPS.length; CAPS.push("CAPÍTULO DE TESTE");
     const ok=CAPS.length===n+1 && CAPS.includes("CAPÍTULO DE TESTE"); CAPS.pop(); return ok}},
  {nome:"Capítulo fora do standard entra no orçamento",
   f:()=>{CAPS.push("FACHADA VENTILADA");
     const linhas=capsOrd().map(cap=>({cap,valor:0,estado:"racio"}));
     const ok=linhas.some(r=>r.cap==="FACHADA VENTILADA"); CAPS.pop(); return ok}},
  {nome:"Capítulo sem driver definido cai no pressuposto por omissão",
   f:()=>{const t=TAXO["INEXISTENTE"]||TAXO_DEFAULT; return t.driver==='abc'&&t.exp===1}},
  {nome:"E2E · duplicado quase idêntico é apanhado",
   f:()=>{const it=MQ_LIMPO();
     it.push({tipo:'art',linha:99,code:"1.9",cap:"BETONILHAS",un:"m²",qt:900,pu:9.5,pt:8550,
       desc:"Aplicacao e fornecimento de betonilha de regularizacao com 5 cm de espessura em pavimentos"});
     return runChecks(it).F.some(x=>x.tipo==="Possível duplicado")}}
];
/* mapa sintético coerente: betonilha ≈ revestimento, aritmética certa, unidades certas */
function MQ_LIMPO(){
  return [
   {tipo:'art',linha:10,code:"1.1",cap:"MOVIMENTO DE TERRAS E CONTENÇÃO PERIFÉRICA",un:"m³",qt:4600,pu:18.5,pt:85100,
    desc:"Escavacao em terreno de qualquer natureza para abertura de caves, incluindo transporte a vazadouro"},
   {tipo:'art',linha:11,code:"1.2",cap:"BETONILHAS",un:"m²",qt:950,pu:9.5,pt:9025,
    desc:"Fornecimento e aplicacao de betonilha de regularizacao com 5 cm de espessura em pavimentos"},
   {tipo:'art',linha:12,code:"1.3",cap:"REVESTIMENTOS DE PAVIMENTOS",un:"m²",qt:940,pu:34,pt:31960,
    desc:"Fornecimento e assentamento de pavimento flutuante em madeira sobre betonilha regularizada"},
   {tipo:'art',linha:13,code:"1.4",cap:"CARPINTARIAS",un:"un",qt:12,pu:320,pt:3840,
    desc:"Fornecimento e montagem de porta interior lisa em MDF lacado a branco, com aro e ferragens"}
  ];
}
const BUILD=(window.APP&&APP.versao)||"?";
const FUNCIONALIDADES=[
 ["Equivalências de capítulo","normalizaCap"],
 ["Contexto de projeto único","ctxDefinir"],
 ["Capítulos extensíveis","addCapitulo"],
 ["Consultas ao mercado","cstAbrir"],
 ["Versões do orçamento","gravarVersao"],
 ["Preços unitários","colherPU"],
 ["Pricing sheet completo","analisarPricingCompleto"],
 ["Guarda de projeto errado","confereProjeto"],
 ["Troca de projeto propaga","refrescarVistaAtual"]
];
function runSelfTests(){
  console.log("BUILD: "+BUILD);
  console.table(FUNCIONALIDADES.map(([n,f])=>({funcionalidade:n,presente:typeof window[f]==='function'?"sim":"NAO"})));
  const res=FIXTURES.map(t=>{let ok=false,err=null;try{ok=!!t.f()}catch(e){err=e.message}return {nome:t.nome,ok,err}});
  const bad=res.filter(r=>!r.ok);
  console.table(res.map(r=>({teste:r.nome,resultado:r.ok?"OK":"FALHOU",erro:r.err||""})));
  const el=document.getElementById('selfTestFooter');
  const semFunc=FUNCIONALIDADES.filter(([n,f])=>typeof window[f]!=='function');
  if(el) el.innerHTML=" · <b style='color:"+(bad.length||semFunc.length?"var(--err)":"var(--teal)")+"'>Autotestes: "+
    (res.length-bad.length)+"/"+res.length+(bad.length?" — falhou: "+bad.map(b=>b.nome).join("; "):" OK")+
    " · "+(FUNCIONALIDADES.length-semFunc.length)+"/"+FUNCIONALIDADES.length+" funcionalidades"+
    (semFunc.length?" — em falta: "+semFunc.map(x=>x[0]).join(", "):"")+"</b>";
  return bad.length===0;
}

/* ---------- 15. ARRANQUE ---------- */
async function afterLogin(){
  await _afterLogin();
  await loadTaxonomia();
  await loadPU();
  await loadBenchmarks();
  await refreshConsultas();
  CALIB_CACHE=null;
}
async function saveOrcBoard(){
  await _saveOrcBoard();
  if(SESSION&&ORC_ROWS.length){
    const nome=(ORC_META.nome||document.getElementById('orcNome').value.trim()||"Projeto");
    const c=prompt("Comentário desta versão (o que mudou e porquê):","");
    if(c!==null){ const v=await gravarVersao(nome,c); if(v) alertx("Versão v"+v+" gravada no histórico.",true); }
  }
}

/* autosave dos descritores do analisador */
['pNome','pGFA','pGCA','pAbaixo','pFogos','pPisosAcima','pPisosAbaixo','pImplantacao','pLote','pEstacionamento'].forEach(id=>{
  const e=document.getElementById(id);
  if(e) e.addEventListener('input',()=>{
    const o={}; ['pNome','pGFA','pGCA','pAbaixo','pFogos','pPisosAcima','pPisosAbaixo','pImplantacao','pLote','pEstacionamento']
      .forEach(k=>{const el=document.getElementById(k);if(el)o[k]=el.value});
    saveLocal('anal',o);
  });
});
(function restaurarAnalisador(){
  const o=readLocal('anal'); if(!o)return;
  let algum=false;
  Object.entries(o).forEach(([k,v])=>{const el=document.getElementById(k);if(el&&v!==""&&!el.value){el.value=v;algum=true}});
  if(algum){
    const h=document.querySelector('#view-analisador .card .hint');
    if(h){const s=document.createElement('span');s.className='autosave';s.textContent='· descritores restaurados da sessão anterior';h.appendChild(s)}
  }
})();
restoreEstInputs();
['estAbc','estFogos','estAcima','estAbaixo','estImpl','estLote','estPisosA','estPisosB','estPark','estBudget','estNome']
  .forEach(id=>{const e=document.getElementById(id);if(e)e.addEventListener('change',()=>saveLocal('est',estInputs()))});

loadBenchmarks();
if(new URLSearchParams(location.search).get('test')==='1') runSelfTests();

APP_REGISTAR('07-motor','2.7.2');
