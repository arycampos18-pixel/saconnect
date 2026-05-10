
-- Adicionar permissões faltantes para cobrir todos os menus/submenus
INSERT INTO public.settings_permissions (id, module, description) VALUES
  -- Configurações - submenus faltantes
  ('settings.integracoes.view', 'settings', 'Visualizar integrações'),
  ('settings.integracoes.manage', 'settings', 'Gerenciar integrações'),
  ('settings.webhooks.view', 'settings', 'Visualizar webhooks'),
  ('settings.webhooks.manage', 'settings', 'Gerenciar webhooks'),
  ('settings.backup.view', 'settings', 'Visualizar backups'),
  ('settings.backup.manage', 'settings', 'Executar/restaurar backups'),
  ('settings.notificacoes.view', 'settings', 'Visualizar notificações'),
  ('settings.notificacoes.manage', 'settings', 'Gerenciar notificações'),
  ('settings.companies.create', 'settings', 'Incluir empresas'),
  ('settings.companies.delete', 'settings', 'Excluir empresas'),
  ('settings.users.create', 'settings', 'Incluir usuários'),
  ('settings.users.delete', 'settings', 'Excluir usuários'),
  ('settings.profiles.create', 'settings', 'Incluir perfis'),
  ('settings.profiles.delete', 'settings', 'Excluir perfis'),

  -- WhatsApp (Z-API) - submenus
  ('whatsapp.sessions.view', 'whatsapp', 'Visualizar conexões/dispositivos'),
  ('whatsapp.sessions.manage', 'whatsapp', 'Gerenciar conexões/dispositivos'),
  ('whatsapp.contacts.view', 'whatsapp', 'Visualizar contatos'),
  ('whatsapp.contacts.create', 'whatsapp', 'Incluir contatos'),
  ('whatsapp.contacts.edit', 'whatsapp', 'Editar contatos'),
  ('whatsapp.contacts.delete', 'whatsapp', 'Excluir contatos'),
  ('whatsapp.compositor.view', 'whatsapp', 'Visualizar compositor'),
  ('whatsapp.compositor.send', 'whatsapp', 'Enviar pelo compositor'),
  ('whatsapp.campanhas.view', 'whatsapp', 'Visualizar campanhas'),
  ('whatsapp.campanhas.create', 'whatsapp', 'Incluir campanhas'),
  ('whatsapp.campanhas.edit', 'whatsapp', 'Editar campanhas'),
  ('whatsapp.campanhas.delete', 'whatsapp', 'Excluir campanhas'),
  ('whatsapp.chatbot.view', 'whatsapp', 'Visualizar chatbot/URA'),
  ('whatsapp.chatbot.manage', 'whatsapp', 'Gerenciar chatbot/URA'),
  ('whatsapp.relatorios.view', 'whatsapp', 'Visualizar relatórios WhatsApp'),
  ('whatsapp.settings.view', 'whatsapp', 'Visualizar configurações WhatsApp'),
  ('whatsapp.settings.manage', 'whatsapp', 'Gerenciar configurações WhatsApp'),
  ('disparos.create', 'disparos', 'Incluir disparos'),
  ('disparos.delete', 'disparos', 'Excluir disparos'),

  -- WhatsApp Oficial (Meta)
  ('wa_meta.dashboard.view', 'wa_meta', 'Visualizar dashboard WhatsApp Oficial'),
  ('wa_meta.connect.view', 'wa_meta', 'Visualizar conexão WhatsApp Oficial'),
  ('wa_meta.connect.manage', 'wa_meta', 'Gerenciar conexão WhatsApp Oficial'),
  ('wa_meta.sessions.view', 'wa_meta', 'Visualizar sessões WhatsApp Oficial'),
  ('wa_meta.sessions.manage', 'wa_meta', 'Gerenciar sessões WhatsApp Oficial'),
  ('wa_meta.settings.view', 'wa_meta', 'Visualizar configurações WhatsApp Oficial'),
  ('wa_meta.settings.manage', 'wa_meta', 'Gerenciar configurações WhatsApp Oficial'),

  -- Tickets
  ('tickets.dashboard.view', 'tickets', 'Visualizar dashboard de tickets'),
  ('tickets.chamados.view', 'tickets', 'Visualizar chamados'),
  ('tickets.chamados.create', 'tickets', 'Incluir chamados'),
  ('tickets.chamados.edit', 'tickets', 'Editar chamados'),
  ('tickets.chamados.delete', 'tickets', 'Excluir chamados'),
  ('tickets.agenda.view', 'tickets', 'Visualizar agenda de tickets'),
  ('tickets.filas.view', 'tickets', 'Visualizar filas'),
  ('tickets.filas.manage', 'tickets', 'Gerenciar filas'),
  ('tickets.categorias.view', 'tickets', 'Visualizar categorias'),
  ('tickets.categorias.manage', 'tickets', 'Gerenciar categorias'),
  ('tickets.sla.view', 'tickets', 'Visualizar SLA'),
  ('tickets.sla.manage', 'tickets', 'Gerenciar SLA'),
  ('tickets.settings.view', 'tickets', 'Visualizar configurações de tickets'),
  ('tickets.settings.manage', 'tickets', 'Gerenciar configurações de tickets'),

  -- Político - cobertura completa
  ('eleitores.create', 'eleitores', 'Incluir eleitores'),
  ('eleitores.edit', 'eleitores', 'Editar eleitores'),
  ('eleitores.delete', 'eleitores', 'Excluir eleitores'),
  ('eventos.create', 'eventos', 'Incluir eventos'),
  ('eventos.edit', 'eventos', 'Editar eventos'),
  ('eventos.delete', 'eventos', 'Excluir eventos'),
  ('crm.create', 'crm', 'Incluir cards no CRM'),
  ('crm.edit', 'crm', 'Editar cards no CRM'),
  ('crm.delete', 'crm', 'Excluir cards no CRM'),
  ('cabos.create', 'cabos', 'Incluir cabos eleitorais'),
  ('cabos.delete', 'cabos', 'Excluir cabos eleitorais'),
  ('liderancas.create', 'liderancas', 'Incluir lideranças'),
  ('liderancas.delete', 'liderancas', 'Excluir lideranças'),
  ('departamentos.create', 'departamentos', 'Incluir departamentos'),
  ('departamentos.delete', 'departamentos', 'Excluir departamentos'),
  ('political.hierarquia.view', 'political', 'Visualizar dashboard hierárquico'),
  ('political.metas.view', 'political', 'Visualizar metas e gamificação'),
  ('political.metas.manage', 'political', 'Gerenciar metas e gamificação'),
  ('political.agenda.view', 'political', 'Visualizar agenda política'),
  ('political.agenda.manage', 'political', 'Gerenciar agenda política'),
  ('political.mapa.view', 'political', 'Visualizar mapa eleitoral'),
  ('political.pesquisas.view', 'political', 'Visualizar pesquisas'),
  ('political.pesquisas.create', 'political', 'Incluir pesquisas'),
  ('political.pesquisas.edit', 'political', 'Editar pesquisas'),
  ('political.pesquisas.delete', 'political', 'Excluir pesquisas'),
  ('political.aniversariantes.view', 'political', 'Visualizar aniversariantes'),
  ('political.gamification.view', 'political', 'Visualizar gamificação'),
  ('political.predicoes.view', 'political', 'Visualizar predição eleitoral'),
  ('political.concorrencia.view', 'political', 'Visualizar análise de concorrência'),
  ('political.segmentacao.view', 'political', 'Visualizar segmentação'),
  ('political.segmentacao.manage', 'political', 'Gerenciar segmentação'),
  ('political.logistica.view', 'political', 'Visualizar logística'),
  ('political.logistica.manage', 'political', 'Gerenciar logística'),
  ('political.aprovacoes.view', 'political', 'Visualizar aprovações'),
  ('political.aprovacoes.manage', 'political', 'Gerenciar aprovações'),
  ('relatorios.export', 'relatorios', 'Exportar relatórios'),

  -- Atendimento (também sub do WhatsApp, mas vale módulo próprio)
  ('atendimento.relatorios.view', 'atendimento', 'Visualizar relatórios de atendimento'),
  ('atendimento.stories.view', 'atendimento', 'Visualizar stories'),
  ('atendimento.stories.send', 'atendimento', 'Publicar stories'),
  ('atendimento.configuracoes.view', 'atendimento', 'Visualizar configurações de atendimento'),
  ('atendimento.configuracoes.manage', 'atendimento', 'Gerenciar configurações de atendimento')
ON CONFLICT (id) DO NOTHING;

-- Garante que todos os perfis "Admin" recebam todas as permissões
INSERT INTO public.settings_profile_permissions (profile_id, permission_id)
SELECT p.id, perm.id
FROM public.settings_profiles p
CROSS JOIN public.settings_permissions perm
WHERE p.nome = 'Admin'
ON CONFLICT DO NOTHING;
