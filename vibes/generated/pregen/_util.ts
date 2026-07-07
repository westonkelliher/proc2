// Always-available types + helpers, ambient in every grim module.
// Injected at assembly; module code never imports these.

export type Option<T> = "none" | { some: T }
// a proto that yields T
// err is non-ternable: display/debug only, never branched on — errors mean
// something unexpectedly went wrong (see spec_design_GUIDE.md)
export type YieldResult<T> = { ok: T } | { err: string }
// a proto with no yield (effect-only)
export type EffectResult = YieldResult<true>
// string-keyed; values restricted to a single type V
export type Map<V> = Record<string, V>
// proto names of I that are effects / yields (for child-exposing protos)
export type EffectProtos<I> = { [K in keyof I]: I[K] extends (...args: never) => EffectResult ? K : never }[keyof I]
export type YieldProtos<I> = Exclude<keyof I, EffectProtos<I>>

// -- constructors / guards -- //
export const ok = <T>(v: T): YieldResult<T> => ({ ok: v })
export const err = <T>(e: string): YieldResult<T> => ({ err: e })
export const done: EffectResult = { ok: true }
export const isOk = <T>(r: YieldResult<T>): r is { ok: T } => "ok" in r
export const isErr = <T>(r: YieldResult<T>): r is { err: string } => "err" in r
export const some = <T>(v: T): Option<T> => ({ some: v })
export const isSome = <T>(o: Option<T>): o is { some: T } => o !== "none"

// -- Map -- //
export const get = <V>(m: Map<V>, k: string): Option<V> =>
    k in m ? { some: m[k] } : "none"
