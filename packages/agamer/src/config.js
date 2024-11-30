const path = require('path');
const fs = require('fs');
const { program } = require('commander');
const { error } = require('./log');

function getOptions() {
  setupCommandLine();

  let userConfigPath = program.opts().config;
  if (userConfigPath && !userConfigPath.endsWith('.json')) {
    userConfigPath = path.join('config', `${userConfigPath}.json`);
  }

  const defaultConfig = loadConfig('config/default.json');
  const userConfig = userConfigPath ? loadConfig(userConfigPath) : {};

  const options = {
    ...defaultConfig,
    ...userConfig,
    ...Object.fromEntries(
      Object.entries(program.opts())
        .filter(([_, value]) => value !== undefined)
        .map(([key, value]) => [
          key.replace(/-./g, x => x[1].toUpperCase()),
          value
        ])
    )
  };

  validateOptions(options);
  return options;
}

function setupCommandLine() {
  program
    .name('agamer')
    .description('Auto gamer with configurable click intervals and positions')
    .option('-c, --config <path>', '使用指定的配置文件')
    .option('-di, --d-min <number>', '最小点击间隔 (ms)', parseInt)
    .option('-da, --d-max <number>', '最大点击间隔 (ms)', parseInt)
    .option('-xi, --x-min <number>', '最小 X 坐标', parseInt)
    .option('-xa, --x-max <number>', '最大 X 坐标', parseInt)
    .option('-yi, --y-min <number>', '最小 Y 坐标', parseInt)
    .option('-ya, --y-max <number>', '最大 Y 坐标', parseInt)
    .option('-pi, --pause-interval-min <number>', '最小暂停间隔 (ms)', parseInt)
    .option('-pa, --pause-interval-max <number>', '最大暂停间隔 (ms)', parseInt)
    .option('-pdi, --pause-duration-min <number>', '最小暂停时长 (ms)', parseInt)
    .option('-pda, --pause-duration-max <number>', '最大暂停时长 (ms)', parseInt);

  program.parse();
}

function validateOptions(options) {
  const pairs = [
    ['xMin', 'xMax', 'X 坐标范围'],
    ['yMin', 'yMax', 'Y 坐标范围'],
    ['pauseDurationMin', 'pauseDurationMax', '暂停时长']
  ];

  for (const [min, max, name] of pairs) {
    if (options[min] > options[max]) {
      error(`${name}配置错误：最小值 (${options[min]}) 必须小于或等于最大值 (${options[max]}) `);
      process.exit(1);
    }
  }

  if (options.dMax !== 0 && options.dMin > options.dMax) {
    error(`点击间隔配置错误：最小值 (${options.dMin}) 必须小于或等于最大值 (${options.dMax}) `);
    process.exit(1);
  }

  if (options.pauseIntervalMax !== 0 && options.pauseIntervalMin > options.pauseIntervalMax) {
    error(`暂停间隔配置错误：最小值 (${options.pauseIntervalMin}) 必须小于或等于最大值 (${options.pauseIntervalMax}) `);
    process.exit(1);
  }
}

function loadConfig(configPath) {
  try {
    const rootDir = path.resolve(__dirname, '..');
    const fullPath = path.resolve(rootDir, configPath);
    
    if (!fs.existsSync(fullPath)) {
      error(`配置文件不存在: ${fullPath}`);
      process.exit(1);
    }
    return JSON.parse(fs.readFileSync(fullPath, 'utf8'));
  } catch (err) {
    error(`读取配置文件失败: ${err.message}`);
    process.exit(1);
  }
}

module.exports = {
  getOptions
};
