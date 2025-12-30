# Fihirana API Client (v4)

Une bibliothèque JavaScript légère conçue pour charger, gérer et interroger des recueils de chants (Fihirana) de manière asynchrone. Cette API intègre un système de cache à deux niveaux (RAM et IndexedDB) pour optimiser les performances et permettre un fonctionnement hors ligne après le premier chargement.

## Fonctionnalités

* **Gestion de Cache Avancée :** Utilise la RAM pour une rapidité immédiate et IndexedDB pour la persistance locale (disque), réduisant drastiquement les requêtes réseau.
* **Recherche Textuelle :** Recherche par mots-clés dans les paroles avec extraction du contexte (strophes correspondantes) ou dans les titres.
* **Normalisation :** Gestion automatique des références (insensible à la casse).
* **Génération Aléatoire :** Sélection de chants aléatoires pondérée par catégorie.
* **Architecture Lazy Loading :** Ne charge les fichiers JSON lourds que lorsque cela est nécessaire.

## Installation

Pour utiliser cette API, incluez le fichier script dans votre projet. Pour activer la persistance des données (recommandé), incluez également la bibliothèque `idb-keyval`.

```html
<script src="https://cdn.jsdelivr.net/npm/idb-keyval@6/dist/umd.js"></script>

<script src="FihiranaAPI.js"></script>
```

## Configuration des Données

L'API s'attend à trouver des fichiers JSON structurés dans un répertoire spécifique.

### Structure du Fichier JSON

Chaque fichier doit correspondre à une catégorie (ex: `ff.json`, `antema.json`).

**Format attendu :**

```json
{
  "ff_1": {
    "laharana": "1",
    "lohateny": "Anarana Jesoso",
    "hira": [
      {
        "andininy": "1",
        "tononkira": "Ry anarana soa...",
        "fiverenany": false
      },
      {
        "andininy": "Ref",
        "tononkira": "He, manala...",
        "fiverenany": true
      }
    ]
  }
}

```

## Utilisation

### Initialisation

```javascript
// Instanciation avec le chemin par défaut './assets/js/data/fihirana/'
const api = new FihiranaAPI();

// Ou avec un chemin personnalisé
const apiCustom = new FihiranaAPI('./mon/dossier/data/');

```

### Lecture d'un Chant

La méthode `chanter` charge automatiquement le fichier nécessaire s'il n'est pas en cache.

```javascript
// Récupère le chant n°1 de la catégorie 'FF'
api.chanter('ff', 1)
  .then(chant => {
    console.log(chant.title);
    console.log(chant.content); // Tableau des strophes
  })
  .catch(error => console.error("Chant introuvable", error));

```

### Recherche de Paroles

Recherche un mot-clé dans le contenu des chants chargés.

```javascript
api.chercheMotCle("fitiavana").then(response => {
    const resultats = response.results;

    // Parcourir les catégories
    for (const cat in resultats) {
        console.log(`Catégorie ${cat} : ${resultats[cat].count} résultats`);

        // Afficher les détails
        resultats[cat].chants.forEach(c => {
            console.log(`Chant : ${c.ref} - ${c.title}`);
            console.log(c.matchingStrophes); // Strophes contenant le mot
        });
    }
});

```

### Chant Aléatoire

Génère un chant au hasard en respectant les pondérations définies dans le constructeur.

```javascript
api.chantRandom().then(chant => {
    console.log(`Chant aléatoire : ${chant.ref}`);
});

```

## Architecture Technique

### Stratégie de Chargement (Waterfall)

Lorsqu'une ressource est demandée (par exemple `ff.json`) :

1. **Vérification RAM :** Si les données sont dans `this.data`, elles sont renvoyées immédiatement.
2. **Vérification IndexedDB :** L'API interroge la base de données locale du navigateur. Si trouvées, les données sont chargées en RAM et renvoyées (rapide, pas de réseau).
3. **Requête Réseau (Fetch) :** Si aucune donnée locale n'existe, le fichier JSON est téléchargé depuis le serveur.
4. **Mise en Cache :** Une fois téléchargées, les données sont sauvegardées dans IndexedDB (pour les futures visites) et en RAM.

### API Référence

| Méthode                     | Description                                                      |
| --------------------------- | ---------------------------------------------------------------- |
| `chanter(category, number)` | Retourne l'objet chant complet. Charge le fichier si nécessaire. |
| `titreChant(ref)`           | Retourne uniquement le titre d'un chant (ex: ref = "ff 1").      |
| `nombreChant(category)`     | Retourne le nombre total de chants dans une catégorie.           |
| `chantRandom()`             | Retourne un chant aléatoire basé sur les poids des catégories.   |
| `chercheMotCle(mot)`        | Recherche textuelle dans les paroles (tononkira).                |
| `chercheMotCle_titre(mot)`  | Recherche textuelle dans les titres (lohateny).                  |
| `setBasePath(path)`         | Modifie le chemin racine des fichiers JSON.                      |
| `viderCache()`              | Vide le cache de la mémoire vive (RAM).                          |

## Auteur

Hosea Rand.
Version API : 4.0
