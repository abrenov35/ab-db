(function(){
  const cfg=window.ABDB_CONFIG||{};
  const topbar=document.getElementById('topbar');
  const input=document.getElementById('searchInput');
  const clientsBtn=document.getElementById('clientsBtn');
  const clientsView=document.getElementById('clientsView');
  const clientsStatus=document.getElementById('clientsStatus');
  const clientsResults=document.getElementById('clientsResults');
  const clientFolderBtns=Array.from(document.querySelectorAll('.client-folder-btn'));
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
  function showOnly(view){[dropboxView,clientsView,opportunitiesView,abOppView].forEach(function(v){v.hidden=v!==view;});}
  function setClientsMode(on){topbar.classList.toggle('clients-mode',!!on);}
  function resetButtons(){setClientsMode(false);clientsBtn.textContent='👥 Clients AB RENOV 35';abOppBtn.textContent='📋 Opportunités';opportunitiesBtn.textContent='📁 Opportunités à traiter';input.hidden=false;clientFolderBtns.forEach(function(b){b.classList.remove('active');});}

  function renderInto(target,items,emptyText){target.innerHTML='';if(!items.length){target.innerHTML='<div class="empty">'+escapeHtml(emptyText||'Aucun dossier trouvé.')+'</div>';return;}target.innerHTML=items.map(function(item){return '<article class="result"><div class="result-main"><div class="result-name">📁 '+escapeHtml(item.name)+'</div><div class="result-path">'+escapeHtml(item.path_display||item.path_lower||'')+'</div></div><a class="open-link" href="'+escapeHtml(item.dropbox_url||'#')+'" target="_blank" rel="noopener">Ouvrir Dropbox</a></article>';}).join('');}
  function render(items){renderInto(results,items,'Aucun dossier trouvé.');}
  function renderOpportunities(items){renderInto(opportunitiesList,items,'Aucune opportunité à traiter.');}

  function jsonp(params){return new Promise(function(resolve,reject){if(!cfg.API_URL){reject(new Error('API Apps Script non configurée'));return;}const cb='abdb_cb_'+Date.now()+'_'+Math.floor(Math.random()*100000),script=document.createElement('script');const timeout=setTimeout(function(){cleanup();reject(new Error('Délai dépassé'));},20000);function cleanup(){clearTimeout(timeout);delete window[cb];script.remove();}window[cb]=function(data){cleanup();resolve(data);};script.onerror=function(){cleanup();reject(new Error('Impossible de joindre Apps Script'));};const url=new URL(cfg.API_URL);Object.keys(params).forEach(function(k){url.searchParams.set(k,params[k]);});url.searchParams.set('callback',cb);script.src=url.toString();document.body.appendChild(script);});}

  async function search(){const q=input.value.trim();if(q.length<2){clearResults();setStatus('Saisis au moins 2 caractères.');return;}showOnly(dropboxView);setClientsMode(false);clientsBtn.textContent='👥 Clients AB RENOV 35';setStatus('Recherche Dropbox…');try{const data=await jsonp({action:'search',q:q});if(!data||!data.ok)throw new Error(data&&data.error?data.error:'Erreur inconnue');render(data.items||[]);setStatus((data.items||[]).length+' dossier(s) trouvé(s).');}catch(err){clearResults();setStatus('Erreur : '+err.message);}}
  async function loadOpportunities(){opportunitiesStatus.textContent='';opportunitiesList.innerHTML='';try{const data=await jsonp({action:'opportunities'});if(!data||!data.ok)throw new Error(data&&data.error?data.error:'Erreur inconnue');renderOpportunities(data.items||[]);opportunitiesStatus.textContent='';}catch(err){opportunitiesList.innerHTML='<div class="empty">Impossible de charger les opportunités.</div>';opportunitiesStatus.textContent='Erreur : '+err.message;}}

  function normalizePath(v){return String(v||'').replace(/\\/g,'/').replace(/\/+$/,'').toLowerCase();}
  async function loadClientFolder(folder){
    showOnly(clientsView);setClientsMode(true);clientsBtn.textContent='👥 Clients AB RENOV 35';input.hidden=false;
    clientFolderBtns.forEach(function(b){b.classList.toggle('active',b.dataset.folder===folder);});
    clientsStatus.textContent='';clientsResults.innerHTML='';
    try{
      const data=await jsonp({action:'search',q:folder});
      if(!data||!data.ok)throw new Error(data&&data.error?data.error:'Erreur inconnue');
      const all=data.items||[];const folderLower=String(folder||'').toLowerCase();
      const category=all.find(function(item){return String(item.name||'').trim().toLowerCase()===folderLower;});
      let parent=category?normalizePath(category.path_display||category.path_lower||''):'';let items=[];
      if(parent){items=all.filter(function(item){const path=normalizePath(item.path_display||item.path_lower||'');if(!path||path===parent)return false;const cut=path.lastIndexOf('/');return cut>0&&path.slice(0,cut)===parent;});}
      else{items=all.filter(function(item){const path=normalizePath(item.path_display||item.path_lower||'');const marker='/'+folderLower+'/';const idx=path.indexOf(marker);if(idx<0)return false;return path.indexOf('/',idx+marker.length)===-1;});}
      items.sort(function(a,b){return String(a.name||'').localeCompare(String(b.name||''),'fr',{sensitivity:'base'});});
      renderInto(clientsResults,items,'Aucun dossier dans '+folder+'.');
    }catch(err){clientsResults.innerHTML='<div class="empty">Impossible de charger les dossiers.</div>';clientsStatus.textContent='Erreur : '+err.message;}
  }

  async function loadAbOpp(){if(abOppLoaded)return;abOppFrame.srcdoc='<div style="font-family:Arial,sans-serif;padding:30px;text-align:center">Chargement AB OPPORTUNITÉS…</div>';try{const response=await fetch('https://raw.githubusercontent.com/abrenov35/ab-opp/main/index.html?ts='+Date.now(),{cache:'no-store'});if(!response.ok)throw new Error('AB OPP HTTP '+response.status);let src=await response.text();const hide='<style id="abdb-embedded-cleanup">.header,.topbar,.app-header{display:none!important}body{padding-top:0!important;margin-top:0!important}</style>';src=src.replace('</head>',hide+'</head>');abOppFrame.srcdoc=src;abOppLoaded=true;}catch(err){abOppFrame.srcdoc='<div style="font-family:Arial,sans-serif;padding:30px;color:#b91c1c"><strong>Erreur AB OPP</strong><br>'+escapeHtml(err.message)+'</div>';}}

  function toggleClients(){if(!clientsView.hidden){showOnly(dropboxView);resetButtons();return;}showOnly(clientsView);setClientsMode(true);input.hidden=false;clientsBtn.textContent='👥 Clients AB RENOV 35';abOppBtn.textContent='📋 Opportunités';opportunitiesBtn.textContent='📁 Opportunités à traiter';}
  async function toggleOpportunities(){if(!opportunitiesView.hidden){showOnly(dropboxView);resetButtons();return;}showOnly(opportunitiesView);setClientsMode(false);input.hidden=false;clientsBtn.textContent='👥 Clients AB RENOV 35';abOppBtn.textContent='📋 Opportunités';opportunitiesBtn.textContent='← Retour recherche';await loadOpportunities();}
  async function toggleAbOpp(){if(!abOppView.hidden){showOnly(dropboxView);resetButtons();return;}showOnly(abOppView);setClientsMode(false);input.hidden=false;clientsBtn.textContent='👥 Clients AB RENOV 35';opportunitiesBtn.textContent='📁 Opportunités à traiter';abOppBtn.textContent='← Retour recherche';await loadAbOpp();}

  input.addEventListener('keydown',function(e){if(e.key==='Enter')search();});
  input.addEventListener('input',function(){clearTimeout(timer);timer=setTimeout(search,350);});
  clientsBtn.addEventListener('click',toggleClients);
  clientFolderBtns.forEach(function(btn){btn.addEventListener('click',function(){loadClientFolder(btn.dataset.folder);});});
  opportunitiesBtn.addEventListener('click',toggleOpportunities);
  abOppBtn.addEventListener('click',toggleAbOpp);
})();
