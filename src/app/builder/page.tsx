import BuilderClient from "@/components/builder/builder-client";

export default function BuilderIndexPage() {
  return (
    <BuilderClient
      status="unavailable"
      message="Open the builder from an optimizer result to load a strategy."
    />
  );
}
