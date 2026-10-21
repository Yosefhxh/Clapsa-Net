import { TipoCliente, TipoOperacion } from "@prisma/client";

export { TipoCliente, TipoOperacion };

export interface Cliente {
  id: number;
  folio: string;
  razonSocial: string;
  rfc: string;
  domicilio: string;
  tipo: TipoCliente;
}

export interface FormDataCliente {
  razonSocial: string;
  rfc: string;
  calle: string;
  estado: string;
  codigoPostal: string;
  domicilio: string;
}

export type ModalMode = "create" | "edit";
