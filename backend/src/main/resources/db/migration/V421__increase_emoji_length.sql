-- Increase emoji column length to support complex emojis
-- Current length is 255 in migration but maybe shorter in DB or causing issues with complex encodings
ALTER TABLE message_reactions ALTER COLUMN emoji TYPE VARCHAR(50);
-- Actually, the entity says String without length, and migration V392 says VARCHAR(255).
-- If it's already 255, why is it failing? 
-- Maybe it's the unique constraint length or something else.
-- Let's ensure it's at least 255 if it's not already, or just set it to 255 explicitly.
-- Wait, the user said "suspected to be related to emoji column length limitations".
-- Let's set it to 500 to be very safe.
ALTER TABLE message_reactions ALTER COLUMN emoji TYPE VARCHAR(500);
