import {env} from 'cloudflare:workers';
import {getChatGPTUser} from '@/app/chatgpt-auth';
export function db(){if(!env.DB)throw new Error('Your collection is temporarily unavailable. Please try again.');return env.DB;}
export async function identity(request?:Request){if(request&&!['GET','HEAD'].includes(request.method)){const origin=request.headers.get('origin');if(origin&&origin!==new URL(request.url).origin)throw new ApiError('This request did not come from your listening room.',403);}const user=await getChatGPTUser();if(!user)throw new ApiError('Sign in to save your listening room.',401);return user;}
export class ApiError extends Error{constructor(message:string,public status=400){super(message);}}
export function fail(e:unknown){if(e instanceof ApiError)return Response.json({error:e.message},{status:e.status});console.error('Second Spin request failed',e instanceof Error?e.message:'unknown');return Response.json({error:'We couldn’t finish that just now. Your changes are still on screen; please try again.'},{status:500});}
export async function body(request:Request){const text=await request.text();if(text.length>500000)throw new ApiError('That collection is too large to save in one request.');try{return JSON.parse(text);}catch{throw new ApiError('Please send a valid request.');}}
