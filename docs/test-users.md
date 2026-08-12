# Test Users and Credentials

This document lists the test users and their credentials used for development and testing.

## Admin User

- **Email:** admin@example.com
- **Password:** correct-horse
- **Role:** admin

## Developer User

- **Email:** dev@example.com
- **Password:** correct-horse
- **Role:** developer

## How to Get JWT Tokens

### Admin Token
```bash
curl -X POST http://localhost:8000/auth/login -H 'Content-Type: application/json' -d '{"email":"admin@example.com","password":"correct-horse"}' | python3 -c 'import json,sys; print(json.load(sys.stdin)["access_token"])'
```

### Developer Token
```bash
curl -X POST http://localhost:8000/auth/login -H 'Content-Type: application/json' -d '{"email":"dev@example.com","password":"correct-horse"}' | python3 -c 'import json,sys; print(json.load(sys.stdin)["access_token"])'
```

## How to Register Users

### Register Admin
```bash
curl -X POST http://localhost:8000/auth/register -H 'Content-Type: application/json' -d '{"email":"admin@example.com","password":"correct-horse","role":"admin"}'
```

### Register Developer
```bash
curl -X POST http://localhost:8000/auth/register -H 'Content-Type: application/json' -d '{"email":"dev@example.com","password":"correct-horse","role":"developer"}'
```

---

**Note:** These credentials are for development and testing purposes only. The password `correct-horse` follows the xkcd password pattern and is used consistently across tests.
