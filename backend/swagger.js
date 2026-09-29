const buildSwaggerSpec = (port = 4000) => ({
  openapi: '3.0.1',
  info: {
    title: 'Production Atelier API',
    version: '1.0.0',
    description: 'API Swagger pour authentification, gestion des opérations, employés, productions, jetons et rapports.'
  },
  servers: [{ url: `http://localhost:${port}` }],
  components: {
    securitySchemes: {
      bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' }
    },
    schemas: {
      LoginRequest: {
        type: 'object',
        required: ['username', 'password'],
        properties: {
          username: { type: 'string', example: 'admin' },
          password: { type: 'string', example: 'sa123' }
        }
      },
      Operation: {
        type: 'object',
        properties: {
          id: { type: 'integer', example: 1 },
          code: { type: 'string', example: 'OP-001' },
          nom: { type: 'string', example: 'Découpe' },
          tailleLot: { type: 'integer', example: 100 },
          objectifHeure: { type: 'number', format: 'float', example: 260.87 },
          tempsMinutes: { type: 'number', format: 'float', example: 0.23 },
          besoinRessource: { type: 'number', format: 'float', example: 0.1127 },
          active: { type: 'boolean', example: true }
        }
      },
      Employee: {
        type: 'object',
        properties: {
          id: { type: 'integer', example: 1 },
          matricule: { type: 'string', example: 'EMP-01' },
          nom: { type: 'string', example: 'Doe' },
          prenom: { type: 'string', example: 'John' },
          photo: { type: 'string', nullable: true },
          chaine: { type: 'string', example: 'A', nullable: true },
          dateEmbauche: { type: 'string', format: 'date-time' },
          active: { type: 'boolean', example: true }
        }
      },
      Production: {
        type: 'object',
        properties: {
          id: { type: 'integer', example: 1 },
          operationId: { type: 'integer', example: 2 },
          employeeId: { type: 'integer', example: 3 },
          date: { type: 'string', format: 'date-time' },
          totalPieces: { type: 'integer', example: 500 },
          heuresTravail: { type: 'number', format: 'float', example: 7.5 },
          rendement: { type: 'number', format: 'float', example: 95.5 },
          validee: { type: 'boolean', example: false }
        }
      }
    }
  },
  security: [{ bearerAuth: [] }],
  paths: {
    '/api/auth/login': {
      post: {
        summary: 'Connexion',
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/LoginRequest' } } }
        },
        responses: {
          200: {
            description: 'Token et informations utilisateur',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    token: { type: 'string' },
                    username: { type: 'string' },
                    role: { type: 'string' },
                    employeeId: { type: 'integer', nullable: true }
                  }
                }
              }
            }
          },
          401: { description: 'Identifiants invalides' }
        }
      }
    },
    '/api/auth/me': {
      get: {
        summary: 'Profil courant',
        security: [{ bearerAuth: [] }],
        responses: { 200: { description: 'Utilisateur connecté' }, 401: { description: 'Non autorisé' } }
      }
    },
    '/api/operations': {
      get: {
        summary: 'Lister les opérations',
        security: [{ bearerAuth: [] }],
        responses: { 200: { description: 'Liste des opérations', content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/Operation' } } } } } }
      },
      post: {
        summary: 'Créer une opération',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/Operation' } } }
        },
        responses: { 201: { description: 'Créée' }, 401: { description: 'Non autorisé' } }
      }
    },
    '/api/operations/{id}': {
      put: {
        summary: 'Mettre à jour une opération',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/Operation' } } } },
        responses: { 200: { description: 'Mise à jour' }, 404: { description: 'Non trouvée' } }
      },
      delete: {
        summary: 'Supprimer une opération',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        responses: { 200: { description: 'Supprimée' }, 404: { description: 'Non trouvée' } }
      }
    },
    '/api/employees': {
      get: {
        summary: 'Lister les employés actifs',
        security: [{ bearerAuth: [] }],
        responses: { 200: { description: 'Liste des employés', content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/Employee' } } } } } }
      },
      post: {
        summary: 'Créer un employé',
        security: [{ bearerAuth: [] }],
        requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/Employee' } } } },
        responses: { 201: { description: 'Créé' } }
      }
    },
    '/api/employees/{id}': {
      get: {
        summary: 'Récupérer un employé',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        responses: { 200: { description: 'Employé' }, 404: { description: 'Non trouvé' } }
      },
      put: {
        summary: 'Mettre à jour un employé',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/Employee' } } } },
        responses: { 200: { description: 'Mise à jour' } }
      },
      delete: {
        summary: 'Supprimer un employé',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        responses: { 200: { description: 'Supprimé' } }
      }
    },
    '/api/employees/{id}/stats': {
      get: {
        summary: 'Statistiques employé',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'integer' } },
          { name: 'startDate', in: 'query', schema: { type: 'string', format: 'date-time' } },
          { name: 'endDate', in: 'query', schema: { type: 'string', format: 'date-time' } }
        ],
        responses: { 200: { description: 'Stats' } }
      }
    },
    '/api/productions': {
      get: {
        summary: 'Lister les productions',
        security: [{ bearerAuth: [] }],
        responses: { 200: { description: 'Liste des productions', content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/Production' } } } } } }
      },
      post: {
        summary: 'Créer une production',
        security: [{ bearerAuth: [] }],
        requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/Production' } } } },
        responses: { 201: { description: 'Créée' } }
      }
    },
    '/api/productions/stats/daily': {
      get: {
        summary: 'Stats quotidiennes',
        security: [{ bearerAuth: [] }],
        responses: { 200: { description: 'Statistiques quotidiennes' } }
      }
    },
    '/api/productions/{id}': {
      get: {
        summary: 'Récupérer une production',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        responses: { 200: { description: 'Production' }, 404: { description: 'Non trouvée' } }
      },
      put: {
        summary: 'Mettre à jour une production',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/Production' } } } },
        responses: { 200: { description: 'Mise à jour' } }
      },
      delete: {
        summary: 'Supprimer une production',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        responses: { 200: { description: 'Supprimée' } }
      }
    },
    '/api/productions/{id}/validate': {
      post: {
        summary: 'Valider une production',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        responses: { 200: { description: 'Production validée' } }
      }
    },
    '/api/jetons/{productionId}': {
      get: {
        summary: 'Lister les jetons par production',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'productionId', in: 'path', required: true, schema: { type: 'integer' } }],
        responses: { 200: { description: 'Jetons' } }
      }
    },
    '/api/jetons/print': {
      post: {
        summary: 'Générer/imprimer des jetons',
        security: [{ bearerAuth: [] }],
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object' } } } },
        responses: { 200: { description: 'Jetons générés' } }
      }
    },
    '/api/reports/daily': {
      get: {
        summary: 'Rapport quotidien',
        security: [{ bearerAuth: [] }],
        responses: { 200: { description: 'Rapport PDF/Excel' } }
      }
    }
  }
});

export default buildSwaggerSpec;
