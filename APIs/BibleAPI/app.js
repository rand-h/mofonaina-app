document.addEventListener('DOMContentLoaded', () => {
    // Initialisation
    let api = new BibleAPI('fr');
    const inputSearch = document.getElementById('inputSearch');
    const btnAction = document.getElementById('btnAction');
    const btnVersetJour = document.getElementById('btnVersetJour');
    const resultsArea = document.getElementById('resultsArea');
    const langueSelect = document.getElementById('langueSelect');

    // 1. Démarrage : Charger le verset du jour
    loadDayVerse();

    // 2. Gestion du changement de langue
    langueSelect.addEventListener('change', (e) => {
        showLoader();
        api = new BibleAPI(e.target.value);
        api.ready.then(() => {
            // Recharger la dernière action ou le verset du jour
            inputSearch.value = "";
            loadDayVerse();
        }).catch(err => showError(err.message));
    });

    // 3. Gestion de la recherche (Click & Entrée)
    btnAction.addEventListener('click', handleSearch);
    inputSearch.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleSearch();
    });

    btnVersetJour.addEventListener('click', loadDayVerse);

    // --- Fonctions Logiques ---

    async function handleSearch() {
        const query = inputSearch.value.trim();
        if (!query) return;

        showLoader();

        try {
            await api.ready; // Attendre que l'API soit chargée

            // Détection basique : Contient un chiffre ? -> Référence. Sinon -> Mot-clé
            const hasDigit = /\d/.test(query);
            
            let data;
            if (hasDigit) {
                // Essayer de lire comme une référence
                data = await api.lire(query);
                // Si erreur, peut-être que c'est une recherche textuelle avec un chiffre (rare mais possible)
                if (data.error && !data.verses) {
                    data = await api.chercher(query);
                }
            } else {
                // Recherche par mot-clé
                data = await api.chercher(query);
            }

            displayResults(data, query);

        } catch (err) {
            showError("Une erreur est survenue lors de la recherche.");
            console.error(err);
        }
    }

    async function loadDayVerse() {
        showLoader();
        try {
            const verse = await api.versetDuJour();
            // On formate comme un résultat de lecture unique
            const fakeData = {
                ref: "Verset du jour",
                isDayVerse: true,
                verses: [{
                    verse: verse.ref.split(':')[1], // Extraction brute pour l'affichage
                    text: verse.texte,
                    fullRef: verse.ref
                }]
            };
            displayResults(fakeData);
        } catch (err) {
            showError(err.message);
        }
    }

    // --- Fonctions d'Affichage ---

    function displayResults(data, query = "") {
        resultsArea.innerHTML = '';

        if (data.error || (data.results && data.count === 0)) {
            resultsArea.innerHTML = `
                <div class="empty-state">
                    <i class="ph ph-warning-circle"></i>
                    <h3>Aucun résultat</h3>
                    <p>Nous n'avons rien trouvé pour "${query}".</p>
                </div>`;
            return;
        }

        // Cas A : Recherche par mot-clé (Liste de résultats)
        if (data.results) {
            const header = document.createElement('h3');
            header.style.marginBottom = '1rem';
            header.textContent = `${data.count} résultats trouvés`;
            resultsArea.appendChild(header);

            // Limite à 20 pour la perf d'affichage DOM
            data.results.slice(0, 20).forEach(item => {
                const card = createVerseCard(item.ref, [{ text: item.texte, verse: "" }]);
                resultsArea.appendChild(card);
            });
            return;
        }

        // Cas B : Lecture (Chapitre ou Verset unique)
        const versesList = data.verses || [];
        // Si c'est le verset du jour, on utilise la ref complète stockée
        const title = data.isDayVerse && versesList[0].fullRef ? versesList[0].fullRef : data.ref;
        
        const card = createVerseCard(title, versesList, data.isDayVerse);
        resultsArea.appendChild(card);
    }

    function createVerseCard(title, verses, highlight = false) {
        const div = document.createElement('div');
        div.className = 'result-card';
        if (highlight) div.style.borderLeft = "4px solid var(--accent-color)";

        let htmlContent = `
            <div class="result-header">
                <span class="result-ref">${title}</span>
                <div class="actions">
                    <i class="ph ph-copy" style="cursor:pointer" title="Copier"></i>
                </div>
            </div>
            <div class="verse-text">
        `;

        verses.forEach(v => {
            // Afficher le numéro de verset seulement si ce n'est pas vide
            const numDisplay = v.verse ? `<span class="verse-number">${v.verse}</span>` : '';
            htmlContent += `${numDisplay}${v.text} `;
        });

        htmlContent += `</div>`;
        div.innerHTML = htmlContent;

        // Copie simple au clic sur l'icône
        div.querySelector('.ph-copy').addEventListener('click', () => {
            const textToCopy = `${title}\n${verses.map(v => v.text).join(' ')}`;
            navigator.clipboard.writeText(textToCopy);
            alert("Copié dans le presse-papier !");
        });

        return div;
    }

    function showLoader() {
        resultsArea.innerHTML = `
            <div class="loader">
                <div class="spinner"></div>
            </div>`;
    }

    function showError(msg) {
        resultsArea.innerHTML = `
            <div class="empty-state">
                <i class="ph ph-x-circle" style="color:#ef4444"></i>
                <h3>Oups !</h3>
                <p>${msg}</p>
            </div>`;
    }
});