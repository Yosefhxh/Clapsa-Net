export const ESTADOS_MEXICO = [
  "AGUASCALIENTES",
  "BAJA CALIFORNIA",
  "BAJA CALIFORNIA SUR",
  "CAMPECHE",
  "CHIAPAS",
  "CHIHUAHUA",
  "CIUDAD DE MEXICO",
  "COAHUILA",
  "COLIMA",
  "DURANGO",
  "GUANAJUATO",
  "GUERRERO",
  "HIDALGO",
  "JALISCO",
  "MEXICO",
  "MICHOACAN",
  "MORELOS",
  "NAYARIT",
  "NUEVO LEON",
  "OAXACA",
  "PUEBLA",
  "QUERETARO",
  "QUINTANA ROO",
  "SAN LUIS POTOSI",
  "SINALOA",
  "SONORA",
  "TABASCO",
  "TAMAULIPAS",
  "TLAXCALA",
  "VERACRUZ",
  "YUCATAN",
  "ZACATECAS",
] as const;

const ESTADO_ALIAS: Record<string, string[]> = {
  "CIUDAD DE MEXICO": ["CIUDAD DE MEXICO", "CDMX", "DISTRITO FEDERAL"],
  "MEXICO": ["MEXICO", "ESTADO DE MEXICO", "EDO MEX", "EDO. MEX", "EDO DE MEXICO"],
};

export function normalizarTexto(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .trim();
}

export function obtenerEstadoDesdeDireccion(direccion: string) {
  const texto = normalizarTexto(direccion);

  for (const estado of ESTADOS_MEXICO) {
    const aliases = ESTADO_ALIAS[estado] ?? [estado];

    if (aliases.some((alias) => texto.includes(normalizarTexto(alias)))) {
      return estado;
    }
  }

  return "";
}
