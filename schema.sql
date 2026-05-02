-- Database Schema for NetPlus Manager

-- Sites Table
CREATE TABLE IF NOT EXISTS sites (
    id SERIAL PRIMARY KEY,
    site_id VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    province VARCHAR(100),
    zone VARCHAR(100),
    district VARCHAR(100),
    local_level VARCHAR(100),
    status VARCHAR(50) DEFAULT 'Active',
    lat DECIMAL(10, 8),
    lng DECIMAL(11, 8),
    technologies JSONB,
    tower JSONB,
    power JSONB,
    transmission JSONB,
    hub_site BOOLEAN DEFAULT FALSE,
    parent_site VARCHAR(50),
    shelter_type VARCHAR(100),
    owner_info JSONB,
    lease_contract JSONB,
    engineer_info JSONB,
    environment JSONB,
    alarms TEXT[],
    last_audit TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_by VARCHAR(255)
);

-- User Profiles Table
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    uid VARCHAR(255) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255),
    role VARCHAR(50) DEFAULT 'viewer',
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Complaints Table
CREATE TABLE IF NOT EXISTS complaints (
    id SERIAL PRIMARY KEY,
    ticket_number VARCHAR(50) UNIQUE NOT NULL,
    complaint_name VARCHAR(255) NOT NULL,
    complainer_name VARCHAR(255),
    complainer_contact VARCHAR(50),
    province VARCHAR(100),
    zone VARCHAR(100),
    district VARCHAR(100),
    local_level VARCHAR(100),
    lat DECIMAL(10, 8),
    lng DECIMAL(11, 8),
    site_id VARCHAR(50),
    status VARCHAR(50) DEFAULT 'Open',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_sites_site_id ON sites(site_id);
CREATE INDEX IF NOT EXISTS idx_complaints_ticket ON complaints(ticket_number);
CREATE INDEX IF NOT EXISTS idx_users_uid ON users(uid);
