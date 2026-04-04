---
name: Oracles API Testing Infrastructure
description: Testing framework, conventions, and gotchas for the oracles-api Symfony backend
type: project
---

The oracles-api backend uses PHPUnit 12 via `php bin/phpunit` inside the `backend-php` Docker container. Config lives in `phpunit.xml`.

Integration tests extend `Symfony\Bundle\FrameworkBundle\Test\WebTestCase` and live in `tests/Integration/`. Naming convention: `*Test.php`.

**setUp pattern:**
- `static::createClient()` first (boots kernel), then `static::getContainer()->get(...)` for services
- `purgeDatabase()` called at start of setUp and end of tearDown
- A test user is created and a JWT token generated via `JWTTokenManagerInterface`

**purgeDatabase():** Deletes rows in dependency order with FK checks disabled. Tables to delete: `journal_entries`, `roll_results`, `books`, `attributes`, `game_sessions`, `users`. The `refresh_tokens` table does NOT exist in the test database — do not include it.

**HTTP helpers:** `postJson(url, body)` and `getJson(url)` send requests with `CONTENT_TYPE: application/json` and `HTTP_AUTHORIZATION: Bearer {token}`. Status code is read via `getLastStatusCode()`.

**Doctrine manipulation in tests:** To set up state without relying on dice randomness (e.g., setting `support=1` on an attribute), use `$this->em` to load the entity, mutate it, `flush()`, then `$this->em->clear()` before making HTTP requests so the kernel's EM cache is fresh.

**Why:** Allows deterministic testing of endpoints that depend on prior dice roll outcomes.
