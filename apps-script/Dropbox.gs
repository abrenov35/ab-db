function abdbSearchDropboxFolders_(query){
  const cfg=abdbGetConfig_();
  const token=abdbGetAccessToken_(cfg);

  const q=String(query||'').trim();
  if(q.length<2) return [];

  const rootNamespaceId=abdbGetRootNamespaceId_(token);

  const payload={
    query:q,
    options:{
      path:cfg.rootPath || undefined,
      max_results:100,
      filename_only:true
    }
  };

  if(!payload.options.path) delete payload.options.path;

  const response=abdbDropboxPost_(ABDB.DROPBOX_SEARCH_URL,payload,token,rootNamespaceId);
  const data=JSON.parse(response||'{}');
  const seen={};
  const items=[];

  (data.matches||[]).forEach(function(match){
    if(items.length>=ABDB.MAX_RESULTS) return;

    const meta=abdbExtractMetadata_(match);
    if(!meta || meta['.tag']!=='folder') return;

    abdbPushFolder_(items,seen,meta);

    abdbListSubfoldersRecursive_(
      meta.path_lower||meta.path_display,
      token,
      rootNamespaceId,
      items,
      seen
    );
  });

  items.sort(function(a,b){
    const pa=String(a.path_display||'');
    const pb=String(b.path_display||'');
    return pa.localeCompare(pb,'fr',{sensitivity:'base'});
  });

  return items.slice(0,ABDB.MAX_RESULTS);
}

function abdbGetAccessToken_(cfg){
  cfg=cfg||abdbGetConfig_();

  if(cfg.appKey && cfg.appSecret && cfg.refreshToken){
    const cache=CacheService.getScriptCache();
    const cached=String(cache.get(ABDB.ACCESS_TOKEN_CACHE_KEY)||'').trim();
    if(cached) return cached;

    const basic=Utilities.base64Encode(cfg.appKey+':'+cfg.appSecret);
    const response=UrlFetchApp.fetch(ABDB.DROPBOX_TOKEN_URL,{
      method:'post',
      contentType:'application/x-www-form-urlencoded',
      headers:{Authorization:'Basic '+basic},
      payload:{
        grant_type:'refresh_token',
        refresh_token:cfg.refreshToken
      },
      muteHttpExceptions:true
    });

    const code=response.getResponseCode();
    const text=response.getContentText();
    if(code<200 || code>=300){
      throw new Error('Renouvellement Dropbox HTTP '+code+' : '+text.slice(0,500));
    }

    const data=JSON.parse(text||'{}');
    const token=String(data.access_token||'').trim();
    if(!token) throw new Error('Dropbox n’a pas renvoyé de nouvel access token.');

    const expiresIn=Math.max(300,Number(data.expires_in||14400)-300);
    cache.put(ABDB.ACCESS_TOKEN_CACHE_KEY,token,Math.min(expiresIn,21600));
    return token;
  }

  if(cfg.token) return cfg.token;

  throw new Error(
    'Configuration Dropbox incomplète. Renseigne '+
    ABDB.APP_KEY_PROPERTY+', '+ABDB.APP_SECRET_PROPERTY+' et '+ABDB.REFRESH_TOKEN_PROPERTY+'.'
  );
}

function abdbGetRootNamespaceId_(token){
  const account=abdbGetAccount_(token);
  return String(account && account.root_info && account.root_info.root_namespace_id || '').trim();
}

function abdbGetAccount_(token){
  const response=UrlFetchApp.fetch(ABDB.DROPBOX_ACCOUNT_URL,{
    method:'post',
    contentType:'application/json',
    headers:{Authorization:'Bearer '+token},
    payload:'{}',
    muteHttpExceptions:true
  });

  const code=response.getResponseCode();
  const text=response.getContentText();

  if(code<200 || code>=300){
    throw new Error('Dropbox compte HTTP '+code+' : '+text.slice(0,500));
  }

  return JSON.parse(text||'{}');
}

function abdbDiagnosticDropbox_(){
  const cfg=abdbGetConfig_();
  const token=abdbGetAccessToken_(cfg);

  const account=abdbGetAccount_(token);
  const rootInfo=account.root_info||{};
  const rootNamespaceId=String(rootInfo.root_namespace_id||'').trim();
  const homeNamespaceId=String(rootInfo.home_namespace_id||'').trim();

  const rootEntries=abdbListOneLevel_('',token,rootNamespaceId);

  let configuredEntries=[];
  let configuredError='';
  try{
    configuredEntries=abdbListOneLevel_(cfg.rootPath,token,rootNamespaceId);
  }catch(err){
    configuredError=String(err&&err.message?err.message:err);
  }

  return {
    ok:true,
    auth_mode:(cfg.appKey&&cfg.appSecret&&cfg.refreshToken)?'refresh_token':'legacy_access_token',
    account:{
      name:account.name&&account.name.display_name||'',
      email:account.email||'',
      root_info_tag:rootInfo['.tag']||'',
      root_namespace_id:rootNamespaceId,
      home_namespace_id:homeNamespaceId
    },
    configured_root_path:cfg.rootPath,
    root_entries:rootEntries,
    configured_entries:configuredEntries,
    configured_error:configuredError
  };
}

function abdbListOneLevel_(path,token,rootNamespaceId){
  const data=JSON.parse(abdbDropboxPost_(ABDB.DROPBOX_LIST_URL,{
    path:String(path||''),
    recursive:false,
    include_deleted:false,
    include_has_explicit_shared_members:false,
    include_mounted_folders:true,
    limit:2000
  },token,rootNamespaceId)||'{}');

  return (data.entries||[])
    .filter(function(meta){ return meta && meta['.tag']==='folder'; })
    .map(function(meta){
      return {
        name:String(meta.name||''),
        path_display:String(meta.path_display||''),
        path_lower:String(meta.path_lower||''),
        id:String(meta.id||'')
      };
    });
}

function abdbListSubfoldersRecursive_(path,token,rootNamespaceId,items,seen){
  if(!path || items.length>=ABDB.MAX_RESULTS) return;

  let data=JSON.parse(abdbDropboxPost_(ABDB.DROPBOX_LIST_URL,{
    path:String(path),
    recursive:true,
    include_deleted:false,
    include_has_explicit_shared_members:false,
    include_mounted_folders:true,
    limit:2000
  },token,rootNamespaceId)||'{}');

  abdbCollectFolderEntries_(data.entries,items,seen);

  while(data.has_more && data.cursor && items.length<ABDB.MAX_RESULTS){
    data=JSON.parse(abdbDropboxPost_(ABDB.DROPBOX_LIST_CONTINUE_URL,{
      cursor:data.cursor
    },token,rootNamespaceId)||'{}');
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

function abdbDropboxPost_(url,payload,token,rootNamespaceId){
  const headers={Authorization:'Bearer '+token};

  if(rootNamespaceId){
    headers['Dropbox-API-Path-Root']=JSON.stringify({
      '.tag':'root',
      root:String(rootNamespaceId)
    });
  }

  const response=UrlFetchApp.fetch(url,{
    method:'post',
    contentType:'application/json',
    headers:headers,
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
