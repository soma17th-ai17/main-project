"use client";

import { forwardRef, useMemo } from "react";
import { cn } from "@/lib/utils";
import { PALETTES } from "@/lib/templates";
import type { GeneratedCard, UploadedPhoto } from "@/lib/types";

interface CardPreviewProps {
  card: GeneratedCard;
  photo?: UploadedPhoto;
  storeName: string;
  size?: number;
  className?: string;
}

const PATTERN_SVG = (color: string) =>
  `data:image/svg+xml;utf8,${encodeURIComponent(
    `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 60 60'>
      <g fill='${color}' fill-opacity='0.18'>
        <circle cx='8' cy='8' r='2'/>
        <circle cx='32' cy='20' r='2'/>
        <circle cx='52' cy='8' r='2'/>
        <circle cx='20' cy='40' r='2'/>
        <circle cx='44' cy='44' r='2'/>
        <circle cx='8' cy='52' r='2'/>
      </g>
    </svg>`,
  )}`;

export const CardPreview = forwardRef<HTMLDivElement, CardPreviewProps>(
  function CardPreview({ card, photo, storeName, size = 540, className }, ref) {
    const palette = PALETTES[card.paletteId];
    const innerStyle = useMemo(
      () => ({
        width: size,
        height: size,
        background: palette.bg,
        color: palette.fg,
      }),
      [size, palette],
    );

    return (
      <div
        ref={ref}
        data-card-id={card.id}
        className={cn(
          "relative overflow-hidden rounded-3xl border border-black/5 shadow-[0_30px_80px_-32px_rgba(20,30,50,0.4)]",
          className,
        )}
        style={innerStyle}
      >
        <Layout
          card={card}
          photo={photo}
          palette={palette}
          storeName={storeName}
          size={size}
        />
      </div>
    );
  },
);

interface LayoutProps {
  card: GeneratedCard;
  photo?: UploadedPhoto;
  palette: (typeof PALETTES)[keyof typeof PALETTES];
  storeName: string;
  size: number;
}

function Layout(props: LayoutProps) {
  switch (props.card.template) {
    case "polaroid-stack":
      return <PolaroidStack {...props} />;
    case "magazine-cut":
      return <MagazineCut {...props} />;
    case "ticker-tape":
      return <TickerTape {...props} />;
    case "headline-strip":
    default:
      return <HeadlineStrip {...props} />;
  }
}

function PhotoArea({
  photo,
  accent,
  rounded = false,
  className,
}: {
  photo?: UploadedPhoto;
  accent: string;
  rounded?: boolean;
  className?: string;
}) {
  if (photo) {
    return (
      <div
        className={cn(
          "relative h-full w-full overflow-hidden",
          rounded ? "rounded-2xl" : "",
          className,
        )}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={photo.dataUrl}
          alt=""
          crossOrigin="anonymous"
          className="h-full w-full object-cover"
        />
      </div>
    );
  }
  return (
    <div
      className={cn(
        "relative h-full w-full overflow-hidden",
        rounded ? "rounded-2xl" : "",
        className,
      )}
      style={{
        background: `linear-gradient(135deg, ${accent}40, ${accent}15)`,
      }}
    >
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: `url("${PATTERN_SVG(accent)}")`,
          backgroundSize: "60px 60px",
        }}
      />
      <div className="absolute inset-0 grid place-items-center">
        <span
          className="rounded-full px-3 py-1 text-[10px] font-semibold uppercase tracking-widest"
          style={{ background: accent, color: "#fff" }}
        >
          mock image
        </span>
      </div>
    </div>
  );
}

function Pill({
  children,
  bg,
  fg,
  className,
}: {
  children: React.ReactNode;
  bg: string;
  fg: string;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex w-fit items-center gap-1.5 rounded-full px-3 py-1 text-[12px] font-semibold tracking-wide",
        className,
      )}
      style={{ background: bg, color: fg }}
    >
      {children}
    </span>
  );
}

function HeadlineStrip({ card, photo, palette, storeName, size }: LayoutProps) {
  const px = (n: number) => `${(n / 540) * size}px`;
  return (
    <div className="grid h-full w-full grid-rows-[auto_1fr] gap-0">
      <header
        className="flex items-end justify-between gap-3"
        style={{
          padding: `${px(28)} ${px(28)} ${px(20)}`,
          background: `linear-gradient(180deg, ${palette.fg}f2 0%, ${palette.fg}cc 100%)`,
          color: palette.bg,
        }}
      >
        <div>
          <p
            className="font-display font-extrabold leading-[1.05]"
            style={{ fontSize: px(40) }}
          >
            {card.copy.headline}
          </p>
          <p
            className="mt-1 font-medium opacity-80"
            style={{ fontSize: px(13) }}
          >
            {card.copy.subheadline}
          </p>
        </div>
        <Pill
          bg={palette.accent}
          fg="#fff"
          className="shrink-0"
        >
          {card.copy.badge || storeName}
        </Pill>
      </header>
      <div className="relative">
        <PhotoArea photo={photo} accent={palette.accent} />
        <div
          className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-3"
          style={{ padding: px(20) }}
        >
          <div className="space-y-1">
            {card.copy.bodyLines.map((line, i) => (
              <p
                key={i}
                className="rounded-md font-semibold"
                style={{
                  fontSize: px(14),
                  color: palette.fg,
                  background: `${palette.bg}f2`,
                  padding: `${px(6)} ${px(10)}`,
                  width: "fit-content",
                }}
              >
                {line}
              </p>
            ))}
          </div>
          {card.copy.pricePill && (
            <Pill
              bg={palette.accent}
              fg="#fff"
              className="shrink-0"
            >
              {card.copy.pricePill}
            </Pill>
          )}
        </div>
      </div>
    </div>
  );
}

function PolaroidStack({ card, photo, palette, storeName, size }: LayoutProps) {
  const px = (n: number) => `${(n / 540) * size}px`;
  return (
    <div className="relative h-full w-full" style={{ padding: px(24) }}>
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: `url("${PATTERN_SVG(palette.fg)}")`,
          backgroundSize: "120px 120px",
          opacity: 0.12,
        }}
      />
      <div className="relative grid h-full grid-rows-[auto_1fr_auto] gap-3">
        <div className="flex items-center justify-between">
          <div>
            <p
              className="font-mono font-semibold uppercase tracking-widest"
              style={{ fontSize: px(11), color: palette.accent }}
            >
              {storeName}
            </p>
            <p
              className="font-display font-extrabold"
              style={{ fontSize: px(34), color: palette.fg, lineHeight: 1.1 }}
            >
              {card.copy.headline}
            </p>
          </div>
          <Pill bg={palette.accent} fg="#fff">
            {card.copy.badge}
          </Pill>
        </div>

        <div className="relative">
          <div
            className="absolute left-0 top-0 h-[78%] w-[58%] -rotate-3 rounded-2xl border-[6px] border-white shadow-[0_20px_30px_-20px_rgba(0,0,0,0.4)]"
            style={{ background: palette.bg }}
          >
            <PhotoArea photo={photo} accent={palette.accent} rounded />
          </div>
          <div
            className="absolute bottom-0 right-0 h-[68%] w-[52%] rotate-[5deg] rounded-2xl border-[6px] border-white shadow-[0_20px_30px_-20px_rgba(0,0,0,0.4)]"
            style={{ background: palette.bg }}
          >
            <PhotoArea photo={photo} accent={palette.accent} rounded />
          </div>
        </div>

        <div
          className="rounded-2xl"
          style={{
            background: palette.fg,
            color: palette.bg,
            padding: `${px(16)} ${px(18)}`,
          }}
        >
          <p style={{ fontSize: px(15) }} className="font-semibold leading-snug">
            {card.copy.bodyLines[0]}
          </p>
          {card.copy.bodyLines[1] && (
            <p
              style={{ fontSize: px(12), opacity: 0.78, marginTop: px(4) }}
              className="font-medium"
            >
              {card.copy.bodyLines[1]}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function MagazineCut({ card, photo, palette, storeName, size }: LayoutProps) {
  const px = (n: number) => `${(n / 540) * size}px`;
  return (
    <div className="grid h-full w-full grid-cols-2 overflow-hidden">
      <div className="relative">
        <PhotoArea photo={photo} accent={palette.accent} />
        <div
          className="absolute inset-x-0 bottom-0"
          style={{
            background: `linear-gradient(180deg, transparent, ${palette.fg}cc)`,
            padding: `${px(60)} ${px(20)} ${px(20)}`,
          }}
        >
          <Pill bg={palette.accent} fg="#fff">
            {card.copy.badge}
          </Pill>
        </div>
      </div>
      <div
        className="flex flex-col justify-between"
        style={{ padding: px(24), background: palette.bg }}
      >
        <div>
          <p
            className="font-mono font-semibold uppercase tracking-widest"
            style={{ fontSize: px(10), color: palette.accent }}
          >
            BY {storeName}
          </p>
          <p
            className="font-display font-extrabold"
            style={{
              fontSize: px(36),
              color: palette.fg,
              lineHeight: 1.05,
              marginTop: px(8),
            }}
          >
            “{card.copy.headline}”
          </p>
          <p
            className="font-medium"
            style={{
              fontSize: px(13),
              color: palette.fg,
              opacity: 0.7,
              marginTop: px(8),
            }}
          >
            {card.copy.subheadline}
          </p>
        </div>
        <div className="space-y-2">
          {card.copy.bodyLines.map((l, i) => (
            <p
              key={i}
              style={{ fontSize: px(13), color: palette.fg }}
              className="font-medium leading-snug"
            >
              · {l}
            </p>
          ))}
          {card.copy.cta && (
            <Pill bg={palette.fg} fg={palette.bg} className="mt-2">
              {card.copy.cta}
            </Pill>
          )}
        </div>
      </div>
    </div>
  );
}

function TickerTape({ card, photo, palette, storeName, size }: LayoutProps) {
  const px = (n: number) => `${(n / 540) * size}px`;
  const tickerText = `${card.copy.pricePill || "오늘만"} · ${card.copy.headline} · ${storeName} · `;
  return (
    <div className="grid h-full w-full grid-rows-[auto_1fr_auto] overflow-hidden">
      <div
        className="flex items-center overflow-hidden whitespace-nowrap"
        style={{
          background: palette.fg,
          color: palette.bg,
          height: px(44),
          padding: `0 ${px(16)}`,
        }}
      >
        <p
          className="font-mono font-semibold uppercase tracking-[0.18em]"
          style={{ fontSize: px(12) }}
        >
          {tickerText.repeat(4)}
        </p>
      </div>
      <div className="relative">
        <PhotoArea photo={photo} accent={palette.accent} />
        <div
          className="absolute inset-0 flex flex-col justify-end"
          style={{
            background: `linear-gradient(180deg, transparent 30%, ${palette.bg}f0 100%)`,
            padding: px(24),
          }}
        >
          <div className="flex items-end justify-between gap-3">
            <div>
              <Pill bg={palette.accent} fg="#fff">
                {card.copy.badge}
              </Pill>
              <p
                className="mt-2 font-display font-extrabold"
                style={{
                  fontSize: px(36),
                  lineHeight: 1.05,
                  color: palette.fg,
                }}
              >
                {card.copy.headline}
              </p>
              <p
                className="font-medium"
                style={{
                  fontSize: px(13),
                  marginTop: px(6),
                  color: palette.fg,
                  opacity: 0.72,
                }}
              >
                {card.copy.subheadline}
              </p>
            </div>
            {card.copy.pricePill && (
              <div
                className="grid place-items-center rounded-2xl text-center font-display font-extrabold"
                style={{
                  background: palette.accent,
                  color: "#fff",
                  padding: `${px(10)} ${px(14)}`,
                  fontSize: px(20),
                  minWidth: px(96),
                }}
              >
                {card.copy.pricePill}
              </div>
            )}
          </div>
        </div>
      </div>
      <div
        className="flex items-center justify-between gap-3"
        style={{
          background: palette.bg,
          color: palette.fg,
          padding: `${px(14)} ${px(20)}`,
        }}
      >
        <div className="flex flex-wrap gap-2">
          {card.copy.hashtags.slice(0, 4).map((tag) => (
            <span
              key={tag}
              className="font-medium"
              style={{
                fontSize: px(11),
                color: palette.accent,
              }}
            >
              #{tag}
            </span>
          ))}
        </div>
        {card.copy.cta && (
          <span
            className="font-semibold"
            style={{ fontSize: px(12), color: palette.fg }}
          >
            → {card.copy.cta}
          </span>
        )}
      </div>
    </div>
  );
}
