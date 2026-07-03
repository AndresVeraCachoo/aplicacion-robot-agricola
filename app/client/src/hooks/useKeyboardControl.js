// src/hooks/useKeyboardControl.js
import { useEffect, useCallback } from "react";
import { useRobotStore } from "../store/robotStore";

/**
 * Hook personalizado para manejar el control del robot mediante teclado.
 * Escucha las teclas de dirección y WASD para enviar comandos de movimiento.
 * 
 * @returns {Object} Un objeto con las funciones handleMove y handleStop.
 */
export function useKeyboardControl() {
  const { system, sendManualMove } = useRobotStore();

  const handleMove = useCallback(
    (x, y) => {
      if (system.mode !== "MANUAL") return;
      sendManualMove({ x, y });
    },
    [system.mode, sendManualMove]
  );

  const handleStop = useCallback(() => {
    if (system.mode !== "MANUAL") return;
    sendManualMove({ x: 0, y: 0 });
  }, [system.mode, sendManualMove]);

  useEffect(() => {
    if (system.mode !== "MANUAL") return;

    const handleKeyDown = (e) => {
      // Prevenir el scroll de la página con las flechas
      if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.key)) {
        e.preventDefault();
      }

      // Evitar envíos repetidos si la tecla se mantiene pulsada
      if (e.repeat) return;

      switch (e.key) {
        case "ArrowUp":
        case "w":
        case "W":
          handleMove(0, 1);
          break;
        case "ArrowDown":
        case "s":
        case "S":
          handleMove(0, -1);
          break;
        case "ArrowLeft":
        case "a":
        case "A":
          handleMove(-1, 0);
          break;
        case "ArrowRight":
        case "d":
        case "D":
          handleMove(1, 0);
          break;
        default:
          break;
      }
    };

    const handleKeyUp = (e) => {
      const controlKeys = [
        "ArrowUp",
        "ArrowDown",
        "ArrowLeft",
        "ArrowRight",
        "w",
        "a",
        "s",
        "d",
        "W",
        "A",
        "S",
        "D",
      ];
      if (controlKeys.includes(e.key)) {
        handleStop();
      }
    };

    globalThis.addEventListener("keydown", handleKeyDown);
    globalThis.addEventListener("keyup", handleKeyUp);

    return () => {
      globalThis.removeEventListener("keydown", handleKeyDown);
      globalThis.removeEventListener("keyup", handleKeyUp);
    };
  }, [system.mode, handleMove, handleStop]);

  return { handleMove, handleStop };
}
