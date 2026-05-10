-- Bucket privado para backups
INSERT INTO storage.buckets (id, name, public)
VALUES ('db-backups', 'db-backups', false)
ON CONFLICT (id) DO NOTHING;

-- Apenas super admins podem ver/baixar backups
CREATE POLICY "Super admins can view backups"
ON storage.objects FOR SELECT
USING (bucket_id = 'db-backups' AND public.is_super_admin(auth.uid()));

CREATE POLICY "Super admins can delete backups"
ON storage.objects FOR DELETE
USING (bucket_id = 'db-backups' AND public.is_super_admin(auth.uid()));

-- Extensões para agendamento
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;