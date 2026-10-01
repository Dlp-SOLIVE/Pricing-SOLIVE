/* Solive · Orçamentação — estilos. Versão 2.6.0 */
*{box-sizing:border-box;margin:0;padding:0}
body{background:var(--bg);color:var(--ink);line-height:1.45}
header{display:flex}
header .brand{font-weight:700}
header .brand span{color:var(--red)}
header .sub{padding-left:18px}
.badge{font-size:12px;font-weight:500;padding:4px 10px;border-radius:12px;background:rgba(255,255,255,.15);letter-spacing:.3px}
.badge.on{background:var(--teal)}
nav{margin-left:auto;display:flex}
nav button{background:none;border:none;font:inherit;cursor:pointer}
nav button.on{opacity:1}
main{margin:0 auto;padding:26px 28px 80px}
.card{background:var(--card);border:1px solid var(--line);padding:20px 22px;margin-bottom:18px}
.card h2{font-weight:700;margin-bottom:4px;text-transform:uppercase;letter-spacing:.5px}
.card .hint{color:#79726F;font-size:13px;margin-bottom:14px}
.grid{display:grid;gap:14px}
.g6{grid-template-columns:repeat(6,1fr)}
label{display:block;font-size:12px;font-weight:500;color:#79726F;text-transform:uppercase;letter-spacing:.4px;margin-bottom:5px}
input[type=text],input[type=number],input[type=password],input[type=email],input[type=date],textarea{width:100%;border:1px solid var(--line);border-radius:8px;padding:8px 10px;font:inherit;background:#fff;color:var(--ink)}
select{width:100%;border:1px solid var(--line);border-radius:8px;padding:8px 32px 8px 10px;font:inherit;background:#fff;color:var(--ink)}
input:focus,select:focus,textarea:focus{outline:2px solid rgba(32,28,29,.35);outline-offset:0}
.btn{display:inline-flex;align-items:center;gap:8px;border:none;font:inherit;cursor:pointer;color:#fff}
.btn.teal:hover{background:#20707a}
.btn.ghost{background:#fff;border:1px solid var(--line)}
.btn:disabled{opacity:.45;cursor:not-allowed}
.drop{border:2px dashed var(--grey);border-radius:8px;padding:34px;text-align:center;color:#79726F;cursor:pointer;transition:.15s}
.pills{display:flex;flex-wrap:wrap;gap:8px;margin-top:8px}
.pill{border:1px solid var(--line);border-radius:12px;padding:5px 13px;font-size:13px;background:#fff;cursor:pointer;color:var(--ink)}
.pill.on{background:var(--navy);color:#fff;border-color:var(--navy)}
.kpis{display:grid;grid-template-columns:repeat(5,1fr);gap:14px;margin:6px 0 4px}
.kpi{background:#fff;border:1px solid var(--line);border-radius:8px;padding:14px 16px}
.kpi .v{font-size:24px;font-weight:700;color:var(--navy);font-family:'Roboto Mono',monospace}
.kpi .l{font-size:12px;text-transform:uppercase;letter-spacing:.5px;color:#79726F;margin-top:3px}
.kpi.err .v{color:var(--err)}
.kpi.warn .v{color:var(--warn)}
.kpi.ok .v{color:var(--ok)}
.sevchip{display:inline-block;font-size:12px;font-weight:700;padding:3px 9px;border-radius:12px;letter-spacing:.3px}
.sev-erro{background:#fbe5e8;color:var(--err)}
.sev-aviso{background:#fdf1df;color:var(--warn)}
.sev-info{background:#e9eef6;color:var(--info)}
table{width:100%;border-collapse:collapse;font-size:13px}
th{background:#F2EFED;color:var(--navy);text-align:left;font-size:12px;text-transform:uppercase;letter-spacing:.5px;padding:9px 10px;border-bottom:2px solid var(--line)}
.stickyhead th{position:sticky;top:60px;z-index:2}
td{padding:8px 10px;border-bottom:1px solid var(--line);vertical-align:top}
tr:hover td{background:#f8fafc}
td.mono,.mono{font-family:'Roboto Mono',monospace;font-size:12px}
td.num{text-align:right;font-family:'Roboto Mono',monospace}
.riskbar{display:flex;height:10px;border-radius:8px;overflow:hidden;min-width:110px;background:#eef1f6}
.riskbar div{height:100%}
.rb-ok{background:var(--teal)}
.rb-mid{background:#E9B44C}
.rb-bad{background:var(--red)}
.legend{display:flex;gap:16px;font-size:12px;color:#79726F;margin:8px 0 14px;flex-wrap:wrap}
.legend i{display:inline-block;width:10px;height:10px;border-radius:8px;margin-right:5px;vertical-align:-1px}
.fcomment{width:100%;border:1px solid transparent;background:transparent;font:inherit;font-size:13px;padding:4px 6px;border-radius:8px;resize:vertical;min-height:28px}
.fcomment:hover{border-color:var(--line);background:#fff}
.fcomment:focus{border-color:var(--navy);background:#fff}
.filters{display:flex;gap:10px;flex-wrap:wrap;align-items:end;margin-bottom:14px}
.filters>div{min-width:160px}
.empty{padding:40px;text-align:center;color:#8794a8}
.tag{font-size:12px;background:#eef1f6;color:var(--navy);border-radius:8px;padding:2px 7px;margin-left:6px;font-weight:500}
.step{display:flex;align-items:center;gap:10px;margin-bottom:10px}
.step .n{width:26px;height:26px;border-radius:50%;color:#fff;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:13px;flex-shrink:0}
.hidden{display:none !important}
.note{padding:10px 14px;font-size:13px;margin-top:12px}
.note.red{border-left-color:var(--red)}
/* painel de propósito de cada separador */
.purpose{border-left:4px solid var(--navy)}
.purpose.red{border-left-color:var(--red)}
.purpose.teal{border-left-color:var(--teal)}
.purpose.amber{border-left-color:var(--warn)}
.purpose .eyebrow{text-transform:uppercase;margin-bottom:3px}
.purpose h1{font-weight:700}
.purpose p{font-size:13px;color:#48566b;max-width:820px;margin-bottom:10px}
.purpose .io{display:flex;gap:8px;flex-wrap:wrap}
.purpose .io span{font-size:12px;padding:4px 11px;border-radius:12px;font-weight:500}
.io .in{background:#eef1f6;color:var(--navy)}
.io .out{background:#eef6f7;color:var(--teal)}
.io .step{background:#fdf0f1;color:var(--red)}
.flowbar{align-items:center;gap:6px;flex-wrap:wrap;background:#fff;border:1px solid var(--line);border-radius:8px;padding:11px 16px;margin-bottom:18px;font-size:12px}
.flowbar b{color:#8794a8;font-weight:700;text-transform:uppercase;letter-spacing:.5px;font-size:12px;margin-right:6px}
.flowbar .fstep{padding:4px 10px;border-radius:8px;background:#F2EFED;color:var(--navy);font-weight:500}
.flowbar .fstep.cur{background:var(--navy);color:#fff}
.flowbar .arr{color:#c4ccd8}
/* semáforo de orçamentação */
.estado-sel{border:none;border-radius:8px;padding:6px 8px;font:inherit;font-size:12px;font-weight:600;color:#fff;cursor:pointer;width:100%}
.e-racio{background:#E62336}
.e-consulta{background:#E86A2C}
.e-antiga{background:#D9A400}
.e-firme{background:#5FA85B}
.e-compromisso,.e-adjudicado{background:#298893}
.consbar{display:flex;height:22px;border-radius:8px;overflow:hidden;background:#eef1f6;font-size:0}
.consbar div{height:100%}
.cb-racio{background:#E62336}
.cb-consulta{background:#E86A2C}
.cb-antiga{background:#D9A400}
.cb-firme{background:#5FA85B}
.cb-compromisso,.cb-adjudicado{background:#298893}
.dotleg{display:inline-block;width:10px;height:10px;border-radius:8px;margin-right:5px;vertical-align:-1px}
footer{max-width:1280px;margin:0 auto;padding:0 28px 30px;color:#8794a8;font-size:12px}
.overlay{position:fixed;inset:0;background:rgba(32,28,29,.92);z-index:200;display:flex;align-items:center;justify-content:center;padding:20px}
.modal{background:#fff;border-radius:12px;padding:28px;width:100%;max-width:460px}
.modal.wide{max-width:1000px;max-height:88vh;overflow:auto}
.modal h3{color:var(--navy);font-size:17px;margin-bottom:4px}
.modal .hint{color:#79726F;font-size:13px;margin-bottom:16px}
.preview{overflow:auto;border:1px solid var(--line);border-radius:8px;margin:12px 0;max-height:280px}
.preview table{font-size:12px}
.preview th{position:static;padding:5px 8px}
.preview td{padding:4px 8px;white-space:nowrap;max-width:260px;overflow:hidden;text-overflow:ellipsis}
.preview tr.hl td{background:#fdf3f4}
.err-line{color:var(--err);font-size:13px;margin-top:10px;min-height:16px}
.toast{position:fixed;bottom:24px;left:50%;transform:translateX(-50%);background:var(--navy);color:#fff;padding:11px 22px;border-radius:8px;font-size:13px;z-index:300;box-shadow:0 6px 24px rgba(0,0,0,.25)}
/* ===== v2.1 ===== */
.subtabs{display:flex;gap:6px;flex-wrap:wrap;margin-bottom:14px;border-bottom:1px solid var(--line);padding-bottom:10px}
.subtabs button{background:#fff;border:1px solid var(--line);color:var(--navy);border-radius:8px;padding:7px 14px;font:inherit;font-weight:500;font-size:13px;cursor:pointer}
.subtabs button.on{background:var(--navy);color:#fff;border-color:var(--navy)}
.drvchip{display:inline-block;font-size:12px;font-weight:600;padding:2px 8px;border-radius:8px;background:#eef1f6;color:var(--navy);letter-spacing:.2px;white-space:nowrap}
.drvchip.exp{background:#fdf1df;color:var(--warn)}
.srcchip{display:inline-block;font-size:12px;font-weight:700;padding:2px 7px;border-radius:8px;letter-spacing:.3px}
.src-qt{background:#e4f1ec;color:#1d6b52}
.src-drv{background:#e9eef6;color:var(--navy)}
.src-lin{background:#f2f0e6;color:#7a6a24}
.matrix td.best{background:#e4f1ec;font-weight:700;color:#1d6b52}
.matrix td.worst{color:#a33}
.matrix th.sup{writing-mode:horizontal-tb;font-size:12px;max-width:120px}
.vrow{display:flex;align-items:center;gap:12px;padding:9px 12px;border:1px solid var(--line);border-radius:8px;margin-bottom:7px;background:#fff;font-size:13px}
.vrow .vn{font-weight:700;color:var(--navy);font-family:'Roboto Mono',monospace;min-width:38px}
.vrow .vc{flex:1;color:#48566b}
.vrow.cur{border-color:var(--teal);background:#f4fbfb}
.miniflag{display:inline-block;width:7px;height:7px;border-radius:50%;margin-right:5px;vertical-align:1px}
.mf-ok{background:var(--teal)}
.mf-warn{background:var(--warn)}
.mf-err{background:var(--err)}
.mf-none{background:#c4ccd8}
.banner{position:fixed;top:70px;right:20px;max-width:420px;background:#fff;border:1px solid var(--line);border-left:4px solid var(--err);border-radius:8px;padding:13px 16px;box-shadow:0 8px 30px rgba(32,28,29,.18);z-index:310;font-size:13px;color:var(--ink)}
.banner b{display:block;color:var(--err);margin-bottom:3px;font-size:12px;text-transform:uppercase;letter-spacing:.4px}
.banner .x{position:absolute;top:8px;right:11px;cursor:pointer;color:#8794a8;font-size:15px;line-height:1}
.banner.ok{border-left-color:var(--teal)}
.banner.ok b{color:var(--teal)}
.assum{background:#fafbfd;border:1px solid var(--line);border-radius:8px;padding:12px 15px;font-size:12px;color:#48566b;margin-top:12px}
.assum b{color:var(--navy);display:block;margin-bottom:5px;font-size:12px;text-transform:uppercase;letter-spacing:.5px}
.assum ul{margin:0 0 0 16px}
.assum li{margin-bottom:3px}
.autosave{font-size:12px;color:#8794a8;margin-left:10px;font-weight:400}
/* ===== v2.2 ===== */
#ctxbar{display:flex;align-items:center;gap:14px;position:sticky;z-index:49}
#ctxbar input{width:230px;font:inherit}
#ctxbar .desc{display:flex;gap:16px;flex-wrap:wrap;align-items:center;overflow:hidden}
#ctxbar .desc b{font-weight:600}
#ctxbar .desc span.miss{font-style:italic}
#ctxbar .btnctx{font:inherit;font-size:12px;cursor:pointer;white-space:nowrap}
#ctxbar .btnctx:hover{background:rgba(255,255,255,.22)}
#ctxbar .newtag{font-size:12px;font-weight:700;padding:2px 8px;border-radius:8px;letter-spacing:.4px}
.ctxecho{background:#F0F3F8;border:1px solid var(--line);border-radius:8px;padding:11px 15px;display:flex;gap:20px;flex-wrap:wrap;align-items:center;font-size:13px;color:#48566b}
.ctxecho b{color:var(--navy);font-family:'Roboto Mono',monospace}
.ctxecho .pn{font-family:'Inter',sans-serif;font-weight:700;font-size:14px;color:var(--navy);margin-right:4px}
.purpose .toggle{top:13px;right:16px;font:inherit;cursor:pointer}
.purpose{position:relative}
#busy{position:fixed;top:0;left:0;height:3px;background:var(--teal);width:0;z-index:400;transition:width .25s ease}
#busy.on{width:88%}
#busy.done{width:100%;opacity:0;transition:width .2s,opacity .4s .2s}
.busytxt{position:fixed;top:14px;left:50%;transform:translateX(-50%);background:var(--navy);color:#fff;font-size:12px;padding:6px 16px;border-radius:12px;z-index:401;box-shadow:0 4px 16px rgba(0,0,0,.2)}
.jump{display:flex;gap:6px;flex-wrap:wrap;margin-bottom:14px}
.jump a{font-size:12px;color:var(--navy);background:#fff;border:1px solid var(--line);border-radius:12px;padding:4px 12px;text-decoration:none}
.jump a:hover{border-color:var(--navy)}
tr.resolved td{opacity:.42}
tr.resolved td textarea{text-decoration:line-through}
.rescb{width:16px;height:16px;cursor:pointer;accent-color:var(--teal)}
.cb-racio,.e-racio{background:#8494A8 !important}
.modal .dgrid{display:grid;grid-template-columns:repeat(3,1fr);gap:13px}
@media(max-width:900px){
  #ctxbar{height:auto;padding:8px 14px;flex-wrap:wrap;top:0;position:static}
  #ctxbar .desc{width:100%}
}
@media(max-width:1100px){
  .kpis{grid-template-columns:repeat(3,1fr)}
}
@media(max-width:900px){
  .g6{grid-template-columns:repeat(2,1fr)}
  .kpis{grid-template-columns:repeat(2,1fr)}
  main{padding:16px}
  header .sub{display:none}
  nav{gap:2px}
  nav button{padding:7px 9px;font-size:13px}
}
@media(max-width:640px){
  .g6{grid-template-columns:1fr}
  .kpis{grid-template-columns:1fr}
  header{padding:0 14px;gap:10px;height:auto;flex-wrap:wrap;padding-bottom:8px}
  nav{margin-left:0;width:100%;overflow-x:auto}
  .card{padding:15px 14px}
  .stickyhead th{position:static}
  table{font-size:12px}
  td,th{padding:6px 7px}
}
.infodot{display:inline-flex;align-items:center;justify-content:center;width:15px;height:15px;border-radius:50%;background:var(--navy,#201C1D);color:#fff;font-size:12px;font-weight:700;font-style:normal;cursor:help;margin-left:5px;position:relative;vertical-align:middle}
.infodot::after{content:attr(data-tip);position:absolute;left:50%;top:135%;transform:translateX(-50%);background:#201C1D;color:#fff;padding:8px 11px;border-radius:8px;font-size:12px;font-weight:400;line-height:1.45;width:260px;z-index:60;opacity:0;pointer-events:none;transition:opacity .12s;box-shadow:0 4px 14px rgba(0,0,0,.28);text-align:left}
.infodot:hover::after{opacity:1}
.glossbox{background:#f5f7fa;border:1px solid #d8e0ea;border-radius:8px;padding:12px 16px;margin:6px 0 2px;font-size:13px;line-height:1.55;color:#2a3a52}
.glossbox h4{margin:0 0 6px;color:var(--navy,#201C1D);font-size:13px}
.glossbox dt{font-weight:700;color:var(--navy,#201C1D);margin-top:8px}
.glossbox dd{margin:0 0 3px}
.glossbox b{color:var(--navy,#201C1D)}
/* ═══════════ SOLIVE DS · reorganização UX (fases 1–4) ═══════════ */
:root{--red:#EF2A42;--navy:#201C1D;--teal:#1F8A5B;--grey:#C9C2BF;--ink:#201C1D;--bg:#F2EFED;--card:#fff;--line:#E6E1DF;--warn:#B9760A;--ok:#1F8A5B;--err:#C81F35;--info:#79726F;--coral-700:#C81F35;--coral-100:#FBE1E5;--ink-500:#79726F;--ink-300:#C9C2BF;--sb-w:248px}
body{font-family:'Inter',-apple-system,sans-serif;-webkit-font-smoothing:antialiased;padding-left:var(--sb-w);font-size:14px}
h1,h2,h3,.btn,nav button,.kpi .v,.purpose h1{font-family:'Plus Jakarta Sans','Inter',sans-serif}
table{font-variant-numeric:tabular-nums}
header{position:fixed;left:0;top:0;bottom:0;width:var(--sb-w);height:auto;flex-direction:column;align-items:stretch;gap:6px;padding:20px 14px 16px;background:#fff;color:var(--ink);border-right:1px solid var(--line);overflow-y:auto;z-index:60}
header .brand{font-size:20px;letter-spacing:-.01em;padding:0 10px}
header .sub{border-left:none;padding:0 10px;opacity:1;color:var(--ink-500);font-size:13px;font-weight:400;margin-top:-4px}
header .badge{align-self:flex-start;margin:6px 10px 8px;background:var(--bg);color:var(--ink-500)}
header .badge.on{background:#E1F3EA;color:#1F8A5B}
nav{margin:0;flex-direction:column;gap:2px;flex:1}
nav button{color:var(--ink);opacity:1;text-align:left;padding:9px 12px;border-radius:8px;font-weight:500;font-size:14px;display:flex;align-items:center;gap:10px}
nav button:hover{background:var(--bg);opacity:1}
nav button.on{background:var(--coral-100);color:var(--coral-700);font-weight:600}
nav .navgrp{font-size:12px;font-weight:600;color:var(--ink-500);padding:14px 12px 4px}
nav .navsep{flex:1;min-height:12px}
nav #btnLogout,nav #nav-admin,nav #nav-ajuda{color:var(--ink-500)}
#ctxbar{background:rgba(255,255,255,.96);color:var(--ink);top:0;height:auto;min-height:56px;padding:8px 28px;border-bottom:1px solid var(--line);backdrop-filter:blur(8px);flex-wrap:wrap}
#ctxbar .lbl{color:var(--ink-500);font-size:12px;letter-spacing:0;text-transform:none;font-weight:600}
#ctxbar input{background:#fff;border:1px solid var(--grey);color:var(--ink);border-radius:8px;padding:8px 12px;font-size:14px;font-weight:600}
#ctxbar input::placeholder{color:var(--ink-500)}
#ctxbar input:focus{outline:none;border-color:var(--red);box-shadow:0 0 0 3px var(--coral-100)}
#ctxbar #ctxSeta{color:var(--ink-500)!important}
#ctxbar .desc{color:var(--ink-500);font-size:13px}
#ctxbar .desc b{color:var(--ink);font-family:'Inter',sans-serif}
#ctxbar .desc span.miss{color:var(--warn)}
#ctxbar .btnctx{background:#fff;border:1px solid var(--grey);color:var(--ink);border-radius:999px;padding:7px 14px;font-weight:600}
#ctxbar .newtag{background:var(--coral-100);color:var(--coral-700)}
main{max-width:1320px}
.flowbar{display:none!important}
.purpose{background:none;border:none;border-radius:0;padding:4px 0 0;margin-bottom:20px}
.purpose .eyebrow{font-size:12px;letter-spacing:.06em;color:var(--coral-700);font-weight:600}
.purpose h1{font-size:26px;color:var(--ink);letter-spacing:-.02em;margin-bottom:4px}
.purpose p,.purpose .io{display:none!important}
.purpose.open p{display:block!important;background:#fff;border:1px solid var(--line);border-radius:12px;padding:14px 16px;margin-top:10px;color:var(--ink-500);font-size:14px;line-height:1.55}
.purpose.open .io{display:flex!important;margin-top:8px}
.purpose .toggle{position:static!important;float:right;margin:4px 0 8px 16px;border:1px solid var(--grey);border-radius:999px;background:#fff;color:var(--ink);font-weight:600;font-size:13px;padding:7px 14px}
.purpose .toggle:hover{background:var(--bg);color:var(--ink)}
.io .in,.io .out,.io .step{background:var(--bg);color:var(--ink)}
.card{border-color:var(--line);border-radius:12px}
.card h2{color:var(--ink);font-size:17px}
[id^="view-"] h2[style*="143A67"]{color:var(--ink)!important;font-size:24px!important;letter-spacing:-.02em}
.step .n{background:var(--ink)}
.note{background:var(--bg);border-left:none;border-radius:8px;color:var(--ink)}
.note.red{background:var(--coral-100);color:var(--coral-700)}
.btn{border-radius:999px;font-weight:600;padding:9px 18px;transition:background .12s,transform .12s}
.btn:hover:not(:disabled){transform:translateY(-1px)}
.btn.red{background:var(--red)}
.btn.red:hover{background:#C81F35}
.btn.navy{background:var(--ink)}
.btn.navy:hover{background:#453F3E}
.btn.teal{background:#1F8A5B}
.btn.ghost{border-color:var(--grey);color:var(--ink)}
.btn.ghost:hover{border-color:var(--ink);background:var(--bg)}
.subtabs button.on{border-bottom-color:var(--red)!important}
input,select,textarea{font-family:'Inter',sans-serif}
.drop.over,.drop:hover{border-color:var(--ink);background:#fff}
.drop b{color:var(--ink)}
.e-racio,.cb-racio{background:#C81F35}
.e-consulta,.cb-consulta{background:#B9760A}
.e-antiga,.cb-antiga{background:#C9C2BF}
.e-firme,.cb-firme{background:#7CC4A0}
.e-compromisso,.e-adjudicado,.cb-compromisso,.cb-adjudicado{background:#1F8A5B}
#ajudaFab{display:none!important}
body header nav > button[id^="nav-"]{display:flex!important}
[data-uxhide]{display:none!important}
/* Revisão do MQ — resultados em separadores */
.uxtabs{display:flex;gap:24px;border-bottom:1px solid var(--line);margin:4px 0 18px;padding:0 4px;position:sticky;top:56px;background:var(--bg);z-index:5}
.uxtabs button{background:none;border:none;padding:12px 2px;margin-bottom:-1px;font:600 15px 'Plus Jakarta Sans',sans-serif;color:var(--ink-500);border-bottom:2px solid transparent;cursor:pointer}
.uxtabs button.on{color:var(--ink);border-bottom-color:var(--red)}
.uxtabs button[hidden]{display:none}
.uxlink{background:none!important;border:none!important;color:var(--coral-700)!important;padding:9px 6px!important;font-weight:600}
.uxlink:hover{text-decoration:underline;transform:none!important}
details.uxadv{margin-top:14px;border-top:1px solid var(--line);padding-top:12px}
details.uxadv>summary{cursor:pointer;font-weight:600;font-size:14px;color:var(--ink);list-style:none;display:flex;align-items:center;gap:8px}
details.uxadv>summary::-webkit-details-marker{display:none}
details.uxadv>summary:before{content:'+';display:inline-flex;width:20px;height:20px;border-radius:999px;border:1px solid var(--grey);align-items:center;justify-content:center;font-size:13px}
details.uxadv[open]>summary:before{content:'−'}
details.uxadv .grid{margin-top:12px}
/* Administração */
#view-admin #lib-pane-gerir,#view-admin #lib-pane-ver{display:block!important}
/* Resumo do projeto */
.rs-stages{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px;margin-bottom:16px}
.rs-st{background:#fff;border:1px solid var(--line);border-radius:12px;padding:18px;display:flex;flex-direction:column;gap:8px;cursor:pointer;transition:border-color .12s}
.rs-st:hover{border-color:var(--ink)}
.rs-st .t{display:flex;justify-content:space-between;align-items:center;gap:8px;font-size:13px;font-weight:600}
.rs-st .v{font:700 22px 'Plus Jakarta Sans',sans-serif;letter-spacing:-.01em}
.rs-st .s{font-size:13px;color:var(--ink-500);line-height:1.45}
.rs-b{font-size:12px;font-weight:600;letter-spacing:.05em;text-transform:uppercase;padding:3px 10px;border-radius:999px;white-space:nowrap}
.rs-ok{background:#E1F3EA;color:#1F8A5B}
.rs-warn{background:#FBEDD7;color:#B9760A}
.rs-info{background:#E6EEF7;color:#2C68A8}
.rs-none{background:var(--bg);color:var(--ink-500)}
.rs-err{background:var(--coral-100);color:var(--coral-700)}
.rs-bar{display:flex;height:8px;border-radius:999px;overflow:hidden;background:var(--bg)}
.rs-grid{display:grid;grid-template-columns:minmax(0,1.5fr) minmax(0,1fr);gap:12px}
.rs-card{background:#fff;border:1px solid var(--line);border-radius:12px;padding:18px 22px}
.rs-card h3{font-size:17px;margin-bottom:8px}
.rs-act{display:flex;align-items:center;gap:12px;padding:12px 0;border-bottom:1px solid var(--line)}
.rs-act:last-child{border-bottom:none}
.rs-ic{width:32px;height:32px;border-radius:8px;display:flex;align-items:center;justify-content:center;font-weight:700;flex-shrink:0}
.rs-act .tx{flex:1;display:flex;flex-direction:column}
.rs-act .tx b{font-size:14px}
.rs-act .tx span{font-size:13px;color:var(--ink-500)}
.rs-act a{font-size:13px;font-weight:600;color:var(--coral-700);cursor:pointer;white-space:nowrap}
.rs-kv{display:flex;justify-content:space-between;font-size:14px;padding:6px 0}
.rs-kv span:first-child{color:var(--ink-500)}
@media(max-width:1100px){
  .rs-stages{grid-template-columns:repeat(2,minmax(0,1fr))}
  .rs-grid{grid-template-columns:1fr}
}
@media(max-width:900px){
  body{padding-left:0}
  header{position:static;width:auto;flex-direction:column}
  nav{flex-direction:row;flex-wrap:wrap}
  nav .navgrp,nav .navsep{display:none}
  #ctxbar{position:static}
}
/* ═══════════════════════════════════════════════════════════════
   Entrega 1 · Interface (auditoria set 2026): tipografia, botões e cor
   ═══════════════════════════════════════════════════════════════ */
:root{--red:#EF2A42;--navy:#201C1D;--ink:#201C1D;--teal:#1F8A5B;--ok:#1F8A5B;--err:#C81F35;--warn:#B9760A;--info:#79726F;--line:#E6E1DF;--grey:#C9C2BF;--muted:#79726F}
body{font-family:'Inter',-apple-system,'Segoe UI',sans-serif;font-size:14px;line-height:1.5;-webkit-font-smoothing:antialiased}
/* Títulos: curtos na leitura, sem maiúsculas */
main h1,.purpose h1{font-size:26px;font-weight:700;letter-spacing:-0.01em;line-height:1.2;text-wrap:balance}
main h2,.step h2,.card h2,.modal h3{font-size:16px;font-weight:700;text-transform:none!important;letter-spacing:0!important}
h3{text-transform:none;letter-spacing:0}
/* Etiquetas e cabeçalhos: maiúscula só na primeira letra, mínimo 12 px */
label{font-size:13px;font-weight:500;color:#453F3E;text-transform:none;letter-spacing:0}
th{font-size:12px;font-weight:600;color:#79726F;text-transform:none;letter-spacing:0;background:#F2EFED;border-bottom:1px solid var(--line)}
.kpi .l{font-size:13px;text-transform:none;letter-spacing:0;color:#79726F}
.badge,.sevchip,.tag,.srcchip,.assum b,.autosave,#ctxbar .newtag,.infodot,.rs-b{font-size:12px}
.tag,.srcchip,.sevchip,.badge{text-transform:none;letter-spacing:0}
/* Botões: um só principal (vermelho), secundário com contorno; o texto não parte */
.btn{font-size:14px;font-weight:600;border-radius:999px;text-align:center;line-height:1.25}
.btn.red,.btn.navy,.btn.teal{background:var(--red);color:#fff;border:1px solid var(--red)}
.btn.red:hover,.btn.navy:hover,.btn.teal:hover{background:#C81F35;border-color:#C81F35}
.btn.ghost{background:#fff;border:1px solid var(--grey);color:var(--ink)}
.btn.ghost:hover{background:#F2EFED}
/* Ajudas: menos peso visual */
.hint{color:#79726F;font-size:13px;line-height:1.5}


/* ═══════════════════════════════════════════════════════════════
   Entrega 2 · ícones, títulos, zona de ficheiros e estado vazio
   Escala: 12 · 13 · 14 · 16 · 18 · 26 px. Pesos: 400 texto · 500 etiquetas/menu · 600 botões/valores · 700 títulos
   ═══════════════════════════════════════════════════════════════ */
b,strong{font-weight:600}
[class^="icon-"],[class*=" icon-"]{font-size:17px;line-height:1;flex:none}
.btn [class^="icon-"],.btnctx [class^="icon-"]{font-size:16px}
/* menu */
nav button{font-size:14px;font-weight:500;gap:10px}
nav button.on{font-weight:600}
nav button [class^="icon-"]{color:#79726F}
nav button.on [class^="icon-"]{color:inherit}
.navgrp{font-size:11px!important;font-weight:600;letter-spacing:.06em;text-transform:uppercase;color:#79726F;padding:14px 12px 4px}
/* títulos de página: curtos, uma linha, com subtítulo */
.purpose .eyebrow{font-size:12px;font-weight:600;letter-spacing:.06em}
.purpose h1{font-size:26px!important;line-height:1.2;margin-bottom:2px}
.purpose .subtitle{font-size:14px;color:#79726F;margin:0 0 4px;max-width:720px}
.purpose .toggle{display:inline-flex;align-items:center;gap:6px}
/* blocos */
.card h2{font-size:16px!important}
.step .n{width:22px;height:22px;font-size:12px}
.hint{font-size:13px}
/* zona de ficheiros */
.drop{display:flex;align-items:center;gap:14px;text-align:left;padding:18px 20px;border:1.5px dashed #C9C2BF;border-radius:12px;background:#FAF9F8;color:#453F3E;font-size:14px}
.drop:hover,.drop.over{border-color:var(--red);background:#FDF3F4}
.drop .drop-ic{width:40px;height:40px;border-radius:10px;background:#fff;border:1px solid var(--line);display:flex;align-items:center;justify-content:center;flex:none}
.drop .drop-ic [class^="icon-"]{font-size:20px;color:var(--ink)}
/* estado vazio (sem projeto ativo) */
.ux-empty{display:none;align-items:center;gap:18px;background:#fff;border:1px solid var(--line);border-radius:12px;padding:22px 24px;margin-bottom:18px}
.ux-empty .ux-empty-ic{width:48px;height:48px;border-radius:12px;background:#FBE1E5;color:#C81F35;display:flex;align-items:center;justify-content:center;flex:none}
.ux-empty .ux-empty-ic [class^="icon-"]{font-size:24px}
.ux-empty h3{font-size:16px;margin:0 0 2px}
.ux-empty p{margin:0;color:#79726F;font-size:14px}
.ux-empty .btn{margin-left:auto}
body.no-project .ux-empty{display:flex}
body.no-project .needs-project > :not(.purpose):not(.ux-empty){opacity:.45}
body.no-project .miss{display:none}

/* ═══ Entrega 2 · correções de layout (captura de 24 set) ═══ */
/* página mais larga do que o ecrã: a linha de descritores do projeto não quebrava */
main{min-width:0;box-sizing:border-box}
#ctxbar{min-width:0}
#ctxbar .desc{white-space:normal;min-width:0;flex:1 1 320px;font-size:13px;line-height:1.4}
.card{max-width:100%;box-sizing:border-box}
.card table{max-width:100%}
.card:has(> table), .card .tblwrap{overflow-x:auto}
/* selo de ligação: numa linha */
header .badge{white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:calc(var(--sb-w) - 28px);border-radius:999px;background:#E1F3EA;color:#1F8A5B;font-weight:600}
/* menu: sem caixa preta ao clicar */
nav button:focus{outline:none}
nav button:focus-visible{outline:2px solid var(--red);outline-offset:-2px}
/* seletor de ficheiro nativo com o aspeto dos botões secundários */
input[type=file]{font:inherit;font-size:13px;color:#79726F;max-width:100%}
input[type=file]::file-selector-button{font:inherit;font-size:14px;font-weight:600;color:var(--ink);background:#fff;border:1px solid var(--grey);border-radius:999px;padding:8px 16px;margin-right:10px;cursor:pointer}
input[type=file]::file-selector-button:hover{background:#F2EFED}
/* notas de ajuda: texto simples por baixo, não caixas cinzentas ao lado dos campos */
.card .note,#view-precomq > .note{display:block;background:none;border:0;padding:0;margin:4px 0 12px;color:#79726F;font-size:13px;line-height:1.5}
.note:empty{display:none}
.card > b:first-child{display:block;font-family:'Plus Jakarta Sans','Inter',sans-serif;font-size:16px;font-weight:700;margin-bottom:2px}
.card > label:first-child{font-size:14px;font-weight:600;color:var(--ink);margin-bottom:8px}
.card input[type=number],.card select{vertical-align:middle}

.purpose .subtitle{display:block!important}
.ux-empty .btn,.btn{white-space:nowrap}
.btnctx{display:inline-flex;align-items:center;gap:6px}
header .badge:empty{display:none}

/* ═══ Afinação final de tamanhos (letra e ícones) ═══
   Texto 14 · ajudas 13 · etiquetas de grupo 12 (mínimo) · títulos 16/26.
   Ícones: 16 px junto a texto de 14 px, 20–24 px em estados vazios e zonas de ficheiro. */
.navgrp{font-size:12px!important;letter-spacing:.05em}
nav button{font-size:14px;line-height:1.3;padding:8px 12px}
nav button [class^="icon-"]{font-size:16px}
.btn [class^="icon-"],.btnctx [class^="icon-"],.purpose .toggle [class^="icon-"]{font-size:16px}
#ctxbar .lbl{font-size:12px;font-weight:600;color:#6B6461}
#ctxNome{font-size:14px}
/* ajudas com contraste suficiente (antes #79726F sobre fundo creme ≈ 4,1:1) */
.hint,.note,.card .note,.purpose .subtitle,.ux-empty p,input[type=file]{color:#6B6461}
.purpose .subtitle{font-size:14px}
.kpi .v{font-size:22px}
td{font-size:13px}

/* ═══ Explicações de cada separador: para que serve, passos, resultado e ciclo ═══ */
.purpose .howto{display:none}
.purpose.open .howto{display:block;background:#fff;border:1px solid var(--line);border-radius:12px;padding:16px 18px;margin-top:10px;font-size:14px;line-height:1.55;color:var(--ink);max-width:860px}
.howto ol{margin:6px 0 10px;padding-left:22px;display:flex;flex-direction:column;gap:4px}
.howto li::marker{font-weight:700;color:var(--red)}
.howto .ht-lbl{font-size:12px;font-weight:600;letter-spacing:.05em;text-transform:uppercase;color:#6B6461;margin:10px 0 2px}
.howto .ht-lbl:first-child{margin-top:0}
.howto p{display:block!important;margin:0;background:none!important;border:0!important;padding:0!important;font-size:14px!important;color:var(--ink)!important}
.cycle{display:flex;align-items:center;gap:6px;flex-wrap:wrap;margin:8px 0 2px;font-size:13px}
.cycle .cy{display:inline-flex;align-items:center;gap:6px;padding:4px 10px;border-radius:999px;border:1px solid var(--line);background:#fff;color:#6B6461;cursor:pointer;font-weight:500}
.cycle .cy.on{background:#FBE1E5;border-color:#F4B9C1;color:#C81F35;font-weight:600}
.cycle .cy-sep{color:#C9C2BF}
.cycle .next{margin-left:8px;display:inline-flex;align-items:center;gap:4px;font-weight:600;color:var(--ink);cursor:pointer;border:0;background:none;padding:4px 2px}
.cycle .next:hover{color:var(--red)}
.guide{background:#fff;border:1px solid var(--line);border-radius:12px;padding:18px 20px;margin-bottom:18px}
.guide h3{font-size:16px;margin:0 0 10px}
.guide .g-steps{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px}
.guide .g-step{border:1px solid var(--line);border-radius:10px;padding:12px 14px;display:flex;flex-direction:column;gap:4px;cursor:pointer;background:#FAF9F8}
.guide .g-step:hover{border-color:var(--red)}
.guide .g-n{font-size:12px;font-weight:700;color:#C81F35;letter-spacing:.05em;text-transform:uppercase}
.guide .g-t{font-weight:700;font-size:14px}
.guide .g-d{font-size:13px;color:#6B6461}
@media(max-width:900px){.guide .g-steps{grid-template-columns:1fr 1fr}}

.purpose p.subtitle,.purpose.open p.subtitle{display:block!important;background:none!important;border:0!important;padding:0!important;margin:0 0 4px!important;font-size:14px!important;color:#6B6461!important}
