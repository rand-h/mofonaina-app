# Documentation BibleAPI

**Version :** 5.0c
**Auteur :** Hosea Rand.

Cette librairie JavaScript fournit une interface programmatique pour l'interrogation et la gestion de textes bibliques. Elle intègre un système de mise en cache multi-niveaux pour optimiser les performances et limiter les requêtes réseau.

## Fonctionnalités Principales

* **Architecture de chargement asynchrone :** Implémente une stratégie de récupération de données prioritaire (Cache mémoire > IndexedDB > Réseau).
* **Support multi-langues :** Prise en charge des versions malgache (`mg`), française (`fr`) et anglaise (`en`). 
* **Analyse syntaxique de références :** Moteur de parsing capable d'interpréter des formats complexes (ex: "Jean 3:16", "Matio 5:1-10").
* **Comparaison multilingue :** Agrégation simultanée de versets provenant de différentes versions linguistiques.
* **Moteur de recherche :** Indexation et recherche textuelle globale.

---

## Installation et Dépendances

Pour activer la persistance locale des données via IndexedDB, la bibliothèque tierce `idb-keyval` est requise. En son absence, l'API fonctionnera en mode dégradé (chargement réseau systématique à chaque initialisation de session).

```html
<script src="https://cdn.jsdelivr.net/npm/idb-keyval@6/dist/umd.js"></script>

<script src="BibleAPI.js"></script>
```

---

## Initialisation et Instanciation

L'initialisation de la classe `BibleAPI` déclenche le processus de chargement des données. L'accès aux méthodes de lecture doit être conditionné par la résolution de la promesse `ready`.

```javascript
// Instanciation pour la version française ('fr'), malgache ('mg') ou anglaise ('en')
const bible = new BibleAPI('fr');

// Attente de la disponibilité des données
bible.ready.then(() => {
    console.log("Initialisation terminée.");

    // Exécution d'une requête de lecture
    bible.lire("Jean", 3, 16).then(console.log);
});
```

---

## Guide d'Utilisation

### Lecture de versets (`lire`)

La méthode `lire` expose une surcharge permettant l'utilisation de paramètres distincts ou d'une chaîne de caractères formatée.

**Signature par arguments :**

```javascript
// Livre, Chapitre, Verset unique
bible.lire("Jean", 3, 16); 

// Livre, Chapitre, Plage de versets
bible.lire("Matthieu", 5, 1, 10); 

// Chapitre complet
bible.lire("Psaumes", 23); 

```

**Signature par référence textuelle :**

```javascript
bible.lire("Jean 3:16");
bible.lire("Genèse 1:1-5");
```

---

## Documentation des Méthodes

### `chercher(motCle)`

Exécute une recherche textuelle sur l'ensemble du corpus chargé.

* **Retourne :** Un objet contenant le nombre d'occurrences et un tableau de résultats.

```javascript
bible.chercher("lumière").then(result => {
    console.log(result.count); 
    console.log(result.results); // Structure: [{ ref: "Genèse 1:3", texte: "..." }, ...]
});

```

### `comparer(livre, chapitre, verset, versions)`

Récupère le texte d'un verset spécifique dans les langues indiquées.

* **Paramètre `versions` :** Tableau de chaînes de caractères (ex: `["fr", "mg", "en"]`).

```javascript
bible.comparer("Jean", 3, 16, ["fr", "mg", "en"])
     .then(data => {
         console.log(data.versions.FR); 
         console.log(data.versions.MG); 
     });
```

### `versetDuJour()`

Retourne un verset pseudo-aléatoire déterminé par une graine (seed) basée sur la date courante.

### `livres()`

Retourne la liste exhaustive des noms de livres disponibles dans la version chargée.

---

## Format des Données de Réponse

Les méthodes de lecture renvoient un objet standardisé JSON :

```json
{
  "ref": "Jean 3:16",
  "chapitres": [3],
  "verses": [
    {
      "verse": "16",
      "text": "Car Dieu a tant aimé le monde...",
      "titre": "L'amour de Dieu" 
    }
  ]
}

```

*Note : Le champ `titre` est optionnel et dépend de la source de données.*


