# Strongcode

The backend powering strongco.de

## Healthcheck
Basic health data for the backend

|Method|Route|Response|Description|
|---|---|---|---|
|GET|/api/health|`{"folderSize":"100M", "totalPastes":"225"}`|Returns paste folder size and total number of pastes uploaded|

## Pastebin
A simple pastebin/rehoster for text, images or videos

|Method|Route|Response|Description|
|---|---|---|---|
|GET|/d/:key||Returns the hosted file under the corresopnding key|
|GET|/api/pastes|`{"pastes": ["5ee63.txt","..."]}`|Returns an array of the last 10 paste keys|
|POST|/api/paste|`{"path":"http://strongco.de/d/e83se9.txt"}`|Takes form-data with a `file` or `text` key. The following file types can be rehosted: `.png` `.jpg` `.gif` `.webm`|
|DELETE|/api/paste/:key|`{"deleted":true, "key":"..."}`|Deletes a paste under the specified key|

## URL Shortener
A url shortening service

|Method|Route|Response|Description|
|---|---|---|---|
|GET|/u/:key|301 redirect|Redirects a user to the corresponding long url of the provided key|
|POST|/api/shorten|`{"url": "https://strongco.de/u/e4eb8d"}`|Creates a shortened 301 redirect link for the corresponding long url and returns the short url|

## Package Tracking
Track and get status updates for packages

|Method|Route|Response|Description|
|---|---|---|---|
|POST|/api/track/new|`201` `{"msg":"...", "shipment":{tracking_number, carrier, item, eta, status, location, updated_at, tracking_mode}}` / `409` `{"error":"..."}`|Creates a shipment tracking entry with Shippo API. Body: `tracking_number`, `carrier` (required), `item` (optional description). Accepts JSON or form-encoded. `tracking_mode` is assigned by the server (`live` or `link_only`) and is returned on success|
|POST|/api/track|`200`|Webhook endpoint to collect and collate Shippo tracking status updates|
|GET|/api/track/active|`[{item, status, location, updated_at, tracking_number, carrier, eta, tracking_mode}]`|Latest status for every shipment that is not delivered or archived|
|GET|/api/track/:tracking_number|`{"data":"tracking status updates..."}`|Retrieve latest (or all with `?all=true`) tracking status for a specified tracking number|
|PATCH|/api/track/:tracking_number|`200` / `404`|Update a shipment. Body: `item` and/or `archived` (set `archived: true` to hide it from the active list without deleting)|
|DELETE|/api/track/:tracking_number|`200` `{"deleted":true,...}` / `404`|Deletes a shipment and its status history|

### OnTrac link-only fallback

Some OnTrac tracking numbers cannot be registered with Shippo. `POST /api/track/new` still uses the original single request: one Shippo call, then one database write. If Shippo returns an explicit OnTrac carrier/tracking limitation (a 400/404/422 response whose body says the carrier is unsupported or tracking is unavailable), the server automatically persists the shipment with `tracking_mode: "link_only"` and returns normal `201` success.

Link-only records:

- have no `shipment_status` rows, no synthetic status and no webhook registration;
- have `status: null` and `updated_at: null` until the client links out to OnTrac;
- never overwrite an existing live record's `tracking_mode` or history on a repeat add;
- are returned with `tracking_mode` on create and from `GET /api/track/active`.

Shippo outages, authentication failures, rate limits, network errors, database errors and unrecognized responses do **not** trigger the fallback. They return a sanitized `502` or `500` without writing a shipment.

### Schema rollout

`tracking_mode` is additive and defaults to `live`, so existing rows keep their current behaviour. `ensureSchema()` runs the idempotent `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` and check-constraint statements before the HTTP listener starts; a migration failure stops startup instead of serving a half-migrated schema. No manual migration step is required. Rolling back to older code is safe because it ignores the extra column.
