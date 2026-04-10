import BuilderClient from "@/components/builder-client";

export default function BuilderIndexPage() {
  return (
    <BuilderClient
      initialBuilderState={null}
      initialError="Open the builder from an optimizer result to load a strategy."
    />
  );
}
