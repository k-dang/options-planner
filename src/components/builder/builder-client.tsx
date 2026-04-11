"use client";

import {
  BuilderMessage,
  BuilderPageShell,
} from "@/components/builder/builder-page-shell";
import { BuilderResultsPanel } from "@/components/builder/builder-results-panel";
import { useBuilderData } from "@/components/builder/use-builder-data";
import { useBuilderDraft } from "@/components/builder/use-builder-draft";
import type { BuilderRouteParseResult } from "@/lib/builder-state-url";
import type { BuilderSnapshot } from "@/modules/builder/load-builder-snapshot";

type BuilderClientProps = BuilderRouteParseResult;

export default function BuilderClient(
  props: BuilderClientProps & {
    initialSnapshot: BuilderSnapshot | null;
  },
) {
  const initialBuilderState =
    props.status === "ready" ? props.builderState : null;

  const draft = useBuilderDraft(initialBuilderState);
  const builderData = useBuilderData({
    initialState: initialBuilderState,
    initialSnapshot: props.initialSnapshot,
    horizonDays: draft.horizonDays,
    legs: draft.legs,
  });

  if (props.status === "unavailable") {
    return (
      <BuilderMessage title="Builder unavailable" message={props.message} />
    );
  }

  if (!initialBuilderState || draft.horizonDays === null) {
    return <BuilderMessage title="Builder unavailable" message={null} />;
  }

  return (
    <BuilderPageShell
      symbol={initialBuilderState.symbol}
      templateName={initialBuilderState.templateName}
      isFetching={builderData.isFetching}
      horizonDays={draft.horizonDays}
      legs={draft.legs}
      optionIndex={builderData.optionIndex}
      onHorizonDaysChange={draft.updateHorizonDays}
      onLegQuantityChange={draft.updateLegQuantity}
      onOptionLegExpiryChange={(index, expiry) => {
        draft.updateOptionLegExpiry(index, expiry, builderData.optionIndex);
      }}
      onOptionLegStrikeChange={draft.updateOptionLegStrike}
      results={
        <BuilderResultsPanel
          data={builderData.calcData}
          marketError={builderData.marketError}
        />
      }
    />
  );
}
