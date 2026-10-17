import { act, cleanup, render } from "@testing-library/react";
import "@testing-library/jest-dom";
import { Config } from "../../../types";

jest.mock("../styles.module.css");
jest.mock("@dnd-kit/react");

// Toggled per test to simulate the desktop (>= 638px) and mobile breakpoints.
let isDesktop = true;

Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: (query: string) => ({
    matches: query === "(min-width: 638px)" ? isDesktop : false,
    media: query,
    onchange: null,
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    addListener: jest.fn(),
    removeListener: jest.fn(),
    dispatchEvent: jest.fn(),
  }),
});

const originalConsoleError = console.error;
const consoleErrorSpy = jest
  .spyOn(console, "error")
  .mockImplementation((...args: unknown[]) => {
    if (
      args.some((arg) => String(arg).includes("Could not parse CSS stylesheet"))
    ) {
      return;
    }

    originalConsoleError(...(args as Parameters<typeof console.error>));
  });

jest.mock("@dnd-kit/react", () => {
  const original = jest.requireActual("@dnd-kit/react");
  return {
    ...original,
    DragDropProvider: ({ children }: { children: React.ReactNode }) => (
      <>{children}</>
    ),
    useDroppable: () => ({
      ref: () => undefined,
      setNodeRef: () => undefined,
      isOver: false,
    }),
    useDraggable: () => ({
      attributes: {},
      listeners: {},
      setNodeRef: () => undefined,
      isDragging: false,
    }),
  };
});

class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}
(global as any).ResizeObserver = ResizeObserver;

import { Puck } from "../index";

const config: Config = {
  components: {},
  root: {
    fields: {
      title: { type: "text" },
    },
  },
};

// Flush any queued state updates.
const flush = () => act(async () => {});

const getTitleInputs = () =>
  Array.from(document.querySelectorAll<HTMLInputElement>("input")).filter(
    (input) => input.id.endsWith("_text_title")
  );

afterEach(() => cleanup());

afterAll(() => {
  consoleErrorSpy.mockRestore();
});

describe("Puck fields plugin", () => {
  it("renders each field once on desktop", async () => {
    isDesktop = true;

    render(<Puck config={config} data={{}} iframe={{ enabled: false }} />);

    await flush();

    const inputs = getTitleInputs();

    expect(inputs).toHaveLength(1);
    expect(inputs[0].id).toBeTruthy();
  });

  it("renders each field once on mobile", async () => {
    isDesktop = false;

    render(<Puck config={config} data={{}} iframe={{ enabled: false }} />);

    await flush();

    expect(getTitleInputs()).toHaveLength(1);
  });

  it("does not render duplicate element ids", async () => {
    isDesktop = true;

    render(<Puck config={config} data={{}} iframe={{ enabled: false }} />);

    await flush();

    const ids = Array.from(document.querySelectorAll("[id]")).map(
      (el) => el.id
    );

    expect(new Set(ids).size).toBe(ids.length);
  });
});
