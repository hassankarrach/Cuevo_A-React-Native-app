import metadata from './songs.json';

// Metro resolves bundled images from literal require paths.
const covers = {
  'jamais-ndiro-pause.jpg': require('../../assets/covers/winners-2005/jamais-ndiro-pause.jpg'),
  'allo-bombero.jpg': require('../../assets/covers/winners-2005/allo-bombero.jpg'),
  'giorno-notte.jpg': require('../../assets/covers/winners-2005/giorno-notte.jpg'),
  'lasciatemi-tifare.jpg': require('../../assets/covers/winners-2005/lasciatemi-tifare.jpg'),
  'omri-nsito-maaha.jpg': require('../../assets/covers/winners-2005/omri-nsito-maaha.jpg'),
  'dualipa-levitating-1538003843.jpg': require('../../assets/covers/catalog/dualipa-levitating-1538003843.jpg'),
  'harrystyles-as-it-was-1615585008.jpg': require('../../assets/covers/catalog/harrystyles-as-it-was-1615585008.jpg'),
  'adele-hello-1544494392.jpg': require('../../assets/covers/catalog/adele-hello-1544494392.jpg'),
  'michaeljackson-billie-jean-269573364.jpg': require('../../assets/covers/catalog/michaeljackson-billie-jean-269573364.jpg'),
  'kendricklamar-humble-1440882165.jpg': require('../../assets/covers/catalog/kendricklamar-humble-1440882165.jpg'),
  'jcole-no-role-modelz-1600773036.jpg': require('../../assets/covers/catalog/jcole-no-role-modelz-1600773036.jpg'),
  'nas-n-y-state-of-mind-856131732.jpg': require('../../assets/covers/catalog/nas-n-y-state-of-mind-856131732.jpg'),
  'missyelliott-get-ur-freak-on-amended-lp-version-83134409.jpg': require('../../assets/covers/catalog/missyelliott-get-ur-freak-on-amended-lp-version-83134409.jpg'),
  'sza-snooze-1658650499.jpg': require('../../assets/covers/catalog/sza-snooze-1658650499.jpg'),
  'frankocean-pink-white-1146195714.jpg': require('../../assets/covers/catalog/frankocean-pink-white-1146195714.jpg'),
  'aliciakeys-if-i-ain-t-got-you-255343130.jpg': require('../../assets/covers/catalog/aliciakeys-if-i-ain-t-got-you-255343130.jpg'),
  'usher-u-got-it-bad-268532564.jpg': require('../../assets/covers/catalog/usher-u-got-it-bad-268532564.jpg'),
  'daftpunk-around-the-world-696886431.jpg': require('../../assets/covers/catalog/daftpunk-around-the-world-696886431.jpg'),
  'modjo-lady-hear-me-tonight-692624266.jpg': require('../../assets/covers/catalog/modjo-lady-hear-me-tonight-692624266.jpg'),
  'davidguetta-when-love-takes-over-feat-kelly-rowland-693246521.jpg': require('../../assets/covers/catalog/davidguetta-when-love-takes-over-feat-kelly-rowland-693246521.jpg'),
  'robins-show-me-love-301002607.jpg': require('../../assets/covers/catalog/robins-show-me-love-301002607.jpg'),
  'queen-somebody-to-love-6781024333.jpg': require('../../assets/covers/catalog/queen-somebody-to-love-6781024333.jpg'),
  'nirvana-come-as-you-are-1440783636.jpg': require('../../assets/covers/catalog/nirvana-come-as-you-are-1440783636.jpg'),
  'fleetwoodmac-dreams-594061856.jpg': require('../../assets/covers/catalog/fleetwoodmac-dreams-594061856.jpg'),
  'therollingstones-paint-it-black-1440745782.jpg': require('../../assets/covers/catalog/therollingstones-paint-it-black-1440745782.jpg'),
  'milesdavis-so-what-268443097.jpg': require('../../assets/covers/catalog/milesdavis-so-what-268443097.jpg'),
  'johncoltrane-naima-1440954907.jpg': require('../../assets/covers/catalog/johncoltrane-naima-1440954907.jpg'),
  'thedavebrubeckquartet-take-five-193085790.jpg': require('../../assets/covers/catalog/thedavebrubeckquartet-take-five-193085790.jpg'),
  'ellafitzgerald-misty-1469581620.jpg': require('../../assets/covers/catalog/ellafitzgerald-misty-1469581620.jpg'),
  'burnaboy-last-last-1623677811.jpg': require('../../assets/covers/catalog/burnaboy-last-last-1623677811.jpg'),
  'rema-calm-down-1614063459.jpg': require('../../assets/covers/catalog/rema-calm-down-1614063459.jpg'),
  'justinbieberwizkidtems-essence-6783430854.jpg': require('../../assets/covers/catalog/justinbieberwizkidtems-essence-6783430854.jpg'),
  'arcticmonkeys-do-i-wanna-know-663097965.jpg': require('../../assets/covers/catalog/arcticmonkeys-do-i-wanna-know-663097965.jpg'),
  'tameimpala-borderline-1497230972.jpg': require('../../assets/covers/catalog/tameimpala-borderline-1497230972.jpg'),
  'thexx-intro-1850810463.jpg': require('../../assets/covers/catalog/thexx-intro-1850810463.jpg'),
  'labess-ya-denya-1102337226.jpg': require('../../assets/covers/labess/labess-ya-denya-1102337226.jpg'),
  'labess-les-septs-couleurs-1132087986.jpg': require('../../assets/covers/labess/labess-les-septs-couleurs-1132087986.jpg'),
  'labess-el-kess-yaddour-1132085922.jpg': require('../../assets/covers/labess/labess-el-kess-yaddour-1132085922.jpg'),
  'labess-rosa-que-linda-eres-1751970743.jpg': require('../../assets/covers/labess/labess-rosa-que-linda-eres-1751970743.jpg'),
  'labess-yemma-1583957157.jpg': require('../../assets/covers/labess/labess-yemma-1583957157.jpg'),
};

export const songs = metadata.map(song => ({
  ...song,
  cover: covers[song.coverFile as keyof typeof covers],
}));
export type Song = typeof songs[number];
export const getSong = (id: string) => songs.find(song => song.id === id);
