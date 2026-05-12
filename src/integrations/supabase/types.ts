export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      agenda_compromissos: {
        Row: {
          categoria: Database["public"]["Enums"]["compromisso_categoria"]
          company_id: string | null
          created_at: string
          created_by: string | null
          data_hora: string
          descricao: string | null
          duracao_min: number
          id: string
          lembrete_min: number
          local: string | null
          prioridade: Database["public"]["Enums"]["compromisso_prioridade"]
          responsavel_id: string | null
          status: Database["public"]["Enums"]["compromisso_status"]
          titulo: string
          updated_at: string
        }
        Insert: {
          categoria?: Database["public"]["Enums"]["compromisso_categoria"]
          company_id?: string | null
          created_at?: string
          created_by?: string | null
          data_hora: string
          descricao?: string | null
          duracao_min?: number
          id?: string
          lembrete_min?: number
          local?: string | null
          prioridade?: Database["public"]["Enums"]["compromisso_prioridade"]
          responsavel_id?: string | null
          status?: Database["public"]["Enums"]["compromisso_status"]
          titulo: string
          updated_at?: string
        }
        Update: {
          categoria?: Database["public"]["Enums"]["compromisso_categoria"]
          company_id?: string | null
          created_at?: string
          created_by?: string | null
          data_hora?: string
          descricao?: string | null
          duracao_min?: number
          id?: string
          lembrete_min?: number
          local?: string | null
          prioridade?: Database["public"]["Enums"]["compromisso_prioridade"]
          responsavel_id?: string | null
          status?: Database["public"]["Enums"]["compromisso_status"]
          titulo?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "agenda_compromissos_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "settings_companies"
            referencedColumns: ["id"]
          },
        ]
      }
      agenda_eventos: {
        Row: {
          categoria: string | null
          company_id: string | null
          created_at: string
          created_by: string | null
          data_fim: string | null
          data_inicio: string
          descricao: string | null
          id: string
          local: string | null
          origem: string
          origem_id: string | null
          prioridade: string
          responsavel_id: string | null
          status: string
          tipo: string
          titulo: string
          updated_at: string
        }
        Insert: {
          categoria?: string | null
          company_id?: string | null
          created_at?: string
          created_by?: string | null
          data_fim?: string | null
          data_inicio: string
          descricao?: string | null
          id?: string
          local?: string | null
          origem?: string
          origem_id?: string | null
          prioridade?: string
          responsavel_id?: string | null
          status?: string
          tipo?: string
          titulo: string
          updated_at?: string
        }
        Update: {
          categoria?: string | null
          company_id?: string | null
          created_at?: string
          created_by?: string | null
          data_fim?: string | null
          data_inicio?: string
          descricao?: string | null
          id?: string
          local?: string | null
          origem?: string
          origem_id?: string | null
          prioridade?: string
          responsavel_id?: string | null
          status?: string
          tipo?: string
          titulo?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "agenda_eventos_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "settings_companies"
            referencedColumns: ["id"]
          },
        ]
      }
      agenda_notificacoes_log: {
        Row: {
          canal: string
          company_id: string | null
          created_at: string
          data_referencia: string
          enviado_em: string | null
          erro: string | null
          id: string
          mensagem: string | null
          status: string
          telefone: string | null
          total_compromissos: number
          user_id: string | null
        }
        Insert: {
          canal?: string
          company_id?: string | null
          created_at?: string
          data_referencia: string
          enviado_em?: string | null
          erro?: string | null
          id?: string
          mensagem?: string | null
          status?: string
          telefone?: string | null
          total_compromissos?: number
          user_id?: string | null
        }
        Update: {
          canal?: string
          company_id?: string | null
          created_at?: string
          data_referencia?: string
          enviado_em?: string | null
          erro?: string | null
          id?: string
          mensagem?: string | null
          status?: string
          telefone?: string | null
          total_compromissos?: number
          user_id?: string | null
        }
        Relationships: []
      }
      analise_api_consultas: {
        Row: {
          company_id: string
          created_at: string
          custo_centavos: number
          duracao_ms: number | null
          eleitor_id: string | null
          endpoint: string | null
          http_status: number | null
          id: string
          payload: Json | null
          provedor: string
          resposta: Json | null
          status: string
          user_id: string | null
        }
        Insert: {
          company_id: string
          created_at?: string
          custo_centavos?: number
          duracao_ms?: number | null
          eleitor_id?: string | null
          endpoint?: string | null
          http_status?: number | null
          id?: string
          payload?: Json | null
          provedor: string
          resposta?: Json | null
          status?: string
          user_id?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string
          custo_centavos?: number
          duracao_ms?: number | null
          eleitor_id?: string | null
          endpoint?: string | null
          http_status?: number | null
          id?: string
          payload?: Json | null
          provedor?: string
          resposta?: Json | null
          status?: string
          user_id?: string | null
        }
        Relationships: []
      }
      analise_cache_consultas: {
        Row: {
          chave: string
          company_id: string
          created_at: string
          expira_em: string
          fonte: string
          id: string
          resultado: Json
        }
        Insert: {
          chave: string
          company_id: string
          created_at?: string
          expira_em: string
          fonte: string
          id?: string
          resultado: Json
        }
        Update: {
          chave?: string
          company_id?: string
          created_at?: string
          expira_em?: string
          fonte?: string
          id?: string
          resultado?: Json
        }
        Relationships: []
      }
      analise_custos_api: {
        Row: {
          ano_mes: string
          company_id: string
          id: string
          provedor: string
          total_centavos: number
          total_consultas: number
          updated_at: string
        }
        Insert: {
          ano_mes: string
          company_id: string
          id?: string
          provedor: string
          total_centavos?: number
          total_consultas?: number
          updated_at?: string
        }
        Update: {
          ano_mes?: string
          company_id?: string
          id?: string
          provedor?: string
          total_centavos?: number
          total_consultas?: number
          updated_at?: string
        }
        Relationships: []
      }
      analise_duplicidades: {
        Row: {
          company_id: string
          created_at: string
          decisao: string | null
          detalhes: Json
          eleitor_duplicado_id: string
          eleitor_id: string
          id: string
          motivo: string | null
          revisado_em: string | null
          revisado_por: string | null
          status: string
          tipo: string
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          decisao?: string | null
          detalhes?: Json
          eleitor_duplicado_id: string
          eleitor_id: string
          id?: string
          motivo?: string | null
          revisado_em?: string | null
          revisado_por?: string | null
          status?: string
          tipo: string
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          decisao?: string | null
          detalhes?: Json
          eleitor_duplicado_id?: string
          eleitor_id?: string
          id?: string
          motivo?: string | null
          revisado_em?: string | null
          revisado_por?: string | null
          status?: string
          tipo?: string
          updated_at?: string
        }
        Relationships: []
      }
      analise_erros_monitoramento: {
        Row: {
          company_id: string
          contexto: Json
          created_at: string
          id: string
          mensagem: string
          origem: string
          resolvido: boolean
          severidade: string
          user_id: string | null
        }
        Insert: {
          company_id: string
          contexto?: Json
          created_at?: string
          id?: string
          mensagem: string
          origem: string
          resolvido?: boolean
          severidade?: string
          user_id?: string | null
        }
        Update: {
          company_id?: string
          contexto?: Json
          created_at?: string
          id?: string
          mensagem?: string
          origem?: string
          resolvido?: boolean
          severidade?: string
          user_id?: string | null
        }
        Relationships: []
      }
      analise_feature_flags: {
        Row: {
          alterado_por: string | null
          ativo: boolean
          chave: string
          company_id: string
          created_at: string
          descricao: string | null
          id: string
          rollout_pct: number
          updated_at: string
        }
        Insert: {
          alterado_por?: string | null
          ativo?: boolean
          chave: string
          company_id: string
          created_at?: string
          descricao?: string | null
          id?: string
          rollout_pct?: number
          updated_at?: string
        }
        Update: {
          alterado_por?: string | null
          ativo?: boolean
          chave?: string
          company_id?: string
          created_at?: string
          descricao?: string | null
          id?: string
          rollout_pct?: number
          updated_at?: string
        }
        Relationships: []
      }
      analise_jobs: {
        Row: {
          chave: string | null
          company_id: string
          concluido_em: string | null
          created_at: string
          erro: string | null
          id: string
          iniciado_em: string | null
          max_tentativas: number
          payload: Json
          prioridade: number
          proximo_em: string
          resultado: Json | null
          status: string
          tentativas: number
          tipo: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          chave?: string | null
          company_id: string
          concluido_em?: string | null
          created_at?: string
          erro?: string | null
          id?: string
          iniciado_em?: string | null
          max_tentativas?: number
          payload?: Json
          prioridade?: number
          proximo_em?: string
          resultado?: Json | null
          status?: string
          tentativas?: number
          tipo: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          chave?: string | null
          company_id?: string
          concluido_em?: string | null
          created_at?: string
          erro?: string | null
          id?: string
          iniciado_em?: string | null
          max_tentativas?: number
          payload?: Json
          prioridade?: number
          proximo_em?: string
          resultado?: Json | null
          status?: string
          tentativas?: number
          tipo?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      analise_logs: {
        Row: {
          acao: string
          company_id: string
          created_at: string
          detalhes: Json
          eleitor_id: string | null
          entidade: string | null
          entidade_id: string | null
          id: string
          ip: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          acao: string
          company_id: string
          created_at?: string
          detalhes?: Json
          eleitor_id?: string | null
          entidade?: string | null
          entidade_id?: string | null
          id?: string
          ip?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          acao?: string
          company_id?: string
          created_at?: string
          detalhes?: Json
          eleitor_id?: string | null
          entidade?: string | null
          entidade_id?: string | null
          id?: string
          ip?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      analise_provedor_credenciais: {
        Row: {
          client_id: string
          client_secret: string
          created_at: string
          id: string
          provedor: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          client_id: string
          client_secret: string
          created_at?: string
          id?: string
          provedor?: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          client_id?: string
          client_secret?: string
          created_at?: string
          id?: string
          provedor?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      analise_provedor_limites: {
        Row: {
          alerta_100_enviado_dia: string | null
          alerta_100_enviado_mes: string | null
          alerta_80_enviado_dia: string | null
          alerta_80_enviado_mes: string | null
          ativo: boolean
          company_id: string
          cota_diaria_consultas: number
          cota_mensal_consultas: number
          created_at: string
          id: string
          orcamento_mensal_centavos: number
          provedor: string
          updated_at: string
        }
        Insert: {
          alerta_100_enviado_dia?: string | null
          alerta_100_enviado_mes?: string | null
          alerta_80_enviado_dia?: string | null
          alerta_80_enviado_mes?: string | null
          ativo?: boolean
          company_id: string
          cota_diaria_consultas?: number
          cota_mensal_consultas?: number
          created_at?: string
          id?: string
          orcamento_mensal_centavos?: number
          provedor: string
          updated_at?: string
        }
        Update: {
          alerta_100_enviado_dia?: string | null
          alerta_100_enviado_mes?: string | null
          alerta_80_enviado_dia?: string | null
          alerta_80_enviado_mes?: string | null
          ativo?: boolean
          company_id?: string
          cota_diaria_consultas?: number
          cota_mensal_consultas?: number
          created_at?: string
          id?: string
          orcamento_mensal_centavos?: number
          provedor?: string
          updated_at?: string
        }
        Relationships: []
      }
      analise_validacoes: {
        Row: {
          company_id: string
          created_at: string
          detalhes: Json
          eleitor_id: string
          fonte: string | null
          id: string
          resultado: string
          tipo: string
          user_id: string | null
        }
        Insert: {
          company_id: string
          created_at?: string
          detalhes?: Json
          eleitor_id: string
          fonte?: string | null
          id?: string
          resultado: string
          tipo?: string
          user_id?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string
          detalhes?: Json
          eleitor_id?: string
          fonte?: string | null
          id?: string
          resultado?: string
          tipo?: string
          user_id?: string | null
        }
        Relationships: []
      }
      aniversariantes_config: {
        Row: {
          apenas_lgpd: boolean
          ativo: boolean
          company_id: string | null
          created_at: string
          hora_disparo: number
          id: string
          template: string
          updated_at: string
        }
        Insert: {
          apenas_lgpd?: boolean
          ativo?: boolean
          company_id?: string | null
          created_at?: string
          hora_disparo?: number
          id?: string
          template?: string
          updated_at?: string
        }
        Update: {
          apenas_lgpd?: boolean
          ativo?: boolean
          company_id?: string | null
          created_at?: string
          hora_disparo?: number
          id?: string
          template?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "aniversariantes_config_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "settings_companies"
            referencedColumns: ["id"]
          },
        ]
      }
      aniversariantes_log: {
        Row: {
          company_id: string | null
          created_at: string
          data_envio: string
          eleitor_id: string
          erro: string | null
          id: string
          status: string
        }
        Insert: {
          company_id?: string | null
          created_at?: string
          data_envio?: string
          eleitor_id: string
          erro?: string | null
          id?: string
          status?: string
        }
        Update: {
          company_id?: string | null
          created_at?: string
          data_envio?: string
          eleitor_id?: string
          erro?: string | null
          id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "aniversariantes_log_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "settings_companies"
            referencedColumns: ["id"]
          },
        ]
      }
      api_configuracoes_custo: {
        Row: {
          company_id: string
          created_at: string
          created_by: string | null
          custo_centavos: number
          id: string
          nome: string
          observacoes: string | null
          provedor: string | null
          status: string
          updated_at: string
          vigencia_fim: string | null
          vigencia_inicio: string
        }
        Insert: {
          company_id: string
          created_at?: string
          created_by?: string | null
          custo_centavos?: number
          id?: string
          nome: string
          observacoes?: string | null
          provedor?: string | null
          status?: string
          updated_at?: string
          vigencia_fim?: string | null
          vigencia_inicio?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          created_by?: string | null
          custo_centavos?: number
          id?: string
          nome?: string
          observacoes?: string | null
          provedor?: string | null
          status?: string
          updated_at?: string
          vigencia_fim?: string | null
          vigencia_inicio?: string
        }
        Relationships: []
      }
      api_consultas_custos: {
        Row: {
          api_configuracao_id: string | null
          api_nome: string
          company_id: string
          created_at: string
          custo_total_centavos: number
          custo_unitario_centavos: number
          eleitor_id: string | null
          erro: string | null
          id: string
          lideranca_id: string | null
          metadata: Json
          quantidade: number
          status: string
          user_id: string | null
        }
        Insert: {
          api_configuracao_id?: string | null
          api_nome: string
          company_id: string
          created_at?: string
          custo_total_centavos?: number
          custo_unitario_centavos?: number
          eleitor_id?: string | null
          erro?: string | null
          id?: string
          lideranca_id?: string | null
          metadata?: Json
          quantidade?: number
          status?: string
          user_id?: string | null
        }
        Update: {
          api_configuracao_id?: string | null
          api_nome?: string
          company_id?: string
          created_at?: string
          custo_total_centavos?: number
          custo_unitario_centavos?: number
          eleitor_id?: string | null
          erro?: string | null
          id?: string
          lideranca_id?: string | null
          metadata?: Json
          quantidade?: number
          status?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "api_consultas_custos_api_configuracao_id_fkey"
            columns: ["api_configuracao_id"]
            isOneToOne: false
            referencedRelation: "api_configuracoes_custo"
            referencedColumns: ["id"]
          },
        ]
      }
      automacao_execucoes: {
        Row: {
          acoes_executadas: Json
          automacao_id: string
          contexto: Json
          created_at: string
          created_by: string | null
          erro: string | null
          id: string
          status: Database["public"]["Enums"]["execucao_status"]
          trigger_origem: string | null
        }
        Insert: {
          acoes_executadas?: Json
          automacao_id: string
          contexto?: Json
          created_at?: string
          created_by?: string | null
          erro?: string | null
          id?: string
          status?: Database["public"]["Enums"]["execucao_status"]
          trigger_origem?: string | null
        }
        Update: {
          acoes_executadas?: Json
          automacao_id?: string
          contexto?: Json
          created_at?: string
          created_by?: string | null
          erro?: string | null
          id?: string
          status?: Database["public"]["Enums"]["execucao_status"]
          trigger_origem?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "automacao_execucoes_automacao_id_fkey"
            columns: ["automacao_id"]
            isOneToOne: false
            referencedRelation: "automacoes"
            referencedColumns: ["id"]
          },
        ]
      }
      automacoes: {
        Row: {
          created_at: string
          created_by: string | null
          descricao: string | null
          edges: Json
          id: string
          nodes: Json
          nome: string
          status: Database["public"]["Enums"]["automacao_status"]
          total_execucoes: number
          trigger_config: Json
          trigger_tipo: Database["public"]["Enums"]["automacao_trigger_tipo"]
          ultima_execucao_em: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          descricao?: string | null
          edges?: Json
          id?: string
          nodes?: Json
          nome: string
          status?: Database["public"]["Enums"]["automacao_status"]
          total_execucoes?: number
          trigger_config?: Json
          trigger_tipo?: Database["public"]["Enums"]["automacao_trigger_tipo"]
          ultima_execucao_em?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          descricao?: string | null
          edges?: Json
          id?: string
          nodes?: Json
          nome?: string
          status?: Database["public"]["Enums"]["automacao_status"]
          total_execucoes?: number
          trigger_config?: Json
          trigger_tipo?: Database["public"]["Enums"]["automacao_trigger_tipo"]
          ultima_execucao_em?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      badges_catalogo: {
        Row: {
          ativo: boolean
          company_id: string
          cor: string
          created_at: string
          criterio_tipo: string
          criterio_valor: number
          descricao: string | null
          icone: string
          id: string
          nome: string
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          company_id: string
          cor?: string
          created_at?: string
          criterio_tipo: string
          criterio_valor?: number
          descricao?: string | null
          icone?: string
          id?: string
          nome: string
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          company_id?: string
          cor?: string
          created_at?: string
          criterio_tipo?: string
          criterio_valor?: number
          descricao?: string | null
          icone?: string
          id?: string
          nome?: string
          updated_at?: string
        }
        Relationships: []
      }
      cabo_badges: {
        Row: {
          badge_id: string
          cabo_eleitoral_id: string
          company_id: string
          conquistado_em: string
          contexto: Json | null
          id: string
        }
        Insert: {
          badge_id: string
          cabo_eleitoral_id: string
          company_id: string
          conquistado_em?: string
          contexto?: Json | null
          id?: string
        }
        Update: {
          badge_id?: string
          cabo_eleitoral_id?: string
          company_id?: string
          conquistado_em?: string
          contexto?: Json | null
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cabo_badges_badge_id_fkey"
            columns: ["badge_id"]
            isOneToOne: false
            referencedRelation: "badges_catalogo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cabo_badges_cabo_eleitoral_id_fkey"
            columns: ["cabo_eleitoral_id"]
            isOneToOne: false
            referencedRelation: "cabos_eleitorais"
            referencedColumns: ["id"]
          },
        ]
      }
      cabo_links_captacao: {
        Row: {
          ativo: boolean
          cabo_eleitoral_id: string
          company_id: string
          created_at: string
          expires_at: string | null
          id: string
          nome: string | null
          tipo: string
          token: string
          total_cadastros: number
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          cabo_eleitoral_id: string
          company_id: string
          created_at?: string
          expires_at?: string | null
          id?: string
          nome?: string | null
          tipo?: string
          token?: string
          total_cadastros?: number
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          cabo_eleitoral_id?: string
          company_id?: string
          created_at?: string
          expires_at?: string | null
          id?: string
          nome?: string | null
          tipo?: string
          token?: string
          total_cadastros?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cabo_links_captacao_cabo_eleitoral_id_fkey"
            columns: ["cabo_eleitoral_id"]
            isOneToOne: false
            referencedRelation: "cabos_eleitorais"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cabo_links_captacao_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "settings_companies"
            referencedColumns: ["id"]
          },
        ]
      }
      cabos_eleitorais: {
        Row: {
          ativo: boolean
          bairro: string | null
          cep: string | null
          cidade: string | null
          company_id: string | null
          complemento: string | null
          created_at: string
          created_by: string | null
          data_fim: string | null
          data_inicio: string | null
          email: string | null
          id: string
          lideranca_id: string
          meta: number
          nome: string
          numero: string | null
          observacoes: string | null
          rua: string | null
          status: string
          telefone: string | null
          uf: string | null
          updated_at: string
          user_id: string | null
          zona: string | null
        }
        Insert: {
          ativo?: boolean
          bairro?: string | null
          cep?: string | null
          cidade?: string | null
          company_id?: string | null
          complemento?: string | null
          created_at?: string
          created_by?: string | null
          data_fim?: string | null
          data_inicio?: string | null
          email?: string | null
          id?: string
          lideranca_id: string
          meta?: number
          nome: string
          numero?: string | null
          observacoes?: string | null
          rua?: string | null
          status?: string
          telefone?: string | null
          uf?: string | null
          updated_at?: string
          user_id?: string | null
          zona?: string | null
        }
        Update: {
          ativo?: boolean
          bairro?: string | null
          cep?: string | null
          cidade?: string | null
          company_id?: string | null
          complemento?: string | null
          created_at?: string
          created_by?: string | null
          data_fim?: string | null
          data_inicio?: string | null
          email?: string | null
          id?: string
          lideranca_id?: string
          meta?: number
          nome?: string
          numero?: string | null
          observacoes?: string | null
          rua?: string | null
          status?: string
          telefone?: string | null
          uf?: string | null
          updated_at?: string
          user_id?: string | null
          zona?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cabos_eleitorais_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "settings_companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cabos_eleitorais_lideranca_id_fkey"
            columns: ["lideranca_id"]
            isOneToOne: false
            referencedRelation: "liderancas"
            referencedColumns: ["id"]
          },
        ]
      }
      catalogos_customizados: {
        Row: {
          ativo: boolean
          categoria: string
          company_id: string | null
          created_at: string
          id: string
          is_system: boolean
          nome: string
          ordem: number
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          categoria: string
          company_id?: string | null
          created_at?: string
          id?: string
          is_system?: boolean
          nome: string
          ordem?: number
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          categoria?: string
          company_id?: string | null
          created_at?: string
          id?: string
          is_system?: boolean
          nome?: string
          ordem?: number
          updated_at?: string
        }
        Relationships: []
      }
      chatbot_fluxos: {
        Row: {
          ativo: boolean
          created_at: string
          created_by: string | null
          descricao: string | null
          id: string
          is_padrao: boolean
          mensagem_invalida: string
          mensagem_timeout: string
          no_inicial_id: string | null
          nome: string
          timeout_minutos: number
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          created_by?: string | null
          descricao?: string | null
          id?: string
          is_padrao?: boolean
          mensagem_invalida?: string
          mensagem_timeout?: string
          no_inicial_id?: string | null
          nome: string
          timeout_minutos?: number
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          created_by?: string | null
          descricao?: string | null
          id?: string
          is_padrao?: boolean
          mensagem_invalida?: string
          mensagem_timeout?: string
          no_inicial_id?: string | null
          nome?: string
          timeout_minutos?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_chatbot_no_inicial"
            columns: ["no_inicial_id"]
            isOneToOne: false
            referencedRelation: "chatbot_nos"
            referencedColumns: ["id"]
          },
        ]
      }
      chatbot_nos: {
        Row: {
          created_at: string
          departamento_id: string | null
          fluxo_id: string
          id: string
          mensagem: string | null
          nome: string
          opcoes: Json
          ordem: number
          proximo_no_id: string | null
          tipo: string
          updated_at: string
          variavel: string | null
        }
        Insert: {
          created_at?: string
          departamento_id?: string | null
          fluxo_id: string
          id?: string
          mensagem?: string | null
          nome: string
          opcoes?: Json
          ordem?: number
          proximo_no_id?: string | null
          tipo?: string
          updated_at?: string
          variavel?: string | null
        }
        Update: {
          created_at?: string
          departamento_id?: string | null
          fluxo_id?: string
          id?: string
          mensagem?: string | null
          nome?: string
          opcoes?: Json
          ordem?: number
          proximo_no_id?: string | null
          tipo?: string
          updated_at?: string
          variavel?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "chatbot_nos_fluxo_id_fkey"
            columns: ["fluxo_id"]
            isOneToOne: false
            referencedRelation: "chatbot_fluxos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_chatbot_proximo_no"
            columns: ["proximo_no_id"]
            isOneToOne: false
            referencedRelation: "chatbot_nos"
            referencedColumns: ["id"]
          },
        ]
      }
      chatbot_sessoes: {
        Row: {
          conversa_id: string
          created_at: string
          finalizado_em: string | null
          fluxo_id: string
          id: string
          no_atual_id: string | null
          status: string
          ultima_interacao: string
          variaveis: Json
        }
        Insert: {
          conversa_id: string
          created_at?: string
          finalizado_em?: string | null
          fluxo_id: string
          id?: string
          no_atual_id?: string | null
          status?: string
          ultima_interacao?: string
          variaveis?: Json
        }
        Update: {
          conversa_id?: string
          created_at?: string
          finalizado_em?: string | null
          fluxo_id?: string
          id?: string
          no_atual_id?: string | null
          status?: string
          ultima_interacao?: string
          variaveis?: Json
        }
        Relationships: [
          {
            foreignKeyName: "chatbot_sessoes_fluxo_id_fkey"
            columns: ["fluxo_id"]
            isOneToOne: false
            referencedRelation: "chatbot_fluxos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chatbot_sessoes_no_atual_id_fkey"
            columns: ["no_atual_id"]
            isOneToOne: false
            referencedRelation: "chatbot_nos"
            referencedColumns: ["id"]
          },
        ]
      }
      concorrente_atividades: {
        Row: {
          bairro: string | null
          company_id: string | null
          concorrente_id: string
          created_at: string
          created_by: string | null
          data_atividade: string
          descricao: string | null
          id: string
          link: string | null
          sentimento: Database["public"]["Enums"]["sentimento"] | null
          tipo: Database["public"]["Enums"]["atividade_concorrente_tipo"]
          titulo: string
        }
        Insert: {
          bairro?: string | null
          company_id?: string | null
          concorrente_id: string
          created_at?: string
          created_by?: string | null
          data_atividade?: string
          descricao?: string | null
          id?: string
          link?: string | null
          sentimento?: Database["public"]["Enums"]["sentimento"] | null
          tipo?: Database["public"]["Enums"]["atividade_concorrente_tipo"]
          titulo: string
        }
        Update: {
          bairro?: string | null
          company_id?: string | null
          concorrente_id?: string
          created_at?: string
          created_by?: string | null
          data_atividade?: string
          descricao?: string | null
          id?: string
          link?: string | null
          sentimento?: Database["public"]["Enums"]["sentimento"] | null
          tipo?: Database["public"]["Enums"]["atividade_concorrente_tipo"]
          titulo?: string
        }
        Relationships: [
          {
            foreignKeyName: "concorrente_atividades_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "settings_companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "concorrente_atividades_concorrente_id_fkey"
            columns: ["concorrente_id"]
            isOneToOne: false
            referencedRelation: "concorrentes"
            referencedColumns: ["id"]
          },
        ]
      }
      concorrentes: {
        Row: {
          ativo: boolean
          company_id: string | null
          created_at: string
          created_by: string | null
          engajamento_pct: number
          foto_url: string | null
          id: string
          nome: string
          observacoes: string | null
          partido: string | null
          regiao: string | null
          seguidores: number
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          company_id?: string | null
          created_at?: string
          created_by?: string | null
          engajamento_pct?: number
          foto_url?: string | null
          id?: string
          nome: string
          observacoes?: string | null
          partido?: string | null
          regiao?: string | null
          seguidores?: number
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          company_id?: string | null
          created_at?: string
          created_by?: string | null
          engajamento_pct?: number
          foto_url?: string | null
          id?: string
          nome?: string
          observacoes?: string | null
          partido?: string | null
          regiao?: string | null
          seguidores?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "concorrentes_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "settings_companies"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_etapas: {
        Row: {
          company_id: string | null
          cor: string
          created_at: string
          id: string
          is_ganho: boolean
          is_perdido: boolean
          nome: string
          ordem: number
        }
        Insert: {
          company_id?: string | null
          cor?: string
          created_at?: string
          id?: string
          is_ganho?: boolean
          is_perdido?: boolean
          nome: string
          ordem?: number
        }
        Update: {
          company_id?: string | null
          cor?: string
          created_at?: string
          id?: string
          is_ganho?: boolean
          is_perdido?: boolean
          nome?: string
          ordem?: number
        }
        Relationships: [
          {
            foreignKeyName: "crm_etapas_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "settings_companies"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_interacoes: {
        Row: {
          company_id: string | null
          created_at: string
          created_by: string | null
          data_interacao: string
          descricao: string | null
          eleitor_id: string
          id: string
          oportunidade_id: string | null
          tipo: string
        }
        Insert: {
          company_id?: string | null
          created_at?: string
          created_by?: string | null
          data_interacao?: string
          descricao?: string | null
          eleitor_id: string
          id?: string
          oportunidade_id?: string | null
          tipo?: string
        }
        Update: {
          company_id?: string | null
          created_at?: string
          created_by?: string | null
          data_interacao?: string
          descricao?: string | null
          eleitor_id?: string
          id?: string
          oportunidade_id?: string | null
          tipo?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_interacoes_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "settings_companies"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_oportunidades: {
        Row: {
          ativo: boolean
          company_id: string | null
          created_at: string
          created_by: string | null
          eleitor_id: string | null
          etapa_id: string
          id: string
          observacoes: string | null
          ordem: number
          responsavel_id: string | null
          titulo: string
          updated_at: string
          valor_estimado: number
        }
        Insert: {
          ativo?: boolean
          company_id?: string | null
          created_at?: string
          created_by?: string | null
          eleitor_id?: string | null
          etapa_id: string
          id?: string
          observacoes?: string | null
          ordem?: number
          responsavel_id?: string | null
          titulo: string
          updated_at?: string
          valor_estimado?: number
        }
        Update: {
          ativo?: boolean
          company_id?: string | null
          created_at?: string
          created_by?: string | null
          eleitor_id?: string | null
          etapa_id?: string
          id?: string
          observacoes?: string | null
          ordem?: number
          responsavel_id?: string | null
          titulo?: string
          updated_at?: string
          valor_estimado?: number
        }
        Relationships: [
          {
            foreignKeyName: "crm_oportunidades_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "settings_companies"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_tarefas: {
        Row: {
          company_id: string | null
          concluida: boolean
          concluida_em: string | null
          created_at: string
          created_by: string | null
          descricao: string | null
          eleitor_id: string | null
          id: string
          oportunidade_id: string | null
          prioridade: Database["public"]["Enums"]["crm_prioridade"]
          responsavel_id: string | null
          titulo: string
          updated_at: string
          vencimento: string | null
        }
        Insert: {
          company_id?: string | null
          concluida?: boolean
          concluida_em?: string | null
          created_at?: string
          created_by?: string | null
          descricao?: string | null
          eleitor_id?: string | null
          id?: string
          oportunidade_id?: string | null
          prioridade?: Database["public"]["Enums"]["crm_prioridade"]
          responsavel_id?: string | null
          titulo: string
          updated_at?: string
          vencimento?: string | null
        }
        Update: {
          company_id?: string | null
          concluida?: boolean
          concluida_em?: string | null
          created_at?: string
          created_by?: string | null
          descricao?: string | null
          eleitor_id?: string | null
          id?: string
          oportunidade_id?: string | null
          prioridade?: Database["public"]["Enums"]["crm_prioridade"]
          responsavel_id?: string | null
          titulo?: string
          updated_at?: string
          vencimento?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "crm_tarefas_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "settings_companies"
            referencedColumns: ["id"]
          },
        ]
      }
      departamento_interacoes: {
        Row: {
          company_id: string | null
          created_at: string
          created_by: string | null
          data_interacao: string
          departamento_id: string
          descricao: string | null
          id: string
          membro_id: string | null
          responsavel_id: string | null
          responsavel_nome: string | null
          status: string
          tipo: string
          updated_at: string
        }
        Insert: {
          company_id?: string | null
          created_at?: string
          created_by?: string | null
          data_interacao?: string
          departamento_id: string
          descricao?: string | null
          id?: string
          membro_id?: string | null
          responsavel_id?: string | null
          responsavel_nome?: string | null
          status?: string
          tipo?: string
          updated_at?: string
        }
        Update: {
          company_id?: string | null
          created_at?: string
          created_by?: string | null
          data_interacao?: string
          departamento_id?: string
          descricao?: string | null
          id?: string
          membro_id?: string | null
          responsavel_id?: string | null
          responsavel_nome?: string | null
          status?: string
          tipo?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "departamento_interacoes_departamento_id_fkey"
            columns: ["departamento_id"]
            isOneToOne: false
            referencedRelation: "departamentos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "departamento_interacoes_membro_id_fkey"
            columns: ["membro_id"]
            isOneToOne: false
            referencedRelation: "departamento_membros"
            referencedColumns: ["id"]
          },
        ]
      }
      departamento_membros: {
        Row: {
          bairro: string | null
          cep: string | null
          cidade: string | null
          company_id: string | null
          complemento: string | null
          cpf: string | null
          created_at: string
          departamento_id: string
          eleitor_id: string | null
          email: string | null
          entrou_em: string
          funcao: string
          id: string
          nome: string | null
          numero: string | null
          rua: string | null
          status: string
          telefone: string | null
          uf: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          bairro?: string | null
          cep?: string | null
          cidade?: string | null
          company_id?: string | null
          complemento?: string | null
          cpf?: string | null
          created_at?: string
          departamento_id: string
          eleitor_id?: string | null
          email?: string | null
          entrou_em?: string
          funcao?: string
          id?: string
          nome?: string | null
          numero?: string | null
          rua?: string | null
          status?: string
          telefone?: string | null
          uf?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          bairro?: string | null
          cep?: string | null
          cidade?: string | null
          company_id?: string | null
          complemento?: string | null
          cpf?: string | null
          created_at?: string
          departamento_id?: string
          eleitor_id?: string | null
          email?: string | null
          entrou_em?: string
          funcao?: string
          id?: string
          nome?: string | null
          numero?: string | null
          rua?: string | null
          status?: string
          telefone?: string | null
          uf?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "departamento_membros_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "settings_companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "departamento_membros_departamento_id_fkey"
            columns: ["departamento_id"]
            isOneToOne: false
            referencedRelation: "departamentos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "departamento_membros_eleitor_id_fkey"
            columns: ["eleitor_id"]
            isOneToOne: false
            referencedRelation: "eleitores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "departamento_membros_eleitor_id_fkey"
            columns: ["eleitor_id"]
            isOneToOne: false
            referencedRelation: "vw_eleitores_consolidado"
            referencedColumns: ["id"]
          },
        ]
      }
      departamentos: {
        Row: {
          area_atuacao: string | null
          ativo: boolean
          company_id: string | null
          cor: string
          created_at: string
          created_by: string | null
          descricao: string | null
          email: string | null
          icone: string
          id: string
          nome: string
          objetivo: string | null
          responsavel_id: string | null
          responsavel_nome: string | null
          status: string
          telefone: string | null
          updated_at: string
        }
        Insert: {
          area_atuacao?: string | null
          ativo?: boolean
          company_id?: string | null
          cor?: string
          created_at?: string
          created_by?: string | null
          descricao?: string | null
          email?: string | null
          icone?: string
          id?: string
          nome: string
          objetivo?: string | null
          responsavel_id?: string | null
          responsavel_nome?: string | null
          status?: string
          telefone?: string | null
          updated_at?: string
        }
        Update: {
          area_atuacao?: string | null
          ativo?: boolean
          company_id?: string | null
          cor?: string
          created_at?: string
          created_by?: string | null
          descricao?: string | null
          email?: string | null
          icone?: string
          id?: string
          nome?: string
          objetivo?: string | null
          responsavel_id?: string | null
          responsavel_nome?: string | null
          status?: string
          telefone?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "departamentos_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "settings_companies"
            referencedColumns: ["id"]
          },
        ]
      }
      department_qrcode_submissions: {
        Row: {
          bairro: string | null
          cidade: string | null
          company_id: string
          cpf: string | null
          created_at: string
          data_nascimento: string | null
          departamentos_selecionados: Json
          email: string | null
          endereco: string | null
          id: string
          nome: string
          observacoes: string | null
          qrcode_id: string
          raw_data: Json | null
          telefone: string
          uf: string | null
          welcome_error: string | null
          welcome_sent_at: string | null
          welcome_status: string | null
        }
        Insert: {
          bairro?: string | null
          cidade?: string | null
          company_id: string
          cpf?: string | null
          created_at?: string
          data_nascimento?: string | null
          departamentos_selecionados?: Json
          email?: string | null
          endereco?: string | null
          id?: string
          nome: string
          observacoes?: string | null
          qrcode_id: string
          raw_data?: Json | null
          telefone: string
          uf?: string | null
          welcome_error?: string | null
          welcome_sent_at?: string | null
          welcome_status?: string | null
        }
        Update: {
          bairro?: string | null
          cidade?: string | null
          company_id?: string
          cpf?: string | null
          created_at?: string
          data_nascimento?: string | null
          departamentos_selecionados?: Json
          email?: string | null
          endereco?: string | null
          id?: string
          nome?: string
          observacoes?: string | null
          qrcode_id?: string
          raw_data?: Json | null
          telefone?: string
          uf?: string | null
          welcome_error?: string | null
          welcome_sent_at?: string | null
          welcome_status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "department_qrcode_submissions_qrcode_id_fkey"
            columns: ["qrcode_id"]
            isOneToOne: false
            referencedRelation: "department_qrcodes"
            referencedColumns: ["id"]
          },
        ]
      }
      department_qrcodes: {
        Row: {
          ativo: boolean
          company_id: string
          created_at: string
          created_by: string | null
          departamentos: Json
          expires_at: string | null
          id: string
          nome: string
          observacoes: string | null
          token: string
          total_cadastros: number
          updated_at: string
          whatsapp_auto_enabled: boolean
          whatsapp_session_id: string | null
          whatsapp_welcome_message: string | null
        }
        Insert: {
          ativo?: boolean
          company_id: string
          created_at?: string
          created_by?: string | null
          departamentos?: Json
          expires_at?: string | null
          id?: string
          nome: string
          observacoes?: string | null
          token?: string
          total_cadastros?: number
          updated_at?: string
          whatsapp_auto_enabled?: boolean
          whatsapp_session_id?: string | null
          whatsapp_welcome_message?: string | null
        }
        Update: {
          ativo?: boolean
          company_id?: string
          created_at?: string
          created_by?: string | null
          departamentos?: Json
          expires_at?: string | null
          id?: string
          nome?: string
          observacoes?: string | null
          token?: string
          total_cadastros?: number
          updated_at?: string
          whatsapp_auto_enabled?: boolean
          whatsapp_session_id?: string | null
          whatsapp_welcome_message?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "department_qrcodes_whatsapp_session_id_fkey"
            columns: ["whatsapp_session_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      disparo_config: {
        Row: {
          falar_nome_padrao: boolean
          id: string
          intervalo_max_segundos: number
          intervalo_min_segundos: number
          janela_fim: string | null
          janela_inicio: string | null
          limite_diario: number
          lote_padrao: number
          pausa_a_cada: number
          pausa_segundos: number
          saudacao_padrao: boolean
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          falar_nome_padrao?: boolean
          id?: string
          intervalo_max_segundos?: number
          intervalo_min_segundos?: number
          janela_fim?: string | null
          janela_inicio?: string | null
          limite_diario?: number
          lote_padrao?: number
          pausa_a_cada?: number
          pausa_segundos?: number
          saudacao_padrao?: boolean
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          falar_nome_padrao?: boolean
          id?: string
          intervalo_max_segundos?: number
          intervalo_min_segundos?: number
          janela_fim?: string | null
          janela_inicio?: string | null
          limite_diario?: number
          lote_padrao?: number
          pausa_a_cada?: number
          pausa_segundos?: number
          saudacao_padrao?: boolean
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      disparo_destinatarios: {
        Row: {
          conteudo_enviado: string | null
          created_at: string
          disparo_id: string
          eleitor_id: string | null
          enviado_em: string | null
          erro: string | null
          id: string
          nome: string | null
          provedor_message_id: string | null
          status: Database["public"]["Enums"]["disparo_dest_status"]
          telefone: string
          telefone_digits: string
          tentativas: number
        }
        Insert: {
          conteudo_enviado?: string | null
          created_at?: string
          disparo_id: string
          eleitor_id?: string | null
          enviado_em?: string | null
          erro?: string | null
          id?: string
          nome?: string | null
          provedor_message_id?: string | null
          status?: Database["public"]["Enums"]["disparo_dest_status"]
          telefone: string
          telefone_digits: string
          tentativas?: number
        }
        Update: {
          conteudo_enviado?: string | null
          created_at?: string
          disparo_id?: string
          eleitor_id?: string | null
          enviado_em?: string | null
          erro?: string | null
          id?: string
          nome?: string | null
          provedor_message_id?: string | null
          status?: Database["public"]["Enums"]["disparo_dest_status"]
          telefone?: string
          telefone_digits?: string
          tentativas?: number
        }
        Relationships: [
          {
            foreignKeyName: "disparo_destinatarios_disparo_id_fkey"
            columns: ["disparo_id"]
            isOneToOne: false
            referencedRelation: "disparos"
            referencedColumns: ["id"]
          },
        ]
      }
      disparo_optout: {
        Row: {
          created_at: string
          id: string
          motivo: string | null
          origem: string
          telefone_digits: string
        }
        Insert: {
          created_at?: string
          id?: string
          motivo?: string | null
          origem?: string
          telefone_digits: string
        }
        Update: {
          created_at?: string
          id?: string
          motivo?: string | null
          origem?: string
          telefone_digits?: string
        }
        Relationships: []
      }
      disparos: {
        Row: {
          agendado_fim: string | null
          agendado_para: string | null
          apenas_lgpd: boolean
          concluido_em: string | null
          created_at: string
          created_by: string | null
          data_referencia_diaria: string | null
          enviados: number
          enviados_hoje: number
          evitar_duplicatas_horas: number
          falhas: number
          filtros_snapshot: Json
          id: string
          iniciado_em: string | null
          instancia_id: string | null
          intervalo_max_segundos: number
          intervalo_min_segundos: number
          intervalo_segundos: number
          janela_fim: string | null
          janela_inicio: string | null
          limite_diario: number
          lote_tamanho: number
          nome: string
          optouts: number
          pausa_a_cada: number
          pausa_segundos: number
          prepend_nome: boolean
          prepend_saudacao: boolean
          respeitar_optout: boolean
          segmento_id: string | null
          status: Database["public"]["Enums"]["disparo_status"]
          template: string
          template_id: string | null
          tipo: string
          total: number
          updated_at: string
        }
        Insert: {
          agendado_fim?: string | null
          agendado_para?: string | null
          apenas_lgpd?: boolean
          concluido_em?: string | null
          created_at?: string
          created_by?: string | null
          data_referencia_diaria?: string | null
          enviados?: number
          enviados_hoje?: number
          evitar_duplicatas_horas?: number
          falhas?: number
          filtros_snapshot?: Json
          id?: string
          iniciado_em?: string | null
          instancia_id?: string | null
          intervalo_max_segundos?: number
          intervalo_min_segundos?: number
          intervalo_segundos?: number
          janela_fim?: string | null
          janela_inicio?: string | null
          limite_diario?: number
          lote_tamanho?: number
          nome: string
          optouts?: number
          pausa_a_cada?: number
          pausa_segundos?: number
          prepend_nome?: boolean
          prepend_saudacao?: boolean
          respeitar_optout?: boolean
          segmento_id?: string | null
          status?: Database["public"]["Enums"]["disparo_status"]
          template: string
          template_id?: string | null
          tipo?: string
          total?: number
          updated_at?: string
        }
        Update: {
          agendado_fim?: string | null
          agendado_para?: string | null
          apenas_lgpd?: boolean
          concluido_em?: string | null
          created_at?: string
          created_by?: string | null
          data_referencia_diaria?: string | null
          enviados?: number
          enviados_hoje?: number
          evitar_duplicatas_horas?: number
          falhas?: number
          filtros_snapshot?: Json
          id?: string
          iniciado_em?: string | null
          instancia_id?: string | null
          intervalo_max_segundos?: number
          intervalo_min_segundos?: number
          intervalo_segundos?: number
          janela_fim?: string | null
          janela_inicio?: string | null
          limite_diario?: number
          lote_tamanho?: number
          nome?: string
          optouts?: number
          pausa_a_cada?: number
          pausa_segundos?: number
          prepend_nome?: boolean
          prepend_saudacao?: boolean
          respeitar_optout?: boolean
          segmento_id?: string | null
          status?: Database["public"]["Enums"]["disparo_status"]
          template?: string
          template_id?: string | null
          tipo?: string
          total?: number
          updated_at?: string
        }
        Relationships: []
      }
      eleitor_tags: {
        Row: {
          company_id: string | null
          eleitor_id: string
          tag_id: string
        }
        Insert: {
          company_id?: string | null
          eleitor_id: string
          tag_id: string
        }
        Update: {
          company_id?: string | null
          eleitor_id?: string
          tag_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "eleitor_tags_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "settings_companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "eleitor_tags_eleitor_id_fkey"
            columns: ["eleitor_id"]
            isOneToOne: false
            referencedRelation: "eleitores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "eleitor_tags_eleitor_id_fkey"
            columns: ["eleitor_id"]
            isOneToOne: false
            referencedRelation: "vw_eleitores_consolidado"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "eleitor_tags_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "tags"
            referencedColumns: ["id"]
          },
        ]
      }
      eleitor_visitas: {
        Row: {
          check_in_realizado: boolean | null
          data_visita: string | null
          eleitor_id: string
          id: string
          latitude: number | null
          longitude: number | null
          observacoes: string | null
          usuario_id: string
        }
        Insert: {
          check_in_realizado?: boolean | null
          data_visita?: string | null
          eleitor_id: string
          id?: string
          latitude?: number | null
          longitude?: number | null
          observacoes?: string | null
          usuario_id: string
        }
        Update: {
          check_in_realizado?: boolean | null
          data_visita?: string | null
          eleitor_id?: string
          id?: string
          latitude?: number | null
          longitude?: number | null
          observacoes?: string | null
          usuario_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "eleitor_visitas_eleitor_id_fkey"
            columns: ["eleitor_id"]
            isOneToOne: false
            referencedRelation: "eleitores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "eleitor_visitas_eleitor_id_fkey"
            columns: ["eleitor_id"]
            isOneToOne: false
            referencedRelation: "vw_eleitores_consolidado"
            referencedColumns: ["id"]
          },
        ]
      }
      eleitores: {
        Row: {
          aceite_lgpd: boolean
          ativo: boolean
          bairro: string | null
          cabo_eleitoral_id: string | null
          cabo_id: string | null
          cabo_origem_id: string | null
          cadastrado_via: string
          cep: string | null
          cidade: string | null
          codigo_expira_em: string | null
          codigo_validacao_whatsapp: string | null
          company_id: string | null
          complemento: string | null
          consentimento_lgpd: boolean
          cpf: string | null
          created_at: string
          created_by: string | null
          data_aceite_lgpd: string | null
          data_nascimento: string | null
          data_ultima_consulta: string | null
          data_validacao_whatsapp: string | null
          email: string | null
          genero: string | null
          id: string
          lideranca_id: string | null
          lideranca_origem_id: string | null
          local_votacao: string | null
          motivo_divergencia: string | null
          municipio_eleitoral: string | null
          nome: string
          nome_mae: string | null
          numero: string | null
          observacoes: string | null
          origem: string
          rua: string | null
          score_confianca: number
          score_fidelidade: number | null
          secao_eleitoral: string | null
          status_cadastro: string
          status_validacao_eleitoral: string
          status_validacao_whatsapp: string
          telefone: string
          telefone_original: string | null
          telefone_validado: boolean
          tentativas_validacao: number
          titulo_eleitoral: string | null
          token_cadastro_id: string | null
          uf: string | null
          uf_eleitoral: string | null
          ultima_interacao: string | null
          updated_at: string
          validado: boolean
          validado_em: string | null
          validado_por: string | null
          whatsapp_bloqueado: boolean
          whatsapp_origem: string | null
          zona_eleitoral: string | null
        }
        Insert: {
          aceite_lgpd?: boolean
          ativo?: boolean
          bairro?: string | null
          cabo_eleitoral_id?: string | null
          cabo_id?: string | null
          cabo_origem_id?: string | null
          cadastrado_via?: string
          cep?: string | null
          cidade?: string | null
          codigo_expira_em?: string | null
          codigo_validacao_whatsapp?: string | null
          company_id?: string | null
          complemento?: string | null
          consentimento_lgpd?: boolean
          cpf?: string | null
          created_at?: string
          created_by?: string | null
          data_aceite_lgpd?: string | null
          data_nascimento?: string | null
          data_ultima_consulta?: string | null
          data_validacao_whatsapp?: string | null
          email?: string | null
          genero?: string | null
          id?: string
          lideranca_id?: string | null
          lideranca_origem_id?: string | null
          local_votacao?: string | null
          motivo_divergencia?: string | null
          municipio_eleitoral?: string | null
          nome: string
          nome_mae?: string | null
          numero?: string | null
          observacoes?: string | null
          origem?: string
          rua?: string | null
          score_confianca?: number
          score_fidelidade?: number | null
          secao_eleitoral?: string | null
          status_cadastro?: string
          status_validacao_eleitoral?: string
          status_validacao_whatsapp?: string
          telefone: string
          telefone_original?: string | null
          telefone_validado?: boolean
          tentativas_validacao?: number
          titulo_eleitoral?: string | null
          token_cadastro_id?: string | null
          uf?: string | null
          uf_eleitoral?: string | null
          ultima_interacao?: string | null
          updated_at?: string
          validado?: boolean
          validado_em?: string | null
          validado_por?: string | null
          whatsapp_bloqueado?: boolean
          whatsapp_origem?: string | null
          zona_eleitoral?: string | null
        }
        Update: {
          aceite_lgpd?: boolean
          ativo?: boolean
          bairro?: string | null
          cabo_eleitoral_id?: string | null
          cabo_id?: string | null
          cabo_origem_id?: string | null
          cadastrado_via?: string
          cep?: string | null
          cidade?: string | null
          codigo_expira_em?: string | null
          codigo_validacao_whatsapp?: string | null
          company_id?: string | null
          complemento?: string | null
          consentimento_lgpd?: boolean
          cpf?: string | null
          created_at?: string
          created_by?: string | null
          data_aceite_lgpd?: string | null
          data_nascimento?: string | null
          data_ultima_consulta?: string | null
          data_validacao_whatsapp?: string | null
          email?: string | null
          genero?: string | null
          id?: string
          lideranca_id?: string | null
          lideranca_origem_id?: string | null
          local_votacao?: string | null
          motivo_divergencia?: string | null
          municipio_eleitoral?: string | null
          nome?: string
          nome_mae?: string | null
          numero?: string | null
          observacoes?: string | null
          origem?: string
          rua?: string | null
          score_confianca?: number
          score_fidelidade?: number | null
          secao_eleitoral?: string | null
          status_cadastro?: string
          status_validacao_eleitoral?: string
          status_validacao_whatsapp?: string
          telefone?: string
          telefone_original?: string | null
          telefone_validado?: boolean
          tentativas_validacao?: number
          titulo_eleitoral?: string | null
          token_cadastro_id?: string | null
          uf?: string | null
          uf_eleitoral?: string | null
          ultima_interacao?: string | null
          updated_at?: string
          validado?: boolean
          validado_em?: string | null
          validado_por?: string | null
          whatsapp_bloqueado?: boolean
          whatsapp_origem?: string | null
          zona_eleitoral?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "eleitores_cabo_eleitoral_id_fkey"
            columns: ["cabo_eleitoral_id"]
            isOneToOne: false
            referencedRelation: "cabos_eleitorais"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "eleitores_cabo_id_fkey"
            columns: ["cabo_id"]
            isOneToOne: false
            referencedRelation: "cabos_eleitorais"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "eleitores_cabo_origem_id_fkey"
            columns: ["cabo_origem_id"]
            isOneToOne: false
            referencedRelation: "cabos_eleitorais"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "eleitores_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "settings_companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "eleitores_lideranca_id_fkey"
            columns: ["lideranca_id"]
            isOneToOne: false
            referencedRelation: "liderancas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "eleitores_lideranca_origem_id_fkey"
            columns: ["lideranca_origem_id"]
            isOneToOne: false
            referencedRelation: "liderancas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "eleitores_token_cadastro_id_fkey"
            columns: ["token_cadastro_id"]
            isOneToOne: false
            referencedRelation: "tokens_auto_cadastro"
            referencedColumns: ["id"]
          },
        ]
      }
      evento_inscricoes: {
        Row: {
          cargo: string | null
          checkin_em: string | null
          company_id: string | null
          cpf: string | null
          created_at: string
          eleitor_id: string | null
          email: string | null
          evento_id: string
          id: string
          nome: string | null
          observacoes: string | null
          origem: string
          presente: boolean
          status: string
          telefone: string | null
        }
        Insert: {
          cargo?: string | null
          checkin_em?: string | null
          company_id?: string | null
          cpf?: string | null
          created_at?: string
          eleitor_id?: string | null
          email?: string | null
          evento_id: string
          id?: string
          nome?: string | null
          observacoes?: string | null
          origem?: string
          presente?: boolean
          status?: string
          telefone?: string | null
        }
        Update: {
          cargo?: string | null
          checkin_em?: string | null
          company_id?: string | null
          cpf?: string | null
          created_at?: string
          eleitor_id?: string | null
          email?: string | null
          evento_id?: string
          id?: string
          nome?: string | null
          observacoes?: string | null
          origem?: string
          presente?: boolean
          status?: string
          telefone?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "evento_inscricoes_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "settings_companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evento_inscricoes_eleitor_id_fkey"
            columns: ["eleitor_id"]
            isOneToOne: false
            referencedRelation: "eleitores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evento_inscricoes_eleitor_id_fkey"
            columns: ["eleitor_id"]
            isOneToOne: false
            referencedRelation: "vw_eleitores_consolidado"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evento_inscricoes_evento_id_fkey"
            columns: ["evento_id"]
            isOneToOne: false
            referencedRelation: "eventos"
            referencedColumns: ["id"]
          },
        ]
      }
      evento_tipos: {
        Row: {
          ativo: boolean
          created_at: string
          created_by: string | null
          id: string
          nome: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          created_by?: string | null
          id?: string
          nome: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          created_by?: string | null
          id?: string
          nome?: string
        }
        Relationships: []
      }
      eventos: {
        Row: {
          ativo: boolean
          bairro: string | null
          cep: string | null
          checkin_token: string | null
          cidade: string | null
          company_id: string | null
          complemento: string | null
          created_at: string
          created_by: string | null
          data_hora: string
          descricao: string | null
          id: string
          limite_inscritos: number | null
          local: string
          nome: string
          numero: string | null
          responsavel_id: string | null
          rua: string | null
          status: string
          tipo: string
          uf: string | null
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          bairro?: string | null
          cep?: string | null
          checkin_token?: string | null
          cidade?: string | null
          company_id?: string | null
          complemento?: string | null
          created_at?: string
          created_by?: string | null
          data_hora: string
          descricao?: string | null
          id?: string
          limite_inscritos?: number | null
          local: string
          nome: string
          numero?: string | null
          responsavel_id?: string | null
          rua?: string | null
          status?: string
          tipo: string
          uf?: string | null
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          bairro?: string | null
          cep?: string | null
          checkin_token?: string | null
          cidade?: string | null
          company_id?: string | null
          complemento?: string | null
          created_at?: string
          created_by?: string | null
          data_hora?: string
          descricao?: string | null
          id?: string
          limite_inscritos?: number | null
          local?: string
          nome?: string
          numero?: string | null
          responsavel_id?: string | null
          rua?: string | null
          status?: string
          tipo?: string
          uf?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "eventos_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "settings_companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "eventos_responsavel_id_fkey"
            columns: ["responsavel_id"]
            isOneToOne: false
            referencedRelation: "liderancas"
            referencedColumns: ["id"]
          },
        ]
      }
      formulario_respostas: {
        Row: {
          company_id: string
          created_at: string
          formulario_id: string
          id: string
          ip: string | null
          responses: Json
          user_agent: string | null
        }
        Insert: {
          company_id: string
          created_at?: string
          formulario_id: string
          id?: string
          ip?: string | null
          responses?: Json
          user_agent?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string
          formulario_id?: string
          id?: string
          ip?: string | null
          responses?: Json
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "formulario_respostas_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "settings_companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "formulario_respostas_formulario_id_fkey"
            columns: ["formulario_id"]
            isOneToOne: false
            referencedRelation: "formularios_publicos"
            referencedColumns: ["id"]
          },
        ]
      }
      formularios_publicos: {
        Row: {
          company_id: string
          created_at: string
          created_by: string | null
          customization: Json
          description: string | null
          fields: Json
          id: string
          link_token: string
          name: string
          status: string
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          created_by?: string | null
          customization?: Json
          description?: string | null
          fields?: Json
          id?: string
          link_token?: string
          name: string
          status?: string
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          created_by?: string | null
          customization?: Json
          description?: string | null
          fields?: Json
          id?: string
          link_token?: string
          name?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "formularios_publicos_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "settings_companies"
            referencedColumns: ["id"]
          },
        ]
      }
      gamificacao_badges: {
        Row: {
          ativo: boolean
          company_id: string | null
          cor: string
          created_at: string
          criterio: string | null
          descricao: string | null
          icone: string
          id: string
          nome: string
          pontos: number
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          company_id?: string | null
          cor?: string
          created_at?: string
          criterio?: string | null
          descricao?: string | null
          icone?: string
          id?: string
          nome: string
          pontos?: number
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          company_id?: string | null
          cor?: string
          created_at?: string
          criterio?: string | null
          descricao?: string | null
          icone?: string
          id?: string
          nome?: string
          pontos?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "gamificacao_badges_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "settings_companies"
            referencedColumns: ["id"]
          },
        ]
      }
      gamificacao_badges_conquistadas: {
        Row: {
          badge_id: string
          company_id: string | null
          conquistada_em: string
          id: string
          user_id: string
        }
        Insert: {
          badge_id: string
          company_id?: string | null
          conquistada_em?: string
          id?: string
          user_id: string
        }
        Update: {
          badge_id?: string
          company_id?: string | null
          conquistada_em?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "gamificacao_badges_conquistadas_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "settings_companies"
            referencedColumns: ["id"]
          },
        ]
      }
      gamificacao_desafio_progresso: {
        Row: {
          company_id: string | null
          concluido: boolean
          concluido_em: string | null
          created_at: string
          desafio_id: string
          id: string
          progresso: number
          updated_at: string
          user_id: string
        }
        Insert: {
          company_id?: string | null
          concluido?: boolean
          concluido_em?: string | null
          created_at?: string
          desafio_id: string
          id?: string
          progresso?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          company_id?: string | null
          concluido?: boolean
          concluido_em?: string | null
          created_at?: string
          desafio_id?: string
          id?: string
          progresso?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "gamificacao_desafio_progresso_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "settings_companies"
            referencedColumns: ["id"]
          },
        ]
      }
      gamificacao_desafios: {
        Row: {
          ativo: boolean
          badge_id: string | null
          company_id: string | null
          created_at: string
          created_by: string | null
          data_fim: string | null
          data_inicio: string
          descricao: string | null
          id: string
          meta: number
          metrica: string
          recompensa_pontos: number
          titulo: string
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          badge_id?: string | null
          company_id?: string | null
          created_at?: string
          created_by?: string | null
          data_fim?: string | null
          data_inicio?: string
          descricao?: string | null
          id?: string
          meta?: number
          metrica?: string
          recompensa_pontos?: number
          titulo: string
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          badge_id?: string | null
          company_id?: string | null
          created_at?: string
          created_by?: string | null
          data_fim?: string | null
          data_inicio?: string
          descricao?: string | null
          id?: string
          meta?: number
          metrica?: string
          recompensa_pontos?: number
          titulo?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "gamificacao_desafios_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "settings_companies"
            referencedColumns: ["id"]
          },
        ]
      }
      gamificacao_pontuacoes: {
        Row: {
          company_id: string | null
          created_at: string
          id: string
          motivo: string
          pontos: number
          referencia_id: string | null
          referencia_tipo: string | null
          user_id: string
        }
        Insert: {
          company_id?: string | null
          created_at?: string
          id?: string
          motivo: string
          pontos?: number
          referencia_id?: string | null
          referencia_tipo?: string | null
          user_id: string
        }
        Update: {
          company_id?: string | null
          created_at?: string
          id?: string
          motivo?: string
          pontos?: number
          referencia_id?: string | null
          referencia_tipo?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "gamificacao_pontuacoes_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "settings_companies"
            referencedColumns: ["id"]
          },
        ]
      }
      integracoes_config: {
        Row: {
          chave: string
          created_at: string
          descricao: string | null
          id: string
          updated_at: string
          valor: Json
        }
        Insert: {
          chave: string
          created_at?: string
          descricao?: string | null
          id?: string
          updated_at?: string
          valor?: Json
        }
        Update: {
          chave?: string
          created_at?: string
          descricao?: string | null
          id?: string
          updated_at?: string
          valor?: Json
        }
        Relationships: []
      }
      lgpd_consentimentos: {
        Row: {
          aceite: boolean
          base_legal: string
          canal: string | null
          company_id: string | null
          created_at: string
          created_by: string | null
          eleitor_id: string | null
          finalidade: string
          id: string
          ip: string | null
          revogado_em: string | null
          revogado_por: string | null
          texto_versao: string | null
          titular_documento: string | null
          titular_nome: string | null
          user_agent: string | null
        }
        Insert: {
          aceite?: boolean
          base_legal?: string
          canal?: string | null
          company_id?: string | null
          created_at?: string
          created_by?: string | null
          eleitor_id?: string | null
          finalidade: string
          id?: string
          ip?: string | null
          revogado_em?: string | null
          revogado_por?: string | null
          texto_versao?: string | null
          titular_documento?: string | null
          titular_nome?: string | null
          user_agent?: string | null
        }
        Update: {
          aceite?: boolean
          base_legal?: string
          canal?: string | null
          company_id?: string | null
          created_at?: string
          created_by?: string | null
          eleitor_id?: string | null
          finalidade?: string
          id?: string
          ip?: string | null
          revogado_em?: string | null
          revogado_por?: string | null
          texto_versao?: string | null
          titular_documento?: string | null
          titular_nome?: string | null
          user_agent?: string | null
        }
        Relationships: []
      }
      lgpd_solicitacoes: {
        Row: {
          atendido_em: string | null
          atendido_por: string | null
          company_id: string | null
          created_at: string
          eleitor_id: string | null
          id: string
          motivo: string | null
          payload: Json | null
          resposta: string | null
          solicitado_por: string | null
          status: Database["public"]["Enums"]["lgpd_solicitacao_status"]
          tipo: Database["public"]["Enums"]["lgpd_solicitacao_tipo"]
        }
        Insert: {
          atendido_em?: string | null
          atendido_por?: string | null
          company_id?: string | null
          created_at?: string
          eleitor_id?: string | null
          id?: string
          motivo?: string | null
          payload?: Json | null
          resposta?: string | null
          solicitado_por?: string | null
          status?: Database["public"]["Enums"]["lgpd_solicitacao_status"]
          tipo: Database["public"]["Enums"]["lgpd_solicitacao_tipo"]
        }
        Update: {
          atendido_em?: string | null
          atendido_por?: string | null
          company_id?: string | null
          created_at?: string
          eleitor_id?: string | null
          id?: string
          motivo?: string | null
          payload?: Json | null
          resposta?: string | null
          solicitado_por?: string | null
          status?: Database["public"]["Enums"]["lgpd_solicitacao_status"]
          tipo?: Database["public"]["Enums"]["lgpd_solicitacao_tipo"]
        }
        Relationships: []
      }
      liderancas: {
        Row: {
          ativo: boolean
          bairro: string | null
          bairros: Json | null
          cep: string | null
          cidade: string | null
          company_id: string | null
          complemento: string | null
          created_at: string
          created_by: string | null
          data_fim: string | null
          data_inicio: string | null
          email: string | null
          id: string
          meta: number
          nome: string
          numero: string | null
          observacoes: string | null
          organizacao_id: string | null
          regiao: string | null
          rua: string | null
          status: string
          superior_id: string | null
          telefone: string | null
          uf: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          ativo?: boolean
          bairro?: string | null
          bairros?: Json | null
          cep?: string | null
          cidade?: string | null
          company_id?: string | null
          complemento?: string | null
          created_at?: string
          created_by?: string | null
          data_fim?: string | null
          data_inicio?: string | null
          email?: string | null
          id?: string
          meta?: number
          nome: string
          numero?: string | null
          observacoes?: string | null
          organizacao_id?: string | null
          regiao?: string | null
          rua?: string | null
          status?: string
          superior_id?: string | null
          telefone?: string | null
          uf?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          ativo?: boolean
          bairro?: string | null
          bairros?: Json | null
          cep?: string | null
          cidade?: string | null
          company_id?: string | null
          complemento?: string | null
          created_at?: string
          created_by?: string | null
          data_fim?: string | null
          data_inicio?: string | null
          email?: string | null
          id?: string
          meta?: number
          nome?: string
          numero?: string | null
          observacoes?: string | null
          organizacao_id?: string | null
          regiao?: string | null
          rua?: string | null
          status?: string
          superior_id?: string | null
          telefone?: string | null
          uf?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "liderancas_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "settings_companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "liderancas_organizacao_id_fkey"
            columns: ["organizacao_id"]
            isOneToOne: false
            referencedRelation: "organizacoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "liderancas_superior_id_fkey"
            columns: ["superior_id"]
            isOneToOne: false
            referencedRelation: "liderancas"
            referencedColumns: ["id"]
          },
        ]
      }
      materiais_distribuicao: {
        Row: {
          cabo_id: string | null
          data_entrega: string | null
          id: string
          lideranca_id: string | null
          material_id: string | null
          quantidade: number
          recebido_por: string | null
        }
        Insert: {
          cabo_id?: string | null
          data_entrega?: string | null
          id?: string
          lideranca_id?: string | null
          material_id?: string | null
          quantidade: number
          recebido_por?: string | null
        }
        Update: {
          cabo_id?: string | null
          data_entrega?: string | null
          id?: string
          lideranca_id?: string | null
          material_id?: string | null
          quantidade?: number
          recebido_por?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "materiais_distribuicao_cabo_id_fkey"
            columns: ["cabo_id"]
            isOneToOne: false
            referencedRelation: "cabos_eleitorais"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "materiais_distribuicao_lideranca_id_fkey"
            columns: ["lideranca_id"]
            isOneToOne: false
            referencedRelation: "liderancas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "materiais_distribuicao_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "materiais_estoque"
            referencedColumns: ["id"]
          },
        ]
      }
      materiais_estoque: {
        Row: {
          created_at: string | null
          id: string
          nome: string
          quantidade_total: number | null
          tipo: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          nome: string
          quantidade_total?: number | null
          tipo?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          nome?: string
          quantidade_total?: number | null
          tipo?: string | null
        }
        Relationships: []
      }
      mensagem_envios: {
        Row: {
          canal: string
          conteudo: string
          created_at: string
          destinatario_nome: string | null
          destinatario_telefone: string
          eleitor_id: string | null
          entregue_em: string | null
          enviado_em: string | null
          erro: string | null
          id: string
          lido_em: string | null
          mensagem_id: string
          metadata: Json
          provedor: string | null
          provedor_message_id: string | null
          status: string
          tentativas: number
          updated_at: string
        }
        Insert: {
          canal: string
          conteudo: string
          created_at?: string
          destinatario_nome?: string | null
          destinatario_telefone: string
          eleitor_id?: string | null
          entregue_em?: string | null
          enviado_em?: string | null
          erro?: string | null
          id?: string
          lido_em?: string | null
          mensagem_id: string
          metadata?: Json
          provedor?: string | null
          provedor_message_id?: string | null
          status?: string
          tentativas?: number
          updated_at?: string
        }
        Update: {
          canal?: string
          conteudo?: string
          created_at?: string
          destinatario_nome?: string | null
          destinatario_telefone?: string
          eleitor_id?: string | null
          entregue_em?: string | null
          enviado_em?: string | null
          erro?: string | null
          id?: string
          lido_em?: string | null
          mensagem_id?: string
          metadata?: Json
          provedor?: string | null
          provedor_message_id?: string | null
          status?: string
          tentativas?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "mensagem_envios_mensagem_id_fkey"
            columns: ["mensagem_id"]
            isOneToOne: false
            referencedRelation: "mensagens"
            referencedColumns: ["id"]
          },
        ]
      }
      mensagens: {
        Row: {
          canal: string
          conteudo: string
          created_at: string
          enviado_por: string | null
          filtro_bairro: string | null
          filtro_tag_id: string | null
          id: string
          nome_campanha: string | null
          publico_alvo: string
          segmento_id: string | null
          status: string
          total_destinatarios: number
        }
        Insert: {
          canal: string
          conteudo: string
          created_at?: string
          enviado_por?: string | null
          filtro_bairro?: string | null
          filtro_tag_id?: string | null
          id?: string
          nome_campanha?: string | null
          publico_alvo?: string
          segmento_id?: string | null
          status?: string
          total_destinatarios?: number
        }
        Update: {
          canal?: string
          conteudo?: string
          created_at?: string
          enviado_por?: string | null
          filtro_bairro?: string | null
          filtro_tag_id?: string | null
          id?: string
          nome_campanha?: string | null
          publico_alvo?: string
          segmento_id?: string | null
          status?: string
          total_destinatarios?: number
        }
        Relationships: [
          {
            foreignKeyName: "mensagens_filtro_tag_id_fkey"
            columns: ["filtro_tag_id"]
            isOneToOne: false
            referencedRelation: "tags"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mensagens_segmento_id_fkey"
            columns: ["segmento_id"]
            isOneToOne: false
            referencedRelation: "segmentos"
            referencedColumns: ["id"]
          },
        ]
      }
      mensagens_externas: {
        Row: {
          canal: Database["public"]["Enums"]["canal_externo"]
          conteudo: string
          created_at: string
          destinatario: string
          destinatario_nome: string | null
          enviado_em: string | null
          erro: string | null
          id: string
          metadata: Json | null
          provedor: string | null
          provedor_message_id: string | null
          status: Database["public"]["Enums"]["mensagem_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          canal: Database["public"]["Enums"]["canal_externo"]
          conteudo: string
          created_at?: string
          destinatario: string
          destinatario_nome?: string | null
          enviado_em?: string | null
          erro?: string | null
          id?: string
          metadata?: Json | null
          provedor?: string | null
          provedor_message_id?: string | null
          status?: Database["public"]["Enums"]["mensagem_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          canal?: Database["public"]["Enums"]["canal_externo"]
          conteudo?: string
          created_at?: string
          destinatario?: string
          destinatario_nome?: string | null
          enviado_em?: string | null
          erro?: string | null
          id?: string
          metadata?: Json | null
          provedor?: string | null
          provedor_message_id?: string | null
          status?: Database["public"]["Enums"]["mensagem_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      metas_captacao: {
        Row: {
          ativo: boolean
          cabo_eleitoral_id: string | null
          company_id: string
          created_at: string
          created_by: string | null
          data_fim: string
          data_inicio: string
          descricao: string | null
          id: string
          lideranca_id: string | null
          quantidade_alvo: number
          tipo_periodo: string
          titulo: string
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          cabo_eleitoral_id?: string | null
          company_id: string
          created_at?: string
          created_by?: string | null
          data_fim: string
          data_inicio: string
          descricao?: string | null
          id?: string
          lideranca_id?: string | null
          quantidade_alvo: number
          tipo_periodo?: string
          titulo: string
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          cabo_eleitoral_id?: string | null
          company_id?: string
          created_at?: string
          created_by?: string | null
          data_fim?: string
          data_inicio?: string
          descricao?: string | null
          id?: string
          lideranca_id?: string | null
          quantidade_alvo?: number
          tipo_periodo?: string
          titulo?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "metas_captacao_cabo_eleitoral_id_fkey"
            columns: ["cabo_eleitoral_id"]
            isOneToOne: false
            referencedRelation: "cabos_eleitorais"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "metas_captacao_lideranca_id_fkey"
            columns: ["lideranca_id"]
            isOneToOne: false
            referencedRelation: "liderancas"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          lida: boolean
          link: string | null
          mensagem: string | null
          metadata: Json
          tipo: string
          titulo: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          lida?: boolean
          link?: string | null
          mensagem?: string | null
          metadata?: Json
          tipo?: string
          titulo: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          lida?: boolean
          link?: string | null
          mensagem?: string | null
          metadata?: Json
          tipo?: string
          titulo?: string
          user_id?: string
        }
        Relationships: []
      }
      organizacoes: {
        Row: {
          ativo: boolean
          bairro: string | null
          cep: string | null
          cidade: string | null
          complemento: string | null
          created_at: string
          created_by: string | null
          id: string
          nome: string
          numero: string | null
          observacoes: string | null
          responsavel_id: string | null
          rua: string | null
          tipo: string
          uf: string | null
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          bairro?: string | null
          cep?: string | null
          cidade?: string | null
          complemento?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          nome: string
          numero?: string | null
          observacoes?: string | null
          responsavel_id?: string | null
          rua?: string | null
          tipo?: string
          uf?: string | null
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          bairro?: string | null
          cep?: string | null
          cidade?: string | null
          complemento?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          nome?: string
          numero?: string | null
          observacoes?: string | null
          responsavel_id?: string | null
          rua?: string | null
          tipo?: string
          uf?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      pesquisa_perguntas: {
        Row: {
          company_id: string | null
          created_at: string
          id: string
          opcoes: Json | null
          ordem: number
          pesquisa_id: string
          texto: string
          tipo: Database["public"]["Enums"]["pergunta_tipo"]
        }
        Insert: {
          company_id?: string | null
          created_at?: string
          id?: string
          opcoes?: Json | null
          ordem?: number
          pesquisa_id: string
          texto: string
          tipo: Database["public"]["Enums"]["pergunta_tipo"]
        }
        Update: {
          company_id?: string | null
          created_at?: string
          id?: string
          opcoes?: Json | null
          ordem?: number
          pesquisa_id?: string
          texto?: string
          tipo?: Database["public"]["Enums"]["pergunta_tipo"]
        }
        Relationships: [
          {
            foreignKeyName: "pesquisa_perguntas_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "settings_companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pesquisa_perguntas_pesquisa_id_fkey"
            columns: ["pesquisa_id"]
            isOneToOne: false
            referencedRelation: "pesquisas"
            referencedColumns: ["id"]
          },
        ]
      }
      pesquisa_respostas: {
        Row: {
          company_id: string | null
          created_at: string
          eleitor_id: string | null
          id: string
          participante_nome: string | null
          participante_telefone: string | null
          pergunta_id: string
          pesquisa_id: string
          resposta: string
          sessao_id: string
        }
        Insert: {
          company_id?: string | null
          created_at?: string
          eleitor_id?: string | null
          id?: string
          participante_nome?: string | null
          participante_telefone?: string | null
          pergunta_id: string
          pesquisa_id: string
          resposta: string
          sessao_id: string
        }
        Update: {
          company_id?: string | null
          created_at?: string
          eleitor_id?: string | null
          id?: string
          participante_nome?: string | null
          participante_telefone?: string | null
          pergunta_id?: string
          pesquisa_id?: string
          resposta?: string
          sessao_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pesquisa_respostas_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "settings_companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pesquisa_respostas_eleitor_id_fkey"
            columns: ["eleitor_id"]
            isOneToOne: false
            referencedRelation: "eleitores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pesquisa_respostas_eleitor_id_fkey"
            columns: ["eleitor_id"]
            isOneToOne: false
            referencedRelation: "vw_eleitores_consolidado"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pesquisa_respostas_pergunta_id_fkey"
            columns: ["pergunta_id"]
            isOneToOne: false
            referencedRelation: "pesquisa_perguntas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pesquisa_respostas_pesquisa_id_fkey"
            columns: ["pesquisa_id"]
            isOneToOne: false
            referencedRelation: "pesquisas"
            referencedColumns: ["id"]
          },
        ]
      }
      pesquisas: {
        Row: {
          company_id: string | null
          created_at: string
          created_by: string | null
          filtro_bairro: string | null
          filtro_tag_id: string | null
          id: string
          slug: string
          status: Database["public"]["Enums"]["pesquisa_status"]
          tipo: string
          titulo: string
          updated_at: string
        }
        Insert: {
          company_id?: string | null
          created_at?: string
          created_by?: string | null
          filtro_bairro?: string | null
          filtro_tag_id?: string | null
          id?: string
          slug?: string
          status?: Database["public"]["Enums"]["pesquisa_status"]
          tipo: string
          titulo: string
          updated_at?: string
        }
        Update: {
          company_id?: string | null
          created_at?: string
          created_by?: string | null
          filtro_bairro?: string | null
          filtro_tag_id?: string | null
          id?: string
          slug?: string
          status?: Database["public"]["Enums"]["pesquisa_status"]
          tipo?: string
          titulo?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pesquisas_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "settings_companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pesquisas_filtro_tag_id_fkey"
            columns: ["filtro_tag_id"]
            isOneToOne: false
            referencedRelation: "tags"
            referencedColumns: ["id"]
          },
        ]
      }
      posts_sociais: {
        Row: {
          agendado_para: string | null
          company_id: string | null
          conteudo: string | null
          created_at: string
          id: string
          imagem_url: string | null
          link: string | null
          metadata: Json | null
          publicado_em: string | null
          rede: Database["public"]["Enums"]["rede_social"]
          status: Database["public"]["Enums"]["post_status"]
          titulo: string
          updated_at: string
          user_id: string
        }
        Insert: {
          agendado_para?: string | null
          company_id?: string | null
          conteudo?: string | null
          created_at?: string
          id?: string
          imagem_url?: string | null
          link?: string | null
          metadata?: Json | null
          publicado_em?: string | null
          rede: Database["public"]["Enums"]["rede_social"]
          status?: Database["public"]["Enums"]["post_status"]
          titulo: string
          updated_at?: string
          user_id: string
        }
        Update: {
          agendado_para?: string | null
          company_id?: string | null
          conteudo?: string | null
          created_at?: string
          id?: string
          imagem_url?: string | null
          link?: string | null
          metadata?: Json | null
          publicado_em?: string | null
          rede?: Database["public"]["Enums"]["rede_social"]
          status?: Database["public"]["Enums"]["post_status"]
          titulo?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "posts_sociais_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "settings_companies"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          ativo: boolean
          avatar_url: string | null
          bairro: string | null
          cargo: string | null
          cep: string | null
          cidade: string | null
          complemento: string | null
          created_at: string
          email: string
          id: string
          nome: string
          numero: string | null
          rua: string | null
          telefone: string | null
          uf: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          ativo?: boolean
          avatar_url?: string | null
          bairro?: string | null
          cargo?: string | null
          cep?: string | null
          cidade?: string | null
          complemento?: string | null
          created_at?: string
          email: string
          id?: string
          nome: string
          numero?: string | null
          rua?: string | null
          telefone?: string | null
          uf?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          ativo?: boolean
          avatar_url?: string | null
          bairro?: string | null
          cargo?: string | null
          cep?: string | null
          cidade?: string | null
          complemento?: string | null
          created_at?: string
          email?: string
          id?: string
          nome?: string
          numero?: string | null
          rua?: string | null
          telefone?: string | null
          uf?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string
          endpoint: string
          id: string
          p256dh: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          auth: string
          created_at?: string
          endpoint: string
          id?: string
          p256dh: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          auth?: string
          created_at?: string
          endpoint?: string
          id?: string
          p256dh?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      relatorios_customizados: {
        Row: {
          agendado: boolean
          company_id: string
          created_at: string
          created_by: string | null
          filtros: Json
          frequencia: string | null
          id: string
          name: string
          proxima_execucao: string | null
          tipo: string
          updated_at: string
        }
        Insert: {
          agendado?: boolean
          company_id: string
          created_at?: string
          created_by?: string | null
          filtros?: Json
          frequencia?: string | null
          id?: string
          name: string
          proxima_execucao?: string | null
          tipo: string
          updated_at?: string
        }
        Update: {
          agendado?: boolean
          company_id?: string
          created_at?: string
          created_by?: string | null
          filtros?: Json
          frequencia?: string | null
          id?: string
          name?: string
          proxima_execucao?: string | null
          tipo?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "relatorios_customizados_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "settings_companies"
            referencedColumns: ["id"]
          },
        ]
      }
      resultados_eleitorais_tse: {
        Row: {
          ano_eleicao: number
          candidato: string | null
          cargo: string
          codigo_cargo: string | null
          codigo_municipio: string | null
          company_id: string | null
          data_importacao: string
          fonte_arquivo: string | null
          hash_registro: string | null
          id: string
          municipio: string | null
          numero_candidato: string | null
          partido: string | null
          secao_eleitoral: string | null
          status_importacao: string
          turno: number
          uf: string
          votos: number
          zona_eleitoral: string | null
        }
        Insert: {
          ano_eleicao: number
          candidato?: string | null
          cargo: string
          codigo_cargo?: string | null
          codigo_municipio?: string | null
          company_id?: string | null
          data_importacao?: string
          fonte_arquivo?: string | null
          hash_registro?: string | null
          id?: string
          municipio?: string | null
          numero_candidato?: string | null
          partido?: string | null
          secao_eleitoral?: string | null
          status_importacao?: string
          turno?: number
          uf: string
          votos?: number
          zona_eleitoral?: string | null
        }
        Update: {
          ano_eleicao?: number
          candidato?: string | null
          cargo?: string
          codigo_cargo?: string | null
          codigo_municipio?: string | null
          company_id?: string | null
          data_importacao?: string
          fonte_arquivo?: string | null
          hash_registro?: string | null
          id?: string
          municipio?: string | null
          numero_candidato?: string | null
          partido?: string | null
          secao_eleitoral?: string | null
          status_importacao?: string
          turno?: number
          uf?: string
          votos?: number
          zona_eleitoral?: string | null
        }
        Relationships: []
      }
      role_modulos: {
        Row: {
          created_at: string
          id: string
          modulos: string[]
          role: Database["public"]["Enums"]["app_role"]
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          modulos?: string[]
          role: Database["public"]["Enums"]["app_role"]
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          modulos?: string[]
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      segmentos: {
        Row: {
          company_id: string | null
          cor: string
          created_at: string
          created_by: string | null
          descricao: string | null
          filtros: Json
          icone: string
          id: string
          nome: string
          total_cache: number
          ultima_atualizacao: string | null
          updated_at: string
        }
        Insert: {
          company_id?: string | null
          cor?: string
          created_at?: string
          created_by?: string | null
          descricao?: string | null
          filtros?: Json
          icone?: string
          id?: string
          nome: string
          total_cache?: number
          ultima_atualizacao?: string | null
          updated_at?: string
        }
        Update: {
          company_id?: string | null
          cor?: string
          created_at?: string
          created_by?: string | null
          descricao?: string | null
          filtros?: Json
          icone?: string
          id?: string
          nome?: string
          total_cache?: number
          ultima_atualizacao?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "segmentos_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "settings_companies"
            referencedColumns: ["id"]
          },
        ]
      }
      settings_audit_logs: {
        Row: {
          action: string
          company_id: string | null
          created_at: string
          details: Json | null
          entity_id: string | null
          entity_type: string | null
          id: string
          ip_address: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          company_id?: string | null
          created_at?: string
          details?: Json | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          ip_address?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          company_id?: string | null
          created_at?: string
          details?: Json | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          ip_address?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "settings_audit_logs_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "settings_companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "settings_audit_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "settings_users"
            referencedColumns: ["id"]
          },
        ]
      }
      settings_companies: {
        Row: {
          cnpj: string | null
          created_at: string
          id: string
          nome_fantasia: string
          plan: string
          razao_social: string
          status: string
          updated_at: string
        }
        Insert: {
          cnpj?: string | null
          created_at?: string
          id?: string
          nome_fantasia: string
          plan?: string
          razao_social: string
          status?: string
          updated_at?: string
        }
        Update: {
          cnpj?: string | null
          created_at?: string
          id?: string
          nome_fantasia?: string
          plan?: string
          razao_social?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      settings_global: {
        Row: {
          active_modules: Json
          company_id: string
          feature_flags: Json
          system_name: string
          timezone: string
          updated_at: string
        }
        Insert: {
          active_modules?: Json
          company_id: string
          feature_flags?: Json
          system_name?: string
          timezone?: string
          updated_at?: string
        }
        Update: {
          active_modules?: Json
          company_id?: string
          feature_flags?: Json
          system_name?: string
          timezone?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "settings_global_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: true
            referencedRelation: "settings_companies"
            referencedColumns: ["id"]
          },
        ]
      }
      settings_permissions: {
        Row: {
          description: string
          id: string
          module: string
        }
        Insert: {
          description: string
          id: string
          module: string
        }
        Update: {
          description?: string
          id?: string
          module?: string
        }
        Relationships: []
      }
      settings_profile_permissions: {
        Row: {
          permission_id: string
          profile_id: string
        }
        Insert: {
          permission_id: string
          profile_id: string
        }
        Update: {
          permission_id?: string
          profile_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "settings_profile_permissions_permission_id_fkey"
            columns: ["permission_id"]
            isOneToOne: false
            referencedRelation: "settings_permissions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "settings_profile_permissions_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "settings_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      settings_profiles: {
        Row: {
          company_id: string | null
          created_at: string
          descricao: string | null
          id: string
          is_system_default: boolean
          nome: string
        }
        Insert: {
          company_id?: string | null
          created_at?: string
          descricao?: string | null
          id?: string
          is_system_default?: boolean
          nome: string
        }
        Update: {
          company_id?: string | null
          created_at?: string
          descricao?: string | null
          id?: string
          is_system_default?: boolean
          nome?: string
        }
        Relationships: [
          {
            foreignKeyName: "settings_profiles_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "settings_companies"
            referencedColumns: ["id"]
          },
        ]
      }
      settings_user_companies: {
        Row: {
          company_id: string
          created_at: string
          is_default: boolean
          profile_id: string | null
          status: string
          user_id: string
        }
        Insert: {
          company_id: string
          created_at?: string
          is_default?: boolean
          profile_id?: string | null
          status?: string
          user_id: string
        }
        Update: {
          company_id?: string
          created_at?: string
          is_default?: boolean
          profile_id?: string | null
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "settings_user_companies_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "settings_companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "settings_user_companies_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "settings_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "settings_user_companies_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "settings_users"
            referencedColumns: ["id"]
          },
        ]
      }
      settings_users: {
        Row: {
          active_company_id: string | null
          created_at: string
          email: string
          id: string
          is_super_admin: boolean
          nome: string
          status: string
          updated_at: string
        }
        Insert: {
          active_company_id?: string | null
          created_at?: string
          email: string
          id: string
          is_super_admin?: boolean
          nome: string
          status?: string
          updated_at?: string
        }
        Update: {
          active_company_id?: string | null
          created_at?: string
          email?: string
          id?: string
          is_super_admin?: boolean
          nome?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "settings_users_active_company_id_fkey"
            columns: ["active_company_id"]
            isOneToOne: false
            referencedRelation: "settings_companies"
            referencedColumns: ["id"]
          },
        ]
      }
      sistema_config: {
        Row: {
          cargo: string | null
          cor_primaria: string
          created_at: string
          email_dpo: string | null
          fuso_horario: string
          horario_envio_fim: number
          horario_envio_inicio: number
          id: string
          jurisdicao: string | null
          limite_mensagens_dia: number
          logo_url: string | null
          max_tentativas: number
          nome_mandato: string
          notificar_evento_proximo: boolean
          notificar_responsavel_tarefa: boolean
          numero_eleitoral: string | null
          partido: string | null
          texto_consentimento: string
          updated_at: string
          url_politica_privacidade: string | null
        }
        Insert: {
          cargo?: string | null
          cor_primaria?: string
          created_at?: string
          email_dpo?: string | null
          fuso_horario?: string
          horario_envio_fim?: number
          horario_envio_inicio?: number
          id?: string
          jurisdicao?: string | null
          limite_mensagens_dia?: number
          logo_url?: string | null
          max_tentativas?: number
          nome_mandato?: string
          notificar_evento_proximo?: boolean
          notificar_responsavel_tarefa?: boolean
          numero_eleitoral?: string | null
          partido?: string | null
          texto_consentimento?: string
          updated_at?: string
          url_politica_privacidade?: string | null
        }
        Update: {
          cargo?: string | null
          cor_primaria?: string
          created_at?: string
          email_dpo?: string | null
          fuso_horario?: string
          horario_envio_fim?: number
          horario_envio_inicio?: number
          id?: string
          jurisdicao?: string | null
          limite_mensagens_dia?: number
          logo_url?: string | null
          max_tentativas?: number
          nome_mandato?: string
          notificar_evento_proximo?: boolean
          notificar_responsavel_tarefa?: boolean
          numero_eleitoral?: string | null
          partido?: string | null
          texto_consentimento?: string
          updated_at?: string
          url_politica_privacidade?: string | null
        }
        Relationships: []
      }
      tags: {
        Row: {
          ativo: boolean
          company_id: string | null
          cor: string
          created_at: string
          created_by: string | null
          id: string
          nome: string
        }
        Insert: {
          ativo?: boolean
          company_id?: string | null
          cor?: string
          created_at?: string
          created_by?: string | null
          id?: string
          nome: string
        }
        Update: {
          ativo?: boolean
          company_id?: string | null
          cor?: string
          created_at?: string
          created_by?: string | null
          id?: string
          nome?: string
        }
        Relationships: [
          {
            foreignKeyName: "tags_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "settings_companies"
            referencedColumns: ["id"]
          },
        ]
      }
      ticket_calendar_integrations: {
        Row: {
          company_id: string
          created_at: string
          google_access_token: string | null
          google_calendar_id: string | null
          google_email: string | null
          google_refresh_token: string | null
          google_token_expires_at: string | null
          id: string
          scope: string | null
          sync_enabled: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          company_id: string
          created_at?: string
          google_access_token?: string | null
          google_calendar_id?: string | null
          google_email?: string | null
          google_refresh_token?: string | null
          google_token_expires_at?: string | null
          id?: string
          scope?: string | null
          sync_enabled?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          company_id?: string
          created_at?: string
          google_access_token?: string | null
          google_calendar_id?: string | null
          google_email?: string | null
          google_refresh_token?: string | null
          google_token_expires_at?: string | null
          id?: string
          scope?: string | null
          sync_enabled?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ticket_calendar_integrations_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "settings_companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ticket_calendar_integrations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "settings_users"
            referencedColumns: ["id"]
          },
        ]
      }
      ticket_categories: {
        Row: {
          color: string | null
          company_id: string
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          name: string
        }
        Insert: {
          color?: string | null
          company_id: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          name: string
        }
        Update: {
          color?: string | null
          company_id?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "ticket_categories_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "settings_companies"
            referencedColumns: ["id"]
          },
        ]
      }
      ticket_events: {
        Row: {
          agent_id: string | null
          company_id: string
          created_at: string
          created_by: string | null
          description: string | null
          end_datetime: string
          external_id: string | null
          google_event_id: string | null
          id: string
          start_datetime: string
          status: string
          ticket_id: string | null
          title: string
          updated_at: string
        }
        Insert: {
          agent_id?: string | null
          company_id: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          end_datetime: string
          external_id?: string | null
          google_event_id?: string | null
          id?: string
          start_datetime: string
          status?: string
          ticket_id?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          agent_id?: string | null
          company_id?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          end_datetime?: string
          external_id?: string | null
          google_event_id?: string | null
          id?: string
          start_datetime?: string
          status?: string
          ticket_id?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ticket_events_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "settings_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ticket_events_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "settings_companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ticket_events_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      ticket_messages: {
        Row: {
          company_id: string
          content: string
          created_at: string
          id: string
          is_internal_note: boolean
          sender_id: string | null
          sender_type: string | null
          ticket_id: string
        }
        Insert: {
          company_id: string
          content: string
          created_at?: string
          id?: string
          is_internal_note?: boolean
          sender_id?: string | null
          sender_type?: string | null
          ticket_id: string
        }
        Update: {
          company_id?: string
          content?: string
          created_at?: string
          id?: string
          is_internal_note?: boolean
          sender_id?: string | null
          sender_type?: string | null
          ticket_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ticket_messages_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "settings_companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ticket_messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "settings_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ticket_messages_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      ticket_queues: {
        Row: {
          company_id: string
          created_at: string
          description: string | null
          id: string
          name: string
        }
        Insert: {
          company_id: string
          created_at?: string
          description?: string | null
          id?: string
          name: string
        }
        Update: {
          company_id?: string
          created_at?: string
          description?: string | null
          id?: string
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "ticket_queues_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "settings_companies"
            referencedColumns: ["id"]
          },
        ]
      }
      tickets: {
        Row: {
          assigned_to: string | null
          bairro: string | null
          category_id: string | null
          cep: string | null
          cidade: string | null
          company_id: string
          complemento: string | null
          created_at: string
          description: string | null
          id: string
          numero: string | null
          priority: string
          queue_id: string | null
          requester_email: string | null
          requester_name: string | null
          requester_phone: string | null
          rua: string | null
          sla_due_at: string | null
          status: string
          ticket_number: number
          title: string
          uf: string | null
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          bairro?: string | null
          category_id?: string | null
          cep?: string | null
          cidade?: string | null
          company_id: string
          complemento?: string | null
          created_at?: string
          description?: string | null
          id?: string
          numero?: string | null
          priority?: string
          queue_id?: string | null
          requester_email?: string | null
          requester_name?: string | null
          requester_phone?: string | null
          rua?: string | null
          sla_due_at?: string | null
          status?: string
          ticket_number?: number
          title: string
          uf?: string | null
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          bairro?: string | null
          category_id?: string | null
          cep?: string | null
          cidade?: string | null
          company_id?: string
          complemento?: string | null
          created_at?: string
          description?: string | null
          id?: string
          numero?: string | null
          priority?: string
          queue_id?: string | null
          requester_email?: string | null
          requester_name?: string | null
          requester_phone?: string | null
          rua?: string | null
          sla_due_at?: string | null
          status?: string
          ticket_number?: number
          title?: string
          uf?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tickets_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "settings_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tickets_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "ticket_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tickets_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "settings_companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tickets_queue_id_fkey"
            columns: ["queue_id"]
            isOneToOne: false
            referencedRelation: "ticket_queues"
            referencedColumns: ["id"]
          },
        ]
      }
      tokens_auto_cadastro: {
        Row: {
          cabo_id: string | null
          company_id: string | null
          created_at: string
          created_by: string | null
          expira_em: string
          id: string
          lideranca_id: string | null
          telefone_destino: string | null
          tipo: string
          token: string
          usado: boolean
          usado_em: string | null
          usado_por_eleitor_id: string | null
        }
        Insert: {
          cabo_id?: string | null
          company_id?: string | null
          created_at?: string
          created_by?: string | null
          expira_em?: string
          id?: string
          lideranca_id?: string | null
          telefone_destino?: string | null
          tipo?: string
          token: string
          usado?: boolean
          usado_em?: string | null
          usado_por_eleitor_id?: string | null
        }
        Update: {
          cabo_id?: string | null
          company_id?: string | null
          created_at?: string
          created_by?: string | null
          expira_em?: string
          id?: string
          lideranca_id?: string | null
          telefone_destino?: string | null
          tipo?: string
          token?: string
          usado?: boolean
          usado_em?: string | null
          usado_por_eleitor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tokens_auto_cadastro_cabo_id_fkey"
            columns: ["cabo_id"]
            isOneToOne: false
            referencedRelation: "cabos_eleitorais"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tokens_auto_cadastro_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "settings_companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tokens_auto_cadastro_lideranca_id_fkey"
            columns: ["lideranca_id"]
            isOneToOne: false
            referencedRelation: "liderancas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tokens_auto_cadastro_usado_por_eleitor_id_fkey"
            columns: ["usado_por_eleitor_id"]
            isOneToOne: false
            referencedRelation: "eleitores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tokens_auto_cadastro_usado_por_eleitor_id_fkey"
            columns: ["usado_por_eleitor_id"]
            isOneToOne: false
            referencedRelation: "vw_eleitores_consolidado"
            referencedColumns: ["id"]
          },
        ]
      }
      tse_arquivos_brutos: {
        Row: {
          ano_eleicao: number | null
          arquivo: string | null
          cargo: string | null
          conteudo_bruto: Json | null
          conteudo_texto: string | null
          created_at: string
          dedupe_key: string | null
          id: string
          log_id: string | null
          size_bytes: number | null
          turno: number | null
          uf: string | null
          url: string | null
        }
        Insert: {
          ano_eleicao?: number | null
          arquivo?: string | null
          cargo?: string | null
          conteudo_bruto?: Json | null
          conteudo_texto?: string | null
          created_at?: string
          dedupe_key?: string | null
          id?: string
          log_id?: string | null
          size_bytes?: number | null
          turno?: number | null
          uf?: string | null
          url?: string | null
        }
        Update: {
          ano_eleicao?: number | null
          arquivo?: string | null
          cargo?: string | null
          conteudo_bruto?: Json | null
          conteudo_texto?: string | null
          created_at?: string
          dedupe_key?: string | null
          id?: string
          log_id?: string | null
          size_bytes?: number | null
          turno?: number | null
          uf?: string | null
          url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tse_arquivos_brutos_log_id_fkey"
            columns: ["log_id"]
            isOneToOne: false
            referencedRelation: "tse_importacao_logs"
            referencedColumns: ["id"]
          },
        ]
      }
      tse_importacao_logs: {
        Row: {
          ano_eleicao: number | null
          arquivo: string | null
          cancel_requested: boolean
          cargo: string | null
          checkpoint_linhas: number
          created_at: string
          dedupe_key: string | null
          detalhes: Json
          erros: string | null
          finished_at: string | null
          id: string
          registros_atualizados: number
          registros_novos: number
          status: string
          total_registros: number
          turno: number | null
          uf: string | null
          url: string | null
          user_id: string | null
        }
        Insert: {
          ano_eleicao?: number | null
          arquivo?: string | null
          cancel_requested?: boolean
          cargo?: string | null
          checkpoint_linhas?: number
          created_at?: string
          dedupe_key?: string | null
          detalhes?: Json
          erros?: string | null
          finished_at?: string | null
          id?: string
          registros_atualizados?: number
          registros_novos?: number
          status?: string
          total_registros?: number
          turno?: number | null
          uf?: string | null
          url?: string | null
          user_id?: string | null
        }
        Update: {
          ano_eleicao?: number | null
          arquivo?: string | null
          cancel_requested?: boolean
          cargo?: string | null
          checkpoint_linhas?: number
          created_at?: string
          dedupe_key?: string | null
          detalhes?: Json
          erros?: string | null
          finished_at?: string | null
          id?: string
          registros_atualizados?: number
          registros_novos?: number
          status?: string
          total_registros?: number
          turno?: number | null
          uf?: string | null
          url?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      tse_jobs: {
        Row: {
          ano_eleicao: number
          batch_id: string
          cargo: string | null
          codigo_municipio: string | null
          created_at: string
          escopo: string | null
          finished_at: string | null
          id: string
          log_id: string | null
          started_at: string | null
          status: string
          tentativas: number
          turno: number
          uf: string
          ultimo_erro: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          ano_eleicao: number
          batch_id: string
          cargo?: string | null
          codigo_municipio?: string | null
          created_at?: string
          escopo?: string | null
          finished_at?: string | null
          id?: string
          log_id?: string | null
          started_at?: string | null
          status?: string
          tentativas?: number
          turno: number
          uf: string
          ultimo_erro?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          ano_eleicao?: number
          batch_id?: string
          cargo?: string | null
          codigo_municipio?: string | null
          created_at?: string
          escopo?: string | null
          finished_at?: string | null
          id?: string
          log_id?: string | null
          started_at?: string | null
          status?: string
          tentativas?: number
          turno?: number
          uf?: string
          ultimo_erro?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tse_jobs_log_id_fkey"
            columns: ["log_id"]
            isOneToOne: false
            referencedRelation: "tse_importacao_logs"
            referencedColumns: ["id"]
          },
        ]
      }
      user_modulos_override: {
        Row: {
          created_at: string
          id: string
          modulos: string[]
          updated_at: string
          updated_by: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          modulos?: string[]
          updated_at?: string
          updated_by?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          modulos?: string[]
          updated_at?: string
          updated_by?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_permissions: {
        Row: {
          can_create_all: boolean
          can_create_cabos: boolean
          can_create_catalogos: boolean
          can_create_categorias: boolean
          can_create_departamentos: boolean
          can_create_liderancas: boolean
          can_create_tags: boolean
          can_create_tipos_evento: boolean
          created_at: string
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          can_create_all?: boolean
          can_create_cabos?: boolean
          can_create_catalogos?: boolean
          can_create_categorias?: boolean
          can_create_departamentos?: boolean
          can_create_liderancas?: boolean
          can_create_tags?: boolean
          can_create_tipos_evento?: boolean
          created_at?: string
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          can_create_all?: boolean
          can_create_cabos?: boolean
          can_create_catalogos?: boolean
          can_create_categorias?: boolean
          can_create_departamentos?: boolean
          can_create_liderancas?: boolean
          can_create_tags?: boolean
          can_create_tipos_evento?: boolean
          created_at?: string
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      wa_bulk_apis: {
        Row: {
          access_token: string
          app_id: string | null
          business_account_id: string | null
          company_id: string
          cooldown_ate: string | null
          created_at: string
          display_name: string | null
          erros_consecutivos: number
          id: string
          iniciado_em: string
          intervalo_max_ms: number | null
          intervalo_min_ms: number | null
          msgs_enviadas_hoje: number
          msgs_enviadas_hora: number
          msgs_limite_diario: number | null
          msgs_limite_horario: number | null
          nome: string
          numero_telefone: string
          observacoes: string | null
          phone_number_id: string
          restrito: boolean
          saude: number
          status: string
          taxa_entrega: number
          total_enviadas: number
          total_erros: number
          ultimo_envio: string | null
          ultimo_erro: string | null
          updated_at: string
          waba_id: string | null
          warning_meta: boolean
        }
        Insert: {
          access_token: string
          app_id?: string | null
          business_account_id?: string | null
          company_id: string
          cooldown_ate?: string | null
          created_at?: string
          display_name?: string | null
          erros_consecutivos?: number
          id?: string
          iniciado_em?: string
          intervalo_max_ms?: number | null
          intervalo_min_ms?: number | null
          msgs_enviadas_hoje?: number
          msgs_enviadas_hora?: number
          msgs_limite_diario?: number | null
          msgs_limite_horario?: number | null
          nome: string
          numero_telefone: string
          observacoes?: string | null
          phone_number_id: string
          restrito?: boolean
          saude?: number
          status?: string
          taxa_entrega?: number
          total_enviadas?: number
          total_erros?: number
          ultimo_envio?: string | null
          ultimo_erro?: string | null
          updated_at?: string
          waba_id?: string | null
          warning_meta?: boolean
        }
        Update: {
          access_token?: string
          app_id?: string | null
          business_account_id?: string | null
          company_id?: string
          cooldown_ate?: string | null
          created_at?: string
          display_name?: string | null
          erros_consecutivos?: number
          id?: string
          iniciado_em?: string
          intervalo_max_ms?: number | null
          intervalo_min_ms?: number | null
          msgs_enviadas_hoje?: number
          msgs_enviadas_hora?: number
          msgs_limite_diario?: number | null
          msgs_limite_horario?: number | null
          nome?: string
          numero_telefone?: string
          observacoes?: string | null
          phone_number_id?: string
          restrito?: boolean
          saude?: number
          status?: string
          taxa_entrega?: number
          total_enviadas?: number
          total_erros?: number
          ultimo_envio?: string | null
          ultimo_erro?: string | null
          updated_at?: string
          waba_id?: string | null
          warning_meta?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "wa_bulk_apis_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "settings_companies"
            referencedColumns: ["id"]
          },
        ]
      }
      wa_bulk_campanhas: {
        Row: {
          agendado_para: string | null
          company_id: string
          concluido_em: string | null
          created_at: string
          criado_por: string | null
          dias_semana: number[] | null
          id: string
          iniciado_em: string | null
          janela_fim: string | null
          janela_inicio: string | null
          nome: string
          pausada: boolean
          status: string
          template_id: string | null
          timezone: string
          total_destinatarios: number
          total_entregues: number
          total_enviados: number
          total_erros: number
          total_lidos: number
          updated_at: string
          velocidade_envio: number
        }
        Insert: {
          agendado_para?: string | null
          company_id: string
          concluido_em?: string | null
          created_at?: string
          criado_por?: string | null
          dias_semana?: number[] | null
          id?: string
          iniciado_em?: string | null
          janela_fim?: string | null
          janela_inicio?: string | null
          nome: string
          pausada?: boolean
          status?: string
          template_id?: string | null
          timezone?: string
          total_destinatarios?: number
          total_entregues?: number
          total_enviados?: number
          total_erros?: number
          total_lidos?: number
          updated_at?: string
          velocidade_envio?: number
        }
        Update: {
          agendado_para?: string | null
          company_id?: string
          concluido_em?: string | null
          created_at?: string
          criado_por?: string | null
          dias_semana?: number[] | null
          id?: string
          iniciado_em?: string | null
          janela_fim?: string | null
          janela_inicio?: string | null
          nome?: string
          pausada?: boolean
          status?: string
          template_id?: string | null
          timezone?: string
          total_destinatarios?: number
          total_entregues?: number
          total_enviados?: number
          total_erros?: number
          total_lidos?: number
          updated_at?: string
          velocidade_envio?: number
        }
        Relationships: [
          {
            foreignKeyName: "wa_bulk_campanhas_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "settings_companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wa_bulk_campanhas_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "wa_bulk_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      wa_bulk_config: {
        Row: {
          aquecimento_ativo: boolean
          aquecimento_dia_1_7: number
          aquecimento_dia_15_21: number
          aquecimento_dia_22_plus: number
          aquecimento_dia_8_14: number
          company_id: string
          cooldown_apos_3_erros_ms: number
          cooldown_apos_erro_ms: number
          cooldown_apos_warning_ms: number
          created_at: string
          dias_permitidos: number[]
          horario_fim: string
          horario_inicio: string
          id: string
          intervalo_max_ms: number
          intervalo_min_ms: number
          max_msgs_mesmo_numero_dia: number
          max_tentativas: number
          meta_diaria_total: number
          msgs_limite_diario_padrao: number
          msgs_limite_horario_padrao: number
          taxa_erro_max_pct: number
          updated_at: string
        }
        Insert: {
          aquecimento_ativo?: boolean
          aquecimento_dia_1_7?: number
          aquecimento_dia_15_21?: number
          aquecimento_dia_22_plus?: number
          aquecimento_dia_8_14?: number
          company_id: string
          cooldown_apos_3_erros_ms?: number
          cooldown_apos_erro_ms?: number
          cooldown_apos_warning_ms?: number
          created_at?: string
          dias_permitidos?: number[]
          horario_fim?: string
          horario_inicio?: string
          id?: string
          intervalo_max_ms?: number
          intervalo_min_ms?: number
          max_msgs_mesmo_numero_dia?: number
          max_tentativas?: number
          meta_diaria_total?: number
          msgs_limite_diario_padrao?: number
          msgs_limite_horario_padrao?: number
          taxa_erro_max_pct?: number
          updated_at?: string
        }
        Update: {
          aquecimento_ativo?: boolean
          aquecimento_dia_1_7?: number
          aquecimento_dia_15_21?: number
          aquecimento_dia_22_plus?: number
          aquecimento_dia_8_14?: number
          company_id?: string
          cooldown_apos_3_erros_ms?: number
          cooldown_apos_erro_ms?: number
          cooldown_apos_warning_ms?: number
          created_at?: string
          dias_permitidos?: number[]
          horario_fim?: string
          horario_inicio?: string
          id?: string
          intervalo_max_ms?: number
          intervalo_min_ms?: number
          max_msgs_mesmo_numero_dia?: number
          max_tentativas?: number
          meta_diaria_total?: number
          msgs_limite_diario_padrao?: number
          msgs_limite_horario_padrao?: number
          taxa_erro_max_pct?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "wa_bulk_config_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: true
            referencedRelation: "settings_companies"
            referencedColumns: ["id"]
          },
        ]
      }
      wa_bulk_conversas: {
        Row: {
          agente_id: string | null
          api_id: string | null
          company_id: string
          created_at: string
          id: string
          nao_lidas: number
          status: string
          ultima_interacao: string
          ultima_mensagem: string | null
          ultima_msg_recebida_em: string | null
          updated_at: string
          wa_nome: string | null
          wa_numero: string
        }
        Insert: {
          agente_id?: string | null
          api_id?: string | null
          company_id: string
          created_at?: string
          id?: string
          nao_lidas?: number
          status?: string
          ultima_interacao?: string
          ultima_mensagem?: string | null
          ultima_msg_recebida_em?: string | null
          updated_at?: string
          wa_nome?: string | null
          wa_numero: string
        }
        Update: {
          agente_id?: string | null
          api_id?: string | null
          company_id?: string
          created_at?: string
          id?: string
          nao_lidas?: number
          status?: string
          ultima_interacao?: string
          ultima_mensagem?: string | null
          ultima_msg_recebida_em?: string | null
          updated_at?: string
          wa_nome?: string | null
          wa_numero?: string
        }
        Relationships: [
          {
            foreignKeyName: "wa_bulk_conversas_api_id_fkey"
            columns: ["api_id"]
            isOneToOne: false
            referencedRelation: "wa_bulk_apis"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wa_bulk_conversas_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "settings_companies"
            referencedColumns: ["id"]
          },
        ]
      }
      wa_bulk_fila_envios: {
        Row: {
          api_id: string | null
          campanha_id: string | null
          company_id: string
          created_at: string
          destinatario_nome: string | null
          destinatario_telefone: string
          entregue_em: string | null
          enviado_em: string | null
          erro_mensagem: string | null
          id: string
          lido_em: string | null
          max_tentativas: number
          message_id_meta: string | null
          prioridade: number
          proximo_envio: string
          status: string
          template_id: string | null
          tentativas: number
          updated_at: string
          variaveis: Json | null
        }
        Insert: {
          api_id?: string | null
          campanha_id?: string | null
          company_id: string
          created_at?: string
          destinatario_nome?: string | null
          destinatario_telefone: string
          entregue_em?: string | null
          enviado_em?: string | null
          erro_mensagem?: string | null
          id?: string
          lido_em?: string | null
          max_tentativas?: number
          message_id_meta?: string | null
          prioridade?: number
          proximo_envio?: string
          status?: string
          template_id?: string | null
          tentativas?: number
          updated_at?: string
          variaveis?: Json | null
        }
        Update: {
          api_id?: string | null
          campanha_id?: string | null
          company_id?: string
          created_at?: string
          destinatario_nome?: string | null
          destinatario_telefone?: string
          entregue_em?: string | null
          enviado_em?: string | null
          erro_mensagem?: string | null
          id?: string
          lido_em?: string | null
          max_tentativas?: number
          message_id_meta?: string | null
          prioridade?: number
          proximo_envio?: string
          status?: string
          template_id?: string | null
          tentativas?: number
          updated_at?: string
          variaveis?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "wa_bulk_fila_envios_api_id_fkey"
            columns: ["api_id"]
            isOneToOne: false
            referencedRelation: "wa_bulk_apis"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wa_bulk_fila_envios_campanha_id_fkey"
            columns: ["campanha_id"]
            isOneToOne: false
            referencedRelation: "wa_bulk_campanhas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wa_bulk_fila_envios_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "settings_companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wa_bulk_fila_envios_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "wa_bulk_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      wa_bulk_mensagens: {
        Row: {
          api_id: string | null
          company_id: string
          conversa_id: string
          corpo: string | null
          created_at: string
          direcao: string
          id: string
          message_id_meta: string | null
          remetente_id: string | null
          status: string | null
          tipo: string
        }
        Insert: {
          api_id?: string | null
          company_id: string
          conversa_id: string
          corpo?: string | null
          created_at?: string
          direcao: string
          id?: string
          message_id_meta?: string | null
          remetente_id?: string | null
          status?: string | null
          tipo?: string
        }
        Update: {
          api_id?: string | null
          company_id?: string
          conversa_id?: string
          corpo?: string | null
          created_at?: string
          direcao?: string
          id?: string
          message_id_meta?: string | null
          remetente_id?: string | null
          status?: string | null
          tipo?: string
        }
        Relationships: [
          {
            foreignKeyName: "wa_bulk_mensagens_api_id_fkey"
            columns: ["api_id"]
            isOneToOne: false
            referencedRelation: "wa_bulk_apis"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wa_bulk_mensagens_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "settings_companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wa_bulk_mensagens_conversa_id_fkey"
            columns: ["conversa_id"]
            isOneToOne: false
            referencedRelation: "wa_bulk_conversas"
            referencedColumns: ["id"]
          },
        ]
      }
      wa_bulk_metricas_diarias: {
        Row: {
          api_id: string | null
          company_id: string
          created_at: string
          data: string
          id: string
          taxa_entrega: number
          taxa_leitura: number
          total_entregues: number
          total_enviados: number
          total_erros: number
          total_lidos: number
        }
        Insert: {
          api_id?: string | null
          company_id: string
          created_at?: string
          data?: string
          id?: string
          taxa_entrega?: number
          taxa_leitura?: number
          total_entregues?: number
          total_enviados?: number
          total_erros?: number
          total_lidos?: number
        }
        Update: {
          api_id?: string | null
          company_id?: string
          created_at?: string
          data?: string
          id?: string
          taxa_entrega?: number
          taxa_leitura?: number
          total_entregues?: number
          total_enviados?: number
          total_erros?: number
          total_lidos?: number
        }
        Relationships: [
          {
            foreignKeyName: "wa_bulk_metricas_diarias_api_id_fkey"
            columns: ["api_id"]
            isOneToOne: false
            referencedRelation: "wa_bulk_apis"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wa_bulk_metricas_diarias_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "settings_companies"
            referencedColumns: ["id"]
          },
        ]
      }
      wa_bulk_optout: {
        Row: {
          company_id: string
          created_at: string
          created_by: string | null
          id: string
          motivo: string | null
          observacoes: string | null
          origem: string
          telefone: string
          telefone_digits: string
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          motivo?: string | null
          observacoes?: string | null
          origem?: string
          telefone: string
          telefone_digits: string
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          motivo?: string | null
          observacoes?: string | null
          origem?: string
          telefone?: string
          telefone_digits?: string
          updated_at?: string
        }
        Relationships: []
      }
      wa_bulk_templates: {
        Row: {
          api_id: string | null
          body_text: string
          botoes: Json | null
          categoria: string
          company_id: string
          created_at: string
          footer_text: string | null
          header_content: string | null
          header_type: string | null
          id: string
          idioma: string
          meta_template_id: string | null
          nome: string
          rejected_reason: string | null
          status: string
          updated_at: string
          variaveis: Json | null
        }
        Insert: {
          api_id?: string | null
          body_text: string
          botoes?: Json | null
          categoria?: string
          company_id: string
          created_at?: string
          footer_text?: string | null
          header_content?: string | null
          header_type?: string | null
          id?: string
          idioma?: string
          meta_template_id?: string | null
          nome: string
          rejected_reason?: string | null
          status?: string
          updated_at?: string
          variaveis?: Json | null
        }
        Update: {
          api_id?: string | null
          body_text?: string
          botoes?: Json | null
          categoria?: string
          company_id?: string
          created_at?: string
          footer_text?: string | null
          header_content?: string | null
          header_type?: string | null
          id?: string
          idioma?: string
          meta_template_id?: string | null
          nome?: string
          rejected_reason?: string | null
          status?: string
          updated_at?: string
          variaveis?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "wa_bulk_templates_api_id_fkey"
            columns: ["api_id"]
            isOneToOne: false
            referencedRelation: "wa_bulk_apis"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wa_bulk_templates_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "settings_companies"
            referencedColumns: ["id"]
          },
        ]
      }
      wa_bulk_webhooks_log: {
        Row: {
          api_id: string | null
          company_id: string | null
          created_at: string
          destinatario: string | null
          id: string
          message_id: string | null
          payload: Json | null
          processado: boolean
          tipo: string
        }
        Insert: {
          api_id?: string | null
          company_id?: string | null
          created_at?: string
          destinatario?: string | null
          id?: string
          message_id?: string | null
          payload?: Json | null
          processado?: boolean
          tipo: string
        }
        Update: {
          api_id?: string | null
          company_id?: string | null
          created_at?: string
          destinatario?: string | null
          id?: string
          message_id?: string | null
          payload?: Json | null
          processado?: boolean
          tipo?: string
        }
        Relationships: [
          {
            foreignKeyName: "wa_bulk_webhooks_log_api_id_fkey"
            columns: ["api_id"]
            isOneToOne: false
            referencedRelation: "wa_bulk_apis"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wa_bulk_webhooks_log_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "settings_companies"
            referencedColumns: ["id"]
          },
        ]
      }
      wa_conversas: {
        Row: {
          agente_id: string | null
          closed_at: string | null
          created_at: string | null
          eleitor_id: string | null
          fila_id: string | null
          id: string
          protocolo: number
          status: string | null
          ultima_interacao: string | null
          ultima_mensagem: string | null
          wa_id: string
          wa_nome: string | null
          wa_numero: string
        }
        Insert: {
          agente_id?: string | null
          closed_at?: string | null
          created_at?: string | null
          eleitor_id?: string | null
          fila_id?: string | null
          id?: string
          protocolo?: number
          status?: string | null
          ultima_interacao?: string | null
          ultima_mensagem?: string | null
          wa_id: string
          wa_nome?: string | null
          wa_numero: string
        }
        Update: {
          agente_id?: string | null
          closed_at?: string | null
          created_at?: string | null
          eleitor_id?: string | null
          fila_id?: string | null
          id?: string
          protocolo?: number
          status?: string | null
          ultima_interacao?: string | null
          ultima_mensagem?: string | null
          wa_id?: string
          wa_nome?: string | null
          wa_numero?: string
        }
        Relationships: [
          {
            foreignKeyName: "wa_conversas_eleitor_id_fkey"
            columns: ["eleitor_id"]
            isOneToOne: false
            referencedRelation: "eleitores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wa_conversas_eleitor_id_fkey"
            columns: ["eleitor_id"]
            isOneToOne: false
            referencedRelation: "vw_eleitores_consolidado"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wa_conversas_fila_id_fkey"
            columns: ["fila_id"]
            isOneToOne: false
            referencedRelation: "wa_filas"
            referencedColumns: ["id"]
          },
        ]
      }
      wa_filas: {
        Row: {
          ativa: boolean | null
          cor: string | null
          created_at: string | null
          descricao: string | null
          id: string
          nome: string
        }
        Insert: {
          ativa?: boolean | null
          cor?: string | null
          created_at?: string | null
          descricao?: string | null
          id?: string
          nome: string
        }
        Update: {
          ativa?: boolean | null
          cor?: string | null
          created_at?: string | null
          descricao?: string | null
          id?: string
          nome?: string
        }
        Relationships: []
      }
      wa_mensagens: {
        Row: {
          conversa_id: string | null
          corpo: string
          created_at: string | null
          direcao: string
          id: string
          remetente_id: string | null
          status: string | null
          tipo: string | null
        }
        Insert: {
          conversa_id?: string | null
          corpo: string
          created_at?: string | null
          direcao: string
          id?: string
          remetente_id?: string | null
          status?: string | null
          tipo?: string | null
        }
        Update: {
          conversa_id?: string | null
          corpo?: string
          created_at?: string | null
          direcao?: string
          id?: string
          remetente_id?: string | null
          status?: string | null
          tipo?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "wa_mensagens_conversa_id_fkey"
            columns: ["conversa_id"]
            isOneToOne: false
            referencedRelation: "wa_conversas"
            referencedColumns: ["id"]
          },
        ]
      }
      webhook_entregas: {
        Row: {
          created_at: string
          erro: string | null
          evento: string
          id: string
          payload: Json
          resposta: string | null
          status_code: number | null
          sucesso: boolean
          webhook_id: string
        }
        Insert: {
          created_at?: string
          erro?: string | null
          evento: string
          id?: string
          payload?: Json
          resposta?: string | null
          status_code?: number | null
          sucesso?: boolean
          webhook_id: string
        }
        Update: {
          created_at?: string
          erro?: string | null
          evento?: string
          id?: string
          payload?: Json
          resposta?: string | null
          status_code?: number | null
          sucesso?: boolean
          webhook_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "webhook_entregas_webhook_id_fkey"
            columns: ["webhook_id"]
            isOneToOne: false
            referencedRelation: "webhooks_saida"
            referencedColumns: ["id"]
          },
        ]
      }
      webhooks_saida: {
        Row: {
          ativo: boolean
          created_at: string
          created_by: string | null
          eventos: string[]
          id: string
          nome: string
          secret: string | null
          total_disparos: number
          ultimo_disparo_em: string | null
          updated_at: string
          url: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          created_by?: string | null
          eventos?: string[]
          id?: string
          nome: string
          secret?: string | null
          total_disparos?: number
          ultimo_disparo_em?: string | null
          updated_at?: string
          url: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          created_by?: string | null
          eventos?: string[]
          id?: string
          nome?: string
          secret?: string | null
          total_disparos?: number
          ultimo_disparo_em?: string | null
          updated_at?: string
          url?: string
        }
        Relationships: []
      }
      whatsapp_config: {
        Row: {
          auto_encerrar_ativo: boolean
          auto_encerrar_horas: number
          auto_encerrar_mensagem: string
          boas_vindas_ativo: boolean
          boas_vindas_mensagem: string
          chatbot_ativo: boolean
          chatbot_fluxo_id: string | null
          chave: string
          expediente_dias_semana: number[]
          expediente_fim: string
          expediente_inicio: string
          fora_expediente_ativo: boolean
          fora_expediente_mensagem: string
          id: string
          notif_email: boolean
          notif_som: boolean
          provider: string
          sla_primeira_resposta_alerta: boolean
          sla_primeira_resposta_min: number
          sla_resolucao_alerta: boolean
          sla_resolucao_min: number
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          auto_encerrar_ativo?: boolean
          auto_encerrar_horas?: number
          auto_encerrar_mensagem?: string
          boas_vindas_ativo?: boolean
          boas_vindas_mensagem?: string
          chatbot_ativo?: boolean
          chatbot_fluxo_id?: string | null
          chave?: string
          expediente_dias_semana?: number[]
          expediente_fim?: string
          expediente_inicio?: string
          fora_expediente_ativo?: boolean
          fora_expediente_mensagem?: string
          id?: string
          notif_email?: boolean
          notif_som?: boolean
          provider?: string
          sla_primeira_resposta_alerta?: boolean
          sla_primeira_resposta_min?: number
          sla_resolucao_alerta?: boolean
          sla_resolucao_min?: number
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          auto_encerrar_ativo?: boolean
          auto_encerrar_horas?: number
          auto_encerrar_mensagem?: string
          boas_vindas_ativo?: boolean
          boas_vindas_mensagem?: string
          chatbot_ativo?: boolean
          chatbot_fluxo_id?: string | null
          chave?: string
          expediente_dias_semana?: number[]
          expediente_fim?: string
          expediente_inicio?: string
          fora_expediente_ativo?: boolean
          fora_expediente_mensagem?: string
          id?: string
          notif_email?: boolean
          notif_som?: boolean
          provider?: string
          sla_primeira_resposta_alerta?: boolean
          sla_primeira_resposta_min?: number
          sla_resolucao_alerta?: boolean
          sla_resolucao_min?: number
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_config_chatbot_fluxo_id_fkey"
            columns: ["chatbot_fluxo_id"]
            isOneToOne: false
            referencedRelation: "chatbot_fluxos"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_contacts: {
        Row: {
          company_id: string
          created_at: string
          id: string
          name: string | null
          notes: string | null
          phone: string
          profile_pic_url: string | null
          tags: string[] | null
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          id?: string
          name?: string | null
          notes?: string | null
          phone: string
          profile_pic_url?: string | null
          tags?: string[] | null
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          id?: string
          name?: string | null
          notes?: string | null
          phone?: string
          profile_pic_url?: string | null
          tags?: string[] | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_contacts_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "settings_companies"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_conversa_notas: {
        Row: {
          autor_id: string | null
          conteudo: string
          conversa_id: string
          created_at: string
          id: string
          updated_at: string
        }
        Insert: {
          autor_id?: string | null
          conteudo: string
          conversa_id: string
          created_at?: string
          id?: string
          updated_at?: string
        }
        Update: {
          autor_id?: string | null
          conteudo?: string
          conversa_id?: string
          created_at?: string
          id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_conversa_notas_conversa_id_fkey"
            columns: ["conversa_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_conversas"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_conversas: {
        Row: {
          assumida_em: string | null
          atendente_id: string | null
          contato_nome: string | null
          created_at: string
          departamento_id: string | null
          eleitor_id: string | null
          finalizada_em: string | null
          id: string
          instancia: string | null
          nao_lidas: number
          observacoes: string | null
          primeira_resposta_em: string | null
          sla_primeira_resposta_violado: boolean
          sla_resolucao_violado: boolean
          status: Database["public"]["Enums"]["conversa_status"]
          tags: string[]
          telefone: string
          telefone_digits: string
          ultima_direcao: Database["public"]["Enums"]["mensagem_direcao"] | null
          ultima_mensagem: string | null
          ultima_mensagem_em: string | null
          updated_at: string
        }
        Insert: {
          assumida_em?: string | null
          atendente_id?: string | null
          contato_nome?: string | null
          created_at?: string
          departamento_id?: string | null
          eleitor_id?: string | null
          finalizada_em?: string | null
          id?: string
          instancia?: string | null
          nao_lidas?: number
          observacoes?: string | null
          primeira_resposta_em?: string | null
          sla_primeira_resposta_violado?: boolean
          sla_resolucao_violado?: boolean
          status?: Database["public"]["Enums"]["conversa_status"]
          tags?: string[]
          telefone: string
          telefone_digits: string
          ultima_direcao?:
            | Database["public"]["Enums"]["mensagem_direcao"]
            | null
          ultima_mensagem?: string | null
          ultima_mensagem_em?: string | null
          updated_at?: string
        }
        Update: {
          assumida_em?: string | null
          atendente_id?: string | null
          contato_nome?: string | null
          created_at?: string
          departamento_id?: string | null
          eleitor_id?: string | null
          finalizada_em?: string | null
          id?: string
          instancia?: string | null
          nao_lidas?: number
          observacoes?: string | null
          primeira_resposta_em?: string | null
          sla_primeira_resposta_violado?: boolean
          sla_resolucao_violado?: boolean
          status?: Database["public"]["Enums"]["conversa_status"]
          tags?: string[]
          telefone?: string
          telefone_digits?: string
          ultima_direcao?:
            | Database["public"]["Enums"]["mensagem_direcao"]
            | null
          ultima_mensagem?: string | null
          ultima_mensagem_em?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_conversas_departamento_id_fkey"
            columns: ["departamento_id"]
            isOneToOne: false
            referencedRelation: "departamentos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_conversas_eleitor_id_fkey"
            columns: ["eleitor_id"]
            isOneToOne: false
            referencedRelation: "eleitores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_conversas_eleitor_id_fkey"
            columns: ["eleitor_id"]
            isOneToOne: false
            referencedRelation: "vw_eleitores_consolidado"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_conversations: {
        Row: {
          agent_id: string | null
          company_id: string
          contact_id: string
          created_at: string
          id: string
          last_message: string | null
          last_message_at: string | null
          queue_id: string | null
          session_id: string | null
          status: string
          unread_count: number
          updated_at: string
        }
        Insert: {
          agent_id?: string | null
          company_id: string
          contact_id: string
          created_at?: string
          id?: string
          last_message?: string | null
          last_message_at?: string | null
          queue_id?: string | null
          session_id?: string | null
          status?: string
          unread_count?: number
          updated_at?: string
        }
        Update: {
          agent_id?: string | null
          company_id?: string
          contact_id?: string
          created_at?: string
          id?: string
          last_message?: string | null
          last_message_at?: string | null
          queue_id?: string | null
          session_id?: string | null
          status?: string
          unread_count?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_conversations_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "settings_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_conversations_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "settings_companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_conversations_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_conversations_queue_id_fkey"
            columns: ["queue_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_queues"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_conversations_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_feriados: {
        Row: {
          ativo: boolean
          created_at: string
          created_by: string | null
          data: string
          id: string
          mensagem: string | null
          nome: string
          tipo: string
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          created_by?: string | null
          data: string
          id?: string
          mensagem?: string | null
          nome: string
          tipo?: string
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          created_by?: string | null
          data?: string
          id?: string
          mensagem?: string | null
          nome?: string
          tipo?: string
          updated_at?: string
        }
        Relationships: []
      }
      whatsapp_horarios: {
        Row: {
          aberto: boolean
          dia_semana: number
          hora_fim: string | null
          hora_inicio: string | null
          id: string
          updated_at: string
        }
        Insert: {
          aberto?: boolean
          dia_semana: number
          hora_fim?: string | null
          hora_inicio?: string | null
          id?: string
          updated_at?: string
        }
        Update: {
          aberto?: boolean
          dia_semana?: number
          hora_fim?: string | null
          hora_inicio?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      whatsapp_mensagens: {
        Row: {
          conteudo: string | null
          conversa_id: string
          created_at: string
          direcao: Database["public"]["Enums"]["mensagem_direcao"]
          entregue_em: string | null
          enviado_em: string | null
          enviado_por: string | null
          id: string
          lido_em: string | null
          metadata: Json
          midia_mime: string | null
          midia_url: string | null
          provedor_message_id: string | null
          status: string
          tipo: Database["public"]["Enums"]["mensagem_tipo"]
        }
        Insert: {
          conteudo?: string | null
          conversa_id: string
          created_at?: string
          direcao: Database["public"]["Enums"]["mensagem_direcao"]
          entregue_em?: string | null
          enviado_em?: string | null
          enviado_por?: string | null
          id?: string
          lido_em?: string | null
          metadata?: Json
          midia_mime?: string | null
          midia_url?: string | null
          provedor_message_id?: string | null
          status?: string
          tipo?: Database["public"]["Enums"]["mensagem_tipo"]
        }
        Update: {
          conteudo?: string | null
          conversa_id?: string
          created_at?: string
          direcao?: Database["public"]["Enums"]["mensagem_direcao"]
          entregue_em?: string | null
          enviado_em?: string | null
          enviado_por?: string | null
          id?: string
          lido_em?: string | null
          metadata?: Json
          midia_mime?: string | null
          midia_url?: string | null
          provedor_message_id?: string | null
          status?: string
          tipo?: Database["public"]["Enums"]["mensagem_tipo"]
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_mensagens_conversa_id_fkey"
            columns: ["conversa_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_conversas"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_messages: {
        Row: {
          company_id: string
          content: string | null
          conversation_id: string
          created_at: string
          direction: string
          id: string
          media_url: string | null
          message_id_external: string | null
          sender_id: string | null
          status: string
          type: string
        }
        Insert: {
          company_id: string
          content?: string | null
          conversation_id: string
          created_at?: string
          direction: string
          id?: string
          media_url?: string | null
          message_id_external?: string | null
          sender_id?: string | null
          status?: string
          type?: string
        }
        Update: {
          company_id?: string
          content?: string | null
          conversation_id?: string
          created_at?: string
          direction?: string
          id?: string
          media_url?: string | null
          message_id_external?: string | null
          sender_id?: string | null
          status?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_messages_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "settings_companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "settings_users"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_meta_campaign_contacts: {
        Row: {
          campaign_id: string
          contact_data: Json
          created_at: string
          delivered_at: string | null
          error_message: string | null
          id: string
          message_id: string | null
          name: string | null
          phone_number: string
          read_at: string | null
          sent_at: string | null
          status: string
          updated_at: string
        }
        Insert: {
          campaign_id: string
          contact_data?: Json
          created_at?: string
          delivered_at?: string | null
          error_message?: string | null
          id?: string
          message_id?: string | null
          name?: string | null
          phone_number: string
          read_at?: string | null
          sent_at?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          campaign_id?: string
          contact_data?: Json
          created_at?: string
          delivered_at?: string | null
          error_message?: string | null
          id?: string
          message_id?: string | null
          name?: string | null
          phone_number?: string
          read_at?: string | null
          sent_at?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_meta_campaign_contacts_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_meta_campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_meta_campaigns: {
        Row: {
          cadence_final_seconds: number
          cadence_initial_seconds: number
          company_id: string
          contact_list_id: string | null
          created_at: string
          delivered_count: number
          description: string | null
          ended_at: string | null
          error_count: number
          id: string
          name: string
          read_count: number
          scheduled_end_at: string | null
          scheduled_start_at: string | null
          sent_count: number
          session_id: string
          started_at: string | null
          status: string
          template_id: string | null
          total_contacts: number
          updated_at: string
        }
        Insert: {
          cadence_final_seconds?: number
          cadence_initial_seconds?: number
          company_id: string
          contact_list_id?: string | null
          created_at?: string
          delivered_count?: number
          description?: string | null
          ended_at?: string | null
          error_count?: number
          id?: string
          name: string
          read_count?: number
          scheduled_end_at?: string | null
          scheduled_start_at?: string | null
          sent_count?: number
          session_id: string
          started_at?: string | null
          status?: string
          template_id?: string | null
          total_contacts?: number
          updated_at?: string
        }
        Update: {
          cadence_final_seconds?: number
          cadence_initial_seconds?: number
          company_id?: string
          contact_list_id?: string | null
          created_at?: string
          delivered_count?: number
          description?: string | null
          ended_at?: string | null
          error_count?: number
          id?: string
          name?: string
          read_count?: number
          scheduled_end_at?: string | null
          scheduled_start_at?: string | null
          sent_count?: number
          session_id?: string
          started_at?: string | null
          status?: string
          template_id?: string | null
          total_contacts?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_meta_campaigns_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "settings_companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_meta_campaigns_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_meta_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_meta_campaigns_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_meta_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_meta_leads: {
        Row: {
          campaign_id: string | null
          company_id: string
          created_at: string
          email: string | null
          first_interaction_at: string | null
          id: string
          interaction_data: Json
          interaction_type: string | null
          last_interaction_at: string | null
          name: string | null
          notes: string | null
          phone_number: string
          session_id: string | null
          status: string
          updated_at: string
        }
        Insert: {
          campaign_id?: string | null
          company_id: string
          created_at?: string
          email?: string | null
          first_interaction_at?: string | null
          id?: string
          interaction_data?: Json
          interaction_type?: string | null
          last_interaction_at?: string | null
          name?: string | null
          notes?: string | null
          phone_number: string
          session_id?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          campaign_id?: string | null
          company_id?: string
          created_at?: string
          email?: string | null
          first_interaction_at?: string | null
          id?: string
          interaction_data?: Json
          interaction_type?: string | null
          last_interaction_at?: string | null
          name?: string | null
          notes?: string | null
          phone_number?: string
          session_id?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_meta_leads_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_meta_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_meta_leads_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "settings_companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_meta_leads_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_meta_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_meta_sessions: {
        Row: {
          access_token: string | null
          app_id: string | null
          app_secret: string | null
          company_id: string
          connected_at: string | null
          created_at: string
          error_message: string | null
          id: string
          name: string
          phone_number_id: string
          status: string
          updated_at: string
          verify_token: string
          waba_id: string
          webhook_url: string | null
          webhook_verified_at: string | null
        }
        Insert: {
          access_token?: string | null
          app_id?: string | null
          app_secret?: string | null
          company_id: string
          connected_at?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          name: string
          phone_number_id: string
          status?: string
          updated_at?: string
          verify_token?: string
          waba_id: string
          webhook_url?: string | null
          webhook_verified_at?: string | null
        }
        Update: {
          access_token?: string | null
          app_id?: string | null
          app_secret?: string | null
          company_id?: string
          connected_at?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          name?: string
          phone_number_id?: string
          status?: string
          updated_at?: string
          verify_token?: string
          waba_id?: string
          webhook_url?: string | null
          webhook_verified_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_meta_sessions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "settings_companies"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_meta_templates: {
        Row: {
          body_text: string
          buttons: Json
          category: string
          company_id: string
          created_at: string
          footer_text: string | null
          header_text: string | null
          header_type: string | null
          id: string
          language: string
          name: string
          rejection_reason: string | null
          session_id: string
          status: string
          synced_at: string | null
          template_id: string | null
          updated_at: string
        }
        Insert: {
          body_text: string
          buttons?: Json
          category?: string
          company_id: string
          created_at?: string
          footer_text?: string | null
          header_text?: string | null
          header_type?: string | null
          id?: string
          language?: string
          name: string
          rejection_reason?: string | null
          session_id: string
          status?: string
          synced_at?: string | null
          template_id?: string | null
          updated_at?: string
        }
        Update: {
          body_text?: string
          buttons?: Json
          category?: string
          company_id?: string
          created_at?: string
          footer_text?: string | null
          header_text?: string | null
          header_type?: string | null
          id?: string
          language?: string
          name?: string
          rejection_reason?: string | null
          session_id?: string
          status?: string
          synced_at?: string | null
          template_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_meta_templates_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "settings_companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_meta_templates_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_meta_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_notas_internas: {
        Row: {
          ativo: boolean
          created_at: string
          created_by: string | null
          departamento_id: string | null
          descricao: string | null
          id: string
          tipo: string
          titulo: string
          updated_at: string
          visibilidade: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          created_by?: string | null
          departamento_id?: string | null
          descricao?: string | null
          id?: string
          tipo?: string
          titulo: string
          updated_at?: string
          visibilidade?: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          created_by?: string | null
          departamento_id?: string | null
          descricao?: string | null
          id?: string
          tipo?: string
          titulo?: string
          updated_at?: string
          visibilidade?: string
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_notas_internas_departamento_id_fkey"
            columns: ["departamento_id"]
            isOneToOne: false
            referencedRelation: "departamentos"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_queues: {
        Row: {
          color: string
          company_id: string
          created_at: string
          greeting_message: string | null
          id: string
          name: string
        }
        Insert: {
          color?: string
          company_id: string
          created_at?: string
          greeting_message?: string | null
          id?: string
          name: string
        }
        Update: {
          color?: string
          company_id?: string
          created_at?: string
          greeting_message?: string | null
          id?: string
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_queues_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "settings_companies"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_roteamento_regras: {
        Row: {
          ativo: boolean
          created_at: string
          created_by: string | null
          departamento_id: string
          id: string
          nome: string
          palavras_chave: string[]
          prioridade: number
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          created_by?: string | null
          departamento_id: string
          id?: string
          nome: string
          palavras_chave?: string[]
          prioridade?: number
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          created_by?: string | null
          departamento_id?: string
          id?: string
          nome?: string
          palavras_chave?: string[]
          prioridade?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_roteamento_regras_departamento_id_fkey"
            columns: ["departamento_id"]
            isOneToOne: false
            referencedRelation: "departamentos"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_sessions: {
        Row: {
          company_id: string
          created_at: string
          created_by: string | null
          credentials: Json
          id: string
          is_default: boolean
          name: string
          phone_number: string | null
          provider: string
          status: string
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          created_by?: string | null
          credentials?: Json
          id?: string
          is_default?: boolean
          name: string
          phone_number?: string | null
          provider: string
          status?: string
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          created_by?: string | null
          credentials?: Json
          id?: string
          is_default?: boolean
          name?: string
          phone_number?: string | null
          provider?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_sessions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "settings_companies"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_slas: {
        Row: {
          ativo: boolean
          created_at: string
          created_by: string | null
          departamento_id: string | null
          id: string
          nome: string
          prioridade: string
          tempo_resolucao_horas: number
          tempo_resposta_min: number
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          created_by?: string | null
          departamento_id?: string | null
          id?: string
          nome: string
          prioridade?: string
          tempo_resolucao_horas?: number
          tempo_resposta_min?: number
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          created_by?: string | null
          departamento_id?: string | null
          id?: string
          nome?: string
          prioridade?: string
          tempo_resolucao_horas?: number
          tempo_resposta_min?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_slas_departamento_id_fkey"
            columns: ["departamento_id"]
            isOneToOne: false
            referencedRelation: "departamentos"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_tags: {
        Row: {
          ativo: boolean
          cor: string
          created_at: string
          created_by: string | null
          departamento_id: string | null
          descricao: string | null
          id: string
          nome: string
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          cor?: string
          created_at?: string
          created_by?: string | null
          departamento_id?: string | null
          descricao?: string | null
          id?: string
          nome: string
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          cor?: string
          created_at?: string
          created_by?: string | null
          departamento_id?: string | null
          descricao?: string | null
          id?: string
          nome?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_tags_departamento_id_fkey"
            columns: ["departamento_id"]
            isOneToOne: false
            referencedRelation: "departamentos"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_templates: {
        Row: {
          atalho: string | null
          ativo: boolean
          categoria: string | null
          conteudo: string
          created_at: string
          created_by: string | null
          departamento_id: string | null
          descricao: string | null
          id: string
          nome: string
          ultimo_uso_em: string | null
          updated_at: string
          usos: number
        }
        Insert: {
          atalho?: string | null
          ativo?: boolean
          categoria?: string | null
          conteudo: string
          created_at?: string
          created_by?: string | null
          departamento_id?: string | null
          descricao?: string | null
          id?: string
          nome: string
          ultimo_uso_em?: string | null
          updated_at?: string
          usos?: number
        }
        Update: {
          atalho?: string | null
          ativo?: boolean
          categoria?: string | null
          conteudo?: string
          created_at?: string
          created_by?: string | null
          departamento_id?: string | null
          descricao?: string | null
          id?: string
          nome?: string
          ultimo_uso_em?: string | null
          updated_at?: string
          usos?: number
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_templates_departamento_id_fkey"
            columns: ["departamento_id"]
            isOneToOne: false
            referencedRelation: "departamentos"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_webhook_raw: {
        Row: {
          conversa_id: string | null
          created_at: string
          erro: string | null
          evento: string | null
          id: string
          mensagem_id: string | null
          payload: Json
          processado: boolean
          processado_em: string | null
          provedor: string
          provedor_message_id: string | null
        }
        Insert: {
          conversa_id?: string | null
          created_at?: string
          erro?: string | null
          evento?: string | null
          id?: string
          mensagem_id?: string | null
          payload: Json
          processado?: boolean
          processado_em?: string | null
          provedor?: string
          provedor_message_id?: string | null
        }
        Update: {
          conversa_id?: string | null
          created_at?: string
          erro?: string | null
          evento?: string | null
          id?: string
          mensagem_id?: string | null
          payload?: Json
          processado?: boolean
          processado_em?: string | null
          provedor?: string
          provedor_message_id?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      eleicoes_resumo_municipios: {
        Row: {
          ano: number | null
          candidato_vencedor: string | null
          cargo: string | null
          codigo_municipio: string | null
          company_id: string | null
          municipio: string | null
          partido_vencedor: string | null
          percentual_vencedor: number | null
          total_votos: number | null
          turno: number | null
          uf: string | null
          votos_vencedor: number | null
        }
        Relationships: []
      }
      vw_eleitores_consolidado: {
        Row: {
          aceite_lgpd: boolean | null
          ativo: boolean | null
          bairro: string | null
          cabo_eleitoral_id: string | null
          cabo_id: string | null
          cep: string | null
          cidade: string | null
          codigo_expira_em: string | null
          codigo_validacao_whatsapp: string | null
          company_id: string | null
          complemento: string | null
          consentimento_lgpd: boolean | null
          consultas_custo_centavos: number | null
          consultas_total: number | null
          cpf: string | null
          created_at: string | null
          created_by: string | null
          data_aceite_lgpd: string | null
          data_nascimento: string | null
          data_ultima_consulta: string | null
          data_validacao_whatsapp: string | null
          email: string | null
          genero: string | null
          id: string | null
          lideranca_id: string | null
          local_votacao: string | null
          motivo_divergencia: string | null
          municipio_eleitoral: string | null
          nome: string | null
          nome_mae: string | null
          numero: string | null
          observacoes: string | null
          origem: string | null
          rua: string | null
          score_confianca: number | null
          score_fidelidade: number | null
          secao_eleitoral: string | null
          status_cadastro: string | null
          status_validacao_eleitoral: string | null
          status_validacao_whatsapp: string | null
          telefone: string | null
          telefone_original: string | null
          telefone_validado: boolean | null
          tentativas_validacao: number | null
          titulo_eleitoral: string | null
          uf: string | null
          uf_eleitoral: string | null
          ultima_consulta_em: string | null
          ultima_interacao: string | null
          updated_at: string | null
          validado: boolean | null
          validado_em: string | null
          validado_por: string | null
          zona_eleitoral: string | null
        }
        Relationships: [
          {
            foreignKeyName: "eleitores_cabo_eleitoral_id_fkey"
            columns: ["cabo_eleitoral_id"]
            isOneToOne: false
            referencedRelation: "cabos_eleitorais"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "eleitores_cabo_id_fkey"
            columns: ["cabo_id"]
            isOneToOne: false
            referencedRelation: "cabos_eleitorais"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "eleitores_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "settings_companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "eleitores_lideranca_id_fkey"
            columns: ["lideranca_id"]
            isOneToOne: false
            referencedRelation: "liderancas"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      analise_cache_limpar: { Args: never; Returns: number }
      analise_cache_obter: {
        Args: { _chave: string; _fonte: string }
        Returns: Json
      }
      analise_cache_salvar: {
        Args: {
          _chave: string
          _fonte: string
          _resultado: Json
          _ttl_segundos?: number
        }
        Returns: undefined
      }
      analise_duplicidade_revisar: {
        Args: { _decisao: string; _id: string; _motivo?: string }
        Returns: undefined
      }
      analise_eleitor_historico: {
        Args: { _eleitor_id: string }
        Returns: {
          detalhes: Json
          ip: string
          ocorrido_em: string
          tipo: string
          titulo: string
          user_agent: string
          user_id: string
        }[]
      }
      analise_feature_ativa: { Args: { _chave: string }; Returns: boolean }
      analise_job_concluir: {
        Args: {
          _erro?: string
          _id: string
          _resultado?: Json
          _sucesso: boolean
        }
        Returns: undefined
      }
      analise_job_enfileirar: {
        Args: {
          _chave?: string
          _max_tentativas?: number
          _payload?: Json
          _prioridade?: number
          _tipo: string
        }
        Returns: string
      }
      analise_job_reservar: {
        Args: { _lote?: number }
        Returns: {
          chave: string | null
          company_id: string
          concluido_em: string | null
          created_at: string
          erro: string | null
          id: string
          iniciado_em: string | null
          max_tentativas: number
          payload: Json
          prioridade: number
          proximo_em: string
          resultado: Json | null
          status: string
          tentativas: number
          tipo: string
          updated_at: string
          user_id: string | null
        }[]
        SetofOptions: {
          from: "*"
          to: "analise_jobs"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      analise_log_registrar: {
        Args: {
          _acao: string
          _detalhes?: Json
          _eleitor_id?: string
          _entidade?: string
          _entidade_id?: string
          _ip?: string
          _user_agent?: string
        }
        Returns: string
      }
      analise_provedor_uso: { Args: { _provedor: string }; Returns: Json }
      analise_provedor_uso_company: {
        Args: { _company_id: string; _provedor: string }
        Returns: Json
      }
      api_registrar_consulta_custo: {
        Args: {
          _api_nome: string
          _eleitor_id?: string
          _erro?: string
          _lideranca_id?: string
          _metadata?: Json
          _quantidade?: number
          _status?: string
        }
        Returns: string
      }
      can_user_create: {
        Args: { _campo: string; _user: string }
        Returns: boolean
      }
      criar_perfil_em_todas_empresas: {
        Args: { _descricao?: string; _nome: string }
        Returns: undefined
      }
      cron_disparos_tick: { Args: never; Returns: undefined }
      current_active_company: { Args: never; Returns: string }
      definir_permissoes_perfil_global: {
        Args: { _nome: string; _permission_ids: string[] }
        Returns: undefined
      }
      gamificacao_verificar_metas: {
        Args: never
        Returns: {
          alerta: string
          meta_id: string
          notificados: number
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      increment_meta_campaign_counter: {
        Args: { _campaign_id: string; _column: string }
        Returns: undefined
      }
      is_active_company: { Args: { _company_id: string }; Returns: boolean }
      is_super_admin: { Args: { _user_id: string }; Returns: boolean }
      lgpd_anonimizar_eleitor: {
        Args: { _eleitor_id: string; _motivo: string }
        Returns: undefined
      }
      lgpd_atender_solicitacao: {
        Args: {
          _id: string
          _resposta?: string
          _status: Database["public"]["Enums"]["lgpd_solicitacao_status"]
        }
        Returns: undefined
      }
      lgpd_pode_exportar: {
        Args: { _company_id: string; _user_id: string }
        Returns: boolean
      }
      lgpd_pode_ver_cpf: {
        Args: { _company_id: string; _user_id: string }
        Returns: boolean
      }
      lgpd_registrar_consentimento: {
        Args: {
          _canal?: string
          _eleitor_id: string
          _finalidade: string
          _ip?: string
          _texto_versao?: string
          _user_agent?: string
        }
        Returns: string
      }
      lgpd_revogar_consentimento: {
        Args: { _consentimento_id: string; _motivo?: string }
        Returns: undefined
      }
      mask_cpf: { Args: { _cpf: string }; Returns: string }
      pesquisa_ja_respondeu: {
        Args: { _pesquisa_id: string; _telefone: string }
        Returns: boolean
      }
      public_get_cabo_link: {
        Args: { _token: string }
        Returns: {
          ativo: boolean
          cabo_nome: string
          company_id: string
          expires_at: string
          id: string
          nome: string
        }[]
      }
      public_get_department_qrcode: {
        Args: { _token: string }
        Returns: {
          ativo: boolean
          departamentos: Json
          expires_at: string
          id: string
          nome: string
        }[]
      }
      public_get_formulario_by_token: {
        Args: { _token: string }
        Returns: {
          company_id: string
          customization: Json
          description: string
          fields: Json
          id: string
          name: string
          status: string
        }[]
      }
      public_submit_cabo_link: {
        Args: {
          _bairro?: string
          _cep?: string
          _cidade?: string
          _complemento?: string
          _nome: string
          _numero?: string
          _rua?: string
          _telefone: string
          _token: string
          _uf?: string
        }
        Returns: string
      }
      public_submit_department_qrcode: {
        Args: {
          _bairro?: string
          _cidade?: string
          _cpf?: string
          _data_nascimento?: string
          _departamentos_selecionados: Json
          _email?: string
          _endereco?: string
          _nome: string
          _observacoes?: string
          _telefone: string
          _token: string
          _uf?: string
        }
        Returns: string
      }
      public_submit_eleitor: {
        Args: {
          _bairro?: string
          _cep?: string
          _cidade?: string
          _complemento?: string
          _nome: string
          _numero?: string
          _rua?: string
          _telefone: string
          _uf?: string
        }
        Returns: string
      }
      reconciliar_logs_tse_orfaos: { Args: never; Returns: number }
      remover_perfil_global: { Args: { _nome: string }; Returns: undefined }
      seed_default_profiles_for_company: {
        Args: { _company_id: string }
        Returns: undefined
      }
      set_active_company: { Args: { _company_id: string }; Returns: undefined }
      template_registrar_uso: {
        Args: { _template_id: string }
        Returns: undefined
      }
      user_belongs_to_company: {
        Args: { _company_id: string; _user_id: string }
        Returns: boolean
      }
      user_default_company: { Args: { _user_id: string }; Returns: string }
      user_has_permission: {
        Args: { _company_id: string; _permission: string; _user_id: string }
        Returns: boolean
      }
      wa_bulk_aquecimento_info: {
        Args: { _api_id: string }
        Returns: {
          api_id: string
          dias: number
          em_aquecimento: boolean
          fase: string
          limite_efetivo: number
          limite_normal: number
        }[]
      }
      wa_bulk_aquecimento_promover: { Args: never; Returns: number }
      wa_bulk_calcular_saude: { Args: { _api_id: string }; Returns: number }
      wa_bulk_camp_incrementar: {
        Args: { _campanha_id: string; _coluna: string }
        Returns: undefined
      }
      wa_bulk_campanha_pausar: {
        Args: { _campanha_id: string; _pausar: boolean }
        Returns: undefined
      }
      wa_bulk_campanha_pode_enviar: {
        Args: { _campanha_id: string }
        Returns: boolean
      }
      wa_bulk_limite_diario_efetivo: {
        Args: {
          _api: Database["public"]["Tables"]["wa_bulk_apis"]["Row"]
          _cfg: Database["public"]["Tables"]["wa_bulk_config"]["Row"]
        }
        Returns: number
      }
      wa_bulk_monitorar_apis: { Args: never; Returns: number }
      wa_bulk_optout_add: {
        Args: {
          _company_id: string
          _motivo?: string
          _observacoes?: string
          _origem?: string
          _telefone: string
        }
        Returns: string
      }
      wa_bulk_optout_check: {
        Args: { _company_id: string; _telefone: string }
        Returns: boolean
      }
      wa_bulk_registrar_envio: {
        Args: { _api_id: string; _erro?: string; _sucesso: boolean }
        Returns: undefined
      }
      wa_bulk_registrar_status: {
        Args: { _api_id: string; _company_id: string; _tipo: string }
        Returns: undefined
      }
      wa_bulk_resetar_contadores: {
        Args: { _modo?: string }
        Returns: undefined
      }
      wa_bulk_selecionar_api: {
        Args: { _company_id: string }
        Returns: {
          access_token: string
          app_id: string | null
          business_account_id: string | null
          company_id: string
          cooldown_ate: string | null
          created_at: string
          display_name: string | null
          erros_consecutivos: number
          id: string
          iniciado_em: string
          intervalo_max_ms: number | null
          intervalo_min_ms: number | null
          msgs_enviadas_hoje: number
          msgs_enviadas_hora: number
          msgs_limite_diario: number | null
          msgs_limite_horario: number | null
          nome: string
          numero_telefone: string
          observacoes: string | null
          phone_number_id: string
          restrito: boolean
          saude: number
          status: string
          taxa_entrega: number
          total_enviadas: number
          total_erros: number
          ultimo_envio: string | null
          ultimo_erro: string | null
          updated_at: string
          waba_id: string | null
          warning_meta: boolean
        }
        SetofOptions: {
          from: "*"
          to: "wa_bulk_apis"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      wa_bulk_telefone_valido: {
        Args: { _telefone: string }
        Returns: {
          digits: string
          motivo: string
          valido: boolean
        }[]
      }
    }
    Enums: {
      app_role: "admin" | "lideranca" | "operador"
      aprovacao_status: "Pendente" | "Aprovado" | "Rejeitado" | "Cancelado"
      aprovacao_tipo:
        | "Campanha"
        | "Evento"
        | "ExclusaoEmMassa"
        | "EdicaoLideranca"
        | "Outro"
      atividade_concorrente_tipo:
        | "Evento"
        | "Post"
        | "Campanha"
        | "Menção"
        | "Outro"
      audit_acao:
        | "Criar"
        | "Editar"
        | "Excluir"
        | "Login"
        | "Logout"
        | "Exportar"
        | "Importar"
        | "Aprovar"
        | "Rejeitar"
        | "Outro"
      automacao_status: "Rascunho" | "Ativa" | "Pausada"
      automacao_trigger_tipo:
        | "novo_eleitor"
        | "eleitor_respondeu_pesquisa"
        | "eleitor_participou_evento"
        | "aniversario_eleitor"
        | "data_especifica"
        | "manual"
      canal_externo: "WhatsApp" | "SMS" | "Telegram" | "Email"
      compromisso_categoria:
        | "Reunião"
        | "Visita"
        | "Evento"
        | "Audiência"
        | "Outro"
      compromisso_prioridade: "Baixa" | "Média" | "Alta"
      compromisso_status: "Agendado" | "Concluído" | "Cancelado"
      conversa_status: "Pendente" | "Em atendimento" | "Atendido"
      crm_interacao_tipo:
        | "Ligação"
        | "WhatsApp"
        | "Email"
        | "Visita"
        | "Reunião"
        | "Outro"
      crm_prioridade: "Baixa" | "Média" | "Alta"
      disparo_dest_status:
        | "pendente"
        | "enviando"
        | "enviado"
        | "falhou"
        | "optout"
        | "ignorado"
      disparo_status:
        | "rascunho"
        | "agendado"
        | "processando"
        | "pausado"
        | "concluido"
        | "cancelado"
        | "falhou"
      evento_status: "Planejado" | "Em Andamento" | "Finalizado"
      execucao_status: "Sucesso" | "Erro" | "Em andamento"
      lgpd_solicitacao_status:
        | "aberta"
        | "em_analise"
        | "aprovada"
        | "rejeitada"
        | "concluida"
      lgpd_solicitacao_tipo:
        | "exclusao"
        | "correcao"
        | "exportacao"
        | "revogacao"
      mensagem_direcao: "entrada" | "saida"
      mensagem_status:
        | "Pendente"
        | "Enviado"
        | "Entregue"
        | "Falhou"
        | "Simulado"
      mensagem_tipo:
        | "texto"
        | "imagem"
        | "audio"
        | "video"
        | "documento"
        | "localizacao"
        | "contato"
        | "outro"
      pergunta_tipo: "multipla" | "sim_nao" | "aberta" | "multipla_varias"
      pesquisa_status: "Rascunho" | "Ativa" | "Finalizada"
      pesquisa_tipo: "Intenção de Voto" | "Satisfação" | "Temas Prioritários"
      post_status: "Rascunho" | "Agendado" | "Publicado" | "Cancelado"
      rede_social:
        | "Instagram"
        | "Facebook"
        | "X"
        | "LinkedIn"
        | "TikTok"
        | "YouTube"
        | "Outro"
      sentimento: "Positivo" | "Neutro" | "Negativo"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "lideranca", "operador"],
      aprovacao_status: ["Pendente", "Aprovado", "Rejeitado", "Cancelado"],
      aprovacao_tipo: [
        "Campanha",
        "Evento",
        "ExclusaoEmMassa",
        "EdicaoLideranca",
        "Outro",
      ],
      atividade_concorrente_tipo: [
        "Evento",
        "Post",
        "Campanha",
        "Menção",
        "Outro",
      ],
      audit_acao: [
        "Criar",
        "Editar",
        "Excluir",
        "Login",
        "Logout",
        "Exportar",
        "Importar",
        "Aprovar",
        "Rejeitar",
        "Outro",
      ],
      automacao_status: ["Rascunho", "Ativa", "Pausada"],
      automacao_trigger_tipo: [
        "novo_eleitor",
        "eleitor_respondeu_pesquisa",
        "eleitor_participou_evento",
        "aniversario_eleitor",
        "data_especifica",
        "manual",
      ],
      canal_externo: ["WhatsApp", "SMS", "Telegram", "Email"],
      compromisso_categoria: [
        "Reunião",
        "Visita",
        "Evento",
        "Audiência",
        "Outro",
      ],
      compromisso_prioridade: ["Baixa", "Média", "Alta"],
      compromisso_status: ["Agendado", "Concluído", "Cancelado"],
      conversa_status: ["Pendente", "Em atendimento", "Atendido"],
      crm_interacao_tipo: [
        "Ligação",
        "WhatsApp",
        "Email",
        "Visita",
        "Reunião",
        "Outro",
      ],
      crm_prioridade: ["Baixa", "Média", "Alta"],
      disparo_dest_status: [
        "pendente",
        "enviando",
        "enviado",
        "falhou",
        "optout",
        "ignorado",
      ],
      disparo_status: [
        "rascunho",
        "agendado",
        "processando",
        "pausado",
        "concluido",
        "cancelado",
        "falhou",
      ],
      evento_status: ["Planejado", "Em Andamento", "Finalizado"],
      execucao_status: ["Sucesso", "Erro", "Em andamento"],
      lgpd_solicitacao_status: [
        "aberta",
        "em_analise",
        "aprovada",
        "rejeitada",
        "concluida",
      ],
      lgpd_solicitacao_tipo: [
        "exclusao",
        "correcao",
        "exportacao",
        "revogacao",
      ],
      mensagem_direcao: ["entrada", "saida"],
      mensagem_status: [
        "Pendente",
        "Enviado",
        "Entregue",
        "Falhou",
        "Simulado",
      ],
      mensagem_tipo: [
        "texto",
        "imagem",
        "audio",
        "video",
        "documento",
        "localizacao",
        "contato",
        "outro",
      ],
      pergunta_tipo: ["multipla", "sim_nao", "aberta", "multipla_varias"],
      pesquisa_status: ["Rascunho", "Ativa", "Finalizada"],
      pesquisa_tipo: ["Intenção de Voto", "Satisfação", "Temas Prioritários"],
      post_status: ["Rascunho", "Agendado", "Publicado", "Cancelado"],
      rede_social: [
        "Instagram",
        "Facebook",
        "X",
        "LinkedIn",
        "TikTok",
        "YouTube",
        "Outro",
      ],
      sentimento: ["Positivo", "Neutro", "Negativo"],
    },
  },
} as const
