# Type declarations

Learn what type declarations are and how to use VoxEngine TypeScript declaration files (`voxengine.d.ts`) when writing scenario code in external IDEs like Visual Studio Code or WebStorm.

## Contents

- [What are type declarations](#what-are-type-declarations)
- [How to add Voximplant type declarations to your IDE](#how-to-add-voximplant-type-declarations-to-your-ide)
- [Configuring tsconfig.json](#configuring-tsconfigjson)
- [See also](#see-also)

---

## What are type declarations

When writing code in a modern IDE, the editor underlines syntax errors, flags missing properties, and provides context-aware autocomplete suggestions as you type.

Editors provide this real-time IntelliSense using **declaration files** (`.d.ts`). A declaration file defines the existence, signatures, and shapes of types, classes, methods, and global variables without providing their underlying runtime implementations.

Adding VoxEngine type declarations to your local project enables rich autocompletion and static type checking for all Voximplant-specific objects (such as `VoxEngine`, `CallEvents`, `AppEvents`, and `Logger`) when developing cloud [scenarios](/platform/getting-started/create-a-scenario).

---

## How to add Voximplant type declarations to your IDE

To enable type checking and IntelliSense for VoxEngine in your local editor:

1. Download the official VoxEngine declaration file:
   * [Download voxengine.d.ts]()
2. Move the downloaded `voxengine.d.ts` file into your local project workspace (for example, into a `types/` or `typings/` folder).

---

## Configuring tsconfig.json

Most modern editors automatically detect declaration files placed in your project root. To ensure consistent resolution across TypeScript and JavaScript projects, reference the declaration file in your `tsconfig.json` or `jsconfig.json`:

```json title="tsconfig.json"
{
  "compilerOptions": {
    "target": "ES2022",
    "moduleResolution": "node",
    "typeRoots": ["./types", "./node_modules/@types"]
  },
  "include": [
    "src/**/*",
    "types/voxengine.d.ts"
  ]
}
```

Once configured, your editor will automatically recognize VoxEngine namespaces, inspect function signatures, and validate property names as you write code.

<Warning title="Transpilation requirement">
VoxEngine executes standard JavaScript (ECMAScript 2022). If you author your scenarios locally using TypeScript or modern build tools, ensure you transpile your code to plain JavaScript before uploading it to the platform.
</Warning>

---

## See also

* [Cloud IDE](/overview/how-voximplant-works/cloud-ide)
* [VoxEngine CI](/overview/how-voximplant-works/vox-engine-ci)