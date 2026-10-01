import {env} from 'cloudflare:workers';
import {identity,db,fail} from '@/lib/server';
import {connection} from '@/lib/spotify';
export async function GET(){try{const u=await identity();const c=await connection(u.userId);return Response.json({connected:!!c?.encrypted_tokens,configured:!!env.SPOTIFY_CLIENT_ID||!!c?.client_id});}catch(e){return fail(e);}}
export async function DELETE(request:Request){try{const u=await identity(request);await db().prepare('DELETE FROM spotify_connections WHERE owner_id = ?').bind(u.userId).run();return Response.json({ok:true});}catch(e){return fail(e);}}
