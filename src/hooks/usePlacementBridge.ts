import { useEffect, useRef } from "react";
import { useAppDispatch, useAppSelector } from "@/redux/hooks";
import {
  confirmSubjectPlacement,
  updatePlacementPreview,
} from "@/redux/slices/subjectsSlice";
import { Renderer } from "@/service/rendering/Renderer";

export function usePlacementBridge(renderer: Renderer | null): void {
  const dispatch = useAppDispatch();
  const placingSubject = useAppSelector(
    (state) => state.subjects.placingSubject
  );
  const subjectsInfo = useAppSelector((state) => state.subjects.subjectsInfo);

  const prevSubjectIdsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!renderer) return;

    const currentIds = new Set(subjectsInfo.map((si) => si.subject.id));
    const prevIds = prevSubjectIdsRef.current;

    for (const si of subjectsInfo) {
      if (!prevIds.has(si.subject.id) && si.frames?.[0]) {
        renderer.addSingleSubject(si.subject, si.frames[0].position);
      }
    }

    for (const prevId of prevIds) {
      if (!currentIds.has(prevId)) {
        renderer.removeSingleSubject(prevId);
      }
    }

    prevSubjectIdsRef.current = currentIds;
  }, [subjectsInfo, renderer]);

  useEffect(() => {
    if (!renderer || !placingSubject) return;

    const subject = placingSubject;

    renderer.startPlacement(
      subject,
      (position) => {
        dispatch(confirmSubjectPlacement(position));
      },
      (position) => {
        dispatch(updatePlacementPreview(position));
      }
    );

    return () => {
      renderer.cancelPlacement();
    };
  }, [placingSubject, renderer, dispatch]);
}
