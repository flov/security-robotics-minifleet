# Full-Stack Testaufgabe (3–5 Tage)

> **„Mini-Fleet Monitor für virtuelle Roboter“**

## Ziel

Erstelle eine kleine, funktionsfähige Web-Anwendung, die:

- eine Liste virtueller Roboter verwaltet,
- ihre Positionen auf einer Karte anzeigt (OpenLayers),
- Live-Positionsupdates vom Server empfängt,
- und Benutzer über Login/Token absichert.

## Technischer Rahmen (Muss-Kriterien)

### Backend

- Node.js + Express
- PostgreSQL als persistente Datenbank
- Redis als Cache + (optional) Pub/Sub für Live-Updates
- Auth mit JWT (Login + geschützte Routen)
- HTTPS oder HTTP mit CORS (keine self-signed Pflicht)
- REST + WebSocket für Server-Client-Kommunikation
- Docker Compose mit Postgres + Redis

### Frontend

- React (JS) mit HTML/CSS
- Anzeige einer OpenLayers-Karte
- Login-Maske und geschützte Dashboard-Seite
- Anzeige von Robotern als Marker, Live-Update der Positionen

## Minimale Anforderungen

### Datenmodell (einfach)

**users**

- `id`, `email`, `password_hash`, `created_at`

**robots**

- `id`, `name`, `status` (`idle` \| `moving`), `lat`, `lon`, `updated_at`

### Backend-Endpunkte

| Methode | Pfad | Beschreibung |
| --- | --- | --- |
| POST | `/auth/login` | Login mit Email/Passwort → JWT |
| GET | `/robots` | Liefert alle Roboter (auth-geschützt) |
| POST | `/robots/:id/move` | Simuliert neue Position (zufällig). Muss automatisch ausgeführt werden |

Roboter-Position muss über **WebSocket** an die UI übertragen werden.

**Optionale Erweiterung:**

- `POST /robots` zum Hinzufügen eines Roboters
- Redis-Cache für `GET /robots` Ergebnisse (TTL 10 s)

### Authentifizierung

- JWT-basierter Login
- Token im Frontend speichern (Memory oder LocalStorage)
- Geschützte API-Routen → Middleware prüft JWT
- Kein Refresh-Token nötig (Access Token reicht)

### Simulation (Server)

- Script oder Timer, der alle 2 Sekunden zufällige neue Positionen für Roboter generiert und:
  - sie in der DB aktualisiert,
  - per Redis oder direktem Broadcast an Clients sendet.

### Frontend-Funktionalität

#### Login-Seite

- Eingabefelder: Email, Passwort
- Erfolgreicher Login → speichert Token → leitet zum Dashboard weiter

#### Dashboard

- OpenLayers-Karte mit Robotern als Marker
- WebSocket- oder SSE-Verbindung empfängt Live-Positionsupdates → Markerpositionen werden aktualisiert
- Liste der Roboter neben der Karte (Name, Status, letzte Position)

## Setup & Abgabe

`docker-compose up` startet:

- **api** (Node.js)
- **db** (Postgres)
- **redis**
- optional **frontend**

Beispielnutzer: `admin@test.com` / `test123`

**README** mit:

- Setup-Schritte
- kurze Erklärung Architektur (1 Absatz)
- Beispiel-Screenshots (Login, Karte mit Robotern)

## Bonuspunkte (optional, falls Zeit)

- Redis Pub/Sub statt In-Memory-Broadcast
- Positionshistorie speichern (`robot_positions`)
- Steuer-Buttons im Frontend („Start/Stop Simulation“)
- Deployment-fähig mit Dockerfile + docker-compose
