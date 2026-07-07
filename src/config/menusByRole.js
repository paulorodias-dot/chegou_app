import {
  LayoutDashboard,
  Home,
  Building2,
  ClipboardList,
  Users,
  UserPlus,
  Bell,
  Settings,
  FileText,
  ShieldCheck,
  Mail,
  Clock,
  Package,
  Car,
  User,
  HelpCircle,
  Info,
  BriefcaseBusiness,
  UserCog,
  Truck,
  Handshake
} from "lucide-react";

export const menusByRole = {
  master: [
    {
      id: "dashboard",
      label: "Dashboard",
      icon: LayoutDashboard,
    },
    {
      id: "condominios",
      label: "Condomínios",
      icon: Building2,
      children: [
        {
          id: "condominios-cadastro",
          label: "Cadastro",
          icon: ClipboardList,
        },
        {
          id: "condominios-auditoria",
          label: "Aprovações",
          icon: ShieldCheck,
        },
      ],
    },

    {
      id: "usuarios-master",
      label: "Usuários",
      icon: UserCog,
      novo: true,
      children: [
        {
          id: "cargos-funcoes",
          label: "Cargos e Funções",
          icon: BriefcaseBusiness,
          novo: true,
        },
      ],
    },

    {
      id: "usuarios",
      label: "Usuários",
      icon: Users,
    },
    {
      id: "convites",
      label: "Convites",
      icon: Mail,
    },
    {
      id: "notificacoes",
      label: "Notificações",
      icon: Bell,
    },
    {
      id: "logs-sistema",
      label: "Logs do Sistema",
      icon: Clock,
    },
    {
      id: "configuracoes",
      label: "Configurações",
      icon: Settings,
    },
  ],

  admin_logistica: [
    {
      id: "admin-dashboard",
      label: "Início",
      icon: Home,
    },
    {
      id: "admin-cadastros",
      label: "Cadastro",
      icon: ClipboardList,
      mobileTarget: "admin-cadastro-morador",
      novo: true,
      children: [
        {
          id: "admin-cadastro-morador",
          label: "Morador",
          icon: UserPlus,
        },
        {
          id: "admin-divergencias-moradores",
          label: "Divergências",
          icon: ShieldCheck,
        },
        {
          id: "admin-funcionarios",
          label: "Funcionários",
          icon: UserCog,
          visible: true,
        },
        {
          id: "admin-cargos-funcoes",
          label: "Cargos e Funções",
          icon: BriefcaseBusiness,
          novo: true,
        },
        {
          id: "admin-transportadora",
          label: "Transportadora",
          icon: Truck,
          visible: false,
        },
        {
          id: "admin-fornecedor",
          label: "Fornecedor",
          icon: Handshake,
          visible: true,
        },
      ],
    },
    {
      id: "admin-auditoria-logs",
      label: "Auditoria e Logs",
      icon: ShieldCheck,
      mobileTarget: "admin-auditoria-moradores-convite",
      hideOnMobileBottom: true,
      children: [
        {
          id: "admin-auditoria-moradores-pre-cadastro",
          label: "Moradores",
          icon: Mail,
        },
        {
          id: "admin-logs-auditoria",
          label: "Logs de Auditoria",
          icon: Clock,
        },
      ],
    },
    {
      id: "admin-encomendas",
      label: "Encomendas",
      icon: Package,
    },
    {
      id: "admin-notificacoes",
      label: "Alertas",
      icon: Bell,
    },
    {
      id: "admin-configuracoes",
      label: "Config",
      icon: Settings,
    },
    {
      id: "admin-relatorios",
      label: "Relatórios",
      icon: FileText,
      hideOnMobileBottom: true,
    },
  ],

    morador: [
    {
      id: "morador-dashboard",
      label: "Início",
      icon: Home,
      visible: true,
    },
    {
      id: "morador-encomendas",
      label: "Encomendas",
      icon: Package,
      visible: false,
      children: [
        {
          id: "morador-encomendas-retiradas",
          label: "Retiradas",
          icon: Package,
          visible: false,
        },
        {
          id: "morador-encomendas-rastreio",
          label: "Rastreio",
          icon: Package,
          visible: false,
        },
        {
          id: "morador-encomendas-diretas-grande-porte",
          label: "Diretas e Grande Porte",
          icon: Package,
          visible: false,
        },
        {
          id: "morador-encomendas-pendentes",
          label: "Pendentes",
          icon: Package,
          visible: false,
        },
        {
          id: "morador-encomendas-recebidas",
          label: "Recebidas",
          icon: Package,
          visible: false,
        },
      ],
    },
    {
      id: "morador-vagas-garagem",
      label: "Vagas de Garagem",
      icon: Car,
      visible: false,
      children: [
        {
          id: "morador-garagem-perfil-vaga",
          label: "Perfil Vaga",
          icon: Car,
          visible: false,
        },
        {
          id: "morador-garagem-emprestimo",
          label: "Empréstimo",
          icon: Car,
          visible: false,
        },
      ],
    },
    {
      id: "morador-perfil",
      label: "Perfil",
      icon: User,
      visible: false,
    },
    {
      id: "morador-notificacoes",
      label: "Notificações",
      icon: Bell,
      visible: false,
    },
    {
      id: "morador-configuracoes",
      label: "Configurações",
      icon: Settings,
      visible: false,
    },
    {
      id: "morador-manual-ajuda",
      label: "Manual e Ajuda",
      icon: HelpCircle,
      visible: false,
    },
    {
      id: "morador-sobre",
      label: "Sobre",
      icon: Info,
      visible: false,
    },
  ],
};
