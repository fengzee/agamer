const random = require('random');

const randomFunctionCache = {};

function generateRandomValue(min, max) {
  const randomFunction = obtainRandomFunction(min, max);
  let value;
  do {
    value = randomFunction();
  } while (value < min || value > max);
  return Math.round(value);
}

function obtainRandomFunction(min, max) {
  const cacheKey = `${min}-${max}`;
  if (randomFunctionCache[cacheKey]) {
    return randomFunctionCache[cacheKey];
  }

  const range = max - min;
  const sigma = range / 6;

  const randomFunction = random.normal(min + range / 2, sigma);
  randomFunctionCache[cacheKey] = randomFunction;

  return randomFunction;
}

module.exports = {
  generateRandomValue
};
