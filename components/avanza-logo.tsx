import Image from "next/image";

export function AvanzaLogo({ className = "" }: { className?: string }) {
  return (
    <Image
      src="/avanza-logo.png"
      alt="Avanza Care"
      width={936}
      height={695}
      priority
      className={className}
    />
  );
}
