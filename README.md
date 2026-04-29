# alpakka

alpakka is an application designed to track what items you have and haven't packed for a trip or event.

## 🧳 Data Storage and Warning

**Crucially, all data is stored locally within your browser.**
If you forget to manually export your data and then clear your browser's cache, your data will be permanently lost. Always use the export feature to back up your packing list!

[Visit the live demo](https://adamratson.github.io/alpakka/)

## ✨ Features

* **Local Data Tracking:** Keeps a detailed list of packed vs. unpacked items.
* **Synchronization (Yjs):** Built to handle collaborative data tracking (see `src/collab` files).
* **Data Export:** Allows users to back up their local data.

## ⚙️ Installation and Setup

To get started, clone the repository and install the dependencies:

```bash
git clone https://github.com/your-repo/alpakka.git
cd alpakka
npm install
```

### 🚀 Running the Application

Use the following scripts based on your needs:

| Command | Description | Usage |
| :--- | :--- | :--- |
| `npm run dev` | Starts the development server. Ideal for local development and testing features. | `npm run dev` |
| `npm run build` | Builds the production-ready static files. | `npm run build` |
| `npm run preview` | Serves the production build locally for final testing. | `npm run preview` |

## 🧪 Running Tests

The project includes various levels of testing: unit, UI, and end-to-end (E2E).

| Test Type | Command | Description |
| :--- | :--- | :--- |
| **Unit Tests** | `npm run test` | Runs standard Vitest unit tests (`src/utils/export.ts`, etc.). |
| **Unit Tests (Watch)** | `npm run test:watch` | Runs Vitest in watch mode, automatically re-running tests on file changes. |
| **Unit Tests (UI)** | `npm run test:ui` | Runs Vitest in UI mode, providing a visual interface for test inspection. |
| **E2E Tests** | `npm run test:e2e` | Runs Playwright end-to-end tests against the running application. |
| **E2E Tests (UI)** | `npm run test:e2e:ui` | Runs Playwright E2E tests in UI mode. |

## 🎨 Development Dependencies

* **Frontend:** React, Vite, TypeScript
* **State/Collaboration:** Yjs, lz-string
* **Testing:** Vitest, Playwright
* **Linting:** ESLint

## 📚 Project Structure Overview

* `src/components/`: Contains reusable UI components (e.g., `Sidebar.tsx`, `AddItemForm.tsx`).
* `src/collab/`: Logic related to collaborative features using Yjs (e.g., `sync.ts`, `signaling.ts`).
* `src/utils/`: Utility functions (e.g., `export.ts`).
* `e2e/`: End-to-end test specifications (Playwright).
* `public/`: Static assets like icons and favicons.
