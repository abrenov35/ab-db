# AB DB

Passerelle légère entre une interface GitHub Pages et Dropbox.

## Objectif

- rechercher un dossier dans Dropbox ;
- afficher le nom et le chemin du dossier ;
- ouvrir directement le dossier dans Dropbox ;
- éviter les anciennes couches AB DOCS (scan Gmail, À classer, Yaya, index client filtré, patchs successifs).

## Architecture

- `index.html` : interface ;
- `style.css` : présentation ;
- `app.js` : recherche côté navigateur ;
- `config.js` : URL du Web App Apps Script ;
- `apps-script/Code.gs` : API publique JSON/JSONP ;
- `apps-script/Dropbox.gs` : recherche directe Dropbox ;
- `apps-script/Config.gs` : configuration backend.

## Mise en service Apps Script

Créer un nouveau projet Apps Script `AB DB` et y créer 3 fichiers :

1. `Code.gs`
2. `Dropbox.gs`
3. `Config.gs`

Copier le contenu des fichiers du dossier `apps-script/`.

Dans **Paramètres du projet > Propriétés du script**, ajouter :

- `ABDB_DROPBOX_ACCESS_TOKEN` = jeton Dropbox valide
- `ABDB_DROPBOX_ROOT_PATH` = `/AB RENOV 35` (ou une autre racine si nécessaire)

Déployer ensuite en **Application Web** :

- Exécuter en tant que : propriétaire du script
- Accès : toute personne disposant du lien

Copier l'URL `/exec` du déploiement puis la renseigner dans `config.js` :

```js
window.ABDB_CONFIG = {
  API_URL: "https://script.google.com/macros/s/XXXXXXXX/exec"
};
```

## GitHub Pages

Activer GitHub Pages sur la branche `main`, dossier racine `/`.

## Test backend

Ouvrir :

`URL_DU_WEB_APP?action=ping`

Réponse attendue :

```json
{"ok":true,"service":"AB DB","version":"2.0.0"}
```

La recherche Dropbox utilise `files/search_v2` et ne dépend pas d'un index Google Sheets intermédiaire.
