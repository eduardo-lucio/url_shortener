# URL Shortener API

A high-performance URL shortening and link tracking service built with Fastify, TypeScript, PostgreSQL, and Zod. Features automated TTL expiration, custom slug reservation, concurrency-safe database constraints, and background cleanup routines.

---

## Overview

* **Engine:** Node.js with Fastify
* **Validation:** Strict payload and param parsing via Zod
* **Database:** PostgreSQL with unique indexes for concurrency control
* **Persistence:** Automated cleanup job running on startup and every 24 hours
* **API Spec:** Standard JSON REST interface

---

## Getting Started

### Environment Variables

Configure the following variables in your `.env` file:

| Variable | Type | Description | Default |
| :--- | :--- | :--- | :--- |
| `PORT` | number | Application listener port | `3000` |
| `DB_HOST` | string | PostgreSQL server address | `localhost` |
| `DB_PORT` | number | PostgreSQL server port | `5432` |
| `DB_NAME` | string | Target database name | `url_shortener` |
| `DB_USER` | string | Database user password | `postgres` |
| `DB_PASSWORD` | string | Database user password | `postgres` |

### Running with Docker

Start the PostgreSQL database service using Docker Compose:

```bash
docker compose up -d
```

Install dependencies and start the API:

```bash
npm install
npm run dev
```

---

## API Specification

All request bodies must be JSON, and API endpoints accept and emit `application/json` (except redirect endpoints).

```http
Accept: application/json
Content-Type: application/json
```

---

### POST /urls

Creates a shortened URL with a randomly generated 22-character unique slug.

#### Request Body

| Key | Type | Description | Constraints | Default |
| :--- | :--- | :--- | :--- | :--- |
| `url` | string | Original destination URL | Valid URL string | *Required* |
| `validTime` | number | Lifetime of the link in days | Positive integer, max `366` | *Required* |

```json
{
  "url": "[https://github.com/fastify/fastify](https://github.com/fastify/fastify)",
  "validTime": 30
}
```

#### Response

* **Status:** `201 Created`

```json
{
  "originalUrl": "[https://github.com/fastify/fastify](https://github.com/fastify/fastify)",
  "shortUrl": "mZ3nQ9XvP8kR2wL4",
  "expirationDate": "2026-10-06T23:48:10.000Z"
}
```

---

### POST /urls/custom

Creates a shortened URL with a user-defined custom slug.

> **Important:** Slugs cannot match system-reserved paths (`urls`, `admin`, `favicon.ico`) and must be unique. Duplicate keys return `409 Conflict`.

#### Request Body

| Key | Type | Description | Constraints | Default |
| :--- | :--- | :--- | :--- | :--- |
| `url` | string | Original destination URL | Valid URL string | *Required* |
| `customName` | string | Desired custom slug | `^[a-zA-Z0-9-]+$`, 3 to 12 chars | *Required* |
| `validTime` | number | Lifetime of the link in days | Positive integer, max `366` | *Required* |

```json
{
  "url": "[https://fastify.dev/docs/latest/](https://fastify.dev/docs/latest/)",
  "customName": "fastify-docs",
  "validTime": 60
}
```

#### Response

* **Status:** `201 Created`

```json
{
  "originalUrl": "[https://fastify.dev/docs/latest/](https://fastify.dev/docs/latest/)",
  "shortUrl": "fastify-docs",
  "expirationDate": "2026-11-05T23:48:10.000Z"
}
```

---

### GET /:url

Redirects the client to the original destination URL and increments the access count by `1`.

#### Route Parameters

| Key | Type | Description |
| :--- | :--- | :--- |
| `url` | string | Target slug to resolve |

#### Response

* **Status:** `302 Found`
* **Header:** `Location: <original_url>`

> Browsers requesting `/favicon.ico` are automatically intercepted and terminated with status `204 No Content` to prevent redundant queries and inaccurate click metrics.

---

### GET /urls/:url/stats

Retrieves access statistics and metadata for a specific short link without incrementing the click counter.

#### Route Parameters

| Key | Type | Description |
| :--- | :--- | :--- |
| `url` | string | Target slug to inspect |

#### Response

* **Status:** `200 OK`

```json
{
  "originalUrl": "[https://fastify.dev/docs/latest/](https://fastify.dev/docs/latest/)",
  "shortUrl": "fastify-docs",
  "creationDate": "2026-09-06T23:48:10.000Z",
  "expirationDate": "2026-11-05T23:48:10.000Z",
  "clickAmount": 42
}
```

---

## Errors and Status Codes

All errors return a uniform JSON schema detailing the failure:

```json
{
  "statusCode": 400,
  "error": "Bad Request",
  "message": "Validation failed.",
  "details": [
    {
      "field": "validTime",
      "message": "URL cannot remain active for more than 1 year"
    }
  ]
}
```

### HTTP Status Reference

| Status Code | Reason | Cause |
| :--- | :--- | :--- |
| `204 No Content` | No Content | Silent response for system routes like `/favicon.ico` |
| `302 Found` | Redirection | Successful lookup; client redirected to `Location` header |
| `400 Bad Request` | Validation Error | Payload failed Zod schema checks |
| `404 Not Found` | URL Not Found | Requested slug does not exist in storage |
| `409 Conflict` | Conflict | Requested custom slug is already allocated or reserved |
| `410 Gone` | Resource Expired | Link has reached its expiration date and is no longer accessible |
| `500 Internal Server Error` | Database/Server Error | Unhandled runtime failure |

---

## Background Retention Worker

The application manages stale data through a dual-lifecycle strategy:

1. **Logical Expiration:** Any short link where `NOW() > expiration_date` responds with `410 Gone` immediately, remaining unavailable for redirects.
2. **Physical Garbage Collection:** An asynchronous background worker executes on server startup and every 24 hours (`86,400,000 ms`), permanently removing records whose expiration timestamp exceeds a 90-day grace period:

```sql
DELETE FROM url_storage
WHERE expiration_date < NOW() - INTERVAL '90 days';
```
