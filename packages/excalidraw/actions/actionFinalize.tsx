import { pointFrom } from "@excalidraw/math";

import {
  maybeBindLinearElement,
  bindOrUnbindLinearElement,
  isBindingEnabled,
} from "@excalidraw/element/binding";
import {
  isValidPolygon,
  LinearElementEditor,
  newElementWith,
  newTextElement,
  getBoundTextElementPosition,
} from "@excalidraw/element";

import {
  isBindingElement,
  isFreeDrawElement,
  isLinearElement,
  isLineElement,
  isRulerElement,
} from "@excalidraw/element";

import {
  KEYS,
  arrayToMap,
  tupleToCoors,
  updateActiveTool,
  DEFAULT_FONT_FAMILY,
  DEFAULT_FONT_SIZE,
} from "@excalidraw/common";
import { isPathALoop } from "@excalidraw/element";

import { isInvisiblySmallElement } from "@excalidraw/element";

import { CaptureUpdateAction } from "@excalidraw/element";

import type { LocalPoint } from "@excalidraw/math";
import type {
  ExcalidrawElement,
  ExcalidrawLinearElement,
  NonDeleted,
} from "@excalidraw/element/types";

import { t } from "../i18n";
import { resetCursor } from "../cursor";
import { done } from "../components/icons";
import { ToolButton } from "../components/ToolButton";

import { register } from "./register";

import type { AppState } from "../types";

export const actionFinalize = register({
  name: "finalize",
  label: "",
  trackEvent: false,
  perform: (elements, appState, data, app) => {
    const { interactiveCanvas, focusContainer, scene } = app;
    const { event, sceneCoords } =
      (data as {
        event?: PointerEvent;
        sceneCoords?: { x: number; y: number };
      }) ?? {};
    const elementsMap = scene.getNonDeletedElementsMap();

    if (event && appState.selectedLinearElement) {
      const linearElementEditor = LinearElementEditor.handlePointerUp(
        event,
        appState.selectedLinearElement,
        appState,
        app.scene,
      );

      const { startBindingElement, endBindingElement } = linearElementEditor;
      const element = app.scene.getElement(linearElementEditor.elementId);
      if (isBindingElement(element)) {
        bindOrUnbindLinearElement(
          element,
          startBindingElement,
          endBindingElement,
          app.scene,
        );
      }

      if (linearElementEditor !== appState.selectedLinearElement) {
        let newElements = elements;
        if (element && isInvisiblySmallElement(element)) {
          // TODO: #7348 in theory this gets recorded by the store, so the invisible elements could be restored by the undo/redo, which might be not what we would want
          newElements = newElements.map((el) => {
            if (el.id === element.id) {
              return newElementWith(el, {
                isDeleted: true,
              });
            }
            return el;
          });
        }
        return {
          elements: newElements,
          appState: {
            selectedLinearElement: {
              ...linearElementEditor,
              selectedPointsIndices: null,
            },
            suggestedBindings: [],
          },
          captureUpdate: CaptureUpdateAction.IMMEDIATELY,
        };
      }
    }

    if (appState.selectedLinearElement?.isEditing) {
      const { elementId, startBindingElement, endBindingElement } =
        appState.selectedLinearElement;
      const element = LinearElementEditor.getElement(elementId, elementsMap);

      if (element) {
        if (isBindingElement(element)) {
          bindOrUnbindLinearElement(
            element,
            startBindingElement,
            endBindingElement,
            scene,
          );
        }
        if (isLineElement(element) && !isValidPolygon(element.points)) {
          scene.mutateElement(element, {
            polygon: false,
          });
        }

        return {
          elements:
            element.points.length < 2 || isInvisiblySmallElement(element)
              ? elements.map((el) => {
                  if (el.id === element.id) {
                    return newElementWith(el, { isDeleted: true });
                  }
                  return el;
                })
              : undefined,
          appState: {
            ...appState,
            cursorButton: "up",
            selectedLinearElement: new LinearElementEditor(
              element,
              arrayToMap(elementsMap),
              false, // exit editing mode
            ),
          },
          captureUpdate: CaptureUpdateAction.IMMEDIATELY,
        };
      }
    }

    let newElements = elements;

    if (window.document.activeElement instanceof HTMLElement) {
      focusContainer();
    }

    let element: NonDeleted<ExcalidrawElement> | null = null;
    if (appState.multiElement) {
      element = appState.multiElement;
    } else if (
      appState.newElement?.type === "freedraw" ||
      isBindingElement(appState.newElement)
    ) {
      element = appState.newElement;
    } else if (Object.keys(appState.selectedElementIds).length === 1) {
      const candidate = elementsMap.get(
        Object.keys(appState.selectedElementIds)[0],
      ) as NonDeleted<ExcalidrawLinearElement> | undefined;
      if (candidate) {
        element = candidate;
      }
    }

    if (element) {
      // pen and mouse have hover
      if (appState.multiElement && element.type !== "freedraw") {
        const { points, lastCommittedPoint } = element;
        if (
          !lastCommittedPoint ||
          points[points.length - 1] !== lastCommittedPoint
        ) {
          scene.mutateElement(element, {
            points: element.points.slice(0, -1),
          });
        }
      }

      if (element && isInvisiblySmallElement(element)) {
        // TODO: #7348 in theory this gets recorded by the store, so the invisible elements could be restored by the undo/redo, which might be not what we would want
        newElements = newElements.map((el) => {
          if (el.id === element?.id) {
            return newElementWith(el, { isDeleted: true });
          }
          return el;
        });
      }

      if (isLinearElement(element) || isFreeDrawElement(element)) {
        // If the multi point line closes the loop,
        // set the last point to first point.
        // This ensures that loop remains closed at different scales.
        const isLoop = isPathALoop(element.points, appState.zoom.value);

        if (isLoop && (isLineElement(element) || isFreeDrawElement(element))) {
          const linePoints = element.points;
          const firstPoint = linePoints[0];
          const points: LocalPoint[] = linePoints.map((p, index) =>
            index === linePoints.length - 1
              ? pointFrom(firstPoint[0], firstPoint[1])
              : p,
          );
          if (isLineElement(element)) {
            scene.mutateElement(element, {
              points,
              polygon: true,
            });
          } else {
            scene.mutateElement(element, {
              points,
            });
          }
        }

        if (isLineElement(element) && !isValidPolygon(element.points)) {
          scene.mutateElement(element, {
            polygon: false,
          });
        }

        // Create bound text for ruler element
        if (isRulerElement(element) && element.points.length >= 2) {
          // Check if ruler already has bound text to avoid duplicates
          const hasBoundText = element.boundElements?.some(
            (el) => el.type === "text",
          );

          if (!hasBoundText) {
            // Calculate distance in pixels
            const start = element.points[0];
            const end = element.points[element.points.length - 1];
            const dx = end[0] - start[0];
            const dy = end[1] - start[1];
            const distanceInPixels = Math.sqrt(dx * dx + dy * dy);

            // Convert to inches (71 pixels = 1 inch)
            const distanceInInches = distanceInPixels / 71;
            const measurement = distanceInInches.toFixed(1) + '"';

            // Create text element with temporary position (0,0)
            // The position will be recalculated by redrawTextBoundingBox
            const textElement = newTextElement({
              x: 0,
              y: 0,
              text: measurement,
              fontSize: appState.currentItemFontSize || DEFAULT_FONT_SIZE,
              fontFamily: appState.currentItemFontFamily || DEFAULT_FONT_FAMILY,
              strokeColor: element.strokeColor,
              backgroundColor: appState.viewBackgroundColor, // Use canvas background color to mask the line
              fillStyle: "solid",
              strokeWidth: 0, // No stroke for the text background
              strokeStyle: "solid",
              roughness: 0,
              opacity: 100,
              containerId: element.id,
              verticalAlign: "middle",
              textAlign: "center",
            });

            // Update ruler element to reference the bound text FIRST
            scene.mutateElement(element, {
              boundElements: [
                ...(element.boundElements || []),
                { id: textElement.id, type: "text" },
              ],
            });

            // Add text element to scene
            scene.insertElement(textElement);

            // Calculate the correct position using LinearElementEditor
            const elementsMap = scene.getNonDeletedElementsMap();
            const position = LinearElementEditor.getBoundTextElementPosition(
              element,
              textElement as any,
              elementsMap,
            );

            // Update text element with the correct position
            scene.mutateElement(textElement, {
              x: position.x,
              y: position.y,
            });

            // Get updated elements from scene
            newElements = scene.getNonDeletedElements();
          }
        }

        if (
          isBindingElement(element) &&
          !isLoop &&
          element.points.length > 1 &&
          isBindingEnabled(appState)
        ) {
          const coords =
            sceneCoords ??
            tupleToCoors(
              LinearElementEditor.getPointAtIndexGlobalCoordinates(
                element,
                -1,
                arrayToMap(elements),
              ),
            );

          maybeBindLinearElement(element, appState, coords, scene);
        }
      }
    }

    if (
      (!appState.activeTool.locked &&
        appState.activeTool.type !== "freedraw") ||
      !element
    ) {
      resetCursor(interactiveCanvas);
    }

    let activeTool: AppState["activeTool"];
    if (appState.activeTool.type === "eraser") {
      activeTool = updateActiveTool(appState, {
        ...(appState.activeTool.lastActiveTool || {
          type: app.state.preferredSelectionTool.type,
        }),
        lastActiveToolBeforeEraser: null,
      });
    } else {
      activeTool = updateActiveTool(appState, {
        type: app.state.preferredSelectionTool.type,
      });
    }

    return {
      elements: newElements,
      appState: {
        ...appState,
        cursorButton: "up",
        activeTool:
          (appState.activeTool.locked ||
            appState.activeTool.type === "freedraw") &&
          element
            ? appState.activeTool
            : activeTool,
        activeEmbeddable: null,
        newElement: null,
        selectionElement: null,
        multiElement: null,
        editingTextElement: null,
        startBoundElement: null,
        suggestedBindings: [],
        selectedElementIds:
          element &&
          !appState.activeTool.locked &&
          appState.activeTool.type !== "freedraw"
            ? {
                ...appState.selectedElementIds,
                [element.id]: true,
              }
            : appState.selectedElementIds,
        // To select the linear element when user has finished mutipoint editing
        selectedLinearElement:
          element && isLinearElement(element)
            ? new LinearElementEditor(element, arrayToMap(newElements))
            : appState.selectedLinearElement,
      },
      // TODO: #7348 we should not capture everything, but if we don't, it leads to incosistencies -> revisit
      captureUpdate: CaptureUpdateAction.IMMEDIATELY,
    };
  },
  keyTest: (event, appState) =>
    (event.key === KEYS.ESCAPE &&
      (appState.selectedLinearElement?.isEditing ||
        (!appState.newElement && appState.multiElement === null))) ||
    ((event.key === KEYS.ESCAPE || event.key === KEYS.ENTER) &&
      appState.multiElement !== null),
  PanelComponent: ({ appState, updateData, data }) => (
    <ToolButton
      type="button"
      icon={done}
      title={t("buttons.done")}
      aria-label={t("buttons.done")}
      onClick={updateData}
      visible={appState.multiElement != null}
      size={data?.size || "medium"}
      style={{ pointerEvents: "all" }}
    />
  ),
});
