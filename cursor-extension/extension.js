const vscode = require('vscode');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const PATCH_ID = 'persian-rtl-patcher';
const PATCH_RE = new RegExp(
  `<!-- ${PATCH_ID}:[^>]+ -->[\\s\\S]*?<!-- /${PATCH_ID} -->\\n*`,
  'g'
);

/** @returns {[string, string] | null} */
function locateWorkbench() {
  const appDir = require.main
    ? path.dirname(require.main.filename)
    : globalThis._VSCODE_FILE_ROOT;

  if (!appDir) return null;

  const basePath = path.join(appDir, 'vs', 'code');
  const workbenchDirs = [
    path.join(basePath, 'electron-browser', 'workbench'),
    path.join(basePath, 'electron-browser'),
    path.join(basePath, 'electron-sandbox', 'workbench'),
    path.join(basePath, 'electron-sandbox'),
  ];

  const htmlNames = [
    'workbench-dev.html',
    'workbench.esm.html',
    'workbench.html',
    'workbench-apc-extension.html',
  ];

  for (const dir of workbenchDirs) {
    for (const name of htmlNames) {
      const htmlPath = path.join(dir, name);
      if (fs.existsSync(htmlPath)) return [dir, htmlPath];
    }
  }

  return null;
}

function backupPath(workbenchDir, sessionId) {
  return path.join(workbenchDir, `workbench.${sessionId}.bak-persian-rtl`);
}

function readPatchSession(html) {
  const m = html.match(new RegExp(`<!-- ${PATCH_ID}:([^ ]+) -->`));
  return m ? m[1] : null;
}

function clearPatches(html) {
  return html.replace(PATCH_RE, '');
}

async function readMedia(extensionPath, filename) {
  return fs.promises.readFile(path.join(extensionPath, 'media', filename), 'utf-8');
}

async function buildPatchBlock(extensionPath, sessionId) {
  const css = await readMedia(extensionPath, 'styles.css');
  const js = await readMedia(extensionPath, 'inject.js');

  return (
    `<!-- ${PATCH_ID}:${sessionId} -->\n` +
    `<style id="${PATCH_ID}-style">\n${css}\n</style>\n` +
    `<script id="${PATCH_ID}-script">\n${js}\n</script>\n` +
    `<!-- /${PATCH_ID} -->\n`
  );
}

function stripCspMeta(html) {
  return html.replace(/<meta\s+http-equiv="Content-Security-Policy"[\s\S]*?\/>/i, '');
}

function promptReload(message, actionLabel) {
  vscode.window.showInformationMessage(message, actionLabel).then((btn) => {
    if (btn === actionLabel) {
      vscode.commands.executeCommand('workbench.action.reloadWindow');
    }
  });
}

function activate(context) {
  const loc = locateWorkbench();
  if (!loc) {
    vscode.window.showWarningMessage(
      'Persian RTL: Could not locate the Cursor workbench installation.'
    );
    return;
  }

  const [workbenchDir, htmlPath] = loc;
  const extensionPath = context.extensionPath;

  async function getHtml() {
    return fs.promises.readFile(htmlPath, 'utf-8');
  }

  async function writeHtml(html) {
    await fs.promises.writeFile(htmlPath, html, 'utf-8');
  }

  async function createBackup(sessionId) {
    const html = clearPatches(await getHtml());
    await fs.promises.writeFile(backupPath(workbenchDir, sessionId), html, 'utf-8');
  }

  async function deleteBackups() {
    const items = await fs.promises.readdir(workbenchDir);
    await Promise.all(
      items
        .filter((name) => name.endsWith('.bak-persian-rtl'))
        .map((name) => fs.promises.unlink(path.join(workbenchDir, name)))
    );
  }

  async function install() {
    const sessionId = crypto.randomUUID();
    const patch = await buildPatchBlock(extensionPath, sessionId);

    try {
      await createBackup(sessionId);
      let html = clearPatches(await getHtml());
      html = stripCspMeta(html);
      html = html.replace(/(<\/head>)/i, `${patch}$1`);
      await writeHtml(html);
      promptReload(
        'Persian RTL enabled. Reload the window to apply changes.',
        'Reload'
      );
    } catch (err) {
      vscode.window.showErrorMessage(
        `Persian RTL: Installation failed. Ensure Cursor has write access.\n${err.message}`
      );
    }
  }

  async function uninstall(silent) {
    const html = await getHtml();
    const sessionId = readPatchSession(html);
    if (!sessionId) {
      if (!silent) {
        vscode.window.showInformationMessage('Persian RTL is not enabled.');
      }
      return false;
    }

    const backup = backupPath(workbenchDir, sessionId);
    try {
      if (fs.existsSync(backup)) {
        await fs.promises.copyFile(backup, htmlPath);
      } else {
        await writeHtml(clearPatches(html));
      }
      await deleteBackups();
      if (!silent) {
        promptReload('Persian RTL disabled. Reload the window.', 'Reload');
      }
      return true;
    } catch (err) {
      vscode.window.showErrorMessage(`Persian RTL: Uninstall failed.\n${err.message}`);
      return false;
    }
  }

  async function reinstall() {
    await uninstall(true);
    await install();
  }

  async function checkStatus() {
    const html = await getHtml();
    if (!readPatchSession(html)) {
      const enable = 'Enable';
      const later = 'Later';
      vscode.window
        .showInformationMessage(
          'Persian RTL is not active. Enable RTL support for the AI panel?',
          enable,
          later
        )
        .then((btn) => {
          if (btn === enable) install();
        });
    }
  }

  context.subscriptions.push(
    vscode.commands.registerCommand('faRtl.enable', install),
    vscode.commands.registerCommand('faRtl.disable', uninstall),
    vscode.commands.registerCommand('faRtl.reinstall', reinstall)
  );

  checkStatus().catch(() => {});
}

function deactivate() {}

module.exports = { activate, deactivate };
