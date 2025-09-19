# TruChain Database Setup

This guide explains how to set up and configure the PostgreSQL database for the TruChain API.

## Database Overview

TruChain uses PostgreSQL with TypeORM for data persistence. The database stores:

- User accounts
- API keys
- Request logs
- Wallet information

## Setting Up PostgreSQL

### Installation

#### Ubuntu/Debian

```bash
sudo apt update
sudo apt install postgresql postgresql-contrib
```

#### macOS (using Homebrew)

```bash
brew install postgresql
brew services start postgresql
```

#### Windows

Download and install PostgreSQL from the [official website](https://www.postgresql.org/download/windows/).

### Creating the Database

1. Access PostgreSQL:

```bash
sudo -u postgres psql
```

2. Create a database user:

```sql
CREATE USER truchain WITH PASSWORD 'your_password';
```

3. Create the database:

```sql
CREATE DATABASE truchain;
```

4. Grant privileges:

```sql
GRANT ALL PRIVILEGES ON DATABASE truchain TO truchain;
```

5. Exit PostgreSQL:

```sql
\q
```

## Configuration

1. Copy the environment example file:

```bash
cp env.example .env
```

2. Update the database configuration in `.env`:

```
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=truchain
DB_PASSWORD=your_password
DB_DATABASE=truchain
DB_LOGGING=false
```

## Database Migrations

TypeORM is configured to automatically synchronize the database schema in development mode. For production, you should use migrations.

### Creating a Migration

```bash
npx typeorm migration:create -n MigrationName
```

### Running Migrations

```bash
npx typeorm migration:run
```

## Entity Relationships

### User Entity

- One-to-many relationship with ApiKey
- One-to-many relationship with RequestLog

### ApiKey Entity

- Many-to-one relationship with User

### RequestLog Entity

- Many-to-one relationship with User (optional)

## Database Diagram

```
┌───────────────┐       ┌───────────────┐
│     User      │       │    ApiKey     │
├───────────────┤       ├───────────────┤
│ id            │       │ id            │
│ email         │       │ key           │
│ passwordHash  │       │ isActive      │
│ walletAddress │◄──────┤ userId        │
│ walletPrivKey │       │ description   │
│ createdAt     │       │ expiresAt     │
│ updatedAt     │       │ createdAt     │
│ lastLoginAt   │       │ updatedAt     │
└───────────────┘       │ lastUsedAt    │
        ▲               └───────────────┘
        │
        │
┌───────────────┐
│  RequestLog   │
├───────────────┤
│ id            │
│ endpoint      │
│ method        │
│ requestBody   │
│ responseBody  │
│ statusCode    │
│ errorMessage  │
│ ipAddress     │
│ userAgent     │
│ processingTime│
│ timestamp     │
│ userId        │
└───────────────┘
```

## Security Considerations

- **Encryption**: Wallet private keys should be encrypted in production environments
- **Access Control**: Limit database access to only the application
- **Backups**: Regularly backup the database
- **Monitoring**: Set up monitoring for database performance and security

## Troubleshooting

### Connection Issues

If you encounter connection issues:

1. Check if PostgreSQL is running:

```bash
sudo systemctl status postgresql
```

2. Verify your `.env` configuration
3. Ensure the database user has proper permissions
4. Check PostgreSQL logs:

```bash
sudo tail -f /var/log/postgresql/postgresql-*.log
```

### Schema Issues

If you encounter schema issues:

1. Set `DB_LOGGING=true` in your `.env` file to see SQL queries
2. Manually check the database schema:

```bash
psql -U truchain -d truchain -c "\d"
```

3. If needed, drop and recreate the database:

```sql
DROP DATABASE truchain;
CREATE DATABASE truchain;
GRANT ALL PRIVILEGES ON DATABASE truchain TO truchain;
```
