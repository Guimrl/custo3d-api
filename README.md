# Custo 3D API

API da calculadora de custo de impressão 3D: carretéis de filamento, outros materiais (argolas, ímãs, embalagens…), equipamentos, impressões/orçamentos e precificação.

### Pré-requisitos

- Node.js 20 ou mais recente.
- MongoDB (Atlas gratuito serve).
- Postman ou Insomnia (opcional, para testar as rotas).

## Rodar localmente

1. `npm install`
2. Crie o `.env` a partir do `.env.example` (`DB_CONNECTION`, `JWT_SECRET`, `PORT`).
3. `npm run dev`. A API sobe em http://localhost:3333.

## Scripts

| Comando             | O que faz                                                         |
| ------------------- | ----------------------------------------------------------------- |
| `npm run dev`       | Sobe a API com recarregamento automático (tsx watch)              |
| `npm run build`     | Verifica tipos e empacota `src/server.ts` em `dist/server.js`     |
| `npm start`         | Roda a versão empacotada (`dist/server.js`)                       |
| `npm run typecheck` | Verifica os tipos                                                 |
| `npm run lint`      | ESLint com correção automática                                    |

## Rotas

| Método | Rota          | Token? | Descrição                                                           |
| ------ | ------------- | ------ | ------------------------------------------------------------------- |
| GET    | `/`           | não    | `{ "title": "Custo 3D API" }`, para ver se a API está no ar         |
| POST   | `/auth/login` | não    | `{ "username", "password" }` → `{ "token", "user" }`                |
| GET    | `/auth/me`    | sim    | Usuário dono do token                                               |
| GET    | `/settings`   | sim    | Configurações gerais (cria com os padrões na primeira vez)          |
| PUT    | `/settings`   | sim    | Salva só os campos enviados (ex.: `{ "kwhPrice": 1.02 }`)          |



## Autor

- **Guilherme Amaral**: [Perfil](https://github.com/Guimrl)
