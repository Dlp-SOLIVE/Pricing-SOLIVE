/* Solive · Orçamentação — 01-base.js
   Configuração Supabase, referência L'Urbain embutida, capítulos, estado global e navegação (showView).
   Versão: ver APP_REGISTAR no fim do ficheiro (tem de ser igual à do index.html). */

/* ================= CONFIGURAÇÃO SUPABASE =================
   Preencher após criar o projeto em supabase.com e correr o supabase_setup.sql */
const SUPA = { url: "https://jzkyrsiylrpkgewuuexb.supabase.co", key: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp6a3lyc2l5bHJwa2dld3V1ZXhiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ1Mjk2MjcsImV4cCI6MjEwMDEwNTYyN30.R4oHPXsicqS37hNjjdgWTVgsmU31hzT0VoNj4IYeLfY" };

/* ================= REFERÊNCIA L'URBAIN (embutida) ================= */
const REF = {
 projeto:"L'Urbain", gfa:4552, gca:2882.6, fogos:30,
 capitulos:[
  {cap:"ESTALEIRO",total:1019750.12,r:[0,0,1019750.12]},
  {cap:"ESTABILIDADE",total:765409.09,r:[523025.72,144389.71,97993.66]},
  {cap:"MOVIMENTO DE TERRAS E CONTENÇÃO PERIFÉRICA",total:383331.08,r:[348944.63,27460.44,6926]},
  {cap:"COBERTURAS",total:18991.98,r:[0,0,18991.98]},
  {cap:"IMPERMEABILIZAÇÕES E ISOLAMENTOS",total:66377.63,r:[30520.66,26388,9468.97]},
  {cap:"ALVENARIAS",total:63302.91,r:[0,63302.91,0]},
  {cap:"PEDRA",total:0,r:[0,0,0]},
  {cap:"ETICS",total:77773.88,r:[64907.19,0,12866.69]},
  {cap:"ARGAMASSAS",total:62156.95,r:[0,62156.95,0]},
  {cap:"CERÂMICOS",total:71892.68,r:[27558.21,44334.47,0]},
  {cap:"GESSO CARTONADO",total:307166.54,r:[302166.54,0,5000]},
  {cap:"BETONILHAS",total:42116.8,r:[38023.71,0,4093.09]},
  {cap:"PAVIMENTOS DIVERSOS",total:61155.47,r:[51283.3,6494.39,3377.78]},
  {cap:"PINTURAS",total:80601.23,r:[76501.23,0,4100]},
  {cap:"CANTARIAS",total:10803.69,r:[0,10803.69,0]},
  {cap:"SERRALHARIAS",total:127830.6,r:[0,0,127830.6]},
  {cap:"VÃOS",total:261788.2,r:[145223.37,111564.83,5000]},
  {cap:"CARPINTARIAS",total:193368.21,r:[2987.32,190140.89,240]},
  {cap:"EQUIPAMENTOS SANITÁRIOS",total:116884.3,r:[0,30553.4,86330.9]},
  {cap:"COZINHAS",total:306736.15,r:[306736.15,0,0]},
  {cap:"PISCINA",total:0,r:[0,0,0]},
  {cap:"ELEVADORES",total:71400,r:[70800,0,600]},
  {cap:"REDE DE ESGOTOS",total:134285.51,r:[98798.94,0,35486.56]},
  {cap:"REDE DE ÁGUAS",total:102870.73,r:[92750.28,0,10120.45]},
  {cap:"REDE DE ÁGUAS PLUVIAIS",total:0,r:[0,0,0]},
  {cap:"REDE DE GÁS",total:0,r:[0,0,0]},
  {cap:"ELETRICIDADE E ILUMINAÇÃO",total:337555,r:[0,0,337555]},
  {cap:"SEGURANÇA INTEGRADA",total:36886.4,r:[0,0,36886.4]},
  {cap:"ITED",total:53535.3,r:[0,0,53535.3]},
  {cap:"SCIE",total:14650,r:[0,0,14650]},
  {cap:"AVAC",total:605381.83,r:[602791.83,0,2590]},
  {cap:"PAISAGISMO",total:54919.38,r:[29060.78,0,25858.6]},
  {cap:"DIVERSOS",total:53173.54,r:[10664,37979.54,4530]}
 ],
 qty:{
  "CANTARIAS":{"m":317.14},"CARPINTARIAS":{"un":138},"COBERTURAS":{"m":124.86,"m²":317.17},
  "DIVERSOS":{"m":59.86,"m²":282.84,"un":590},"EQUIPAMENTOS SANITÁRIOS":{"un":643},
  "IMPERMEABILIZAÇÕES E ISOLAMENTOS":{"m":103.96,"m²":4670.56},"PAREDES":{"m":221.16,"m²":6927.38},
  "PINTURAS":{"m":87.1,"m²":10684.5,"un":353},"REVESTIMENTOS DE PAREDES":{"m":630.5,"m²":5534.35},
  "REVESTIMENTOS DE PAVIMENTOS":{"m":2583.4,"m²":6828.22},"REVESTIMENTOS DE TECTOS":{"m²":2950.32},
  "SERRALHARIAS":{"m":538.12,"un":13},"VÃOS":{"un":325}
 }
};
/* Lista de capítulos. Arranca nos 33 do standard português mas é substituída
   pela taxonomia gravada assim que há sessão — pode ter mais ou menos entradas. */
let CAPS = REF.capitulos.map(c=>c.cap);
/* Ordem alfabética em todas as listas e tabelas. Usa colação portuguesa para
   que ÁGUAS, CERÂMICOS e VÃOS fiquem no sítio certo. */
function capsOrd(){ return CAPS.slice().sort((a,b)=>a.localeCompare(b,'pt')) }
const CAPS_BASE = REF.capitulos.map(c=>c.cap);
const CAPS_ESPERADOS = ["COBERTURAS","IMPERMEABILIZAÇÕES E ISOLAMENTOS","PAREDES","REVESTIMENTOS DE PAREDES","REVESTIMENTOS DE PAVIMENTOS","REVESTIMENTOS DE TECTOS","PINTURAS","CANTARIAS","SERRALHARIAS","VÃOS","CARPINTARIAS","EQUIPAMENTOS SANITÁRIOS","COZINHAS","DIVERSOS"];

const CAP_MAP = [
 [/ESTALEIRO/,"ESTALEIRO"],
 [/HIDR[ÁA]ULICAS|INSTALA[ÇC][ÕO]ES HIDR/,"REDE DE ÁGUAS"],
 [/INSTALA[ÇC][ÕO]ES EL[ÉE][CT]TRICAS/,"ELETRICIDADE E ILUMINAÇÃO"],
 [/INSTALA[ÇC][ÕO]ES MEC[ÂA]NICAS/,"AVAC"],
 [/INSTALA[ÇC][ÕO]ES ELECTROMEC[ÂA]NICAS/,"ELEVADORES"],
 [/EQUIPAMENTO MEC[ÂA]NICO|ELEVADOR|PLATAFORMA ELEVAT/,"ELEVADORES"],
 [/BET[ÃA]O LEVE|BETONILHA/,"BETONILHAS"],
 [/ACABAMENTO DE SUPERF[ÍI]CIES/,"ARGAMASSAS"],
 [/REVESTIMENTO EM ARGAMASSA/,"ARGAMASSAS"],
 [/REVESTIMENTOS? (EM|DE) TE[CT]?TOS/,"REVESTIMENTOS DE TECTOS"],
 [/REVESTIMENTOS? CER[ÂA]MICOS/,"CERÂMICOS"],
 [/RODAP[ÉE]S/,"REVESTIMENTOS DE PAVIMENTOS"],
 [/BANCADAS/,"CANTARIAS"],
 [/EQUIPAMENTO COZINHA|COZINHA\/|COPAS/,"COZINHAS"],
 [/EQUIPAMENTO SANIT[ÁA]RIO/,"EQUIPAMENTOS SANITÁRIOS"],
 [/COBERTURAS E FACHADAS/,"COBERTURAS"],[/ESTABILIDADE|\bESTRUTURAS?\b|BET[ÃA]O ARMADO/,"ESTABILIDADE"],
 [/MOVIMENTO DE TERRAS|CONTEN[ÇC][ÃA]O|ESCAVA/,"MOVIMENTO DE TERRAS E CONTENÇÃO PERIFÉRICA"],
 [/COBERTURA/,"COBERTURAS"],[/IMPERMEABILIZA|ISOLAMENTO/,"IMPERMEABILIZAÇÕES E ISOLAMENTOS"],
 [/ALVENARIA/,"ALVENARIAS"],[/REVESTIMENTOS? DE PAREDES/,"REVESTIMENTOS DE PAREDES"],[/^PAREDES/,"PAREDES"],[/PEDRA/,"PEDRA"],[/ETICS|CAPOTO/,"ETICS"],
 [/ARGAMASSA|REBOCO/,"ARGAMASSAS"],[/CER[ÂA]MICO/,"CERÂMICOS"],[/GESSO CARTONADO|PLADUR/,"GESSO CARTONADO"],
 [/BETONILHA/,"BETONILHAS"],[/PAVIMENTOS DIVERSOS/,"PAVIMENTOS DIVERSOS"],
 [/REVESTIMENTOS? DE PAVIMENTOS|REVESTIMENTO EM PAVIMENTOS/,"REVESTIMENTOS DE PAVIMENTOS"],
 [/REVESTIMENTOS? DE TE[CT]?TOS/,"REVESTIMENTOS DE TECTOS"],
 [/PINTURA/,"PINTURAS"],[/CANTARIA/,"CANTARIAS"],[/SERRALHARIA/,"SERRALHARIAS"],
 [/V[ÃA]OS|CAIXILHARIA/,"VÃOS"],[/CARPINTARIA/,"CARPINTARIAS"],
 [/SANIT[ÁA]RIO/,"EQUIPAMENTOS SANITÁRIOS"],[/COZINHA/,"COZINHAS"],[/PISCINA/,"PISCINA"],
 [/ELEVADOR/,"ELEVADORES"],[/ESGOTO/,"REDE DE ESGOTOS"],[/PLUVIA/,"REDE DE ÁGUAS PLUVIAIS"],
 [/REDE DE [ÁA]GUAS|ABASTECIMENTO DE [ÁA]GUA/,"REDE DE ÁGUAS"],[/REDE DE G[ÁA]S|\bG[ÁA]S\b/,"REDE DE GÁS"],
 [/ELE[CT]TRICIDADE|ILUMINA/,"ELETRICIDADE E ILUMINAÇÃO"],[/SEGURAN[ÇC]A/,"SEGURANÇA INTEGRADA"],
 [/ITED|TELECOM/,"ITED"],[/SCIE|INC[ÊE]NDIO/,"SCIE"],[/AVAC|CLIMATIZA|VENTILA/,"AVAC"],
 [/PAISAGISMO|ARRANJOS EXTERIORES/,"PAISAGISMO"],[/DIVERSOS/,"DIVERSOS"]
];

const UNIT_RULES = [
 {re:/impermeabiliza[çc][ãa]o|pintura de paredes|pintura de te[ct]|reboco|betonilha|gesso cartonado|assentamento de mosaico|revestimento cer[âa]mico|isolamento t[ée]rmico|lajeta|lajes? flutuante/i, skip:/pontos|zonas singulares|caleira|rufo|remate|refor[çc]o|sanca|moldura|vedaç|divis[óo]ria/i, esperado:["m²","m2"], msg:"trabalho medido em área"},
 {re:/\brufo|rodap[ée]|caleira|perfil met|calha|tubo de queda|junta de dilata|remate linear|corrim[ãa]o/i, esperado:["m","ml"], msg:"trabalho de natureza linear"},
 {re:/\bporta\b|\bjanela\b|caixilho|arm[áa]rio|bancada|louça|sanita|lavat[óo]rio|banheira|base de duche|luminária|equipamento|aparelho|exaustor|forno|frigor[íi]fico|placa de indu/i, esperado:["un","und","uni","vg","cj"], msg:"elemento contável"}
];

/* ================= ESTADO ================= */
let workbook=null, wbName="", chosenSheet=null;
let ITENS=[], FINDINGS=[], RATIOS=[];
let MANUAL_H=null, MAPPINGS=[];
let sb=null, SESSION=null;
let PROJETOS=[];

const online=()=>!!(SUPA.url&&SUPA.key);
function toast(msg){ alertx(msg,true) }   /* um só canal de feedback: o banner */

/* ================= NAVEGAÇÃO ================= */
function showView(v){
  ['resumo','analisador','estimador','orcamento','consultas','verificar','racios','precomq','comparar','biblioteca','execucao','admin'].forEach(x=>{
    const ve=document.getElementById('view-'+x); if(ve) ve.classList.toggle('hidden', v!==x);
    const nb=document.getElementById('nav-'+x); if(nb) nb.classList.toggle('on', v===x);
  });
  try{ window.scrollTo(0,0); }catch(e){}
  if(v==='resumo'){ try{ uxRenderResumo(); }catch(e){ console.warn(e); } }
  if(v==='biblioteca'){ try{ renderTaxonomia(); }catch(e){} }
  if(v==='consultas') refreshConsultas();
  if(v==='comparar') renderComparar();
  if(v==='estimador') document.getElementById('estAno').value=document.getElementById('estAno').value||new Date().getFullYear();
  if(v==='orcamento') refreshOrcamento();
  if(v==='execucao') gxRender();
  /* o que antes eram 6 embrulhos sucessivos, agora em sequência explícita */
  try{ if(typeof ctxRender==='function') ctxRender(); }catch(e){}
  if(v==='precomq'){ try{ vfMQFillProjects(); }catch(e){} }
  if(v==='comparar'){ try{ vfDvFillProjects(); }catch(e){} }
  try{ if(typeof ctxSeguirSeletores==='function') ctxSeguirSeletores(v); }catch(e){}
  try{ if(typeof window.__howtoOnView==='function') window.__howtoOnView(v); }catch(e){}
}

APP_REGISTAR('01-base','2.6.1');
