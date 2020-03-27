'use strict';

// 官方脚手架使用node来直接解析这个js脚本
// 将 BABEL_ENV NODE_ENV 这两个变量直接挂载到node这个全局环境当中
// process是一个全局进程(node主进程)
// 定义全局变量
process.env.BABEL_ENV = 'development';
process.env.NODE_ENV = 'development';


// process进程提供了一个 unhandledRejection 事件还有其他事件，例如 exit
// 我们注册的uncaughtException事件会对异常做出处理，这样服务器不会受到影响得以继续运行。我们会在服务器端记录错误日志。
process.on('unhandledRejection', err => {
  throw err;
});

// Ensure environment variables are read.
require('../config/env');


const fs = require('fs');
const chalk = require('react-dev-utils/chalk');
const webpack = require('webpack');
const WebpackDevServer = require('webpack-dev-server');
const clearConsole = require('react-dev-utils/clearConsole');
const checkRequiredFiles = require('react-dev-utils/checkRequiredFiles');
const {
  choosePort,
  createCompiler,
  prepareProxy,
  prepareUrls,
} = require('react-dev-utils/WebpackDevServerUtils');
const openBrowser = require('react-dev-utils/openBrowser');
// paths 文件导出了大量的config文件下所有配置文件
const paths = require('../config/paths');
// 引入主配置文件
const configFactory = require('../config/webpack.config');
// 引入webpackdevserver配置文件
const createDevServerConfig = require('../config/webpackDevServer.config');

const useYarn = fs.existsSync(paths.yarnLockFile);
const isInteractive = process.stdout.isTTY;

// Warn and crash if required files are missing
// 如果需要的文件丢失，请警告并崩溃 checkRequiredFiles 仅仅是用来检查文件有效性
// 现在是检查index.html 和 入口js文件
if (!checkRequiredFiles([paths.appHtml, paths.appIndexJs])) {
  process.exit(1);
}

// Tools like Cloud9 rely on this.
const DEFAULT_PORT = parseInt(process.env.PORT, 10) || 3000;
const HOST = process.env.HOST || '0.0.0.0';

if (process.env.HOST) {
  console.log(
    chalk.cyan(
      `Attempting to bind to HOST environment variable: ${chalk.yellow(
        chalk.bold(process.env.HOST)
      )}`
    )
  );
  console.log(
    `If this was unintentional, check that you haven't mistakenly set it in your shell.`
  );
  console.log(
    `Learn more here: ${chalk.yellow('https://bit.ly/CRA-advanced-config')}`
  );
  console.log();
}

// We require that you explicitly set browsers and do not fall back to
// browserslist defaults.
const { checkBrowsers } = require('react-dev-utils/browsersHelper');
checkBrowsers(paths.appPath, isInteractive)
  .then(() => {
    // 我们尝试使用默认端口，但如果它很忙，我们提供用户在另一个端口上运行。
    // 选择端口（）承诺决心到下一个自由端口。
    return choosePort(HOST, DEFAULT_PORT);
  })
  .then(port => {
    if (port == null) {
      // We have not found a port.
      return;
    }

    const config = configFactory('development');
    const protocol = process.env.HTTPS === 'true' ? 'https' : 'http';
    const appName = require(paths.appPackageJson).name;
    const useTypeScript = fs.existsSync(paths.appTsConfig);
    const tscCompileOnError = process.env.TSC_COMPILE_ON_ERROR === 'true';

    //  返回具有开发服务器的本地和远程URL的对象。将此对象传递给createCompiler()
    const urls = prepareUrls(
      // 由自己决定是http或https
      protocol,
      // 域名
      HOST,
      // 端口
      port,
      paths.publicUrlOrPath.slice(0, -1)
    );
    const devSocket = {
      warnings: warnings =>
        devServer.sockWrite(devServer.sockets, 'warnings', warnings),
      errors: errors =>
        devServer.sockWrite(devServer.sockets, 'errors', errors),
    };
    // Create a webpack compiler that is configured with custom messages.
    // 创建一个webpack编译器实例  createCompiler是官方方法
    const compiler = createCompiler({
      // 将打印到终端的名称
      appName,
      // 要提供给webpack构造函数的webpack配置选项，本地webpack.config文件
      config,
      // 如果useTypeScript是，则为必需true
      devSocket,
      //
      urls,
      // 来自根目录的yarn.loack文件,如果为true，则将在终端而不是npm中发出指令
      useYarn,
      // 如果为true，则将启用TypeScript类型检查。devSocket如果将其设置为，请确保提供上面的参数true。
      useTypeScript,
      // 如果为true，则TypeScript类型检查中的错误不会阻止启动脚本运行应用程序，也不会导致构建脚本无法成功退出。还将所有TypeScript类型检查错误消息降级为警告消息。
      tscCompileOnError,
      // 对webpack构造函数的引用
      webpack,
    });
    // Load proxy config
    const proxySetting = require(paths.appPackageJson).proxy;
    const proxyConfig = prepareProxy(
      proxySetting,
      paths.appPublic,
      paths.publicUrlOrPath
    );
    // createDevServerConfig 返回的就是webpackdevserveer对应的配置内容
    const serverConfig = createDevServerConfig(
      proxyConfig,
      urls.lanUrlForConfig
    );
    // 将 webpack编译器实例和 server 配置传入到 WebpackDevServer , 生成一个完整的webpack对象
    const devServer = new WebpackDevServer(compiler, serverConfig);
    // Launch WebpackDevServer.
    // 启动webpackdev服务
    devServer.listen(port, HOST, err => {
      if (err) {
        return console.log(err);
      }
      if (isInteractive) {
        clearConsole();
      }

      // We used to support resolving modules according to `NODE_PATH`.
      // This now has been deprecated in favor of jsconfig/tsconfig.json
      // This lets you use absolute paths in imports inside large monorepos:
      if (process.env.NODE_PATH) {
        console.log(
          chalk.yellow(
            'Setting NODE_PATH to resolve modules absolutely has been deprecated in favor of setting baseUrl in jsconfig.json (or tsconfig.json if you are using TypeScript) and will be removed in a future major release of create-react-app.'
          )
        );
        console.log();
      }

      console.log(chalk.cyan('Starting the development server...\n'));
      // openBrowser 会打开一个浏览器，如 openBrowser('http://localhost:3000')
      openBrowser(urls.localUrlForBrowser);
    });

    ['SIGINT', 'SIGTERM'].forEach(function(sig) {
      process.on(sig, function() {
        devServer.close();
        process.exit();
      });
    });
  })
  .catch(err => {
    if (err && err.message) {
      console.log(err.message);
    }
    process.exit(1);
  });
