"use client";

import { useCallback, useRef } from "react";

import { useReducedMotion } from "@/components/home/use-reduced-motion";
import { QULL_REST_POSE, QULL_SPARK_PATH, QULL_VIEWBOX } from "./qull-motion";
import { useQullMotion } from "./use-qull-motion";

/**
 * Qull on the not-found page, as the zero of "404": the hero's figure
 * (outline, face and spark), alive in the same way and still under reduced
 * motion.
 */
export function StatusQull() {
  const scopeRef = useRef<HTMLSpanElement | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const reducedMotion = useReducedMotion();
  const anchor = useCallback(() => svgRef.current, []);
  useQullMotion(scopeRef, anchor, !reducedMotion);

  return (
    <span ref={scopeRef} style={{ display: "contents" }} aria-hidden="true">
      <svg ref={svgRef} className="status-qull" viewBox={QULL_VIEWBOX}>
        <path data-qull="body" className="status-qull-body" d={QULL_REST_POSE.body} />
        <path data-qull="face" d={QULL_REST_POSE.face} />
        <path data-qull="accents" d={QULL_REST_POSE.accents} />
        <path data-qull="spark" d={QULL_SPARK_PATH} transform={QULL_REST_POSE.spark} />
      </svg>
    </span>
  );
}
