# Run nopCommerce locally with Docker

This setup runs a local nopCommerce instance and SQL Server so your Cypress tests can target localhost instead of the public Cloudflare-protected demo.

## 1) Start containers

From the repository root:

```powershell
docker compose -f docker-compose.nopcommerce.yml up -d
```

## 2) Open nopCommerce installer

Open:

- http://localhost:8080

In setup page, choose SQL Server and use:

- Server name: nopcommerce-db
- Database name: nopcommerce
- SQL username: sa
- SQL password: NopCommerce_StrongPass_123!

After install completes, log in to admin and keep this site as your Cypress target.

## 3) Point Cypress to local site

Run Cypress with local base URL override:

```powershell
npx cypress open --config baseUrl=http://localhost:8080 --browser chrome
```

or headless:

```powershell
npx cypress run --config baseUrl=http://localhost:8080 --browser chrome
```

## 4) Stop containers

```powershell
docker compose -f docker-compose.nopcommerce.yml down
```

To remove persistent DB/App data as well:

```powershell
docker compose -f docker-compose.nopcommerce.yml down -v
```

## Notes

- First startup may take a few minutes.
- If port 8080 is already used, change "8080:80" in docker-compose.nopcommerce.yml.
