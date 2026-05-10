INSERT INTO public.settings_permissions (id, module, description) VALUES
  ('political.campanha.view', 'political', 'Ver módulo de Campanha Estratégico')
ON CONFLICT (id) DO NOTHING;