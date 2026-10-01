/* Solive · Orçamentação — 04-analisador.js
   Analisador de MQ: upload, mapeador de colunas, parsing, testes de coerência, custos, quantidades, exports e gravação.
   Versão: ver APP_REGISTAR no fim do ficheiro (tem de ser igual à do index.html). */

/* ================= UPLOAD (analisador) ================= */
const drop=document.getElementById('drop'), fi=document.getElementById('fileInput');
drop.onclick=()=>fi.click();
drop.ondragover=e=>{e.preventDefault();drop.classList.add('over')};
drop.ondragleave=()=>drop.classList.remove('over');
drop.ondrop=e=>{e.preventDefault();drop.classList.remove('over');if(e.dataTransfer.files[0])loadFile(e.dataTransfer.files[0])};
fi.onchange=()=>{if(fi.files[0])loadFile(fi.files[0])};

function loadFile(f){
  wbName=f.name; MANUAL_H=null;
  document.getElementById('mapNote').classList.add('hidden');
  const r=new FileReader();
  r.onload=e=>{
    try{ workbook=XLSX.read(new Uint8Array(e.target.result),{type:'array'}); }
    catch(err){alertx("Não foi possível ler o ficheiro. Confirma que é um .xlsx válido.");return}
    drop.innerHTML="Ficheiro carregado: <b>"+esc(wbName)+"</b> — clica para trocar";
    const pills=document.getElementById('sheetPills');
    pills.innerHTML="";
    const names=workbook.SheetNames.slice();
    names.forEach(n=>{
      const b=document.createElement('button');
      b.className='pill'; b.textContent=n;
      b.onclick=()=>{chosenSheet=n;MANUAL_H=null;tryStoredMapping();[...pills.children].forEach(c=>c.classList.remove('on'));b.classList.add('on')};
      pills.appendChild(b);
    });
    const guess=names.find(n=>/boq|mapa|mq|quantidades/i.test(n))||names[0];
    chosenSheet=guess;
    [...pills.children].forEach(c=>{if(c.textContent===guess)c.classList.add('on')});
    document.getElementById('sheetPick').classList.remove('hidden');
    tryStoredMapping();
  };
  r.readAsArrayBuffer(f);
}

/* aplica automaticamente um padrão memorizado, se corresponder */
function tryStoredMapping(){
  if(!MAPPINGS.length||!workbook||!chosenSheet) return;
  const rows=sheetRows();
  for(const m of MAPPINGS){
    const a=m.assinatura; if(!a||a.row==null) continue;
    const r=rows[a.row]||[];
    const okDesc=norm(r[a.desc]||"")===norm(a.txtDesc||"");
    const okUn=norm(r[a.un]||"")===norm(a.txtUn||"");
    if(okDesc&&okUn&&a.txtDesc){
      MANUAL_H={row:a.row,code:a.code,desc:a.desc,un:a.un,qt:a.qt,qcols:a.qcols||[a.qt]};
      const n=document.getElementById('mapNote');
      n.classList.remove('hidden');
      n.innerHTML="Padrão de colunas do gabinete <b>"+esc(m.gabinete)+"</b> aplicado automaticamente.";
      return;
    }
  }
}

/* ================= MAPEADOR MANUAL ================= */
function sheetRows(){return XLSX.utils.sheet_to_json(workbook.Sheets[chosenSheet],{header:1,raw:true,defval:null})}
function colName(i){let s="";i++;while(i>0){s=String.fromCharCode(65+(i-1)%26)+s;i=Math.floor((i-1)/26)}return s}

function openMapper(){
  if(!workbook||!chosenSheet){alertx("Carrega primeiro o ficheiro do mapa de quantidades.");return}
  const rows=sheetRows();
  const ncols=Math.min(14,Math.max(...rows.slice(0,30).map(r=>(r||[]).length),1));
  const auto=detectHeader(rows);
  const hr=auto?auto.row:0;
  const selRow=document.getElementById('mRow');
  selRow.innerHTML=rows.slice(0,30).map((r,i)=>{
    const t=(r||[]).filter(x=>x!=null).slice(0,4).join(" · ").slice(0,60);
    return `<option value="${i}" ${i===hr?'selected':''}>Linha ${i+1} — ${esc(t||'(vazia)')}</option>`;
  }).join("");
  const colOpts=(sel,extra)=>{
    const r=rows[+selRow.value]||[];
    let h=extra?`<option value="-1">— não existe —</option>`:"";
    for(let j=0;j<ncols;j++) h+=`<option value="${j}" ${sel===j?'selected':''}>${colName(j)} — ${esc(String(r[j]??'').slice(0,24))}</option>`;
    return h;
  };
  const fill=()=>{
    document.getElementById('mCode').innerHTML=colOpts(auto?auto.code:0);
    document.getElementById('mDesc').innerHTML=colOpts(auto?auto.desc:1);
    document.getElementById('mUn').innerHTML=colOpts(auto?auto.un:2);
    document.getElementById('mQt').innerHTML=colOpts(auto?auto.qt:3);
    document.getElementById('mQtRev').innerHTML=colOpts(auto&&auto.qcols.length>1?auto.qcols[auto.qcols.length-1]:-1,true);
    renderMapPreview(rows,ncols);
  };
  selRow.onchange=fill; fill();
  document.getElementById('mSaveBtn').classList.toggle('hidden',!online()||!SESSION);
  document.getElementById('mErr').textContent="";
  document.getElementById('mapOverlay').classList.remove('hidden');
}
function renderMapPreview(rows,ncols){
  const hr=+document.getElementById('mRow').value;
  const t=document.getElementById('mPreview');
  let h="<tr><th></th>"; for(let j=0;j<ncols;j++)h+="<th>"+colName(j)+"</th>"; h+="</tr>";
  const from=Math.max(0,hr-1);
  rows.slice(from,from+12).forEach((r,k)=>{
    const i=from+k;
    h+=`<tr class="${i===hr?'hl':''}"><td class="mono">${i+1}</td>`;
    for(let j=0;j<ncols;j++)h+=`<td>${esc(String((r||[])[j]??''))}</td>`;
    h+="</tr>";
  });
  t.innerHTML=h;
}
function closeMapper(){document.getElementById('mapOverlay').classList.add('hidden')}
async function applyMapper(save){
  const row=+document.getElementById('mRow').value;
  const code=+document.getElementById('mCode').value, desc=+document.getElementById('mDesc').value;
  const un=+document.getElementById('mUn').value, qt=+document.getElementById('mQt').value;
  const qrev=+document.getElementById('mQtRev').value;
  if(desc===un||desc===qt||un===qt){document.getElementById('mErr').textContent="As colunas de designação, unidade e quantidade têm de ser diferentes.";return}
  const qcols=qrev>=0?[qt,qrev]:[qt];
  MANUAL_H={row,code,desc,un,qt,qcols};
  const rows=sheetRows(); const r=rows[row]||[];
  if(save){
    const gab=document.getElementById('mGab').value.trim();
    if(!gab){document.getElementById('mErr').textContent="Indica o nome do gabinete para memorizar o padrão.";return}
    const assinatura={row,code,desc,un,qt,qcols,txtDesc:String(r[desc]??''),txtUn:String(r[un]??'')};
    const {error}=await sb.from('mapeamentos').insert({gabinete:gab,assinatura});
    if(error){document.getElementById('mErr').textContent="Não foi possível guardar o padrão: "+error.message;return}
    await loadMappings();
    toast("Padrão de \""+gab+"\" memorizado.");
  }
  closeMapper();
  const n=document.getElementById('mapNote');
  n.classList.remove('hidden');
  n.innerHTML="Mapeamento manual aplicado (cabeçalho na linha "+(row+1)+").";
}

/* ================= PARSING ================= */
function norm(s){return String(s||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/\s+/g," ").toUpperCase().trim()}
function esc(s){const d=document.createElement('div');d.textContent=s==null?"":String(s);return d.innerHTML}
function fmt(n,d){return n==null||isNaN(n)?"—":Number(n).toLocaleString('pt-PT',{minimumFractionDigits:d??0,maximumFractionDigits:d??2})}

function detectHeader(rows){
  const reDesc=/DESIGNACAO|DESCRICAO|REFERENCIA DOS MATERIAIS|ARTIGO/;
  const reUn=/^UN\.?\b|^UNID/, reQt=/QUANT|^QT/, reCode=/CODIGO|^CAP|^ART|^N\.?º|^ITEM/;
  for(let i=0;i<Math.min(rows.length,40);i++){
    const cells=(rows[i]||[]).map(norm);
    const hasDesc=cells.findIndex(c=>reDesc.test(c));
    if(hasDesc===-1) continue;
    // procurar UN/QUANT na mesma linha; se faltarem, tentar a linha seguinte (cabeçalho a 2 níveis)
    const nxt=(rows[i+1]||[]).map(norm);
    const findIn=(re)=>{let j=cells.findIndex(c=>re.test(c));if(j>-1)return[j,i];j=nxt.findIndex(c=>re.test(c));if(j>-1)return[j,i+1];return[-1,i];};
    const [un,unRow]=findIn(reUn), [qt,qtRow]=findIn(reQt);
    if(un>-1&&qt>-1){
      const hdrRow=Math.max(i,unRow,qtRow);
      let code=cells.findIndex(c=>reCode.test(c));
      if(code===-1) code=Math.max(0,hasDesc-1);
      const qcols=[]; cells.forEach((c,j)=>{if(reQt.test(c)||/REV/.test(c))qcols.push(j)});
      nxt.forEach((c,j)=>{if(reQt.test(c)&&!qcols.includes(j))qcols.push(j)});
      if(!qcols.length)qcols.push(qt);
      return {row:hdrRow,code,desc:hasDesc,un,qt,qcols,pUnit:-1,pTot:-1};
    }
  }
  return null;
}

const ALIAS_CAP={
  "REVESTIMENTOS DE PAVIMENTOS":"PAVIMENTOS DIVERSOS",
  "REVESTIMENTOS DE PAREDES":"CERÂMICOS",
  "REVESTIMENTOS DE TECTOS":"CERÂMICOS",
  "REVESTIMENTOS DE TETOS":"CERÂMICOS",
  "TECTOS FALSOS":"GESSO CARTONADO",
  "TETO FALSO":"GESSO CARTONADO",
  "TETOS FALSOS":"GESSO CARTONADO",
  "PAREDES":"ALVENARIAS",
  "TELAS":"VÃOS",
  "VEDAÇÃO":"SERRALHARIAS",
  "ESCADAS":"CANTARIAS",
  "BANCADAS":"CANTARIAS",
  "RODAPÉS":"PAVIMENTOS DIVERSOS",
  "FACHADAS":"ETICS",
  "FUNDAÇÕES":"ESTABILIDADE",
  "ESTRUTURAS":"ESTABILIDADE",
  "PAVIMENTO TERREO":"ESTABILIDADE",
  "TRABALHOS PREPARATÓRIOS":"ESTALEIRO",
  "MOV. TERRAS E CP":"MOVIMENTO DE TERRAS E CONTENÇÃO PERIFÉRICA",
  "IMPERM. E ISOLAM.":"IMPERMEABILIZAÇÕES E ISOLAMENTOS",
  "PAV. DIVERSOS":"PAVIMENTOS DIVERSOS",
  "EQ. SANITÁRIOS":"EQUIPAMENTOS SANITÁRIOS",
  "ÁGUAS":"REDE DE ÁGUAS","ESGOTOS":"REDE DE ESGOTOS",
  "PLUVIAIS":"REDE DE ÁGUAS PLUVIAIS","GÁS":"REDE DE GÁS",
  "ELETRICIDADE":"ELETRICIDADE E ILUMINAÇÃO","SEGURANÇA":"SEGURANÇA INTEGRADA",
  "DEMOLIÇÕES":"MOVIMENTO DE TERRAS E CONTENÇÃO PERIFÉRICA",
  "DEMOLICOES":"MOVIMENTO DE TERRAS E CONTENÇÃO PERIFÉRICA",
  "ISOLAMENTOS":"IMPERMEABILIZAÇÕES E ISOLAMENTOS",
  "IMPERMEABILIZAÇÕES E DRENAGENS":"IMPERMEABILIZAÇÕES E ISOLAMENTOS",
  "ESGOTOS DOMÉSTICOS":"REDE DE ESGOTOS",
  "ESGOTOS PLUVIAIS":"REDE DE ÁGUAS PLUVIAIS",
  "ABASTECIMENTO DE ÁGUA":"REDE DE ÁGUAS",
  "REDE DE ÁGUAS DE INCÊNDIO":"SCIE",
  "EQUIPAMENTO SANITÁRIO":"EQUIPAMENTOS SANITÁRIOS",
  "EQUIPAMENTO COZINHA/ COPAS / BARES":"COZINHAS",
  "PÉRGULA E BARBECUE":"PAISAGISMO",
  "INFRAESTRUTURAS VIÁRIAS":"DIVERSOS",
  "INFRAESTRUTURAS ELÉTRICAS":"ELETRICIDADE E ILUMINAÇÃO",
  "TRÂNSITO":"DIVERSOS","TRABALHOS DIVERSOS":"DIVERSOS",
  "SEGURANÇA CONTRA INCÊNDIOS EM EDIFÍCIOS":"SCIE",
  "INFRAESTRUTURAS DE TELECOMUNICAÇÕES EM EDIFÍCIOS":"ITED"
};
/* garante que o capítulo devolvido existe mesmo na lista ativa */
/* compara ignorando conectores e plurais: "REVESTIMENTO PAVIMENTOS",
   "REVESTIMENTOS DE PAVIMENTOS" e "REVESTIMENTO EM PAVIMENTO" passam a
   ser a mesma coisa. Era isto que deixava capítulos por classificar. */
function chaveCap(x){
  return norm(x).replace(/\b(DE|DA|DO|DAS|DOS|EM|E|A|O|AO|AOS)\b/g,' ')
                .replace(/S\b/g,'').replace(/[^A-Z0-9]+/g,' ').trim();
}
function normalizaCap(c){
  if(!c) return null;
  const pre=ALIAS_CAP[c]; if(pre&&CAPS.includes(pre)) return pre;   // equivalência tem prioridade
  if(CAPS.includes(c)) return c;
  const a=ALIAS_CAP[c]; if(a&&CAPS.includes(a)) return a;
  const n=norm(c); const hit=CAPS.find(x=>norm(x)===n); if(hit) return hit;
  const al=Object.keys(ALIAS_CAP).find(k=>norm(k)===n);
  if(al&&CAPS.includes(ALIAS_CAP[al])) return ALIAS_CAP[al];
  /* último recurso: comparação tolerante a conectores e plurais */
  const k=chaveCap(c);
  const direto=CAPS.find(x=>chaveCap(x)===k); if(direto) return direto;
  const viaAlias=Object.keys(ALIAS_CAP).find(x=>chaveCap(x)===k);
  if(viaAlias&&CAPS.includes(ALIAS_CAP[viaAlias])) return ALIAS_CAP[viaAlias];
  return null;
}
function mapCapitulo(txt){
  const t=norm(txt);
  for(const [re,cap] of CAP_MAP){ if(re.test(t)) return cap; }
  return null;
}

function detectPriceCols(rows,H){
  const qt=H.qt;
  const sample=[];
  for(let i=H.row+1;i<rows.length&&sample.length<400;i++){
    const r=rows[i]||[];
    let q=typeof r[qt]==='number'?r[qt]:null;
    if(q==null)for(const c of H.qcols){if(typeof r[c]==='number'){q=r[c];break}}
    if(typeof q==='number'&&q!==0)sample.push({q,r});
  }
  if(sample.length<10) return {pUnit:-1,pTot:-1};
  let maxCol=0; rows.slice(H.row,H.row+60).forEach(r=>{if(r&&r.length>maxCol)maxCol=r.length});
  const excl=new Set([H.code,H.desc,H.un,H.qt,...H.qcols]); // nunca são colunas de preço
  let best=null;
  for(let a=qt+1;a<maxCol;a++){
    if(excl.has(a))continue;
    for(let b=qt+1;b<maxCol;b++){
      if(a===b||excl.has(b))continue;
      let hits=0,tot=0,somaTot=0;
      for(const s of sample){const ua=s.r[a],tb=s.r[b];
        if(typeof ua==='number'&&typeof tb==='number'&&ua>0&&tb>0){tot++;somaTot+=tb;if(Math.abs(s.q*ua-tb)/Math.abs(tb)<0.02)hits++;}}
      // exigir: relação qt×unit=total consistente, muitos artigos, e valores com dimensão de dinheiro
      const medTot=tot?somaTot/tot:0;
      if(tot>=15 && hits/tot>0.85 && medTot>=5 && (!best||hits>best.hits)) best={pUnit:a,pTot:b,hits};
    }
  }
  return best?{pUnit:best.pUnit,pTot:best.pTot}:{pUnit:-1,pTot:-1};
}

function parseSheet(){
  const rows=sheetRows();
  const H=MANUAL_H||detectHeader(rows);
  if(!H) return null;
  if(H.pUnit===-1&&H.pTot===-1){const pc=detectPriceCols(rows,H);H.pUnit=pc.pUnit;H.pTot=pc.pTot;}
  const itens=[]; let curCap=null, curCapRaw=null, letterActive=false, letterMapped=false;
  // 1ª designação da linha pode ter "TÍTULO\ndescrição" — usar só a 1ª linha para deteção de capítulo
  const firstLine=s=>String(s||"").split(/\r?\n/)[0].trim();
  for(let i=H.row+1;i<rows.length;i++){
    const r=rows[i]||[];
    const code=r[H.code]!=null?String(r[H.code]).trim():"";
    const descRaw=r[H.desc]!=null?String(r[H.desc]).trim():"";
    const desc=firstLine(descRaw);
    const un=r[H.un]!=null?String(r[H.un]).trim():"";
    let qt=null;
    for(let k=H.qcols.length-1;k>=0;k--){const v=r[H.qcols[k]];if(typeof v==='number'){qt=v;break}}
    if(qt===null){const v=r[H.qt];if(typeof v==='number')qt=v}
    if(!code&&!descRaw) continue;
    // linhas de soma não são artigos: TOTAL, SUBTOTAL, SOMA, PARCIAL, A TRANSPORTAR, TRANSPORTE
    if(RE_SOMA.test(desc)||RE_SOMA.test(code)) continue;
    const nd=norm(desc);
    // cabeçalho verdadeiro = MAIÚSCULAS no texto original (não title case como "Blocos de Betão")
    const letras=desc.replace(/[^A-Za-zÀ-ÿ]/g,"");
    const upper=letras.length>=3 && letras===letras.toUpperCase();
    const isLetter=/^[A-Z]$/.test(code);
    const isNumTop=/^\d{1,2}\.?$/.test(code);
    const isNumSub=/^\d+\.\d+(\.\d+)*$/.test(code);
    const isAlnumSec=/^[A-ZÇ]{2,5}\.\d+(\.\d+)*\.?$/i.test(code);

    // Capítulo de topo por LETRA (LPU) — trava a hierarquia
    if(isLetter&&desc&&upper&&!un&&qt===null){
      const m=mapCapitulo(desc);
      letterActive=true; letterMapped=!!m;
      curCap=m||null; curCapRaw=desc;   // container que não mapeia (ex.: Arquitetura) → sub-secções preenchem
      itens.push({tipo:'cap',linha:i+1,code,desc,cap:curCap,capRaw:curCapRaw});
      continue;
    }
    // Cabeçalho de secção sem unidade (número de topo OU sub numérico com título em maiúsculas)
    if((isNumTop||isNumSub||isAlnumSec)&&desc&&!un&&qt===null){
      if(upper){
        const m=mapCapitulo(desc);
        if(letterActive){
          // sob uma letra container (não mapeada): a secção define o capítulo (mapeado ou o seu próprio título)
          if(!letterMapped){ curCap=m||norm(desc); curCapRaw=desc; }
        } else if(isNumTop){ curCap=m||norm(desc); curCapRaw=desc; }
        else if(m){ curCap=m; curCapRaw=desc; }          // sub mapeável dá granularidade
        else { curCap=norm(desc); curCapRaw=desc; }
      }
      // se não for maiúsculas (title case) = agrupamento interno: mantém capítulo-pai
      itens.push({tipo:'sub',linha:i+1,code,desc,cap:curCap,capRaw:curCapRaw});
      continue;
    }
    // Artigo medível
    if(un||qt!==null){
      let custo=null;
      const pu=H.pUnit>-1&&typeof r[H.pUnit]==='number'?r[H.pUnit]:null;
      const pt=H.pTot>-1&&typeof r[H.pTot]==='number'?r[H.pTot]:null;
      if(pt!=null&&pt!==0) custo=pt;
      else if(pu!=null&&pu!==0) custo=qt!=null?pu*qt:pu;
      // pu/pt guardados em separado: permitem o teste aritmético e a colheita de preços unitários
      itens.push({tipo:'art',linha:i+1,code,desc:descRaw,un,qt,custo,pu,pt,cap:curCap,capRaw:curCapRaw});
    }
  }
  return itens;
}

/* ================= TESTES ================= */
function runChecks(itens){
  const F=[]; const arts=itens.filter(x=>x.tipo==='art');
  const add=(it,tipo,sev,msg,comentario)=>F.push({it,tipo,sev,msg,comentario,incl:true});

  arts.forEach(a=>{
    if(!a.un) add(a,"Unidade em falta","erro","Artigo medível sem unidade definida.","Favor indicar a unidade de medição deste artigo.");
    if(a.qt===null) add(a,"Quantidade em falta","erro","Artigo sem quantidade.","Favor indicar a quantidade deste artigo — em falta no MQ.");
    else if(a.qt===0) add(a,"Quantidade nula","aviso","Quantidade igual a zero.","Quantidade a zero — confirmar se o artigo foi suprimido ou se é omissão de medição.");
    else if(a.qt<0) add(a,"Quantidade negativa","erro","Quantidade negativa.","Quantidade negativa — corrigir medição.");
  });

  arts.forEach(a=>{
    if(/^vg$|^v\.g/i.test(a.un||"")) add(a,"Valor global (vg)","aviso","Artigo em valor global — sem medição verificável.","Artigo em vg: solicitar decomposição em quantidades mensuráveis para permitir consulta ao mercado.");
  });

  arts.forEach(a=>{
    if(!a.un||!a.desc) return;
    let u=norm(a.un).replace("2","²").toLowerCase();
    if(u==="ml") u="m";
    const composto=/composto por|constitu[íi]d|inclui:|tipo:/i.test(a.desc);
    for(const rule of UNIT_RULES){
      if(rule.skip&&rule.skip.test(a.desc)) continue;
      // artigo já medido em métrica dimensional (m/m²): não sinalizar como "devia ser contável"
      if(rule.esperado[0]==="un"&&(u==="m"||u==="m²")) continue;
      // descrição composta com vários materiais: só a regra de área/linear é fiável
      if(composto&&rule.esperado[0]==="un") continue;
      if(rule.re.test(a.desc)){
        const ok=rule.esperado.some(e=>u===e||u===e.replace("²","2"));
        if(!ok) add(a,"Unidade improvável","aviso",`Descrição sugere ${rule.msg} (${rule.esperado[0]}), mas a unidade é "${a.un}".`,`Confirmar unidade de medição: a descrição sugere medição em ${rule.esperado[0]}, mas o MQ indica "${a.un}".`);
        break;
      }
    }
  });

  /* --- duplicados: exato + aproximado (Jaccard sobre tokens, dentro do mesmo capítulo) --- */
  const seen={}, porCap={};
  arts.forEach(a=>{
    if(!a.desc) return;
    const dn=norm(a.desc).replace(/\s+/g," ").trim();
    if(dn.length<25||a.qt===null||!a.un) return; // ignora organizadores/subtítulos curtos
    const key=(a.cap||"")+"|"+dn;
    if(seen[key]){ add(a,"Possível duplicado","aviso",`Descrição igual ao artigo ${seen[key].code} (linha ${seen[key].linha}).`,`Verificar possível duplicação com o artigo ${seen[key].code}.`); return; }
    seen[key]=a;
    const tk=tokenSet(dn);
    if(tk.size<4) return;
    const lista=porCap[a.cap||""]=porCap[a.cap||""]||[];
    for(const o of lista){
      if(o.a.un!==a.un) continue;
      if(jaccard(tk,o.tk)>=0.82){
        add(a,"Possível duplicado","aviso",
          `Descrição ${fmt(jaccard(tk,o.tk)*100,0)}% coincidente com o artigo ${o.a.code} (linha ${o.a.linha}), na mesma unidade.`,
          `Verificar possível duplicação com o artigo ${o.a.code} — descrições quase idênticas.`);
        break;
      }
    }
    lista.push({a,tk});
  });

  /* --- coerência aritmética e de preço (só quando o mapa vem com preços) --- */
  const comPU=arts.filter(a=>a.pu!=null&&a.pu!==0).length;
  if(comPU>0){
    arts.forEach(a=>{
      if(a.pu==null||a.pt==null||a.qt==null||a.pu===0||a.pt===0) return;
      const esperado=a.pu*a.qt, tol=Math.max(1,Math.abs(a.pt)*0.005);
      if(Math.abs(a.pt-esperado)>tol){
        add(a,"Erro aritmético","erro",
          `Total ${fmt(a.pt,2)} € ≠ quantidade × preço unitário (${fmt(esperado,2)} €).`,
          `O total da linha não corresponde à quantidade multiplicada pelo preço unitário — corrigir (diferença de ${fmt(a.pt-esperado,2)} €).`);
      }
    });
    // preço unitário fora do intervalo histórico da família
    arts.forEach(a=>{
      if(a.pu==null||a.pu<=0) return;
      const fam=familiaArtigo(a.desc,a.un); if(!fam) return;
      const st=PU_STATS[fam+"|"+normUn(a.un)]; if(!st||st.n<3) return;
      if(a.pu<st.p10*0.7||a.pu>st.p90*1.4){
        const dir=a.pu>st.p90?"acima":"abaixo";
        add(a,"Preço unitário atípico","aviso",
          `${fmt(a.pu,2)} €/${a.un} vs. intervalo histórico ${fmt(st.p10,2)}–${fmt(st.p90,2)} (${st.n} obs.).`,
          `Preço unitário ${dir} do intervalo observado nos projetos da Solive para "${fam}" — confirmar âmbito do artigo antes de consultar o mercado.`);
      }
    });
  }

  arts.forEach(a=>{
    if(a.qt===null) return;
    const u=norm(a.un||"").toLowerCase();
    if((u==="un"||u==="und"||u==="uni")&&Math.abs(a.qt%1)>1e-9)
      add(a,"Quantidade fracionada","aviso",`Quantidade ${a.qt} com casas decimais em unidades contáveis.`,"Quantidade fracionada em artigo unitário — confirmar medição.");
    if(a.qt>100000) add(a,"Ordem de grandeza","aviso",`Quantidade invulgarmente elevada (${fmt(a.qt)}).`,"Confirmar ordem de grandeza da quantidade.");
  });

  const capsPresentes=new Set(arts.map(a=>a.cap).filter(Boolean));
  const emFalta=CAPS_ESPERADOS.filter(c=>!capsPresentes.has(c));

  RATIOS=[];
  const gfa=parseFloat(document.getElementById('pGFA').value);

  /* --- agregação por capítulo e unidade: m², m, un E m³ (escavação e betão entravam em falta) --- */
  const agg={};
  arts.forEach(a=>{
    if(!a.cap||a.qt===null||!a.un) return;
    const u=normUn(a.un);
    if(!UNIDADES_RACIO.includes(u)) return;
    const k=a.cap+"|"+u; agg[k]=(agg[k]||0)+a.qt;
  });

  if(gfa>0){
    Object.keys(agg).forEach(k=>{
      const [cap,u]=k.split("|");
      const bench=benchmark(cap,u);            // biblioteca (todos os projetos) com recurso ao L'Urbain
      if(!bench) return;
      const rMQ=agg[k]/gfa, rRef=bench.mediana;
      const desvio=(rMQ-rRef)/rRef;
      RATIOS.push({cap,u,q:agg[k],rMQ,rRef,desvio,n:bench.n,lo:bench.lo,hi:bench.hi,fonte:bench.fonte});
      // com ≥3 projetos o limite é a dispersão observada; com menos, o limite fixo de ±50%
      const foraEnvelope = bench.n>=3 ? (rMQ<bench.lo*0.9||rMQ>bench.hi*1.1) : Math.abs(desvio)>0.5;
      if(foraEnvelope){
        const dir=desvio>0?"acima":"abaixo";
        const criterio = bench.n>=3
          ? `fora do envelope observado em ${bench.n} projetos (${fmt(bench.lo,3)}–${fmt(bench.hi,3)})`
          : `${fmt(Math.abs(desvio)*100,0)}% ${dir} da única referência disponível`;
        add({tipo:'art',code:"—",desc:`Agregado do capítulo ${cap} (${u})`,un:u,qt:agg[k],cap,linha:"—"},
          "Rácio fora do intervalo","aviso",
          `${fmt(rMQ,3)} ${u}/m² ABC vs. ${fmt(rRef,3)} de referência — ${criterio}.`,
          `Quantidade total de ${cap} (${u}) ${fmt(desvio*100,0)}% ${dir} do rácio histórico por m² de ABC — sinal a confirmar contra as peças desenhadas.`);
      }
    });
  }

  /* --- coerência entre capítulos: onde as omissões de medição realmente aparecem --- */
  crossChecks(agg,add);

  return {F,emFalta};
}

/* ================= CUSTOS POR CAPÍTULO ================= */
let CUSTOS={}, CUSTO_TOTAL=0;
function extractCustos(arts){
  const out={}; let tot=0, comPreco=0;
  arts.forEach(a=>{
    if(a.custo!=null){comPreco++; const cap=a.cap||"(sem capítulo)"; out[cap]=(out[cap]||0)+a.custo; tot+=a.custo;}
  });
  return {out,tot,comPreco};
}
function renderCustos(){
  const card=document.getElementById('custoCard');
  const {out,tot,comPreco}=extractCustos(ITENS.filter(x=>x.tipo==='art'));
  CUSTOS=out; CUSTO_TOTAL=tot;
  if(comPreco===0){card.classList.add('hidden');return}
  card.classList.remove('hidden');
  const abc=parseFloat(document.getElementById('pGFA').value)||null;
  const fogos=parseFloat(document.getElementById('pFogos').value)||null;
  document.getElementById('custoResumo').innerHTML=
    `<b>${fmt(tot,0)} €</b> em ${comPreco} artigos com preço`+
    (abc?` · <b>${fmt(tot/abc,0)} €/m² ABC</b>`:"")+
    (fogos?` · <b>${fmt(tot/fogos,0)} €/fogo</b>`:"");
  const tb=document.getElementById('tbCusto'); tb.innerHTML="";
  // ordenar por capítulo standard, maiores primeiro
  Object.entries(out).sort((a,b)=>b[1]-a[1]).forEach(([cap,v])=>{
    const tr=document.createElement('tr');
    tr.innerHTML=`<td>${esc(cap)}</td><td class="num">${fmt(v,0)}</td>
      <td class="num">${tot?fmt(v/tot*100,1)+"%":"—"}</td>
      <td class="num">${abc?fmt(v/abc,0):"—"}</td>`;
    tb.appendChild(tr);
  });
}

/* ================= QUANTIDADES FÍSICAS ================= */
let PHYS={};
// Grandezas físicas: [rótulo, unidade alvo, regex na descrição (ou null), capítulos (ou null)]
const PHYS_DEFS=[
  /* Cada grandeza casa por descrição (regex) OU por capítulo. Os capítulos têm de
     ser os nomes ATUAIS dos 33 standard: depois da normalização, "REVESTIMENTO
     PAVIMENTOS" passa a "PAVIMENTOS DIVERSOS", e as definições antigas deixavam
     de casar — era por isso que faltavam quantidades no Comparar. */
  ["Escavação","m³",/escava|abertura de caixa|desaterro/i,["MOVIMENTO DE TERRAS E CONTENÇÃO PERIFÉRICA"]],
  ["Aterro","m³",/aterro|enchimento/i,null],
  ["Transporte a vazadouro","m³",/vazadouro|transporte a dep|carga.*transporte/i,null],
  ["Betão e estruturas","m³",/bet[ãa]o|maci[çc]o|sapata|\blaje|\bviga\b|\bpilar|muro de bet/i,["ESTABILIDADE"]],
  ["Cofragem","m²",/cofrag/i,null],
  ["Aço em varão","kg",/var[ãa]o|armadura|a[çc]o a500/i,null],
  ["Fachada / ETICS","m²",/fachada|etics|capoto/i,["ETICS"]],
  ["Cerâmicos","m²",/cer[âa]mic|mosaico|gr[ée]s|porcelan/i,["CERÂMICOS"]],
  ["Revestimentos de pavimentos","m²",/pavimento|soalho|flutuante|v[íi]nil|linóleo/i,["PAVIMENTOS DIVERSOS"]],
  ["Pinturas","m²",/pintura|esmalte|tinta/i,["PINTURAS"]],
  ["Gesso cartonado","m²",/gesso cartonado|pladur|te[ct]?to falso/i,["GESSO CARTONADO"]],
  ["Alvenarias","m²",/alvenaria|tijolo|bloco de bet/i,["ALVENARIAS"]],
  ["Impermeabilizações","m²",/impermeabiliza|tela asf[áa]lt|membrana/i,["IMPERMEABILIZAÇÕES E ISOLAMENTOS"]],
  ["Carpintarias","un",/porta interior|roupeiro|arm[áa]rio/i,["CARPINTARIAS"]],
  ["Vãos / caixilharia","un",/caixilhar|janela|porta exterior/i,["VÃOS"]]
];
function uEq(u,alvo){
  u=norm(u).replace("2","²").replace("3","³").toLowerCase();
  if(u==="ml")u="m";
  return u===alvo||u===alvo.replace("²","2").replace("³","3");
}
function extractPhys(arts){
  const out={};
  /* Cada artigo conta UMA só vez, na grandeza mais específica que o descreve.
     Antes, "regex OU capítulo" fazia com que qualquer m³ do capítulo MOVIMENTO
     DE TERRAS entrasse na escavação — aterros incluídos, o que inflacionava
     o número e estragava o rácio escavação/implantação. */
  const usado=new Set();
  const passa=(pass)=>PHYS_DEFS.forEach(([rot,un,rx,caps],idx)=>{
    let soma=0,houve=false;
    arts.forEach((a,ai)=>{
      if(usado.has(ai))return;
      if(a.qt==null||!a.un||!uEq(a.un,un))return;
      const okDesc=rx?rx.test(a.desc||""):false;
      const okCap=caps?caps.includes(a.cap):false;
      const match = pass===1 ? okDesc : okCap;    // 1ª volta: descrição (específica)
      if(match){soma+=a.qt;houve=true;usado.add(ai);}
    });
    if(houve){ out[rot]=out[rot]||{un,q:0}; out[rot].q+=soma; }
  });
  passa(1);   // primeiro por descrição
  passa(2);   // depois o que sobrar, por capítulo
  return out;
}
function renderPhys(){
  const tb=document.getElementById('tbPhys');tb.innerHTML="";
  const abc=parseFloat(document.getElementById('pGFA').value)||null;
  const keys=Object.keys(PHYS);
  document.getElementById('noPhys').classList.toggle('hidden',keys.length>0);
  keys.forEach(k=>{
    const m=PHYS[k];
    const tr=document.createElement('tr');
    tr.innerHTML=`<td>${esc(k)}</td><td class="mono">${esc(m.un)}</td>
      <td class="num">${fmt(m.q,1)}</td>
      <td class="num">${abc?fmt(m.q/abc,3):"—"}</td>`;
    tb.appendChild(tr);
  });
}

/* ================= EXECUÇÃO (analisador) ================= */
function ehPricingSheet(wbk){
  if(!wbk) return false;
  const nomes=wbk.SheetNames.map(n=>norm(n));
  const temResumo=nomes.some(n=>/SELLING SHEET|WRAP UP/.test(n));
  let folhasCap=0;
  wbk.SheetNames.forEach(n=>{
    if(FOLHAS_IGNORAR.test(norm(n)))return;
    try{
      const rows=XLSX.utils.sheet_to_json(wbk.Sheets[n],{header:1,raw:true,defval:null});
      if(ehFolhaCapitulo(rows)>=0) folhasCap++;
    }catch(e){}
  });
  return temResumo && folhasCap>=8;
}
function _runAnalysis(){
  /* Se o livro é um pricing sheet, analisar só a folha escolhida deixa de fora
     a maior parte das quantidades — a arquitetura é uma folha entre trinta.
     Passa a ler tudo automaticamente, sem depender de o utilizador saber que
     existe outro botão. */
  if(typeof workbook!=='undefined'&&workbook&&ehPricingSheet(workbook)){
    return analisarPricingCompleto();
  }
  return _runAnalysisSimples();
}
function _runAnalysisSimples(){
  if(!workbook||!chosenSheet){alertx("Carrega primeiro o ficheiro do mapa de quantidades.");return}
  const itens=parseSheet();
  if(!itens){
    openMapper();
    document.getElementById('mErr').textContent="Não reconheci automaticamente o cabeçalho desta folha — indica as colunas manualmente.";
    return;
  }
  ITENS=itens;
  const arts=itens.filter(x=>x.tipo==='art');
  if(!arts.length){
    openMapper();
    document.getElementById('mErr').textContent="Não encontrei artigos medíveis com o mapeamento atual — confirma as colunas.";
    return;
  }
  const caps=[...new Set(arts.map(a=>a.cap).filter(Boolean))];
  const {F,emFalta}=runChecks(itens);
  FINDINGS=F;

  document.getElementById('results').classList.remove('hidden');
  document.getElementById('rFicheiro').textContent=wbName+" · "+chosenSheet;
  document.getElementById('kArtigos').textContent=arts.length;
  document.getElementById('kCaps').textContent=caps.length;
  document.getElementById('kErros').textContent=F.filter(f=>f.sev==='erro').length;
  document.getElementById('kAvisos').textContent=F.filter(f=>f.sev==='aviso').length;
  document.getElementById('kInfo').textContent=F.filter(f=>f.sev==='info').length;

  const cf=document.getElementById('capsFalta');
  if(emFalta.length){
    cf.classList.remove('hidden');
    cf.innerHTML="<b>Capítulos esperados sem artigos neste MQ:</b> "+emFalta.map(esc).join(" · ")+".<br>Possível omissão — confirmar se são aplicáveis a este projeto antes de reportar aos projetistas.";
  } else { cf.classList.add('hidden'); }

  const fT=document.getElementById('fTipo');
  fT.innerHTML='<option value="">Todos</option>'+[...new Set(F.map(f=>f.tipo))].map(t=>`<option>${esc(t)}</option>`).join("");
  const fC=document.getElementById('fCap');
  fC.innerHTML='<option value="">Todos</option>'+caps.map(c=>`<option>${esc(c)}</option>`).join("");

  PHYS=extractPhys(arts);
  renderFindings(); renderRatios(); renderPhys(); renderCustos();
  document.getElementById('btnGravarOrcamento').classList.toggle('hidden',!(SESSION&&CUSTO_TOTAL>0));
  document.getElementById('results').scrollIntoView({behavior:'smooth'});
}

function _renderFindings(){
  const sev=document.getElementById('fSev').value, tipo=document.getElementById('fTipo').value, cap=document.getElementById('fCap').value;
  const soPend=(document.getElementById('fRes')||{}).value==='pend';
  const tb=document.getElementById('tbFindings'); tb.innerHTML="";
  const rows=FINDINGS.map((f,i)=>({f,i})).filter(({f})=>(!sev||f.sev===sev)&&(!tipo||f.tipo===tipo)&&(!cap||f.it.cap===cap)&&(!soPend||!f.resolvido));
  document.getElementById('noFindings').classList.toggle('hidden',rows.length>0);
  const sevLabel={erro:"Erro",aviso:"Aviso",info:"Nota"};
  rows.forEach(({f,i})=>{
    const tr=document.createElement('tr');
    if(f.resolvido) tr.className='resolved';
    tr.innerHTML=`<td><input type="checkbox" class="rescb" data-r="${i}" ${f.resolvido?'checked':''} title="Marcar como tratado"></td>
      <td class="mono">${esc(f.it.code||"—")}</td>
      <td>${esc((f.it.desc||"").slice(0,140))}<div style="color:#8794a8;font-size:12px;margin-top:2px">${esc(f.msg)}</div></td>
      <td class="mono">${esc(f.it.un||"—")}</td>
      <td class="num">${f.it.qt==null?"—":fmt(f.it.qt)}</td>
      <td style="font-size:12px">${esc(f.it.cap||f.it.capRaw||"—")}</td>
      <td style="font-size:12px">${esc(f.tipo)}</td>
      <td><span class="sevchip sev-${f.sev}">${sevLabel[f.sev]}</span></td>
      <td><textarea class="fcomment" data-i="${i}">${esc(f.comentario)}</textarea></td>`;
    tb.appendChild(tr);
  });
  tb.querySelectorAll('.fcomment').forEach(t=>t.addEventListener('input',e=>{FINDINGS[+e.target.dataset.i].comentario=e.target.value}));
  tb.querySelectorAll('.rescb').forEach(c=>c.addEventListener('change',e=>{
    FINDINGS[+e.target.dataset.r].resolvido=e.target.checked; guardarTriagem(); renderFindings();
  }));
}

function renderRatios(){
  const tb=document.getElementById('tbRatios'); tb.innerHTML="";
  document.getElementById('noRatios').classList.toggle('hidden',RATIOS.length>0);
  RATIOS.sort((a,b)=>Math.abs(b.desvio)-Math.abs(a.desvio)).forEach(r=>{
    const c=Math.abs(r.desvio)>0.5?"var(--err)":Math.abs(r.desvio)>0.25?"var(--warn)":"var(--ok)";
    const tr=document.createElement('tr');
    tr.innerHTML=`<td>${esc(r.cap)}</td><td class="mono">${esc(r.u)}</td>
      <td class="num">${fmt(r.q)}</td><td class="num">${fmt(r.rMQ,3)}</td><td class="num">${fmt(r.rRef,3)}</td>
      <td class="num" style="color:${c};font-weight:600">${r.desvio>0?"+":""}${fmt(r.desvio*100,0)}%</td>`;
    tb.appendChild(tr);
  });
}

/* ================= EXPORTS / GRAVAÇÃO ================= */
function envelopeInputs(){
  const n=id=>+document.getElementById(id).value||null;
  return {gfa:n('pGFA'),gca:n('pGCA'),ac_abaixo:n('pAbaixo'),fogos:n('pFogos'),
    pisos_acima:n('pPisosAcima'),pisos_enterrados:n('pPisosAbaixo'),
    area_implantacao:n('pImplantacao'),area_lote:n('pLote'),estacionamento:n('pEstacionamento'),
    segmento:(CTX.D&&CTX.D.segmento)||null};
}
function analysisPayload(){
  return {
    plataforma:"Solive Orçamentação v2", exportado:new Date().toISOString(),
    projeto:Object.assign({nome:document.getElementById('pNome').value||"Projeto",fase:document.getElementById('pFase').value},envelopeInputs()),
    ficheiro:wbName,folha:chosenSheet,
    artigos:ITENS.filter(x=>x.tipo==='art'),
    alertas:FINDINGS.map(f=>({code:f.it.code,desc:f.it.desc,un:f.it.un,qt:f.it.qt,cap:f.it.cap,tipo:f.tipo,sev:f.sev,comentario:f.comentario})),
    racios:RATIOS, quantidades_fisicas:PHYS
  };
}
function exportComentarios(){
  if(!FINDINGS.length){alertx("Sem alertas para exportar.");return}
  const nome=document.getElementById('pNome').value||"Projeto";
  const hdr=["Código","Descrição do artigo","Un","Qt.","Capítulo","Tipo de alerta","Severidade","Comentário para projetista"];
  const sevLabel={erro:"Erro",aviso:"Aviso",info:"Nota"};
  const data=FINDINGS.map(f=>[f.it.code||"",f.it.desc||"",f.it.un||"",f.it.qt==null?"":f.it.qt,f.it.cap||f.it.capRaw||"",f.tipo,sevLabel[f.sev],f.comentario||""]);
  const ws=XLSX.utils.aoa_to_sheet([["SOLIVE — Revisão do Mapa de Quantidades"],["Projeto: "+nome+"   ·   Ficheiro: "+wbName+"   ·   Data: "+new Date().toLocaleDateString('pt-PT')],[],hdr,...data]);
  ws['!cols']=[{wch:10},{wch:70},{wch:6},{wch:10},{wch:26},{wch:22},{wch:10},{wch:70}];
  const wb=XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb,ws,"Comentários MQ");
  XLSX.writeFile(wb,("Comentarios_MQ_"+nome).replace(/\s+/g,"_")+".xlsx");
}
function exportJSON(){
  const nome=document.getElementById('pNome').value||"Projeto";
  const a=document.createElement('a');
  a.href=URL.createObjectURL(new Blob([JSON.stringify(analysisPayload(),null,1)],{type:'application/json'}));
  a.download=("Analise_MQ_"+nome).replace(/\s+/g,"_")+".json"; a.click();
}
let TRACK_LAST=null;
function trackChanges(oldA,newA){
  const keyC=a=>String(a.code||"").trim();
  const nd=a=>norm(a.desc||"").replace(/\s+/g," ");
  const oldByCode={},oldByDesc={};
  oldA.forEach(a=>{const k=keyC(a);if(k&&!oldByCode[k])oldByCode[k]=a;const d=nd(a);if(d&&!oldByDesc[d])oldByDesc[d]=a;});
  const usedOld=new Set(); const added=[],changed=[];
  newA.forEach(a=>{
    let m=null; const k=keyC(a);
    if(k&&oldByCode[k]&&!usedOld.has(oldByCode[k]))m=oldByCode[k];
    else if(oldByDesc[nd(a)]&&!usedOld.has(oldByDesc[nd(a)]))m=oldByDesc[nd(a)];
    if(m){
      usedOld.add(m);
      const dq=(m.qt==null?null:+m.qt)!==(a.qt==null?null:+a.qt);
      const du=norm(m.un||"")!==norm(a.un||"");
      const dd=nd(m)!==nd(a);
      if(dq||du||dd)changed.push({code:a.code,desc:a.desc,cap:a.cap,oldQt:m.qt,newQt:a.qt,oldUn:m.un,newUn:a.un,dq,du,dd});
    } else added.push(a);
  });
  const removed=oldA.filter(a=>!usedOld.has(a));
  return {added,removed,changed};
}
async function compareRevisions(){
  if(!SESSION){toast("Inicia sessão — o histórico de análises vem da biblioteca.");return}
  const nome=document.getElementById('pNome').value.trim();
  if(!nome){toast("Indica o nome do projeto (passo 1) para encontrar a revisão anterior.");return}
  const proj=PROJETOS.find(p=>norm(p.nome)===norm(nome));
  if(!proj){alertx("Ainda não há análises gravadas para \""+nome+"\". Grava esta como primeira revisão.");return}
  const {data:ans}=await sb.from('analises').select('*').eq('projeto_id',proj.id).order('criado',{ascending:false}).limit(5);
  if(!ans||!ans.length){alertx("Sem análise anterior gravada para este projeto.");return}
  // usar a mais recente de OUTRO ficheiro; se todas forem do mesmo, usar a anterior à última
  let prevRow=ans.find(a=>a.payload&&a.payload.ficheiro&&a.payload.ficheiro!==wbName);
  if(!prevRow&&ans.length>1)prevRow=ans[1];
  if(!prevRow)prevRow=ans[0];
  const prev=prevRow.payload;
  const oldArts=(prev&&prev.artigos)||[];
  if(!oldArts.length){alertx("A análise anterior não tem artigos guardados para comparar.");return}
  const newArts=ITENS.filter(x=>x.tipo==='art');
  const diff=trackChanges(oldArts,newArts);
  TRACK_LAST={nome,prevFile:prev.ficheiro||"",prevDate:prevRow.criado,diff};
  renderTrack();
}
function renderTrack(){
  const {diff}=TRACK_LAST;
  document.getElementById('trackTag').textContent="anterior: "+(TRACK_LAST.prevFile||"—");
  document.getElementById('tkAdd').textContent=diff.added.length;
  document.getElementById('tkRem').textContent=diff.removed.length;
  document.getElementById('tkChg').textContent=diff.changed.length;
  document.getElementById('trackKpis').classList.remove('hidden');
  document.getElementById('btnExportTrack').classList.remove('hidden');
  const tb=document.getElementById('tbTrack'); tb.innerHTML="";
  const total=diff.added.length+diff.removed.length+diff.changed.length;
  const tbl=document.getElementById('trackTable'), emp=document.getElementById('trackEmpty');
  if(!total){tbl.classList.add('hidden');emp.classList.remove('hidden');emp.textContent="Sem diferenças detetadas face à revisão anterior.";return}
  tbl.classList.remove('hidden'); emp.classList.add('hidden');
  const row=(code,desc,cap,tipo,det,cls)=>{
    const tr=document.createElement('tr');
    tr.innerHTML=`<td class="mono">${esc(code||"—")}</td><td>${esc((desc||"").slice(0,120))}</td>
      <td style="font-size:12px">${esc(cap||"—")}</td>
      <td><span class="sevchip ${cls}">${tipo}</span></td><td style="font-size:12px">${esc(det)}</td>`;
    tb.appendChild(tr);
  };
  diff.changed.forEach(c=>{
    const det=[c.dq?`qt ${fmt(c.oldQt)}→${fmt(c.newQt)}`:"",c.du?`un ${c.oldUn||"—"}→${c.newUn||"—"}`:"",c.dd?"descrição alterada":""].filter(Boolean).join(" · ");
    row(c.code,c.desc,c.cap,"Alterado",det,"sev-aviso");
  });
  diff.added.forEach(a=>row(a.code,a.desc,a.cap,"Novo",`qt ${fmt(a.qt)} ${esc(a.un||"")}`,"sev-info"));
  diff.removed.forEach(a=>row(a.code,a.desc,a.cap,"Removido",`estava: qt ${fmt(a.qt)} ${esc(a.un||"")}`,"sev-erro"));
}
function exportTrack(){
  if(!TRACK_LAST){toast("Corre a comparação primeiro.");return}
  const {diff,nome,prevFile}=TRACK_LAST;
  const head=[["SOLIVE — TRACK CHANGES DO MAPA DE QUANTIDADES"],
    ["Projeto: "+nome+"   ·   Revisão anterior: "+(prevFile||"—")+"   ·   Atual: "+wbName+"   ·   Data: "+new Date().toLocaleDateString('pt-PT')],
    ["Resumo: "+diff.added.length+" adicionados · "+diff.removed.length+" removidos · "+diff.changed.length+" alterados"],
    [],
    ["Código","Descrição","Capítulo","Alteração","Detalhe"]];
  const body=[];
  diff.changed.forEach(c=>{const det=[c.dq?`qt ${c.oldQt}->${c.newQt}`:"",c.du?`un ${c.oldUn||"-"}->${c.newUn||"-"}`:"",c.dd?"descrição alterada":""].filter(Boolean).join(" · ");body.push([c.code||"",c.desc||"",c.cap||"","Alterado",det]);});
  diff.added.forEach(a=>body.push([a.code||"",a.desc||"",a.cap||"","Novo",`qt ${a.qt} ${a.un||""}`]));
  diff.removed.forEach(a=>body.push([a.code||"",a.desc||"",a.cap||"","Removido",`estava: qt ${a.qt} ${a.un||""}`]));
  const ws=XLSX.utils.aoa_to_sheet(head.concat(body));
  ws['!cols']=[{wch:10},{wch:64},{wch:24},{wch:12},{wch:40}];
  const wb=XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb,ws,"Track changes");
  XLSX.writeFile(wb,("TrackChanges_"+nome).replace(/[^\w]+/g,"_")+".xlsx");
}
async function _gravarAnalise(){
  if(!SESSION){toast("Sem sessão ativa.");return false}
  const nome=document.getElementById('pNome').value.trim();
  if(!nome){toast("Indica o nome do projeto (passo 1) antes de gravar.");return false}
  const env=envelopeInputs();
  let proj=PROJETOS.find(p=>norm(p.nome)===norm(nome));
  // Hierarquia: as quantidades reais do auto (fase Real) mandam sobre as de um MQ preliminar.
  let temReal=false;
  if(proj){
    const {data:fr}=await sb.from('fases').select('id').eq('projeto_id',proj.id).eq('fase','Real').limit(1);
    temReal=!!(fr&&fr.length);
  }
  const attrs=Object.assign({nome},env, temReal?{}:{metricas:PHYS});
  if(!proj){
    const {data,error}=await sb.from('projetos').insert(attrs).select().single();
    if(error){alertx("Erro a criar o projeto: "+error.message);return false}
    proj=data;
  }else{
    // atualizar descritores; métricas só se a obra ainda não estiver fechada
    const upd={}; if(!temReal)upd.metricas=PHYS;
    Object.keys(env).forEach(k=>{if(env[k]!=null)upd[k]=env[k]});
    if(Object.keys(upd).length){
      const {error}=await sb.from('projetos').update(upd).eq('id',proj.id);
      if(error){alertx("Erro a atualizar o projeto: "+error.message);return false}
    }
  }
  await loadProjetos();
  const {error}=await sb.from('analises').insert({projeto_id:proj.id,nome,ficheiro:wbName,payload:analysisPayload()});
  if(error){alertx("Erro a gravar a análise: "+error.message);return false}
  toast("Análise e descritores gravados — projeto "+proj.nome+"."+(temReal?" (quantidades reais da obra preservadas)":""));
  return true;
}

async function _saveOrcamentoBase(){
  if(!SESSION){toast("Sem sessão ativa.");return}
  if(!CUSTO_TOTAL){alertx("Não há custos extraídos para gravar.");return}
  const nome=document.getElementById('pNome').value.trim();
  if(!nome){toast("Indica o nome do projeto (passo 1) antes de gravar.");return}
  const env=envelopeInputs();
  let proj=PROJETOS.find(p=>norm(p.nome)===norm(nome));
  if(!proj){
    const {data,error}=await sb.from('projetos').insert(Object.assign({nome,metricas:PHYS},env)).select().single();
    if(error){alertx("Erro a criar o projeto: "+error.message);return}
    proj=data;
  }else{
    const upd={metricas:PHYS}; Object.keys(env).forEach(k=>{if(env[k]!=null)upd[k]=env[k]});
    await sb.from('projetos').update(upd).eq('id',proj.id);
  }
  await loadProjetos();
  await resolveFaseExistente(proj.id,'Orçamento');
  const caps=Object.entries(CUSTOS).filter(([c])=>c!=="(sem capítulo)").map(([cap,total])=>({fase_id:null,cap,total}));
  const totalHard=caps.reduce((s,c)=>s+c.total,0);
  const {data:fase,error}=await sb.from('fases').insert({
    projeto_id:proj.id,fase:'Orçamento',etiqueta:document.getElementById('pFase').value+' · '+wbName,
    data:new Date().toISOString().slice(0,10),total:totalHard
  }).select().single();
  if(error){alertx("Erro a criar a fase: "+error.message);return}
  caps.forEach(c=>c.fase_id=fase.id);
  const {error:e2}=await sb.from('capitulos').insert(caps);
  if(e2){alertx("Erro a gravar capítulos: "+e2.message);return}
  toast("Orçamento gravado — "+caps.length+" capítulos, "+fmt(totalHard,0)+" € (hard costs).");
}
async function saveOrcamento(){ const r=await _saveOrcamentoBase(); invalidarSnapshot(); return r; }


/* ---- alocação dos trabalhos adicionais que o classificador não reconheceu ---- */
async function resolveFaseExistente(projeto_id,faseTipo){
  // Se já existe fase deste tipo, pergunta: substituir a(s) anterior(es) ou guardar como nova versão.
  const {data:existing}=await sb.from('fases').select('id,data,etiqueta').eq('projeto_id',projeto_id).eq('fase',faseTipo);
  if(!existing||!existing.length) return;
  const latest=existing.slice().sort((a,b)=>(b.data||'').localeCompare(a.data||''))[0];
  const rep=confirm("Já existe "+existing.length+" fase(s) "+faseTipo+" para este projeto (mais recente: "+(latest.data||"sem data")+(latest.etiqueta?" · "+latest.etiqueta:"")+").\n\nOK = substituir a(s) versão(ões) anterior(es) pela nova.\nCancelar = guardar como nova versão, mantendo o histórico (o estimador usa sempre a mais recente).");
  if(rep){
    const ids=existing.map(f=>f.id);
    await sb.from('capitulos').delete().in('fase_id',ids);
    await sb.from('fases').delete().in('id',ids);
    toast("Versão anterior substituída.");
  }
}

APP_REGISTAR('04-analisador','2.7.2');
