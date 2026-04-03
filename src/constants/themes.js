export const THEME_NAMES = [
  'theme-fantasy',
  'theme-cyberpunk',
  'theme-eldritch',
  'theme-supernatural',
  'theme-romance',
  'theme-noir',
]

export const GENRE_THEME_MAP = {
  'Fantasía':         'theme-fantasy',
  'XXXPunk':          'theme-cyberpunk',
  'Mitos de Cthulhu': 'theme-eldritch',
  'Sobrenatural':     'theme-supernatural',
  'Romance':          'theme-romance',
  'Investigación':    'theme-noir',
}

// Epoch takes priority over genre when they map to different themes
export const EPOCH_THEME_MAP = {
  'Antigüedad':   'theme-eldritch',
  'Medieval':     'theme-fantasy',
  'Renacimiento': 'theme-supernatural',
  'Victoriana':   'theme-noir',
  'Contemporanea':'theme-cyberpunk',
  'Futuro':       'theme-cyberpunk',
}
