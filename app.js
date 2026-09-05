(function(){
  const cfg=window.ABDB_CONFIG||{};
  const input=document.getElementById('searchInput');
  const abOppBtn=document.getElementById('abOppBtn');
  const abOppView=document.getElementById('abOppView');
  const abOppFrame=document.getElementById('abOppFrame');
  const opportunitiesBtn=document.getElementById('opportunitiesBtn');
  const dropboxView=document.getElementById('dropboxView');
  const opportunitiesView=document.getElementById('opportunitiesView');
  const opportunitiesList=document.getElementById('opportunitiesList');
  const opportunitiesStatus=document.getElementById('opportunitiesStatus');
  const status=document.getElementById('status');
  const results=document.getElementById('results');
  let timer=null;
  let abOppLoaded=false;

  function setStatus(msg){status.textContent=msg||'';}
  function clearResults(){results.innerHTML='';}
  function escapeHtml(v){return String(v||'').replace(/[&<>\"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[c];});}
  function showOnly(view){dropboxView.hidden=view!==dropboxView;opportunitiesView.hidden=view!==opportunitiesView;abOppView.hidden=view!==abOppView;}
  function resetButtons(){abOppBtn.textContent='📋 Opportunités';opportunitiesBtn.textContent='📁 Opportunités à traiter';input.hidden=false;}

  function render(items){clearResults();if(!items.length){results.innerHTML='<div class="empty">Aucun dossier trouvé.</div>';return;}results.innerHTML=items.map(function(item){return '<article class="result"><div class="result-main"><div class="result-name">📁 '+escapeHtml(item.name)+'</div><div class="result-path">'+escapeHtml(item.path_display||item.path_lower||'')+'</div></div><a class="open-link" href="'+escapeHtml(item.dropbox_url||'#')+'" target="_blank" rel="noopener">Ouvrir Dropbox</a></article>';}).join('');}
  function renderOpportunities(items){opportunitiesList.innerHTML='';if(!items.length){opportunitiesList.innerHTML='<div class="empty">Aucune opportunité à traiter.</div>';return;}opportunitiesList.innerHTML=items.map(function(item){return '<article class="result opportunity-result"><div class="result-main"><div class="result-name">📁 '+escapeHtml(item.name)+'</div></div><a class="open-link" href="'+escapeHtml(item.dropbox_url||'#')+'" target="_blank" rel="noopener">Ouvrir Dropbox</a></article>';}).join('');}

  function jsonp(params){return new Promise(function(resolve,reject){if(!cfg.API_URL){reject(new Error('API Apps Script non configurée'));return;}const cb='abdb_cb_'+Date.now()+'_'+Math.floor(Math.random()*100000),script=document.createElement('script');const timeout=setTimeout(function(){cleanup();reject(new Error('Délai dépassé'));},20000);function cleanup(){clearTimeout(timeout);delete window[cb];script.remove();}window[cb]=function(data){cleanup();resolve(data);};script.onerror=function(){cleanup();reject(new Error('Impossible de joindre Apps Script'));};const url=new URL(cfg.API_URL);Object.keys(params).forEach(function(k){url.searchParams.set(k,params[k]);});url.searchParams.set('callback',cb);script.src=url.toString();document.body.appendChild(script);});}

  async function search(){const q=input.value.trim();if(q.length<2){clearResults();setStatus('Saisis au moins 2 caractères.');return;}setStatus('Recherche Dropbox…');try{const data=await jsonp({action:'search',q:q});if(!data||!data.ok)throw new Error(data&&data.error?data.error:'Erreur inconnue');render(data.items||[]);setStatus((data.items||[]).length+' dossier(s) trouvé(s).');}catch(err){clearResults();setStatus('Erreur : '+err.message);}}
  async function loadOpportunities(){opportunitiesStatus.textContent='Chargement des opportunités Dropbox…';opportunitiesList.innerHTML='';try{const data=await jsonp({action:'opportunities'});if(!data||!data.ok)throw new Error(data&&data.error?data.error:'Erreur inconnue');const items=data.items||[];renderOpportunities(items);opportunitiesStatus.textContent=items.length+' opportunité(s) à traiter.';}catch(err){opportunitiesList.innerHTML='<div class="empty">Impossible de charger les opportunités.</div>';opportunitiesStatus.textContent='Erreur : '+err.message;}}

  async function toggleOpportunities(){if(!opportunitiesView.hidden){showOnly(dropboxView);resetButtons();return;}showOnly(opportunitiesView);input.hidden=true;abOppBtn.textContent='📋 Opportunités';opportunitiesBtn.textContent='← Retour recherche';await loadOpportunities();}
  function toggleAbOpp(){if(!abOppView.hidden){showOnly(dropboxView);resetButtons();return;}showOnly(abOppView);input.hidden=true;opportunitiesBtn.textContent='📁 Opportunités à traiter';abOppBtn.textContent='← Retour recherche';if(!abOppLoaded){abOppFrame.src='https://abrenov35.github.io/ab-opp/';abOppLoaded=true;}}

  input.addEventListener('keydown',function(e){if(e.key==='Enter')search();});
  input.addEventListener('input',function(){clearTimeout(timer);timer=setTimeout(search,350);});
  opportunitiesBtn.addEventListener('click',toggleOpportunities);
  abOppBtn.addEventListener('click',toggleAbOpp);
})();
