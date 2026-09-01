const ABDB = Object.freeze({
  DROPBOX_SEARCH_URL: 'https://api.dropboxapi.com/2/files/search_v2',
  ROOT_PATH_PROPERTY: 'ABDB_DROPBOX_ROOT_PATH',
  TOKEN_PROPERTY: 'ABDB_DROPBOX_ACCESS_TOKEN',
  DEFAULT_ROOT_PATH: '/AB RENOV 35',
  MAX_RESULTS: 100
});

function abdbGetConfig_(){
  const props=PropertiesService.getScriptProperties();
  return {
    token: String(props.getProperty(ABDB.TOKEN_PROPERTY)||'').trim(),
    rootPath: String(props.getProperty(ABDB.ROOT_PATH_PROPERTY)||ABDB.DEFAULT_ROOT_PATH).trim()
  };
}
