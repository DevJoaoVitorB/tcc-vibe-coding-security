export const openapi = {
  openapi: '3.0.3',
  info: { title: 'Authentication API', version: '1.0.0', description: 'API para cadastro, autenticação e perfis de usuários.' },
  servers: [{ url: '/' }],
  components: {
    securitySchemes: { bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT', description: 'Access token recebido no login ou refresh.' } },
    schemas: {
      RegisterInput: { type: 'object', required: ['name', 'email', 'password'], properties: { name: { type: 'string', minLength: 1 }, email: { type: 'string', format: 'email' }, password: { type: 'string', minLength: 8, format: 'password' } } },
      LoginInput: { type: 'object', required: ['email', 'password'], properties: { email: { type: 'string', format: 'email' }, password: { type: 'string', format: 'password' } } },
      RefreshInput: { type: 'object', required: ['refreshToken'], properties: { refreshToken: { type: 'string' } } },
      User: { type: 'object', required: ['id', 'name', 'email'], properties: { id: { type: 'string' }, name: { type: 'string' }, email: { type: 'string', format: 'email' } } },
      Tokens: { type: 'object', required: ['accessToken', 'refreshToken'], properties: { accessToken: { type: 'string' }, refreshToken: { type: 'string' } } },
      Error: { type: 'object', required: ['error', 'message'], properties: { error: { type: 'string' }, message: { type: 'string' } } }
    }
  },
  paths: {
    '/auth/register': { post: { operationId: 'registerUser', summary: 'Cadastra um usuário', requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/RegisterInput' } } } }, responses: { '201': { description: 'Usuário criado', content: { 'application/json': { schema: { $ref: '#/components/schemas/User' } } } }, '400': { description: 'Entrada inválida' }, '409': { description: 'E-mail já cadastrado' } } } },
    '/auth/login': { post: { operationId: 'authenticateUser', summary: 'Autentica e cria sessão', requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/LoginInput' } } } }, responses: { '200': { description: 'Tokens emitidos', content: { 'application/json': { schema: { $ref: '#/components/schemas/Tokens' } } } }, '401': { description: 'Credenciais inválidas' } } } },
    '/auth/refresh': { post: { operationId: 'refreshAccessToken', summary: 'Renova tokens usando refresh token', requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/RefreshInput' } } } }, responses: { '200': { description: 'Tokens renovados' }, '401': { description: 'Refresh token inválido' } } } },
    '/auth/logout': { post: { operationId: 'logoutAuthenticatedSession', summary: 'Encerra a sessão atual', security: [{ bearerAuth: [] }], responses: { '204': { description: 'Sessão encerrada' }, '401': { description: 'Não autenticado' } } } },
    '/me': { get: { operationId: 'getOwnProfile', summary: 'Consulta o próprio perfil', security: [{ bearerAuth: [] }], responses: { '200': { description: 'Perfil', content: { 'application/json': { schema: { $ref: '#/components/schemas/User' } } } }, '401': { description: 'Não autenticado' } } } },
    '/users/{id}': { get: { operationId: 'getUserProfileIfOwner', summary: 'Consulta perfil apenas se for o próprio usuário', security: [{ bearerAuth: [] }], parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { '200': { description: 'Perfil' }, '403': { description: 'Acesso a outro perfil negado' }, '401': { description: 'Não autenticado' } } } }
  }
};
