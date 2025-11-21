(function () {
  // Shared multi-commodity market engine.
  // - Tracks prices and short histories for corn, flour, oil, biofuel, and ingots.
  // - Updates once per minute using a time-of-day-biased random walk for corn,
  //   then derives the other commodities from the current corn price.

  var MARKET_STORAGE_KEY = 'miiboard_market_v1';
  var MARKET_HISTORY_LENGTH = 60; // keep roughly the last 60 minutes of prices

  var marketLoopId = null;
  var marketInitialized = false;

  function createDefaultMarket() {
    return {
      corn: { price: 0.25, history: [] },
      flour: { price: 0, history: [] },
      oil: { price: 0, history: [] },
      biofuel: { price: 0, history: [] },
      ingot: { price: 0, history: [] }
    };
  }

  var market = window.market || createDefaultMarket();
  window.market = market;

  function clamp(value, min, max) {
    if (value < min) return min;
    if (value > max) return max;
    return value;
  }

  function randomInRange(min, max) {
    return min + Math.random() * (max - min);
  }

  function loadMarketState() {
    try {
      if (!window.localStorage) return false;
      var raw = window.localStorage.getItem(MARKET_STORAGE_KEY);
      if (!raw) return false;
      var parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== 'object') return false;

      var commodities = ['corn', 'flour', 'oil', 'biofuel', 'ingot'];
      for (var i = 0; i < commodities.length; i++) {
        var key = commodities[i];
        var src = parsed[key];
        if (!src || typeof src.price !== 'number') continue;
        var target = market[key] || { price: 0, history: [] };
        target.price = src.price;
        if (Array.isArray(src.history)) {
          target.history = src.history.slice(-MARKET_HISTORY_LENGTH).filter(function (n) {
            return typeof n === 'number' && isFinite(n);
          });
        } else {
          target.history = [];
        }
        market[key] = target;
      }
      return true;
    } catch (e) {
      return false;
    }
  }

  function saveMarketState() {
    try {
      if (!window.localStorage) return;
      var compact = {};
      var commodities = ['corn', 'flour', 'oil', 'biofuel', 'ingot'];
      for (var i = 0; i < commodities.length; i++) {
        var key = commodities[i];
        var src = market[key];
        if (!src) continue;
        compact[key] = {
          price: typeof src.price === 'number' && isFinite(src.price) ? src.price : 0,
          history: Array.isArray(src.history)
            ? src.history.slice(-MARKET_HISTORY_LENGTH).filter(function (n) {
                return typeof n === 'number' && isFinite(n);
              })
            : []
        };
      }
      window.localStorage.setItem(MARKET_STORAGE_KEY, JSON.stringify(compact));
    } catch (e) {
    }
  }

  function seedInitialMarket() {
    // Start corn near its typical center and derive the rest once.
    var base = randomInRange(0.18, 0.32);
    base = Math.round(base * 100) / 100;
    market.corn.price = base;
    market.corn.history = [base];
    updateDerivedFromCorn();
  }

  function ensureHistoryArrays() {
    var commodities = ['corn', 'flour', 'oil', 'biofuel', 'ingot'];
    for (var i = 0; i < commodities.length; i++) {
      var key = commodities[i];
      var entry = market[key];
      if (!entry) {
        market[key] = { price: 0, history: [] };
        continue;
      }
      if (!Array.isArray(entry.history)) {
        entry.history = [];
      } else if (entry.history.length > MARKET_HISTORY_LENGTH) {
        entry.history = entry.history.slice(-MARKET_HISTORY_LENGTH);
      }
    }
  }

  function updateCornPriceOnce() {
    // Random-walk corn price with a time-of-day bias.
    // Morning (6–11): slight positive drift.
    // Midday (12–17): mostly flat, low volatility.
    // Night  (18–5): higher volatility, larger swings.
    var now = new Date();
    var hour = now.getHours();
    var current = typeof market.corn.price === 'number' && isFinite(market.corn.price)
      ? market.corn.price
      : 0.25;

    var delta;
    if (hour >= 6 && hour <= 11) {
      // Morning: gentle upward tilt.
      delta = randomInRange(-0.01, 0.03);
    } else if (hour >= 12 && hour <= 17) {
      // Midday: mostly flat.
      delta = randomInRange(-0.01, 0.01);
    } else {
      // Night: higher volatility.
      delta = randomInRange(-0.04, 0.04);
    }

    var next = clamp(current + delta, 0.05, 0.9);
    next = Math.round(next * 100) / 100; // keep to cents

    market.corn.price = next;
    var hist = Array.isArray(market.corn.history) ? market.corn.history.slice(0) : [];
    hist.push(next);
    if (hist.length > MARKET_HISTORY_LENGTH) {
      hist = hist.slice(-MARKET_HISTORY_LENGTH);
    }
    market.corn.history = hist;
  }

  function updateDerivedFromCorn() {
    // Derived commodity prices:
    //   Flour   ≈ 4 corn  × [1.6 – 2.4]
    //   Oil     ≈ 10 corn × [2.0 – 3.0]
    //   Biofuel ≈ 25 corn × [2.5 – 3.5]
    //   Ingot   ≈ 50 corn × [3.0 – 4.5]
    // Each is clamped into a reasonable band and rounded to cents.
    var p = typeof market.corn.price === 'number' && isFinite(market.corn.price)
      ? market.corn.price
      : 0.25;

    function updateOne(key, cornUnits, minMult, maxMult, minPrice, maxPrice) {
      var raw = p * cornUnits * randomInRange(minMult, maxMult);
      var clamped = clamp(raw, minPrice, maxPrice);
      clamped = Math.round(clamped * 100) / 100;

      var entry = market[key] || { price: clamped, history: [] };
      entry.price = clamped;
      var hist = Array.isArray(entry.history) ? entry.history.slice(0) : [];
      hist.push(clamped);
      if (hist.length > MARKET_HISTORY_LENGTH) {
        hist = hist.slice(-MARKET_HISTORY_LENGTH);
      }
      entry.history = hist;
      market[key] = entry;
    }

    updateOne('flour', 4, 1.6, 2.4, 0.50, 8.0);
    updateOne('oil', 10, 2.0, 3.0, 2.0, 30.0);
    updateOne('biofuel', 25, 2.5, 3.5, 5.0, 80.0);
    updateOne('ingot', 50, 3.0, 4.5, 10.0, 200.0);
  }

  function updateMarketOnce() {
    // One engine tick: update corn by random walk, derive other commodities,
    // then persist and notify any listening UIs.
    updateCornPriceOnce();
    updateDerivedFromCorn();
    saveMarketState();

    if (typeof window.onMarketUpdated === 'function') {
      try {
        window.onMarketUpdated();
      } catch (e) {
      }
    }
  }

  function ensureMarketInitialized() {
    if (marketInitialized) {
      // If the market engine is already running (e.g. another page started it),
      // immediately notify any new UI listeners so they can render without
      // waiting for the next 1-minute engine tick.
      if (typeof window.onMarketUpdated === 'function') {
        try {
          window.onMarketUpdated();
        } catch (e) {
        }
      }
      return;
    }

    var loaded = loadMarketState();
    if (!loaded || !market.corn || typeof market.corn.price !== 'number') {
      seedInitialMarket();
      saveMarketState();
    } else {
      ensureHistoryArrays();
    }

    marketInitialized = true;

    // Immediately notify any charts/UI so they can render a first frame
    // from the loaded/seeded market state.
    if (typeof window.onMarketUpdated === 'function') {
      try {
        window.onMarketUpdated();
      } catch (e) {
      }
    }

    // Start the market engine loop: prices update once per minute.
    if (!marketLoopId) {
      marketLoopId = window.setInterval(updateMarketOnce, 60000);
    }
  }

  window.ensureMarketInitialized = ensureMarketInitialized;
})();
