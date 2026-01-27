-- Deactivate Amazon Gift Cards entries (Amazon does not pay commissions on gift cards)
UPDATE brands SET is_active = false, updated_at = now() WHERE name ILIKE '%amazon%gift%';