// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
const {
  commands,
  ExtensionContext,
  window,
  workspace,
  Uri,
  ViewColumn
} = require('vscode')
const { SerialPort, ReadlineParser } = require('serialport')
const path = require('path')
const { readFile } = require('fs/promises')
const pkg = require('./package.json')

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed

/**
 * @param {ExtensionContext} context
 */
function activate (context) {
  // Use the console to output diagnostic information (console.log) and errors (console.error)
  // This line of code will only be executed once when your extension is activated
  const panels = {}

  // The command has been defined in the package.json file
  // Now provide the implementation of the command with  registerCommand
  // The commandId parameter must match the command field in package.json
  const runScript = commands.registerCommand(
    'beanio-serialchart.run-script',
    async () => {
      // The code you place here will be executed every time your command is executed
      // Display a message box to the user
      // window.showInformationMessage('Hello World from beanio-serialchart!')
      // console.log(window.activeTextEditor.document.getText())

      const ports = await SerialPort.list()

      const portSelected = await window.showQuickPick(ports.map(v => v.path))
      if (!portSelected) return

      if (panels[portSelected]) {
        panels[portSelected].reveal()
        return
      }

      const configuration = workspace.getConfiguration()
      const baudrate = configuration.get('beanio.serialchart.baudrate')
      const loglines = configuration.get('beanio.serialchart.loglines')
      const chartpoints = configuration.get('beanio.serialchart.chartpoints')

      const distpath = path.join(context.extensionPath, 'views/dist/assets')
      const panel = await window.createWebviewPanel(
        portSelected,
        portSelected,
        ViewColumn.One,
        {
          retainContextWhenHidden: true,
          enableScripts: true,
          localResourceRoots: [
            Uri.file(distpath),
            Uri.file(path.join(distpath, '..'))
          ]
        }
      )

      const baseUri = panel.webview.asWebviewUri(Uri.file(distpath))
      const filepath = path.join(context.extensionPath, 'views/dist/index.html')
      const filecontext = await readFile(filepath).then(v => v.toString())
      panel.webview.html = filecontext
        .replace('href="./assets', `href="${baseUri}`)
        .replace('src="./assets', `src="${baseUri}`)

      const reader = new ReadlineParser()
      reader.on('data', line => {
        panel.webview.postMessage({ action: 'recv', data: line })
      })

      const script = window.activeTextEditor.document.getText()
      panel.webview.postMessage({
        action: 'config',
        data: { loglines, chartpoints, version: pkg.version }
      })
      panel.webview.postMessage({ action: 'eval', data: script })

      const serial = new SerialPort({
        path: portSelected,
        baudRate: baudrate,
        autoOpen: false
      })
      serial.on('error', e => {
        window.showErrorMessage(e.message)
      })

      serial.pipe(reader)

      panels[portSelected] = panel
      serial.open(async e => {
        if (!e) return
        await panel.dispose()
        await window.showErrorMessage(e.message)
      })

      // const tmr = setInterval(() => {
      //   panel.webview.postMessage({
      //     action: 'recv',
      //     data: Math.random() * 1000
      //   })
      // }, 2000)

      panel.onDidDispose(() => {
        delete panels[portSelected]
        reader.destroy()
        serial.close()
        // clearInterval(tmr)
      })
    }
  )

  const newScript = commands.registerCommand(
    'beanio-serialchart.new-script',
    async () => {
      const doc = await workspace.openTextDocument({
        language: 'javascript',
        content: template
      })

      window.showTextDocument(doc)
    }
  )

  context.subscriptions.push(runScript)
  context.subscriptions.push(newScript)
}

// This method is called when your extension is deactivated
function deactivate () {}

const template = `
// BeanIO SerialChart Script
const runtime = window.$runtime
// log output
// runtime.info('info message')
// runtime.warn('warn message')
// runtime.error('error message')

runtime.series = ['raw']

runtime.ondata = async function (line) {
  logger.info(line)
  const raw = parseInt(line)
  return [
    raw // orgin line
  ]
}

runtime.onstart = async function () {}

runtime.onstop = async function () {}
`

module.exports = {
  activate,
  deactivate
}
