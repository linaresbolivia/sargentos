/**
 * Motor Inteligente de Corrección Ortográfica, Acentos y Predicción de Texto
 * para el Módulo de Correspondencia y Hojas de Ruta del Club Hípico Los Sargentos.
 */

// 1. Diccionario de corrección automática de acentos y mayúsculas en Correspondencia
export const CORRESPONDENCE_ACCENT_DICTIONARY: Record<string, string> = {
  // Términos administrativos y de trámite
  'tramite': 'trámite',
  'tramites': 'trámites',
  'autorizacion': 'autorización',
  'autorizaciones': 'autorizaciones',
  'aprobacion': 'aprobación',
  'aprobaciones': 'aprobaciones',
  'informacion': 'información',
  'resolucion': 'resolución',
  'resoluciones': 'resoluciones',
  'derivacion': 'derivación',
  'derivaciones': 'derivaciones',
  'radicacion': 'radicación',
  'conclusion': 'conclusión',
  'conclusiones': 'conclusiones',
  'notificacion': 'notificación',
  'notificaciones': 'notificaciones',
  'recepcion': 'recepción',
  'documentacion': 'documentación',
  'liquidacion': 'liquidación',
  'cancelacion': 'cancelación',
  'facturacion': 'facturación',
  'cotizacion': 'cotización',
  'cotizaciones': 'cotizaciones',
  'adquisicion': 'adquisición',
  'adquisiciones': 'adquisiciones',
  'gestion': 'gestión',
  'gestiones': 'gestiones',
  'peticion': 'petición',
  'peticiones': 'peticiones',
  'atencion': 'atención',
  'clasificacion': 'clasificación',
  'inspeccion': 'inspección',
  'disposicion': 'disposición',
  'devolucion': 'devolución',
  'instruccion': 'instrucción',
  'instrucciones': 'instrucciones',
  'comunicacion': 'comunicación',
  'comunicaciones': 'comunicaciones',
  'observacion': 'observación',
  'observaciones': 'observaciones',
  'certificacion': 'certificación',
  'certificaciones': 'certificaciones',
  'verificacion': 'verificación',
  'verificaciones': 'verificaciones',
  'fiscalizacion': 'fiscalización',
  'coordinacion': 'coordinación',
  'planificacion': 'planificación',
  'solicitud': 'solicitud',
  'expediente': 'expediente',
  'antecedentes': 'antecedentes',
  'memorandum': 'memorándum',
  'reglamentario': 'reglamentario',
  'presupuesto': 'presupuesto',
  'institucional': 'institucional',
  'urgente': 'URGENTE',
  'prioritario': 'prioritario',
  'informe': 'informe',

  // Cargos y Departamentos con tilde y mayúscula institucional
  'gerencia': 'Gerencia',
  'gerencia general': 'Gerencia General',
  'secretaria': 'Secretaría',
  'secretaria general': 'Secretaría General',
  'presidencia': 'Presidencia',
  'administracion': 'Administración',
  'juridica': 'Jurídica',
  'direccion': 'Dirección',
  'tesoreria': 'Tesorería',
  'contabilidad': 'Contabilidad',
  'contrataciones': 'Contrataciones',
  'adquisiciones y compras': 'Adquisiciones y Compras',
  'sistemas': 'Sistemas y Tecnología',
  'tecnologia': 'Tecnología',
  'recursos humanos': 'Recursos Humanos',
  'auditoria': 'Auditoría',
  'porteria': 'Portería',
  'veterinaria': 'Veterinaria',
  'caseta': 'Caseta de Control',

  // Palabras comunes en español con tildes
  'mas': 'más',
  'tambien': 'también',
  'despues': 'después',
  'ademas': 'además',
  'segun': 'según',
  'asi': 'así',
  'aqui': 'aquí',
  'alla': 'allá',
  'estara': 'estará',
  'sera': 'será',
  'habra': 'habrá',
  'quedo': 'quedó',
  'envio': 'envío',
  'solicito': 'solicitó',
  'aprobo': 'aprobó',
  'remitio': 'remitió',
  'concluyo': 'concluyó',
  'derivo': 'derivó',
  'radico': 'radicó',
  'dia': 'día',
  'dias': 'días',
  'año': 'año',
  'años': 'años',
  'numero': 'número',
  'numeros': 'números',
  'codigo': 'código',
  'codigos': 'códigos',
  'pagina': 'página',
  'paginas': 'páginas',
  'ultimo': 'último',
  'proximo': 'próximo',
  'maximo': 'máximo',
  'minimo': 'mínimo',
  'tecnico': 'técnico',
  'medico': 'médico',
  'economico': 'económico',
  'publico': 'público',
  'estandar': 'estándar',
  'area': 'área',
  'areas': 'áreas',
};

// 2. Frases predictivas institucionales frecuentes
export const CORRESPONDENCE_PREDICTIVE_PHRASES: string[] = [
  // Proveídos e instrucciones
  'Para su conocimiento y fines consiguientes.',
  'Para su informe y recomendación técnica.',
  'Para visto bueno y autorización de Gerencia General.',
  'Para trámite y pago correspondiente según presupuesto aprobado.',
  'Favor coordinar con el departamento solicitante a la brevedad.',
  'Se remite antecedentes digitalizados y documentación respaldatoria.',
  'Trámite concluido y aprobado satisfactoriamente para su archivo.',
  'Para archivo y custodia en Secretaría General.',
  'Favor emitir pronunciamiento jurídico a la brevedad posible.',
  'Atención con carácter URGENTE conforme a plazos SLA del Club.',
  'Favor proceder con la respectiva verificación y visto bueno.',
  'Se autoriza el requerimiento solicitado bajo normativa vigente.',
  'Para revisión de cumplimiento de requisitos y formalidades reglamentarias.',
  'Remitir cotizaciones y cuadro comparativo para evaluación de Directorio.',
  'Para liquidación de pago previo descargo de factura y recibos.',
  'Favor notificar formalmente a la parte interesada con copia a Secretaría.',
  'Aprobado según determinación de Directorio y Gerencia General.',
  'Se adjunta comprobante de transferencia y respaldo contable.',
  'Solicitud de mantenimiento preventivo y correctivo en predios del Club.',
  'Se solicita provisión de insumos y materiales según requerimiento.',

  // Asuntos / Referencias frecuentes
  'Solicitud de aprobación de presupuesto y orden de compra',
  'Informe técnico de evaluación y cotización de servicios',
  'Nota de solicitud de permiso y uso de instalaciones deportivas',
  'Descargo de gastos y rendición de cuentas institucional',
  'Informe de inspección y estado de infraestructura del Club',
  'Solicitud de baja y archivo definitivo de documentación',
  'Contrato de prestación de servicios y mantenimiento de áreas',
  'Autorización de desembolso para pago a proveedores',
  'Requerimiento de personal y dotación de insumos de trabajo',
  'Consulta jurídica sobre aplicación de reglamentación interna',
];

/**
 * Normaliza y aplica corrección automática de tildes a palabras clave
 */
export function autoCorrectAccents(text: string): string {
  if (!text) return '';

  // Reemplazar palabras completas usando el diccionario
  const words = text.split(/(\s+|[.,;!?()]+)/);
  const correctedWords = words.map((word) => {
    const cleanLower = word.toLowerCase().trim();
    if (CORRESPONDENCE_ACCENT_DICTIONARY[cleanLower]) {
      const replacement = CORRESPONDENCE_ACCENT_DICTIONARY[cleanLower];
      // Si la palabra original empezaba con mayúscula, preservar mayúscula
      if (word.length > 0 && word[0] === word[0].toUpperCase()) {
        return replacement.charAt(0).toUpperCase() + replacement.slice(1);
      }
      return replacement;
    }
    return word;
  });

  return correctedWords.join('');
}

/**
 * Busca predicciones de texto en base a lo que el usuario ha escrito
 */
export function getPredictiveSuggestion(currentInput: string): string | null {
  if (!currentInput || currentInput.trim().length < 3) return null;

  const clean = currentInput.trim().toLowerCase();
  
  // 1. Buscar coincidencia con frases completas
  const matchedPhrase = CORRESPONDENCE_PREDICTIVE_PHRASES.find((phrase) =>
    phrase.toLowerCase().startsWith(clean)
  );

  if (matchedPhrase && matchedPhrase.toLowerCase() !== clean) {
    // Retornar la parte faltante de la frase
    return matchedPhrase.slice(currentInput.length);
  }

  // 2. Buscar sugerencia para la última palabra incompleta
  const tokens = currentInput.split(/\s+/);
  const lastToken = tokens[tokens.length - 1]?.toLowerCase() || '';

  if (lastToken.length >= 2) {
    for (const [rawKey, accentedVal] of Object.entries(CORRESPONDENCE_ACCENT_DICTIONARY)) {
      if (rawKey.startsWith(lastToken) && rawKey !== lastToken) {
        return accentedVal.slice(lastToken.length);
      }
    }
  }

  return null;
}
