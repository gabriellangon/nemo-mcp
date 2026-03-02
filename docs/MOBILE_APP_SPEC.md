# Nemo Mobile App — Spécification Fonctionnelle

> Application mobile compagnon pour consulter et gérer vos notes personnelles dans Nemo

## Table des matières

1. [Vision & Objectifs](#vision--objectifs)
2. [Architecture](#architecture)
3. [Fonctionnalités](#fonctionnalités)
4. [Écrans de l'application](#écrans-de-lapplication)
5. [User Stories](#user-stories)
6. [Modèles de données](#modèles-de-données)
7. [Authentification & Sécurité](#authentification--sécurité)
8. [Considérations techniques](#considérations-techniques)
9. [Hors périmètre (V1)](#hors-périmètre-v1)

---

## Vision & Objectifs

### Qu'est-ce que Nemo Mobile ?

Nemo Mobile est l'application compagnon du serveur MCP Nemo. Elle permet aux utilisateurs de **consulter, rechercher et gérer** leurs notes personnelles depuis leur smartphone.

**Le serveur MCP Nemo** permet de sauvegarder des notes via des conversations avec Claude ou ChatGPT. **L'application mobile Nemo** permet de les consulter et les gérer à tout moment.

### Objectifs principaux

| Objectif | Description |
|----------|-------------|
| **Consultation** | Accéder rapidement à toutes les notes sauvegardées |
| **Recherche** | Retrouver une information en quelques secondes via recherche full-text |
| **Gestion** | Modifier, organiser et supprimer les entrées |
| **Rappels** | Consulter et gérer les rappels, recevoir des notifications |
| **Bookmarks** | Accéder aux favoris et ouvrir les liens rapidement |

### Cas d'usage typiques

1. "Je suis en réunion et j'ai besoin de retrouver ce snippet Docker que j'avais sauvegardé"
2. "Je veux voir mes rappels de la semaine"
3. "Je veux parcourir mes bookmarks sur le machine learning"
4. "Je veux corriger le titre d'une note que j'ai dictée à Claude"
5. "Je veux coonsulter mes notes et les modifier"

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Application Mobile                        │
│                      (Flutter)                    │
└─────────────────────────────────────────────────────────────────┘
                                  │
                                  │ REST API / Realtime
                                  ▼
┌─────────────────────────────────────────────────────────────────┐
│                          Supabase                                │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │    notes     │  │   reminders  │  │   bookmarks  │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
│                                                                  │
│  ┌──────────────┐  ┌──────────────┐                             │
│  │     Auth     │  │   Storage    │  (futur: images)           │
│  └──────────────┘  └──────────────┘                             │
└─────────────────────────────────────────────────────────────────┘
```

L'application se connecte **directement à Supabase** (pas au serveur MCP). Le serveur MCP est utilisé uniquement par Claude/ChatGPT pour écrire dans la base.

---

## Fonctionnalités

### Module Notes

| Fonctionnalité | Description |
|----------------|-------------|
| Lister les notes | Afficher toutes les entrées avec pagination |
| Filtrer par catégorie | Filtrer par catégorie (devops, programming, etc.) |
| Filtrer par type | Filtrer par type (note, conversation, idea, snippet, summary, resource) |
| Filtrer par tags | Filtrer par un ou plusieurs tags |
| Recherche full-text | Rechercher dans le titre et le contenu |
| Voir le détail | Afficher le contenu complet d'une entrée |
| Modifier | Éditer le titre, contenu, catégorie, tags |
| Supprimer | Supprimer une entrée avec confirmation |
| Copier le contenu | Copier le contenu dans le presse-papier |
| Partager | Partager via les apps natives (WhatsApp, email, etc.) |

### Module Reminders (Rappels)

| Fonctionnalité | Description |
|----------------|-------------|
| Lister les rappels | Afficher les rappels triés par date |
| Filtrer par statut | Voir les rappels en cours ou terminés |
| Filtrer par priorité | Filtrer par priorité (low, medium, high, urgent) |
| Créer un rappel | Ajouter un nouveau rappel manuellement |
| Modifier | Éditer titre, description, date, priorité |
| Marquer comme fait | Cocher un rappel comme complété |
| Supprimer | Supprimer un rappel |
| Notifications | Recevoir une notification push à l'échéance |

### Module Bookmarks (Favoris)

| Fonctionnalité | Description |
|----------------|-------------|
| Lister les bookmarks | Afficher tous les favoris avec pagination |
| Filtrer par catégorie | Filtrer par catégorie |
| Filtrer par tags | Filtrer par tags |
| Recherche | Rechercher dans titre et description |
| Ouvrir le lien | Ouvrir l'URL dans le navigateur |
| Ajouter un bookmark | Sauvegarder un nouveau lien manuellement |
| Modifier | Éditer titre, description, tags, catégorie |
| Supprimer | Supprimer un bookmark |
| Partager | Partager l'URL via les apps natives |

### Module Dashboard (Tableau de bord)

| Fonctionnalité | Description |
|----------------|-------------|
| Statistiques | Nombre total de notes, rappels, bookmarks |
| Rappels du jour | Liste des rappels à échéance aujourd'hui |
| Rappels en retard | Liste des rappels dépassés non complétés |
| Derniers ajouts | Les 5 dernières notes ajoutées |
| Catégories | Répartition par catégorie avec compteurs |

---

## Écrans de l'application

### 1. Écran de configuration initiale (Setup)

Cet écran n'apparaît qu'à la **première ouverture** de l'app (ou si la configuration est réinitialisée).

- Titre : "Connecter votre Nemo"
- Champ : URL Supabase (visible, copiable)
- Champ : Clé Anon Key (masquée après saisie — voir ci-dessous)
- Bouton : "Configurer"
- Lien : "Comment obtenir ces informations ?" (aide)

**Comportement de la clé Anon Key** :
- À la saisie : champ de type password (masqué par défaut, avec icône œil pour voir)
- Après sauvegarde : **non affichable, non copiable**
- Modification possible : vider le champ et ressaisir une nouvelle clé
- Stockage : dans le Secure Storage (Keychain iOS / EncryptedSharedPreferences Android)

**Après configuration** : redirection vers l'écran de Login.

### 2. Écran de connexion (Login)

Cet écran apparaît si l'utilisateur n'est pas connecté (token expiré ou première connexion).

- Indication : URL Supabase configurée (affichée en lecture seule, ex: "abc123.supabase.co")
- Champ : Email
- Champ : Mot de passe
- Bouton : "Se connecter"
- Option : "Rester connecté" (mémoriser la session)
- Lien : "Modifier la configuration" (retour à l'écran Setup)

### 3. Écran Dashboard (Accueil)

- Statistiques en cartes (notes count, reminders count, bookmarks count)
- Section "Rappels urgents" (rappels du jour + en retard)
- Section "Ajouts récents" (5 dernières notes)
- Navigation vers les 3 modules principaux

### 4. Écran Liste des Notes

- Barre de recherche en haut
- Chips/filtres : catégories, types, tags
- Liste scrollable avec :
  - Titre
  - Catégorie (badge)
  - Type (icône)
  - Date de création
  - Extrait du contenu (2 lignes)
- Pull-to-refresh
- Infinite scroll (pagination)

### 5. Écran Détail d'une Note

- Titre (éditable)
- Badges : catégorie, type
- Tags (chips)
- Contenu complet (rendu en Markdown)
- Source (ex: "claude-chat")
- Dates : création, dernière modification
- Actions : Modifier, Copier, Partager, Supprimer

### 6. Écran Édition d'une Note

- Champ : Titre
- Champ : Contenu (textarea avec support Markdown)
- Sélecteur : Catégorie (autocomplete avec catégories existantes + saisie libre)
- Champ : Tags (input avec chips)
- Sélecteur : Type
- Boutons : Sauvegarder, Annuler

### 7. Écran Liste des Rappels

- Tabs : "En cours" / "Terminés"
- Filtres par priorité
- Liste avec :
  - Titre
  - Date d'échéance (formatée, ex: "Demain", "Dans 3 jours")
  - Indicateur de priorité (couleur)
  - Checkbox pour marquer comme fait
- Bouton flottant : Ajouter un rappel

### 8. Écran Détail/Édition d'un Rappel

- Champ : Titre
- Champ : Description
- Sélecteur : Date et heure d'échéance
- Sélecteur : Priorité (low, medium, high, urgent)
- Toggle : Notification
- Boutons : Sauvegarder, Supprimer

### 9. Écran Liste des Bookmarks

- Barre de recherche
- Filtres : catégories, tags
- Liste avec :
  - Favicon (si récupérable)
  - Titre
  - URL (tronquée)
  - Catégorie (badge)
- Action rapide : ouvrir le lien
- Bouton flottant : Ajouter un bookmark

### 10. Écran Détail/Édition d'un Bookmark

- Champ : URL
- Champ : Titre
- Champ : Description
- Sélecteur : Catégorie (autocomplete avec catégories existantes + saisie libre)
- Champ : Tags
- Boutons : Ouvrir, Partager, Sauvegarder, Supprimer

### 11. Écran Paramètres

- Section Compte :
  - Email connecté
  - Bouton Déconnexion
- Section Configuration Supabase :
  - URL Supabase (affichée en lecture seule)
  - Clé Anon Key : "••••••••" (masquée, non copiable)
  - Bouton : "Modifier la configuration" (redirige vers Setup)
- Section Notifications :
  - Toggle : Activer les notifications de rappels
  - Sélecteur : Délai de notification avant échéance
- Section App :
  - Thème (clair/sombre/système)
  - Langue
- Section À propos :
  - Version de l'app
  - Lien vers le projet GitHub

---

## User Stories

### Configuration & Authentification

| ID | En tant que | Je veux | Afin de |
|----|------------|---------|---------|
| SETUP-1 | Utilisateur | Configurer l'URL et la clé Supabase | Connecter l'app à mon instance Nemo |
| SETUP-2 | Utilisateur | Que ma clé Anon Key soit masquée après saisie | Sécuriser mes credentials |
| SETUP-3 | Utilisateur | Modifier ma configuration | Changer d'instance Supabase si besoin |
| AUTH-1 | Utilisateur | Me connecter avec mon email/mot de passe | Accéder à mes données |
| AUTH-2 | Utilisateur | Rester connecté automatiquement | Ne pas saisir mes identifiants à chaque ouverture |
| AUTH-3 | Utilisateur | Me déconnecter | Sécuriser mes données sur un appareil partagé |

### Notes

| ID | En tant que | Je veux | Afin de |
|----|------------|---------|---------|
| KN-1 | Utilisateur | Voir la liste de mes notes | Parcourir ce que j'ai sauvegardé |
| KN-2 | Utilisateur | Rechercher dans mes notes | Retrouver rapidement une information |
| KN-3 | Utilisateur | Filtrer par catégorie | Voir uniquement les notes d'un domaine |
| KN-4 | Utilisateur | Filtrer par tags | Affiner ma recherche |
| KN-5 | Utilisateur | Voir le détail d'une note | Lire le contenu complet |
| KN-6 | Utilisateur | Modifier une note | Corriger ou compléter une entrée |
| KN-7 | Utilisateur | Supprimer une note | Retirer une entrée obsolète |
| KN-8 | Utilisateur | Copier le contenu | L'utiliser dans une autre app |
| KN-9 | Utilisateur | Partager une note | L'envoyer à quelqu'un |
| KN-10 | Utilisateur | Créer une note | Ajouter une note manuellement |

### Reminders

| ID | En tant que | Je veux | Afin de |
|----|------------|---------|---------|
| REM-1 | Utilisateur | Voir mes rappels en cours | Savoir ce que je dois faire |
| REM-2 | Utilisateur | Voir mes rappels terminés | Consulter l'historique |
| REM-3 | Utilisateur | Filtrer par priorité | Voir les urgences d'abord |
| REM-4 | Utilisateur | Créer un rappel | Ajouter une tâche manuellement |
| REM-5 | Utilisateur | Modifier un rappel | Changer la date ou la description |
| REM-6 | Utilisateur | Marquer un rappel comme fait | Indiquer que c'est terminé |
| REM-7 | Utilisateur | Supprimer un rappel | Retirer un rappel inutile |
| REM-8 | Utilisateur | Recevoir une notification | Être averti à l'échéance |
| REM-9 | Utilisateur | Configurer le délai de notification | Être prévenu en avance |

### Bookmarks

| ID | En tant que | Je veux | Afin de |
|----|------------|---------|---------|
| BM-1 | Utilisateur | Voir mes bookmarks | Parcourir mes liens sauvegardés |
| BM-2 | Utilisateur | Rechercher dans mes bookmarks | Retrouver un lien |
| BM-3 | Utilisateur | Filtrer par catégorie | Voir les liens d'un domaine |
| BM-4 | Utilisateur | Ouvrir un bookmark | Visiter le site web |
| BM-5 | Utilisateur | Ajouter un bookmark | Sauvegarder un lien manuellement |
| BM-6 | Utilisateur | Modifier un bookmark | Corriger titre ou tags |
| BM-7 | Utilisateur | Supprimer un bookmark | Retirer un lien obsolète |
| BM-8 | Utilisateur | Partager un bookmark | Envoyer le lien à quelqu'un |

### Dashboard

| ID | En tant que | Je veux | Afin de |
|----|------------|---------|---------|
| DASH-1 | Utilisateur | Voir les statistiques globales | Avoir une vue d'ensemble |
| DASH-2 | Utilisateur | Voir les rappels du jour | Savoir quoi faire aujourd'hui |
| DASH-3 | Utilisateur | Voir les rappels en retard | Rattraper ce qui est dépassé |
| DASH-4 | Utilisateur | Voir les derniers ajouts | Retrouver ce que Claude a sauvegardé |

### Paramètres

| ID | En tant que | Je veux | Afin de |
|----|------------|---------|---------|
| SET-1 | Utilisateur | Choisir le thème (clair/sombre) | Adapter l'app à mes préférences |
| SET-2 | Utilisateur | Activer/désactiver les notifications | Contrôler les alertes |
| SET-3 | Utilisateur | Me déconnecter | Changer de compte ou sécuriser |

---

## Modèles de données

### Notes

```typescript
interface Note {
  id: string;                    // UUID
  title: string;                 // Titre de l'entrée
  content: string;               // Contenu complet
  category: string;              // Ex: "devops", "programming", "general"
  tags: string[];                // Ex: ["docker", "kubernetes"]
  source: string | null;         // Ex: "claude-chat", "manual"
  entry_type: EntryType;         // Type d'entrée
  metadata: Record<string, any>; // Données additionnelles JSON
  created_at: string;            // ISO 8601
  updated_at: string;            // ISO 8601
}

type EntryType = 'conversation' | 'note' | 'idea' | 'snippet' | 'summary' | 'resource';
```

### Reminder

```typescript
interface Reminder {
  id: string;                    // UUID
  title: string;                 // Titre du rappel
  description: string | null;    // Description optionnelle
  due_date: string;              // ISO 8601 avec timezone
  is_done: boolean;              // Statut de completion
  priority: Priority;            // Niveau de priorité
  created_at: string;            // ISO 8601
}

type Priority = 'low' | 'medium' | 'high' | 'urgent';
```

### Bookmark

```typescript
interface Bookmark {
  id: string;                    // UUID
  url: string;                   // URL complète
  title: string;                 // Titre du lien
  description: string | null;    // Description optionnelle
  tags: string[];                // Tags
  category: string;              // Catégorie
  created_at: string;            // ISO 8601
}
```

---

## Authentification & Sécurité

### Méthode d'authentification

L'application utilise **Supabase Auth** avec authentification par email/mot de passe.

### Flow complet (première utilisation)

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│    Setup     │ ──► │    Login     │ ──► │  Dashboard   │
│  (URL + Key) │     │ (email/mdp)  │     │              │
└──────────────┘     └──────────────┘     └──────────────┘
     │                                           │
     │  Stocké en                                │  Token JWT
     │  Secure Storage                           │  auto-refresh
     ▼                                           ▼
```

### Flow (utilisations suivantes)

```
┌──────────────┐     ┌──────────────┐
│    Login     │ ──► │  Dashboard   │   (si session expirée)
│ (email/mdp)  │     │              │
└──────────────┘     └──────────────┘

     — OU —

┌──────────────┐
│  Dashboard   │   (si session active = auto-login)
│              │
└──────────────┘
```

### Détail du flow

1. **Première ouverture** : Écran Setup (URL + Anon Key)
2. **Configuration sauvegardée** : URL en clair, Anon Key chiffrée (non récupérable)
3. **Login** : Email + mot de passe via Supabase Auth
4. **Session** : Token JWT stocké en Secure Storage, refresh automatique
5. **Ouvertures suivantes** : Auto-login si session valide, sinon Login

### Row Level Security (RLS)

Pour une utilisation multi-utilisateurs future, activer les politiques RLS dans Supabase :

```sql
-- Exemple de politique pour notes
ALTER TABLE notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can only access their own data" ON notes
    FOR ALL USING (auth.uid() = user_id);
```

**Note pour V1** : Si l'app est mono-utilisateur, RLS peut être optionnel.

### Stockage sécurisé

- **iOS** : Keychain
- **Android** : EncryptedSharedPreferences

---

## Notes importantes pour le développeur

### Format de stockage et affichage

Le contenu (`content`) est stocké en **texte brut** dans la base de données. Cependant, le contenu provenant de Claude/ChatGPT est souvent formaté en **Markdown**.

**Recommandation** : L'application doit **afficher le contenu en Markdown** :
- Utiliser un package comme `flutter_markdown` pour le rendu
- Supporter les blocs de code avec coloration syntaxique (` ```dart `, ` ```python `, etc.)
- Rendre les liens cliquables
- Afficher les titres, listes, gras, italique

**En édition** : Deux options possibles :
1. **Simple** : TextField brut (l'utilisateur voit le Markdown source)
2. **Avancé** : Éditeur Markdown avec preview (split view ou toggle)

### Gestion des catégories

Les catégories sont **libres** — il n'y a pas de table `categories` dédiée.

| Comportement | Description |
|--------------|-------------|
| Création | Implicite — toute nouvelle catégorie est créée automatiquement |
| Liste | Obtenue via `SELECT DISTINCT category FROM notes` |
| Validation | Aucune — l'utilisateur peut créer n'importe quelle catégorie |
| Suppression | Une catégorie "disparaît" quand plus aucune entrée ne l'utilise |

**Recommandation pour l'UI** :
1. Afficher les catégories existantes en autocomplete/suggestions
2. Permettre la saisie libre pour créer une nouvelle catégorie
3. Normaliser les entrées (lowercase, trim) pour éviter les doublons (`DevOps` vs `devops`)

### Configuration requise

L'application mobile a besoin **uniquement** de Supabase :

| Paramètre | Description | Exemple |
|-----------|-------------|---------|
| `SUPABASE_URL` | URL du projet Supabase | `https://abc123.supabase.co` |
| `SUPABASE_ANON_KEY` | Clé publique (anon) | `eyJhbGciOiJIUzI1...` |

**C'est tout.** Pas de serveur MCP, pas d'API custom, pas de backend supplémentaire.

```dart
// Initialisation Supabase dans Flutter
await Supabase.initialize(
  url: 'https://abc123.supabase.co',
  anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
);

final supabase = Supabase.instance.client;
```

Le SDK Supabase gère automatiquement :
- L'authentification (JWT)
- Le refresh des tokens
- Les requêtes REST vers la base

---

## Considérations techniques

### Stack recommandé

| Élément | Recommandation |
|---------|----------------|
| Framework | **Flutter** (cross-platform, performance native, SDK Supabase officiel) |
| Alternative | React Native avec Expo |
| State management | Riverpod (Flutter) ou Redux Toolkit (React Native) |
| Base de données locale | Drift/SQLite pour cache offline |
| Notifications | Firebase Cloud Messaging + Supabase Edge Functions |

### Supabase SDK

Utiliser le SDK officiel Supabase :
- Flutter : `supabase_flutter`
- React Native : `@supabase/supabase-js`

### Requêtes API

Exemples de requêtes Supabase :

```dart
// Lister les notes avec pagination
final response = await supabase
    .from('notes')
    .select()
    .order('created_at', ascending: false)
    .range(0, 19);

// Recherche full-text
final response = await supabase
    .from('notes')
    .select()
    .textSearch('title', 'docker');

// Filtrer par catégorie
final response = await supabase
    .from('notes')
    .select()
    .eq('category', 'devops');

// Rappels non complétés
final response = await supabase
    .from('reminders')
    .select()
    .eq('is_done', false)
    .order('due_date');
```

### Notifications push

Pour les rappels, deux options :

1. **Notifications locales** : Planifier une notification locale à la date du rappel
2. **Push via Supabase** : Utiliser Edge Functions + FCM pour envoyer des push

**Recommandation V1** : Notifications locales (plus simple, pas de backend supplémentaire)

### Mode offline (optionnel V1)

- Cache local des données récentes
- Synchronisation au retour de la connexion
- Indicateur visuel du mode offline

---

## Hors périmètre (V1)

Les fonctionnalités suivantes sont explicitement **hors périmètre** pour la V1 :

| Fonctionnalité | Raison |
|----------------|--------|
| Création de notes vocales | Complexité (speech-to-text) |
| Recherche sémantique (IA) | Nécessite pgvector + embeddings |
| Stockage d'images | Nécessite Supabase Storage |
| Export Markdown/Obsidian | Fonctionnalité secondaire |
| Multi-utilisateurs | Complexité de gestion |
| Partage entre utilisateurs | Complexité |
| Widget iOS/Android | Peut être ajouté en V2 |
| Apple Watch / Wear OS | Plateformes supplémentaires |

---

## Résumé

L'application Nemo Mobile est une app **simple et efficace** qui permet de :

1. **Consulter** ses notes, rappels et bookmarks sauvegardés via Claude/ChatGPT
2. **Rechercher** rapidement dans sa base personnelle
3. **Gérer** (modifier, supprimer) ses entrées
4. **Recevoir** des notifications pour les rappels

Elle se connecte directement à Supabase et ne nécessite pas le serveur MCP pour fonctionner.

---

## Annexes

### A. Palette de couleurs suggérée

| Usage | Couleur | Hex |
|-------|---------|-----|
| **Primary** | Orange Nemo | `#F97316` |
| Secondary | Orange foncé | `#EA580C` |
| Accent | Bleu océan | `#0EA5E9` |
| Background | Blanc cassé chaud | `#FFF7ED` |
| Text | Gris chaud | `#44403C` |
| Success | Vert | `#22C55E` |
| Warning | Orange clair | `#FB923C` |
| Error | Rouge | `#EF4444` |
| Urgent | Rouge foncé | `#DC2626` |

### B. Icônes par type d'entrée

| Type | Icône suggérée |
|------|----------------|
| conversation | 💬 (message-circle) |
| note | 📝 (file-text) |
| idea | 💡 (lightbulb) |
| snippet | 📋 (code) |
| summary | 📄 (file) |
| resource | 🔗 (link) |

### C. Priorités des rappels

| Priorité | Couleur | Comportement notification |
|----------|---------|---------------------------|
| low | Gris | Notification simple |
| medium | Bleu | Notification standard |
| high | Orange | Notification avec son |
| urgent | Rouge | Notification répétée |
