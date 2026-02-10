# Login em localhost – checklist

Se usuário e senha estão corretos mas você **não consegue logar no sistema em localhost**, confira os pontos abaixo.

## 1. Backend em execução na porta 8083

O frontend local usa por padrão:

- **API:** `http://localhost:8083/api`
- Definido em `frontend/.env`: `VITE_API_URL=http://localhost:8083/api`
- Em `frontend/src/config/environment.ts`, no ambiente `local` também é usado `http://localhost:8083/api`.

**O que fazer:**

- Subir o backend na porta **8083** (valor em `backend/src/main/resources/application.properties`: `server.port=8083`).
- Se o backend estiver em outra porta (ex.: 8080), altere o `.env` do frontend, por exemplo:  
  `VITE_API_URL=http://localhost:8080/api`
- Testar no navegador ou Postman:  
  `POST http://localhost:8083/api/auth/login`  
  Body (JSON): `{"username":"seu_usuario","password":"sua_senha"}`

## 2. Perfil e banco de dados local

O backend usa por padrão o perfil **local** (`application.properties`: `spring.profiles.active=...` com fallback `local`).

- Em **local**, o banco usado está em `application-local.properties`:
  - URL: `jdbc:postgresql://localhost:5432/secured_guard_test` (ou variável `SPRING_DATASOURCE_URL`)
  - Usuário/senha: `postgres` / `1234567` (ou variáveis `SPRING_DATASOURCE_USERNAME` e `SPRING_DATASOURCE_PASSWORD`).

**O que fazer:**

- Ter o PostgreSQL rodando em `localhost:5432`.
- Ter o banco (ex.: `secured_guard_test`) criado e migrado (Flyway).
- Garantir que existe pelo menos um usuário com o login/senha que você está usando (e que a senha está correta no banco, geralmente em BCrypt).

## 3. CORS

O `SecurityConfig` do backend já configura CORS com `setAllowedOriginPatterns("*")` e métodos/headers permitidos. Em desenvolvimento local (front em outra porta, ex. 5173), isso costuma ser suficiente. Se ainda aparecer erro de CORS no console do navegador, confira se não há outro proxy ou regra sobrescrevendo.

## 4. Erro exibido no frontend

- **“Network Error” / falha ao conectar:** backend parado ou URL/porta errada (veja item 1).
- **401 Unauthorized:** credenciais erradas ou usuário inativo; conferir usuário/senha no banco e se a conta está ativa.
- **403 / 404:** conferir se a URL do login é exatamente a que o backend expõe (ex.: `/api/auth/login`) e se o contexto da aplicação está correto.

## 5. Resumo rápido

| Verificação              | Ação |
|--------------------------|------|
| Backend na porta 8083?   | Rodar o backend e testar `POST http://localhost:8083/api/auth/login`. |
| `.env` com porta certa?  | `VITE_API_URL=http://localhost:8083/api` (ou a porta que você usa). |
| PostgreSQL rodando?      | Banco em `localhost:5432`, banco criado e migrado. |
| Usuário existe no banco? | Mesmo username e senha (hash BCrypt) que você digita no login. |

Depois de ajustar, tente o login de novo; se ainda falhar, abra o DevTools (aba Network) e veja o status e o corpo da resposta do `POST .../auth/login` para identificar se o problema é rede, 401, 403 ou 500.
