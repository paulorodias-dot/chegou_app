import {
  Activity,
  BellRing,
  Boxes,
  Building2,
  CalendarDays,
  CarFront,
  ChartNoAxesCombined,
  CircleGauge,
  ClipboardCheck,
  PackageCheck,
  ShieldCheck,
  Sparkles,
  Star,
  Users,
  UserRoundCog,
  Wrench,
} from "lucide-react";

export const ADMIN_ANALYTICS_CATALOG =
  Object.freeze([
    {
      id: "inteligencia",
      group: "INTELIGENCIA",
      label: "Inteligência",
      shortLabel: "Inteligência",
      description:
        "Prioridades e fatos relevantes",
      icon: Sparkles,
      available: true,
    },

    {
      id: "visao-geral",
      group: "INTELIGENCIA",
      label: "Visão Geral",
      shortLabel: "Visão Geral",
      description:
        "Indicadores consolidados",
      icon: CircleGauge,
      available: false,
    },

    {
      id: "saude-operacional",
      group: "INTELIGENCIA",
      label: "Saúde Operacional",
      shortLabel: "Saúde",
      description:
        "Visão consolidada da operação",
      icon: Activity,
      available: false,
    },

    {
      id: "encomendas",
      group: "OPERACAO",
      label: "Encomendas",
      shortLabel: "Encomendas",
      description:
        "Fluxo e operação de encomendas",
      icon: PackageCheck,
      available: false,
    },

    {
      id: "armazenamento",
      group: "OPERACAO",
      label: "Armazenamento",
      shortLabel: "Armazenamento",
      description:
        "Capacidade e ocupação",
      icon: Boxes,
      available: false,
    },

    {
      id: "notificacoes",
      group: "OPERACAO",
      label: "Notificações",
      shortLabel: "Notificações",
      description:
        "Entrega e ciência",
      icon: BellRing,
      available: false,
    },

    {
      id: "funcionarios",
      group: "PESSOAS",
      label: "Funcionários",
      shortLabel: "Funcionários",
      description:
        "Distribuição operacional",
      icon: UserRoundCog,
      available: false,
    },

    {
      id: "moradores",
      group: "PESSOAS",
      label: "Moradores",
      shortLabel: "Moradores",
      description:
        "Adesão e atividade",
      icon: Users,
      available: false,
    },

    {
      id: "unidades",
      group: "PESSOAS",
      label: "Unidades e Torres",
      shortLabel: "Unidades",
      description:
        "Visão agregada das unidades",
      icon: Building2,
      available: false,
    },

    {
      id: "garagens",
      group: "GESTAO",
      label: "Garagens",
      shortLabel: "Garagens",
      description:
        "Uso e empréstimos",
      icon: CarFront,
      available: false,
    },

    {
      id: "servicos",
      group: "GESTAO",
      label: "Serviços",
      shortLabel: "Serviços",
      description:
        "Serviços e operação",
      icon: Wrench,
      available: false,
    },

    {
      id: "agenda",
      group: "GESTAO",
      label: "Agenda",
      shortLabel: "Agenda",
      description:
        "Compromissos autorizados",
      icon: CalendarDays,
      available: false,
    },

    {
      id: "experiencia",
      group: "EXPERIENCIA",
      label: "Experiência",
      shortLabel: "Experiência",
      description:
        "NPS, adesão e fricções",
      icon: Star,
      available: false,
    },

    {
      id: "seguranca",
      group: "SEGURANCA",
      label: "Segurança",
      shortLabel: "Segurança",
      description:
        "Riscos operacionais",
      icon: ShieldCheck,
      available: false,
    },

    {
      id: "auditoria",
      group: "SEGURANCA",
      label: "Auditoria",
      shortLabel: "Auditoria",
      description:
        "Pendências e conformidade",
      icon: ClipboardCheck,
      available: false,
    },

    {
      id: "tendencias",
      group: "RELATORIOS",
      label: "Tendências",
      shortLabel: "Tendências",
      description:
        "Comparações e sazonalidade",
      icon: ChartNoAxesCombined,
      available: false,
    },
  ]);

export function getAdminAnalyticsItem(id) {
  return (
    ADMIN_ANALYTICS_CATALOG.find(
      (item) => item.id === id
    ) ||
    ADMIN_ANALYTICS_CATALOG[0]
  );
}