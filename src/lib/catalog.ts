export const destinationId = '10000000-0000-4000-8000-000000000001';
export type Place = {
  id: string;
  name: string;
  category: string;
  description: Record<string, string>;
  source_url: string | null;
  participation_status: string;
  checked_at?: string;
  address?: string;
  phone?: string;
  email?: string;
};
export const catalog: Place[] = [
  {
    id: '20000000-0000-4000-8000-000000000001',
    name: 'Garganta del Diablo',
    category: 'nature',
    description: {
      es: 'El río y la selva se encuentran en el gran salto.',
      en: 'The river meets the rainforest at the great falls.',
      pt: 'O rio e a mata se encontram no grande salto.',
    },
    source_url: 'https://visitiguazu.travel/atractivos/cataratas-del-iguazu-parque-nacional/',
    checked_at: '2026-10-10',
    participation_status: 'listed',
  },
  {
    id: '20000000-0000-4000-8000-000000000002',
    name: 'Circuito Superior',
    category: 'nature',
    description: {
      es: 'Una perspectiva de las cataratas desde las pasarelas altas.',
      en: 'A view of the falls from the upper walkways.',
      pt: 'Uma vista das cataratas pelas passarelas superiores.',
    },
    source_url: 'https://visitiguazu.travel/atractivos/cataratas-del-iguazu-parque-nacional/',
    checked_at: '2026-10-10',
    participation_status: 'listed',
  },
  {
    id: '20000000-0000-4000-8000-000000000003',
    name: 'Circuito Inferior',
    category: 'nature',
    description: {
      es: 'Un recorrido entre vegetación, agua y miradores.',
      en: 'A walk through greenery, water and viewpoints.',
      pt: 'Um passeio entre vegetação, água e mirantes.',
    },
    source_url: 'https://visitiguazu.travel/atractivos/cataratas-del-iguazu-parque-nacional/',
    checked_at: '2026-10-10',
    participation_status: 'listed',
  },

  {
    id: 'visit-guira-oga',
    name: 'Güirá Oga',
    category: 'nature',
    description: {
      es: 'Un refugio dedicado al rescate y la rehabilitación de fauna misionera, con recorridos guiados por la selva.',
      en: 'A wildlife rescue and rehabilitation refuge with guided walks through the Misiones forest.',
      pt: 'Um refúgio de resgate e reabilitação da fauna missioneira, com passeios guiados pela mata.',
    },
    source_url: 'https://visitiguazu.travel/atractivos/guira-oga/',
    participation_status: 'listed',
    checked_at: '2026-10-10',
    address: 'Ruta Nacional 12, a 5 km del centro',
  },
  {
    id: 'visit-jardin-picaflores',
    name: 'El Jardín de los Picaflores',
    category: 'nature',
    description: {
      es: 'Un jardín familiar para observar picaflores y otras aves silvestres entre flores y plantas nativas.',
      en: 'A family garden where hummingbirds and other wild birds visit flowers and native plants.',
      pt: 'Um jardim familiar para observar beija-flores e outras aves livres entre flores e plantas nativas.',
    },
    source_url: 'https://visitiguazu.travel/atractivos/el-jardin-de-los-picaflores/',
    participation_status: 'listed',
    checked_at: '2026-10-10',
    address: 'Fray Luis Beltrán 150',
    phone: '+54 9 3757 547026',
  },
  {
    id: 'visit-cultura-guarani',
    name: 'Experiencia Cultura Guaraní',
    category: 'culture',
    description: {
      es: 'La propuesta de Tupã Lodge reúne un sendero interpretativo, música guaraní, sabores tradicionales y artesanías.',
      en: 'Tupã Lodge brings together an interpretive trail, Guaraní music, traditional food and community crafts.',
      pt: 'A proposta do Tupã Lodge reúne trilha interpretativa, música guarani, sabores tradicionais e artesanato.',
    },
    source_url:
      'https://visitiguazu.travel/atractivos/cultural/experiencia-cultura-guarani-un-encuentro-con-las-raices-de-misiones/',
    participation_status: 'listed',
    checked_at: '2026-10-10',
    phone: '+54 9 3757 672064',
  },
  {
    id: 'visit-2000-horizontes',
    name: '2000 Horizontes',
    category: 'rural',
    description: {
      es: 'Un circuito comunitario entre chacras, huertas, talleres y sabores regionales. Las visitas requieren reserva previa.',
      en: 'A community circuit through small farms, gardens, workshops and regional food. Visits require advance booking.',
      pt: 'Um circuito comunitário entre chácaras, hortas, oficinas e sabores regionais. As visitas exigem reserva antecipada.',
    },
    source_url:
      'https://visitiguazu.travel/atractivos/agroecologia/circuito-agroecologico-turismo-comunitario-chacras-puerto-iguazu/',
    participation_status: 'listed',
    checked_at: '2026-10-10',
    phone: '+54 9 3757 684900',
  },
  {
    id: 'visit-tirolesa-cabalgatas',
    name: 'Tirolesa Iguazú, Cabalgatas Iguazú',
    category: 'adventure',
    description: {
      es: 'Tirolesa y cabalgatas en el entorno de la selva misionera. Consultá las opciones y reservá con el prestador.',
      en: 'Zip-line and horseback activities in the Misiones forest. Ask the operator about options and reservations.',
      pt: 'Tirolesa e cavalgadas na mata missioneira. Consulte as opções e reserve com o prestador.',
    },
    source_url: 'https://visitiguazu.travel/atractivos/aventura/tirolesa-iguazu-cabalgatas-iguazu/',
    participation_status: 'listed',
    checked_at: '2026-10-10',
    phone: '+54 9 3757 670805',
  },
  {
    id: 'visit-salto-mbocay',
    name: 'Salto Mbocay',
    category: 'adventure',
    description: {
      es: 'Saltos y senderismo en la zona de las 2000 Hectáreas, con guías y servicios para pasar el día.',
      en: 'Waterfalls and hiking in the 2000 Hectáreas area, with guides and facilities for a day visit.',
      pt: 'Cachoeiras e caminhadas na região das 2000 Hectáreas, com guias e estrutura para passar o dia.',
    },
    source_url: 'https://visitiguazu.travel/atractivos/salto-mbocay-2/',
    participation_status: 'listed',
    checked_at: '2026-10-10',
    phone: '+54 9 3757 633654',
  },
  {
    id: 'visit-reemix',
    name: 'Reemix.tur.ar',
    category: 'agency',
    description: {
      es: 'Agencia de atención exclusivamente online con propuestas de excursiones, traslados, vuelos y hoteles.',
      en: 'An online-only travel agency listing excursions, transfers, flights and hotels.',
      pt: 'Agência com atendimento exclusivamente online e propostas de passeios, traslados, voos e hotéis.',
    },
    source_url: 'https://visitiguazu.travel/agencias/reemix-tur-ar/',
    participation_status: 'listed',
    checked_at: '2026-10-10',
    email: 'ventas@reemix.tur.ar',
  },
  {
    id: 'visit-comercial',
    name: 'Comercial de Turismo',
    category: 'agency',
    description: {
      es: 'Agencia incluida en el directorio de Visit Iguazú. Contactala para conocer sus propuestas.',
      en: 'An agency listed in the Visit Iguazú directory. Contact it to explore its services.',
      pt: 'Agência incluída no diretório Visit Iguazú. Entre em contato para conhecer suas propostas.',
    },
    source_url: 'https://visitiguazu.travel/agencias/comercial-de-turismo/',
    participation_status: 'listed',
    checked_at: '2026-10-10',
    address: 'Batalla Mborore S/N, 600 Has.',
    phone: '3757 493060',
    email: 'silvia@comercialdeturismo.com',
  },
  {
    id: 'visit-aguas-grandes',
    name: 'Aguas Grandes',
    category: 'agency',
    description: {
      es: 'Agencia que presenta servicios para viajeros nacionales e internacionales en el destino Iguazú.',
      en: 'An agency presenting services for domestic and international visitors to Iguazú.',
      pt: 'Agência que apresenta serviços para visitantes nacionais e internacionais em Iguaçu.',
    },
    source_url: 'https://visitiguazu.travel/agencias/aguas-grandes/',
    participation_status: 'listed',
    checked_at: '2026-10-10',
    address: 'Entre Ríos 66',
    phone: '3757 425500',
    email: 'info@aguasgrandes.tur.ar',
  },
  {
    id: 'visit-wondersfalls',
    name: 'Wondersfalls',
    category: 'agency',
    description: {
      es: 'Agencia incluida en el directorio de Visit Iguazú. Contactala para conocer sus propuestas.',
      en: 'An agency listed in the Visit Iguazú directory. Contact it to explore its services.',
      pt: 'Agência incluída no diretório Visit Iguazú. Entre em contato para conhecer suas propostas.',
    },
    source_url: 'https://visitiguazu.travel/agencias/wondersfalls/',
    participation_status: 'listed',
    checked_at: '2026-10-10',
    address: 'Jangadero 702',
    phone: '3757 624666',
    email: 'ivanlopriore@gmail.com',
  },
  {
    id: 'visit-venteveo',
    name: 'Venteveo Turismo',
    category: 'agency',
    description: {
      es: 'Agencia incluida en el directorio de Visit Iguazú. Contactala para conocer sus propuestas.',
      en: 'An agency listed in the Visit Iguazú directory. Contact it to explore its services.',
      pt: 'Agência incluída no diretório Visit Iguazú. Entre em contato para conhecer suas propostas.',
    },
    source_url: 'https://visitiguazu.travel/agencias/venteveo-turismo/',
    participation_status: 'listed',
    checked_at: '2026-10-10',
    address: 'Curupí 53, Barrio Comandante Andresito',
    phone: '3757 677394',
    email: 'info@venteveoturismo.tur.ar',
  },
  {
    id: 'visit-seven',
    name: 'Turismo Seven Iguazú',
    category: 'agency',
    description: {
      es: 'Agencia incluida en el directorio de Visit Iguazú. Contactala para conocer sus propuestas.',
      en: 'An agency listed in the Visit Iguazú directory. Contact it to explore its services.',
      pt: 'Agência incluída no diretório Visit Iguazú. Entre em contato para conhecer suas propostas.',
    },
    source_url: 'https://visitiguazu.travel/agencias/turismo-seven-iguazu/',
    participation_status: 'listed',
    checked_at: '2026-10-10',
    address: 'Av. Moretti 168',
    phone: '3757 407340',
    email: 'turismosiguazu@gmail.com',
  },
];

export function filterPlaces(places: Place[], category = '', query = '') {
  const normalize = (value: string) =>
    value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase();
  const needle = normalize(query.trim());
  return places.filter(
    (place) =>
      (!category || place.category === category) &&
      normalize(
        [place.name, place.address, ...Object.values(place.description)].join(' '),
      ).includes(needle),
  );
}

// Keep the editorial directory available when a database is connected. Database
// records win identity matches; directory membership never grants participation.
export function mergePlaces(records: Place[]): Place[] {
  const normalize = (value: string) =>
    value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim();
  return [
    ...records,
    ...catalog.filter(
      (entry) =>
        !records.some(
          (record) => record.id === entry.id || normalize(record.name) === normalize(entry.name),
        ),
    ),
  ];
}
