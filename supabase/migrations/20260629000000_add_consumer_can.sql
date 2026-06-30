ALTER TABLE submissions ADD COLUMN IF NOT EXISTS sellout_price_consumer_can numeric;

INSERT INTO channels (code, label) VALUES ('specialize', 'Specialize') ON CONFLICT DO NOTHING;
