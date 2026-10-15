export function getProviderLabel(): string {
  return process.env.NEXT_PUBLIC_AI_PROVIDER_LABEL ?? "Ollama (local)";
}

export function ProviderFooter() {
  const providerLabel = getProviderLabel();

  return (
    <footer className="text-center text-xs text-stone-500">
      AI: {providerLabel}
    </footer>
  );
}
