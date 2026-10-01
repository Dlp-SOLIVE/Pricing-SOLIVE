/* Solive · Orçamentação — 10-ajuda.js
   Botão de ajuda contextual.
   Versão: ver APP_REGISTAR no fim do ficheiro (tem de ser igual à do index.html). */

const AJUDA_AREAS=[['estimar','Estimar'],['orcamentar','Orçamentar'],['consultas','Consultas'],['execucao','Execução'],['custoreal','Custo Real'],['biblioteca','Biblioteca'],['geral','Cuidados']];
const AJUDA_VIEW2AREA={estimador:'estimar',analisador:'orcamentar',precomq:'orcamentar',orcamento:'orcamentar',consultas:'consultas',execucao:'execucao',verificar:'custoreal',racios:'custoreal',comparar:'custoreal',biblioteca:'biblioteca'};
function ajudaVistaAtiva(){
  for(const v in AJUDA_VIEW2AREA){ const el=document.getElementById('view-'+v); if(el && !el.classList.contains('hidden')) return AJUDA_VIEW2AREA[v]; }
  return 'geral';
}
function ajudaMostrar(area){
  document.querySelectorAll('#ajudaBody .ajuda-sec').forEach(s=>{ s.style.display = (s.getAttribute('data-area')===area)?'block':'none'; });
  document.querySelectorAll('#ajudaTabs button').forEach(b=>{ const on=b.getAttribute('data-a')===area; b.style.background=on?'var(--navy)':'#eef1f5'; b.style.color=on?'#fff':'var(--navy)'; });
}
function ajudaBuildTabs(){
  const bar=document.getElementById('ajudaTabs'); if(!bar||bar.childElementCount) return;
  bar.innerHTML=AJUDA_AREAS.map(a=>`<button data-a="${a[0]}" onclick="ajudaMostrar('${a[0]}')" style="border:none;border-radius:6px;padding:6px 11px;font-size:12px;font-weight:600;cursor:pointer;background:#eef1f5;color:var(--navy)">${a[1]}</button>`).join("");
}
function abrirAjuda(){ const o=document.getElementById('ajudaOverlay'); if(!o)return; ajudaBuildTabs(); ajudaMostrar(ajudaVistaAtiva()); o.classList.remove('hidden'); }
function fecharAjuda(){ const o=document.getElementById('ajudaOverlay'); if(o) o.classList.add('hidden'); }
document.addEventListener('keydown',function(e){ if(e.key==='Escape') fecharAjuda(); });

APP_REGISTAR('10-ajuda','2.7.2');
