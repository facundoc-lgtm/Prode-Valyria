const FLAGS: Record<string, string> = {
  'Estados Unidos': '🇺🇸', 'México': '🇲🇽', 'Canadá': '🇨🇦',
  'España': '🇪🇸', 'Francia': '🇫🇷', 'Alemania': '🇩🇪',
  'Portugal': '🇵🇹', 'Inglaterra': '🏴󠁧󠁢󠁥󠁮󠁧󠁿', 'Países Bajos': '🇳🇱',
  'Bélgica': '🇧🇪', 'Italia': '🇮🇹', 'Croacia': '🇭🇷',
  'Suiza': '🇨🇭', 'Dinamarca': '🇩🇰', 'Austria': '🇦🇹',
  'Turquía': '🇹🇷', 'Serbia': '🇷🇸', 'Hungría': '🇭🇺',
  'Escocia': '🏴󠁧󠁢󠁳󠁣󠁴󠁿', 'Chequia': '🇨🇿', 'Polonia': '🇵🇱',
  'Uruguay': '🇺🇾', 'Ecuador': '🇪🇨', 'Argentina': '🇦🇷',
  'Colombia': '🇨🇴', 'Brasil': '🇧🇷', 'Venezuela': '🇻🇪',
  'Paraguay': '🇵🇾', 'Bolivia': '🇧🇴', 'Chile': '🇨🇱', 'Perú': '🇵🇪',
  'Japón': '🇯🇵', 'Corea del Sur': '🇰🇷', 'Arabia Saudita': '🇸🇦',
  'Australia': '🇦🇺', 'Irán': '🇮🇷', 'Qatar': '🇶🇦',
  'Irak': '🇮🇶', 'Uzbekistán': '🇺🇿', 'Indonesia': '🇮🇩',
  'Marruecos': '🇲🇦', 'Senegal': '🇸🇳', 'Nigeria': '🇳🇬',
  'Costa de Marfil': '🇨🇮', 'Egipto': '🇪🇬', 'Ghana': '🇬🇭',
  'Camerún': '🇨🇲', 'Argelia': '🇩🇿', 'Sudáfrica': '🇿🇦',
  'Nueva Zelanda': '🇳🇿', 'Honduras': '🇭🇳', 'Jamaica': '🇯🇲',
  'Panamá': '🇵🇦', 'Costa Rica': '🇨🇷',
};

export function getFlag(team: string): string {
  return FLAGS[team] ?? '🏳';
}
