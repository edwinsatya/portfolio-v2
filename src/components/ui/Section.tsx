import { Reveal } from "./Reveal";

type SectionProps = {
  id: string;
  eyebrow?: string;
  title?: React.ReactNode;
  lede?: string;
  children: React.ReactNode;
  className?: string;
};

/**
 * Every content block on the page. The `data-section` attribute is what the
 * scroll observer (and, from step 4, NOVA) watches to know where the visitor is.
 */
export function Section({
  id,
  eyebrow,
  title,
  lede,
  children,
  className = "",
}: SectionProps) {
  return (
    <section
      id={id}
      data-section={id}
      aria-labelledby={title ? `${id}-heading` : undefined}
      className={`relative mx-auto w-full max-w-6xl px-6 py-24 sm:px-8 md:py-32 ${className}`}
    >
      {(eyebrow || title || lede) && (
        <Reveal className="mb-14 max-w-2xl md:mb-20">
          {eyebrow && <p className="eyebrow mb-4">{eyebrow}</p>}
          {title && (
            <h2
              id={`${id}-heading`}
              className="text-3xl font-semibold text-balance sm:text-4xl md:text-5xl"
            >
              {title}
            </h2>
          )}
          {lede && (
            <p className="mt-5 text-base leading-relaxed text-muted text-pretty sm:text-lg">
              {lede}
            </p>
          )}
        </Reveal>
      )}
      {children}
    </section>
  );
}
