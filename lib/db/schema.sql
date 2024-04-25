-- Master schema defintion for 'strongcode' tables

CREATE TABLE IF NOT EXISTS urls (
  id SERIAL UNIQUE PRIMARY KEY,
  key VARCHAR(6) UNIQUE NOT NULL,
  long_url TEXT UNIQUE NOT NULL,
  created_at TIMESTAMP NOT NULL
);

CREATE TABLE IF NOT EXISTS shipments (
  id SERIAL UNIQUE PRIMARY KEY,
  tracking_number VARCHAR NOT NULL,
  carrier VARCHAR NOT NULL,
  eta TIMESTAMP,
  updated_at TIMESTAMP NOT NULL,
  status TEXT NOT NULL
);
