# Shared song catalog

## Backend source and contract

On 2026-11-27, the project owner approved metadata-only reuse of
[`../data/songs.json`](../data/songs.json), a 40-record static dataset from the
Apple iTunes Search API. Its provenance fields identify the provider, provider
track ID, Apple Music reference URL, and retrieval date (2026-11-18). The
approved policy is static seed data with no automatic refresh. The backend
does not call Apple or scrape provider pages.

The importer normalizes title, artist, optional album, exact `durationMs`,
curated `genres`, optional ISO `releaseDate`, and source provenance. It ignores
the source artifact's slug `id`, display-duration string, `coverFile`, and
`artworkUrl`; no artwork bytes or URLs are copied or served. Internal song IDs
are deterministic opaque UUIDv5 values derived from a fixed namespace and the
normalized provider name plus provider track ID. The provider pair remains a
separate mapping, unique case-insensitively by provider name and exactly by
track ID. A provider ID is never accepted in place of an internal ID. There is
no cross-provider track deduplication policy.

The API returns these fields:

| Field | Contract |
| --- | --- |
| `id` | Stable opaque internal UUID string; never the provider track ID or source slug |
| `title`, `artist` | Required normalized metadata strings |
| `album` | Optional normalized album title |
| `durationMs` | Exact source duration as a positive integer number of milliseconds |
| `genres` | Curated genre labels normalized and deduplicated case-insensitively |
| `releaseDate` | Optional ISO `YYYY-MM-DD` date |
| `sources` | Provider name, provider track ID, source reference URL, retrieval date; retired mappings are omitted |

Artwork URLs, cover filenames, provider-classification `genre`, and the legacy
display-duration string are not part of the backend response.

The migration creates an empty catalog. `python -m app.catalog.importer`
imports all 40 rows into a guarded local `cuevo_dev` database, additively and
without updating existing records. `python -m app.dev_seed` adds a smaller
deterministic fixture for later F07 demo playlists. Neither is a production
default; the importer rejects non-development or non-loopback targets.

The F07 fixture contains these stable internal IDs:

| Artist | Track | Provider track ID | Internal song ID |
| --- | --- | --- | --- |
| Dua Lipa | Levitating | `1538003843` | `e9466fa3-3e0a-5f93-8d4a-1ff70a27904d` |
| Daft Punk | Around the World | `696886431` | `178d6686-3f93-5b74-8bab-a02641ce11e1` |
| Labess | Ya Denya | `1102337226` | `ffcc2828-adba-5db4-803e-42b3b75a8e47` |

Use `GET /api/v1/songs` for bounded text/genre search and cursor pagination,
and `GET /api/v1/songs/{songId}` for song detail. Search order is normalized
title, normalized artist, then internal ID. Results expose provider mappings
under `sources`, not as song IDs, and do not include a total count or private
user data. See the [shared API contract](./api-contract.md) for wire details.
Metadata, provider references, and artwork metadata are not audio. D-08
playback/provider decisions remain unresolved; this catalog does not authorize
or implement playback. The IDs are available as stable future playlist and
queue references; those product APIs are outside this catalog slice.

Example response for `GET /api/v1/songs?q=Levitating&genre=Pop`:

```json
{
  "items": [
    {
      "id": "e9466fa3-3e0a-5f93-8d4a-1ff70a27904d",
      "title": "Levitating",
      "artist": "Dua Lipa",
      "album": "Future Nostalgia",
      "durationMs": 203808,
      "genres": ["Pop"],
      "releaseDate": "2020-03-27",
      "sources": [
        {
          "providerName": "Apple iTunes Search API",
          "providerTrackId": "1538003843",
          "referenceUrl": "https://music.apple.com/us/album/levitating/1538003494?i=1538003843&uo=4",
          "retrievedOn": "2026-11-18"
        }
      ]
    }
  ],
  "nextCursor": null
}
```

## Frontend source summary

40 songs: 5 Winners 2005, 5 Labess, and 30 selections across the app's eight preference genres. Metadata and existing release artwork were retrieved from Apple's public iTunes Search API on 2026-11-18. Each entry preserves its source URL, provider track ID, source genre and retrieval date in `songs.json`.

- `genre` is the provider classification; `genres` contains our curated app categories for filtering. Labess uses World; existing Winners entries retain provider categories.
- `songs.ts` exposes the catalog and bundled image sources. Every song has a distinct JPEG cover, requested at 600px; original artwork aspect ratios are preserved (one cover is 600 by 593).
- Release dates and durations refer to the selected catalog versions, including remasters or collaborations. Display durations round to the nearest second.
- Metadata and artwork only. No audio or previews were downloaded. Existing room mock tracks have not been replaced.

## Added tracks

| App genre | Artist | Track | Duration | Source |
| --- | --- | --- | --- | --- |
| Pop | Dua Lipa | Levitating | 3:24 | [Apple Music](https://music.apple.com/us/album/levitating/1538003494?i=1538003843&uo=4) |
| Pop | Harry Styles | As It Was | 2:47 | [Apple Music](https://music.apple.com/us/album/as-it-was/1615584999?i=1615585008&uo=4) |
| Pop | Adele | Hello | 4:56 | [Apple Music](https://music.apple.com/us/album/hello/1544494115?i=1544494392&uo=4) |
| Pop | Michael Jackson | Billie Jean | 4:54 | [Apple Music](https://music.apple.com/us/album/billie-jean/269572838?i=269573364&uo=4) |
| Hip-hop | Kendrick Lamar | HUMBLE. | 2:57 | [Apple Music](https://music.apple.com/us/album/humble/1440881722?i=1440882165&uo=4) |
| Hip-hop | J. Cole | No Role Modelz | 4:53 | [Apple Music](https://music.apple.com/us/album/no-role-modelz/1600772499?i=1600773036&uo=4) |
| Hip-hop | Nas | N.Y. State of Mind | 4:54 | [Apple Music](https://music.apple.com/us/album/n-y-state-of-mind/856131729?i=856131732&uo=4) |
| Hip-hop | Missy Elliott | Get Ur Freak On (Amended LP Version) | 3:57 | [Apple Music](https://music.apple.com/us/album/get-ur-freak-on-amended-lp-version/83134491?i=83134409&uo=4) |
| R&B | SZA | Snooze | 3:22 | [Apple Music](https://music.apple.com/us/album/snooze/1658650093?i=1658650499&uo=4) |
| R&B | Frank Ocean | Pink + White | 3:05 | [Apple Music](https://music.apple.com/us/album/pink-white/1146195596?i=1146195714&uo=4) |
| R&B | Alicia Keys | If I Ain't Got You | 3:49 | [Apple Music](https://music.apple.com/us/album/if-i-aint-got-you/255342344?i=255343130&uo=4) |
| R&B | USHER | U Got It Bad | 4:08 | [Apple Music](https://music.apple.com/us/album/u-got-it-bad/268532446?i=268532564&uo=4) |
| House | Daft Punk | Around the World | 7:10 | [Apple Music](https://music.apple.com/us/album/around-the-world/696884422?i=696886431&uo=4) |
| House | Modjo | Lady (Hear Me Tonight) | 5:07 | [Apple Music](https://music.apple.com/us/album/lady-hear-me-tonight/692624255?i=692624266&uo=4) |
| House | David Guetta | When Love Takes Over (feat. Kelly Rowland) | 3:11 | [Apple Music](https://music.apple.com/us/album/when-love-takes-over-feat-kelly-rowland/693244948?i=693246521&uo=4) |
| House | Robin S. | Show Me Love | 4:29 | [Apple Music](https://music.apple.com/us/album/show-me-love/301002604?i=301002607&uo=4) |
| Rock | Queen | Somebody To Love | 4:59 | [Apple Music](https://music.apple.com/us/album/somebody-to-love/6781024048?i=6781024333&uo=4) |
| Rock | Nirvana | Come As You Are | 3:39 | [Apple Music](https://music.apple.com/us/album/come-as-you-are/1440783617?i=1440783636&uo=4) |
| Rock | Fleetwood Mac | Dreams | 4:18 | [Apple Music](https://music.apple.com/us/album/dreams/594061854?i=594061856&uo=4) |
| Rock | The Rolling Stones | Paint It, Black | 3:22 | [Apple Music](https://music.apple.com/us/album/paint-it-black/1440745549?i=1440745782&uo=4) |
| Jazz | Miles Davis | So What | 9:08 | [Apple Music](https://music.apple.com/us/album/so-what/268443092?i=268443097&uo=4) |
| Jazz | John Coltrane | Naima | 8:06 | [Apple Music](https://music.apple.com/us/album/naima/1440954901?i=1440954907&uo=4) |
| Jazz | The Dave Brubeck Quartet | Take Five | 5:29 | [Apple Music](https://music.apple.com/us/album/take-five/193085545?i=193085790&uo=4) |
| Jazz | Ella Fitzgerald | Misty | 2:55 | [Apple Music](https://music.apple.com/us/album/misty/1469581412?i=1469581620&uo=4) |
| Afrobeats | Burna Boy | Last Last | 2:52 | [Apple Music](https://music.apple.com/us/album/last-last/1623677591?i=1623677811&uo=4) |
| Afrobeats | Rema | Calm Down | 3:40 | [Apple Music](https://music.apple.com/us/album/calm-down/1614063395?i=1614063459&uo=4) |
| Afrobeats | Justin Bieber, Wizkid & Tems | ESSENCE | 4:12 | [Apple Music](https://music.apple.com/us/album/essence/6783430401?i=6783430854&uo=4) |
| Indie | Arctic Monkeys | Do I Wanna Know? | 4:32 | [Apple Music](https://music.apple.com/us/album/do-i-wanna-know/663097964?i=663097965&uo=4) |
| Indie | Tame Impala | Borderline | 3:58 | [Apple Music](https://music.apple.com/us/album/borderline/1497230760?i=1497230972&uo=4) |
| Indie | The xx | Intro | 2:08 | [Apple Music](https://music.apple.com/us/album/intro/1850810462?i=1850810463&uo=4) |
| World | Labess | Ya Denya | 5:54 | [Apple Music](https://music.apple.com/us/album/ya-denya/1102336852?i=1102337226&uo=4) |
| World | Labess | Les septs couleurs | 5:52 | [Apple Music](https://music.apple.com/us/album/les-septs-couleurs/1132085184?i=1132087986&uo=4) |
| World | Labess | El Kess Yaddour | 3:37 | [Apple Music](https://music.apple.com/us/album/el-kess-yaddour/1132084934?i=1132085922&uo=4) |
| World | Labess | Rosa Que Linda Eres | 4:48 | [Apple Music](https://music.apple.com/us/album/rosa-que-linda-eres/1751970412?i=1751970743&uo=4) |
| World | Labess | Yemma | 5:04 | [Apple Music](https://music.apple.com/us/album/yemma/1583956698?i=1583957157&uo=4) |
