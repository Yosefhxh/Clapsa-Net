import Image from "next/image";

const SIZES = {
  header: { logo: "h-7 sm:h-10", divider: "h-6 sm:h-8", text: "text-lg sm:text-xl" },
  login: { logo: "h-12 lg:h-14", divider: "h-10 lg:h-12", text: "text-2xl lg:text-3xl" },
};

interface BrandMarkProps {
  size: keyof typeof SIZES;
}

/** Logo en blanco con "NET", para usarse sobre el fondo azul. */
export function BrandMark({ size }: BrandMarkProps) {
  const { logo, divider, text } = SIZES[size];

  return (
    <div className="flex items-center gap-3 text-white sm:gap-4">
      <Image
        src="/clapsa-logo.png"
        alt="CLAPSA - LMT del Pacífico"
        width={320}
        height={84}
        priority
        className={`${logo} w-auto object-contain brightness-0 invert`}
      />
      <span aria-hidden="true" className={`${divider} w-px bg-white/40`} />
      <span className={`${text} font-semibold tracking-wide`}>NET</span>
    </div>
  );
}
