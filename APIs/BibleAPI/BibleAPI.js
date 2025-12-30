/**
 * ============================================================================
 * MOFONAINA.APP — BIBLE API CLIENT
 * ============================================================================
 * Gestionnaire de données bibliques
 * * @version 5.0c
 * @author Hosea Rand.
 */

const cache = {};

class BibleAPI {
  constructor(langue) {
    this.langue = langue;
    this.data = cache[langue] || null;
    this.ready = this.data ? Promise.resolve(this.data) : this.chargerDonnees(langue);
  }

  async chargerDonnees(langue = 'mg') {
    // 1. Vérification du cache RAM (si on change de page sans recharger)
    if (cache[langue]) {
      this.data = cache[langue];
      return this.data;
    }

    // NOUVEAU : 2. Vérification du cache IndexedDB (Disque dur local)
    // Cela permet de récupérer les données SANS télécharger ni parser le JSON
    try {
        if (typeof idbKeyval !== 'undefined') {
            const dataFromDB = await idbKeyval.get(`bible_${langue}`);
            if (dataFromDB) {
                console.log(`Données chargées depuis IndexedDB (${langue}) - Chargement instantané ⚡`);
                this.data = dataFromDB;
                cache[langue] = this.data; // Mise en RAM
                return this.data;
            }
        }
    } catch (err) {
        console.warn("Erreur lecture IndexedDB (fallback réseau):", err);
    }

    // 3. Chargement Réseau Classique (si pas dans la DB)
    const fichiers = {
      mg: 'https://raw.githubusercontent.com/rand-h/mofonaina-app/main/data/baiboly/bible_mg.json',
      fr: 'https://raw.githubusercontent.com/rand-h/mofonaina-app/main/data/baiboly/bible_fr.json',
      en: 'https://raw.githubusercontent.com/rand-h/mofonaina-app/main/data/baiboly/bible_en.json'
    };
    
    const filePath = fichiers[langue];
    
    if (!filePath) {
      throw new Error(`Langue non supportée : ${langue}`);
    }

    try {
      console.log(`Téléchargement du fichier JSON : ${filePath}...`);
      const response = await fetch(filePath);
      if (!response.ok) {
        throw new Error(`Erreur de chargement du fichier : ${response.statusText}`);
      }
      
      this.data = await response.json();
      
      // NOUVEAU : 4. Sauvegarde dans IndexedDB pour la prochaine fois
      if (typeof idbKeyval !== 'undefined') {
          idbKeyval.set(`bible_${langue}`, this.data)
            .then(() => console.log("Données sauvegardées dans IndexedDB pour le futur."))
            .catch(err => console.warn("Impossible de sauvegarder dans IndexedDB:", err));
      }

      cache[langue] = this.data; // Mettre en cache RAM
      return this.data;

    } catch (error) {
      console.error("Erreur lors du chargement du fichier :", error);
      throw error;
    }
  }

  // --- LE RESTE EST STRICTEMENT IDENTIQUE À VOTRE CODE ---

  capitalizeFirstLetter(text) {
    if (typeof text !== 'string') {
      console.error("Erreur: L'entrée n'est pas une chaîne de caractères.");
      return text;
    }
    return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
  }

  async lire(livre, chapitre = null, verse1 = null, verse2 = null) {
    await this.ready;
    if (!this.data) return { error: "Données non chargées" };

    if (typeof livre === 'string' && livre.includes(':') && livre.includes('-')) {
        return this.lireParReference(livre);
    }
    else {
        return this.lireAncienneMethode(livre, chapitre, verse1, verse2);
    }
  }

  async lireParReference(reference) {
        const parsedRef = await this.parseReference(reference);
        if (parsedRef.error) return parsedRef;

        const { livre, startChap, startVerse, endChap, endVerse } = parsedRef;

        let numeroLivre;
        if (isNaN(livre)) { 
            const refHelper = (typeof BibleReference !== 'undefined') ? new BibleReference() : null;
            if (refHelper) {
                numeroLivre = await refHelper.getNumeroLivre(livre);
                if (numeroLivre.error) return numeroLivre;
            } else {
                 // Fallback si la classe BibleReference n'est pas chargée
                 const tempBook = this.trouverLivre(livre);
                 if (!tempBook) return { error: "Livre non trouvé" };
                 // Astuce pour trouver l'index
                 numeroLivre = this.data.bible.flatMap(t => t.books).indexOf(tempBook) + 1;
            }
        } else { 
            numeroLivre = parseInt(livre);
        }

        const book = this.trouverLivre(numeroLivre); 
        if (!book) return { error: "Livre non trouvé" };

        const result = {
            ref: "",
            chapitres: [],
            verses: []
        };

        result.ref = this.buildFullReference(book.book_name, startChap, startVerse, endChap, endVerse);

        const chapters = [];
        for (let chap = startChap; chap <= endChap; chap++) {
            const chapter = book.chapters.find(c => c.chapter_number === chap);
            if (chapter) chapters.push(chapter);
        }

        if (chapters.length === 0) return result;

        const isInterChapter = startChap !== endChap;

        for (let i = 0; i < chapters.length; i++) {
            const chapter = chapters[i];
            const isFirstChap = (i === 0);
            const isLastChap = (i === chapters.length - 1);

            const start = isFirstChap ? startVerse : 1;
            const end = isLastChap ? endVerse : chapter.verses.length;

            const verses = this.trouverVerses(chapter, start, end);
            result.verses.push(...verses.map(v => ({
                verse: isInterChapter 
                    ? `${chapter.chapter_number}.${v.verse_number}` 
                    : v.verse_number.toString(), 
                text: v.text,
                ...(v.title && { titre: v.title })
            })));
        }

        result.chapitres = chapters.map(c => c.chapter_number);

        return result;
    }

    async lireAncienneMethode(livre, chapitre, verse1, verse2) {
        const book = this.trouverLivre(livre);
        if (!book) return { error: "Livre non trouvé" };

        const result = {
            ref: "",
            chapitre: "",
            verse_debut: "",
            verse_fin: "",
            verses: []
        };

        if (verse2 === "fin") {
            const nbVersets = await this.nb_verse_chapitre(livre, chapitre);
            if (nbVersets.error) {
                return { error: "Impossible de déterminer le nombre de versets" };
            }
            verse2 = nbVersets[livre];
        }

        const chapters = this.trouverChapitres(book, chapitre);
        let verses = [];

        chapters.forEach(ch => {
            const chVerses = this.trouverVerses(ch, verse1, verse2);
            verses = verses.concat(chVerses);
        });

        result.ref = this.constructReference(book, chapters, verse1, verse2);
        result.chapitre = chapters.length === 1 ? chapters[0].chapter_number.toString() : "";
        result.verse_debut = verses[0]?.verse_number.toString() || "";
        result.verse_fin = verses.length > 1 ? verses[verses.length - 1].verse_number.toString() : "";
        result.verses = verses.map(v => ({
            verse: v.verse_number.toString(),
            text: v.text,
            ...(v.title && { titre: v.title })
        }));

        return result;
    }

    async parseReference(reference) {
        if (typeof reference !== 'string') {
            return { error: "La référence doit être une chaîne de caractères" };
        }

        const refNormalized = reference.trim();

        const interChapRegex = /^(\d*\s*[\p{L}''\-]+(?:\s+[\p{L}''\-]+)*)\s+(\d+):(\d+)\s*-\s*(\d+):(\d+)$/ui;
        const finRegex = /^(\d*\s*[\p{L}''\-]+(?:\s+[\p{L}''\-]+)*)\s+(\d+):(\d+)\s*-\s*fin$/ui;
        const rangeRegex = /^(\d*\s*[\p{L}''\-]+(?:\s+[\p{L}''\-]+)*)\s+(\d+):(\d+)\s*-\s*(\d+)$/ui;
        const singleVerseRegex = /^(\d*\s*[\p{L}''\-]+(?:\s+[\p{L}''\-]+)*)\s+(\d+):(\d+)$/ui;
        const chapterOnlyRegex = /^(\d*\s*[\p{L}''\-]+(?:\s+[\p{L}''\-]+)*)\s+(\d+)$/ui;

        let match;
        let parsed = {};
        
        if ((match = refNormalized.match(interChapRegex))) {
            parsed = {
                livre: match[1].trim(),
                startChap: parseInt(match[2]),
                startVerse: parseInt(match[3]),
                endChap: parseInt(match[4]),
                endVerse: parseInt(match[5])
            };
        }
        else if ((match = refNormalized.match(finRegex))) {
            parsed = {
                livre: match[1].trim(),
                startChap: parseInt(match[2]),
                startVerse: parseInt(match[3]),
                endChap: parseInt(match[2]),
                endVerse: "fin"
            };
        }
        else if ((match = refNormalized.match(rangeRegex))) {
            parsed = {
                livre: match[1].trim(),
                startChap: parseInt(match[2]),
                startVerse: parseInt(match[3]),
                endChap: parseInt(match[2]),
                endVerse: parseInt(match[4])
            };
        }
        else if ((match = refNormalized.match(singleVerseRegex))) {
            parsed = {
                livre: match[1].trim(),
                startChap: parseInt(match[2]),
                startVerse: parseInt(match[3]),
                endChap: parseInt(match[2]),
                endVerse: parseInt(match[3])
            };
        }
        else if ((match = refNormalized.match(chapterOnlyRegex))) {
            parsed = {
                livre: match[1].trim(),
                startChap: parseInt(match[2]),
                startVerse: 1,
                endChap: parseInt(match[2]),
                endVerse: "fin"
            };
        }
        else {
            return { error: `Format invalide: "${reference}"` };
        }

        if (parsed.endVerse === "fin") {
            try {
                const nbVersets = await this.nb_verse_chapitre(parsed.livre, parsed.endChap);
                if (nbVersets.error) return nbVersets;
                parsed.endVerse = nbVersets[parsed.livre] || nbVersets;
            } catch (error) {
                return { error: "Erreur lors de la recherche du nombre de versets" };
            }
        }

        return parsed;
    }

    buildFullReference(bookName, startChap, startVerse, endChap, endVerse) {
        let ref = `${bookName} ${startChap}:${startVerse}`;
        
        if (startChap !== endChap) {
            ref += `-${endChap}:${endVerse}`;
        } else if (startVerse !== endVerse) {
            ref += `-${endVerse}`;
        }
        
        return ref;
    }

  constructReference(book, chapters, verse1, verse2) {
    const livreNom = book.book_name;
    const chapitre = chapters.length === 1 ? chapters[0].chapter_number : '';
    const versetDebut = verse1 || '';
    const versetFin = verse2 || (verse1 !== undefined ? verse1 : '');
    
    let ref = `${livreNom} ${chapitre}`;
    if (versetDebut) {
      ref += `:${versetDebut}`;
    }
    if (versetFin && versetDebut !== versetFin) {
      ref += `-${versetFin}`;
    }
    return ref;
  }

  async chercher(motCle) {
    await this.ready;

    if (!this.data) return { error: "Données non chargées" };

    const results = [];
    this.data.bible.forEach(testament => {
      testament.books.forEach(book => {
        book.chapters.forEach(chapter => {
          chapter.verses.forEach(verse => {
            if (verse.text.toLowerCase().includes(motCle.toLowerCase())) {
              results.push({
                ref: `${book.book_name} ${chapter.chapter_number}:${verse.verse_number}`,
                texte: verse.text
              });
            }
          });
        });
      });
    });

    return {
      count: results.length,
      results
    };
  }

  async livres() {
    await this.ready;

    if (!this.data) return { error: "Données non chargées" };
    return this.data.bible.flatMap(t => t.books.map(b => b.book_name));
  }

  async chapitres(livre) {
    await this.ready;

    if (!this.data) return { error: "Données non chargées" };
    const book = this.trouverLivre(this.capitalizeFirstLetter(livre));
    return book ? { [livre]: book.total_chapters } : {};
  }

  async nb_verse_chapitre(livre, chapitre) {
    await this.ready;

    if (!this.data) return { error: "Données non chargées" };
    const book = this.trouverLivre(livre);
    if (!book) return { error: "Livre non trouvé" };
    
    const chapitreTrouve = book.chapters.find(c => c.chapter_number === chapitre);
    
    return chapitreTrouve 
      ? { [livre]: chapitreTrouve.total_verses } 
      : { error: "Chapitre non trouvé" };
  }

  async versetDuJour() {
    await this.ready;

    if (!this.data) return { error: "Données non chargées" };
    const verses = this.getAllVerses();
    const date = new Date();
    const seed = date.getFullYear() * 366 + date.getMonth() * 31 + date.getDate();
    const index = this.seededRandom(seed)() * verses.length | 0;
    return verses[index];
  }

  async comparer(livre, chapitre, verset, versions) {
    await this.ready;

    if (!this.data) return { error: "Données non chargées" };

    let numeroLivre;
    if (isNaN(livre)) {
      const livreNormalisé = this.capitalizeFirstLetter(livre);
      const livreTrouvé = this.trouverLivre(livreNormalisé);

      if (livreTrouvé) {
        numeroLivre = this.data.bible.flatMap(t => t.books).indexOf(livreTrouvé) + 1;
      } else {
        return { error: "Livre non trouvé" };
      }
    } else {
      numeroLivre = parseInt(livre);
    }

    const result = {
      ref: `${this.capitalizeFirstLetter(livre)} ${chapitre}:${verset}`,
      versions: {}
    };

    let versionsArray = typeof versions === 'string' 
      ? versions.split(/[\s,]+/).map(v => v.trim().toLowerCase()) 
      : versions;

    await Promise.all(versionsArray.map(async (lang) => {
      try {
        const api = new BibleAPI(lang);
        await api.ready;
        const reponse = await api.lire(numeroLivre, chapitre, verset);
        if (reponse.verses?.length > 0) {
          result.versions[lang.toUpperCase()] = reponse.verses[0].text;
        } else {
          console.warn(`Verset introuvable pour la version ${lang}`);
        }
      } catch (error) {
        console.error(`Erreur lors de la récupération pour la version ${lang}: ${error.message}`);
      }
    }));

    if (Object.keys(result.versions).length === 0) {
      return { error: "Aucun verset trouvé dans les versions spécifiées." };
    }

    return result;
  }
  
  async construire_Reference(book, chapters, verse1, verse2) {
        const livreNom = book;
        const chapitre = chapters;
        
        if (verse1 === undefined && verse2 === undefined) {
            return `${livreNom} ${chapitre}`;
        }
        
        if (verse1 !== undefined && verse2 === undefined) {
            const fin = await this.nb_verse_chapitre(livreNom, chapitre);
            const totalVerses = fin[livreNom] || fin; 
            return `${livreNom} ${chapitre}:${verse1}-${totalVerses}`;
        }
        
        let ref = `${livreNom} ${chapitre}`;
        if (verse1 !== undefined) {
            ref += `:${verse1}`;
            if (verse2 !== undefined && verse1 !== verse2) {
                ref += `-${verse2}`;
            }
        }
        
        return ref;
    } 

    format_reference(texte) {
      texte = texte.trim().replace(/'/g, "'");

      const matchInterChapter = texte.match(/^\s*(\d*)\s*([\p{L}\d\s'']+?)\s+(\d+)\s*[:]\s*(\d+)\s*[-]\s*(\d+)\s*[:]\s*(\d+)\s*$/u);
      if (matchInterChapter) {
          const livre = matchInterChapter[2].trim();
          const numeroLivre = matchInterChapter[1] ? `${matchInterChapter[1].trim()} ${livre}` : livre;
          return {
              livre: numeroLivre,
              chapitre: parseInt(matchInterChapter[3]),
              verse1: parseInt(matchInterChapter[4]),
              verse2: parseInt(matchInterChapter[6]),
              endChapter: parseInt(matchInterChapter[5])
          };
      }

      const matchRange = texte.match(/^\s*(\d*)\s*([\p{L}\d\s'']+?)\s+(\d+)\s*[:]\s*(\d+)\s*[-]\s*(\d+)\s*$/u);
      if (matchRange) {
          const livre = matchRange[2].trim();
          const numeroLivre = matchRange[1] ? `${matchRange[1].trim()} ${livre}` : livre;
          return {
              livre: numeroLivre,
              chapitre: parseInt(matchRange[3]),
              verse1: parseInt(matchRange[4]),
              verse2: parseInt(matchRange[5])
          };
      }

      const matchSingleVerse = texte.match(/^\s*(\d*)\s*([\p{L}\d\s'']+?)\s+(\d+)\s*[:]\s*(\d+)\s*$/u);
      if (matchSingleVerse) {
          const livre = matchSingleVerse[2].trim();
          const numeroLivre = matchSingleVerse[1] ? `${matchSingleVerse[1].trim()} ${livre}` : livre;
          return {
              livre: numeroLivre,
              chapitre: parseInt(matchSingleVerse[3]),
              verse1: parseInt(matchSingleVerse[4]),
              verse2: ""
          };
      }

      const matchChapterOnly = texte.match(/^\s*(\d*)\s*([\p{L}\d\s'']+?)\s+(\d+)\s*$/u);
      if (matchChapterOnly) {
          const livre = matchChapterOnly[2].trim();
          const numeroLivre = matchChapterOnly[1] ? `${matchChapterOnly[1].trim()} ${livre}` : livre;
          return {
              livre: numeroLivre,
              chapitre: parseInt(matchChapterOnly[3]),
              verse1: 1,
              verse2: "fin"
          };
      }

      return { error: "Format invalide" };
  }

  trouverLivre(livre) {
    if (typeof livre !== 'string' && typeof livre !== 'number') {
      console.error("Erreur: L'entrée du livre n'est pas valide.");
      return null;
    }

    if (typeof livre === 'number' && livre >= 1 && livre <= 66) {
      return this.data.bible.flatMap(t => t.books)[livre - 1]; 
    }

    const livreNormalisé = this.capitalizeFirstLetter(livre);

    let livreTrouvé = this.data.bible.flatMap(t => t.books)
        .find(b => b.book_name.toLowerCase() === livreNormalisé.toLowerCase());

    if (!livreTrouvé) {
        livreTrouvé = this.data.bible.flatMap(t => t.books)
            .find(b => b.book_name.substring(0, 3).toLowerCase() === livreNormalisé.substring(0, 3).toLowerCase());
    }

    return livreTrouvé;
  }

  trouverChapitres(book, chapitre) {
    if (!chapitre) return book.chapters;
    const target = book.chapters.reduce((prev, curr) => 
      Math.abs(curr.chapter_number - chapitre) < Math.abs(prev.chapter_number - chapitre) ? curr : prev
    );
    return [target];
  }

  trouverVerses(chapitre, start, end) {
    const verses = chapitre.verses;
    const s = start ? Math.max(1, Math.min(start, verses.length)) : 1;
    const e = end ? Math.min(end, verses.length) : start || verses.length;
    return verses.slice(s-1, e);
  }

  getAllVerses() {
    return this.data.bible.flatMap(t => 
      t.books.flatMap(b => 
        b.chapters.flatMap(c => 
          c.verses.map(v => ({
            ref: `${b.book_name} ${c.chapter_number}:${v.verse_number}`,
            texte: v.text
          }))
        )
      )
    );
  }

  seededRandom(seed) {
    return () => {
      const x = Math.sin(seed++) * 10000;
      return x - Math.floor(x);
    };
  }
}

window.BibleAPI = BibleAPI;