const FOCUSABLE_SELECTOR = [
  "a[href]",
  "area[href]",
  "button:not([disabled])",
  "input:not([disabled]):not([type='hidden'])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  "[tabindex]:not([tabindex='-1'])",
].join(",");

function resolveElement(candidate) {
  if (!candidate) {
    return null;
  }

  if (candidate instanceof HTMLElement) {
    return candidate;
  }

  if (typeof candidate === "string") {
    return document.querySelector(candidate);
  }

  return null;
}

function getFocusableElements(container) {
  if (!container) {
    return [];
  }

  return Array.from(container.querySelectorAll(FOCUSABLE_SELECTOR)).filter(
    (element) => element instanceof HTMLElement && element.offsetParent !== null
  );
}

function normalizeBody(body) {
  if (body instanceof HTMLElement || body instanceof DocumentFragment) {
    return body;
  }

  const node = document.createElement("p");
  node.textContent = String(body ?? "");
  return node;
}

function normalizeAction(config, fallbackLabel) {
  if (!config) {
    return null;
  }

  const normalized = {
    label: config.label ?? fallbackLabel,
    closeOnSelect: config.closeOnSelect !== false,
  };

  if (typeof config.onSelect === "function") {
    normalized.onSelect = config.onSelect;
  }

  if (typeof config.initialFocus === "boolean") {
    normalized.initialFocus = config.initialFocus;
  }

  if (typeof config.id === "string") {
    normalized.id = config.id;
  }

  return normalized;
}

class ModalController {
  constructor(container, options = {}) {
    this.container = container;
    this.defaultCloseOnBackdrop = options.closeOnBackdrop ?? true;
    this.activeModal = null;
    this.activeConfig = null;
    this.previousFocus = null;
    this.focusableElements = [];
    this.boundFocusEnforcer = this.enforceFocus.bind(this);
    this.boundKeyHandler = this.handleKeyDown.bind(this);
    this.boundBackdropHandler = this.handleBackdropInteraction.bind(this);
  }

  open(config = {}) {
    if (!this.container) {
      return null;
    }

    this.close("superseded");

    const normalized = this.normalizeConfig(config);
    const overlay = document.createElement("div");
    overlay.className = "modal-backdrop";
    overlay.dataset.modal = "backdrop";

    const dialog = document.createElement("div");
    dialog.className = "modal";
    dialog.setAttribute("role", "dialog");
    dialog.setAttribute("aria-modal", "true");
    dialog.tabIndex = -1;

    const titleId = `${normalized.id}-title`;
    const bodyId = `${normalized.id}-body`;

    if (normalized.title) {
      const title = document.createElement("h2");
      title.id = titleId;
      title.className = "modal__title";
      title.textContent = normalized.title;
      dialog.setAttribute("aria-labelledby", titleId);
      dialog.appendChild(title);
    } else {
      dialog.setAttribute("aria-label", normalized.ariaLabel ?? "Dialog");
    }

    const bodyWrapper = document.createElement("div");
    bodyWrapper.id = bodyId;
    bodyWrapper.className = "modal__body";

    const bodyContent = normalizeBody(normalized.body);
    bodyWrapper.appendChild(bodyContent);
    dialog.appendChild(bodyWrapper);
    dialog.setAttribute("aria-describedby", bodyId);

    const actions = document.createElement("div");
    actions.className = "modal__actions";
    let initialFocusElement = null;

    if (normalized.secondary) {
      const secondaryButton = this.createActionButton("secondary", normalized.secondary);
      actions.appendChild(secondaryButton);
      if (!initialFocusElement && normalized.secondary.initialFocus) {
        initialFocusElement = secondaryButton;
      }
    }

    if (normalized.primary) {
      const primaryButton = this.createActionButton("primary", normalized.primary);
      actions.appendChild(primaryButton);
      if (!initialFocusElement && normalized.primary.initialFocus !== false) {
        initialFocusElement = primaryButton;
      }
    }

    if (actions.children.length > 0) {
      dialog.appendChild(actions);
    }

    overlay.appendChild(dialog);
    this.container.appendChild(overlay);

    this.previousFocus =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    this.activeModal = { overlay, dialog };
    this.activeConfig = normalized;

    this.refreshFocusableElements();

    dialog.addEventListener("keydown", this.boundKeyHandler);
    document.addEventListener("focusin", this.boundFocusEnforcer, true);

    if (this.shouldCloseOnBackdrop()) {
      overlay.addEventListener("mousedown", this.boundBackdropHandler);
      overlay.addEventListener("touchstart", this.boundBackdropHandler);
    }

    const targetFocus =
      resolveElement(normalized.initialFocus) ??
      initialFocusElement ??
      this.focusableElements[0] ??
      dialog;

    window.setTimeout(() => {
      targetFocus.focus();
    }, 0);

    return {
      close: (reason) => this.close(reason ?? "api"),
      element: dialog,
    };
  }

  close(reason = "close") {
    if (!this.activeModal) {
      return;
    }

    const { overlay, dialog } = this.activeModal;

    dialog.removeEventListener("keydown", this.boundKeyHandler);
    document.removeEventListener("focusin", this.boundFocusEnforcer, true);
    overlay.removeEventListener("mousedown", this.boundBackdropHandler);
    overlay.removeEventListener("touchstart", this.boundBackdropHandler);

    overlay.remove();

    const config = this.activeConfig;
    this.activeModal = null;
    this.activeConfig = null;
    this.focusableElements = [];

    if (typeof config?.onClose === "function") {
      config.onClose({ reason });
    }

    const returnFocus = resolveElement(config?.returnFocus) ?? this.previousFocus ?? null;

    if (returnFocus && typeof returnFocus.focus === "function") {
      window.setTimeout(() => {
        returnFocus.focus();
      }, 0);
    }

    this.previousFocus = null;
  }

  isOpen() {
    return Boolean(this.activeModal);
  }

  handleKeyDown(event) {
    if (!this.activeModal) {
      return;
    }

    if (event.key === "Escape") {
      event.stopPropagation();
      event.preventDefault();
      this.close("escape");
      return;
    }

    if (event.key === "Tab") {
      this.refreshFocusableElements();
      const focusable = this.focusableElements;

      if (focusable.length === 0) {
        event.preventDefault();
        this.activeModal.dialog.focus();
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const current = document.activeElement;

      if (event.shiftKey) {
        if (!this.activeModal.dialog.contains(current) || current === first) {
          event.preventDefault();
          last.focus();
        }
      } else if (!this.activeModal.dialog.contains(current) || current === last) {
        event.preventDefault();
        first.focus();
      }
    }
  }

  enforceFocus(event) {
    if (!this.activeModal) {
      return;
    }

    if (!this.activeModal.dialog.contains(event.target)) {
      this.refreshFocusableElements();
      const fallback = this.focusableElements[0] ?? this.activeModal.dialog;
      window.setTimeout(() => fallback.focus(), 0);
    }
  }

  handleBackdropInteraction(event) {
    if (!this.activeModal) {
      return;
    }

    if (event.target === this.activeModal.overlay) {
      event.preventDefault();
      this.close("backdrop");
    }
  }

  refreshFocusableElements() {
    this.focusableElements = getFocusableElements(this.activeModal?.dialog);
  }

  shouldCloseOnBackdrop() {
    if (!this.activeConfig) {
      return this.defaultCloseOnBackdrop;
    }
    if (typeof this.activeConfig.closeOnBackdrop === "boolean") {
      return this.activeConfig.closeOnBackdrop;
    }
    return this.defaultCloseOnBackdrop;
  }

  normalizeConfig(config) {
    const normalized = {
      id: config.id ?? `modal-${Date.now()}`,
      title: config.title ?? "",
      body: config.body ?? "",
      ariaLabel: config.ariaLabel ?? null,
      returnFocus: config.returnFocus ?? null,
      closeOnBackdrop: config.closeOnBackdrop,
      initialFocus: config.initialFocus ?? null,
    };

    normalized.primary = normalizeAction(config.primary, "OK");
    normalized.secondary = normalizeAction(config.secondary, "Cancel");

    if (typeof config.onClose === "function") {
      normalized.onClose = config.onClose;
    }

    return normalized;
  }

  createActionButton(variant, config) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `modal__button modal__button--${variant}`;
    button.textContent = config.label ?? (variant === "primary" ? "OK" : "Cancel");

    button.addEventListener("click", (event) => {
      let shouldClose = config.closeOnSelect !== false;
      if (typeof config.onSelect === "function") {
        const result = config.onSelect({
          event,
          close: (reason) => this.close(reason ?? variant),
          reason: variant,
          controller: this,
        });
        if (result === false) {
          shouldClose = false;
        }
      }

      if (shouldClose) {
        this.close(variant);
      }
    });

    return button;
  }
}

function createNullController() {
  return {
    open() {
      console.warn("[ui/modals] Modal root not found; ignoring open request.");
      return null;
    },
    close() {},
    isOpen() {
      return false;
    },
  };
}

export function createModalController(options = {}) {
  const container =
    options.container ?? resolveElement(options.root ?? document.getElementById("modal-root"));

  if (!(container instanceof HTMLElement)) {
    return createNullController();
  }

  return new ModalController(container, options);
}

export { FOCUSABLE_SELECTOR };
