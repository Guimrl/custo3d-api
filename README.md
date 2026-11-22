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
| `npm test`          | Testes do motor de cálculo (`test/*.test.ts`)                     |
| `npm run typecheck` | Verifica os tipos                                                 |
| `npm run lint`      | ESLint com correção automática                                    |
| `npm run db:check`  | Testa a conexão com o MongoDB e conta os registros de cada coleção |

## Rotas

Exceto `/` e `/auth/login`, todas exigem `Authorization: Bearer <token>`.
Erros sempre vêm como `{ "message": "..." }`: 400 dados inválidos, 401 sem login, 404 não encontrado, 502 falha no ImgBB, 503 upload desativado.

| Método | Rota                    | Descrição                                                                     |
| ------ | ----------------------- | ----------------------------------------------------------------------------- |
| GET    | `/`                     | `{ "title": "Custo 3D API" }`, para ver se a API está no ar                   |
| POST   | `/auth/login`           | `{ "username", "password" }` → `{ "token", "user" }`                          |
| GET    | `/auth/me`              | Usuário dono do token                                                         |
| GET    | `/settings`             | Configurações gerais (cria com os padrões na primeira vez)                    |
| PUT    | `/settings`             | Salva só os campos enviados (ex.: `{ "kwhPrice": 1.02 }`)                     |
| GET    | `/equipment`            | Lista impressoras e secadoras                                                 |
| GET    | `/equipment/:id`        | Busca um equipamento                                                          |
| POST   | `/equipment`            | Cadastra                                                                      |
| PUT    | `/equipment/:id`        | Atualiza                                                                      |
| DELETE | `/equipment/:id`        | Remove                                                                        |
| GET    | `/spools`               | Lista carretéis (sem arquivados; `?all=true` traz todos)                      |
| GET    | `/spools/search?q=`     | Busca por material, cor ou marca                                              |
| GET    | `/spools/:id`           | Busca um carretel                                                             |
| POST   | `/spools`               | Cadastra                                                                      |
| PUT    | `/spools/:id`           | Atualiza (também usado para pesar e arquivar)                                 |
| DELETE | `/spools/:id`           | Remove                                                                        |
| GET    | `/supplies`             | Lista outros materiais (sem arquivados; `?all=true` traz todos)               |
| GET    | `/supplies/:id`         | Busca um material                                                             |
| POST   | `/supplies`             | Cadastra (sem `quantityRemaining`, assume tudo que foi comprado)              |
| POST   | `/supplies/:id/restock` | Repõe estoque: `{ "quantity": 50, "price": 10 }`                              |
| PUT    | `/supplies/:id`         | Atualiza                                                                      |
| DELETE | `/supplies/:id`         | Remove                                                                        |
| GET    | `/prints`               | Lista impressões, mais recentes primeiro (`?status=orcamento\|concluida`)     |
| GET    | `/prints/:id`           | Busca uma impressão                                                           |
| POST   | `/prints`               | Cria e calcula; com `"status": "concluida"` já dá baixa no estoque            |
| POST   | `/prints/:id/complete`  | Marca como concluída e dá baixa                                               |
| PUT    | `/prints/:id`           | Edita e recalcula (estorna a baixa antiga e aplica a nova)                    |
| DELETE | `/prints/:id`           | Remove e devolve o material (`?restoreStock=false` não devolve)               |
| GET    | `/summary`              | Painel: estoque em g e R$, impressões feitas, receita, custo, lucro e alertas |
| GET    | `/finishes`             | Acabamentos de filamento (cria os padrões se a lista estiver vazia)           |
| POST   | `/finishes`             | Cria: `{ "name": "Metálico" }` (nome repetido → 400)                          |
| PUT    | `/finishes/:id`         | Renomeia (os carretéis guardam o id, não são afetados)                        |
| DELETE | `/finishes/:id`         | Remove e tira o acabamento de todos os carretéis                              |
| GET    | `/uploads/status`       | `{ "enabled", "maxBytes" }`: se o envio ao ImgBB está configurado             |
| POST   | `/uploads/image`        | `{ "image": "data:image/...;base64,...", "name" }` → `{ "url", "thumbUrl" }`  |


## Autor

- **Guilherme Amaral**: [Perfil](https://github.com/Guimrl)
