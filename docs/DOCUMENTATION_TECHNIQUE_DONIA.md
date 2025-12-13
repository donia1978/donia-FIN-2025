# 📚 DOCUMENTATION TECHNIQUE - DONIA

**Version:** 1.0.0  
**Date:** 13 Décembre 2024  
**Auteur:** Équipe DONIA  
**Statut:** MVP en développement

---

# 1. VUE D'ENSEMBLE

## 1.1 Présentation du projet

DONIA est une **plateforme web modulaire** combinant des fonctionnalités sociales, éducatives, médicales et d'assistance d'urgence. Elle est conçue pour être évolutive, sécurisée et conforme aux normes RGPD.

### Stack Technologique

| Couche | Technologies |
|--------|-------------|
| **Frontend** | React 18, TypeScript, Vite, TailwindCSS, Shadcn/UI |
| **Backend** | Supabase (PostgreSQL, Auth, Edge Functions, Realtime) |
| **State Management** | TanStack React Query, React Context |
| **Routing** | React Router DOM v6 |
| **Notifications** | Sonner (toasts) |
| **Charts** | Recharts |
| **Export** | jsPDF, jspdf-autotable |
| **Hébergement cible** | OVH Cloud (frontend) + Lovable Cloud (backend) |

## 1.2 Architecture des répertoires

```
DONIA/
├── src/
│   ├── components/           # Composants réutilisables
│   │   ├── layout/          # Layouts (DashboardLayout, Sidebar)
│   │   ├── medical/         # Composants module médical
│   │   ├── sos/             # Composants module SOS
│   │   └── ui/              # Composants Shadcn/UI
│   ├── hooks/               # Hooks personnalisés
│   │   ├── useAuth.tsx      # Authentification
│   │   ├── use-mobile.tsx   # Détection mobile
│   │   └── use-toast.ts     # Notifications
│   ├── integrations/        # Intégrations externes
│   │   └── supabase/        # Client et types Supabase
│   ├── lib/                 # Utilitaires
│   ├── pages/               # Pages de l'application
│   │   ├── dashboard/       # Pages du tableau de bord
│   │   ├── Auth.tsx         # Authentification
│   │   ├── Dashboard.tsx    # Page d'accueil dashboard
│   │   ├── Index.tsx        # Landing page
│   │   └── NotFound.tsx     # Page 404
│   ├── App.tsx              # Configuration routing
│   ├── main.tsx             # Point d'entrée
│   └── index.css            # Styles globaux + Design System
├── supabase/
│   ├── migrations/          # Migrations SQL
│   └── config.toml          # Configuration Supabase
├── public/                  # Assets statiques
└── docs/                    # Documentation
```

## 1.3 Exécution locale

### Variables d'environnement requises

```bash
# .env (géré automatiquement par Lovable Cloud)
VITE_SUPABASE_URL=https://qqwljebhdaaeotjlvjic.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
VITE_SUPABASE_PROJECT_ID=qqwljebhdaaeotjlvjic
```

### Commandes

```bash
npm install          # Installation des dépendances
npm run dev          # Serveur de développement (port 5173)
npm run build        # Build production
npm run preview      # Preview du build
```

### Ports

| Service | Port | Description |
|---------|------|-------------|
| Frontend Vite | 5173 | Serveur de développement |
| Supabase API | 443 | API REST & Realtime |

---

# 2. CARTE DES MODULES

| Module | Sous-modules | Pages | Routes API (Supabase) | Tables DB | Statut |
|--------|--------------|-------|----------------------|-----------|--------|
| **Auth** | Login, Signup, Logout | `/auth` | `auth.signIn`, `auth.signUp` | `auth.users`, `profiles`, `user_roles` | ✅ Implémenté |
| **Dashboard** | Stats, Actions rapides | `/dashboard` | - | - | ✅ Implémenté |
| **Users** | Liste, Rôles, CRUD | `/dashboard/users` | `profiles`, `user_roles` | `profiles`, `user_roles` | ✅ Implémenté |
| **Medical** | Patients, Dossiers, RDV | `/dashboard/medical` | `patients`, `medical_records`, `appointments` | 3 tables | ✅ Implémenté |
| **Education** | Cours, Stats | `/dashboard/education` | `courses` | `courses` | ⚠️ UI statique |
| **Courses** | Leçons, Quiz, Progression | `/dashboard/courses` | `courses`, `lessons`, `quizzes`, `enrollments`, `lesson_progress`, `quiz_attempts` | 6 tables | ✅ Implémenté |
| **Agenda** | Calendrier, Événements | `/dashboard/agenda` | `events` | `events` | ✅ Implémenté |
| **Chat** | Conversations, Messages | `/dashboard/chat` | `conversations`, `messages`, `conversation_participants` | 3 tables | ✅ Implémenté |
| **Notifications** | Liste, Marquage lu | `/dashboard/notifications` | `notifications` | `notifications` | ✅ Implémenté |
| **Analytics** | Stats, Export PDF/CSV | `/dashboard/analytics` | Requêtes agrégées | - | ✅ Implémenté |
| **Social** | Posts, Likes, Comments | `/dashboard/social` | `social_posts`, `social_likes`, `social_comments` | 3 tables | ✅ Implémenté |
| **SOS** | Alertes, Workflow, Suivi | `/dashboard/sos` | `sos_alerts`, `sos_comments`, `sos_responders` | 3 tables | ✅ Implémenté |
| **Search** | Recherche globale | Cmd+K modal | Multi-tables | - | ✅ Implémenté |

---

# 3. DOCUMENTATION PAR MODULE

---

## 3.1 MODULE AUTH (Authentification)

### But et périmètre

Gestion complète de l'authentification utilisateur avec création automatique de profil et attribution de rôle par défaut.

### Parcours utilisateur

```
┌─────────────────────────────────────────────────────────────┐
│  UTILISATEUR NON CONNECTÉ                                   │
│                                                             │
│  Landing Page (/) ──► Page Auth (/auth)                     │
│                            │                                │
│               ┌────────────┴────────────┐                   │
│               ▼                         ▼                   │
│          [INSCRIPTION]             [CONNEXION]              │
│               │                         │                   │
│               ▼                         ▼                   │
│   Création compte + profil      Vérification credentials    │
│   + rôle "user" par défaut              │                   │
│               │                         │                   │
│               └──────────┬──────────────┘                   │
│                          ▼                                  │
│                  Dashboard (/dashboard)                     │
└─────────────────────────────────────────────────────────────┘
```

### Pages/Routes Frontend

| Route | Composant | Description |
|-------|-----------|-------------|
| `/auth` | `Auth.tsx` | Formulaire login/signup avec tabs |
| `/` | `Index.tsx` | Landing page avec CTA vers auth |

### Services Backend (Supabase Auth)

```typescript
// Hook useAuth.tsx - Fonctions principales
signIn(email, password)   // Connexion
signUp(email, password)   // Inscription  
signOut()                 // Déconnexion
```

### Données/Schema

**Table `profiles`** (créée automatiquement via trigger)
```sql
id UUID PRIMARY KEY          -- Référence auth.users
email TEXT
full_name TEXT
avatar_url TEXT
phone TEXT
created_at TIMESTAMPTZ
updated_at TIMESTAMPTZ
```

**Table `user_roles`**
```sql
id UUID PRIMARY KEY
user_id UUID NOT NULL        -- Référence auth.users
role app_role DEFAULT 'user' -- ENUM: admin, teacher, student, medical_staff, parent, user
created_at TIMESTAMPTZ
```

**Trigger `handle_new_user()`**
- Crée automatiquement une entrée dans `profiles`
- Assigne le rôle `user` par défaut

### Sécurité

- **RLS activé** sur `profiles` et `user_roles`
- Fonction `has_role(user_id, role)` pour vérification des permissions
- Les admins peuvent gérer tous les rôles
- Les utilisateurs voient uniquement leurs propres rôles

### Erreurs fréquentes et debug

| Erreur | Cause | Solution |
|--------|-------|----------|
| "Invalid login credentials" | Email/mot de passe incorrect | Vérifier les credentials |
| "User already registered" | Email déjà utilisé | Utiliser un autre email |
| Profil non créé | Trigger défaillant | Vérifier logs Supabase |

### Checklist tests

- [ ] `POST /auth/v1/signup` → 200 OK + user créé
- [ ] `POST /auth/v1/token?grant_type=password` → 200 OK + JWT
- [ ] Profil créé dans `profiles` après signup
- [ ] Rôle `user` attribué dans `user_roles`

### Roadmap

| Phase | Fonctionnalités |
|-------|----------------|
| **MVP (Actuel)** | Email/password, profil auto, rôles basiques |
| **v1** | OAuth (Google, GitHub), MFA, reset password |
| **v2** | SSO entreprise, audit logs |

---

## 3.2 MODULE USERS (Gestion utilisateurs)

### But et périmètre

Administration des utilisateurs et attribution des rôles. Réservé aux administrateurs.

### Pages/Routes Frontend

| Route | Composant | Description |
|-------|-----------|-------------|
| `/dashboard/users` | `UserManagement.tsx` | Liste users + gestion rôles |

### Routes Backend

```typescript
// Lecture des profils
supabase.from("profiles").select("*")

// Lecture des rôles
supabase.from("user_roles").select("*").eq("user_id", userId)

// Attribution de rôle (admin only)
supabase.from("user_roles").insert({ user_id, role })

// Suppression de rôle
supabase.from("user_roles").delete().eq("id", roleId)
```

### Intégration avec autres modules

- **Auth**: Vérifie les permissions admin via `has_role()`
- **Medical**: Les `medical_staff` ont accès aux dossiers patients
- **SOS**: Les intervenants sont définis via les rôles

### Sécurité

```sql
-- Seuls les admins peuvent gérer les rôles
CREATE POLICY "Admins can manage all roles" ON user_roles
  FOR ALL USING (has_role(auth.uid(), 'admin'));
```

### Roadmap

| Phase | Fonctionnalités |
|-------|----------------|
| **MVP** | Liste users, attribution rôles |
| **v1** | Invitation par email, désactivation compte |
| **v2** | Groupes/équipes, permissions granulaires |

---

## 3.3 MODULE MEDICAL

### But et périmètre

Gestion complète des dossiers patients, rendez-vous et historique médical. Accessible aux `medical_staff` et `admin`.

### Parcours utilisateur

```
┌────────────────────────────────────────────────────────────────┐
│  STAFF MÉDICAL                                                 │
│                                                                │
│  Dashboard ──► Module Médical                                  │
│                    │                                           │
│         ┌──────────┴──────────┐                                │
│         ▼                     ▼                                │
│   [VUE D'ENSEMBLE]    [DOSSIERS PATIENTS]                      │
│   - Stats RDV              │                                   │
│   - Liste RDV jour         ▼                                   │
│                    ┌───────────────┐                           │
│                    │ LISTE PATIENTS │                          │
│                    │ + Recherche    │                          │
│                    │ + Nouveau      │                          │
│                    └───────┬───────┘                           │
│                            ▼                                   │
│                    ┌───────────────┐                           │
│                    │ FICHE PATIENT │                           │
│                    │ - Infos       │                           │
│                    │ - Dossiers    │──► Nouveau dossier        │
│                    │ - Allergies   │                           │
│                    └───────────────┘                           │
└────────────────────────────────────────────────────────────────┘
```

### Pages/Routes Frontend

| Route | Composant | Description |
|-------|-----------|-------------|
| `/dashboard/medical` | `Medical.tsx` | Page principale avec tabs |

### Composants

| Composant | Fichier | Description |
|-----------|---------|-------------|
| `PatientsList` | `components/medical/PatientsList.tsx` | Liste + recherche + création |
| `PatientDetails` | `components/medical/PatientDetails.tsx` | Détails + dossiers + allergies |

### Routes Backend

```typescript
// Patients
supabase.from("patients").select("*").order("last_name")
supabase.from("patients").insert({ ...patientData, user_id })

// Dossiers médicaux
supabase.from("medical_records")
  .select("*")
  .eq("patient_id", patientId)
  .order("record_date", { ascending: false })

supabase.from("medical_records").insert({
  patient_id,
  doctor_id: user.id,
  record_type,
  diagnosis,
  symptoms,
  treatment,
  prescription
})

// Rendez-vous
supabase.from("appointments").select("*")
```

### Données/Schema

**Table `patients`**
```sql
id UUID PRIMARY KEY
user_id UUID NOT NULL           -- Créateur
first_name TEXT NOT NULL
last_name TEXT NOT NULL
date_of_birth DATE
gender TEXT                     -- male, female, other
blood_type TEXT                 -- A+, A-, B+, B-, AB+, AB-, O+, O-
allergies TEXT[]                -- Array d'allergies
phone TEXT
email TEXT
address TEXT
emergency_contact_name TEXT
emergency_contact_phone TEXT
created_at, updated_at TIMESTAMPTZ
```

**Table `medical_records`**
```sql
id UUID PRIMARY KEY
patient_id UUID REFERENCES patients(id)
doctor_id UUID NOT NULL
record_type TEXT DEFAULT 'consultation'  -- consultation, examination, prescription, surgery, follow_up
diagnosis TEXT
symptoms TEXT[]
treatment TEXT
prescription TEXT
notes TEXT
attachments TEXT[]
record_date TIMESTAMPTZ
created_at, updated_at TIMESTAMPTZ
```

**Table `appointments`**
```sql
id UUID PRIMARY KEY
patient_id UUID REFERENCES patients(id)
doctor_id UUID NOT NULL
appointment_date TIMESTAMPTZ
duration_minutes INTEGER DEFAULT 30
status TEXT DEFAULT 'scheduled'  -- scheduled, confirmed, completed, cancelled
type TEXT DEFAULT 'consultation'
notes TEXT
location TEXT
created_at, updated_at TIMESTAMPTZ
```

### Sécurité (RLS)

```sql
-- Seul le staff médical et admins peuvent accéder
CREATE POLICY "Medical staff can view patients" ON patients
  FOR SELECT USING (
    has_role(auth.uid(), 'medical_staff') OR has_role(auth.uid(), 'admin')
  );
```

### Erreurs fréquentes

| Erreur | Cause | Solution |
|--------|-------|----------|
| "Permission denied" | Utilisateur sans rôle `medical_staff` | Attribuer le rôle |
| Liste patients vide | RLS bloque l'accès | Vérifier les rôles |

### Checklist tests

- [ ] Créer un patient → visible dans la liste
- [ ] Ajouter un dossier médical → apparaît dans l'historique
- [ ] Recherche patient par nom → résultats filtrés
- [ ] Onglets Info/Dossiers/Allergies fonctionnels

### Roadmap

| Phase | Fonctionnalités |
|-------|----------------|
| **MVP (Actuel)** | CRUD patients, dossiers, affichage RDV |
| **v1** | Interopérabilité HL7/FHIR, export PDF dossier |
| **v2** | IA diagnostic assisté, intégration imagerie |

---

## 3.4 MODULE COURSES (Formation en ligne)

### But et périmètre

Plateforme e-learning complète avec cours, leçons vidéo, quiz et suivi de progression.

### Parcours utilisateur

```
┌────────────────────────────────────────────────────────────────┐
│  ÉTUDIANT                                                      │
│                                                                │
│  Catalogue Cours ──► Inscription ──► Accès Leçons              │
│                                            │                   │
│                          ┌─────────────────┴──────────────┐    │
│                          ▼                                ▼    │
│                   [VIDÉO/CONTENU]                    [QUIZ]    │
│                          │                                │    │
│                          ▼                                ▼    │
│                   Marquer terminé              Soumettre quiz  │
│                          │                                │    │
│                          └────────────┬───────────────────┘    │
│                                       ▼                        │
│                              Progression mise à jour           │
└────────────────────────────────────────────────────────────────┘
```

### Routes Backend

```typescript
// Cours publiés
supabase.from("courses").select("*").eq("is_published", true)

// Inscription
supabase.from("enrollments").insert({ user_id, course_id })

// Leçons d'un cours
supabase.from("lessons").select("*").eq("course_id", id).order("order_index")

// Quiz d'une leçon
supabase.from("quizzes").select("*").eq("lesson_id", lessonId)
supabase.from("quiz_questions").select("*").eq("quiz_id", quizId)

// Progression
supabase.from("lesson_progress").upsert({ user_id, lesson_id, completed, progress_percent })

// Tentative quiz
supabase.from("quiz_attempts").insert({ user_id, quiz_id, score, passed, answers })
```

### Données/Schema

**Table `courses`**
```sql
id, title, description, thumbnail_url, instructor_id, instructor_name,
category, difficulty, duration_hours, is_published, created_at, updated_at
```

**Table `lessons`**
```sql
id, course_id, title, description, video_url, content, order_index, duration_minutes
```

**Table `quizzes`**
```sql
id, lesson_id, title, passing_score (default 70)
```

**Table `quiz_questions`**
```sql
id, quiz_id, question, options (JSONB), correct_answer, order_index
```

**Table `enrollments`**
```sql
id, user_id, course_id, enrolled_at, completed_at
```

**Table `lesson_progress`**
```sql
id, user_id, lesson_id, completed, progress_percent, completed_at
```

### Roadmap

| Phase | Fonctionnalités |
|-------|----------------|
| **MVP (Actuel)** | Cours, leçons, quiz, progression |
| **v1** | Certificats, commentaires, notes |
| **v2** | Live streaming, forums de discussion |

---

## 3.5 MODULE SOS (Assistance d'urgence)

### But et périmètre

Système de signalement d'urgence avec workflow de prise en charge, suivi temps réel et commentaires.

### Parcours utilisateur

```
┌────────────────────────────────────────────────────────────────────┐
│  FLUX SIGNALEMENT D'URGENCE                                        │
│                                                                    │
│  ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐     │
│  │ CRÉATION │───►│ EN ATTENTE│───►│ EN COURS │───►│  RÉSOLU  │     │
│  │  alerte  │    │  pending  │    │in_progress│    │ resolved │     │
│  └──────────┘    └──────────┘    └──────────┘    └──────────┘     │
│       │               │               │               │            │
│       ▼               ▼               ▼               ▼            │
│  User crée      Staff voit      Staff prend      Notes de         │
│  l'alerte       nouvelle        en charge        résolution       │
│  + catégorie    alerte          + commentaires                    │
│  + priorité     (realtime)      de suivi                          │
│  + localisation                                                   │
└────────────────────────────────────────────────────────────────────┘
```

### Routes Backend

```typescript
// Alertes
supabase.from("sos_alerts").select("*").order("created_at", { ascending: false })
supabase.from("sos_alerts").insert({ user_id, title, description, category, priority, location })
supabase.from("sos_alerts").update({ status, assigned_to, resolved_at })

// Commentaires de suivi
supabase.from("sos_comments").select("*").eq("alert_id", id)
supabase.from("sos_comments").insert({ alert_id, user_id, content })

// Realtime
supabase.channel("sos-alerts-realtime")
  .on("postgres_changes", { event: "*", schema: "public", table: "sos_alerts" }, callback)
```

### Données/Schema

**Table `sos_alerts`**
```sql
id UUID PRIMARY KEY
user_id UUID NOT NULL
title TEXT NOT NULL
description TEXT
category TEXT DEFAULT 'other'      -- medical, security, fire, other
priority TEXT DEFAULT 'medium'     -- critical, high, medium, low
status TEXT DEFAULT 'pending'      -- pending, in_progress, resolved, cancelled
location TEXT
latitude DECIMAL(10, 8)
longitude DECIMAL(11, 8)
assigned_to UUID                   -- Intervenant assigné
resolved_at TIMESTAMPTZ
resolution_notes TEXT
created_at, updated_at TIMESTAMPTZ
```

**Table `sos_comments`**
```sql
id, alert_id, user_id, content, is_internal, created_at
```

**Table `sos_responders`**
```sql
id, user_id UNIQUE, specialty, is_available, current_location
```

### Sécurité

- Les utilisateurs créent et voient leurs propres alertes
- Les `medical_staff` et `admin` voient toutes les alertes
- Realtime activé pour notifications instantanées

### Roadmap

| Phase | Fonctionnalités |
|-------|----------------|
| **MVP (Actuel)** | Création alertes, workflow, commentaires, realtime |
| **v1** | Géolocalisation GPS, notifications push |
| **v2** | Affectation automatique, historique intervenant |

---

## 3.6 MODULE SOCIAL

### But et périmètre

Réseau social interne avec fil d'actualité, publications, likes et commentaires.

### Routes Backend

```typescript
// Posts
supabase.from("social_posts").select("*").order("created_at", { ascending: false })
supabase.from("social_posts").insert({ user_id, content, visibility })

// Likes
supabase.from("social_likes").insert({ post_id, user_id })
supabase.from("social_likes").delete().eq("post_id", id).eq("user_id", uid)

// Commentaires (à implémenter)
supabase.from("social_comments").select("*").eq("post_id", id)
```

### Données/Schema

**Table `social_posts`**
```sql
id, user_id, content, media_urls TEXT[], likes_count, comments_count, shares_count,
visibility DEFAULT 'public', created_at, updated_at
```

### Roadmap

| Phase | Fonctionnalités |
|-------|----------------|
| **MVP (Actuel)** | Posts, likes, affichage |
| **v1** | Commentaires, partage, upload media |
| **v2** | Groupes, événements, stories |

---

## 3.7 MODULE AGENDA

### But et périmètre

Calendrier interactif pour la gestion des événements personnels.

### Routes Backend

```typescript
supabase.from("events")
  .select("*")
  .eq("user_id", userId)
  .gte("start_date", startOfMonth)
  .lte("start_date", endOfMonth)

supabase.from("events").insert({ user_id, title, start_date, end_date, type, color })
supabase.from("events").update({ ...eventData }).eq("id", eventId)
supabase.from("events").delete().eq("id", eventId)
```

### Données/Schema

**Table `events`**
```sql
id, user_id, title, description, start_date, end_date, is_all_day,
type DEFAULT 'general', color DEFAULT '#3b82f6', location, created_at, updated_at
```

---

## 3.8 MODULE CHAT (Messagerie)

### But et périmètre

Messagerie en temps réel entre utilisateurs avec conversations privées.

### Routes Backend

```typescript
// Conversations de l'utilisateur
supabase.from("conversation_participants")
  .select("conversation_id, conversations(*)")
  .eq("user_id", userId)

// Messages d'une conversation
supabase.from("messages")
  .select("*")
  .eq("conversation_id", convId)
  .order("created_at")

// Envoi message
supabase.from("messages").insert({ conversation_id, sender_id, content })
```

### Données/Schema

**Table `conversations`**
```sql
id, is_group, title, created_at, updated_at
```

**Table `conversation_participants`**
```sql
id, conversation_id, user_id, joined_at, last_read_at
```

**Table `messages`**
```sql
id, conversation_id, sender_id, content, message_type DEFAULT 'text', created_at
```

### Sécurité

Fonction `is_conversation_participant()` vérifie l'accès aux conversations.

---

## 3.9 MODULE ANALYTICS

### But et périmètre

Tableaux de bord statistiques avec export PDF/CSV.

### Fonctionnalités

- Graphiques interactifs (Recharts)
- Métriques: utilisateurs, cours, événements, messages
- Export CSV avec données formatées
- Export PDF avec tableaux et résumé

### Roadmap

| Phase | Fonctionnalités |
|-------|----------------|
| **MVP (Actuel)** | Stats basiques, export PDF/CSV |
| **v1** | Filtres temporels, comparaisons |
| **v2** | Analyses prédictives, rapports automatisés |

---

## 3.10 MODULE NOTIFICATIONS

### But et périmètre

Système de notifications pour informer les utilisateurs des événements importants.

### Routes Backend

```typescript
supabase.from("notifications")
  .select("*")
  .eq("user_id", userId)
  .order("created_at", { ascending: false })

supabase.from("notifications")
  .update({ is_read: true })
  .eq("id", notificationId)
```

### Données/Schema

**Table `notifications`**
```sql
id, user_id, title, message, type DEFAULT 'info', is_read DEFAULT false, created_at
```

---

## 3.11 MODULE SEARCH (Recherche globale)

### But et périmètre

Recherche unifiée accessible via Cmd+K (ou Ctrl+K) couvrant pages, utilisateurs, cours et événements.

### Composant

`GlobalSearch.tsx` avec hook `useGlobalSearch()` pour gérer l'état du modal et les raccourcis clavier.

---

# 4. DIAGRAMMES

## 4.1 Flux global utilisateur

```
                           ┌─────────────────┐
                           │   LANDING PAGE  │
                           │        /        │
                           └────────┬────────┘
                                    │
                           ┌────────▼────────┐
                           │      AUTH       │
                           │     /auth       │
                           └────────┬────────┘
                                    │
                    ┌───────────────┼───────────────┐
                    │               │               │
           ┌────────▼────┐  ┌───────▼───────┐ ┌─────▼─────┐
           │  DASHBOARD  │  │    MODULES    │ │  SEARCH   │
           │  /dashboard │  │   /dashboard/*│ │   Cmd+K   │
           └─────────────┘  └───────────────┘ └───────────┘
                                    │
        ┌───────┬───────┬───────┬───┴───┬───────┬───────┬───────┐
        │       │       │       │       │       │       │       │
     Social  Medical  Cours  Agenda   Chat   SOS   Analytics Users
```

## 4.2 Flux Auth détaillé

```
┌──────────────────────────────────────────────────────────────────┐
│                         AUTHENTIFICATION                          │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─────────────┐         ┌─────────────┐         ┌────────────┐ │
│  │   SIGNUP    │         │    LOGIN    │         │   LOGOUT   │ │
│  └──────┬──────┘         └──────┬──────┘         └──────┬─────┘ │
│         │                       │                       │       │
│         ▼                       ▼                       ▼       │
│  ┌─────────────┐         ┌─────────────┐         ┌────────────┐ │
│  │ supabase    │         │ supabase    │         │ supabase   │ │
│  │ .auth       │         │ .auth       │         │ .auth      │ │
│  │ .signUp()   │         │ .signInWith │         │ .signOut() │ │
│  └──────┬──────┘         │ Password()  │         └────────────┘ │
│         │                └──────┬──────┘                        │
│         ▼                       │                               │
│  ┌─────────────┐                │                               │
│  │ TRIGGER     │                │                               │
│  │ handle_new  │                │                               │
│  │ _user()     │                │                               │
│  └──────┬──────┘                │                               │
│         │                       │                               │
│         ▼                       │                               │
│  ┌─────────────┐                │                               │
│  │ INSERT      │                │                               │
│  │ profiles    │                │                               │
│  │ user_roles  │                │                               │
│  └──────┬──────┘                │                               │
│         │                       │                               │
│         └───────────┬───────────┘                               │
│                     ▼                                           │
│              ┌─────────────┐                                    │
│              │   SESSION   │                                    │
│              │   + JWT     │                                    │
│              └──────┬──────┘                                    │
│                     ▼                                           │
│              ┌─────────────┐                                    │
│              │  REDIRECT   │                                    │
│              │ /dashboard  │                                    │
│              └─────────────┘                                    │
└──────────────────────────────────────────────────────────────────┘
```

## 4.3 Flux SOS/Urgence

```
┌────────────────────────────────────────────────────────────────────┐
│                       WORKFLOW SOS                                  │
├────────────────────────────────────────────────────────────────────┤
│                                                                    │
│  ┌──────────┐                                                      │
│  │  USER    │                                                      │
│  └────┬─────┘                                                      │
│       │                                                            │
│       ▼ Créer alerte                                               │
│  ┌──────────────────────────────────────────────────────────┐     │
│  │                    SOS_ALERTS                             │     │
│  │  status: PENDING                                          │     │
│  │  ─────────────────────────────────────────────────────── │     │
│  │       │                      ▲                            │     │
│  │       │ Realtime             │ Update                     │     │
│  │       ▼ notification         │                            │     │
│  │  ┌──────────┐         ┌──────────┐                        │     │
│  │  │ STAFF    │────────►│ TAKE     │                        │     │
│  │  │ medical  │         │ CHARGE   │                        │     │
│  │  └──────────┘         └────┬─────┘                        │     │
│  │                            │                              │     │
│  │                            ▼                              │     │
│  │  status: IN_PROGRESS ──────┼───────────────────────────   │     │
│  │                            │                              │     │
│  │       ┌────────────────────┴────────────────────┐         │     │
│  │       │                                         │         │     │
│  │       ▼                                         ▼         │     │
│  │  ┌──────────┐                           ┌──────────┐      │     │
│  │  │ ADD      │                           │ UPDATE   │      │     │
│  │  │ COMMENT  │                           │ STATUS   │      │     │
│  │  └──────────┘                           └────┬─────┘      │     │
│  │       │                                      │            │     │
│  │       ▼                                      ▼            │     │
│  │  SOS_COMMENTS                     status: RESOLVED        │     │
│  │                                   resolved_at: NOW()      │     │
│  └──────────────────────────────────────────────────────────┘     │
└────────────────────────────────────────────────────────────────────┘
```

## 4.4 Flux Formation (Courses)

```
┌────────────────────────────────────────────────────────────────────┐
│                    PARCOURS FORMATION                              │
├────────────────────────────────────────────────────────────────────┤
│                                                                    │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐            │
│  │  CATALOGUE  │───►│ S'INSCRIRE  │───►│   ACCÉDER   │            │
│  │   courses   │    │ enrollments │    │   lessons   │            │
│  └─────────────┘    └─────────────┘    └──────┬──────┘            │
│                                               │                   │
│                      ┌────────────────────────┼────────────────┐  │
│                      │                        │                │  │
│                      ▼                        ▼                │  │
│               ┌─────────────┐          ┌─────────────┐         │  │
│               │   VIDÉO     │          │   CONTENU   │         │  │
│               │  video_url  │          │   content   │         │  │
│               └──────┬──────┘          └──────┬──────┘         │  │
│                      │                        │                │  │
│                      └───────────┬────────────┘                │  │
│                                  │                             │  │
│                                  ▼                             │  │
│                           ┌─────────────┐                      │  │
│                           │    QUIZ     │                      │  │
│                           │   quizzes   │                      │  │
│                           └──────┬──────┘                      │  │
│                                  │                             │  │
│                                  ▼                             │  │
│                      ┌───────────────────────┐                 │  │
│                      │   QUIZ_QUESTIONS      │                 │  │
│                      │   - question          │                 │  │
│                      │   - options[]         │                 │  │
│                      │   - correct_answer    │                 │  │
│                      └───────────┬───────────┘                 │  │
│                                  │                             │  │
│                                  ▼                             │  │
│                           ┌─────────────┐                      │  │
│                           │  SOUMETTRE  │                      │  │
│                           │quiz_attempts│                      │  │
│                           └──────┬──────┘                      │  │
│                                  │                             │  │
│                      ┌───────────┴───────────┐                 │  │
│                      │                       │                 │  │
│                      ▼                       ▼                 │  │
│               ┌─────────────┐         ┌─────────────┐          │  │
│               │  RÉUSSI     │         │   ÉCHOUÉ    │          │  │
│               │ score >= 70 │         │ score < 70  │          │  │
│               └──────┬──────┘         └──────┬──────┘          │  │
│                      │                       │                 │  │
│                      ▼                       ▼                 │  │
│               lesson_progress         Réessayer quiz           │  │
│               completed: true                                  │  │
└────────────────────────────────────────────────────────────────────┘
```

---

# 5. SÉCURITÉ GLOBALE

## 5.1 Row Level Security (RLS)

Toutes les tables ont RLS activé. Patterns utilisés:

```sql
-- Pattern: Données personnelles
USING (auth.uid() = user_id)

-- Pattern: Accès par rôle
USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'medical_staff'))

-- Pattern: Participation
USING (is_conversation_participant(auth.uid(), conversation_id))
```

## 5.2 Fonctions de sécurité

```sql
-- Vérification de rôle (SECURITY DEFINER)
has_role(user_id UUID, role app_role) → BOOLEAN

-- Vérification participation conversation
is_conversation_participant(user_id UUID, conversation_id UUID) → BOOLEAN
```

## 5.3 Bonnes pratiques appliquées

- ✅ Rôles stockés dans table séparée (pas dans profiles)
- ✅ Fonctions SECURITY DEFINER pour éviter recursion RLS
- ✅ Pas de credentials côté client
- ✅ Validation côté serveur via RLS

---

# 6. RISQUES ET DETTES TECHNIQUES

| Risque | Sévérité | Description | Mitigation |
|--------|----------|-------------|------------|
| **Stats hardcodées** | Moyenne | Dashboard principal affiche des stats statiques | Connecter aux vraies données |
| **Module Education** | Moyenne | Page Education avec données statiques | Fusionner avec Courses ou supprimer |
| **Pagination absente** | Moyenne | Listes sans pagination (performance) | Implémenter pagination Supabase |
| **Upload fichiers** | Haute | Pas de storage pour pièces jointes | Configurer Supabase Storage |
| **Tests manquants** | Haute | Aucun test automatisé | Ajouter tests unitaires/e2e |
| **Leaked Password Protection** | Basse | Non activé dans Supabase Auth | Activer dans settings Auth |

### ASSUMPTIONS

1. **ASSUMPTION**: Les rôles existants couvrent tous les cas d'usage (admin, teacher, student, medical_staff, parent, user)
2. **ASSUMPTION**: Les utilisateurs ont accès à leurs propres données uniquement sauf exception documentée
3. **ASSUMPTION**: Le déploiement OVH concernera uniquement le frontend, le backend reste sur Lovable Cloud

---

# 7. BACKLOG PRIORISÉ (Top 20)

| # | Feature | Module | Estimation | Priorité |
|---|---------|--------|------------|----------|
| 1 | Pagination des listes | Global | S | P1 |
| 2 | Upload images (Storage) | Medical, Social | M | P1 |
| 3 | Stats dynamiques dashboard | Dashboard | S | P1 |
| 4 | Notifications push (realtime) | Notifications | M | P1 |
| 5 | Export PDF dossier patient | Medical | S | P1 |
| 6 | Géolocalisation SOS | SOS | M | P2 |
| 7 | Commentaires posts | Social | S | P2 |
| 8 | Intégration calendrier externe | Agenda | L | P2 |
| 9 | OAuth Google/GitHub | Auth | M | P2 |
| 10 | Reset password | Auth | S | P2 |
| 11 | Page paramètres utilisateur | Users | M | P2 |
| 12 | Mode sombre toggle | UI | S | P3 |
| 13 | Tests unitaires | Global | L | P3 |
| 14 | Tests E2E Playwright | Global | L | P3 |
| 15 | Dashboard intervenants SOS | SOS | M | P3 |
| 16 | Interopérabilité HL7/FHIR | Medical | L | P3 |
| 17 | Certificats formation | Courses | M | P3 |
| 18 | Module Research Core | Nouveau | L | P4 |
| 19 | Module Stats avancées | Nouveau | L | P4 |
| 20 | IA diagnostic assisté | Medical | L | P4 |

**Légende estimation**: S = Small (1-2j), M = Medium (3-5j), L = Large (1-2 semaines)

---

# 8. APPENDICES

## A. Commandes SQL utiles

```sql
-- Voir tous les utilisateurs avec leurs rôles
SELECT p.email, p.full_name, ur.role
FROM profiles p
LEFT JOIN user_roles ur ON p.id = ur.user_id;

-- Attribuer un rôle admin
INSERT INTO user_roles (user_id, role)
VALUES ('uuid-here', 'admin');

-- Compter les alertes SOS par statut
SELECT status, COUNT(*) FROM sos_alerts GROUP BY status;
```

## B. Variables d'environnement pour déploiement OVH

```bash
# Build de production
VITE_SUPABASE_URL=https://qqwljebhdaaeotjlvjic.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=eyJhbGciOiJIUzI1...
```

## C. Structure des rôles

```
app_role ENUM:
├── admin          → Accès total
├── teacher        → Gestion cours
├── student        → Consultation cours
├── medical_staff  → Accès module médical
├── parent         → Vue limitée élève
└── user           → Rôle par défaut
```

---

**Fin de la documentation**

*Document généré le 13 Décembre 2024 - Version 1.0.0*
