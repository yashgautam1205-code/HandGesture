import { useCallback, useEffect, useRef, useState } from "react";
import type { HandLandmarker, HandLandmarkerResult } from "@mediapipe/tasks-vision";
import {
  classifyGesture,
  distance,
  meetsConfidenceThreshold,
  palmCenter,
  smooth,
  smoothLandmarks,
  type Landmark,
} from "./classifier";
import { useStudioStore } from "../store/studio";

const ASSET_BASE = new URL(import.meta.env.BASE_URL, window.location.href);
const MODEL_URL = new URL("models/hand_landmarker.task", ASSET_BASE).toString();
const WASM_URL = new URL("mediapipe/wasm", ASSET_BASE).toString();

type TrackerState = "idle" | "loading" | "ready" | "error";

export function useHandTracker() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const landmarkerRef = useRef<HandLandmarker | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const frameRef = useRef<number>(0);
  const lastVideoTimeRef = useRef(-1);
  const previousPalmRef = useRef<Landmark | null>(null);
  const previousPinchRef = useRef<number | null>(null);
  const previousSpreadRef = useRef<number | null>(null);
  const smoothedLandmarksRef = useRef<Landmark[][]>([]);
  const stablePointRef = useRef({ id: "", since: 0 });
  const lastConfirmRef = useRef(0);
  const lastPreviewUpdateRef = useRef(0);
  const lastSeenRef = useRef(0);
  const reconnectTimerRef = useRef<number | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const startRef = useRef<() => Promise<void>>(async () => {});
  const [status, setStatus] = useState<TrackerState>("idle");
  const [error, setError] = useState("");
  const [landmarks, setLandmarks] = useState<Landmark[][]>([]);
  const clearReconnectTimer = useCallback(() => {
    if (reconnectTimerRef.current !== null) {
      window.clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }
  }, []);
  const stop = useCallback(() => {
    clearReconnectTimer();
    cancelAnimationFrame(frameRef.current);
    landmarkerRef.current?.close();
    landmarkerRef.current = null;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setStatus("idle");
    useStudioStore.getState().setGesture("none");
    useStudioStore.getState().setTrackingLost(false);
    useStudioStore.getState().setHandConfidence(0);
    smoothedLandmarksRef.current = [];
    setLandmarks([]);
  }, [clearReconnectTimer]);

  const scheduleReconnect = useCallback(() => {
    if (reconnectTimerRef.current !== null) return;
    const attempt = reconnectAttemptsRef.current + 1;
    if (attempt > 3) {
      setError("The webcam disconnected. Reconnect the camera to resume tracking.");
      setStatus("error");
      return;
    }
    reconnectAttemptsRef.current = attempt;
    setError(`Webcam disconnected. Reconnecting (${attempt}/3)…`);
    setStatus("error");
    reconnectTimerRef.current = window.setTimeout(() => {
      reconnectTimerRef.current = null;
      void startRef.current();
    }, 1200 * attempt);
  }, []);

  const start = useCallback(async () => {
    clearReconnectTimer();
    setError("");
    setStatus("loading");
    reconnectAttemptsRef.current = 0;
    lastSeenRef.current = performance.now();
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } },
      });
      streamRef.current = stream;
      for (const track of stream.getVideoTracks()) {
        track.onended = () => {
          if (streamRef.current !== stream) return;
          cancelAnimationFrame(frameRef.current);
          landmarkerRef.current?.close();
          landmarkerRef.current = null;
          stream.getTracks().forEach((item) => item.stop());
          streamRef.current = null;
          if (videoRef.current) videoRef.current.srcObject = null;
          useStudioStore.getState().setGesture("none");
          useStudioStore.getState().setHandConfidence(0);
          setLandmarks([]);
          scheduleReconnect();
        };
      }
      if (!videoRef.current) throw new Error("Webcam preview is unavailable.");
      videoRef.current.srcObject = stream;
      await videoRef.current.play();

      const { FilesetResolver, HandLandmarker: HandLandmarkerAPI } = await import(
        "@mediapipe/tasks-vision"
      );
      const vision = await FilesetResolver.forVisionTasks(WASM_URL);
      const options = {
        baseOptions: { modelAssetPath: MODEL_URL },
        runningMode: "VIDEO",
        numHands: 2,
        minHandDetectionConfidence: 0.55,
        minHandPresenceConfidence: 0.55,
        minTrackingConfidence: 0.5,
      } as const;
      try {
        landmarkerRef.current = await HandLandmarkerAPI.createFromOptions(vision, {
          ...options,
          baseOptions: { ...options.baseOptions, delegate: "GPU" },
        });
      } catch {
        landmarkerRef.current = await HandLandmarkerAPI.createFromOptions(vision, {
          ...options,
          baseOptions: { ...options.baseOptions, delegate: "CPU" },
        });
      }
      lastVideoTimeRef.current = -1;
      lastSeenRef.current = performance.now();
      setStatus("ready");
      useStudioStore.getState().setTrackingLost(false);
      frameRef.current = requestAnimationFrame(detectFrame);
    } catch (reason) {
      stop();
      const message =
        reason instanceof Error ? reason.message : "Could not start hand tracking.";
      setError(
        message.includes("Permission") || message.includes("NotAllowed")
          ? "Camera access was denied. Allow camera access in Windows privacy settings and try again."
          : `Hand tracking could not start: ${message}`,
      );
      setStatus("error");
    }
  }, [clearReconnectTimer, scheduleReconnect, stop]);
  startRef.current = start;

  const detectFrame = useCallback(() => {
    const video = videoRef.current;
    const landmarker = landmarkerRef.current;
    if (!video || !landmarker || video.readyState < 2) {
      frameRef.current = requestAnimationFrame(detectFrame);
      return;
    }
    if (video.currentTime !== lastVideoTimeRef.current) {
      lastVideoTimeRef.current = video.currentTime;
      const result = landmarker.detectForVideo(video, performance.now());
      processResult(result);
    }
    frameRef.current = requestAnimationFrame(detectFrame);
  }, []);

  const processResult = useCallback((result: HandLandmarkerResult) => {
    const current = useStudioStore.getState();
    const settings = current.gestureSettings;
    const now = performance.now();
    const hands = smoothLandmarks(smoothedLandmarksRef.current, result.landmarks as Landmark[][], settings.smoothing);
    smoothedLandmarksRef.current = hands;
    const confidences = hands.map((_, index) => result.handednesses[index]?.[0]?.score ?? 0);
    const confidence = confidences.length ? Math.min(...confidences.slice(0, 2)) : 0;
    if (now - lastPreviewUpdateRef.current > 100) {
      lastPreviewUpdateRef.current = now;
      setLandmarks(hands);
      current.setHandConfidence(confidence);
    }

    if (hands.length > 0) {
      lastSeenRef.current = now;
      if (current.trackingLost) current.setTrackingLost(false);
    } else if (now - lastSeenRef.current > settings.trackingLostTimeoutMs && !current.trackingLost) {
      current.setTrackingLost(true);
      current.setGesture("none");
    }

    const pinchLimit = settings.pinchThreshold * settings.calibrationHandScale;
    const rawGesture = classifyGesture(hands, pinchLimit);
    const requiredHands = rawGesture === "two-hand-spread" || rawGesture === "two-hand-zoom" ? 2 : 1;
    const gesture =
      rawGesture !== "none" &&
      meetsConfidenceThreshold(confidences, requiredHands, settings.confidenceThreshold)
        ? rawGesture
        : "none";
    current.setGesture(gesture);
    if (current.interactionPaused || gesture === "closed-fist") {
      const firstHand = hands[0]?.length >= 21 ? hands[0] : null;
      previousPalmRef.current = firstHand ? palmCenter(firstHand) : null;
      previousPinchRef.current = firstHand ? distance(firstHand[4], firstHand[8]) : null;
      previousSpreadRef.current =
        hands.length >= 2 && hands[0].length >= 21 && hands[1].length >= 21
          ? distance(palmCenter(hands[0]), palmCenter(hands[1]))
          : null;
      return;
    }

    if (gesture === "pinch" && hands[0]) {
      const pinch = distance(hands[0][4], hands[0][8]);
      if (previousPinchRef.current !== null) {
        current.setZoom(current.zoom - (pinch - previousPinchRef.current) * 4);
      }
      previousPinchRef.current = pinch;
    } else {
      previousPinchRef.current = null;
    }

    if (gesture === "open-palm" && hands[0]) {
      const center = palmCenter(hands[0]);
      if (previousPalmRef.current) {
        const dx = smooth(0, center.x - previousPalmRef.current.x, 0.65);
        const dy = smooth(0, center.y - previousPalmRef.current.y, 0.65);
        current.setRotation(
          current.rotation[0] + dx * 6,
          Math.max(-0.45, Math.min(0.55, current.rotation[1] + dy * 2.5)),
        );
      }
      previousPalmRef.current = center;
    } else if (gesture !== "pointing") {
      previousPalmRef.current = null;
    }

    if (gesture === "two-hand-spread" && hands.length >= 2) {
      const spread = distance(palmCenter(hands[0]), palmCenter(hands[1]));
      if (previousSpreadRef.current !== null) {
        current.setExplode(Math.max(0, Math.min(1, current.explode + (spread - previousSpreadRef.current) * 2.5)));
      }
      previousSpreadRef.current = spread;
    } else {
      previousSpreadRef.current = null;
    }

    if (gesture === "two-hand-zoom" && settings.twoHandZoom && hands.length >= 2) {
      const spread = distance(palmCenter(hands[0]), palmCenter(hands[1]));
      if (previousSpreadRef.current !== null) {
        current.setZoom(current.zoom + (spread - previousSpreadRef.current) * 3.5);
      }
      previousSpreadRef.current = spread;
    }

    if (gesture === "pointing" && hands[0]) {
      const tip = hands[0][8];
      const id = useStudioStore.getState().pointAt(tip.x, tip.y);
      if (id !== stablePointRef.current.id) stablePointRef.current = { id, since: performance.now() };
      if (id && performance.now() - stablePointRef.current.since > settings.pointDwellMs) {
        current.setSelectedPart(id);
      }
    } else {
      stablePointRef.current = { id: "", since: 0 };
    }

    if (gesture === "thumbs-up" && performance.now() - lastConfirmRef.current > settings.gestureCooldown) {
      lastConfirmRef.current = performance.now();
      useStudioStore.getState().confirmCustomization();
    }
  }, []);

  const calibrate = useCallback(() => {
    const hand = smoothedLandmarksRef.current[0];
    if (!hand || hand.length < 21) {
      setError("Show one hand in the camera and hold it steady before calibrating.");
      return false;
    }
    const scale = distance(hand[0], hand[9]);
    if (!Number.isFinite(scale) || scale <= 0.02) {
      setError("The calibration pose was not clear enough. Move your hand slightly farther from the camera.");
      return false;
    }
    const settings = useStudioStore.getState().gestureSettings;
    useStudioStore.getState().setGestureSettings({
      calibrationHandScale: Math.min(0.45, Math.max(0.08, scale)),
      pinchThreshold: settings.pinchThreshold,
    });
    setError("");
    return true;
  }, []);

  useEffect(() => {
    return () => {
      clearReconnectTimer();
      cancelAnimationFrame(frameRef.current);
      landmarkerRef.current?.close();
      streamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, [clearReconnectTimer]);

  return { videoRef, landmarks, status, error, start, stop, calibrate };
}
