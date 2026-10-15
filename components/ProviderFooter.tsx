export function ProviderFooter() {
  const providerLabel =
    process.env.NEXT_PUBLIC_AI_PROVIDER_LABEL ?? "Ollama (local)";

  return (
    <footer className="text-center text-xs text-stone-500">
      AI: {providerLabel}
    </footer>
  );
}
