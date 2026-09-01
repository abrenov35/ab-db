function doGet(e){
  try{
    const p=(e&&e.parameter)||{};
    const action=String(p.action||'').trim();
    let data;

    if(action==='search'){
      data={ok:true,items:abdbSearchDropboxFolders_(p.q||'')};
    }else if(action==='diagnostic'){
      data=abdbDiagnosticDropbox_();
    }else if(action==='ping'){
      data={ok:true,service:'AB DB',version:'2.1.0'};
    }else{
      data={ok:false,error:'Action inconnue'};
    }

    return abdbOutput_(data,p.callback);
  }catch(err){
    return abdbOutput_({ok:false,error:String(err&&err.message?err.message:err)},e&&e.parameter&&e.parameter.callback);
  }
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
