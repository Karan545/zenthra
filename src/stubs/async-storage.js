const memory = new Map();

const storage = {
  getItem: async (key) => (memory.has(key) ? memory.get(key) : null),
  setItem: async (key, value) => {
    memory.set(key, String(value));
  },
  removeItem: async (key) => {
    memory.delete(key);
  },
};

module.exports = storage;
module.exports.default = storage;
