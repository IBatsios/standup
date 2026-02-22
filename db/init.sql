-- StandUp Dashboard Schema

CREATE TABLE IF NOT EXISTS clients (
    id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS teams (
    id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    manager_id VARCHAR(64),
    lead_id VARCHAR(64),
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('owner', 'manager', 'team_lead', 'employee')),
    team_id VARCHAR(64) REFERENCES teams(id) ON DELETE SET NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_teams (
    user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
    team_id TEXT REFERENCES teams(id) ON DELETE CASCADE,
    team_role TEXT NOT NULL DEFAULT 'employee',
    PRIMARY KEY (user_id, team_id)
);

-- Add foreign keys to teams after users table exists
ALTER TABLE teams ADD CONSTRAINT fk_teams_manager FOREIGN KEY (manager_id) REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE teams ADD CONSTRAINT fk_teams_lead FOREIGN KEY (lead_id) REFERENCES users(id) ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS tasks (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    section VARCHAR(20) NOT NULL CHECK (section IN ('today', 'tomorrow', 'future')),
    text TEXT NOT NULL,
    client_id VARCHAR(64) REFERENCES clients(id) ON DELETE SET NULL,
    expected_time INTEGER DEFAULT 0,
    actual_time INTEGER,
    task_date DATE,
    completed_date DATE,
    url TEXT,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_tasks_user_section ON tasks(user_id, section);
CREATE INDEX idx_tasks_client ON tasks(client_id);
