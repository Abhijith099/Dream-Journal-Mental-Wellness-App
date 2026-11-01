const { useCallback } = require('react');

const useRunOnJS = (fn, deps = []) => useCallback((...args) => fn(...args), deps);
const Worklets = {
  createRunInJsFn: (fn) => fn,
  createRunInContextFn: (fn) => fn,
  defaultContext: {},
  currentContext: {},
};

module.exports = {
  useRunOnJS,
  Worklets,
};
