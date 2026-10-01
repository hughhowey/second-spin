declare namespace Cloudflare {
  interface Env {
    DB?: D1Database;
    BUCKET?: R2Bucket;
    OPENAI_API_KEY?: string;
    OPENAI_MODEL?: string;
    SPOTIFY_CLIENT_ID?: string;
    SPOTIFY_TOKEN_KEY?: string;
  }
}
