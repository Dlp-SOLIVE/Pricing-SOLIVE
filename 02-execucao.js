/* Solive · Orçamentação — 02-execucao.js
   Portão de execução: adjudicações e variações (Estimado → Adjudicado → Real).
   Versão: ver APP_REGISTAR no fim do ficheiro (tem de ser igual à do index.html). */

/* ================= PORTÃO DE EXECUÇÃO (Estimado -> Adjudicado -> Real) ================= */
const GX_MOTIVOS=[
  ['ALTERACAO_PROJETO','Alteração de projeto / cliente'],
  ['ERRO_OMISSAO','Erro ou omissão de medição'],
  ['PRECO_MERCADO','Preço de mercado / revisão'],
  ['QUANTIDADES','Acerto de quantidades'],
  ['CONDICOES_IMPREVISTAS','Condições imprevistas'],
  ['PRODUTIVIDADE','Produtividade / execução'],
  ['OUTRO','Outro']
];
let GX_ROWS=[]; let GX_VARS={};
const GX_MOTLBL=Object.fromEntries(GX_MOTIVOS);
function gxProjAtual(){ const s=document.getElementById('gxProj'); return s?s.value:''; }
async function gxRender(){
  const sel=document.getElementById('gxProj'); if(!sel) return;
  const nomes=PROJETOS.map(p=>p.nome);
  const atual = sel.value || (typeof CTX!=='undefined'&&CTX.nome) || (typeof ORC_META!=='undefined'&&ORC_META.nome) || nomes[0] || '';
  sel.innerHTML = nomes.length? nomes.map(n=>`<option>${esc(n)}</option>`).join("") : '<option value="">— sem projetos —</option>';
  if(nomes.includes(atual)) sel.value=atual;
  const mot=document.getElementById('gxVarMot'); if(mot) mot.innerHTML=GX_MOTIVOS.map(m=>`<option value="${m[0]}">${m[1]}</option>`).join("");
  const cl=document.getElementById('gxCapList'); if(cl && typeof CAPS!=='undefined' && CAPS.length) cl.innerHTML=CAPS.map(c=>`<option value="${esc(c)}">`).join("");
  const d=document.getElementById('gxData'); if(d && !d.value) d.value=new Date().toISOString().slice(0,10);
  await gxLoad();
}
async function gxLoad(){
  const nome=gxProjAtual(); GX_ROWS=[];
  if(nome && sb){
    const {data,error}=await sb.from('v_execucao').select('*').eq('projeto',nome).order('capitulo');
    if(!error && data) GX_ROWS=data;
    else if(error) console.warn('gxLoad',error);
  }
  GX_VARS={};
  if(GX_ROWS.length && sb){
    const ids=GX_ROWS.map(a=>a.id);
    const {data:vv}=await sb.from('variacoes').select('*').in('adjudicacao_id',ids).order('data');
    (vv||[]).forEach(v=>{ (GX_VARS[v.adjudicacao_id]=GX_VARS[v.adjudicacao_id]||[]).push(v); });
  }
  const vs=document.getElementById('gxVarAdj');
  if(vs) vs.innerHTML = GX_ROWS.length? GX_ROWS.map(a=>`<option value="${a.id}">${esc(a.capitulo)}${a.pacote?' — '+esc(a.pacote):''}${a.fornecedor?' ('+esc(a.fornecedor)+')':''}</option>`).join("") : '<option value="">— sem adjudicações —</option>';
  gxPaint();
}
function gxEUR(n){ return (n==null||isNaN(n))?'—':Number(n).toLocaleString('pt-PT',{maximumFractionDigits:0})+' €'; }
function gxPct(n){ return (n==null||isNaN(n))?'':((n>0?'+':'')+n.toFixed(1)+'%'); }
function gxPaint(){
  const tb=document.getElementById('gxBody'), ft=document.getElementById('gxFoot'), em=document.getElementById('gxEmpty');
  if(!tb) return;
  if(em) em.classList.toggle('hidden', GX_ROWS.length>0);
  let sE=0,sA=0,sR=0;
  const col=v=> v==null?'':(v>0.5?'color:var(--red)':(v<-0.5?'color:var(--teal)':''));
  tb.innerHTML = GX_ROWS.map(a=>{
    const est=Number(a.estimado)||0, adj=Number(a.adjudicado)||0, real=Number(a.real_atual)||0;
    sE+=est; sA+=adj; sR+=real;
    const dAdj = est? (adj/est-1)*100 : null;
    const dExe = adj? (real/adj-1)*100 : null;
    return `<tr>
      <td><b>${esc(a.capitulo)}</b>${a.pacote?'<br><span style="color:#888;font-size:12px">'+esc(a.pacote)+'</span>':''}</td>
      <td>${esc(a.fornecedor||'')}</td>
      <td style="text-align:right">${gxEUR(est)}</td>
      <td style="text-align:right"><b>${gxEUR(adj)}</b></td>
      <td style="text-align:right">${gxEUR(real)}</td>
      <td style="text-align:right;${col(dAdj)}">${gxPct(dAdj)}</td>
      <td style="text-align:right;${col(dExe)}">${gxPct(dExe)}</td>
      <td style="text-align:right"><button class="btn ghost" style="padding:3px 8px" onclick="gxDelAdj(${a.id})" title="Remover adjudicação">&times;</button></td>
    </tr>`+gxVarRows(a.id);
  }).join("");
  const dA = sE?((sA/sE-1)*100):null, dR=sA?((sR/sA-1)*100):null;
  ft.innerHTML = GX_ROWS.length? `<tr style="font-weight:600;border-top:2px solid var(--navy)">
    <td>TOTAL</td><td></td>
    <td style="text-align:right">${gxEUR(sE)}</td>
    <td style="text-align:right">${gxEUR(sA)}</td>
    <td style="text-align:right">${gxEUR(sR)}</td>
    <td style="text-align:right;${col(dA)}">${gxPct(dA)}</td>
    <td style="text-align:right;${col(dR)}">${gxPct(dR)}</td><td></td></tr>` : '';
}
async function gxAddAdj(){
  if(!SESSION) return alertx("Inicia sessão de gestor para registar adjudicações.");
  const nome=gxProjAtual();
  const cap=(document.getElementById('gxCap').value||'').trim();
  const adj=parseFloat(document.getElementById('gxAdj').value);
  if(!nome||!cap||isNaN(adj)) return alertx("Preenche projeto, capítulo e valor adjudicado.");
  const rec={ projeto:nome, capitulo:cap,
    pacote:(document.getElementById('gxPac').value||'').trim()||null,
    fornecedor:(document.getElementById('gxForn').value||'').trim()||null,
    estimado: parseFloat(document.getElementById('gxEst').value) || null,
    adjudicado: adj,
    data_adjudicacao: document.getElementById('gxData').value||null,
    estado:'adjudicado' };
  const r=await sbq(sb.from('adjudicacoes').insert(rec),"Registar adjudicação");
  if(r.error) return;
  ['gxCap','gxPac','gxForn','gxEst','gxAdj'].forEach(id=>{const e=document.getElementById(id); if(e)e.value='';});
  toast("Adjudicação registada.");
  await gxLoad();
}
async function gxAddVar(){
  if(!SESSION) return alertx("Inicia sessão de gestor para registar variações.");
  const adjId=document.getElementById('gxVarAdj').value;
  const val=parseFloat(document.getElementById('gxVarVal').value);
  const mot=document.getElementById('gxVarMot').value;
  if(!adjId||isNaN(val)||!mot) return alertx("Escolhe a adjudicação, o valor e o motivo.");
  const rec={ adjudicacao_id:Number(adjId), valor:val, motivo:mot,
    descricao:(document.getElementById('gxVarDesc').value||'').trim()||null,
    aprovado_por: (SESSION&&((SESSION.user&&SESSION.user.email)||SESSION.email))||null };
  const r=await sbq(sb.from('variacoes').insert(rec),"Registar variação");
  if(r.error) return;
  ['gxVarVal','gxVarDesc'].forEach(id=>{const e=document.getElementById(id); if(e)e.value='';});
  toast("Variação registada com motivo.");
  await gxLoad();
}
function gxVarRows(adjId){
  const vs=GX_VARS[adjId]||[];
  if(!vs.length) return '';
  const linhas=vs.map(v=>{
    const val=Number(v.valor)||0;
    const cor=val>0?'var(--red)':(val<0?'var(--teal)':'');
    const sinal=val>0?'+':'';
    return `<tr>
      <td style="padding:2px 6px;color:#888">${v.data||''}</td>
      <td style="padding:2px 6px">${esc(GX_MOTLBL[v.motivo]||v.motivo||'')}</td>
      <td style="padding:2px 6px;text-align:right;color:${cor}">${sinal}${gxEUR(val)}</td>
      <td style="padding:2px 6px;color:#666">${esc(v.descricao||'')}</td>
      <td style="padding:2px 6px;text-align:right"><button class="btn ghost" style="padding:1px 7px;font-size:12px" onclick="gxDelVar(${v.id})" title="Apagar variação">&times;</button></td>
    </tr>`;
  }).join("");
  return `<tr class="gxvar"><td colspan="8" style="padding:0 12px 10px 26px;background:#fafbfc;border-bottom:1px solid #eef1f5">
    <div style="font-size:12px;color:#888;margin:4px 0 2px">Variações (${vs.length}):</div>
    <table style="width:100%;font-size:12px;border-collapse:collapse"><tbody>${linhas}</tbody></table>
  </td></tr>`;
}
async function gxDelVar(id){
  if(!SESSION) return alertx("Inicia sessão para apagar variações.");
  if(!confirm("Apagar esta variação?")) return;
  const r=await sbq(sb.from('variacoes').delete().eq('id',id),"Apagar variação");
  if(r.error) return;
  await gxLoad();
}
async function gxDelAdj(id){
  if(!SESSION) return alertx("Inicia sessão para remover.");
  if(!confirm("Remover esta adjudicação e as suas variações?")) return;
  const r=await sbq(sb.from('adjudicacoes').delete().eq('id',id),"Remover adjudicação");
  if(r.error) return;
  await gxLoad();
}

APP_REGISTAR('02-execucao','2.7.1');
