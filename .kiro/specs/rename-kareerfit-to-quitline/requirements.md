# Requirements Document

## Introduction

Projek ini memerlukan penukaran nama dari "kareerfit" dan "webkareerfit" kepada "quitline" di seluruh codebase. Ini adalah operasi refactoring yang kritikal untuk memastikan konsistensi branding dan naming convention di seluruh aplikasi, termasuk package configuration, Docker containers, dan database naming.

## Glossary

- **Codebase**: Keseluruhan kod sumber aplikasi termasuk configuration files
- **Package Configuration**: File-file seperti package.json dan package-lock.json yang mendefinisikan project metadata
- **Docker Configuration**: File docker-compose.yml yang mendefinisikan container setup
- **Database Naming**: Nama database, user, dan container yang berkaitan dengan database
- **Quitline**: Nama baru untuk projek yang menggantikan kareerfit/webkareerfit

## Requirements

### Requirement 1

**User Story:** Sebagai developer, saya mahu nama projek ditukar dari "webkareerfit" kepada "quitline" di package configuration, supaya project metadata mencerminkan nama yang betul

#### Acceptance Criteria

1. WHEN package.json dibaca, THE Codebase SHALL menunjukkan nama projek sebagai "quitline"
2. WHEN package-lock.json dibaca, THE Codebase SHALL menunjukkan nama projek sebagai "quitline" di semua lokasi yang relevan
3. THE Codebase SHALL mengekalkan semua configuration lain tanpa perubahan
4. THE Codebase SHALL memastikan package-lock.json kekal valid dan sync dengan package.json

### Requirement 2

**User Story:** Sebagai DevOps engineer, saya mahu Docker container names ditukar dari "webkareerfit" kepada "quitline", supaya container naming konsisten dengan nama projek baru

#### Acceptance Criteria

1. WHEN docker-compose.yml dibaca, THE Codebase SHALL menunjukkan web container name sebagai "quitline"
2. WHEN docker-compose.yml dibaca, THE Codebase SHALL menunjukkan database container name sebagai "quitline-mariadb"
3. THE Codebase SHALL mengekalkan semua Docker configuration lain tanpa perubahan
4. THE Codebase SHALL memastikan container names mengikut Docker naming conventions

### Requirement 3

**User Story:** Sebagai database administrator, saya mahu database name dan user ditukar dari "kareerfit_webapp" kepada "quitline_webapp", supaya database naming konsisten dengan nama projek baru

#### Acceptance Criteria

1. WHEN docker-compose.yml dibaca, THE Codebase SHALL menunjukkan MYSQL_DATABASE sebagai "quitline_webapp"
2. WHEN docker-compose.yml dibaca, THE Codebase SHALL menunjukkan MYSQL_USER sebagai "quitline_webapp"
3. THE Codebase SHALL mengekalkan semua database credentials dan configuration lain tanpa perubahan
4. THE Codebase SHALL memastikan database naming mengikut MySQL naming conventions

### Requirement 4

**User Story:** Sebagai developer, saya mahu semua perubahan dilakukan dengan teliti dan sempurna, supaya tiada nama lama yang tertinggal di mana-mana bahagian codebase

#### Acceptance Criteria

1. WHEN codebase discan untuk "kareerfit", THE Codebase SHALL tidak menunjukkan sebarang hasil kecuali dalam documentation atau comments yang sengaja disimpan
2. WHEN codebase discan untuk "webkareerfit", THE Codebase SHALL tidak menunjukkan sebarang hasil kecuali dalam documentation atau comments yang sengaja disimpan
3. THE Codebase SHALL memastikan semua file configuration kekal valid selepas perubahan
4. THE Codebase SHALL memastikan tiada broken references atau dependencies selepas rename operation
