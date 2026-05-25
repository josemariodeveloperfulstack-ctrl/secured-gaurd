# Servidor PROD – onde está o quê e como subir

## Onde está o frontend de prod?

**Não há pasta `frontend` no servidor.** O frontend de prod é só a **imagem Docker** `z7design/secured-guard-frontend:prod`, que o workflow faz push para o Docker Hub e o servidor faz pull. O container `secured-guard-frontend-prod` serve o site a partir dessa imagem.

## Erro "path /var/www/secured_guard/backend not found"

O `docker-compose.prod.yml` usa caminhos **relativos ao diretório de onde corres o comando**:

- `../backend` → pasta `backend` ao nível acima do diretório de trabalho
- `./nginx` → pasta `nginx` no diretório de trabalho

Se correres a partir de **`/var/www/secured_guard/prod`**, então `../backend` = `/var/www/secured_guard/backend` (não existe).  
Tens de correr **sempre a partir de `prod/deploy`**.

## Estrutura esperada no servidor

```
/var/www/secured_guard/prod/
├── .env                    # opcional aqui; o importante é em deploy/
├── backend/                # migrations + holerites (clone ou cópia)
│   ├── src/main/resources/db/migration/
│   └── holerites/
└── deploy/
    ├── .env                # variáveis (o workflow coloca aqui)
    ├── docker-compose.prod.yml
    ├── nginx/
    │   └── nginx-prod.conf
    ├── fix-404-prod.sh
    └── ...
```

## Comando correto para subir

**Esta VPS usa `docker-compose` (v1), não `docker compose` (plugin v2).**  
Se aparecer `unknown shorthand flag: 'f' in -f`, use o hífen:

```bash
cd /var/www/secured_guard/prod/deploy
docker-compose -f docker-compose.prod.yml pull
docker-compose -f docker-compose.prod.yml up -d
```

Ou o script automatizado:

```bash
bash /var/www/secured_guard/prod/scripts/bootstrap-prod-vps.sh
```

Não uses `cd /var/www/secured_guard/prod` para o `docker-compose`; os volumes `../backend` e `./nginx` ficam corretos só quando o comando é executado dentro de **deploy**.

## Se o compose estiver em prod em vez de em deploy

Copia o ficheiro para deploy e usa sempre o que está em deploy:

```bash
cp /var/www/secured_guard/prod/docker-compose.prod.yml /var/www/secured_guard/prod/deploy/
cd /var/www/secured_guard/prod/deploy
docker-compose -f docker-compose.prod.yml up -d
```

Garante também que existe **`/var/www/secured_guard/prod/backend`** com as pastas `src/main/resources/db/migration` e `holerites` (por exemplo, clone do repo ou cópia feita pelo deploy).
