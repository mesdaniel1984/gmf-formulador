(function(root){
  'use strict';
  const DAY=86400000;
  const offset=(d,n)=>new Date(Date.parse(d+'T12:00:00Z')+n*DAY).toISOString().slice(0,10);
  const distance=(a,b)=>Math.round((Date.parse(b+'T12:00:00Z')-Date.parse(a+'T12:00:00Z'))/DAY);
  const median=values=>{const a=values.slice().sort((a,b)=>a-b),i=Math.floor(a.length/2);return a.length?(a.length%2?a[i]:(a[i-1]+a[i])/2):null;};
  function build(data,opt,day){
    const source=opt.source==='sac'?'sac':'ncs',today=opt.today;
    const raw=data.fontes&&data.fontes[source],rows=raw&&raw.registros;
    if(!Array.isArray(rows))return {available:false,source};
    const from=day(opt.from),to=day(opt.to),closedStatus=source==='sac'?'Encerrada':'Fechada';
    const state=r=>r.status===closedStatus?'closed':['Aberta','Em tratativa','Em tratamento','Em andamento','Pendente'].includes(r.status)?'open':'unknown';
    const inPeriod=(r,a,b)=>{if(!a&&!b)return true;const d=day(r.data);return !!d&&(!a||d>=a)&&(!b||d<=b);};
    const cohort=rows.filter(r=>inPeriod(r,from,to)),closed=cohort.filter(r=>state(r)==='closed'),known=cohort.filter(r=>state(r)!=='unknown');
    const open=rows.filter(r=>state(r)==='open');
    const withDue=open.filter(r=>day(r.prazo)),overdue=withDue.filter(r=>day(r.prazo)<today);
    const ages=open.map(r=>({r,date:day(r.data)})).filter(x=>x.date&&x.date<=today).map(x=>({r:x.r,days:distance(x.date,today)}));
    const bins=[{label:'0–7 dias',min:0,max:7},{label:'8–30 dias',min:8,max:30},{label:'31–60 dias',min:31,max:60},{label:'Mais de 60 dias',min:61,max:Infinity}].map(b=>({...b,rows:ages.filter(x=>x.days>=b.min&&x.days<=b.max).map(x=>x.r)}));
    let comparison=null;
    if(from&&to&&from<=to&&to<=today){
      const days=distance(from,to)+1,previousFrom=offset(from,-days),previousTo=offset(from,-1);
      const previous=rows.filter(r=>inPeriod(r,previousFrom,previousTo));
      comparison={previous:previous.length,previousFrom,previousTo,current:cohort.length,delta:cohort.length-previous.length,pct:previous.length?100*(cohort.length-previous.length)/previous.length:null};
    }
    const end=to||today,start=from||offset(end,-179),span=distance(start,end)+1;
    const trend=[];
    if(span>0){const n=Math.min(6,span);for(let i=0;i<n;i++){
      const a=offset(start,Math.floor(i*span/n)),b=offset(start,Math.floor((i+1)*span/n)-1);
      trend.push({from:a,to:b,rows:rows.filter(r=>inPeriod(r,a,b))});
    }}
    const grouped=new Map();cohort.forEach(r=>{const name=String(r.titulo||'').trim()||'Produto não informado';if(!grouped.has(name))grouped.set(name,[]);grouped.get(name).push(r);});
    const products=Array.from(grouped,([label,rs])=>({label,rows:rs})).sort((a,b)=>b.rows.length-a.rows.length||a.label.localeCompare(b.label));
    const pareto=products.slice(0,5);if(products.length>5)pareto.push({label:'Demais produtos',rows:products.slice(5).flatMap(p=>p.rows)});
    let cumulative=0;pareto.forEach(p=>{cumulative+=p.rows.length;p.share=cohort.length?100*p.rows.length/cohort.length:null;p.cumulative=cohort.length?100*cumulative/cohort.length:null;});
    const people=new Map();open.forEach(r=>{const name=String(r.responsavel||'').trim()||'Responsável não informado';if(!people.has(name))people.set(name,[]);people.get(name).push(r);});
    const owners=Array.from(people,([name,rs])=>({name,rows:rs,overdue:rs.filter(r=>day(r.prazo)&&day(r.prazo)<today).length,withoutDue:rs.filter(r=>!day(r.prazo)).length})).sort((a,b)=>b.overdue-a.overdue||b.rows.length-a.rows.length||a.name.localeCompare(b.name));
    return {available:true,source,updated:raw.atualizado_em,cohort,closed,known,open,withDue,overdue,ages,bins,comparison,trend,pareto,owners,
      closure:known.length?100*closed.length/known.length:null,lateRate:withDue.length?100*overdue.length/withDue.length:null,
      medianAge:median(ages.map(x=>x.days)),missingDate:rows.filter(r=>!day(r.data)).length,
      futureDate:rows.filter(r=>day(r.data)>today).length,unknownStatus:rows.filter(r=>state(r)==='unknown').length,
      unknownAge:open.length-ages.length,withoutDue:open.length-withDue.length,rows};
  }
  function render(host,m,onRows){
    const node=(tag,text,cls)=>{const e=document.createElement(tag);if(text!==undefined)e.textContent=text;if(cls)e.className=cls;return e;};
    const fmt=n=>n===null?'—':new Intl.NumberFormat('pt-BR',{maximumFractionDigits:1}).format(n);
    const click=(title,rows,detail)=>{const b=node('button',title,'analysis-link');b.type='button';b.onclick=()=>onRows(title,rows,detail);return b;};
    const panel=(title,sub)=>{const s=node('section',undefined,'analysis-panel');s.append(node('h2',title),node('p',sub,'hint'));return s;};
    host.replaceChildren();
    if(!m.available){host.append(node('p','Fonte indisponível. Nenhum indicador foi calculado.','analysis-empty'));return;}
    const name=m.source==='sac'?'SAC':'NC';
    const summary=node('div',undefined,'analysis-summary');summary.append(node('span','LEITURA EXECUTIVA','eyebrow'));
    let message=m.open.length+' '+name+' em aberto hoje. '+m.overdue.length+' com prazo vencido';
    if(m.withoutDue)message+=' e '+m.withoutDue+' sem prazo válido';
    message+='.';
    if(m.ages.length)message+=' A pendência mais antiga tem '+Math.max(...m.ages.map(a=>a.days))+' dias.';
    summary.append(node('p',message));
    const priority=m.overdue.length?'Prioridade: revisar os vencidos e negociar responsáveis e prazos.':m.withoutDue?'Prioridade: definir prazos para as pendências sem data.':m.unknownStatus?'Prioridade: classificar os registros sem situação reconhecida.':'Revise a concentração de ocorrências e acompanhe as pendências abertas.';
    summary.append(node('p',priority,'hint'));host.append(summary);
    const kpis=node('div',undefined,'analysis-kpis');
    const comparison=m.comparison?(m.comparison.previous===0?'Período anterior: 0 · variação percentual não aplicável':(m.comparison.pct>=0?'+':'')+fmt(m.comparison.pct)+'% vs. período anterior ('+m.comparison.previous+')'):'Selecione início e fim até hoje para comparar períodos iguais.';
    const cards=[
      ['Ocorrências registradas',m.cohort.length,comparison,m.cohort,'Registros abertos no período selecionado; variação é volume, não taxa de qualidade.'],
      ['Encerradas na coorte',m.closure===null?'—':fmt(m.closure)+'%',m.closed.length+' de '+m.known.length+' com situação reconhecida',m.closed,'Situação atual dos registros abertos no período. Não mede prazo de resolução nem encerramentos ocorridos no período.'],
      ['Pendências vencidas',m.lateRate===null?'—':fmt(m.lateRate)+'%',m.overdue.length+' de '+m.withDue.length+' abertas com prazo · '+m.withoutDue+' sem prazo',m.overdue,'Estoque atual, independente do período. Vencido = prazo anterior a hoje; sem prazo não entra no denominador.'],
      ['Idade mediana em aberto',m.medianAge===null?'—':fmt(m.medianAge)+' dias',m.ages.length+' com data válida · '+m.unknownAge+' sem idade calculável',m.ages.map(x=>x.r),'Dias desde a abertura até hoje. Não é tempo de resolução. Estoque atual, independente do período.']
    ];
    cards.forEach(([label,value,sub,rows,definition])=>{const b=node('button',undefined,'analysis-kpi');b.type='button';b.append(node('span',label),node('strong',String(value)),node('small',sub));b.onclick=()=>onRows(label,rows,definition);kpis.append(b);});host.append(kpis);
    if(m.comparison)host.append(node('p','Comparação: '+m.comparison.previousFrom+' a '+m.comparison.previousTo+' versus o período selecionado.','hint'));
    const charts=node('div',undefined,'analysis-grid');
    const trend=panel('Evolução das ocorrências','Aberturas por intervalo. Sem filtro: últimos 180 dias. As datas e contagens permanecem acessíveis nos botões.');
    const max=Math.max(1,...m.trend.map(t=>t.rows.length));
    m.trend.forEach(t=>{const b=node('button',undefined,'analysis-bar');b.type='button';b.setAttribute('aria-label',t.from+' a '+t.to+': '+t.rows.length+' registros');
      b.append(node('span',t.from+' → '+t.to,'bar-label'),node('strong',String(t.rows.length)));
      const track=node('span',undefined,'bar-track'),fill=node('span',undefined,'bar-fill');fill.style.width=(100*t.rows.length/max)+'%';track.append(fill);b.append(track);b.onclick=()=>onRows('Aberturas: '+t.from+' a '+t.to,t.rows,'Somente datas válidas dentro do intervalo.');trend.append(b);
    });charts.append(trend);
    const pareto=panel('Concentração por produto','Volume de ocorrências no período. Participação e percentual acumulado; não mede defeitos por unidade vendida.');
    if(!m.pareto.length)pareto.append(node('p','Nenhuma ocorrência no período.','analysis-empty'));
    m.pareto.forEach(p=>{const b=node('button',undefined,'analysis-bar');b.type='button';b.append(node('span',p.label,'bar-label'),node('strong',p.rows.length+' · '+fmt(p.share)+'%'),node('small','Acumulado: '+fmt(p.cumulative)+'%'));
      const track=node('span',undefined,'bar-track'),fill=node('span',undefined,'bar-fill');fill.style.width=p.share+'%';track.append(fill);b.append(track);b.onclick=()=>onRows(p.label,p.rows,'Agrupamento pelo nome registrado. Não comprova recorrência da mesma causa.');pareto.append(b);
    });charts.append(pareto);host.append(charts);
    const management=node('div',undefined,'analysis-grid');
    const aging=panel('Envelhecimento das pendências','Estoque aberto atual. Clique numa faixa para priorizar a revisão.');
    m.bins.forEach(b=>{const item=node('div',undefined,'analysis-line');item.append(click(b.label,b.rows,'Idade desde a abertura, em dias corridos.'),node('strong',String(b.rows.length)));aging.append(item);});
    aging.append(node('p',m.unknownAge+' abertas sem idade calculável (data ausente, inválida ou futura).','hint'));management.append(aging);
    const owners=panel('Carga e atrasos por responsável','Estoque aberto atual. Ordenação por vencidos, depois por volume.');
    if(!m.owners.length)owners.append(node('p','Nenhuma pendência aberta com situação reconhecida.','analysis-empty'));
    m.owners.forEach(p=>{const line=node('div',undefined,'analysis-line');line.append(click(p.name,p.rows,'Carga atual de trabalho; não é avaliação de desempenho individual.'),node('span',p.rows.length+' abertas · '+p.overdue+' vencidas · '+p.withoutDue+' sem prazo'));owners.append(line);});management.append(owners);host.append(management);
    const quality=node('details',undefined,'analysis-quality');quality.append(node('summary','Confiabilidade e limites dos indicadores'));
    quality.append(node('p',m.rows.length+' registros na fonte · '+m.missingDate+' sem data válida · '+m.futureDate+' com data futura · '+m.unknownStatus+' com situação não reconhecida.'));
    quality.append(node('p','SLA de resolução, tempo médio de fechamento, reincidência por causa e SAC por volume vendido ainda não são calculados: exigem histórico de encerramento, causa e denominadores integrados. Metas não foram presumidas.'));
    quality.append(node('p','Última gravação da coleção: '+(m.updated?new Date(m.updated).toLocaleString('pt-BR'):'não informada')+'. Uma consulta recente não significa atualização operacional recente.'));host.append(quality);
  }
  const api={build,render,offset,distance,median};
  if(typeof module==='object'&&module.exports)module.exports=api;else root.GMFAdminAnalytics=api;
})(typeof window==='object'?window:globalThis);
