function doGet(e){
  try{
    const p=(e&&e.parameter)||{};
    const action=String(p.action||'').trim();
    let data;

    if(action==='search'){
      data={ok:true,items:abdbSearchDropboxFolders_(p.q||'')};
    }else if(action==='opportunities'){
      data={ok:true,items:abdbGetOpportunityFolders_()};
    }else if(action==='diagnostic'){
      data=abdbDiagnosticDropbox_();
    }else if(action==='ping'){
      data={ok:true,service:'AB DB',version:'2.2.0'};
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
    .map(function(item){
      return {
        id:String(item.id||''),
        name:String(item.name||''),
        path_display:String(item.path_display||''),
        path_lower:String(item.path_lower||''),
        dropbox_url:abdbDropboxWebUrl_(item.path_display||item.path_lower||'')
      };
    })
    .sort(function(a,b){
      return String(a.name||'').localeCompare(String(b.name||''),'fr',{sensitivity:'base'});
    });
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
