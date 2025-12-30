class FihiranaAPI {

  constructor(basePath = 'https://raw.githubusercontent.com/rand-h/mofonaina-app/main/data/fihirana/') {
    this.data = {}; 
    this.basePath = basePath;
    this.categories = new Map([
      ['ff', 0.3],
      ['FFPM', 0.6],
      ['antema', 0.08],
      ['tsanta', 0.02]
    ]);
  }
  
  // Mettre à jour le chemin de base
  setBasePath(basePath) {
    this.basePath = basePath;
  }
  
  // Charger les données JSON avec cache (RAM + IndexedDB)
  async loadData(category) {
    const normalizedCategory = this.normalizeRef(category);
    
    // 1. Vérifier si les données sont déjà dans le cache RAM
    if (this.data[normalizedCategory]) {
      return; 
    }
    
    // 2. Vérifier IndexedDB (Cache Disque Rapide)
    try {
        if (typeof idbKeyval !== 'undefined') {
            // Clé unique pour ne pas mélanger avec la bible: fihirana_ff, fihirana_FFPM, etc.
            const dataFromDB = await idbKeyval.get(`fihirana_${normalizedCategory}`);
            if (dataFromDB) {
                // console.log(`Chants ${normalizedCategory} chargés depuis IndexedDB ⚡`);
                this.data[normalizedCategory] = dataFromDB;
                return;
            }
        }
    } catch (e) {
        console.warn("Erreur lecture IndexedDB Fihirana:", e);
    }

    // 3. Si pas en cache, Téléchargement Réseau
    try {
      const response = await fetch(`${this.basePath}${normalizedCategory}.json`);
      if (!response.ok) {
        throw new Error(`Fichier ${this.basePath}${normalizedCategory}.json introuvable`);
      }
      
      const jsonData = await response.json();
      this.data[normalizedCategory] = jsonData;
      
      // 4. Sauvegarder dans IndexedDB pour la prochaine fois
      if (typeof idbKeyval !== 'undefined') {
          idbKeyval.set(`fihirana_${normalizedCategory}`, jsonData).catch(err => console.warn(err));
      }
      
      if (!this.data[normalizedCategory] || Object.keys(this.data[normalizedCategory]).length === 0) {
        console.warn(`Aucun chant trouvé dans la catégorie ${normalizedCategory}`);
        this.data[normalizedCategory] = {}; 
      }
    } catch (error) {
      console.error(`Erreur lors du chargement de ${this.basePath}${normalizedCategory}.json :`, error);
      this.data[normalizedCategory] = {}; 
    }
  }
  
  // Charger tous les fichiers JSON d'un dossier avec cache (RAM + IndexedDB)
  async chargerTousLesFichiersJSON(dossier) {
    try {
      // Récupérer la liste des fichiers JSON
      const response = await fetch(`${dossier}/liste.json`);
      if (!response.ok) {
        throw new Error(`Impossible de charger la liste des fichiers JSON depuis ${dossier}`);
      }
      const listeFichiers = await response.json();
      
      // Charger chaque fichier JSON
      for (const fichier of listeFichiers) {
        const cheminComplet = `${dossier}/${fichier}`;
        const category = fichier.replace('.json', ''); 
        const normalizedCategory = this.normalizeRef(category); // Normalisation pour cohérence
        
        // 1. Vérifier RAM
        if (this.data[normalizedCategory]) {
        //   console.log(`Fichier ${fichier} déjà chargé dans le cache RAM.`);
          continue;
        }

        // 2. Vérifier IndexedDB avant de fetcher
        let loadedFromIDB = false;
        try {
            if (typeof idbKeyval !== 'undefined') {
                const dataFromDB = await idbKeyval.get(`fihirana_${normalizedCategory}`);
                if (dataFromDB) {
                    this.data[normalizedCategory] = dataFromDB;
                    loadedFromIDB = true;
                    // console.log(`Fichier ${fichier} chargé depuis IndexedDB.`);
                }
            }
        } catch(e) {}

        if (loadedFromIDB) continue;
        
        // 3. Fetch réseau si pas en DB
        const responseFichier = await fetch(cheminComplet);
        if (!responseFichier.ok) {
          console.warn(`Fichier ${cheminComplet} introuvable`);
          continue;
        }
        
        const donnees = await responseFichier.json();
        
        if (this.verifierFormatJSON(donnees)) {
          this.data[normalizedCategory] = donnees;
          
          // 4. Sauvegarde
          if (typeof idbKeyval !== 'undefined') {
            idbKeyval.set(`fihirana_${normalizedCategory}`, donnees).catch(e => console.warn(e));
          }
          
          console.log(`Fichier ${fichier} chargé avec succès et mis en cache.`);
        } else {
          console.warn(`Fichier ${fichier} ignoré : format incompatible.`);
        }
      }
    } catch (error) {
      console.error(`Erreur lors du chargement des fichiers JSON depuis ${dossier} :`, error);
    }
  }
  
  // Vérifier le format des données JSON
  verifierFormatJSON(donnees) {
    if (typeof donnees !== 'object' || donnees === null) {
      return false;
    }
    
    for (const key in donnees) {
      const chant = donnees[key];
      if (!chant.laharana || !chant.lohateny || !chant.hira) {
        console.error('JSON Format not good');
        return false;
      }
    }
    return true;
  }
  
  // Normaliser la référence (insensible à la casse)
  normalizeRef(ref) {
    return ref.toLowerCase();
  }
  
  // Formater la référence en majuscules
  formatRefCase(ref) {
    return ref.toUpperCase();
  }
  
  // Récupérer un chant spécifique
  async chanter(category, number) {
    const normalizedCategory = this.normalizeRef(category);
    await this.loadData(normalizedCategory);
    
    const key = `${normalizedCategory}_${number}`;
    if (!this.data[normalizedCategory] || !this.data[normalizedCategory][key]) {
      throw new Error(`Chant non trouvé : ${key}`);
    }
    
    const chant = this.data[normalizedCategory][key];
    return {
      ref: this.formatRefCase(`${category} ${number}`), // Référence en majuscules
      type: category,
      number: parseInt(number),
      title: chant.lohateny, // Titre en casse d'origine
      content: chant.hira.map(strophe => ({
        number: strophe.andininy,
        chant: strophe.tononkira, // Paroles en casse d'origine
        refrain: strophe.fiverenany
      }))
    };
  }
  
  // Nombre de chants dans une catégorie
  async nombreChant(category) {
    const normalizedCategory = this.normalizeRef(category);
    await this.loadData(normalizedCategory);
    // Sécurité au cas où la catégorie est vide
    if (!this.data[normalizedCategory]) return { count: 0 };
    return { count: Object.keys(this.data[normalizedCategory]).length };
  }
  
  // Rechercher un mot-clé dans les paroles des chants
  async chercheMotCle(motCle) {
      const results = {};
      const normalizedMotCle = motCle.toLowerCase();
      
      for (const category in this.data) {
          if (!this.data[category]) continue; 
          
          results[category] = {
              count: 0,
              chants: []
          };
          
          for (const key in this.data[category]) {
              const chant = this.data[category][key];
              if (!chant || !chant.hira) continue;
              
              let displayTitle = chant.lohateny;
              if (!displayTitle || displayTitle.trim() === "") {
                  const firstVerse = chant.hira.find(strophe => !strophe.fiverenany);
                  if (firstVerse) {
                      displayTitle = firstVerse.tononkira.substring(0, 50);
                      if (firstVerse.tononkira.length > 50) {
                          displayTitle += "...";
                      }
                  } else {
                      displayTitle = chant.hira[0]?.tononkira.substring(0, 50) || "Sans titre";
                      if (chant.hira[0]?.tononkira.length > 50) {
                          displayTitle += "...";
                      }
                  }
              }

              const matchingStrophes = [];
              for (const strophe of chant.hira) {
                  const stropheText = strophe.tononkira.toLowerCase();
                  if (stropheText.includes(normalizedMotCle)) {
                      const startPos = Math.max(0, stropheText.indexOf(normalizedMotCle) - 20);
                      const endPos = Math.min(
                          stropheText.length, 
                          stropheText.indexOf(normalizedMotCle) + normalizedMotCle.length + 20
                      );
                      
                      const context = strophe.tononkira.substring(startPos, endPos);
                      
                      matchingStrophes.push({
                          stropheNumber: strophe.andininy,
                          isRefrain: !!strophe.fiverenany,
                          matchContext: context.trim()
                      });
                  }
              }
              
              if (matchingStrophes.length > 0) {
                  results[category].count++;
                  results[category].chants.push({
                      ref: this.formatRefCase(`${category} ${chant.laharana}`),
                      title: displayTitle,
                      matchingStrophes: matchingStrophes
                  });
              }
          }
      }
      
      return { results };
  }
  
  // Rechercher un mot-clé dans les titres des chants
  async chercheMotCle_titre(motCle) {
    const results = {};
    const normalizedMotCle = motCle.toLowerCase();
    
    for (const category in this.data) {
      if (!this.data[category]) continue; 
      
      results[category] = {
        count: 0, 
        chants: [] 
      };
      
      for (const key in this.data[category]) {
        const chant = this.data[category][key];
        if (!chant || !chant.lohateny) continue; 
        
        if (chant.lohateny.toLowerCase().includes(normalizedMotCle)) {
          results[category].count++;
          results[category].chants.push({
            ref: this.formatRefCase(`${category} ${chant.laharana}`), 
            title: chant.lohateny 
          });
        }
      }
    }
    
    return { results };
  }
  
  // Formater une référence
  formatRef(ref) {
    const [category, number] = ref.split(' ');
    const normalizedCategory = this.normalizeRef(category);
    return {
      ref: this.formatRefCase(`${normalizedCategory} ${number}`), 
      category: normalizedCategory,
      number: parseInt(number)
    };
  }
  
  // Chant aléatoire avec pondération
  async chantRandom() {
    if (this.categories.size === 0) {
      throw new Error("Aucune catégorie disponible");
    }
    
    const cumulativeWeights = [];
    let totalWeight = 0;
    for (const [category, weight] of this.categories) {
      totalWeight += weight;
      cumulativeWeights.push({ category, cumulativeWeight: totalWeight });
    }
    
    const random = Math.random() * totalWeight;
    let selectedCategory = '';
    for (const { category, cumulativeWeight } of cumulativeWeights) {
      if (random < cumulativeWeight) {
        selectedCategory = category;
        break;
      }
    }
    
    const { count } = await this.nombreChant(selectedCategory);
    if (count === 0) {
      // Retry or throw logic could be improved here if categories are empty, but keeping original logic
      throw new Error(`Aucun chant trouvé dans la catégorie ${selectedCategory}`);
    }
    
    const randomNumber = Math.floor(Math.random() * count) + 1;
    
    return this.chanter(selectedCategory, randomNumber);
  }
  
  // Ajouter une nouvelle catégorie avec un poids
  ajouterCategorie(category, weight) {
    if (this.categories.has(category)) {
      console.warn(`La catégorie ${category} existe déjà`);
      return;
    }
    this.categories.set(category, weight);
  }
  
  // Titre d'un chant
  async titreChant(ref) {
    const [category, number] = ref.split(' ');
    const normalizedCategory = this.normalizeRef(category);
    await this.loadData(normalizedCategory);
    
    const key = `${normalizedCategory}_${number}`;
    if (!this.data[normalizedCategory] || !this.data[normalizedCategory][key]) {
      throw new Error(`Chant non trouvé : ${key}`);
    }
    
    const chant = this.data[normalizedCategory][key];
    return {
      ref: this.formatRefCase(ref), 
      title: chant.lohateny 
    };
  }
  
  // Nombre de strophes sans compter les refrains
  async nombreStrophe(ref) {
    const [category, number] = ref.split(' ');
    const normalizedCategory = this.normalizeRef(category);
    await this.loadData(normalizedCategory);
    
    const key = `${normalizedCategory}_${number}`;
    if (!this.data[normalizedCategory] || !this.data[normalizedCategory][key]) {
      throw new Error(`Chant non trouvé : ${key}`);
    }
    
    const chant = this.data[normalizedCategory][key];
    const strophes = chant.hira.filter(strophe => !strophe.fiverenany);
    return {
      ref: this.formatRefCase(ref),
      count: strophes.length
    };
  }
  
  // Vider le cache
  viderCache() {
    this.data = {};
    console.log('Cache RAM vidé.');
    // Note: Pour vider aussi IndexedDB, il faudrait appeler idbKeyval.clear() ou del()
    // mais on garde le comportement original qui ne vide que la RAM.
  }
}