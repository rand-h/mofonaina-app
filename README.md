# MOFONAINA APP

<div align="center">

<img src="https://mofonaina-cabea.web.app/assets/img/ico.png" alt="Mofon'aina App Icon" width="200"/>

### [Visiter le site / Visit the website](https://mofonaina-cabea.web.app)

</div>

---

<details open>
<summary><i>[MG]</i> <b>Malagasy</b></summary>
<br>

**Mofonaina** dia rindranasan-tranonkala sy finday ahafahana mamaky ny **mofon'aina isan'andro**.  
Ity fampiharana ity dia manolotra endri-javatra maro ahafahana manaraka ny fivavahana sy ny famakiana Baiboly amin'ny fomba mora sy azo antoka.

### Endri-javatra fototra :
- <i>Mofon'aina isan'andro</i> 
- <i>Fandaharam-potoana mofon'aina mandavan-taona</i>
- <i>Famakiana Baiboly</i>
- <i>Fihirana (FFPM, Fihirana Fanampiny, Antema, Tsanta)</i> - Solfa
- <i>Fandaharana</i>
- <i>Fanazavana ny andininy amin'ny IA</i> (mbola andrana)  
- <i>Hita @ fiteny telo : malagasy, frantsay ary anglisy</i>

</details>

<details>
<summary><i>[FR]</i> <b>Français</b></summary>
<br>

**Mofonaina** est une application web et mobile permettant de lire les **mofon'aina du jour**.  
Cette application offre de nombreuses fonctionnalités pour suivre la dévotion et la lecture biblique de manière simple et fiable.

### Fonctionnalités principales :
- <i>Mofon'aina quotidien</i> 
- <i>Programme annuel des mofon'aina</i>
- <i>Lecture de la Bible</i>
- <i>Recueil de cantiques (FFPM, Fihirana Fanampiny, Antema, Tsanta)</i> Solfa
- <i>Explication des versets par IA</i> (expérimental)  
- <i>Support de trois langues : malgache, français, anglais</i>
- <i>et bien plus...</i>

</details>

<details>
<summary><i>[EN]</i> <b>English</b></summary>
<br>

**Mofonaina** is a web and mobile app that lets you read the **daily mofon'aina**.  
This app provides a rich set of tools to support daily devotion, Bible reading, and spiritual growth.

### Key Features:
- <i>Daily Mofon'aina</i>  
- <i>Annual Mofon'aina program</i>
- <i>Bible reading</i>
- <i>FJKM Hymnbook (FFPM, Fihirana Fanampiny, Antema, Tsanta, Solfa)</i>
- <i>AI-powered verse explanations</i> (experimental)  
- <i>Available in three languages: Malagasy, French, English</i>
- <i>and much more...</i>

</details>

---

<div align="center">

> <i>Rindranasa – Amin'ny fiteny telo – Maimaimpoana sy azo idirana amin'ny finday sy solosaina</i><br>
> <i>Application – En trois langues – Gratuite et accessible sur mobile & web</i><br>
> <i>App – In three languages – Free and available on mobile & web</i><br>

### [Ouvrir l’application / Open App](https://play.google.com/store/apps/details?id=app.web.mofonaina_cabea)

<br>

<sub>Dev by rand-h</sub>

</div>

---

## 🔗 Guide des Liens Profonds (Deep Links)

L'application Mofonaina supporte l'utilisation de liens profonds (Deep Links) pour rediriger directement les utilisateurs vers des contenus spécifiques (versets, cantiques, confessions de foi) depuis l'extérieur (navigateur, SMS, WhatsApp, etc.). 

Ces liens fonctionnent à la fois sur l'application mobile (ouverture native via Capacitor) et sur la version web.

### Construction des liens

| Contenu Cible | Structure de l'URL | Description & Règles |
| :--- | :--- | :--- |
| **Bible** | `/baiboly?ref=...` | **Paramètre `ref`** : Remplacer les espaces par des *underscores* (`_`). <br> *Ex: `.../baiboly?ref=Jaona_3:16`* |
| **Cantiques** | `?hira=...` | **Paramètre `hira`** : Supporte `ffpm`, `ff`, `antema`, `tsanta`, `safif`. Remplacer l'espace par un *underscore* (`_`).<br> *Ex: `.../?hira=ffpm_12`* |
| **Confessions de foi** | `/fanekempinoana?num=...` | **Paramètres `num` ou `laharana`** : Accepte uniquement les valeurs de `1` à `4`.<br> *Ex: `.../fanekempinoana?num=2`* |

> **💡 Note importante sur le formatage :**
> Pour garantir la compatibilité des liens sur toutes les plateformes (notamment les réseaux sociaux), évitez d'utiliser des espaces classiques dans les paramètres. Utilisez toujours le tiret du bas (`_`). L'application se charge de les reformater automatiquement lors de l'ouverture.
