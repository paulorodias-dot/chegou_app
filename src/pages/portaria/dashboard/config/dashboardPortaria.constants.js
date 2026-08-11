import {
  Boxes,
  LayoutDashboard,
  MessageCircleMore,
  PackageCheck,
  PackagePlus,
  ScanLine,
  Truck,
} from "lucide-react";

export const PORTARIA_WORK_ACTIONS = Object.freeze([
  {
    id: "receber-encomenda",
    label: "Receber Encomenda",
    description:
      "Registrar encomendas entregues por transportadoras e entregadores.",
    shortcut: "F2",
    icon: Truck,
    tone: "blue",
  },

  {
    id: "encomenda-rapida",
    label: "Encomenda Rápida",
    description:
      "Registrar rapidamente quando os dados essenciais já estiverem disponíveis.",
    shortcut: "F3",
    icon: ScanLine,
    tone: "orange",
  },

  {
    id: "cadastrar-encomenda",
    label: "Cadastrar Encomenda",
    description:
      "Realizar o cadastro completo e identificar corretamente o destinatário.",
    shortcut: "F4",
    icon: PackagePlus,
    tone: "green",
  },

  {
    id: "entregar-encomenda",
    label: "Entregar Encomenda",
    description:
      "Validar a retirada e registrar com segurança quem recebeu.",
    shortcut: "F5",
    icon: PackageCheck,
    tone: "amber",
  },

  {
    id: "painel-encomendas",
    label: "Painel de Encomendas",
    description:
      "Consultar, localizar e acompanhar as encomendas do condomínio.",
    shortcut: "F6",
    icon: LayoutDashboard,
    tone: "violet",
  },

  {
    id: "whatsapp-pendentes",
    label: "WhatsApp Pendentes",
    description:
      "Consultar comunicações que ainda exigem acompanhamento operacional.",
    shortcut: "F7",
    icon: MessageCircleMore,
    tone: "teal",
  },
]);

export const PORTARIA_SECONDARY_ACTIONS = Object.freeze([
  {
    id: "pendentes-identificacao",
    label: "Pendentes de Identificação",
    description:
      "Encomendas já recebidas que ainda exigem confirmação segura do destinatário.",
    icon: Boxes,
  },

  {
    id: "armazenamento",
    label: "Armazenamento",
    description:
      "Consultar posições, capacidade e movimentações da área de armazenamento.",
  },

  {
    id: "historico-operacional",
    label: "Histórico Operacional",
    description:
      "Consultar operações e eventos registrados anteriormente.",
  },
]);

export const PORTARIA_KPI_DEFINITIONS = Object.freeze([
  {
    id: "recebidasHoje",
    label: "Recebidas hoje",
    helper: "Encomendas registradas no dia",
    icon: Truck,
  },

  {
    id: "retiradasHoje",
    label: "Retiradas hoje",
    helper: "Retiradas concluídas no dia",
    icon: PackageCheck,
  },

  {
    id: "aguardandoRetirada",
    label: "Aguardando retirada",
    helper: "Disponíveis para retirada",
    icon: Boxes,
  },

  {
    id: "pendentesIdentificacao",
    label: "Sem identificação",
    helper: "Aguardando confirmação",
    icon: ScanLine,
  },
]);

export const PORTARIA_BREAKPOINTS = Object.freeze({
  desktopIntermediate: 1360,
  sidebarStack: 1120,
  tablet: 900,
  mobile: 680,
  compactMobile: 430,
});