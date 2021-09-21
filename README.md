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
|POST|/api/shorten|`{"url: "https://strongco.de/u/e4eb8d"}`|Creates a shortened 301 redirect link for the corresponding long url and returns the short url|
