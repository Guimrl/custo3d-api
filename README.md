# Custo 3D API

API da calculadora de custo de impressão 3D: carretéis de filamento, outros materiais (argolas, ímãs, embalagens…), equipamentos, impressões/orçamentos e precificação.

### Pré-requisitos

- Node.js 20 ou mais recente.
- MongoDB (Atlas gratuito serve).
- Postman ou Insomnia (opcional, para testar as rotas).

## Scripts

| Comando             | O que faz                                            |
| ------------------- | ---------------------------------------------------- |
| `npm run dev`       | Sobe a API com recarregamento automático (tsx watch) |
| `npm run build`     | Compila o TypeScript para `dist/`                    |
| `npm start`         | Roda a versão compilada (`dist/server.js`)           |
| `npm test`          | Testes do motor de cálculo                           |
| `npm run typecheck` | Verifica os tipos                                    |
| `npm run lint`      | ESLint com correção automática                       |
| `npm run db:check`  | Testa a conexão com o MongoDB                        |

## Autor

- **Guilherme Amaral**: [Perfil](https://github.com/Guimrl)
