const ABDB = Object.freeze({
  DROPBOX_ACCOUNT_URL: 'https://api.dropboxapi.com/2/users/get_current_account',
  DROPBOX_SEARCH_URL: 'https://api.dropboxapi.com/2/files/search_v2',
  DROPBOX_LIST_URL: 'https://api.dropboxapi.com/2/files/list_folder',
  DROPBOX_LIST_CONTINUE_URL: 'https://api.dropboxapi.com/2/files/list_folder/continue',
  DROPBOX_TOKEN_URL: 'https://api.dropboxapi.com/oauth2/token',

  ROOT_PATH_PROPERTY: 'ABDB_DROPBOX_ROOT_PATH',
  TOKEN_PROPERTY: 'ABDB_DROPBOX_ACCESS_TOKEN',
  APP_KEY_PROPERTY: 'ABDB_DROPBOX_APP_KEY',
  APP_SECRET_PROPERTY: 'ABDB_DROPBOX_APP_SECRET',
  REFRESH_TOKEN_PROPERTY: 'ABDB_DROPBOX_REFRESH_TOKEN',

  ACCESS_TOKEN_CACHE_KEY: 'ABDB_DROPBOX_ACCESS_TOKEN_AUTO',
  DEFAULT_ROOT_PATH: '/AB RENOV 35',
  MAX_RESULTS: 250
});

function abdbGetConfig_(){
  const props=PropertiesService.getScriptProperties();
  return {
    token: String(props.getProperty(ABDB.TOKEN_PROPERTY)||'').trim(),
    appKey: String(props.getProperty(ABDB.APP_KEY_PROPERTY)||'').trim(),
    appSecret: String(props.getProperty(ABDB.APP_SECRET_PROPERTY)||'').trim(),
    refreshToken: String(props.getProperty(ABDB.REFRESH_TOKEN_PROPERTY)||'').trim(),
    rootPath: String(props.getProperty(ABDB.ROOT_PATH_PROPERTY)||ABDB.DEFAULT_ROOT_PATH).trim()
  };
}
