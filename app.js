(function(){
  const cfg=window.ABDB_CONFIG||{};
  const input=document.getElementById('searchInput');
  const searchBtn=document.getElementById('searchBtn');
  const refreshBtn=document.getElementById('refreshBtn');
  const opportunitiesBtn=document.getElementById('opportunitiesBtn');
  const dropboxView=document.getElementById('dropboxView');
  const opportunitiesView=document.getElementById('opportunitiesView');
  const opportunitiesFrame=document.getElementById('opportunitiesFrame');
  const status=document.getElementById('status');
  const results=document.getElementById('results');
  let timer=null;
  let opportunitiesLoaded=false;

  function setStatus(msg){status.textContent=msg||'';}
  function clearResults(){results.innerHTML='';}

  function escapeHtml(v){
    return String(v||'').replace(/[&<>\"']/g,function(c){
      return {'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[c];
    });
  }

  function render(items){
    clearResults();
    if(!items.length){
      results.innerHTML='<div class="empty">Aucun dossier trouvé.</div>';
      return;
    }
    results.innerHTML=items.map(function(item){
      return '<article class="result">'+
        '<div class="result-main">'+
          '<div class="result-name">📁 '+escapeHtml(item.name)+'</div>'+
          '<div class="result-path">'+escapeHtml(item.path_display||item.path_lower||'')+'</div>'+
        '</div>'+
        '<a class="open-link" href="'+escapeHtml(item.dropbox_url||'#')+'" target="_blank" rel="noopener">Ouvrir Dropbox</a>'+
      '</article>';
    }).join('');
  }

  function jsonp(params){
    return new Promise(function(resolve,reject){
      if(!cfg.API_URL){reject(new Error('API Apps Script non configurée'));return;}
      const cb='abdb_cb_'+Date.now()+'_'+Math.floor(Math.random()*100000);
      const script=document.createElement('script');
      const timeout=setTimeout(function(){cleanup();reject(new Error('Délai dépassé'));},20000);
      function cleanup(){clearTimeout(timeout);delete window[cb];script.remove();}
      window[cb]=function(data){cleanup();resolve(data);};
      script.onerror=function(){cleanup();reject(new Error('Impossible de joindre Apps Script'));};
      const url=new URL(cfg.API_URL);
      Object.keys(params).forEach(function(k){url.searchParams.set(k,params[k]);});
      url.searchParams.set('callback',cb);
      script.src=url.toString();
      document.body.appendChild(script);
    });
  }

  async function search(){
    const q=input.value.trim();
    if(q.length<2){clearResults();setStatus('Saisis au moins 2 caractères.');return;}
    searchBtn.disabled=true;
    setStatus('Recherche Dropbox…');
    try{
      const data=await jsonp({action:'search',q:q});
      if(!data||!data.ok) throw new Error(data&&data.error?data.error:'Erreur inconnue');
      render(data.items||[]);
      setStatus((data.items||[]).length+' dossier(s) trouvé(s).');
    }catch(err){
      clearResults();
      setStatus('Erreur : '+err.message);
    }finally{
      searchBtn.disabled=false;
    }
  }

  function toggleOpportunities(){
    const opening=opportunitiesView.hidden;

    if(opening){
      if(!opportunitiesLoaded){
        opportunitiesFrame.src=opportunitiesFrame.dataset.src;
        opportunitiesLoaded=true;
      }
      dropboxView.hidden=true;
      opportunitiesView.hidden=false;
      refreshBtn.hidden=true;
      opportunitiesBtn.textContent='← Retour Dropbox';
    }else{
      opportunitiesView.hidden=true;
      dropboxView.hidden=false;
      refreshBtn.hidden=false;
      opportunitiesBtn.textContent='📋 Opportunités';
    }
  }

  searchBtn.addEventListener('click',search);
  input.addEventListener('keydown',function(e){if(e.key==='Enter')search();});
  input.addEventListener('input',function(){clearTimeout(timer);timer=setTimeout(search,350);});
  refreshBtn.addEventListener('click',search);
  opportunitiesBtn.addEventListener('click',toggleOpportunities);
})();
