CREATE TABLE public.payment_settings (
  id int PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  upi_enabled boolean NOT NULL DEFAULT true,
  upi_id text,
  upi_name text,
  qr_image text,
  stripe_enabled boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.payment_settings TO authenticated;
GRANT ALL ON public.payment_settings TO service_role;
ALTER TABLE public.payment_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Signed-in users read payment settings" ON public.payment_settings FOR SELECT TO authenticated USING (true);
INSERT INTO public.payment_settings (id, upi_enabled, stripe_enabled) VALUES (1, true, false);