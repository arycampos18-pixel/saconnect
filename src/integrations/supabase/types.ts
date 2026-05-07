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
      aprovacoes: {
        Row: {
          created_at: string
          dados: Json
          decidido_em: string | null
          decidido_por: string | null
          descricao: string | null
          executado: boolean
          executado_em: string | null
          id: string
          motivo_decisao: string | null
          solicitado_por: string | null
          status: Database["public"]["Enums"]["aprovacao_status"]
          tipo: Database["public"]["Enums"]["aprovacao_tipo"]
          titulo: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          dados?: Json
          decidido_em?: string | null
          decidido_por?: string | null
          descricao?: string | null
          executado?: boolean
          executado_em?: string | null
          id?: string
          motivo_decisao?: string | null
          solicitado_por?: string | null
          status?: Database["public"]["Enums"]["aprovacao_status"]
          tipo?: Database["public"]["Enums"]["aprovacao_tipo"]
          titulo: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          dados?: Json
          decidido_em?: string | null
          decidido_por?: string | null
          descricao?: string | null
          executado?: boolean
          executado_em?: string | null
          id?: string
          motivo_decisao?: string | null
          solicitado_por?: string | null
          status?: Database["public"]["Enums"]["aprovacao_status"]
          tipo?: Database["public"]["Enums"]["aprovacao_tipo"]
          titulo?: string
          updated_at?: string
        }
        Relationships: []
      }
      audit_logs: {
        Row: {
          acao: Database["public"]["Enums"]["audit_acao"]
          created_at: string
          dados_anteriores: Json | null
          dados_novos: Json | null
          descricao: string | null
          entidade: string
          entidade_id: string | null
          id: string
          ip_address: string | null
          modulo: string | null
          user_agent: string | null
          user_email: string | null
          user_id: string | null
          user_nome: string | null
        }
        Insert: {
          acao?: Database["public"]["Enums"]["audit_acao"]
          created_at?: string
          dados_anteriores?: Json | null
          dados_novos?: Json | null
          descricao?: string | null
          entidade: string
          entidade_id?: string | null
          id?: string
          ip_address?: string | null
          modulo?: string | null
          user_agent?: string | null
          user_email?: string | null
          user_id?: string | null
          user_nome?: string | null
        }
        Update: {
          acao?: Database["public"]["Enums"]["audit_acao"]
          created_at?: string
          dados_anteriores?: Json | null
          dados_novos?: Json | null
          descricao?: string | null
          entidade?: string
          entidade_id?: string | null
          id?: string
          ip_address?: string | null
          modulo?: string | null
          user_agent?: string | null
          user_email?: string | null
          user_id?: string | null
          user_nome?: string | null
        }
        Relationships: []
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
          tipo: Database["public"]["Enums"]["crm_interacao_tipo"]
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
          tipo?: Database["public"]["Enums"]["crm_interacao_tipo"]
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
          tipo?: Database["public"]["Enums"]["crm_interacao_tipo"]
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
      departamento_membros: {
        Row: {
          bairro: string | null
          cep: string | null
          cidade: string | null
          company_id: string | null
          complemento: string | null
          created_at: string
          departamento_id: string
          id: string
          numero: string | null
          rua: string | null
          uf: string | null
          user_id: string
        }
        Insert: {
          bairro?: string | null
          cep?: string | null
          cidade?: string | null
          company_id?: string | null
          complemento?: string | null
          created_at?: string
          departamento_id: string
          id?: string
          numero?: string | null
          rua?: string | null
          uf?: string | null
          user_id: string
        }
        Update: {
          bairro?: string | null
          cep?: string | null
          cidade?: string | null
          company_id?: string | null
          complemento?: string | null
          created_at?: string
          departamento_id?: string
          id?: string
          numero?: string | null
          rua?: string | null
          uf?: string | null
          user_id?: string
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
        ]
      }
      departamentos: {
        Row: {
          ativo: boolean
          company_id: string | null
          cor: string
          created_at: string
          created_by: string | null
          descricao: string | null
          icone: string
          id: string
          nome: string
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          company_id?: string | null
          cor?: string
          created_at?: string
          created_by?: string | null
          descricao?: string | null
          icone?: string
          id?: string
          nome: string
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          company_id?: string | null
          cor?: string
          created_at?: string
          created_by?: string | null
          descricao?: string | null
          icone?: string
          id?: string
          nome?: string
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
            foreignKeyName: "eleitor_tags_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "tags"
            referencedColumns: ["id"]
          },
        ]
      }
      eleitores: {
        Row: {
          ativo: boolean
          bairro: string | null
          cabo_eleitoral_id: string | null
          cabo_id: string | null
          cep: string | null
          cidade: string | null
          company_id: string | null
          complemento: string | null
          consentimento_lgpd: boolean
          cpf: string | null
          created_at: string
          created_by: string | null
          data_nascimento: string | null
          email: string | null
          genero: string | null
          id: string
          lideranca_id: string | null
          nome: string
          numero: string | null
          observacoes: string | null
          origem: string
          rua: string | null
          telefone: string
          uf: string | null
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          bairro?: string | null
          cabo_eleitoral_id?: string | null
          cabo_id?: string | null
          cep?: string | null
          cidade?: string | null
          company_id?: string | null
          complemento?: string | null
          consentimento_lgpd?: boolean
          cpf?: string | null
          created_at?: string
          created_by?: string | null
          data_nascimento?: string | null
          email?: string | null
          genero?: string | null
          id?: string
          lideranca_id?: string | null
          nome: string
          numero?: string | null
          observacoes?: string | null
          origem?: string
          rua?: string | null
          telefone: string
          uf?: string | null
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          bairro?: string | null
          cabo_eleitoral_id?: string | null
          cabo_id?: string | null
          cep?: string | null
          cidade?: string | null
          company_id?: string | null
          complemento?: string | null
          consentimento_lgpd?: boolean
          cpf?: string | null
          created_at?: string
          created_by?: string | null
          data_nascimento?: string | null
          email?: string | null
          genero?: string | null
          id?: string
          lideranca_id?: string | null
          nome?: string
          numero?: string | null
          observacoes?: string | null
          origem?: string
          rua?: string | null
          telefone?: string
          uf?: string | null
          updated_at?: string
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
            foreignKeyName: "evento_inscricoes_evento_id_fkey"
            columns: ["evento_id"]
            isOneToOne: false
            referencedRelation: "eventos"
            referencedColumns: ["id"]
          },
        ]
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
          status: Database["public"]["Enums"]["evento_status"]
          tipo: Database["public"]["Enums"]["evento_tipo"]
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
          status?: Database["public"]["Enums"]["evento_status"]
          tipo: Database["public"]["Enums"]["evento_tipo"]
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
          status?: Database["public"]["Enums"]["evento_status"]
          tipo?: Database["public"]["Enums"]["evento_tipo"]
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
          tipo: Database["public"]["Enums"]["pesquisa_tipo"]
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
          tipo: Database["public"]["Enums"]["pesquisa_tipo"]
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
          tipo?: Database["public"]["Enums"]["pesquisa_tipo"]
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
          created_at: string
          email: string
          id: string
          is_super_admin: boolean
          nome: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          email: string
          id: string
          is_super_admin?: boolean
          nome: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          is_super_admin?: boolean
          nome?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
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
          id: string
          nome: string
        }
        Insert: {
          ativo?: boolean
          company_id?: string | null
          cor?: string
          created_at?: string
          id?: string
          nome: string
        }
        Update: {
          ativo?: boolean
          company_id?: string | null
          cor?: string
          created_at?: string
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
          description: string | null
          id: string
          name: string
        }
        Insert: {
          color?: string | null
          company_id: string
          created_at?: string
          description?: string | null
          id?: string
          name: string
        }
        Update: {
          color?: string | null
          company_id?: string
          created_at?: string
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
      [_ in never]: never
    }
    Functions: {
      criar_perfil_em_todas_empresas: {
        Args: { _descricao?: string; _nome: string }
        Returns: undefined
      }
      cron_disparos_tick: { Args: never; Returns: undefined }
      definir_permissoes_perfil_global: {
        Args: { _nome: string; _permission_ids: string[] }
        Returns: undefined
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
      is_super_admin: { Args: { _user_id: string }; Returns: boolean }
      pesquisa_ja_respondeu: {
        Args: { _pesquisa_id: string; _telefone: string }
        Returns: boolean
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
      remover_perfil_global: { Args: { _nome: string }; Returns: undefined }
      seed_default_profiles_for_company: {
        Args: { _company_id: string }
        Returns: undefined
      }
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
      evento_tipo: "Saúde" | "Educação" | "Assistência" | "Jurídico" | "Cursos"
      execucao_status: "Sucesso" | "Erro" | "Em andamento"
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
      evento_tipo: ["Saúde", "Educação", "Assistência", "Jurídico", "Cursos"],
      execucao_status: ["Sucesso", "Erro", "Em andamento"],
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
