import {
  pointFrom,
  pointOnLineSegment,
  pointRotateRads,
  type Radians,
} from "@excalidraw/math";

import { SIDE_RESIZING_THRESHOLD } from "@excalidraw/common";

import type { GlobalPoint, LineSegment, LocalPoint } from "@excalidraw/math";

import type { AppState, Device, Zoom } from "@excalidraw/excalidraw/types";

import { getElementAbsoluteCoords, getCommonBounds } from "./bounds";
import {
  getTransformHandlesFromCoords,
  getTransformHandles,
  getOmitSidesForDevice,
  canResizeFromSides,
} from "./transformHandles";
import { isImageElement, isLinearElement } from "./typeChecks";

import type { Bounds } from "./bounds";
import type {
  TransformHandleType,
  TransformHandle,
  MaybeTransformHandleType,
} from "./transformHandles";
import type {
  ExcalidrawElement,
  PointerType,
  NonDeletedExcalidrawElement,
  ElementsMap,
} from "./types";

const isInsideTransformHandle = (
  transformHandle: TransformHandle,
  x: number,
  y: number,
) =>
  x >= transformHandle[0] &&
  x <= transformHandle[0] + transformHandle[2] &&
  y >= transformHandle[1] &&
  y <= transformHandle[1] + transformHandle[3];

export const resizeTest = <Point extends GlobalPoint | LocalPoint>(
  element: NonDeletedExcalidrawElement,
  elementsMap: ElementsMap,
  appState: AppState,
  x: number,
  y: number,
  zoom: Zoom,
  pointerType: PointerType,
  device: Device,
): MaybeTransformHandleType => {
  if (!appState.selectedElementIds[element.id]) {
    return false;
  }

  const { rotation: rotationTransformHandle, ...transformHandles } =
    getTransformHandles(
      element,
      zoom,
      elementsMap,
      pointerType,
      getOmitSidesForDevice(device),
    );

  if (
    rotationTransformHandle &&
    isInsideTransformHandle(rotationTransformHandle, x, y)
  ) {
    return "rotation" as TransformHandleType;
  }

  const filter = Object.keys(transformHandles).filter((key) => {
    const transformHandle =
      transformHandles[key as Exclude<TransformHandleType, "rotation">]!;
    if (!transformHandle) {
      return false;
    }
    return isInsideTransformHandle(transformHandle, x, y);
  });

  if (filter.length > 0) {
    return filter[0] as TransformHandleType;
  }

  if (canResizeFromSides(device)) {
    const [x1, y1, x2, y2, cx, cy] = getElementAbsoluteCoords(
      element,
      elementsMap,
    );

    // do not resize from the sides for linear elements with only two points
    if (!(isLinearElement(element) && element.points.length <= 2)) {
      const SPACING = isImageElement(element)
        ? 0
        : SIDE_RESIZING_THRESHOLD / zoom.value;
      const ZOOMED_SIDE_RESIZING_THRESHOLD =
        SIDE_RESIZING_THRESHOLD / zoom.value;
      const sides = getSelectionBorders(
        pointFrom(x1 - SPACING, y1 - SPACING),
        pointFrom(x2 + SPACING, y2 + SPACING),
        pointFrom(cx, cy),
        element.angle,
      );

      for (const [dir, side] of Object.entries(sides)) {
        // test to see if x, y are on the line segment
        if (
          pointOnLineSegment(
            pointFrom(x, y),
            side as LineSegment<Point>,
            ZOOMED_SIDE_RESIZING_THRESHOLD,
          )
        ) {
          return dir as TransformHandleType;
        }
      }
    }
  }

  return false;
};

export const getElementWithTransformHandleType = (
  elements: readonly NonDeletedExcalidrawElement[],
  appState: AppState,
  scenePointerX: number,
  scenePointerY: number,
  zoom: Zoom,
  pointerType: PointerType,
  elementsMap: ElementsMap,
  device: Device,
) => {
  return elements.reduce((result, element) => {
    if (result) {
      return result;
    }
    const transformHandleType = resizeTest(
      element,
      elementsMap,
      appState,
      scenePointerX,
      scenePointerY,
      zoom,
      pointerType,
      device,
    );
    return transformHandleType ? { element, transformHandleType } : null;
  }, null as { element: NonDeletedExcalidrawElement; transformHandleType: MaybeTransformHandleType } | null);
};

export const getTransformHandleTypeFromCoords = <
  Point extends GlobalPoint | LocalPoint,
>(
  [x1, y1, x2, y2]: Bounds,
  scenePointerX: number,
  scenePointerY: number,
  zoom: Zoom,
  pointerType: PointerType,
  device: Device,
): MaybeTransformHandleType => {
  const transformHandles = getTransformHandlesFromCoords(
    [x1, y1, x2, y2, (x1 + x2) / 2, (y1 + y2) / 2],
    0 as Radians,
    zoom,
    pointerType,
    getOmitSidesForDevice(device),
  );

  const found = Object.keys(transformHandles).find((key) => {
    const transformHandle =
      transformHandles[key as Exclude<TransformHandleType, "rotation">]!;
    return (
      transformHandle &&
      isInsideTransformHandle(transformHandle, scenePointerX, scenePointerY)
    );
  });

  if (found) {
    return found as MaybeTransformHandleType;
  }

  if (canResizeFromSides(device)) {
    const cx = (x1 + x2) / 2;
    const cy = (y1 + y2) / 2;

    const SPACING = SIDE_RESIZING_THRESHOLD / zoom.value;

    const sides = getSelectionBorders(
      pointFrom(x1 - SPACING, y1 - SPACING),
      pointFrom(x2 + SPACING, y2 + SPACING),
      pointFrom(cx, cy),
      0 as Radians,
    );

    for (const [dir, side] of Object.entries(sides)) {
      // test to see if x, y are on the line segment
      if (
        pointOnLineSegment(
          pointFrom(scenePointerX, scenePointerY),
          side as LineSegment<Point>,
          SPACING,
        )
      ) {
        return dir as TransformHandleType;
      }
    }
  }

  return false;
};

const RESIZE_CURSORS = ["ns", "nesw", "ew", "nwse"];
const rotateResizeCursor = (cursor: string, angle: number) => {
  const index = RESIZE_CURSORS.indexOf(cursor);
  if (index >= 0) {
    const a = Math.round(angle / (Math.PI / 4));
    cursor = RESIZE_CURSORS[(index + a) % RESIZE_CURSORS.length];
  }
  return cursor;
};

/*
 * Returns bi-directional cursor for the element being resized
 */
export const getCursorForResizingElement = (resizingElement: {
  element?: ExcalidrawElement;
  transformHandleType: MaybeTransformHandleType;
}): string => {
  const { element, transformHandleType } = resizingElement;
  const shouldSwapCursors =
    element && Math.sign(element.height) * Math.sign(element.width) === -1;
  let cursor = null;

  switch (transformHandleType) {
    case "n":
    case "s":
      cursor = "ns";
      break;
    case "w":
    case "e":
      cursor = "ew";
      break;
    case "nw":
    case "se":
      if (shouldSwapCursors) {
        cursor = "nesw";
      } else {
        cursor = "nwse";
      }
      break;
    case "ne":
    case "sw":
      if (shouldSwapCursors) {
        cursor = "nwse";
      } else {
        cursor = "nesw";
      }
      break;
    case "rotation":
      return "grab";
  }

  if (cursor && element) {
    cursor = rotateResizeCursor(cursor, element.angle);
  }

  return cursor ? `${cursor}-resize` : "";
};

const getSelectionBorders = <Point extends LocalPoint | GlobalPoint>(
  [x1, y1]: Point,
  [x2, y2]: Point,
  center: Point,
  angle: Radians,
) => {
  const topLeft = pointRotateRads(pointFrom(x1, y1), center, angle);
  const topRight = pointRotateRads(pointFrom(x2, y1), center, angle);
  const bottomLeft = pointRotateRads(pointFrom(x1, y2), center, angle);
  const bottomRight = pointRotateRads(pointFrom(x2, y2), center, angle);

  return {
    n: [topLeft, topRight],
    e: [topRight, bottomRight],
    s: [bottomRight, bottomLeft],
    w: [bottomLeft, topLeft],
  };
};

/**
 * Tests if the pointer is on the rotation center handle
 */
export const isPointerOnRotationCenterHandle = (
  element: NonDeletedExcalidrawElement,
  elementsMap: ElementsMap,
  x: number,
  y: number,
  zoom: Zoom,
): boolean => {
  const [x1, y1, x2, y2] = getElementAbsoluteCoords(element, elementsMap, true);

  // Get the rotation center position
  let rotationCenterX = (x1 + x2) / 2;
  let rotationCenterY = (y1 + y2) / 2;

  if (element.customRotationCenter) {
    // Custom rotation center is relative to element's x,y
    const [relX, relY] = element.customRotationCenter;
    rotationCenterX = element.x + relX;
    rotationCenterY = element.y + relY;

    // Rotate the custom center point around the element's default center
    // to account for element rotation
    if (element.angle !== 0) {
      const rotated = pointRotateRads(
        pointFrom(rotationCenterX, rotationCenterY),
        pointFrom(element.x + element.width / 2, element.y + element.height / 2),
        element.angle,
      );
      rotationCenterX = rotated[0];
      rotationCenterY = rotated[1];
    }
  }

  // Handle size (same as in renderRotationCenterHandle)
  const handleSize = 8 / zoom.value;

  // Calculate distance from pointer to rotation center
  const distance = Math.sqrt(
    Math.pow(x - rotationCenterX, 2) + Math.pow(y - rotationCenterY, 2)
  );

  // Only activate pivot handle if:
  // 1. Pointer is close to the handle (within handleSize)
  // 2. For small elements, use stricter tolerance to avoid drag interference
  const elementWidth = x2 - x1;
  const elementHeight = y2 - y1;
  const minElementSize = 15;

  if (elementWidth < minElementSize && elementHeight < minElementSize) {
    // For small elements, require more precision to avoid drag interference
    return distance <= handleSize;
  }

  // For larger elements, use full handleSize tolerance (8px at zoom 1.0)
  return distance <= handleSize;
};

/**
 * Tests if the pointer is on the group rotation center handle
 */
export const isPointerOnGroupRotationCenterHandle = (
  selectedElements: readonly NonDeletedExcalidrawElement[],
  elementsMap: ElementsMap,
  x: number,
  y: number,
  zoom: Zoom,
  customRotationCenter?: { x: number; y: number } | null,
): boolean => {
  const [x1, y1, x2, y2] = getCommonBounds(selectedElements, elementsMap);

  // Get the group rotation center position (custom or default)
  const rotationCenterX = customRotationCenter?.x ?? (x1 + x2) / 2;
  const rotationCenterY = customRotationCenter?.y ?? (y1 + y2) / 2;

  // Handle size (same as in renderGroupRotationCenterHandle)
  const handleSize = 8 / zoom.value;

  // Calculate distance from pointer to rotation center
  const distance = Math.sqrt(
    Math.pow(x - rotationCenterX, 2) + Math.pow(y - rotationCenterY, 2)
  );

  // Only activate pivot handle if:
  // 1. Pointer is very close to the handle (within handleSize / 2)
  // 2. AND the group is large enough (width or height > 50) to avoid interference with small groups
  const groupWidth = x2 - x1;
  const groupHeight = y2 - y1;
  const minGroupSize = 15;

  if (groupWidth < minGroupSize && groupHeight < minGroupSize) {
    // For small groups, require even more precision to avoid drag interference
    return distance <= handleSize;
  }

  // For larger groups, use normal tolerance
  return distance <= handleSize;
};
