# Bingo App Theme Generation Guide

This document provides a comprehensive guide for creating and validating themes for the Bingo application. Adhering to these guidelines is critical for ensuring that themes are loaded and rendered correctly.

## Theme Anatomy

Each theme is self-contained within its own directory inside the `/themes` folder. The name of this directory serves as the theme's unique identifier (`id`).

### Directory Structure

A valid theme must have the following structure:

```
/themes
└───/my-awesome-theme/
    ├───theme.json
    └───theme.css
```

-   **`my-awesome-theme/`**: The theme's root directory. The name of this directory is the theme's `id`.
    -   **`id` requirements**: The theme `id` must consist only of lowercase letters, numbers, hyphens (`-`), and underscores (`_`).

### `theme.json`

This file contains the theme's metadata.

**Fields:**

| Field         | Type   | Required | Description                                                                                                                            |
| :------------ | :----- | :------- | :------------------------------------------------------------------------------------------------------------------------------------- |
| `name`        | String | Yes      | The human-readable name of the theme, displayed in the UI.                                                                             |
| `version`     | String | Yes      | The theme's version number (e.g., `"1.0.0"`).                                                                                          |
| `css`         | String | Yes      | The relative path to the theme's CSS file. This must be a simple relative path (e.g., `"theme.css"`) without directory traversal (`../`). |
| `description` | String | No       | A brief description of the theme.                                                                                                      |
| `colors`      | Object | No       | An object defining the theme's color palette. This is for informational purposes and is not directly used by the application's runtime.  |
| `font_family` | String | No       | The primary font family for the theme. This is for informational purposes and is not directly used by the application's runtime.         |

**Example `theme.json`:**

```json
{
  "name": "My Awesome Theme",
  "version": "1.0.0",
  "description": "A theme with a modern and clean look.",
  "css": "theme.css"
}
```

### `theme.css`

This file contains all the CSS rules for the theme.

**Key Requirements:**

1.  **`data-theme` Scoping**: All CSS rules **must** be scoped to the theme's `id` using the `data-theme` attribute on the `:root` element. This is the most critical requirement. The value of `data-theme` must exactly match the theme's directory name (its `id`).

    ```css
    /* Correct */
    :root[data-theme="my-awesome-theme"] .app {
      background-color: #f0f0f0;
    }

    /* Incorrect - will not work */
    .app {
      background-color: #f0f0f0;
    }
    ```

2.  **No Layout-Altering Properties on Core Components**: Avoid using CSS properties that can break the application's layout, such as `margin`, `padding`, `width`, or `height` on the main application containers (`.app`, `.board`, etc.). The application is designed to be responsive, and overriding these properties can lead to visual bugs. Stick to styling colors, backgrounds, borders, and fonts.

3.  **Comprehensive Styling**: A theme should provide styles for all major UI components and their states. See Appendix A for a complete list of selectors that should be styled as of October 25, 2025.

4.  **Security**: The CSS file must not contain any of the following:
    -   `<script>` tags
    -   `@import` rules that point to external URLs.
    -   `url()` references that point to external URLs or use `javascript:`. All `url()` references must be relative paths to resources within the theme's directory.

**Example `theme.css`:**

```css
/*
 * My Awesome Theme
 * ID: my-awesome-theme
 */

:root[data-theme="my-awesome-theme"] {
  --primary-color: #007bff;
  --background-color: #ffffff;
  --text-color: #333333;

  color-scheme: light;
  background-color: var(--background-color);
  color: var(--text-color);
}

:root[data-theme="my-awesome-theme"] .app {
  background: #f8f9fa;
  border: 1px solid #dee2e6;
}

:root[data-theme="my-awesome-theme"] .board__cell {
  background: #ffffff;
  border: 1px solid #ced4da;
  color: #495057;
}

:root[data-theme="my-awesome-theme"] .board__cell[data-state="marked"]::after {
  background: rgba(0, 123, 255, 0.2);
  border: 2px solid var(--primary-color);
}

/* ... other styles ... */
```

## Theme Generation Checklist

1.  [ ] Create a new directory for your theme inside `/themes`. The directory name will be your theme's `id`.
2.  [ ] Create a `theme.json` file in your theme's directory and fill in the required fields.
3.  [ ] Create a `theme.css` file in your theme's directory.
4.  [ ] In `theme.css`, scope all your styles using `:root[data-theme="your-theme-id"]`.
5.  [ ] Style all the necessary UI components. Use the `high_contrast` theme as a reference.
6.  [ ] Verify that your CSS does not contain any forbidden elements (`<script>`, external `@import`s, etc.).
7.  [ ] Test your theme thoroughly.

---

## Appendix A: Required CSS Selectors

This list is based on the selectors styled in the `high_contrast` theme as of **October 25, 2025**. A valid theme should provide styles for all of the following selectors and states. Remember to replace `your-theme-id` with your theme's actual ID.

```css
/* General */
:root[data-theme="your-theme-id"]
:root[data-theme="your-theme-id"] body

/* App Container */
:root[data-theme="your-theme-id"] .app
:root[data-theme="your-theme-id"] .app__instructions

/* Bingo Indicator */
:root[data-theme="your-theme-id"] .bingo-indicator
:root[data-theme="your-theme-id"] .bingo-indicator[data-state="active"]

/* Toolbar */
:root[data-theme="your-theme-id"] .toolbar__button
:root[data-theme="your-theme-id"] .toolbar__select
:root[data-theme="your-theme-id"] .toolbar__button:hover
:root[data-theme="your-theme-id"] .toolbar__select:hover
:root[data-theme="your-theme-id"] .toolbar__theme-label

/* Board */
:root[data-theme="your-theme-id"] .board-wrapper
:root[data-theme="your-theme-id"] .board
:root[data-theme="your-theme-id"] .board__cell
:root[data-theme="your-theme-id"] .board__cell:not([data-free="true"]):hover
:root[data-theme="your-theme-id"] .board__cell[data-free="true"]
:root[data-theme="your-theme-id"] .board__cell[data-state="marked"]::after
:root[data-theme="your-theme-id"] .board__cell[data-state="marked"]::before

/* Focus States */
:root[data-theme="your-theme-id"] .board__cell:focus-visible
:root[data-theme="your-theme-id"] .toolbar__button:focus-visible
:root[data-theme="your-theme-id"] .toolbar__select:focus-visible

/* Modal */
:root[data-theme="your-theme-id"] .modal-backdrop
:root[data-theme="your-theme-id"] .modal
:root[data-theme="your-theme-id"] .modal__body
:root[data-theme="your-theme-id"] .modal__button
:root[data-theme="your-theme-id"] .modal__button--primary
:root[data-theme="your-theme-id"] .modal__button--primary:hover
:root[data-theme="your-theme-id"] .modal__button--secondary
:root[data-theme="your-theme-id"] .modal__button--secondary:hover
:root[data-theme="your-theme-id"] .modal__button:focus-visible
```