import { inicialesEmpresa, tonoAvatar } from "@/shared/utils/avatar";

/** Cuadro con las iniciales de la empresa en su color. */
export function Avatar({ texto, className = "" }: { texto: string; className?: string }) {
  const [fondo, color] = tonoAvatar(texto);
  return (
    <span className={`clp-av ${className}`} style={{ background: fondo, color }} aria-hidden="true">
      {inicialesEmpresa(texto)}
    </span>
  );
}
