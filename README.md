# StandUp - Daily Task Dashboard

A team standup dashboard with role-based permissions, time tracking, and client assignment.

## Architecture

```
┌─────────────┐     ┌──────────────┐     ┌──────────────┐
│   Frontend   │────▶│   Backend    │────▶│  PostgreSQL   │
│  React/Vite  │     │  Express API │     │              │
│  nginx :80   │     │    :3000     │     │   :5432      │
└─────────────┘     └──────────────┘     └──────────────┘
```

- **Frontend**: React app built with Vite, served by nginx. Proxies `/api/*` to backend.
- **Backend**: Node.js + Express REST API with JWT auth and bcrypt passwords.
- **Database**: PostgreSQL 16 with schema auto-initialization.

## Quick Start

### 1. Configure environment

```bash
cp .env.example .env
# Edit .env and set strong passwords:
#   DB_PASSWORD=your_secure_db_password
#   JWT_SECRET=your_long_random_jwt_secret
```

### 2. Deploy with Docker Compose

```bash
docker compose up -d --build
```

### 3. Access the app

Open `http://your-server-ip:8080` in a browser.

### Default logins

| User | ID | Password | Role |
|------|-----|----------|------|
| Chris Canovai | chris.canovai | admin | Owner |
| Ned Maliski | ned.maliski | pass | Manager |
| Ioannis Batsios | ioannis.batsios | pass | Team Lead |
| Dane Cooper | dane.cooper | pass | Employee |
| (others) | first.last | pass | Various |

**⚠️ Change all passwords after first login!**

## Role Hierarchy & Permissions

```
Owner (chris.canovai)
  └── Can see/edit everyone, manage all users/teams/clients

Manager (ned.maliski)
  └── Can see/edit their teams, manage team members

Team Lead (ioannis.batsios, mike.torres)
  └── Can see/edit their team members

Employee (dane.cooper, alex.kim, etc.)
  └── Can only edit their own tasks
```

## API Endpoints

### Auth
- `POST /api/auth/login` - Login, returns JWT token
- `GET /api/auth/me` - Get current user info

### Users
- `GET /api/users` - List visible users
- `POST /api/users` - Create user (admin)
- `PUT /api/users/:id` - Update user
- `DELETE /api/users/:id` - Delete user (admin)

### Teams
- `GET /api/teams` - List teams
- `POST /api/teams` - Create team (admin)
- `PUT /api/teams/:id` - Update team (admin)
- `DELETE /api/teams/:id` - Delete team (admin)

### Clients
- `GET /api/clients` - List clients
- `POST /api/clients` - Create client (admin)
- `PUT /api/clients/:id` - Update client (admin)
- `DELETE /api/clients/:id` - Delete client (admin)

### Tasks
- `GET /api/tasks/:userId` - Get tasks for a user
- `POST /api/tasks` - Create task
- `PUT /api/tasks/:id` - Update task
- `DELETE /api/tasks/:id` - Delete task

## Task Fields

Each task has:
- **text** - Task description
- **client_id** - Associated client
- **expected_time** - Estimated time in minutes (15-min increments)
- **actual_time** - Actual time spent (logged on completion)
- **section** - today / tomorrow / future

## Maintenance

### View logs
```bash
docker compose logs -f backend
docker compose logs -f db
```

### Reset database (⚠️ destroys all data)
```bash
docker compose down -v
docker compose up -d --build
```

### Backup database
```bash
docker exec standup-db pg_dump -U standup standup > backup.sql
```

### Restore database
```bash
cat backup.sql | docker exec -i standup-db psql -U standup standup
```

## Deploying to Portainer

1. Create a new Stack in Portainer
2. Paste the contents of `docker-compose.yml`
3. Add environment variables in the Portainer UI:
   - `DB_PASSWORD`
   - `JWT_SECRET`
4. Deploy the stack

Or use the Git repository method if you push this to a repo.

## Future Enhancements

- [ ] Admin panel UI in frontend (currently API-only for admin ops)
- [ ] Password change self-service
- [ ] Task drag-and-drop reordering
- [ ] Daily task archival / history
- [ ] Export to PDF/CSV
- [ ] Email notifications
- [ ] LDAP/AD integration
