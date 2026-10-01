/* Solive · Orçamentação — 99-arranque.js
   Último ficheiro a carregar. Confirma que todos os ficheiros chegaram e têm a
   mesma versão do index.html; só depois liga ao Supabase. Se faltar algum ou
   houver versões misturadas (upload incompleto ou cache), bloqueia e explica. */
(function(){
  const falta=APP.ficheiros.filter(f=>!(f in APP.carregados));
  const errada=APP.ficheiros.filter(f=>(f in APP.carregados)&&APP.carregados[f]!==APP.versao);
  const v=document.getElementById('appVersao'); if(v) v.textContent='v'+APP.versao+' · '+APP.data;
  if(falta.length||errada.length){
    const d=document.createElement('div');
    d.style.cssText='position:fixed;inset:0;z-index:9999;background:rgba(20,58,103,.92);display:flex;align-items:center;justify-content:center;padding:20px';
    d.innerHTML='<div style="background:#fff;max-width:620px;border-radius:12px;padding:24px 28px;font:14px/1.5 Inter,Arial,sans-serif;color:#201C1D">'
      +'<h3 style="margin:0 0 10px;color:#E62336">A plataforma não arrancou: versão incompleta</h3>'
      +'<p style="margin:0 0 10px">Esperada a versão <b>'+APP.versao+'</b> em todos os ficheiros.</p>'
      +(falta.length?'<p style="margin:0 0 6px"><b>Em falta ou com erro ao carregar:</b> '+falta.map(f=>f+'.js').join(', ')+'</p>':'')
      +(errada.length?'<p style="margin:0 0 6px"><b>Versão diferente:</b> '+errada.map(f=>f+'.js (v'+APP.carregados[f]+')').join(', ')+'</p>':'')
      +'<ol style="margin:12px 0 0;padding-left:20px"><li>Recarrega com <b>Ctrl+Shift+R</b>.</li><li>Se continuar, volta a carregar no GitHub <b>todos</b> os ficheiros da mesma entrega (index.html, app.css e os .js).</li></ol></div>';
    document.body.appendChild(d);
    console.error('Versão incompleta',{falta,errada,carregados:APP.carregados});
    return;
  }
  initSupa();
})();
