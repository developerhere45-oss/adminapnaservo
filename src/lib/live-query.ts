export const liveQueryDefaults = {
  staleTime: 10_000,
  gcTime: 5 * 60_000,
  refetchOnWindowFocus: false,
  retry: 2,
} as const;

export function visibleRefetchInterval(milliseconds: number) {
  return () =>
    typeof document === "undefined" || document.visibilityState === "visible"
      ? milliseconds
      : false;
}
