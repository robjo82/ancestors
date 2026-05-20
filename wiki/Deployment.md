# Advanced Deployment Guide 🐳

This guide outlines advanced, production-grade deployment configurations for **Ancestors**, focusing on Docker, reverse proxies, SSL certificates, and secure volume management.

---

## 🐳 Docker Stack (Standard)

The primary and recommended deployment method is **Docker Compose**. It ensures container isolation, simplified scaling, and automated database backups.

### 1. `docker-compose.yml`

Create a file named `docker-compose.yml` on your server:

```yaml
version: '3.8'

services:
  ancestors:
    image: registry.robin-joseph.fr/ancestors:latest
    container_name: ancestors_app
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - JWT_SECRET=your-production-secret-key-change-this
      - PORT=3000
      - FAMILYSEARCH_CLIENT_ID=your-client-id
      - FAMILYSEARCH_ENV=production
      - NEXT_PUBLIC_APP_URL=https://ancestors.your-domain.fr
    volumes:
      - ancestors_db:/app/prisma
      - ancestors_media:/app/public/uploads
    restart: unless-stopped

volumes:
  ancestors_db:
  ancestors_media:
```

### 2. Persistency and Data Safety
The SQLite database and uploaded photos are fully persisted inside Docker volumes:
*   `ancestors_db`: Persists the SQLite database `dev.db` located at `/app/prisma/dev.db`.
*   `ancestors_media`: Persists all uploaded profile avatars and scanned certificates located at `/app/public/uploads`.

---

## 🔒 Reverse Proxy Configurations

It is highly recommended **never** to expose the application port (3000) directly to the web. Instead, route your traffic through a secure reverse proxy like **Caddy** or **Nginx** to handle SSL termination.

### 1. Caddy Server (Recommended)
Caddy automatically provisions and renews SSL certificates from Let's Encrypt with zero configuration.

Add this block to your `Caddyfile`:

```caddy
ancestors.your-domain.fr {
    reverse_proxy localhost:3000
    
    # Secure headers
    header {
        Strict-Transport-Security "max-age=31536000; includeSubDomains; preload"
        X-XSS-Protection "1; mode=block"
        X-Content-Type-Options "nosniff"
        X-Frame-Options "DENY"
        Referrer-Policy "strict-origin-when-cross-origin"
    }
}
```

### 2. Nginx
If using Nginx, configure a virtual host file under `/etc/nginx/sites-available/ancestors`:

```nginx
server {
    listen 80;
    server_name ancestors.your-domain.fr;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name ancestors.your-domain.fr;

    # SSL Certificates (Managed by Certbot Let's Encrypt)
    ssl_certificate /etc/letsencrypt/live/ancestors.your-domain.fr/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/ancestors.your-domain.fr/privkey.pem;

    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

---

## ☁️ Database Backups

Because Ancestors utilizes a **SQLite** database, backups are extremely simple to perform. There is no need for complex SQL dumps: you can simply copy the database file.

### Backup Cron Script

Create a backup script `/opt/backup-ancestors.sh` on your host machine:

```bash
#!/bin/bash
BACKUP_DIR="/var/backups/ancestors"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
CONTAINER_DB_PATH="/var/lib/docker/volumes/ancestors_ancestors_db/_data/dev.db"

mkdir -p "$BACKUP_DIR"

# Copy SQLite file safely
cp "$CONTAINER_DB_PATH" "$BACKUP_DIR/ancestors_backup_$TIMESTAMP.sqlite"

# Delete backups older than 30 days
find "$BACKUP_DIR" -type f -name "*.sqlite" -mtime +30 -delete
```

Make the script executable: `chmod +x /opt/backup-ancestors.sh` and add it to your root `crontab` to run daily.
