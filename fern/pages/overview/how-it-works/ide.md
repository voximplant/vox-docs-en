# Cloud IDE

Voximplant includes a full-featured, browser-based Cloud IDE built directly into the Control Panel. It allows you to write, test, and debug VoxEngine JavaScript scenarios immediately—without installing local runtimes, configuring bundlers, or setting up deployment pipelines.

---

## Editor features

The Cloud IDE provides a modern code editing experience optimized for real-time scenario development:

* **Context-aware autocomplete**: Instant suggestions for all VoxEngine namespaces, classes, methods, and event enums (such as `AppEvents`, `CallEvents`, and `VoxEngine`).
* **Command palette**: Press `F1` (or right-click anywhere in the editor) to access all editor commands, keybindings, and preferences.
* **Syntax highlighting & formatting**: Full support for modern ECMAScript standards with automatic indentation and code formatting.
* **Code navigation**: Jump to variable and function definitions, find all references, and navigate between matching brackets and parentheses.
* **Advanced search & replace**: Multi-file symbol search with regular expression (regex) and case-matching support.
* **Split editor & tabs**: Work across multiple scenarios simultaneously using tabs or split the editor view horizontally/vertically to edit scenarios side by side.
* **Code folding & minimap**: Collapse functions or blocks of logic and use the visual minimap on the right to navigate long scenarios quickly.

---

## Autocomplete and TypeScript typings

As you type, the Cloud IDE inspects VoxEngine entities and suggests appropriate methods, properties, and parameters. Press `Tab` or `Enter` to insert the suggested code.

While the runtime executes standard JavaScript (ECMAScript 2022), you can leverage VoxEngine TypeScript typings when developing locally:

* You can [download the TypeScript declaration file]() (`voxengine.d.ts`) to enable rich IntelliSense and autocompletion in local editors such as Visual Studio Code.
* If you write your scenarios locally in TypeScript, remember to transpile your code to standard JavaScript before deploying it to Voximplant.

<Info title="Local IDE development">
If you prefer working in a local IDE like VS Code or WebStorm, use [VoxEngine CI]() to synchronize and deploy your scenario files automatically.
</Info>

---

## Visual Diff tool

Before overwriting a scenario in production, you can review your unsaved changes against the version currently deployed in the cloud using the built-in **Diff utility**:

1. Right-click inside the scenario editor (or double-click to open the context menu).
2. Select **Show diff**.
3. Review changes in the diff dialog. By default, changes appear in a **side-by-side** comparison mode; toggle the checkbox in the upper-right corner to switch to an **inline** view.

---

## Navigation and multi-scenario workflows

Complex applications often divide logic across multiple scenario files bound to the same routing rule:

* **Multi-tab management**: Open several scenarios in independent tabs to jump between call routing logic, helper utilities, and database handlers.
* **Split view**: Drag tabs to the side to view two scenarios simultaneously, making it easy to cross-reference functions shared in the same execution context.
* **Error detection**: Syntax errors and missing references are flagged inline in real time with line numbers and hover descriptions before you save.