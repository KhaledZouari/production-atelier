<div align="center">
  <img src="frontend/logo.png" alt="Logo Production Atelier" width="140" />

  # Production Atelier

  **Application web de gestion et de pilotage de la production textile**

  Suivi des opérations, des employés, des commandes et des performances d'atelier depuis une interface unique.

  ![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=white)
  ![Node.js](https://img.shields.io/badge/Node.js-Express-339933?logo=node.js&logoColor=white)
  ![SQL Server](https://img.shields.io/badge/SQL_Server-2019%2B-CC2927?logo=microsoftsqlserver&logoColor=white)
  ![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3-06B6D4?logo=tailwindcss&logoColor=white)
</div>

## À propos

Production Atelier est une solution full-stack destinée aux ateliers de confection. Elle centralise les données de production et fournit une couche MES (*Manufacturing Execution System*) pour suivre l'activité en temps réel, mesurer le rendement et assurer la traçabilité des articles dans l'atelier.

## Fonctionnalités

- Tableau de bord avec indicateurs clés et graphiques de production
- Authentification JWT et accès selon les rôles (`admin`, `chef_chaine`, utilisateur)
- Gestion des employés, opérations, commandes et présences
- Saisie, consultation et suivi des productions
- Calcul du rendement individuel et collectif à partir du temps standard SAM
- Classement des performances par employé, ligne ou atelier
- Fiches suiveuses numériques pour les articles en production
- Paniers de production identifiés par code-barres et QR code
- Historique complet des mouvements et de la traçabilité
- Alertes automatiques sur les anomalies de production
- Rapports exportables en PDF et Excel
- Documentation interactive de l'API avec Swagger

## Stack technique

| Couche | Technologies |
| --- | --- |
| Frontend | React 18, Vite, Tailwind CSS, Recharts, Axios |
| Backend | Node.js, Express, JWT, Swagger |
| Base de données | Microsoft SQL Server |
| Documents | PDFKit, ExcelJS, QRCode, bwip-js |

## Architecture

```text
production/
├── backend/
│   ├── config/          # Connexion SQL Server
│   ├── controllers/     # Logique des endpoints
│   ├── database/        # Création et évolution du schéma
│   ├── middleware/      # Authentification et gestion des erreurs
│   ├── routes/          # Routes REST
│   ├── services/        # Logique métier MES
│   ├── test/            # Tests des calculs métier
│   └── server.js        # Point d'entrée de l'API
└── frontend/
    └── src/
        ├── components/  # Composants réutilisables
        ├── context/     # État d'authentification
        ├── pages/       # Écrans de l'application
        └── services/    # Client HTTP
```

## Installation

### Prérequis

- Node.js 18 ou supérieur
- Microsoft SQL Server
- npm

### 1. Cloner le dépôt

```bash
git clone https://github.com/KhaledZouari/production-atelier.git
cd production-atelier
```

### 2. Configurer et lancer l'API

```bash
cd backend
npm install
cp .env.example .env
npm run seed
npm run dev
```

Sous PowerShell, utilisez `Copy-Item .env.example .env` à la place de `cp`.

Adaptez ensuite `backend/.env` à votre instance SQL Server. Au démarrage, l'API vérifie et initialise les tables nécessaires. Elle est disponible par défaut sur `http://localhost:4000` et sa documentation Swagger sur `http://localhost:4000/api/docs`.

### 3. Lancer l'interface

Dans un second terminal :

```bash
cd frontend
npm install
npm run dev
```

L'interface est alors accessible sur `http://localhost:5173`.

## Configuration

Variables prises en charge dans `backend/.env` :

| Variable | Description | Exemple |
| --- | --- | --- |
| `SQL_HOST` | Hôte SQL Server | `localhost` |
| `SQL_INSTANCE` | Instance nommée, si utilisée | `SQLEXPRESS` |
| `SQL_PORT` | Port SQL, alternative à l'instance | `1433` |
| `SQL_USER` | Utilisateur SQL | `sa` |
| `SQL_PASSWORD` | Mot de passe SQL | `votre_mot_de_passe` |
| `SQL_DB` | Nom de la base | `production_atelier` |
| `SQL_TRUSTED` | Active l'authentification Windows | `false` |
| `JWT_SECRET` | Clé de signature des jetons | une valeur longue et aléatoire |
| `PORT` | Port de l'API | `4000` |

Le frontend utilise `VITE_API_URL` si l'API n'est pas exposée sous `/api` sur le même domaine.

## Scripts utiles

```bash
# Backend
npm run dev           # API avec rechargement automatique
npm start             # API en mode standard
npm test              # Tests des calculs métier
npm run seed          # Données initiales
npm run seed:mes-demo # Jeu de démonstration MES

# Frontend
npm run dev           # Serveur de développement
npm run build         # Build de production
npm run preview       # Prévisualisation du build
```

## API

Les principales ressources sont exposées sous `/api` : authentification, employés, opérations, productions, commandes, présences et rapports. Le module MES est disponible sous `/api/mes` avec les ressources de rendement, fiches suiveuses, paniers, traces, alertes et tableaux de bord.

La liste complète et testable des endpoints est disponible dans Swagger après le lancement du backend.

## Auteur

Développé par [Khaled Zouari](https://github.com/KhaledZouari).

