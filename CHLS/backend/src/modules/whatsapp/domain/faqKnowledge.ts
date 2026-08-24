export interface FaqTopic {
  id: string;
  category: 'AREA_HUMEDA' | 'DEPORTES' | 'TRANSITO' | 'CUOTAS' | 'TRAMITES' | 'INSTITUCIONAL';
  title: string;
  keywords: string[];
  response: string;
}

export const CHLS_KNOWLEDGE_BASE: FaqTopic[] = [
  // --- ÁREA HÚMEDA ---
  {
    id: 'horarios-area-humeda',
    category: 'AREA_HUMEDA',
    title: 'Horarios del Área Húmeda (Piscina y Saunas)',
    keywords: [
      'horario piscina', 'horarios piscina', 'hora piscina', 'abrir piscina', 'cierra piscina',
      'horario sauna', 'horarios sauna', 'hora sauna', 'area humeda horarios', 'horario feriado piscina'
    ],
    response: `🏊‍♂️ *HORARIOS ÁREA HÚMEDA* ♨️\n` +
      `━━━━━━━━━━━━━━━━━━━━\n` +
      `• 📅 *Mar a Vie:* 06:00 a 22:00\n` +
      `• 📅 *Sáb y Dom:* 07:00 a 20:00\n` +
      `• 📅 *Feriados:* 08:00 a 20:00\n` +
      `• 🚫 *Lunes:* Mantenimiento\n` +
      `━━━━━━━━━━━━━━━━━━━━\n` +
      `📌 _Requiere cuotas al día e indumentaria reglamentaria._`
  },
  {
    id: 'tarifas-invitados-area-humeda',
    category: 'AREA_HUMEDA',
    title: 'Tarifas de Invitados en Área Húmeda',
    keywords: [
      'costo invitado piscina', 'precio invitado piscina', 'tarifa invitado piscina', 'invitado sauna precio',
      'cuanto paga invitado piscina', 'pase invitado piscina', 'costo area humeda invitado', 'pases pronto pago'
    ],
    response: `💵 *TARIFAS INVITADOS - PISCINA Y SAUNAS* 🏊‍♂️\n` +
      `━━━━━━━━━━━━━━━━━━━━\n` +
      `📅 *Martes a Viernes:*\n` +
      `• 🧒 Niños (4-12 años): *Bs. 90*\n` +
      `• 🧑 Adultos (13+ años): *Bs. 130*\n\n` +
      `📅 *Sábados, Domingos y Feriados:*\n` +
      `• 🧒 Niños (4-12 años): *Bs. 130*\n` +
      `• 🧑 Adultos (13+ años): *Bs. 170*\n` +
      `━━━━━━━━━━━━━━━━━━━━\n` +
      `🎁 *Pronto Pago:* Si pagaste tu anualidad adelantada, tus pases de cortesía no pagan.\n` +
      `⚠️ _El invitado debe ingresar con el socio titular/dependiente._`
  },
  {
    id: 'normas-indumentaria-piscina',
    category: 'AREA_HUMEDA',
    title: 'Indumentaria y Normas en Área Húmeda',
    keywords: [
      'indumentaria piscina', 'ropa piscina', 'gorra natacion', 'que llevar piscina', 'reglamento piscina',
      'vestimenta piscina', 'lentes natacion', 'chinelas', 'sandalias', 'ducha obligatoria', 'temperatura piscina'
    ],
    response: `🩱 *INDUMENTARIA Y NORMAS DEL ÁREA HÚMEDA* 🧼\n` +
      `━━━━━━━━━━━━━━━━━━━━\n` +
      `✅ *Indumentaria Obligatoria:*\n` +
      `• Traje de baño adecuado (no shorts deportivos ni tops).\n` +
      `• Chinelas / sandalias de agua.\n` +
      `• Gorra de natación (no de tela) y lentes.\n\n` +
      `🚿 *Higiene y Edades:*\n` +
      `• Ducha obligatoria antes y después (máx. 5 min).\n` +
      `• Temperatura del agua: 27°C a 30°C.\n` +
      `• 🔞 *Saunas/Hidromasaje:* Mayores de 18 años.\n` +
      `• 🧒 *Piscina Chica:* Exclusiva menores de 8 años.\n` +
      `• 👶 *Bebés (<3 años):* Pañal especial de agua.\n` +
      `• 🚫 *Prohibido:* Alcohol, vidrio, comida, fumar o cremas en saunas.\n` +
      `━━━━━━━━━━━━━━━━━━━━`
  },

  // --- DEPORTES Y CANCHAS (ESPECÍFICOS POR DEPORTE) ---
  {
    id: 'deporte-tenis',
    category: 'DEPORTES',
    title: 'Canchas de Tenis',
    keywords: [
      'tenis', 'cancha tenis', 'reserva tenis', 'invitado tenis', 'precio tenis', 'costo tenis'
    ],
    response: `🎾 *CANCHAS DE TENIS* 🏆\n` +
      `━━━━━━━━━━━━━━━━━━━━\n` +
      `💵 *Costo Invitado:* Bs. 50 / hora\n` +
      `⏱️ *Duración:* 1 hora\n` +
      `⏳ *Anticipación:* 48 horas previas\n` +
      `📞 *Contactos de Reserva:*\n` +
      `   👉 +591 76753734\n` +
      `   👉 +591 76753758\n` +
      `━━━━━━━━━━━━━━━━━━━━`
  },
  {
    id: 'deporte-padel',
    category: 'DEPORTES',
    title: 'Canchas de Pádel',
    keywords: [
      'padel', 'cancha padel', 'reserva padel', 'invitado padel', 'precio padel', 'costo padel'
    ],
    response: `🎾 *CANCHAS DE PÁDEL* 🏆\n` +
      `━━━━━━━━━━━━━━━━━━━━\n` +
      `💵 *Costo Invitado:* Bs. 80 / hora\n` +
      `⏱️ *Duración:* 1 hora\n` +
      `📍 *Reserva:* Caseta / Atención al Socio\n` +
      `📞 *Contactos de Reserva:*\n` +
      `   👉 +591 76753758\n` +
      `   👉 +591 76753744\n` +
      `━━━━━━━━━━━━━━━━━━━━`
  },
  {
    id: 'deporte-racquet',
    category: 'DEPORTES',
    title: 'Canchas de Racquetball',
    keywords: [
      'racquet', 'racquetball', 'cancha racquet', 'reserva racquet', 'invitado racquet', 'costo racquet'
    ],
    response: `🏓 *CANCHAS DE RACQUETBALL* 🏆\n` +
      `━━━━━━━━━━━━━━━━━━━━\n` +
      `💵 *Costo Invitado:* Bs. 50 / hora\n` +
      `⏱️ *Duración:* 1 hora\n` +
      `📍 *Reserva:* Recepción de Gimnasio\n` +
      `📞 *Contacto de Reserva:*\n` +
      `   👉 +591 76753743\n` +
      `━━━━━━━━━━━━━━━━━━━━`
  },
  {
    id: 'deporte-fronton',
    category: 'DEPORTES',
    title: 'Canchas de Frontón',
    keywords: [
      'fronton', 'cancha fronton', 'reserva fronton', 'invitado fronton', 'costo fronton'
    ],
    response: `🧱 *CANCHAS DE FRONTÓN* 🏆\n` +
      `━━━━━━━━━━━━━━━━━━━━\n` +
      `💵 *Costo Invitado:* Bs. 50 / hora\n` +
      `⏱️ *Duración:* 1 hora\n` +
      `📍 *Reserva:* Caseta y Atención al Socio\n` +
      `📞 *Contactos de Reserva:*\n` +
      `   👉 +591 76753758\n` +
      `   👉 +591 76753734\n` +
      `━━━━━━━━━━━━━━━━━━━━`
  },
  {
    id: 'deporte-polifuncional',
    category: 'DEPORTES',
    title: 'Cancha Polifuncional (Futsal, Vóley, Básquet)',
    keywords: [
      'futsal', 'futbol', 'voley', 'volleyball', 'basquet', 'basketball', 'cancha polifuncional'
    ],
    response: `⚽ *CANCHA POLIFUNCIONAL* 🏆\n` +
      `_(Futsal • Voleibol • Básquetbol)_\n` +
      `━━━━━━━━━━━━━━━━━━━━\n` +
      `💵 *Costo Cancha:* Bs. 100 / hora\n` +
      `📋 *Requisito:* Socio presenta lista de invitados\n` +
      `⏱️ *Duración:* 1 hora\n` +
      `📞 *Contactos de Reserva:*\n` +
      `   👉 +591 76753758\n` +
      `   👉 +591 76753744\n` +
      `━━━━━━━━━━━━━━━━━━━━`
  },
  {
    id: 'entrenadores-personales-externos',
    category: 'DEPORTES',
    title: 'Entrenadores Personales Externos (Gimnasio)',
    keywords: [
      'entrenador personal', 'personal trainer', 'entrenador externo', 'costo entrenador', 'pase entrenador',
      'ingreso entrenador', 'gimnasio entrenador'
    ],
    response: `🏋️ *ENTRENADORES EXTERNOS (GIMNASIO)* 📋\n` +
      `━━━━━━━━━━━━━━━━━━━━\n` +
      `• 1 vez/sem (4 al mes): *Bs. 80/mes*\n` +
      `• 2 veces/sem (8 al mes): *Bs. 150/mes*\n` +
      `• 3 veces/sem (12 al mes): *Bs. 230/mes*\n` +
      `• 4-5 veces/sem (mes): *Bs. 380/mes*\n` +
      `━━━━━━━━━━━━━━━━━━━━\n` +
      `💳 _Pago en Recepción del Gimnasio._`
  },

  // --- TRÁNSITO, PARQUEOS Y CIRCULACIÓN ---
  {
    id: 'normas-circulacion-parqueos',
    category: 'TRANSITO',
    title: 'Reglamento de Circulación, Parqueos y Multas',
    keywords: [
      'velocidad maxima', 'limite velocidad', 'parqueo', 'estacionamiento', 'capacidad parqueo',
      'infraccion transito', 'multa transito', 'mascotas', 'mascota', 'perros', 'perro', 'gatos', 'animales',
      'puedo llevar mascota', 'prohibido mascotas', 'ingreso vehiculo', 'transito club'
    ],
    response: `🚗 *PARQUEOS Y CIRCULACIÓN CHLS* 🅿️\n` +
      `━━━━━━━━━━━━━━━━━━━━\n` +
      `🅿️ *Capacidad:* 120 autos y 22 motos (Acceso biométrico).\n` +
      `🛑 *Velocidad:* *15 km/h* máx. (y *10 km/h* zona equinos).\n` +
      `🚶‍♂️ *Peatones:* Preferencia de paso absoluta.\n` +
      `🚫 *Mascotas:* Terminantemente prohibido el ingreso.\n\n` +
      `⚠️ *Multas por Infracción:*\n` +
      `• *Leve (5% cuota):* Bocinazo, puerta abierta, sin número.\n` +
      `• *Grave (20% cuota + 15d suspensión):* Celular al volante, mal estacionado, sin cinturón.\n` +
      `• *Muy Grave (50% cuota + 30d suspensión):* Exceso de 15 km/h, contra ruta, estado etílico.\n` +
      `━━━━━━━━━━━━━━━━━━━━\n` +
      `⏱️ _Impugnaciones: Plazo 48 hrs ante Gerencia General._`
  },

  // --- FINANZAS, CUOTAS Y RÉGIMEN PATRIMONIAL ---
  {
    id: 'cuotas-mora-reversion',
    category: 'CUOTAS',
    title: 'Vencimiento de Cuotas y Reversión de Membresías',
    keywords: [
      'cuando vence cuota', 'fecha limite cuota', 'mora cuota', 'reversion accion', 'perder accion',
      'cuota social pago', 'deuda cuotas', 'cuota mantenimiento caballo', 'interes mora'
    ],
    response: `💳 *CUOTAS, MORA Y PATRIMONIO* 📊\n` +
      `━━━━━━━━━━━━━━━━━━━━\n` +
      `🗓️ *Vencimiento:* Vencen el *1er día del mes siguiente* al mes vencido.\n\n` +
      `⚠️ *Reversión de Acción por Impago:*\n` +
      `• Por *6 meses consecutivos* en mora, o\n` +
      `• Por *8 meses discontinuos* en el año.\n` +
      `• _(Socio con mora no puede ingresar a instalaciones)_\n\n` +
      `🐴 *Manutención Equina:* Si adeuda *3 meses consecutivos*, el caballo es retirado de pesebreras.\n` +
      `━━━━━━━━━━━━━━━━━━━━`
  },
  {
    id: 'socio-ausente-requisitos',
    category: 'CUOTAS',
    title: 'Socio Ausente (50% de Cuota Social)',
    keywords: [
      'socio ausente', 'cambio socio ausente', 'descuento viaje', 'descuento ausencia',
      'art 88 estatuto', 'requisitos socio ausente', '50 cuota'
    ],
    response: `✈️ *SOCIO AUSENTE (Art. 88)* 📜\n` +
      `━━━━━━━━━━━━━━━━━━━━\n` +
      `🎉 *Beneficio:* Paga el *50% de la cuota social* (para ausencias >6 meses consecutivos).\n\n` +
      `📄 *Requisitos a presentar a Gerencia:*\n` +
      `1. Carta de solicitud formal.\n` +
      `2. Respaldo (Contrato trabajo / Residencia / Universidad / Declaración Jurada).\n\n` +
      `⚠️ _Rige desde la recepción de carta (no es retroactivo)._\n` +
      `━━━━━━━━━━━━━━━━━━━━`
  },
  {
    id: 'beneficio-hijos-socios',
    category: 'CUOTAS',
    title: 'Beneficios de Admisión para Hijos de Socios',
    keywords: [
      'accion para hijo', 'conversion socio hijo', 'hijo de socio cuota ingreso', 'descuento hijo de socio',
      'hijos menores de 25', 'art 18 estatuto', 'cuota ingreso hijo'
    ],
    response: `🌟 *BENEFICIOS PARA HIJOS DE SOCIOS (Art. 18)* 👨‍👩‍👧\n` +
      `━━━━━━━━━━━━━━━━━━━━\n` +
      `• 🧒 *Menores de 25 años:* *100% EXENTOS* de cuota de ingreso (solo adquieren cuota de participación).\n\n` +
      `• 🧑 *De 25 a 32 años:* *50% DE DESCUENTO* en el valor de la cuota de ingreso.\n` +
      `━━━━━━━━━━━━━━━━━━━━`
  },

  // --- TRÁMITES Y AFILIACIONES ---
  {
    id: 'afiliacion-dependientes',
    category: 'TRAMITES',
    title: 'Afiliación de Cónyuge e Hijos (<25 años)',
    keywords: [
      'afiliar esposa', 'afiliar esposo', 'afiliar conyuge', 'afiliar hijo', 'requisitos dependiente',
      'art 16 estatuto', 'carnet dependiente', 'matrimonio de hecho'
    ],
    response: `👨‍👩‍👧 *AFILIACIÓN DE DEPENDIENTES (Art. 16)* 📄\n` +
      `━━━━━━━━━━━━━━━━━━━━\n` +
      `👰 *Cónyuge:*\n` +
      `• Carta a Gerencia General + Certificado de matrimonio original + CI color + Foto 4x4.\n\n` +
      `👦 *Hijos Menores de 25 años:*\n` +
      `• Carta a Gerencia General + Certificados de nacimiento + CI color + Fotos 4x4.\n\n` +
      `💍 *Matrimonio de Hecho:* Carta al Directorio, antigüedad >2 años, fallo judicial o división de bienes.\n` +
      `━━━━━━━━━━━━━━━━━━━━\n` +
      `📌 _Requiere tener las cuotas sociales al día._`
  },
  {
    id: 'invitados-sin-cargo-padres',
    category: 'TRAMITES',
    title: 'Invitados Sin Cargo para Padres y Suegros (65+ años)',
    keywords: [
      'invitado sin cargo', 'padres sin cargo', 'suegros sin cargo', 'art 21 reglamento',
      'mayor de 65 años', 'ingreso padres gratis', 'tutela menores'
    ],
    response: `🧓 *INVITADOS SIN CARGO (Art. 21)* 🆓\n` +
      `━━━━━━━━━━━━━━━━━━━━\n` +
      `👵 *Padres y Suegros (65+ años cumplidos):*\n` +
      `• Carta al Directorio + Fotocopia CI color + Foto 4x4 celeste claro + Cuotas al día.\n\n` +
      `👶 *Menores bajo Tutela:*\n` +
      `• Carta al Directorio + Poder notariado de custodia legal + CI color + Foto 4x4.\n` +
      `━━━━━━━━━━━━━━━━━━━━\n` +
      `⚠️ _Máximo 2 invitados sin cargo por socio. Vigencia de 1 año renovable._`
  },

  // --- INSTITUCIONAL ---
  {
    id: 'informacion-institucional',
    category: 'INSTITUCIONAL',
    title: 'Ubicación, Central Telefónica y Datos del Club',
    keywords: [
      'donde queda', 'direccion club', 'ubicacion club', 'telefono club', 'central piloto',
      'pagina web', 'correo club', 'fundacion club', 'como llegar'
    ],
    response: `🐴 *CLUB HÍPICO LOS SARGENTOS* 🏆\n` +
      `_“Pertenecer es un placer”_\n` +
      `━━━━━━━━━━━━━━━━━━━━\n` +
      `📍 *Ubicación:* Av. Los Sargentos N° 1000 esq. Costanera (Obrajes Calle 8), La Paz.\n` +
      `☎️ *Central Piloto:* 2788000\n` +
      `🌐 *Web:* www.sargentos.net\n` +
      `🏛️ *Fundación:* 3 de Noviembre de 1926.\n` +
      `━━━━━━━━━━━━━━━━━━━━\n` +
      `💬 _Atención virtual automatizada 24/7._`
  }
];

/**
 * Motor de búsqueda inteligente de FAQs (Scoring NLP)
 */
export function findFaqAnswer(query: string): { topic: FaqTopic; score: number } | null {
  if (!query || query.trim().length < 3) return null;

  const normalize = (str: string) =>
    str
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

  const cleanQuery = normalize(query);
  const queryTokens = cleanQuery.split(' ').filter(t => t.length > 2);

  if (queryTokens.length === 0) return null;

  let bestMatch: FaqTopic | null = null;
  let highestScore = 0;

  for (const topic of CHLS_KNOWLEDGE_BASE) {
    let score = 0;

    for (const keyword of topic.keywords) {
      const cleanKeyword = normalize(keyword);
      if (cleanQuery.includes(cleanKeyword)) {
        score += 15;
      } else {
        const kwTokens = cleanKeyword.split(' ');
        const matches = kwTokens.filter(kt => queryTokens.includes(kt));
        if (matches.length === kwTokens.length && kwTokens.length > 1) {
          score += 10;
        } else if (matches.length > 0) {
          score += matches.length * 2.5;
        }
      }
    }

    const cleanTitle = normalize(topic.title);
    const titleTokens = cleanTitle.split(' ');
    for (const qt of queryTokens) {
      if (titleTokens.includes(qt)) {
        score += 2;
      }
    }

    if (score > highestScore && score >= 5) {
      highestScore = score;
      bestMatch = topic;
    }
  }

  if (bestMatch && highestScore >= 5) {
    return { topic: bestMatch, score: highestScore };
  }

  return null;
}
