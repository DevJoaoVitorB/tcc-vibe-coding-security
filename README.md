# Secure Authentication API

API de autenticação construída com Express, TypeScript, Prisma e SQLite. Ela implementa cadastro, login com access e refresh tokens, renovação com rotação de refresh token, logout com revogação imediata da sessão e consulta protegida do perfil.

## Requisitos

- Node.js 22 ou superior (o desenvolvimento foi validado com Node 24)
- npm
- Docker (opcional, para container)

## Instalação e execução local

1. Instale as dependências:

   ```bash
   npm install
   ```

2. Copie `.env.example` para `.env` e substitua os dois segredos JWT por valores aleatórios, diferentes e com no mínimo 32 caracteres. Nunca versione esse arquivo.

3. Crie/aplique o esquema do banco:

   ```bash
   npm run prisma:migrate -- --name init
   ```

4. Inicie em desenvolvimento:

   ```bash
   npm run dev
   ```

A API fica disponível em `http://localhost:3000`. Para produção, execute `npm run build` e depois `npm start`.

## Container Docker

Crie um arquivo `.env` como acima e execute:

```bash
docker build -t secure-auth-api .
docker run --rm -p 3000:3000 --env-file .env secure-auth-api
```

O container aplica as migrações pendentes antes de iniciar a API. Para preservar o banco SQLite entre recriações, forneça `DATABASE_URL` apontando para um caminho montado em volume e monte esse diretório no container.

## API e OpenAPI

A especificação completa está em `GET /openapi.json` (por exemplo, `http://localhost:3000/openapi.json`). Rotas disponíveis:

| Método | Rota | Finalidade |
| --- | --- | --- |
| POST | `/auth/register` | Cadastra um usuário. |
| POST | `/auth/login` | Retorna `accessToken` e `refreshToken`. |
| POST | `/auth/refresh` | Rotaciona o refresh token e retorna um novo par de tokens. |
| POST | `/auth/logout` | Revoga a sessão indicada pelo bearer access token. |
| GET | `/users/me` | Retorna o perfil do usuário autenticado. |
| GET | `/users/:id` | Retorna o perfil somente se `:id` for o próprio usuário autenticado. |

As rotas protegidas recebem `Authorization: Bearer <accessToken>`. As respostas de perfil nunca incluem senha, hash ou dados de sessão.

## Decisões de segurança

- Senhas são armazenadas somente como hash bcrypt com salt e custo 12.
- Tokens são assinados por segredos exclusivos do ambiente; não há segredos no código.
- Sessões e hashes de refresh tokens são persistidos no SQLite. O middleware consulta a sessão a cada acesso protegido, portanto o logout invalida imediatamente tanto o refresh token quanto o access token correspondente.
- O refresh token é rotacionado a cada uso; reutilização do token anterior falha.
- Validação estrita rejeita campos inesperados e entradas inválidas. O Prisma usa consultas parametrizadas.
- Login possui limite de 10 tentativas por IP a cada 15 minutos e falha com mensagem genérica para evitar enumeração de contas.
- Helmet, limite de tamanho do JSON, mensagens de erro controladas e remoção de `X-Powered-By` reduzem exposição desnecessária.

## Verificações executadas

Em 9 de novembro de 2026 foram executados com sucesso:

```bash
npm run build
npm test
npm audit --json
```

Resultados: compilação TypeScript concluída; 1 teste de integração aprovado (cadastro, login, perfil protegido, bloqueio de acesso a outro perfil, refresh com rotação e revogação no logout); auditoria sem vulnerabilidades reportadas. O teste usa um SQLite temporário com o mesmo esquema da migração.

`npx prisma generate` também foi executado com sucesso. A execução de `npx prisma migrate dev --name init` e `npx prisma validate` neste ambiente não pôde ser concluída: o schema engine do Prisma encerrou com `Schema engine error` sem detalhes, apesar de o binário ter sido baixado e ser executável. A migração SQL correspondente está versionada em `prisma/migrations/`; esse problema de ferramenta não bloqueou a compilação nem o teste de integração.

O build do Docker não foi executado porque o comando `docker` não está instalado/disponível neste ambiente.
