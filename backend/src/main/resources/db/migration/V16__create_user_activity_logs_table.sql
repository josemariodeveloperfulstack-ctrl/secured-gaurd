CREATE TABLE user_activity_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username VARCHAR(255),
    action VARCHAR(255),
    details TEXT,
    timestamp TIMESTAMP
); 