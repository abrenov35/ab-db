function doGet(e){
  try{
    const p=(e&&e.parameter)||{};
    const action=String(p.action||'').trim();
    let data;

    if(action==='search'){
      data={ok:true,items:abdbSearchDropboxFolders_(p.q||'')};
    }else if(action==='opportunities'){
      data={ok:true,items:abdbGetOpportunityFolders_()};
    }else if(action==='clientFolders'){
      data={ok:true,items:abdbGetClientFolders_(p.folder||'')};
    }else if(action==='diagnostic'){
      data=abdbDiagnosticDropbox_();
    }else if(action==='ping'){
      data={ok:true,service:'AB DB',version:'2.3.2'};
    }else{
      data={ok:false,error:'Action inconnue'};
    }

    return abdbOutput_(data,p.callback);
  }catch(err){
    return abdbOutput_({ok:false,error:String(err&&err.message?err.message:err)},e&&e.parameter&&e.parameter.callback);
  }
}

function abdbGetOpportunityFolders_(){
  const cfg=abdbGetConfig_();
  const token=abdbGetAccessToken_(cfg);
  const rootNamespaceId=abdbGetRootNamespaceId_(token);
  const base=String(cfg.rootPath||'/AB RENOV 35').replace(/\/+$/,'');
  const path=base+'/CLIENTS AB RENOV 35/OPPORTUNITES';

  return abdbListOneLevel_(path,token,rootNamespaceId)
    .map(abdbMapFolder_)
    .sort(abdbSortFolders_);
}

function abdbGetClientFolders_(folder){
  const allowed={
    PARTICULIERS:true,
    PROFESSIONNELS:true,
    AUTRES:true
  };

  const normalized=String(folder||'').trim().toUpperCase();
  if(!allowed[normalized]){
    throw new Error('Dossier client invalide');
  }

  const cfg=abdbGetConfig_();
  const token=abdbGetAccessToken_(cfg);
  const rootNamespaceId=abdbGetRootNamespaceId_(token);
  const base=String(cfg.rootPath||'/AB RENOV 35').replace(/\/+$/,'');
  const expectedPath=base+'/CLIENTS AB RENOV 35/• CLIENTS/• '+normalized;

  // Dropbox renvoie bien ce chemin via search_v2, mais list_folder(path)
  // peut retourner path/not_found sur cette arborescence Unicode. On résout
  // donc d'abord le dossier exact, puis on liste ses enfants par son ID Dropbox.
  const categoryId=abdbFindExactFolderId_(normalized,expectedPath,token,rootNamespaceId,cfg.rootPath);
  if(!categoryId){
    throw new Error('Dossier Dropbox introuvable : '+expectedPath);
  }

  return abdbListOneLevel_(categoryId,token,rootNamespaceId)
    .map(abdbMapFolder_)
    .sort(abdbSortFolders_);
}

function abdbFindExactFolderId_(query,expectedPath,token,rootNamespaceId,rootPath){
  const payload={
    query:String(query||''),
    options:{
      path:rootPath || undefined,
      max_results:100,
      filename_only:true
    }
  };
  if(!payload.options.path) delete payload.options.path;

  const data=JSON.parse(abdbDropboxPost_(ABDB.DROPBOX_SEARCH_URL,payload,token,rootNamespaceId)||'{}');
  const expected=String(expectedPath||'').toLowerCase();

  for(let i=0;i<(data.matches||[]).length;i++){
    const meta=abdbExtractMetadata_(data.matches[i]);
    if(!meta || meta['.tag']!=='folder') continue;

    const path=String(meta.path_display||meta.path_lower||'').toLowerCase();
    if(path===expected){
      return String(meta.id||'');
    }
  }

  return '';
}

function abdbMapFolder_(item){
  return {
    id:String(item.id||''),
    name:String(item.name||''),
    path_display:String(item.path_display||''),
    path_lower:String(item.path_lower||''),
    dropbox_url:abdbDropboxWebUrl_(item.path_display||item.path_lower||'')
  };
}

function abdbSortFolders_(a,b){
  return String(a.name||'').localeCompare(String(b.name||''),'fr',{sensitivity:'base'});
}

function abdbOutput_(data,callback){
  const json=JSON.stringify(data);
  if(callback){
    const safe=String(callback).replace(/[^a-zA-Z0-9_$]/g,'');
    return ContentService
      .createTextOutput(safe+'('+json+');')
      .setMimeType(ContentService.MimeType.JAVASCRIPT);
  }
  return ContentService
    .createTextOutput(json)
    .setMimeType(ContentService.MimeType.JSON);
}
