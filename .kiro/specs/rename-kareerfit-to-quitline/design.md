# Design Document: Rename KareerFit to Quitline

## Overview

Dokumen ini menerangkan design untuk operasi rename yang komprehensif dari "kareerfit"/"webkareerfit" kepada "quitline" di seluruh codebase. Operasi ini melibatkan perubahan pada package configuration, Docker setup, dan database naming conventions. Design ini memastikan semua perubahan dilakukan dengan teliti tanpa merosakkan functionality yang sedia ada.

## Architecture

### Affected Components

1. **Package Configuration Layer**
   - `package.json` - Project metadata dan npm configuration
   - `package-lock.json` - Dependency lock file yang auto-generated

2. **Infrastructure Layer**
   - `docker-compose.yml` - Container orchestration configuration
   - Docker container names
   - Database configuration

3. **Database Layer**
   - MySQL database name
   - MySQL user name

### Naming Convention Strategy

Strategi penukaran nama akan mengikut pattern berikut:

| Old Name | New Name | Context |
|----------|----------|---------|
| `webkareerfit` | `quitline` | Package name, web container |
| `webkareerfit-mariadb` | `quitline-mariadb` | Database container |
| `kareerfit_webapp` | `quitline_webapp` | Database name & user |

## Components and Interfaces

### 1. Package Configuration Component

**File: package.json**

```json
{
  "name": "quitline",  // Changed from "webkareerfit"
  "version": "0.1.0",
  "private": true,
  // ... rest remains unchanged
}
```

**Impact Analysis:**
- Perubahan ini hanya affect project name di npm registry (jika di-publish)
- Tidak affect dependencies atau scripts
- Tidak require npm install semula (optional, tapi recommended untuk regenerate package-lock.json)

**File: package-lock.json**

```json
{
  "name": "quitline",  // Changed from "webkareerfit"
  "version": "0.1.0",
  "lockfileVersion": 3,
  "packages": {
    "": {
      "name": "quitline",  // Changed from "webkareerfit"
      // ... rest remains unchanged
    }
  }
}
```

**Impact Analysis:**
- File ini auto-generated oleh npm
- Perubahan manual perlu dilakukan di 2 lokasi
- Alternatif: Delete dan regenerate dengan `npm install`

### 2. Docker Configuration Component

**File: docker-compose.yml**

```yaml
version: '3.8'

services:
  web:
    build: .
    container_name: quitline  # Changed from "webkareerfit"
    restart: always
    ports:
      - "80:3000"
    env_file:
      - .env.production
    volumes:
      - ./uploads:/app/uploads
    environment:
      - NODE_ENV=production
    depends_on:
      - mariadb

  mariadb:
    image: mariadb:10.6
    container_name: quitline-mariadb  # Changed from "webkareerfit-mariadb"
    restart: always
    environment:
      MYSQL_ROOT_PASSWORD: root_password
      MYSQL_DATABASE: quitline_webapp  # Changed from "kareerfit_webapp"
      MYSQL_USER: quitline_webapp  # Changed from "kareerfit_webapp"
      MYSQL_PASSWORD: ZaqXsw123ZaqXsw123
    ports:
      - "3306:3306"
    volumes:
      - mariadb_data:/var/lib/mysql
    command: --character-set-server=utf8mb4 --collation-server=utf8mb4_unicode_ci

volumes:
  mariadb_data:
```

**Impact Analysis:**
- Container names akan berubah - existing containers perlu di-recreate
- Database name dan user berubah - perlu migration strategy
- Volume name kekal sama (`mariadb_data`) untuk preserve data

### 3. Database Migration Strategy

**Critical Consideration:**

Perubahan database name dan user memerlukan perhatian khusus:

**Option A: Fresh Start (Recommended untuk development)**
- Stop containers
- Remove old containers
- Remove volumes (jika data tidak penting)
- Start dengan configuration baru

**Option B: Data Preservation (Untuk production)**
- Backup existing database
- Create new database dengan nama baru
- Migrate data
- Update connection strings
- Remove old database

**Untuk scope ini, kita assume development environment dan akan document kedua-dua approach.**

## Data Models

Tidak ada perubahan pada data models. Ini adalah pure naming/configuration change.

## Error Handling

### Potential Issues dan Solutions

1. **Issue: Existing Docker containers masih running**
   - **Detection:** `docker ps` shows old container names
   - **Solution:** `docker-compose down` sebelum apply changes
   - **Prevention:** Document proper shutdown procedure

2. **Issue: Database connection strings di .env files**
   - **Detection:** Application fails to connect to database
   - **Solution:** Update DATABASE_URL di semua .env files
   - **Prevention:** Scan untuk connection strings sebelum deploy

3. **Issue: package-lock.json out of sync**
   - **Detection:** npm warnings tentang lockfile
   - **Solution:** Run `npm install` untuk regenerate
   - **Prevention:** Regenerate lockfile sebagai part of process

4. **Issue: Cached Docker images dengan old names**
   - **Detection:** Docker build menggunakan old references
   - **Solution:** `docker-compose build --no-cache`
   - **Prevention:** Clear cache sebagai part of process

## Testing Strategy

### Pre-Change Verification

1. **Scan Verification**
   ```bash
   # Verify all occurrences found
   grep -r "kareerfit" . --exclude-dir=node_modules --exclude-dir=.git
   grep -r "webkareerfit" . --exclude-dir=node_modules --exclude-dir=.git
   ```

2. **Backup Critical Files**
   - package.json
   - package-lock.json
   - docker-compose.yml
   - .env files (if they contain database URLs)

### Post-Change Verification

1. **File Content Verification**
   ```bash
   # Verify no old names remain
   grep -r "kareerfit" . --exclude-dir=node_modules --exclude-dir=.git
   grep -r "webkareerfit" . --exclude-dir=node_modules --exclude-dir=.git
   ```
   Expected: No results (atau hanya dalam comments/documentation)

2. **Package Configuration Validation**
   ```bash
   # Verify package.json is valid
   npm run lint
   
   # Verify lockfile is in sync
   npm install --dry-run
   ```

3. **Docker Configuration Validation**
   ```bash
   # Verify docker-compose.yml syntax
   docker-compose config
   
   # Verify containers can be created
   docker-compose up -d
   docker ps
   ```

4. **Database Connection Validation**
   ```bash
   # Verify database is accessible
   docker exec quitline-mariadb mysql -u quitline_webapp -p -e "SHOW DATABASES;"
   ```

5. **Application Smoke Test**
   - Start application
   - Verify homepage loads
   - Verify database connection works
   - Check logs for errors

### Rollback Strategy

Jika ada issues:

1. **Immediate Rollback**
   ```bash
   # Restore from backup
   cp package.json.backup package.json
   cp package-lock.json.backup package-lock.json
   cp docker-compose.yml.backup docker-compose.yml
   
   # Restart services
   docker-compose down
   docker-compose up -d
   ```

2. **Partial Rollback**
   - Identify which component failed
   - Rollback only that component
   - Re-test

## Implementation Phases

### Phase 1: Preparation
- Backup critical files
- Document current state
- Scan for all occurrences

### Phase 2: Package Configuration Update
- Update package.json
- Update package-lock.json
- Validate changes

### Phase 3: Docker Configuration Update
- Update docker-compose.yml
- Stop existing containers
- Validate configuration

### Phase 4: Database Migration
- Backup existing data (if needed)
- Recreate containers with new names
- Verify database accessibility

### Phase 5: Verification
- Run all verification tests
- Check for remaining old names
- Validate application functionality

### Phase 6: Cleanup
- Remove old containers
- Remove old images (optional)
- Update documentation

## Additional Considerations

### Files That May Need Updates (To Be Verified)

1. **Environment Files**
   - `.env`
   - `.env.local`
   - `.env.production`
   - Check for DATABASE_URL or connection strings

2. **Documentation Files**
   - README.md
   - CONTRIBUTING.md
   - Any setup guides

3. **CI/CD Configuration**
   - GitHub Actions workflows
   - GitLab CI
   - Jenkins files

4. **Prisma Configuration**
   - `prisma/schema.prisma` - Check datasource db url
   - May reference database name

### Post-Implementation Tasks

1. Update team documentation
2. Notify team members about container name changes
3. Update any external references (if applicable)
4. Update monitoring/logging configurations (if applicable)

## Success Criteria

Rename operation dianggap berjaya jika:

1. ✅ Tiada occurrence "kareerfit" atau "webkareerfit" dalam configuration files
2. ✅ Package.json dan package-lock.json valid dan in sync
3. ✅ Docker containers start successfully dengan nama baru
4. ✅ Database accessible dengan credentials baru
5. ✅ Application berfungsi dengan normal
6. ✅ Tiada errors dalam logs
7. ✅ Semua tests pass (jika ada)
