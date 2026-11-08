import React from "react";
import { PerspectiveCamera, Vector3 } from "three";
import {
  AbsoluteFill,
  Sequence,
  Video,
  Audio,
  staticFile,
  useCurrentFrame,
} from "remotion";
import { FPS, palette as C, slots, shots, typography, audio } from "./config";
export const clamp = (x: number) => Math.max(0, Math.min(1, x));
export const ease = (x: number) => {
  x = clamp(x);
  return x * x * x * (x * (x * 6 - 15) + 10);
};
const mix = (a: number, b: number, t: number) => a + (b - a) * t;
export const cues = {
  opening: [0.25, 0.8, 1.35, 2.0, 2.5],
  ingredients: [0.2, 0.45, 0.7, 1.25],
  singing: [0.4, 1.1, 1.8],
  showcase: [0.3, 1, 1.7],
  ending: [0.3, 1, 1.7],
};
const hit = (t: number, marks: number[]) =>
  marks.reduce((sum, b) => sum + (t >= b ? Math.exp(-(t - b) * 19) : 0), 0);
type V = [number, number, number];
// A physical pinhole camera, in world units. All depth layers share this camera.
export function camera(x = 0, y = 0, z = 1400, rx = 0, ry = 0, rz = 0) {
  const cam = new PerspectiveCamera(42.075, 1920 / 1080, 20, 12000);
  cam.position.set(x, y, z);
  cam.rotation.set(rx, ry, rz, "YXZ");
  cam.updateMatrixWorld();
  cam.updateProjectionMatrix();
  return cam;
}
export function project(cam: any, v: V) {
  const p = new Vector3(...v);
  const local = p.clone().applyMatrix4(cam.matrixWorldInverse);
  p.project(cam);
  return {
    x: (p.x + 1) * 960,
    y: (1 - p.y) * 540,
    d: -local.z,
    valid: -local.z > 25,
  };
}
const points = (cam: any, ps: V[]) =>
  ps
    .map((p) => {
      const q = project(cam, p);
      return `${q.x.toFixed(2)},${q.y.toFixed(2)}`;
    })
    .join(" ");
function Poly({ cam, ps, fill = "none", stroke, sw = 3, opacity = 1 }: any) {
  if (ps.some((p: V) => !project(cam, p).valid)) return null;
  return (
    <polygon
      points={points(cam, ps)}
      fill={fill}
      stroke={stroke}
      strokeWidth={sw}
      opacity={opacity}
      strokeLinejoin="round"
    />
  );
}
function Line({ cam, ps, color = C.white, sw = 3, opacity = 1 }: any) {
  const good = ps.filter((p: V) => project(cam, p).valid);
  if (good.length < 2) return null;
  return (
    <polyline
      points={points(cam, good)}
      fill="none"
      stroke={color}
      strokeWidth={sw}
      opacity={opacity}
      strokeLinejoin="round"
    />
  );
}
function Box({ cam, x, y, z, w, h, color = C.yellow, depth = 24 }: any) {
  return (
    <>
      <Poly
        cam={cam}
        ps={[
          [x, y, z],
          [x + w, y, z],
          [x + w, y - h, z],
          [x, y - h, z],
        ]}
        fill={color}
      />
      <Poly
        cam={cam}
        ps={[
          [x + w, y, z],
          [x + w, y - h, z],
          [x + w + depth, y - h - depth, z - depth],
          [x + w + depth, y - depth, z - depth],
        ]}
        fill={C.ink}
        opacity={0.6}
      />
    </>
  );
}
// Each character gets its own projected tangent basis and extrusion, preserving readable Chinese glyphs.
function Type({
  cam,
  text,
  x,
  y,
  z = 0,
  size = 170,
  color = C.white,
  depth = 30,
  spacing = 1.04,
  impact = 0,
}: any) {
  return (
    <g>
      {Array.from(text as string).map((ch, i) => {
        const xx = x + i * size * spacing;
        return (
          <g key={i}>
            {Array.from({ length: 7 }, (_, k) => 6 - k).map((k) => {
              let zz = z - (k * depth) / 6;
              let o = project(cam, [xx, y, zz]),
                u = project(cam, [xx + 1, y, zz]),
                v = project(cam, [xx, y - 1, zz]);
              if (!o.valid) return null;
              return (
                <text
                  key={k}
                  transform={`matrix(${(u.x - o.x) * (1 + impact * 0.08)} ${(u.y - o.y) * (1 + impact * 0.08)} ${(v.x - o.x) * (1 - impact * 0.12)} ${(v.y - o.y) * (1 - impact * 0.12)} ${o.x} ${o.y})`}
                  fontSize={size}
                  fontWeight="900"
                  fill={k === 0 ? color : C.ink}
                  stroke={k === 0 ? "none" : C.ink}
                  strokeWidth={k === 0 ? 0 : 2}
                >
                  {ch}
                </text>
              );
            })}
          </g>
        );
      })}
    </g>
  );
}
function Ring({ cam, z, r = 720, color = C.pink }: any) {
  const ps = Array.from({ length: 81 }, (_, i) => {
    let a = (i / 80) * Math.PI * 2;
    return [Math.cos(a) * r, Math.sin(a) * r, z] as V;
  });
  return <Line cam={cam} ps={ps} color={color} sw={55} opacity={0.85} />;
}
function Tracks({ cam, base = -800 }: any) {
  return (
    <g>
      {[-480, -240, 0, 240, 480].map((y, i) => (
        <Line
          key={i}
          cam={cam}
          ps={[
            [-1650, y, base],
            [1650, y, base - 2400],
          ]}
          color={i % 2 ? C.pink : C.white}
          sw={3}
          opacity={0.4}
        />
      ))}
      {Array.from({ length: 28 }, (_, i) => (
        <Box
          key={i}
          cam={cam}
          x={-1050 + (i % 7) * 320}
          y={280 - Math.floor(i / 7) * 185}
          z={base - Math.floor(i / 7) * 450}
          w={120 + (i % 3) * 50}
          h={22}
          depth={14}
          color={i % 3 === 0 ? C.orange : C.yellow}
        />
      ))}
    </g>
  );
}
function Header({ dark = false, chapter }: any) {
  const fg = dark ? C.ink : C.white;
  return (
    <g fill={fg} fontWeight="700">
      <text x="90" y="78" fontSize="27">
        CANTALOOM®
      </text>
      <text x="1830" y="78" textAnchor="end" fontSize="23">
        {chapter}
      </text>
    </g>
  );
}
export function SpatialScene({ kind, t }: any) {
  let n = shots.findIndex((s) => s.id === kind);
  let bg = [C.purple, C.yellow, C.ink, C.pink, C.purple][n];
  let fg = n === 1 || n === 3 ? C.ink : C.white;
  let pulse = hit(t, (cues as any)[kind] || []);
  let cam: any;
  if (kind === "opening") {
    let fly = ease((t - 3.45) / 1.6);
    cam = camera(
      mix(-100, 0, ease(t / 2.5)),
      mix(35, 0, fly),
      mix(1660, -320, fly),
      -0.045 * (1 - fly),
      0.075 * (1 - fly),
      -0.065 * (1 - fly),
    );
  } else if (kind === "ingredients") {
    let run = ease((t - 2.5) / 2.0);
    cam = camera(
      mix(80, 250, run),
      80 * (1 - run),
      mix(1600, 1100, run),
      -0.035,
      0.045 * (1 - run),
      -0.055 * (1 - run),
    );
  } else if (kind === "singing") {
    let p = ease((t - 0.5) / 3.5);
    cam = camera(
      mix(-280, 200, p),
      60 - 100 * p,
      mix(1700, 1300, p),
      -0.03,
      mix(-0.12, 0.08, p),
      0.04 * (1 - p),
    );
  } else if (kind === "showcase") {
    let p = ease(t / 4);
    cam = camera(
      mix(160, -80, p),
      0,
      mix(1750, 1450, p),
      0,
      -0.08 * (1 - p),
      0.055 * (1 - p),
    );
  } else {
    let p = ease((t - 0.2) / 2.7);
    cam = camera(
      mix(-140, 0, p),
      mix(100, 0, p),
      mix(1800, 1400, p),
      0.05 * (1 - p),
      -0.1 * (1 - p),
      -0.05 * (1 - p),
    );
  }
  return (
    <g>
      <rect width="1920" height="1080" fill={bg} />
      <g opacity={kind === "ending" ? 1 - ease((t - 2) / 1) : 0.22}>
        {Array.from({ length: 10 }, (_, i) => (
          <Line
            key={i}
            cam={cam}
            ps={[
              [-2300, -700 + i * 170, -1900],
              [2300, -700 + i * 170, -1900],
            ]}
            color={fg}
            sw={2}
          />
        ))}
        {Array.from({ length: 13 }, (_, i) => (
          <Line
            key={i}
            cam={cam}
            ps={[
              [-1800 + i * 300, -900, -1900],
              [-1800 + i * 300, 900, -1900],
            ]}
            color={fg}
            sw={2}
          />
        ))}
      </g>
      {kind === "opening" ? (
        <>
          <Tracks cam={cam} base={-1500} />
          <Ring cam={cam} z={-280} r={640} color={C.pink} />
          <g opacity={1 - ease((t - 3.4) / 0.9)}>
            <Type
              cam={cam}
              text="一句话，"
              x={-820}
              y={210}
              z={140}
              size={190}
              color={C.white}
              impact={pulse}
            />
            <Type
              cam={cam}
              text="变成一首歌"
              x={-670}
              y={-85 + 130 * (1 - ease((t - 0.55) / 0.65))}
              z={0}
              size={220}
              color={C.yellow}
              impact={pulse}
            />
          </g>
          <g opacity={ease((t - 4.8) / 0.35)}>
            <Type
              cam={cam}
              text="灵感，开始发声"
              x={-850}
              y={100}
              z={-2100}
              size={140}
              color={C.yellow}
              depth={20}
            />
          </g>
          <Box
            cam={cam}
            x={-1000 + 1900 * ease((t - 2.45) / 0.4)}
            y={510}
            z={590}
            w={270}
            h={45}
            color={C.orange}
          />
        </>
      ) : kind === "ingredients" ? (
        <>
          <g>
            {Array.from({ length: 28 }, (_, i) => {
              let q = ease((t - 1.2 - (i % 7) * 0.035) / 1.15);
              let group = i % 3;
              return (
                <Box
                  key={i}
                  cam={cam}
                  x={mix(
                    -600 + group * 560 + (i % 3) * 35,
                    -1050 + (i % 7) * 320,
                    q,
                  )}
                  y={mix(200 + (i % 4) * 30, 280 - Math.floor(i / 7) * 185, q)}
                  z={mix(60 + group * 90, -950 - Math.floor(i / 7) * 450, q)}
                  w={mix(28, 120 + (i % 3) * 50, q)}
                  h={mix(35, 22, q)}
                  depth={14}
                  color={i % 3 === 0 ? C.orange : C.purple}
                />
              );
            })}
          </g>
          {["词", "曲", "拍"].map((ch, i) => {
            let q = ease((t - i * 0.14) / 0.45),
              m = ease((t - 1.35) / 1.1);
            let x = mix(-600 + i * 560, -900 + i * 650, m),
              y = mix(180 + 150 * (1 - q), 180 - i * 110, m),
              z = mix(80 + i * 90, -700 - i * 370, m);
            return (
              <g key={ch} opacity={1 - ease((t - 2.25) / 0.7)}>
                <Box
                  cam={cam}
                  x={x - 25}
                  y={y + 190}
                  z={z - 30}
                  w={310}
                  h={320}
                  color={[C.purple, C.pink, C.orange][i]}
                />
                <Type
                  cam={cam}
                  text={ch}
                  x={x}
                  y={y}
                  z={z}
                  size={230}
                  color={i ? C.ink : C.white}
                  impact={pulse}
                />
              </g>
            );
          })}
          <text x="110" y="945" fontSize="70" fontWeight="900" fill={C.ink}>
            让灵感，长出节奏。
          </text>
        </>
      ) : kind === "singing" || kind === "showcase" ? (
        <>
          {[-950, -450, 50].map((z, layer) => (
            <g key={z} opacity={0.35 + layer * 0.25}>
              {Array.from({ length: 43 }, (_, i) => {
                let m = ease((t - 0.6) / 1.7);
                let amp =
                  ((30 + 125 * Math.abs(Math.sin(i * 0.38 - t * 3))) *
                    (layer + 1)) /
                  2;
                let y = mix(200 + (i % 5) * 35, 100, m);
                return (
                  <Box
                    key={i}
                    cam={cam}
                    x={-1200 + i * 57}
                    y={y + (amp * m) / 2}
                    z={z}
                    w={mix(40, 15, m)}
                    h={mix(18, amp, m)}
                    depth={10}
                    color={
                      layer === 1
                        ? C.pink
                        : kind === "showcase"
                          ? C.purple
                          : C.yellow
                    }
                  />
                );
              })}
            </g>
          ))}
          <Type
            cam={cam}
            text={kind === "singing" ? "从音符，到歌声" : "不止被听见"}
            x={-500}
            y={-265}
            z={150}
            size={kind === "singing" ? 120 : 150}
            color={fg}
            depth={40}
          />
          {kind === "showcase" && (
            <Type
              cam={cam}
              text="也要被看见"
              x={-420}
              y={-475}
              z={-60}
              size={150}
              color={C.purple}
            />
          )}
        </>
      ) : (
        <>
          {/* Ordered gathering: lyrics first, then notes, then five waveform columns. */}
          {Array.from({ length: 5 }, (_, i) => {
            let q = ease((t - 0.3 - i * 0.18) / 1.1);
            let tx = -110 + i * 48,
              ty = 185 + [0, 30, 70, 30, 0][i];
            let x = mix([-1000, -650, 850, 1100, 400][i], tx, q),
              y = mix([500, -500, 600, -360, 750][i], ty, q),
              z = mix([-1000, 300, -700, 600, -1500][i], 0, q);
            return (
              <Box
                key={i}
                cam={cam}
                x={x}
                y={y}
                z={z}
                w={30}
                h={50 + [0, 60, 140, 60, 0][i]}
                depth={mix(35, 0, q)}
                color={i % 2 ? C.pink : C.yellow}
              />
            );
          })}
          <g opacity={1 - ease((t - 1.1) / 0.65)}>
            <Type
              cam={cam}
              text="词"
              x={-900}
              y={200}
              z={-400}
              size={130}
              color={C.pink}
            />
            <Type
              cam={cam}
              text="♪"
              x={650}
              y={-250}
              z={200}
              size={180}
              color={C.orange}
            />
          </g>
          <g opacity={ease((t - 1.7) / 0.65)}>
            <text
              x="960"
              y="660"
              fontFamily={typography.latin}
              fill={C.white}
              fontWeight="900"
              textAnchor="middle"
              fontSize="166"
            >
              CantaLoom
            </text>
            <text
              x="960"
              y="770"
              fill={C.yellow}
              textAnchor="middle"
              fontWeight="700"
              fontSize="48"
            >
              让每一个灵感，都有自己的声音。
            </text>
            <text
              x="960"
              y="945"
              fill={C.white}
              textAnchor="middle"
              fontSize="28"
            >
              织声 · AI 虚拟歌姬音乐创作 Agent
            </text>
            <text
              x="960"
              y="1000"
              fill={C.white}
              textAnchor="middle"
              fontSize="23"
            >
              github.com/cicikat/CantaLoom
            </text>
          </g>
        </>
      )}
      <Header
        dark={n === 1 || n === 3}
        chapter={
          [
            "01 / IDEA INTO MUSIC",
            "02 / COMPOSE THE IDEA",
            "03 / GIVE IT A VOICE",
            "04 / LET IT SHINE",
            "MAKE A LITTLE NOISE.",
          ][n]
        }
      />
    </g>
  );
}
// A rotating 3D plane and its projected aperture share exactly the same vertices.
export function screenGeometry(t: number, slot: any) {
  const idx = slots.indexOf(slot);
  const start = slot.start - 2.1;
  const incoming = ease((t - start) / 2.1);
  const outgoing = ease((t - slot.end) / 1.15);
  const u = t >= slot.end ? 1 - outgoing : incoming;
  const side = idx % 2 ? -1 : 1;
  const cam = camera(
    mix(170 * side, 0, u),
    mix(70, 0, u),
    mix(2350, 1400, u),
    mix(-0.07, 0, u),
    mix(0.12 * side, 0, u),
    mix(-0.08 * side, 0, u),
  );
  const yaw = (1 - u) * 0.85 * side,
    tilt = (1 - u) * -0.21;
  const sc = mix(0.5, 1, u),
    cx = mix(-350 * side, 0, u),
    cy = mix(140, 0, u),
    z = mix(-160, 0, u);
  const plane = (x: number, y: number): V => {
    x *= sc;
    y *= sc;
    let xx = x * Math.cos(yaw),
      zz = -x * Math.sin(yaw);
    return [
      cx + xx,
      cy + y * Math.cos(tilt) - zz * Math.sin(tilt),
      z + y * Math.sin(tilt) + zz * Math.cos(tilt),
    ];
  };
  return {
    cam,
    ps: [
      plane(-890, 405),
      plane(890, 405),
      plane(890, -405),
      plane(-890, -405),
    ] as V[],
    u,
    incoming,
    outgoing,
    idx,
  };
}
// Projective mapping for replacement footage: all four corners follow the Alpha aperture.
export function footageTransform(t: number, slot: any) {
  const { cam, ps } = screenGeometry(t, slot);
  const p = ps.map((v) => project(cam, v));
  const [a, b, c, d] = p;
  const dx1 = b.x - c.x,
    dx2 = d.x - c.x,
    dx3 = a.x - b.x + c.x - d.x,
    dy1 = b.y - c.y,
    dy2 = d.y - c.y,
    dy3 = a.y - b.y + c.y - d.y;
  const det = dx1 * dy2 - dx2 * dy1;
  const g = (dx3 * dy2 - dx2 * dy3) / det,
    h = (dx1 * dy3 - dx3 * dy1) / det;
  return `matrix3d(${[(b.x - a.x + g * b.x) / 1780, (b.y - a.y + g * b.y) / 1780, 0, g / 1780, (d.x - a.x + h * d.x) / 810, (d.y - a.y + h * d.y) / 810, 0, h / 810, 0, 0, 1, 0, a.x, a.y, 0, 1].join(",")})`;
}
function SpaceWindow({ slot, t, preview }: any) {
  const g = screenGeometry(t, slot),
    { cam, ps, u, idx } = g;
  const closing = t >= slot.end;
  const shot = closing ? shots[idx + 1] : shots[idx];
  let show = closing
    ? 1 - ease((g.outgoing - 0.65) / 0.35)
    : ease(g.incoming / 0.35);
  const quad = points(cam, ps);
  let bg = [C.purple, C.yellow, C.ink, C.pink][idx];
  let p0 = project(cam, ps[0]);
  let p1 = project(cam, ps[1]);
  let p3 = project(cam, ps[3]);
  return (
    <g>
      <defs>
        <mask
          id="space-hole"
          maskUnits="userSpaceOnUse"
          x="0"
          y="0"
          width="1920"
          height="1080"
        >
          <rect width="1920" height="1080" fill="white" />
          <polygon points={quad} fill="black" opacity={show} />
        </mask>
      </defs>
      <g mask="url(#space-hole)">
        <SpatialScene kind={shot.id} t={t - shot.start} />
        <rect
          width="1920"
          height="1080"
          fill={bg}
          opacity={ease((u - 0.68) / 0.32)}
        />
      </g>
      {/* Thickness sits outside the hole; it never paints an opaque rectangle inside it. */}
      <clipPath id="screen-preview-clip">
        <polygon points={quad} />
      </clipPath>
      <g opacity={show}>
        <polygon
          points={quad}
          fill="none"
          stroke={C.ink}
          strokeWidth="14"
          transform={`translate(${(1 - u) * 20} ${(1 - u) * 20})`}
        />
        <polygon points={quad} fill="none" stroke={C.yellow} strokeWidth="6" />
        {preview && (
          <g clipPath="url(#screen-preview-clip)">
            <polygon points={quad} fill={C.ink} />
            <g
              transform={`matrix(${(p1.x - p0.x) / 1780} ${(p1.y - p0.y) / 1780} ${(p3.x - p0.x) / 810} ${(p3.y - p0.y) / 810} ${p0.x} ${p0.y})`}
            >
              <text
                x="890"
                y="300"
                textAnchor="middle"
                fill={C.pink}
                fontSize="25"
              >
                真实录屏待替换 / PREVIEW ONLY
              </text>
              <text
                x="890"
                y="435"
                textAnchor="middle"
                fill={C.white}
                fontWeight="900"
                fontSize="70"
              >
                {slot.detail}
              </text>
              <text
                x="890"
                y="530"
                textAnchor="middle"
                fill={C.yellow}
                fontSize="32"
              >
                {slot.start}—{slot.end} s · {slot.end - slot.start} 秒
              </text>
            </g>
          </g>
        )}
      </g>
      {u > 0.99 && (
        <g fill={idx === 1 || idx === 3 ? C.ink : C.white}>
          <text x="90" y="78" fontSize="30" fontWeight="700">
            0{idx + 1} / {slot.title}
          </text>
          <text x="1830" y="1020" fontSize="23" textAnchor="end">
            CANTALOOM / {slot.detail}
          </text>
        </g>
      )}
    </g>
  );
}
export function FilmV2({ preview = true, offset = 0 }: any) {
  const t = (useCurrentFrame() + offset) / FPS;
  const slot = slots.find((s) => t >= s.start - 2.1 && t < s.end + 1.15);
  const shot = shots.find((s) => t >= s.start && t < s.end) || shots[0];
  return (
    <AbsoluteFill
      style={{ background: "transparent", fontFamily: typography.family }}
    >
      {preview &&
        slots
          .filter((s) => s.file)
          .map((s) => (
            <Sequence
              key={s.id}
              from={Math.round((s.start - 2.1) * FPS) - offset}
              durationInFrames={Math.round((s.end - s.start + 3.25) * FPS)}
            >
              <Video
                src={staticFile(s.file!)}
                trimBefore={s.trim * FPS}
                style={{
                  position: "absolute",
                  left: 0,
                  top: 0,
                  width: 1780,
                  height: 810,
                  objectFit: "contain",
                  transformOrigin: "0 0",
                  transform: footageTransform(t, s),
                }}
              />
            </Sequence>
          ))}
      <svg width="1920" height="1080" viewBox="0 0 1920 1080">
        {slot ? (
          <SpaceWindow slot={slot} t={t} preview={preview && !slot.file} />
        ) : (
          <SpatialScene kind={shot.id} t={t - shot.start} />
        )}
      </svg>
      {preview && audio.file && (
        <Audio src={staticFile(audio.file)} volume={audio.volume} />
      )}
    </AbsoluteFill>
  );
}
