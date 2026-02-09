import React from "react";
import Svg, { Path, Circle, Ellipse, Rect, G } from "react-native-svg";

// Each avatar is a simple, warm food illustration rendered at a given size.
// White/cream shapes on transparent — meant to sit on a colored circle.

function ChefHat({ size }) {
  const s = size * 0.55;
  return (
    <Svg width={s} height={s} viewBox="0 0 40 40" fill="none">
      <Path
        d="M10 28H30V32C30 33.1 29.1 34 28 34H12C10.9 34 10 33.1 10 32V28Z"
        fill="rgba(255,255,255,0.95)"
      />
      <Path
        d="M10 28C10 20 8 18 8 14C8 10 11 7 14 7C15 5 18 4 20 4C22 4 25 5 26 7C29 7 32 10 32 14C32 18 30 20 30 28H10Z"
        fill="#ffffff"
      />
      <Path d="M14 28V22" stroke="rgba(0,0,0,0.08)" strokeWidth={1.2} strokeLinecap="round" />
      <Path d="M20 28V21" stroke="rgba(0,0,0,0.08)" strokeWidth={1.2} strokeLinecap="round" />
      <Path d="M26 28V22" stroke="rgba(0,0,0,0.08)" strokeWidth={1.2} strokeLinecap="round" />
    </Svg>
  );
}

function Cupcake({ size }) {
  const s = size * 0.55;
  return (
    <Svg width={s} height={s} viewBox="0 0 40 40" fill="none">
      <Path
        d="M12 22L14 35H26L28 22H12Z"
        fill="rgba(255,255,255,0.85)"
      />
      <Path d="M15 25H25" stroke="rgba(0,0,0,0.06)" strokeWidth={1} />
      <Path d="M15.5 29H24.5" stroke="rgba(0,0,0,0.06)" strokeWidth={1} />
      <Path
        d="M10 22C10 17 13 14 15 13C15 10 17 7 20 6C23 7 25 10 25 13C27 14 30 17 30 22H10Z"
        fill="#ffffff"
      />
      <Circle cx="20" cy="7" r="1.5" fill="rgba(255,255,255,0.9)" stroke="rgba(0,0,0,0.1)" strokeWidth={0.8} />
    </Svg>
  );
}

function Avocado({ size }) {
  const s = size * 0.55;
  return (
    <Svg width={s} height={s} viewBox="0 0 40 40" fill="none">
      <Path
        d="M20 5C14 5 9 12 9 20C9 28 13 36 20 36C27 36 31 28 31 20C31 12 26 5 20 5Z"
        fill="#ffffff"
      />
      <Ellipse cx="20" cy="23" rx="6" ry="7" fill="rgba(0,0,0,0.07)" />
      <Circle cx="20" cy="23" r="4" fill="rgba(255,255,255,0.7)" />
    </Svg>
  );
}

function PizzaSlice({ size }) {
  const s = size * 0.55;
  return (
    <Svg width={s} height={s} viewBox="0 0 40 40" fill="none">
      <Path
        d="M20 6L6 34H34L20 6Z"
        fill="#ffffff"
      />
      <Path
        d="M8 31C12 30 16 28 20 28C24 28 28 30 32 31"
        stroke="rgba(0,0,0,0.06)"
        strokeWidth={1.5}
        strokeLinecap="round"
      />
      <Circle cx="17" cy="20" r="2.2" fill="rgba(0,0,0,0.08)" />
      <Circle cx="23" cy="23" r="2" fill="rgba(0,0,0,0.08)" />
      <Circle cx="19" cy="27" r="1.8" fill="rgba(0,0,0,0.08)" />
    </Svg>
  );
}

function CookingPot({ size }) {
  const s = size * 0.55;
  return (
    <Svg width={s} height={s} viewBox="0 0 40 40" fill="none">
      <Path
        d="M8 16H32V30C32 33 29 36 26 36H14C11 36 8 33 8 30V16Z"
        fill="#ffffff"
      />
      <Rect x="6" y="14" width="28" height="4" rx="2" fill="rgba(255,255,255,0.95)" />
      <Path d="M6 16H4" stroke="#ffffff" strokeWidth={2.5} strokeLinecap="round" />
      <Path d="M34 16H36" stroke="#ffffff" strokeWidth={2.5} strokeLinecap="round" />
      <Path d="M16 8C16 6 17 5 20 5" stroke="#ffffff" strokeWidth={1.5} strokeLinecap="round" opacity={0.7} />
      <Path d="M20 9C20 7 21 5 24 5" stroke="#ffffff" strokeWidth={1.5} strokeLinecap="round" opacity={0.5} />
    </Svg>
  );
}

function Whisk({ size }) {
  const s = size * 0.55;
  return (
    <Svg width={s} height={s} viewBox="0 0 40 40" fill="none">
      <Path d="M20 4V16" stroke="#ffffff" strokeWidth={2.5} strokeLinecap="round" />
      <Path
        d="M12 36C12 24 14 18 20 16C26 18 28 24 28 36"
        stroke="#ffffff"
        strokeWidth={2}
        fill="none"
        strokeLinecap="round"
      />
      <Path
        d="M15 36C15 26 17 20 20 18C23 20 25 26 25 36"
        stroke="rgba(255,255,255,0.5)"
        strokeWidth={1.5}
        fill="none"
        strokeLinecap="round"
      />
    </Svg>
  );
}

function Donut({ size }) {
  const s = size * 0.55;
  return (
    <Svg width={s} height={s} viewBox="0 0 40 40" fill="none">
      <Circle cx="20" cy="20" r="14" fill="#ffffff" />
      <Circle cx="20" cy="20" r="5.5" fill="rgba(0,0,0,0.1)" />
      <Path
        d="M8 16C10 11 15 8 20 8C25 8 30 11 32 16"
        stroke="rgba(0,0,0,0.06)"
        strokeWidth={6}
        strokeLinecap="round"
      />
      <Circle cx="14" cy="13" r="1" fill="rgba(0,0,0,0.08)" />
      <Circle cx="26" cy="12" r="1.2" fill="rgba(0,0,0,0.08)" />
      <Circle cx="20" cy="10" r="0.9" fill="rgba(0,0,0,0.08)" />
    </Svg>
  );
}

function Lemon({ size }) {
  const s = size * 0.55;
  return (
    <Svg width={s} height={s} viewBox="0 0 40 40" fill="none">
      <Ellipse cx="20" cy="20" rx="13" ry="11" fill="#ffffff" />
      <Path
        d="M7 20C7 20 10 18 10 15"
        stroke="rgba(255,255,255,0.8)"
        strokeWidth={2}
        strokeLinecap="round"
      />
      <Path
        d="M33 20C33 20 30 18 30 15"
        stroke="rgba(255,255,255,0.8)"
        strokeWidth={2}
        strokeLinecap="round"
      />
      <Ellipse cx="20" cy="20" rx="6" ry="5" fill="rgba(0,0,0,0.05)" />
      <Path d="M20 15V25" stroke="rgba(0,0,0,0.04)" strokeWidth={0.8} />
      <Path d="M15 20H25" stroke="rgba(0,0,0,0.04)" strokeWidth={0.8} />
    </Svg>
  );
}

// Ordered list — index maps to avatar
export const FOOD_AVATARS = [
  ChefHat,
  Cupcake,
  Avocado,
  PizzaSlice,
  CookingPot,
  Whisk,
  Donut,
  Lemon,
];

export const AVATAR_COLORS = [
  "#F2A65A", // warm orange  — ChefHat
  "#E88D67", // salmon       — Cupcake
  "#7FBF7F", // sage green   — Avocado
  "#F07C7C", // coral        — PizzaSlice
  "#5B9BD5", // calm blue    — CookingPot
  "#C47AC0", // soft purple  — Whisk
  "#D4A373", // caramel      — Donut
  "#6DC5D1", // teal         — Lemon
];
