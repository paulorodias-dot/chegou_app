export {
  CAPTURA_ORIGEM,
  CAPTURA_MOTOR,
  CAPTURA_FORMATO,
  CAPTURA_STATUS,
  CAPTURA_CONFIG,
  FORMATOS_BARCODE_DETECTOR,
} from "./constants/capturaCodigo.constants";

export {
  textoOuNull,
  normalizarCodigoCaptura,
  mapearFormatoCaptura,
  compararCodigoComVolume,
  criarResultadoCaptura,
} from "./utils/capturaCodigo.utils";

export {
  decodificarCodigoImagem,
  criarCapturaLeitorFisico,
  criarCapturaManual,
  obterCapacidadesCaptura,
  possuiBarcodeDetectorNativo,
  possuiSuporteCameraBrowser,
} from "./services/capturaCodigoService";

export {
  limparTextoOCR,
  normalizarLinhaOCR,
  extrairNomeProvavelOCR,
  extrairTorreBlocoOCR,
  extrairUnidadeOCR,
  analisarTextoEtiquetaOCR,
  reconhecerEtiquetaOCR,
  encerrarWorkerOCR,
} from "./ocr";