# Guide de Déploiement SFTP vers OVH

## ⚠️ IMPORTANT - À lire avant toute configuration

Ce guide documente la configuration SFTP pour le déploiement automatique via GitHub Actions vers l'hébergement OVH. Cette procédure a été validée et fonctionne pour LOLOWOD et Excalidraw.

## Configuration des Secrets GitHub

### Où trouver les identifiants SFTP

**NE PAS CONFONDRE avec les identifiants MySQL !**

1. **OVH Manager** : https://www.ovh.com/manager/
2. **Navigation** : Hébergements → laurentcayuela.com → Onglet "FTP-SSH"
3. **Information visible** :
   - Serveur FTP/SFTP : `ftp.cluster028.hosting.ovh.net`
   - Login FTP : `laurenq`
   - Mot de passe : (si oublié, le réinitialiser ici)

### Configuration dans GitHub

**Repository Settings → Secrets and variables → Actions → New repository secret**

Créer exactement 3 secrets (ATTENTION aux espaces !) :

| Nom du Secret | Valeur | Notes |
|---------------|--------|-------|
| `OVH_HOST` | `ftp.cluster028.hosting.ovh.net` | Serveur SFTP, PAS `laurenqlolowod.mysql.db` |
| `OVH_USERNAME` | `laurenq` | Login FTP, PAS le login MySQL |
| `OVH_PASSWORD` | `[votre mot de passe FTP]` | Mot de passe FTP, PAS MySQL |

## ❌ Erreurs Courantes à Éviter

### 1. Utiliser les identifiants MySQL au lieu de SFTP
```
❌ FAUX : OVH_HOST = laurenqlolowod.mysql.db
✅ CORRECT : OVH_HOST = ftp.cluster028.hosting.ovh.net
```

### 2. Ajouter des espaces invisibles
- Copier-coller depuis un document peut ajouter des espaces
- **Solution** : Supprimer et recréer les secrets en collant directement

### 3. Utiliser un fichier temporaire pour le mot de passe
```yaml
❌ FAUX (échoue avec "Permission denied") :
echo '${{ secrets.OVH_PASSWORD }}' > /tmp/pass
sshpass -f /tmp/pass sftp ...

✅ CORRECT (fonctionne même avec caractères spéciaux) :
sshpass -p '${{ secrets.OVH_PASSWORD }}' sftp ...
```

### 4. Oublier de tester avec FileZilla
Avant de configurer GitHub Actions, vérifier que la connexion fonctionne :
- **Protocole** : SFTP (SSH File Transfer Protocol)
- **Hôte** : `ftp.cluster028.hosting.ovh.net`
- **Port** : 22
- **Type de connexion** : Normale
- **Utilisateur** : `laurenq`
- **Mot de passe** : [votre mot de passe FTP]

Si FileZilla se connecte ✅ mais GitHub Actions échoue ❌ → vérifier les espaces dans les secrets

## ✅ Workflow Pattern Validé

```yaml
name: Deploy to OVH

on:
  push:
    branches: [ main ]

jobs:
  deploy:
    runs-on: ubuntu-latest

    steps:
      - name: Checkout code
        uses: actions/checkout@v3

      - name: Install SFTP tools
        run: |
          sudo apt-get update
          sudo apt-get install -y sshpass

      - name: Deploy via SFTP
        run: |
          sshpass -p '${{ secrets.OVH_PASSWORD }}' sftp -o StrictHostKeyChecking=no -o PreferredAuthentications=password ${{ secrets.OVH_USERNAME }}@${{ secrets.OVH_HOST }} << EOF
          cd www

          # Créer dossier si nécessaire
          mkdir mon_dossier
          cd mon_dossier

          # Uploader fichiers
          lcd chemin/local
          put -r * .

          ls -la
          quit
          EOF
```

## 🔍 Debugging des Erreurs de Connexion

### Erreur : "Could not resolve hostname"
```
ssh: Could not resolve hostname ***: Name or service not known
```
**Cause** : `OVH_HOST` incorrect ou non défini
**Solution** : Vérifier que `OVH_HOST = ftp.cluster028.hosting.ovh.net` (pas le serveur MySQL)

### Erreur : "Permission denied"
```
Permission denied, please try again.
Error: Process completed with exit code 5.
```
**Causes possibles** :
1. Mauvais username ou password
2. Espaces invisibles dans les secrets GitHub
3. Confusion entre identifiants MySQL et SFTP

**Solutions** :
1. Tester la connexion dans FileZilla avec les mêmes identifiants
2. Supprimer et recréer les secrets GitHub (copier-coller sans espaces)
3. Vérifier dans OVH Manager (Hébergements → FTP-SSH)

### Le workflow réussit mais sans erreur visible
**Cause** : L'étape de test SFTP peut échouer mais le déploiement réussir quand même
**Solution** : Supprimer l'étape de test, garder seulement le déploiement direct

## 📋 Checklist de Vérification

Avant de déployer un nouveau projet :

- [ ] Vérifier connexion SFTP dans FileZilla (protocole SFTP, port 22)
- [ ] Noter les identifiants exacts depuis OVH Manager
- [ ] Créer les 3 secrets GitHub (OVH_HOST, OVH_USERNAME, OVH_PASSWORD)
- [ ] Copier le workflow depuis LOLOWOD ou Excalidraw (prouvé fonctionnel)
- [ ] Utiliser `sshpass -p '${{ secrets.OVH_PASSWORD }}'` (PAS de fichier temporaire)
- [ ] Tester le workflow avec un commit de test
- [ ] Vérifier le déploiement sur le serveur OVH

## 🔄 Réutilisation pour Nouveaux Projets

Pour déployer un nouveau projet (ex: Excalidraw) sur le même serveur OVH :

1. **Copier les secrets exactement** depuis LOLOWOD
   - Mêmes valeurs pour OVH_HOST, OVH_USERNAME, OVH_PASSWORD
   - Pas besoin de chercher à nouveau dans OVH Manager

2. **Adapter le workflow** :
   ```yaml
   # Changer seulement le chemin de destination
   cd www
   mkdir nom_nouveau_projet
   cd nom_nouveau_projet
   lcd chemin/build/local
   put -r * .
   ```

3. **Tester immédiatement** avec un commit de test

## 📚 Références

- **LOLOWOD Workflow** : `.github/workflows/deploy.yml`
- **Excalidraw Workflow** : https://github.com/Karadrass/excalidraw/.github/workflows/deploy.yml
- **OVH Manager** : https://www.ovh.com/manager/
- **Test de connexion LOLOWOD réussi** : https://github.com/Karadrass/LOLOWOD/actions
- **Test de connexion Excalidraw réussi** : https://github.com/Karadrass/excalidraw/actions

## ✨ Résumé

**Ce qui fonctionne** :
- `sshpass -p '${{ secrets.OVH_PASSWORD }}'` (même avec caractères spéciaux)
- Secrets sans espaces, copiés exactement depuis OVH Manager
- Tester dans FileZilla avant de configurer GitHub Actions
- Réutiliser les mêmes secrets pour tous les projets sur le même serveur

**Ce qui ne fonctionne pas** :
- Utiliser les identifiants MySQL à la place de SFTP
- Passer le mot de passe via un fichier temporaire
- Ajouter des espaces avant/après les valeurs des secrets
- Faire confiance aux étapes de test SFTP (peuvent échouer même si déploiement fonctionne)

---

**Dernière mise à jour** : Session de déploiement LOLOWOD + Excalidraw (succès)
**Projets utilisant ce guide** : LOLOWOD, Excalidraw
