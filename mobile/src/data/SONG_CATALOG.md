# Shared song catalog

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
