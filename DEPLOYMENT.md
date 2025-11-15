# Deployment Guide - VM Production

## Prerequisites
- VM dengan Docker & Docker Compose installed
- Git installed di VM
- Port 80 available (atau tukar di docker-compose.yml)

## Step 1: Setup di Local Machine

### 1.1 Create .env.production file
```bash
cp .env.production.example .env.production
```

Edit `.env.production` dan update:
- `YOUR_VM_IP` → IP address VM kamu
- `YOUR_PASSWORD` → Password Supabase kamu
- `NEXTAUTH_SECRET` → Generate dengan: `openssl rand -base64 32`
- BayarCash credentials (PAT, API_SECRET, PORTAL_KEY)

### 1.2 Test Build Locally (Optional)
```bash
docker build -t webkareerfit:test .
```

### 1.3 Commit & Push
```bash
git add .
git commit -m "Add Docker deployment files"
git push origin main
```

## Step 2: Deploy ke VM

### 2.1 SSH ke VM
```bash
ssh user@YOUR_VM_IP
```

### 2.2 Clone Repository
```bash
git clone https://github.com/username/webkareerfit.git
cd webkareerfit
```

### 2.3 Copy .env.production
Upload file `.env.production` dari local ke VM:
```bash
# Di local machine
scp .env.production user@YOUR_VM_IP:~/webkareerfit/
```

### 2.4 Build & Run
```bash
# Build image
docker-compose build

# Start services
docker-compose up -d

# Check logs
docker-compose logs -f web
```

### 2.5 Run Prisma Migrations
```bash
docker-compose exec web npx prisma migrate deploy
```

## Step 3: Verify Deployment

Access app di browser:
```
http://YOUR_VM_IP
```

Check logs:
```bash
docker-compose logs -f web
```

## Useful Commands

### Stop services
```bash
docker-compose down
```

### Restart services
```bash
docker-compose restart web
```

### View logs
```bash
docker-compose logs -f web
```

### Rebuild after code changes
```bash
git pull
docker-compose build
docker-compose up -d
```

### Access container shell
```bash
docker-compose exec web sh
```

### Check uploads folder
```bash
ls -la uploads/
```

## Troubleshooting

### Port 80 already in use
Edit `docker-compose.yml`:
```yaml
ports:
  - "8080:3000"  # Change 80 to 8080
```

### Database connection issues
- Verify DATABASE_URL dalam .env.production
- Check Supabase IP whitelist (allow VM IP)
- Test connection: `docker-compose exec web npx prisma db pull`

### Upload files not persisting
- Check volume mount: `./uploads:/app/uploads`
- Verify permissions: `chmod 755 uploads/`

### Container keeps restarting
```bash
docker-compose logs web
```
Check for errors dalam logs.

## Security Notes

- **JANGAN commit** `.env.production` ke Git
- Update `NEXTAUTH_SECRET` untuk production
- Setup firewall di VM (allow port 80/443 only)
- Consider using HTTPS dengan reverse proxy (nginx/caddy)
- Backup `uploads/` folder regularly
