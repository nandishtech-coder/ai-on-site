DROP POLICY IF EXISTS "Signed-in users read payment settings" ON public.payment_settings;
CREATE POLICY "Signed-in users read payment settings"
ON public.payment_settings
FOR SELECT
TO authenticated
USING (id = 1);