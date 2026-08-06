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
|POST|/api/track/new|`201` `{"msg":"...", "shipment":{tracking_number, carrier, item, eta, status, location, updated_at}}` / `409` `{"error":"..."}`|Creates a shipment tracking entry with Shippo API. Body: `tracking_number`, `carrier` (required), `item` (optional description). Accepts JSON or form-encoded|
|POST|/api/track|`200`|Webhook endpoint to collect and collate Shippo tracking status updates
|GET|/api/track/active|`[{item, status, location, updated_at, tracking_number, carrier, eta}]`|Latest status for every shipment that is not delivered or archived|
|GET|/api/track/:tracking_number|`{"data":"tracking status updates..."}`|Retrieve latest (or all with `?all=true`) tracking status for a specified tracking number
|PATCH|/api/track/:tracking_number|`200` / `404`|Update a shipment. Body: `item` and/or `archived` (set `archived: true` to hide it from the active list without deleting)
|DELETE|/api/track/:tracking_number|`200` `{"deleted":true,...}` / `404`|Deletes a shipment and its status history
