const randomFunctionCache = {};

// 使用 Box-Muller 变换生成正态分布随机数
function normalRandom(mean, stdDev) {
  let u1, u2;
  do {
    u1 = Math.random();
    u2 = Math.random();
  } while (u1 === 0);
  
  const z0 = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
  return z0 * stdDev + mean;
}

export function generateRandomValue(min, max) {
  if (max === 0) {
    return 0;
  }
  
  if (min === max) {
    return min;
  }

  const range = max - min;
  const mean = min + range / 2;
  const stdDev = range / 6;
  
  let value;
  do {
    value = normalRandom(mean, stdDev);
  } while (value < min || value > max);
  
  return Math.round(value);
}
