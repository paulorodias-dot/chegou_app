import divulgueNegocioImage from '../partner-chegou-divulgue-negocio.png'
import novosClientesImage from '../partner-chegou-novos-clientes.png'
import sejaParceiroImage from '../partner-chegou-seja-parceiro.png'

export const TEMPORARY_PARTNER_AD_SLIDES = [
  {
    id: 'partner-chegou-seja-parceiro',
    campaignId: 'PARTNER_CAMPAIGN_TEMP_001',
    partnerId: 'SISTEMA_CHEGOU',
    imageSrc: sejaParceiroImage,
    imageAlt:
      'Seja um Parceiro Chegou! Sua marca dentro dos condomínios.',
    label: 'Publicidade',
    status: 'active',
  },
  {
    id: 'partner-chegou-novos-clientes',
    campaignId: 'PARTNER_CAMPAIGN_TEMP_002',
    partnerId: 'SISTEMA_CHEGOU',
    imageSrc: novosClientesImage,
    imageAlt:
      'Quer novos clientes? Anuncie no Sistema Chegou!',
    label: 'Publicidade',
    status: 'active',
  },
  {
    id: 'partner-chegou-divulgue-negocio',
    campaignId: 'PARTNER_CAMPAIGN_TEMP_003',
    partnerId: 'SISTEMA_CHEGOU',
    imageSrc: divulgueNegocioImage,
    imageAlt:
      'Divulgue seu negócio no Sistema Chegou! Alcance moradores, síndicos e administradores.',
    label: 'Publicidade',
    status: 'active',
  },
]