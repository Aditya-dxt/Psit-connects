-- PSIT BusTrack Database Schema

CREATE TABLE IF NOT EXISTS routes (
    id SERIAL PRIMARY KEY,
    route_name VARCHAR(100) NOT NULL,
    route_number VARCHAR(50) NOT NULL UNIQUE,
    origin VARCHAR(150),
    destination VARCHAR(150),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS stops (
    id SERIAL PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    sequence INTEGER DEFAULT 0,
    route_id INTEGER REFERENCES routes(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS buses (
    id SERIAL PRIMARY KEY,
    bus_number VARCHAR(50) NOT NULL UNIQUE,
    registration_number VARCHAR(50),
    route_id INTEGER REFERENCES routes(id) ON DELETE SET NULL,
    qr_code VARCHAR(150) NOT NULL UNIQUE,
    status VARCHAR(20) DEFAULT 'offline'
        CHECK (status IN ('running', 'stopped', 'offline')),
    current_lat DOUBLE PRECISION,
    current_lng DOUBLE PRECISION,
    current_speed DOUBLE PRECISION DEFAULT 0,
    current_accuracy DOUBLE PRECISION,
    location_updated_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    mobile VARCHAR(20) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL
        CHECK (role IN ('driver', 'student')),
    bus_id INTEGER REFERENCES buses(id) ON DELETE SET NULL,
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS trips (
    id SERIAL PRIMARY KEY,
    bus_id INTEGER NOT NULL REFERENCES buses(id) ON DELETE CASCADE,
    driver_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    route_id INTEGER REFERENCES routes(id) ON DELETE SET NULL,
    status VARCHAR(20) DEFAULT 'active'
        CHECK (status IN ('active', 'completed')),
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ended_at TIMESTAMP
);

CREATE TABLE IF NOT EXISTS locations (
    id SERIAL PRIMARY KEY,
    trip_id INTEGER NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
    bus_id INTEGER NOT NULL REFERENCES buses(id) ON DELETE CASCADE,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    speed DOUBLE PRECISION DEFAULT 0,
    accuracy DOUBLE PRECISION,
    recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Useful indexes
CREATE INDEX IF NOT EXISTS idx_stops_route_id
    ON stops(route_id);

CREATE INDEX IF NOT EXISTS idx_buses_route_id
    ON buses(route_id);

CREATE INDEX IF NOT EXISTS idx_trips_driver_id
    ON trips(driver_id);

CREATE INDEX IF NOT EXISTS idx_trips_bus_id
    ON trips(bus_id);

CREATE INDEX IF NOT EXISTS idx_locations_trip_id
    ON locations(trip_id);

CREATE INDEX IF NOT EXISTS idx_locations_bus_id
    ON locations(bus_id);