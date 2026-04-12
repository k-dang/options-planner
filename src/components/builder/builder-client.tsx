"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import {
  BuilderMessage,
  BuilderPageShell,
} from "@/components/builder/builder-page-shell";
import { BuilderResultsPanel } from "@/components/builder/builder-results-panel";
import { useBuilderDraft } from "@/components/builder/use-builder-draft";
import {
  type BuilderRouteParseResult,
  serializeBuilderStateForUrl,
} from "@/lib/builder-state-url";
import type { BuilderSnapshot } from "@/modules/builder/load-builder-snapshot";
import type { BuilderStateInput } from "@/modules/strategies/schemas";

type BuilderClientProps = BuilderRouteParseResult;

export default function BuilderClient(
  props: BuilderClientProps & {
    initialSnapshot: BuilderSnapshot | null;
  },
) {
  const router = useRouter();
  const [isPending, startNavigationTransition] = useTransition();
  const initialBuilderState =
    props.status === "ready" ? props.builderState : null;

  const draft = useBuilderDraft(initialBuilderState);

  if (props.status === "unavailable") {
    return (
      <BuilderMessage title="Builder unavailable" message={props.message} />
    );
  }

  if (!initialBuilderState || draft.horizonDays === null) {
    return <BuilderMessage title="Builder unavailable" message={null} />;
  }

  const strategyName = initialBuilderState.templateName ?? "";
  if (strategyName.length === 0) {
    return <BuilderMessage title="Builder unavailable" message={null} />;
  }

  function navigateToBuilder(nextState: BuilderStateInput) {
    const href = serializeBuilderStateForUrl({
      strategyName,
      builderState: nextState,
    });

    if (!href) {
      return;
    }

    startNavigationTransition(() => {
      router.replace(href);
    });
  }

  return (
    <BuilderPageShell
      symbol={initialBuilderState.symbol}
      templateName={strategyName}
      isFetching={isPending}
      horizonDays={draft.horizonDays}
      legs={draft.legs}
      optionIndex={props.initialSnapshot?.optionIndex ?? null}
      onHorizonDaysChange={(value) => {
        const nextState = draft.updateHorizonDays(value);
        if (nextState) {
          navigateToBuilder(nextState);
        }
      }}
      onLegQuantityChange={(index, value) => {
        const nextState = draft.updateLegQuantity(index, value);
        if (nextState) {
          navigateToBuilder(nextState);
        }
      }}
      onOptionLegExpiryChange={(index, expiry) => {
        const nextState = draft.updateOptionLegExpiry(
          index,
          expiry,
          props.initialSnapshot?.optionIndex ?? null,
        );
        if (nextState) {
          navigateToBuilder(nextState);
        }
      }}
      onOptionLegStrikeChange={(index, strike) => {
        const nextState = draft.updateOptionLegStrike(index, strike);
        if (nextState) {
          navigateToBuilder(nextState);
        }
      }}
      results={
        <BuilderResultsPanel
          data={props.initialSnapshot?.calcData ?? null}
          marketError={props.initialSnapshot?.marketError ?? null}
        />
      }
    />
  );
}
