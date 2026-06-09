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
          id: "admin-auditoria-moradores-convite",
          label: "Moradores",
          icon: Users,
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

};