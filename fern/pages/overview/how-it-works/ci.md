# VoxEngine CI

Manage Voximplant applications, routing rules, and cloud scenarios from your local development environment and integrate automated deployments into your existing CI/CD pipelines using the [@voximplant/apiclient-nodejs]() library under the hood.

With VoxEngine CI, you can author scenario code in your preferred local IDE using built-in TypeScript declarations, version-control your routing logic, and deploy updates automatically across development and production environments.

## Contents

- [Create a service account](#create-a-service-account)
- [Configure VoxEngine CI](#configure-voxengine-ci)
- [Built-in type declarations](#built-in-type-declarations)
- [Project structure and file conventions](#project-structure-and-file-conventions)
  - [Applications](#applications)
  - [Routing rules and scenarios](#routing-rules-and-scenarios)
- [Deploying and modifying scenarios](#deploying-and-modifying-scenarios)
- [CLI command reference](#cli-command-reference)
- [CI/CD pipeline templates](#cicd-pipeline-templates)
  - [GitLab CI/CD](#gitlab-cicd)
  - [GitHub Actions](#github-actions)
  - [Jenkins](#jenkins)
- [Related tools](#related-tools)

---

## Create a service account

To authenticate VoxEngine CI with your Voximplant account, you need a service account credentials JSON file:

1. Log in to the [Control Panel]().
2. Navigate to **Settings** → **Service accounts**.
3. Create a service account with the `Applications` and `Scenarios` roles and generate an RSA key pair.
4. Download the generated credentials JSON file.

If you already have a service account key file, you can reuse it. Learn more in [API keys and Service accounts]().

---

## Configure VoxEngine CI

### 1. Install the CLI

Install the `voxengine-ci` package in your local project:

```bash title="Install VoxEngine CI"
npm install @voximplant/voxengine-ci --save-dev
```

### 2. Configure environment variables

Create a `.env` file in your project root to specify the path to your credentials file and target source directory:

```bash title=".env"
VOX_CI_CREDENTIALS=/path/to/vox_ci_credentials.json
VOX_CI_ROOT_PATH=/path/to/voxfiles
```

<Info title="Default paths">
If you place your credentials file in the project root with the default filename `vox_ci_credentials.json`, creating a `.env` file is optional. By default, VoxEngine CI outputs source files into a directory named `voxfiles/`.
</Info>

### 3. Initialize your project

Download existing applications, routing rules, and scenarios from your Voximplant account:

```bash title="Initialize project"
npx voxengine-ci init
```

This command synchronizes your local workspace with the cloud, creating the local folder structure and downloading your cloud scenarios.

---

## Built-in type declarations

The `voxengine-ci` package includes pinned, versioned TypeScript declarations in `node_modules/@voximplant/voxengine-ci/typings`. Using these built-in declarations ensures that your autocomplete, inline documentation, and static type checks remain consistent with your installed package version.

To enable type checking, add or update `tsconfig.json` in your project root:

```json title="tsconfig.json"
{
  "compilerOptions": {
    "lib": ["ES2020"]
  },
  "include": [
    "voxfiles/scenarios/src",
    "node_modules/@voximplant/voxengine-ci/typings"
  ]
}
```

---

## Project structure and file conventions

<Warning title="Resource consistency">
When using VoxEngine CI, we recommend creating new resources through the CLI, but performing renames or deletions directly in the Control Panel. If you rename or delete an application, rule, or scenario in the Control Panel, run `npx voxengine-ci init --force` locally to synchronize your local workspace with the cloud.
</Warning>

### Applications

Application definitions reside in `voxfiles/applications/<application_name>.<account_name>.voximplant.com/`.

Each application folder contains an `application.config.json` file:

```json title="application.config.json"
{
  "applicationName": "your-application-name.your-account-name.voximplant.com"
}
```

### Routing rules and scenarios

In the same application folder, configure routing rules in `rules.config.json`:

```json title="rules.config.json"
[
  {
    "ruleName": "first-rule",
    "scenarios": [
      "first-scenario"
    ],
    "rulePattern": ".*"
  },
  {
    "ruleName": "second-rule",
    "scenarios": [
      "second-scenario"
    ],
    "rulePattern": ".*"
  }
]
```

* **`ruleName`**: The name of the [routing rule]().
* **`scenarios`**: An array of scenario names assigned to this rule. The order in this array defines execution order in the shared global JavaScript scope.
* **`rulePattern`**: Regular expression matched against incoming call destinations (`.*` matches all calls).

Scenarios live in `voxfiles/scenarios/src/`. File names must match the `*.voxengine.{js,ts}` pattern (for example, `first-scenario.voxengine.js` or `second-scenario.voxengine.ts`).

<Info title="TypeScript scenario compilation">
VoxEngine CI supports both JavaScript and TypeScript scenarios. During build, `.ts` files are validated by the TypeScript compiler and compiled to standard `.js` files in the `dist/` directory before being uploaded to Voximplant.
</Info>

---

## Deploying and modifying scenarios

To upload an application along with its rules and scenarios to the platform:

```bash title="Upload application"
npx voxengine-ci upload --application-name your-application-name
```

To deploy only the scenarios associated with a specific rule:

```bash title="Upload specific rule"
npx voxengine-ci upload --application-name your-application-name --rule-name your-rule-name
```

You can also target resources by ID instead of name:

```bash title="Upload by ID"
npx voxengine-ci upload --application-id 123456 --rule-id 7890
```

Use the `--dry-run` flag to validate syntax and compile your scenarios locally without deploying changes to the platform:

```bash title="Dry run compilation"
npx voxengine-ci upload --application-name your-application-name --dry-run
```

---

## CLI command reference

| Command | Description |
| :--- | :--- |
| `npx voxengine-ci init` | Download all account metadata and scenarios into `voxfiles/`. |
| `npx voxengine-ci init --force` | Re-initialize the project from scratch, overwriting local files with cloud state. |
| `npx voxengine-ci upload --application-name <name>` | Build and upload all scenarios attached to the application. |
| `npx voxengine-ci upload --application-name <name> --rule-name <rule>` | Build and upload only scenarios attached to the specified rule. |
| `npx voxengine-ci upload --application-name <name> --dry-run` | Compile and validate scenarios locally without uploading. |
| `npx voxengine-ci upload --application-name <name> --force` | Overwrite cloud scenarios even if remote changes occurred in the Control Panel. |

---

## CI/CD pipeline templates

Automate deployments across your environments using ready-to-use CI/CD configurations.

### GitLab CI/CD

Include the official VoxEngine CI template in your `.gitlab-ci.yml` pipeline:

```yaml title=".gitlab-ci.yml"
include:
  - remote: "https://github.com/voximplant/voxengine-ci/ci-cd-templates/.gitlab.yml"

deploy-voxengine:
  extends:
    - .voxengine-ci
  variables:
    VOX_CI_CREDENTIALS: $SECRET_FILE_PATH
    VOX_CI_CREDENTIALS_CONTENT: $SECRET_FILE_CONTENT
  rules:
    - if: '$CI_COMMIT_BRANCH == "main"'
  script:
    - npx voxengine-ci upload --application-name my_first_application
```

Configure `VOX_CI_CREDENTIALS_CONTENT` in your GitLab repository under **Settings** → **CI/CD** → **Variables**.

### GitHub Actions

Create a workflow file in your repository at `.github/workflows/deploy.yml`:

```yaml title=".github/workflows/deploy.yml"
name: Deploy VoxEngine Scenarios

on:
  push:
    branches: [main]
  workflow_dispatch:

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: "20"

      - name: Install dependencies
        run: npm ci

      - name: Prepare credentials
        run: echo "${{ secrets.VOX_CI_CREDENTIALS_CONTENT }}" > vox_ci_credentials.json

      - name: Deploy application scenarios
        run: npx voxengine-ci upload --application-name my_first_application
```

Define `VOX_CI_CREDENTIALS_CONTENT` under **Settings** → **Secrets and variables** → **Actions** in your GitHub repository.

### Jenkins

#### Pipeline script (Jenkinsfile)

Add a `Jenkinsfile` to your project repository:

```groovy title="Jenkinsfile"
pipeline {
    agent any
    tools { nodejs "nodejsinstallation" }
    stages {
        stage('Install') {
            steps {
                sh "npm ci"
            }
        }
        stage('Deploy') {
            steps {
                sh "npx voxengine-ci upload --application-name my_first_application"
            }
        }
    }
}
```

#### Freestyle project configuration

1. In Jenkins, create a new item and select **Freestyle project**.
2. Under **Source Code Management**, select **Git** and configure your repository URL and SSH credentials.
3. In **Build Environment**, check **Use secret text(s) or file(s)**, map the `VOX_CI_CREDENTIALS` variable to your uploaded `vox_ci_credentials.json` secret file, and enable NodeJS in PATH.
4. In the **Build** step, select **Execute shell** and add:

```bash title="Build step execution"
npm ci
npx voxengine-ci upload --application-name my_first_application
```

---

## Related tools

* [Node.js]()
* [TypeScript]()
* [@voximplant/apiclient-nodejs]()