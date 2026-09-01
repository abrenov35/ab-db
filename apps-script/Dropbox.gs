function abdbSearchDropboxFolders_(query){
  const cfg=abdbGetConfig_();
  if(!cfg.token) throw new Error('Jeton Dropbox manquant dans les propriétés du script : '+ABDB.TOKEN_PROPERTY);

  const q=String(query||'').trim();
  if(q.length<2) return [];

  const payload={
    query:q,
    options:{
      path:cfg.rootPath || undefined,
      max_results:ABDB.MAX_RESULTS,
      filename_only:true
    }
  };

  if(!payload.options.path) delete payload.options.path;

  const response=UrlFetchApp.fetch(ABDB.DROPBOX_SEARCH_URL,{
    method:'post',
    contentType:'application/json',
    headers:{Authorization:'Bearer '+cfg.token},
    payload:JSON.stringify(payload),
    muteHttpExceptions:true
  });

  const code=response.getResponseCode();
  const text=response.getContentText();
  if(code<200 || code>=300){
    throw new Error('Dropbox HTTP '+code+' : '+text.slice(0,500));
  }

  const data=JSON.parse(text||'{}');
  const seen={};
  const items=[];

  (data.matches||[]).forEach(function(match){
    const meta=abdbExtractMetadata_(match);
    if(!meta || meta['.tag']!=='folder') return;

    const path=String(meta.path_display||meta.path_lower||'');
    if(!path || seen[path.toLowerCase()]) return;
    seen[path.toLowerCase()]=true;

    items.push({
      id:String(meta.id||''),
      name:String(meta.name||''),
      path_display:path,
      path_lower:String(meta.path_lower||''),
      dropbox_url:abdbDropboxWebUrl_(path)
    });
  });

  items.sort(function(a,b){
    return a.name.localeCompare(b.name,'fr',{sensitivity:'base'});
  });
  return items;
}

function abdbExtractMetadata_(match){
  if(!match) return null;
  let m=match.metadata || match;

  // search_v2 peut envelopper les métadonnées selon le SDK / format de réponse.
  if(m && m.metadata) m=m.metadata;
  if(m && m.metadata) m=m.metadata;

  return m && typeof m==='object' ? m : null;
}

function abdbDropboxWebUrl_(path){
  const parts=String(path||'').split('/').filter(Boolean).map(encodeURIComponent);
  return 'https://www.dropbox.com/home/'+parts.join('/');
}

function abdbTestDropbox_(){
  return abdbSearchDropboxFolders_('test');
}
