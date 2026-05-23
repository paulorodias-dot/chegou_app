import {
  LayoutDashboard,
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
      label: "Dashboard",
      icon: LayoutDashboard,
    },
    {
      id: "admin-cadastros",
      label: "Cadastro",
      icon: ClipboardList,
      children: [
        {
          id: "admin-cadastro-morador",
          label: "Morador",
          icon: UserPlus,
        },
      ],
    },
    {
      id: "admin-notificacoes",
      label: "Notificações",
      icon: Bell,
    },
    {
      id: "admin-relatorios",
      label: "Relatórios",
      icon: FileText,
    },
  ],
};