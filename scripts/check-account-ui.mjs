import { build } from "esbuild";
import { createRequire } from "node:module";
import { mkdir, mkdtemp, copyFile, writeFile, rm } from "node:fs/promises";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { join } from "node:path";
const require = createRequire(import.meta.url);
const root = fileURLToPath(new URL("../", import.meta.url));
const reports = join(root, ".artifacts/account-ui");
await mkdir(reports, { recursive: true });
const output = await mkdtemp(join(reports, "run-"));
await build({
  absWorkingDir: root,
  entryPoints: ["scripts/fixtures/account-ui.tsx"],
  outfile: join(output, "renderer.js"),
  bundle: true,
  format: "iife",
  jsx: "automatic",
  conditions: ["style", "browser"],
  define: { "process.env.NODE_ENV": '"development"' },
  alias: {
    "@aifi/core": join(root, "packages/core/src/index.ts"),
    "@aifi/platform": join(root, "packages/platform/src/index.ts"),
    react: join(root, "apps/web/node_modules/react"),
    "react-dom": join(root, "apps/web/node_modules/react-dom"),
  },
  loader: { ".png": "file", ".woff2": "file", ".svg": "file" },
  logLevel: "warning",
});
await writeFile(
  join(output, "index.html"),
  '<!doctype html><html><head><meta charset="utf-8"><link rel="stylesheet" href="renderer.css"></head><body><div id="root"></div><script src="renderer.js"></script></body></html>',
);
async function checks() {
  const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  const until = async (check) => {
    for (let i = 0; i < 150; i++) {
      if (check()) return;
      await wait(20);
    }
    throw Error("Account UI check timed out: " + check.toString());
  };
  const assert = (value, message) => {
    if (!value) throw Error(message);
  };
  const trigger = () => document.querySelector(".rail-profile");
  const menu = () => document.querySelector(".workspace-menu");
  const items = () => [...menu().querySelectorAll('[role="menuitem"]')];
  const open = async () => {
    trigger().dispatchEvent(
      new PointerEvent("pointerdown", {
        bubbles: true,
        button: 0,
        ctrlKey: false,
        pointerType: "mouse",
        isPrimary: true,
      }),
    );
    await until(() => !!menu());
  };
  await until(() => trigger() && document.querySelector(".settings-content"));
  assert(
    trigger().querySelector("svg") && !trigger().textContent.trim(),
    "Anonymous avatar must be a person icon",
  );
  assert(
    !document.querySelector(".account-provider-badge"),
    "Anonymous account has a provider badge",
  );
  const rail = document.querySelector(".tool-rail").getBoundingClientRect();
  const nav = document
    .querySelector(".rail-destinations .rail-button")
    .getBoundingClientRect();
  const panel = document
    .querySelector(".workspace-panel")
    .getBoundingClientRect();
  assert(
    rail.width === 76 &&
      Math.abs(nav.left - rail.left - (panel.left - nav.right)) <= 1,
    "Rail margins are asymmetric",
  );
  assert(
    trigger().querySelector(".profile-avatar").getBoundingClientRect().width ===
      36,
    "Rail avatar is too small",
  );
  const row = document.querySelector(".setting-row").getBoundingClientRect();
  assert(row.height <= 90 && row.height >= 58, "Settings rows are not compact");
  location.hash = "/settings/chatgpt";
  await until(() => !!document.querySelector(".chatgpt-accounts"));
  assert(
    document
      .querySelector(".chatgpt-account-row")
      .textContent.includes("Sign in with ChatGPT"),
    "Empty settings have no sign-in action",
  );
  assert(
    !document.querySelector(".chatgpt-account-more"),
    "Anonymous state exposes sign-out",
  );
  await open();
  assert(
    menu().getBoundingClientRect().width <= 272,
    "Account menu is too wide",
  );
  assert(
    items().length === 3 &&
      items()[0].textContent === "Sign in with ChatGPT" &&
      items()[1].textContent.includes("Settings"),
    "Anonymous menu actions differ",
  );
  const repository = items()[2];
  assert(
    repository.tagName === "A" &&
      repository.href === "https://github.com/iFurySt/aifi" &&
      repository.target === "_blank" &&
      repository.rel.includes("noopener") &&
      repository.rel.includes("noreferrer"),
    "Repository action must be a safe external link",
  );
  repository.click();
  await until(
    () =>
      window.accountFixture.repositoryURL ===
        "https://github.com/iFurySt/aifi" && !menu(),
  );
  await open();
  items()[0].click();
  await until(
    () =>
      window.accountFixture.signIns === 1 &&
      trigger().textContent === "T" &&
      !menu(),
  );
  assert(
    location.hash === "#/settings/chatgpt",
    "Sign-in does not open ChatGPT settings",
  );
  await open();
  assert(
    menu().querySelector("strong").textContent === "Test User",
    "Verified name is missing",
  );
  const identity = menu().querySelector(".workspace-menu-identity");
  const nameRow = identity.querySelector(".workspace-menu-name");
  const badge = nameRow.querySelector(
    '[role="img"][aria-label="Signed in with ChatGPT"]',
  );
  assert(
    badge &&
      identity.querySelectorAll("small").length === 1 &&
      identity.querySelector("small").textContent === "test@example.invalid",
    "Account identity must be name/provider badge then email, without a third text line",
  );
  const nameBox = nameRow.querySelector("strong").getBoundingClientRect();
  const badgeBox = badge.getBoundingClientRect();
  assert(
    getComputedStyle(badge.firstElementChild).maskImage !== "none",
    "Provider mark mask failed to load",
  );
  assert(
    badgeBox.left >= nameBox.right &&
      Math.abs(
        badgeBox.top + badgeBox.height / 2 - nameBox.top - nameBox.height / 2,
      ) < 2,
    "Provider badge is not centered next to the name",
  );
  assert(
    items().length === 4 && items()[1].textContent === "Usage",
    "Connected menu actions differ",
  );
  assert(!menu().textContent.includes("%"), "Usage quota was invented");
  items()[1].click();
  await until(
    () =>
      !menu() &&
      (location.hash === "#/usage" || window.accountFixture.usageOpens === 1),
  );
  await open();
  items()[0].click();
  await until(() => location.hash === "#/settings/chatgpt" && !menu());
  const fixture = window.accountFixture;
  const account = (id) => document.querySelector(`[data-account-id="${id}"]`);
  const clickText = async (root, text) => {
    await until(() =>
      [...root.querySelectorAll("button")].some(
        (b) => b.textContent.trim() === text && !b.disabled,
      ),
    );
    const button = [...root.querySelectorAll("button")].find(
      (b) => b.textContent.trim() === text,
    );
    assert(button && !button.disabled, `Missing enabled action: ${text}`);
    button.click();
  };
  await until(
    () => !!account("test")?.querySelector(".chatgpt-account-active"),
  );
  const settings = document.querySelector(".chatgpt-accounts");
  assert(
    !settings.textContent.includes("Model") &&
      !settings.textContent.includes("Connections") &&
      !settings.textContent.includes("Connected"),
    "Account settings still contain redundant controls",
  );
  await clickText(settings, "ChatGPT usage");
  await until(() => fixture.usageOpens > 0);
  await clickText(settings, "Add account");
  await until(
    () => !!account("second")?.querySelector(".chatgpt-account-active"),
  );
  assert(
    fixture.calls.some(
      (c) => c.method === "signIn" && c.params?.newProfile === true,
    ),
    "Add account did not request a distinct profile",
  );
  await clickText(account("test"), "Use account");
  await until(
    () => !!account("test")?.querySelector(".chatgpt-account-active"),
  );
  await until(() =>
    fixture.calls.some(
      (c) => c.method === "models" && c.params?.profileId === "test",
    ),
  );
  assert(
    fixture.activeProfileId === "test",
    "Selected account was not applied",
  );
  const signOut = async (id) => {
    account(id)
      .querySelector(".chatgpt-account-more")
      .dispatchEvent(
        new PointerEvent("pointerdown", {
          bubbles: true,
          button: 0,
          pointerType: "mouse",
          isPrimary: true,
        }),
      );
    await until(() => !!document.querySelector('[role="menuitem"]'));
    const item = [...document.querySelectorAll('[role="menuitem"]')].find(
      (i) => i.textContent.trim() === "Sign out",
    );
    assert(item, "Sign out is missing");
    item.click();
    await until(() => account(id)?.textContent.includes("Sign in"));
    assert(
      fixture.calls.some(
        (c) => c.method === "signOut" && c.params?.profileId === id,
      ),
      "Sign out used the wrong account",
    );
  };
  await signOut("second");
  assert(
    fixture.activeProfileId === "test" &&
      account("test").textContent.includes("Active"),
    "Signing out an inactive account changed the active account",
  );
  await clickText(account("second"), "Sign in");
  await until(
    () => !!account("second")?.querySelector(".chatgpt-account-active"),
  );
  // Refresh the synthetic status through the existing public refresh action.
  fixture.profiles.find((p) => p.id === "second").sharing = false;
  await clickText(settings, "ChatGPT usage");
  await until(() => account("second")?.textContent.includes("Reconnect"));
  await clickText(account("second"), "Reconnect");
  await until(
    () => !!account("second")?.querySelector(".chatgpt-account-active"),
  );
  await signOut("second");
  assert(
    trigger().querySelector("svg"),
    "Active sign-out must restore the anonymous avatar",
  );
  fixture.failSignIn = true;
  await clickText(account("second"), "Sign in");
  await until(() => !!settings.querySelector('[role="alert"]'));
  assert(
    settings
      .querySelector('[role="alert"]')
      .textContent.includes("Synthetic sign-in failed"),
    "Login error was hidden",
  );
  fixture.failSignIn = false;
  fixture.holdSignIn = true;
  await clickText(account("second"), "Sign in");
  await until(
    () => !!fixture.pending && settings.textContent.includes("Cancel sign-in"),
  );
  assert(
    [...settings.querySelectorAll(".chatgpt-account-row button")].every(
      (b) => b.disabled,
    ),
    "Pending sign-in allows duplicate account actions",
  );
  await clickText(settings, "Cancel sign-in");
  await until(
    () => !fixture.pending && !settings.textContent.includes("Cancel sign-in"),
  );
  assert(
    fixture.calls.some((c) => c.method === "cancelSignIn"),
    "Cancel did not reach the existing auth action",
  );
  fixture.holdSignIn = false;
  await clickText(account("second"), "Sign in");
  await until(
    () => !!account("second")?.querySelector(".chatgpt-account-active"),
  );
  location.hash = "/agents";
  await until(() => !document.querySelector(".settings-content"));
  await open();
  menu().dispatchEvent(
    new KeyboardEvent("keydown", { key: ",", metaKey: true, bubbles: true }),
  );
  await until(() => !!document.querySelector(".settings-content"));
  assert(!menu(), "Settings shortcut did not dismiss the account menu");
  assert(
    location.hash === "#/settings" &&
      document.querySelector(".settings-content > h1").textContent ===
        "Appearance",
    "Command+, did not open Settings",
  );
  location.hash = "/agents";
  await until(() => !document.querySelector(".settings-content"));
  window.dispatchEvent(
    new KeyboardEvent("keydown", { key: ",", ctrlKey: true, bubbles: true }),
  );
  await until(() => !!document.querySelector(".settings-content"));
  location.hash = "/settings/chatgpt";
  await until(() => !!document.querySelector(".chatgpt-accounts"));
  return {
    repositoryLink: true,
    anonymousPersonIcon: true,
    reusesSignIn: true,
    connectedIdentity: true,
    usageAction: true,
    accountManagement: true,
    explicitProfileActions: true,
    reconnectAndCancellation: true,
    signInErrors: true,
    noModelsInSettings: true,
    commandAndControlComma: true,
    balancedRail: true,
    compactMenuAndSettings: true,
  };
}
const main = `const {app,BrowserWindow}=require('electron');const fs=require('node:fs');const path=require('node:path');
app.setPath('userData',path.join(__dirname,'profile'));app.whenReady().then(async()=>{const win=new BrowserWindow({show:false,width:1360,height:1000,webPreferences:{sandbox:true,contextIsolation:true,backgroundThrottling:false}});win.webContents.on('console-message',(event)=>{if(event.level==='error')console.error(event.message)});win.webContents.setWindowOpenHandler(({url})=>{void win.webContents.executeJavaScript('window.accountFixture.repositoryURL='+JSON.stringify(url));return {action:'deny'}});try{await win.loadFile(path.join(__dirname,'index.html'));const report=await win.webContents.executeJavaScript('('+${JSON.stringify(checks.toString())}+')()');fs.writeFileSync(path.join(__dirname,'report.json'),JSON.stringify(report,null,2));await new Promise(r=>setTimeout(r,100));fs.writeFileSync(path.join(__dirname,'settings.png'),(await win.webContents.capturePage()).toPNG());await win.webContents.executeJavaScript("document.documentElement.dataset.theme='dark'");fs.writeFileSync(path.join(__dirname,'dark.png'),(await win.webContents.capturePage()).toPNG());win.setSize(390,850);await new Promise(r=>setTimeout(r,150));const overflow=await win.webContents.executeJavaScript('document.documentElement.scrollWidth > innerWidth');if(overflow)throw Error('Narrow account settings overflow');fs.writeFileSync(path.join(__dirname,'narrow.png'),(await win.webContents.capturePage()).toPNG());console.log(JSON.stringify(report));app.exit(0)}catch(error){console.error(error);app.exit(1)}});setTimeout(()=>{console.error('Account UI check timed out');app.exit(1)},25000);`;
await writeFile(join(output, "main.cjs"), main);
const env = { ...process.env };
delete env.ELECTRON_RUN_AS_NODE;
const child = spawn(
  require("electron"),
  [join(output, "main.cjs"), "--no-sandbox"],
  { cwd: root, stdio: "inherit", env },
);
const timeout = setTimeout(() => child.kill("SIGKILL"), 30000);
const exit = await new Promise((resolve) =>
  child.once("exit", (code) => resolve(code ?? 1)),
);
clearTimeout(timeout);
await rm(join(output, "profile"), { recursive: true, force: true });
if (exit === 0) {
  await copyFile(join(output, "report.json"), join(reports, "report.json"));
  for (const name of ["settings", "dark", "narrow"])
    await copyFile(join(output, `${name}.png`), join(reports, `${name}.png`));
  await rm(output, { recursive: true, force: true });
}
process.exitCode = exit;
