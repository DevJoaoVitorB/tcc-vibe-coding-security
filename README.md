# API de Autenticação

API Express em TypeScript com Prisma e SQLite, que implementa cadastro, autenticação por access/refresh token, renovação de sessão, logout e consulta de perfil protegido.

## Requisitos

- Node.js 24+ (ou uma versão compatível com as dependências)
- npm

## Instalação e execução local

1. Copie `.env.example` para `.env` e defina um valor seguro para `JWT_SECRET`.
2. Instale as dependências: `npm install`.
3. Crie/aplique o banco SQLite: `npx prisma migrate deploy`.
4. Inicie em desenvolvimento: `npm run dev`.

A API usa a porta `3000` por padrão. A especificação OpenAPI está disponível em `GET /openapi.json` (por exemplo, `http://localhost:3000/openapi.json`).

## Rotas

- `POST /auth/register` — corpo `{ "name", "email", "password" }`; cria usuário.
- `POST /auth/login` — corpo `{ "email", "password" }`; retorna `accessToken` e `refreshToken`.
- `POST /auth/refresh` — corpo `{ "refreshToken" }`; rotaciona os tokens.
- `POST /auth/logout` — requer `Authorization: Bearer <accessToken>`; invalida a sessão.
- `GET /me` — requer Bearer token; retorna o perfil autenticado.
- `GET /users/:id` — requer Bearer token; somente aceita o id do próprio usuário.

Senhas são armazenadas com hash bcrypt. O refresh token é armazenado apenas como hash e é rotacionado a cada uso. A validade da sessão também é conferida em todas as rotas protegidas, de modo que o access token deixa de funcionar após logout.

## Docker

1. Crie o arquivo `.env` conforme `.env.example`.
2. Execute: `docker build -t authentication-api .`
3. Execute: `docker run --rm -p 3000:3000 --env-file .env -v "${PWD}/data:/app/data" -e DATABASE_URL="file:/app/data/app.db" authentication-api`

O volume mantém o banco SQLite fora do container.

## Verificações executadas

- `npx prisma generate` — concluído com sucesso.
- `DATABASE_URL="file:./dev.db" npx prisma validate` — schema validado com sucesso.
- `npm run build` — compilação TypeScript concluída com sucesso.
- `npm test` — verifica a exposição de `/openapi.json` e os `operationId`s das seis operações.

Limitação encontrada: neste ambiente, `npx prisma migrate deploy` falhou no Prisma Schema Engine ao abrir o SQLite, retornando somente `Schema engine error` (sem detalhe adicional). Por isso, a migration e os fluxos HTTP que dependem do banco não foram apresentados como executados. A migration SQL está incluída em `prisma/migrations/` e deve ser aplicada pelo comando de instalação em um ambiente cujo engine Prisma consiga acessar SQLite.
