from pathlib import Path

def renommer_sequence_webp():
    dossier_racine = Path(__file__).parent
    
    print(f"📂 Racine : {dossier_racine}")
    print("🔄 Renommage des .webp existants en 1.webp, 2.webp...")
    print("------------------------------------------------")

    # 1. Lister tous les dossiers
    tous_les_dossiers = [dossier_racine] + [x for x in dossier_racine.rglob('*') if x.is_dir()]

    for dossier_courant in tous_les_dossiers:
        
        # Récupérer uniquement les .webp
        fichiers_webp = [f for f in dossier_courant.iterdir() if f.is_file() and f.suffix.lower() == '.webp']
        
        if not fichiers_webp:
            continue

        # On trie pour garder un ordre logique (alphabétique)
        fichiers_webp.sort()
        
        print(f"   Dossier : {dossier_courant.relative_to(dossier_racine)} ({len(fichiers_webp)} images)")

        # --- ÉTAPE 1 : Renommage temporaire ---
        # Cela évite les erreurs "Le fichier existe déjà" si on a déjà un "1.webp" dans le dossier
        fichiers_temporaires = []
        for index, fichier in enumerate(fichiers_webp, start=1):
            # On crée un nom temporaire unique
            nom_temp = dossier_courant / f"__temp_rename_{index}__.tmp"
            
            try:
                fichier.rename(nom_temp)
                fichiers_temporaires.append(nom_temp)
            except Exception as e:
                print(f"❌ Erreur étape temp sur {fichier.name} : {e}")

        # --- ÉTAPE 2 : Renommage final (1.webp, 2.webp...) ---
        for index, fichier_temp in enumerate(fichiers_temporaires, start=1):
            nom_final = dossier_courant / f"{index}.webp"
            
            try:
                fichier_temp.rename(nom_final)
            except Exception as e:
                print(f"❌ Erreur étape finale sur {index}.webp : {e}")

    print("------------------------------------------------")
    print("🎉 Tout est renommé proprement !")

if __name__ == "__main__":
    renommer_sequence_webp()