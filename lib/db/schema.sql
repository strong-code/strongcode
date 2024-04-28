-- Master schema defintion for 'strongcode' tables

CREATE TABLE IF NOT EXISTS urls (
  id SERIAL UNIQUE PRIMARY KEY,
  key VARCHAR(6) UNIQUE NOT NULL,
  long_url TEXT UNIQUE NOT NULL,
  created_at TIMESTAMP NOT NULL
);

CREATE TABLE IF NOT EXISTS shipments (
  tracking_number VARCHAR UNIQUE PRIMARY KEY,
  carrier VARCHAR NOT NULL,
  origin TEXT NOT NULL,
  eta TIMESTAMP,
  item TEXT,
  delivered BOOLEAN DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS shipment_status (
  id SERIAL UNIQUE PRIMARY KEY,
  tracking_number VARCHAR REFERENCES shipments(tracking_number),
  status TEXT NOT NULL,
  location TEXT NOT NULL,
  updated_at TIMESTAMP NOT NULL
);
