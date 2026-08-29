# Lectures

Lecteur de surlignages KOReader (stockés en JSON sur Dropbox), avec notes
générales par livre et un carnet séparé pour tes livres papier.

Application 100 % statique : aucun serveur, aucune base de données. Tout
transite directement entre ton navigateur et l'API Dropbox.

## Comment ça marche

- **Lecture des surlignages** : lit le dossier (ou fichier) exporté par le
  plugin *highlights* de KOReader, en lecture seule.
- **Notes générales** et **livres papier** : stockés dans un dossier séparé
  (`/Apps/lectures` par défaut) pour ne jamais toucher aux fichiers de
  KOReader.
- **Connexion** : OAuth 2.0 avec PKCE, directement depuis le navigateur (pas
  de secret à protéger, donc pas de backend nécessaire).

## 1. Créer une app Dropbox

1. Va sur [console.dropbox.com/apps](https://www.dropbox.com/developers/apps) → *Create app*.
2. Choisis **Scoped access**, puis le type d'accès que tu préfères (*App
   folder* si tu veux limiter l'accès à un seul dossier, *Full Dropbox* si tu
   veux pointer vers ton dossier KOReader existant où qu'il soit).
3. Donne-lui un nom (ex. `lectures`).
4. Dans l'onglet **Permissions**, coche :
   - `files.metadata.read`
   - `files.metadata.write`
   - `files.content.read`
   - `files.content.write`
   puis *Submit*.
5. Dans l'onglet **Settings**, note la **App key** (c'est ton `clientId`).
6. Toujours dans **Settings**, section **OAuth 2** → **Redirect URIs**,
   ajoute :
   - `http://localhost:5173/` (pour tester en local)
   - l'URL de ton site une fois déployé (ex.
     `https://tonpseudo.github.io/lectures/` ou ton domaine Vercel) — tu
     peux l'ajouter après le premier déploiement.

## 2. Lancer en local

```bash
npm install
npm run dev
```

Ouvre `http://localhost:5173`. Au premier lancement, l'appli te demande :

- la **App key** Dropbox de l'étape 1,
- l'**URL de redirection** (pré-remplie, doit correspondre exactement à une
  des URLs ajoutées dans la console Dropbox),
- le **dossier des exports KOReader** sur ton Dropbox,
- le **dossier de données Lectures** (notes générales + livres papier).

Clique ensuite sur *Se connecter à Dropbox*.

## 3. Déployer

### GitHub Pages (inclus, automatique)

Le repo contient déjà `.github/workflows/deploy.yml`. Il te suffit de :

1. Pousser ce projet sur un repo GitHub.
2. Dans **Settings → Pages**, choisir la source **GitHub Actions**.
3. Chaque push sur `main` reconstruit et republie le site automatiquement.
4. Une fois l'URL connue, ajoute-la dans les **Redirect URIs** de ta console
   Dropbox (étape 1.6) — sinon la connexion échouera avec une erreur
   `redirect_uri_mismatch`.

### Vercel

1. Importe le repo sur [vercel.com](https://vercel.com/new).
2. Framework preset : **Vite**. Aucune variable d'environnement nécessaire.
3. Ajoute l'URL Vercel obtenue dans les Redirect URIs Dropbox, comme ci-dessus.

## À propos du format des exports KOReader

Le plugin *highlights* de KOReader peut exporter soit **un fichier JSON par
livre** dans un dossier, soit **un seul fichier combiné**. L'appli essaie
automatiquement les deux formats (voir `src/library.js`,
`loadKoreaderLibrary`). Si ta structure est différente de ces deux cas, c'est
la fonction `parseKoreaderFolder` / `parseKoreaderSingleFile` dans ce fichier
qu'il faut ajuster — le reste de l'appli ne dépend que de la forme normalisée
`{ id, title, highlights: [...] }` qu'elles retournent.

Champs de surlignage reconnus (basés sur ton exemple) : `text`, `note`,
`color`, `drawer` (`lighten` / `underline` / `strikeout`), `chapter`,
`pageno`, `datetime`.

## Structure du projet

```
src/
  dropboxAuth.js       auth OAuth PKCE (login, refresh, tokens)
  dropboxApi.js         appels bruts à l'API Dropbox (list/download/upload)
  library.js             lecture des surlignages KOReader + notes/livres papier
  settings.js             réglages persistés (localStorage)
  colors.js               correspondance couleur KOReader → palette
  components/
    SetupScreen.jsx        premier écran de configuration
    LoginScreen.jsx         écran de connexion Dropbox
    Sidebar.jsx              liste des livres (numériques + papier)
    BookDetail.jsx           vue d'un livre : notes générales + surlignages/entrées
    HighlightCard.jsx        rendu d'un surlignage (couleur + style lighten/underline/strikeout)
    PaperEntryForm.jsx       formulaire d'ajout d'entrée pour un livre papier
    NewPaperBookModal.jsx    création d'un livre papier
```
