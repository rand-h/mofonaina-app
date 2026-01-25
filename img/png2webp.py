from pathlib import Path
from PIL import Image

def convertir_renommer_supprimer(qualite=80):
    dossier_racine = Path(__file__).parent
    
    print(f"📂 Racine du projet : {dossier_racine}")
    print("⚠️  ATTENTION : Renommage (1.webp, 2.webp...) et suppression des originaux.")
    print("------------------------------------------------")

    extensions_valides = {'.jpg', '.jpeg', '.png'}
    
    # 1. On liste TOUS les sous-dossiers (et le dossier racine lui-même)
    # rglob('*') trouve tout, on filtre pour ne garder que les dossiers
    tous_les_dossiers = [dossier_racine] + [x for x in dossier_racine.rglob('*') if x.is_dir()]

    for dossier_courant in tous_les_dossiers:
        
        # 2. On récupère les images de ce dossier spécifique
        # On ignore les fichiers qui sont déjà en .webp pour ne pas les écraser ou les compter
        images_a_traiter = [
            f for f in dossier_courant.iterdir() 
            if f.is_file() and f.suffix.lower() in extensions_valides
        ]

        # S'il n'y a pas d'images ici, on passe au dossier suivant
        if not images_a_traiter:
            continue

        print(f"   Traitement du dossier : {dossier_courant.relative_to(dossier_racine)}")
        
        # 3. On TRIE les images pour que l'ordre 1, 2, 3 suive l'ordre alphabétique original
        # (Ex: photo_a.jpg deviendra 1.webp, photo_b.jpg deviendra 2.webp)
        images_a_traiter.sort()

        compteur = 1

        for fichier_original in images_a_traiter:
            try:
                # Définir le nouveau nom : 1.webp, 2.webp...
                nouveau_nom = dossier_courant / f"{compteur}.webp"

                # Conversion
                with Image.open(fichier_original) as img:
                    img.save(nouveau_nom, format="webp", quality=qualite)
                
                # Suppression de l'original
                fichier_original.unlink()
                
                # On incrémente le compteur seulement si tout s'est bien passé
                compteur += 1

            except Exception as e:
                print(f"❌ Erreur sur {fichier_original.name} : {e}")

        print(f"   ✅ {compteur - 1} images converties et renommées.")

    print("------------------------------------------------")
    print("🎉 Terminé !")

if __name__ == "__main__":
    convertir_renommer_supprimer()