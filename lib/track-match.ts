import type {Track} from './music';
export function normalized(s:string){return s.normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/\b(remaster(ed)?|\d{4})\b/g,'').replace(/[^a-z0-9]/g,'');}
export type SpotifyTrack={name:string;uri:string;artists:{name:string}[];album:{name:string};is_playable?:boolean};
export function matchTrack(t:Track,items:SpotifyTrack[]){const exact=items.filter(x=>x.is_playable!==false&&normalized(x.name)===normalized(t.title)&&x.artists.some(a=>normalized(a.name)===normalized(t.artist)));return exact.find(x=>normalized(x.album.name)===normalized(t.album))||exact[0];}
