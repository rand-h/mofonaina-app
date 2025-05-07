import os
import json
import base64
import requests
import time
import uuid
from pathlib import Path
from datetime import datetime

class ImgurUploader:
    def __init__(self, client_id, data_file='imgur_data.json'):
        self.client_id = client_id
        self.headers = {'Authorization': f'Client-ID {self.client_id}'}
        self.data_file = data_file
        self.uploaded_images = self._load_uploaded_images()
        self.retry_delay = 5  # Délai entre les tentatives en secondes
        self.max_retries = 3  # Nombre maximum de tentatives

    def _load_uploaded_images(self):
        if not Path(self.data_file).exists():
            return {}
        with open(self.data_file, 'r') as f:
            try:
                data = json.load(f)
                return {img['filepath']: img for img in data}
            except json.JSONDecodeError:
                return {}

    def _save_uploaded_images(self):
        with open(self.data_file, 'w') as f:
            json.dump(list(self.uploaded_images.values()), f, indent=4)

    def _is_image_file(self, filepath):
        image_extensions = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp']
        return str(filepath).lower().endswith(tuple(image_extensions))

    def upload_image(self, image_path):
        image_path = Path(image_path)
        original_name = image_path.name

        # Éviter de réuploader un fichier déjà traité (par son chemin complet)
        if str(image_path) in self.uploaded_images:
            print(f"✓ Déjà uploadé: {original_name}")
            return False

        # Générer un nom aléatoire
        random_name = f"{uuid.uuid4().hex}{image_path.suffix}"

        for attempt in range(self.max_retries):
            try:
                with open(image_path, 'rb') as f:
                    image_data = base64.b64encode(f.read()).decode('utf-8')

                data = {'image': image_data, 'type': 'base64'}

                response = requests.post(
                    'https://api.imgur.com/3/image',
                    headers=self.headers,
                    data=data,
                    timeout=30
                )

                response.raise_for_status()
                result = response.json()

                if not result.get('success', False):
                    error_msg = result.get('data', {}).get('error', 'Upload failed')
                    raise Exception(f"API Error: {error_msg}")

                img_data = {
                    'filename': random_name,
                    'original_name': original_name,
                    'link': result['data'].get('link', ''),
                    'deletehash': result['data'].get('deletehash', ''),
                    'id': result['data'].get('id', ''),
                    'upload_date': datetime.now().isoformat(),
                    'filepath': str(image_path)
                }

                self.uploaded_images[str(image_path)] = img_data
                self._save_uploaded_images()

                print(f"✓ Upload réussi: {original_name}")
                print(f"   Lien: {img_data['link']}")
                return True

            except requests.exceptions.HTTPError as e:
                if e.response.status_code == 429:
                    wait_time = int(e.response.headers.get('Retry-After', self.retry_delay))
                    print(f"⚠ Trop de requêtes. Attente de {wait_time} secondes...")
                    time.sleep(wait_time)
                    continue
                print(f"✗ Erreur HTTP pour {original_name}: {str(e)}")
            except requests.exceptions.RequestException as e:
                print(f"✗ Erreur réseau pour {original_name}: {str(e)}")
            except Exception as e:
                print(f"✗ Erreur lors de l'upload de {original_name}: {str(e)}")

            if attempt < self.max_retries - 1:
                print(f"↻ Nouvelle tentative dans {self.retry_delay} secondes...")
                time.sleep(self.retry_delay)

        return False

    def process_directory(self, directory):
        directory_path = Path(directory)
        if not directory_path.exists():
            print(f"✗ Le dossier {directory} n'existe pas.")
            return

        print(f"🔍 Scan du dossier {directory}...")
        total_files = 0
        new_uploads = 0
        skipped = 0
        errors = 0

        for filepath in directory_path.rglob('*'):
            if filepath.is_file() and self._is_image_file(filepath):
                total_files += 1
                if self.upload_image(filepath):
                    new_uploads += 1
                else:
                    if str(filepath) in self.uploaded_images:
                        skipped += 1
                    else:
                        errors += 1

        print("\n📊 Résumé:")
        print(f"- Fichiers trouvés: {total_files}")
        print(f"- Nouveaux uploads: {new_uploads}")
        print(f"- Déjà uploadés: {skipped}")
        print(f"- Échecs: {errors}")

def main():
    CLIENT_ID = 'VOTRE_CLIENT_ID_IMGUR'  # ← Remplace ici
    TARGET_DIRECTORY = './images'  # ← Dossier à scanner

    uploader = ImgurUploader(CLIENT_ID)
    uploader.process_directory(TARGET_DIRECTORY)

if __name__ == '__main__':
    main()
