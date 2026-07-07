//// theme ////
// OKLAB-optimized palette (per spec): surfaces are lightness steps at constant
// hue/chroma; all accents share identical OKLCH lightness+chroma so they carry
// equal perceptual weight.
export const theme = {
    bg: "#0b1015",
    surface: "#14191e",
    surface2: "#1d2227",
    border: "#31363b",
    text: "#e3e8ee",
    textDim: "#9299a1",
    onAccent: "#0b121a",
    accent: "#6db0f4",
    ok: "#6fc082",
    warn: "#cda448",
    err: "#ed8c84",
    purple: "#bc97e8",
    // priority ramp
    p1: "#6db0f4", // lo
    p2: "#cda448", // md
    p3: "#ed8c84", // hi
} as const;
