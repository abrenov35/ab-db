function abdbSearchDropboxFolders_(query){
  const cfg=abdbGetConfig_();
  if(!cfg.token) throw new Error('Jeton Dropbox manquant dans les propriétés du script : '+ABDB.TOKEN_PROPERTY);

  const q=String(query||'').trim();
  if(q.length<2) return [];

  const payload={
    query:q,
    options:{
      path:cfg.rootPath || undefined,
      max_results:100,
      filename_only:true
    }
  };

  if(!payload.options.path) delete payload.options.path;

  const response=abdbDropboxPost_(ABDB.DROPBOX_SEARCH_URL,payload,cfg.token);
  const data=JSON.parse(response||'{}');
  const seen={};
  const items=[];

  (data.matches||[]).forEach(function(match){
    if(items.length>=ABDB.MAX_RESULTS) return;

    const meta=abdbExtractMetadata_(match);
    if(!meta || meta['.tag']!=='folder') return;

    abdbPushFolder_(items,seen,meta);

    // Dès qu'un dossier correspond à la recherche, on ajoute aussi
    // tous ses sous-dossiers, quelle que soit leur profondeur.
    abdbListSubfoldersRecursive_(meta.path_lower||meta.path_display,cfg.token,items,seen);
  });

  items.sort(function(a,b){
    const pa=String(a.path_display||'');
    const pb=String(b.path_display||'');
    return pa.localeCompare(pb,'fr',{sensitivity:'base'});
  });

  return items.slice(0,ABDB.MAX_RESULTS);
}

function abdbListSubfoldersRecursive_(path,token,items,seen){
  if(!path || items.length>=ABDB.MAX_RESULTS) return;

  let data=JSON.parse(abdbDropboxPost_(ABDB.DROPBOX_LIST_URL,{
    path:String(path),
    recursive:true,
    include_deleted:false,
    include_has_explicit_shared_members:false,
    include_mounted_folders:true,
    limit:2000
  },token)||'{}');

  abdbCollectFolderEntries_(data.entries,items,seen);

  while(data.has_more && data.cursor && items.length<ABDB.MAX_RESULTS){
    data=JSON.parse(abdbDropboxPost_(ABDB.DROPBOX_LIST_CONTINUE_URL,{
      cursor:data.cursor
    },token)||'{}');
    abdbCollectFolderEntries_(data.entries,items,seen);
  }
}

function abdbCollectFolderEntries_(entries,items,seen){
  (entries||[]).forEach(function(meta){
    if(items.length>=ABDB.MAX_RESULTS) return;
    if(!meta || meta['.tag']!=='folder') return;
    abdbPushFolder_(items,seen,meta);
  });
}

function abdbPushFolder_(items,seen,meta){
  const path=String(meta.path_display||meta.path_lower||'');
  if(!path) return;

  const key=path.toLowerCase();
  if(seen[key]) return;
  seen[key]=true;

  items.push({
    id:String(meta.id||''),
    name:String(meta.name||''),
    path_display:path,
    path_lower:String(meta.path_lower||''),
    dropbox_url:abdbDropboxWebUrl_(path)
  });
}

function abdbDropboxPost_(url,payload,token){
  const response=UrlFetchApp.fetch(url,{
    method:'post',
    contentType:'application/json',
    headers:{Authorization:'Bearer '+token},
    payload:JSON.stringify(payload||{}),
    muteHttpExceptions:true
  });

  const code=response.getResponseCode();
  const text=response.getContentText();

  if(code<200 || code>=300){
    throw new Error('Dropbox HTTP '+code+' : '+text.slice(0,500));
  }

  return text;
}

function abdbExtractMetadata_(match){
  if(!match) return null;
  let m=match.metadata || match;

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
