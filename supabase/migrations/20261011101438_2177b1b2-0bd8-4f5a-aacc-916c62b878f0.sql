CREATE TABLE public.social_tokens (
  platform text PRIMARY KEY,
  access_token text NOT NULL,
  external_id text,
  expires_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.social_tokens TO service_role;
ALTER TABLE public.social_tokens ENABLE ROW LEVEL SECURITY;