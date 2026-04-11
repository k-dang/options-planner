import { useEffect, useRef, useState, useTransition } from "react";
import { loadBuilderSnapshotAction } from "@/app/actions/builder";
import type { BuilderSnapshot } from "@/modules/builder/load-builder-snapshot";
import type { BuilderStateInput } from "@/modules/strategies/schemas";

export function useBuilderData(args: {
  initialState: BuilderStateInput | null;
  initialSnapshot: BuilderSnapshot | null;
  horizonDays: number | null;
  legs: BuilderStateInput["legs"];
}) {
  const builderInput =
    args.initialState === null || args.horizonDays === null
      ? null
      : {
          ...args.initialState,
          horizonDays: args.horizonDays,
          legs: args.legs,
        };
  const [snapshot, setSnapshot] = useState<BuilderSnapshot>(
    args.initialSnapshot ?? {
      calcData: null,
      marketError: null,
      optionIndex: null,
    },
  );
  const [isFetching, startRequestTransition] = useTransition();
  const lastResolvedKeyRef = useRef(
    builderInput === null ? null : JSON.stringify(builderInput),
  );
  const requestSequence = useRef(0);

  useEffect(() => {
    if (builderInput === null) {
      setSnapshot({
        calcData: null,
        marketError: null,
        optionIndex: null,
      });
      lastResolvedKeyRef.current = null;
      return;
    }

    const nextKey = JSON.stringify(builderInput);
    if (lastResolvedKeyRef.current === nextKey) {
      return;
    }

    const sequence = requestSequence.current + 1;
    requestSequence.current = sequence;

    startRequestTransition(() => {
      loadBuilderSnapshotAction(builderInput)
        .then((nextSnapshot) => {
          if (sequence !== requestSequence.current) {
            return;
          }

          lastResolvedKeyRef.current = nextKey;
          setSnapshot(nextSnapshot);
        })
        .catch((error: unknown) => {
          if (sequence !== requestSequence.current) {
            return;
          }

          setSnapshot({
            calcData: null,
            marketError:
              error instanceof Error
                ? error.message
                : "Unexpected server error",
            optionIndex: null,
          });
        });
    });
  }, [builderInput]);

  return {
    builderInput,
    calcData: snapshot.calcData,
    marketError: snapshot.marketError,
    isFetching,
    optionIndex: snapshot.optionIndex,
  };
}
