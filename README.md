# CareSphere MVP

A functional starter implementation based on the uploaded CareSphere capstone documentation. It follows the documented React + Node/Express + relational database architecture, with RBAC, child registry, protected 10-minute QR codes, inventory, donations, visitor logging, KPI dashboard, and activity auditing.

## Run
1. Install Node.js 20+ and SQL Server 2019+ (or SQL Server Express).
2. Execute `database/schema.sql` in SQL Server Management Studio or `sqlcmd`.
3. Copy `server/.env.example` to `server/.env` and set the SQL Server credentials and a strong JWT secret.
4. Copy `client/.env.example` to `client/.env` if the API is not running at `http://localhost:4000/api`.
5. From the project root, run `npm install`, `npm run install-all`, then `npm run dev`.
6. Open the Vite URL shown by the terminal (normally http://localhost:5173).

The seeded admin account is `admin` / `Admin123!`. Change this credential before using the account in a real environment.

## Publish To The Web
The included `Dockerfile` builds the Vite client and serves it from the Express API on port `4000`. Use any Docker-capable host for the web service and a managed SQL Server instance such as Azure SQL Database.

1. Execute `database/schema.sql` against the production SQL Server database.
2. Build and run the image: `docker build -t caresphere .` then `docker run --env-file server/.env -p 4000:4000 caresphere`.
3. Configure these production environment values on the host: `NODE_ENV=production`, `JWT_SECRET`, `CLIENT_ORIGIN=https://your-domain.example`, `COOKIE_SECURE=true`, and the `DB_*` SQL Server values.
4. Configure the host’s HTTPS custom domain or reverse proxy. Do not expose the Node port directly for real child data.
5. Open the published HTTPS URL. The same service serves both the React app and `/api/*`.

The repository cannot create the cloud database, domain, or hosting account without your provider credentials. The container is prepared for platforms such as Azure App Service, Render, Railway, Fly.io, or a private Docker host.

## Security and UI architecture
- API authentication uses a JWT in an HTTP-only `cs_access` cookie, with bearer-token compatibility for API clients.
- Sessions are stored server-side and can be revoked through `POST /api/auth/logout`.
- Helmet, credentialed CORS, parameterized `mssql` queries, and global/auth-specific rate limits are enabled.
- The client uses Axios interceptors and Recharts for the KPI analytical view.

## Notes
- QR codes are generated server-side and expire after 3 minutes.
- Child QR scan is restricted to authenticated ADMIN/STAFF users and invalid attempts are logged.
- The backend uses SQL Server through the `mssql` driver. The React client includes Axios bearer-token support and Tailwind-ready reusable dashboard, child health, and QR resolver components.
- The documented system is intended for local-network deployment and does not include native mobile apps, SMS/email notifications, financial management, or external government-registry integration.
- Before production use with real children's data, add HTTPS on the local network, secure secret management, backup/restore, CSRF protections where applicable, stronger password policy, consent/legal workflows, and a full privacy/security review.
