import { ImageResponse } from 'next/og';
import { SITE } from '@/lib/site';

// Edge keeps first-byte low and avoids booting Prisma for an image that only
// needs its query string. `next/og` is the same renderer as @vercel/og,
// bundled with Next 15 — one fewer dependency to keep in step.
export const runtime = 'edge';

const WIDTH = 1200;
const HEIGHT = 630;

const ACCENT = '#a855f7';
const BG = '#0b0b12';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);

  const title = (searchParams.get('title') ?? SITE.name).slice(0, 120);
  const category = searchParams.get('category')?.slice(0, 40) ?? '';
  const build = searchParams.get('build')?.slice(0, 40) ?? '';

  // Long headlines need to step down or they overflow the 1200×630 frame.
  const fontSize = title.length > 85 ? 52 : title.length > 55 ? 62 : 74;

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          background: BG,
          padding: '64px 72px',
          position: 'relative',
        }}
      >
        {/* Accent wash, top-left. */}
        <div
          style={{
            position: 'absolute',
            top: -220,
            left: -160,
            width: 760,
            height: 760,
            borderRadius: 9999,
            background: `radial-gradient(circle, ${ACCENT}44 0%, transparent 68%)`,
            display: 'flex',
          }}
        />

        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 12,
              background: ACCENT,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#12021f',
              fontSize: 26,
              fontWeight: 700,
            }}
          >
            F
          </div>
          <div style={{ display: 'flex', color: '#f4f4f8', fontSize: 28, fontWeight: 600 }}>
            {SITE.name}
          </div>
          {category ? (
            <div
              style={{
                display: 'flex',
                marginLeft: 12,
                padding: '6px 16px',
                borderRadius: 9999,
                border: `1px solid ${ACCENT}66`,
                color: '#d9c7ff',
                fontSize: 22,
              }}
            >
              {category}
            </div>
          ) : null}
        </div>

        <div
          style={{
            display: 'flex',
            color: '#ffffff',
            fontSize,
            fontWeight: 700,
            lineHeight: 1.12,
            letterSpacing: '-0.025em',
            maxWidth: 1000,
          }}
        >
          {title}
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            color: '#9d9dae',
            fontSize: 24,
          }}
        >
          {/*
            `build` is only ever set for the /tech/windows back-catalogue. The
            fallback used to read "Tested on a real build", which was printed
            across sports, travel and money cards alike — a claim that made no
            sense outside troubleshooting. Outside that section the slot simply
            stays empty.
          */}
          <div style={{ display: 'flex' }}>{build}</div>
          <div style={{ display: 'flex' }}>{SITE.url.replace(/^https?:\/\//, '')}</div>
        </div>
      </div>
    ),
    {
      width: WIDTH,
      height: HEIGHT,
      headers: {
        'Cache-Control': 'public, max-age=86400, stale-while-revalidate=604800',
      },
    },
  );
}
