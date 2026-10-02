/* Solive · Orçamentação — 03-auth-projetos.js
   Autenticação, carregamento de projetos e eliminação de projetos.
   Versão: ver APP_REGISTAR no fim do ficheiro (tem de ser igual à do index.html). */

/* ================= AUTENTICAÇÃO ================= */
async function initSupa(){
  const badge=document.getElementById('connBadge');
  if(!online()){
    badge.textContent="Modo local";
    document.getElementById('btnGravarAnalise').classList.add('hidden');
    return;
  }
  sb=window.supabase.createClient(SUPA.url,SUPA.key);
  const {data}=await sb.auth.getSession();
  SESSION=data.session;
  if(!SESSION){document.getElementById('loginOverlay').classList.remove('hidden');}
  else afterLogin();
}
async function doLogin(){
  const email=document.getElementById('loginEmail').value.trim();
  const pass=document.getElementById('loginPass').value;
  const err=document.getElementById('loginErr'); err.textContent="";
  const {data,error}=await sb.auth.signInWithPassword({email,password:pass});
  if(error){err.textContent="Credenciais inválidas. Verifica o email e a palavra-passe.";return}
  SESSION=data.session;
  document.getElementById('loginOverlay').classList.add('hidden');
  afterLogin();
}
async function logout(){await sb.auth.signOut();location.reload()}
async function _afterLogin(){
  const badge=document.getElementById('connBadge');
  badge.textContent="Ligado · "+(SESSION.user.email||"");
  badge.classList.add('on');
  document.getElementById('btnLogout').classList.remove('hidden');
  document.getElementById('btnGravarAnalise').classList.remove('hidden');
  await loadProjetos(); await loadMappings();
}
async function _loadProjetos(){
  const {data,error}=await sb.from('projetos').select('*').order('nome');
  if(error){console.error(error);return}
  PROJETOS=data||[];
  const opts=PROJETOS.map(p=>`<option value="${esc(p.nome)}">`).join("");
  ['projList','orcProjList','cstProjList','ctxList','foProjList'].forEach(id=>{
    const el=document.getElementById(id); if(el) el.innerHTML=opts;   // nunca rebentar se faltar um
  });
}
/* ================= GERIR / ELIMINAR PROJETOS ================= */
function gpRender(){
  const sel=document.getElementById('gpProj'); if(!sel)return;
  sel.innerHTML = PROJETOS.length
    ? PROJETOS.map(p=>`<option value="${esc(p.nome)}">${esc(p.nome)}</option>`).join("")
    : '<option value="">— sem projetos —</option>';
  const ci=document.getElementById('gpConfirm'); if(ci) ci.value="";
  gpConfirmCheck();
  gpPreview();
}
async function gpCount(tbl,col,val){
  const {count,error}=await sb.from(tbl).select('*',{count:'exact',head:true}).eq(col,val);
  return error?'?':(count||0);
}
/* Tabelas que ligam ao projeto pelo nome da obra em texto (projeto_ref / projeto).
   O nome vem do cabeçalho do ficheiro e pode variar em acentos e espaços, por isso
   compara-se normalizado. Devolve os ids de custo_import e os valores de texto exatos. */
/* Desde a Fase 1 todas as tabelas ligam ao projeto por projeto_id: conta-se por aí. */
async function gpLigacoes(projId){
  const n=async(t)=>{ const {count,error}=await sb.from(t).select('*',{count:'exact',head:true}).eq('projeto_id',projId); return error?'?':(count||0); };
  const out={imp:await n('custo_import'), prod:await n('orcamento_producao'), leg:await n('orcamento_legendre'), adj:await n('adjudicacoes'), lin:0};
  try{ const {data}=await sb.from('custo_import').select('id').eq('projeto_id',projId);
    const ids=(data||[]).map(r=>r.id);
    if(ids.length){ const {count}=await sb.from('custo_linha').select('*',{count:'exact',head:true}).in('import_id',ids); out.lin=count||0; } }catch(e){}
  return out;
}
async function gpPreview(){
  const box=document.getElementById('gpCounts'); if(!box)return;
  const nome=document.getElementById('gpProj').value;
  const proj=PROJETOS.find(p=>p.nome===nome);
  const eco=document.getElementById('gpNomeEco'); if(eco) eco.textContent=nome||"—";
  gpConfirmCheck();
  if(!proj){ box.textContent="Escolhe um projeto para ver o que será eliminado."; return; }
  box.textContent="A contar…";
  const {data:fs}=await sb.from('fases').select('id').eq('projeto_id',proj.id);
  const faseIds=(fs||[]).map(f=>f.id);
  let nCap=0;
  if(faseIds.length){ const {count}=await sb.from('capitulos').select('*',{count:'exact',head:true}).in('fase_id',faseIds); nCap=count||0; }
  const nFase=faseIds.length;
  const nAnal=await gpCount('analises','projeto_id',proj.id);
  const nPU=await gpCount('precos_unitarios','projeto_id',proj.id);
  const nCons=await gpCount('consultas','projeto_id',proj.id);
  const nVer=await gpCount('orcamento_versoes','projeto_id',proj.id);
  const nOrc=await gpCount('orcamentos','projeto_id',proj.id);
  const nReais=await gpCount('precos_reais','projeto_id',proj.id);
  const L=await gpLigacoes(proj.id);
  box.innerHTML = `Vai eliminar: <b>${nAnal}</b> análises &middot; <b>${nFase}</b> fases &middot; <b>${nCap}</b> capítulos &middot; <b>${nPU}</b> preços unitários &middot; <b>${nCons}</b> consultas &middot; <b>${nVer}</b> versões &middot; <b>${nOrc}</b> orçamento &middot; <b>${L.imp}</b> autos verificados (<b>${L.lin}</b> linhas de custo) &middot; <b>${L.prod+L.leg}</b> linha(s) de orçamento transferido &middot; <b>${L.adj}</b> adjudicações (e as suas variações) &middot; e o próprio projeto.<br>Biblioteca de custos reais deste projeto: <b>${nReais}</b> linha(s) &mdash; só apagadas se marcares a opção acima.`;
}
function gpConfirmCheck(){
  const nome=(document.getElementById('gpProj')||{}).value||"";
  const typed=(document.getElementById('gpConfirm')||{}).value||"";
  const btn=document.getElementById('gpDelBtn'); if(!btn)return;
  const ok = !!nome && typed===nome;
  btn.style.opacity = ok?'1':'.45';
  btn.style.pointerEvents = ok?'auto':'none';
}
function gpFail(btn){ if(btn) btn.textContent="Eliminar definitivamente"; gpConfirmCheck(); }
async function gpDelete(){
  if(!SESSION) return alertx("Inicia sessão de gestor para eliminar projetos.");
  const nome=document.getElementById('gpProj').value;
  const proj=PROJETOS.find(p=>p.nome===nome);
  if(!proj) return alertx("Projeto não encontrado.");
  if(document.getElementById('gpConfirm').value!==nome) return alertx("O nome de confirmação não coincide.");
  if(!confirm('Eliminar definitivamente o projeto "'+nome+'" e todos os seus dados? Esta ação é irreversível.')) return;
  const btn=document.getElementById('gpDelBtn'); btn.style.pointerEvents='none'; btn.textContent="A eliminar…";
  let r;
  /* A biblioteca curada de custos reais só sai se pedido; na base fica sem projeto (SET NULL) */
  if(document.getElementById('gpIncReais').checked){
    r=await sbq(sb.from('precos_compostos').delete().eq('projeto_id',proj.id),"Apagar preços compostos"); if(r.error)return gpFail(btn);
    r=await sbq(sb.from('precos_reais').delete().eq('projeto_id',proj.id),"Apagar custos reais"); if(r.error)return gpFail(btn);
  }
  /* Tudo o resto (fases, capítulos, análises, preços unitários, consultas, versões, orçamento,
     autos e linhas de custo, orçamento transferido, adjudicações e variações) sai em cascata na base */
  r=await sbq(sb.from('projetos').delete().eq('id',proj.id),"Apagar projeto"); if(r.error)return gpFail(btn);
  btn.textContent="Eliminar definitivamente";
  alertx('Projeto "'+nome+'" eliminado.',true);
  invalidarSnapshot();
  await loadProjetos();
  gpRender();
}

async function loadMappings(){
  const {data}=await sb.from('mapeamentos').select('*');
  MAPPINGS=data||[];
}

APP_REGISTAR('03-auth-projetos','3.1.0');
