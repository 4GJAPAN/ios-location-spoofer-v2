/*
 * iOS Location Spoofer v2 - local configuration page for Shadowrocket.
 * Open: http://location-spoofer.local/
 * Data is stored locally in $persistentStore. No remote config server is used.
 */
(function () {
  "use strict";

  var STORE_KEYS = {
    pending: "location_spoofer_v2_pending",
    current: "location_spoofer_v2_current",
    lastGood: "location_spoofer_v2_last_good",
    runtime: "location_spoofer_v2_runtime"
  };

  var DEFAULT_CONFIG = {
    configVersion: 2,
    enabled: true,
    mode: "response",
    latitude: 37.3349,
    longitude: -122.00902,
    horizontalAccuracy: 10,
    verticalAccuracy: 20,
    altitude: 0,
    altitudeMode: "preserve",
    motionMode: "preserve",
    jitterRadius: 0,
    jitterIntervalMs: 30000,
    sessionSeed: 2772,
    expiresAt: 0,
    resetOnError: false,
    resetOnNetworkChange: false,
    unknownValue4: 3,
    motionActivityType: 63,
    motionActivityConfidence: 467,
    failOpen: true,
    debug: false,
    dumpRaw: false,
    dumpHeaders: false,
    prepareHeaders: false,
    rawLimit: 0,
    updatedAt: 0,
    label: ""
  };

  function done(status, contentType, body) {
    $done({
      response: {
        status: status || 200,
        headers: {
          "Content-Type": contentType || "text/html; charset=utf-8",
          "Cache-Control": "no-store, no-cache, must-revalidate",
          "Pragma": "no-cache"
        },
        body: body || ""
      }
    });
  }

  function readRaw(key) {
    try {
      return $persistentStore.read(key);
    } catch (err) {
      return null;
    }
  }

  function writeRaw(key, value) {
    try {
      return $persistentStore.write(String(value), key) !== false;
    } catch (err) {
      return false;
    }
  }

  function readJson(key) {
    try {
      var raw = readRaw(key);
      return raw ? JSON.parse(raw) : null;
    } catch (err) {
      return null;
    }
  }

  function writeJson(key, value) {
    return writeRaw(key, JSON.stringify(value));
  }

  function merge(base, extra) {
    var out = {};
    var key;
    base = base || {};
    extra = extra || {};
    for (key in base) {
      if (Object.prototype.hasOwnProperty.call(base, key)) {
        out[key] = base[key];
      }
    }
    for (key in extra) {
      if (Object.prototype.hasOwnProperty.call(extra, key)) {
        out[key] = extra[key];
      }
    }
    return out;
  }

  function parseBoolean(value, fallback) {
    if (value === true || value === false) {
      return value;
    }
    var text = String(value == null ? "" : value).trim().toLowerCase();
    if (text === "true" || text === "1" || text === "on" || text === "yes") {
      return true;
    }
    if (text === "false" || text === "0" || text === "off" || text === "no") {
      return false;
    }
    return fallback;
  }

  function validateCoordinates(latitude, longitude) {
    var lat = Number(latitude);
    var lng = Number(longitude);
    if (!Number.isFinite(lat) || lat < -90 || lat > 90) {
      throw new Error("Vĩ độ phải nằm trong khoảng -90 đến 90.");
    }
    if (!Number.isFinite(lng) || lng < -180 || lng > 180) {
      throw new Error("Kinh độ phải nằm trong khoảng -180 đến 180.");
    }
    return { latitude: lat, longitude: lng };
  }

  function normalizeConfig(input) {
    var cfg = merge(DEFAULT_CONFIG, input || {});
    var coords = validateCoordinates(cfg.latitude, cfg.longitude);
    cfg.configVersion = 2;
    cfg.latitude = coords.latitude;
    cfg.longitude = coords.longitude;
    cfg.enabled = parseBoolean(cfg.enabled, true);
    cfg.failOpen = parseBoolean(cfg.failOpen, true);
    cfg.resetOnError = false;
    cfg.resetOnNetworkChange = false;
    cfg.horizontalAccuracy = Math.max(1, Math.min(1000, Math.round(Number(cfg.horizontalAccuracy) || 10)));
    cfg.verticalAccuracy = Math.max(1, Math.min(10000, Math.round(Number(cfg.verticalAccuracy) || 20)));
    cfg.altitude = Math.round(Number(cfg.altitude) || 0);
    cfg.altitudeMode = String(cfg.altitudeMode || "preserve").toLowerCase() === "manual" ? "manual" : "preserve";
    cfg.motionMode = String(cfg.motionMode || "preserve").toLowerCase() === "static" ? "static" : "preserve";
    cfg.jitterRadius = Math.max(0, Math.min(1000, Number(cfg.jitterRadius) || 0));
    cfg.jitterIntervalMs = Math.max(10000, Math.round(Number(cfg.jitterIntervalMs) || 30000));
    cfg.sessionSeed = Math.round(Number(cfg.sessionSeed) || ((Date.now() ^ 2772) >>> 0));
    cfg.expiresAt = Math.max(0, Math.round(Number(cfg.expiresAt) || 0));
    cfg.debug = parseBoolean(cfg.debug, false);
    cfg.updatedAt = Date.now();
    cfg.label = String(cfg.label || "").slice(0, 100);
    return cfg;
  }

  function currentConfig() {
    var current = readJson(STORE_KEYS.current);
    if (current) {
      try {
        return normalizeConfig(current);
      } catch (err) {
        // fall through
      }
    }
    var lastGood = readJson(STORE_KEYS.lastGood);
    if (lastGood) {
      try {
        return normalizeConfig(lastGood);
      } catch (err2) {
        // fall through
      }
    }
    return normalizeConfig(DEFAULT_CONFIG);
  }

  function commitConfig(input) {
    var cfg = normalizeConfig(input);
    if (!writeJson(STORE_KEYS.pending, cfg)) {
      throw new Error("Không ghi được cấu hình tạm vào bộ nhớ Shadowrocket.");
    }
    var verify = readJson(STORE_KEYS.pending);
    if (!verify) {
      throw new Error("Không đọc lại được cấu hình tạm.");
    }
    normalizeConfig(verify);
    if (!writeJson(STORE_KEYS.current, cfg)) {
      throw new Error("Không ghi được cấu hình hiện hành.");
    }
    if (!writeJson(STORE_KEYS.lastGood, cfg)) {
      throw new Error("Không ghi được bản cấu hình dự phòng.");
    }
    writeRaw(STORE_KEYS.pending, "");
    return cfg;
  }

  function clearAll() {
    writeRaw(STORE_KEYS.pending, "");
    writeRaw(STORE_KEYS.current, "");
    writeRaw(STORE_KEYS.lastGood, "");
    writeRaw(STORE_KEYS.runtime, "");
  }

  function decode(value) {
    try {
      return decodeURIComponent(String(value || "").replace(/\+/g, " "));
    } catch (err) {
      return String(value || "");
    }
  }

  function parseQuery(url) {
    var out = {};
    var qIndex = String(url || "").indexOf("?");
    if (qIndex < 0) {
      return out;
    }
    var query = String(url).slice(qIndex + 1).split("#")[0];
    var parts = query.split("&");
    for (var i = 0; i < parts.length; i += 1) {
      if (!parts[i]) {
        continue;
      }
      var eq = parts[i].indexOf("=");
      var key = eq >= 0 ? parts[i].slice(0, eq) : parts[i];
      var value = eq >= 0 ? parts[i].slice(eq + 1) : "";
      out[decode(key)] = decode(value);
    }
    return out;
  }

  function parsePath(url) {
    var match = String(url || "").match(/^https?:\/\/[^/]+(\/[^?#]*)?/i);
    return match && match[1] ? match[1] : "/";
  }

  function parseLocationInput(rawInput) {
    var input = decode(String(rawInput || "").trim());
    if (!input) {
      return null;
    }

    var patterns = [
      /^[\s(]*(-?\d+(?:\.\d+)?)\s*[,;\s]\s*(-?\d+(?:\.\d+)?)[\s)]*$/,
      /[?&](?:q|query|ll|center|destination)=\s*(-?\d+(?:\.\d+)?)\s*[,%2C\s]+\s*(-?\d+(?:\.\d+)?)/i,
      /\/@\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)/i,
      /!3d\s*(-?\d+(?:\.\d+)?).*?!4d\s*(-?\d+(?:\.\d+)?)/i,
      /(?:lat|latitude)[=:]\s*(-?\d+(?:\.\d+)?).*?(?:lng|lon|longitude)[=:]\s*(-?\d+(?:\.\d+)?)/i
    ];

    for (var i = 0; i < patterns.length; i += 1) {
      var match = input.match(patterns[i]);
      if (match) {
        return validateCoordinates(match[1], match[2]);
      }
    }
    return null;
  }

  function isShortMapUrl(input) {
    return /^https?:\/\/(?:maps\.app\.goo\.gl|goo\.gl\/maps)\//i.test(String(input || "").trim());
  }

  function htmlDecode(value) {
    return String(value || "")
      .replace(/&amp;/g, "&")
      .replace(/&#38;/g, "&")
      .replace(/\\u003d/g, "=")
      .replace(/\\u0026/g, "&")
      .replace(/\\\//g, "/");
  }

  function findMapUrlInBody(body) {
    var text = htmlDecode(body || "");
    var match = text.match(/https?:\/\/(?:www\.)?google\.[^\s"'<>]+\/maps[^\s"'<>]*/i);
    return match ? match[0] : "";
  }

  function headerValue(headers, name) {
    headers = headers || {};
    var target = String(name).toLowerCase();
    for (var key in headers) {
      if (Object.prototype.hasOwnProperty.call(headers, key) && String(key).toLowerCase() === target) {
        return headers[key];
      }
    }
    return "";
  }

  function resolveShortMapUrl(url, depth, callback) {
    if (depth > 5) {
      callback(null, "Link rút gọn chuyển hướng quá nhiều lần.");
      return;
    }
    if (typeof $httpClient === "undefined" || !$httpClient.get) {
      callback(null, "Shadowrocket không cung cấp $httpClient để mở rộng link.");
      return;
    }

    $httpClient.get({
      url: url,
      timeout: 8000,
      headers: { "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148" }
    }, function (error, response, body) {
      if (error) {
        callback(null, "Không mở được link rút gọn: " + error);
        return;
      }

      var location = headerValue(response && response.headers, "Location");
      if (location) {
        var absolute = location;
        if (location.indexOf("/") === 0) {
          var origin = String(url).match(/^(https?:\/\/[^/]+)/i);
          absolute = origin ? origin[1] + location : location;
        }
        var direct = parseLocationInput(absolute);
        if (direct) {
          callback(direct, null);
          return;
        }
        resolveShortMapUrl(absolute, depth + 1, callback);
        return;
      }

      var candidates = [
        response && response.url,
        response && response.request && response.request.url,
        findMapUrlInBody(body),
        body
      ];
      for (var i = 0; i < candidates.length; i += 1) {
        var coords = parseLocationInput(candidates[i]);
        if (coords) {
          callback(coords, null);
          return;
        }
      }
      callback(null, "Không tìm thấy tọa độ trong link Google Maps rút gọn.");
    });
  }

  function escapeHtml(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function formatTime(timestamp) {
    var value = Number(timestamp) || 0;
    if (!value) {
      return "Chưa có";
    }
    try {
      return new Date(value).toLocaleString("vi-VN");
    } catch (err) {
      return new Date(value).toString();
    }
  }

  function checked(value) {
    return value ? " checked" : "";
  }

  function selected(actual, expected) {
    return String(actual) === String(expected) ? " selected" : "";
  }

  function page(message, errorMessage) {
    var cfg = currentConfig();
    var runtime = readJson(STORE_KEYS.runtime) || {};
    var active = cfg.enabled && !(cfg.expiresAt > 0 && Date.now() >= cfg.expiresAt);
    var banner = "";
    if (message) {
      banner = '<div class="banner ok">' + escapeHtml(message) + "</div>";
    } else if (errorMessage) {
      banner = '<div class="banner err">' + escapeHtml(errorMessage) + "</div>";
    }

    var body = '<!doctype html><html lang="vi"><head><meta charset="utf-8">' +
      '<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">' +
      '<title>Location Spoofer v2</title><style>' +
      ':root{color-scheme:light dark}body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;margin:0;background:#f2f3f7;color:#121212}' +
      '.wrap{max-width:760px;margin:0 auto;padding:18px}.card{background:#fff;border-radius:18px;padding:18px;margin:14px 0;box-shadow:0 8px 30px rgba(0,0,0,.07)}' +
      'h1{font-size:25px;margin:4px 0 3px}h2{font-size:18px;margin:0 0 13px}.sub{color:#666;margin:0 0 14px}.grid{display:grid;grid-template-columns:1fr 1fr;gap:12px}' +
      'label{display:block;font-size:13px;font-weight:650;margin-bottom:6px}input,select{width:100%;box-sizing:border-box;border:1px solid #d7d9df;border-radius:11px;padding:12px;font-size:16px;background:#fff;color:#111}' +
      '.full{grid-column:1/-1}.buttons{display:flex;gap:10px;flex-wrap:wrap;margin-top:15px}.btn{display:inline-block;border:0;border-radius:12px;padding:12px 16px;text-decoration:none;font-weight:700;background:#111;color:#fff}' +
      '.btn.secondary{background:#e8e9ed;color:#111}.btn.danger{background:#a61b1b}.status{display:grid;grid-template-columns:1fr 1fr;gap:10px}.item{background:#f6f7f9;border-radius:12px;padding:11px}.k{font-size:12px;color:#6d6f78}.v{font-weight:700;margin-top:3px;word-break:break-word}' +
      '.banner{padding:12px;border-radius:12px;margin:10px 0}.ok{background:#dff6e5;color:#145b28}.err{background:#fee3e3;color:#821919}.hint{font-size:12px;color:#6d6f78;line-height:1.45;margin-top:6px}' +
      '@media(max-width:620px){.grid,.status{grid-template-columns:1fr}.full{grid-column:auto}}' +
      '@media(prefers-color-scheme:dark){body{background:#0d0e10;color:#f3f3f3}.card{background:#181a1e}.sub,.hint,.k{color:#a9abb3}input,select{background:#101114;color:#f3f3f3;border-color:#34363d}.item{background:#22242a}.btn.secondary{background:#30323a;color:#fff}}' +
      '</style></head><body><div class="wrap"><h1>iOS Location Spoofer v2</h1><p class="sub">Cấu hình lưu ngay trong Shadowrocket, không phụ thuộc máy chủ bên ngoài.</p>' +
      banner +
      '<div class="card"><h2>Trạng thái</h2><div class="status">' +
      '<div class="item"><div class="k">Module</div><div class="v">' + (active ? "Đang bật" : "Đang tắt") + '</div></div>' +
      '<div class="item"><div class="k">Vị trí</div><div class="v">' + escapeHtml(cfg.latitude + ", " + cfg.longitude) + '</div></div>' +
      '<div class="item"><div class="k">Lần vá gần nhất</div><div class="v">' + escapeHtml(formatTime(runtime.lastPatchAt)) + '</div></div>' +
      '<div class="item"><div class="k">Số lần vá</div><div class="v">' + escapeHtml(runtime.patchCount || 0) + '</div></div>' +
      '<div class="item"><div class="k">Máy chủ gần nhất</div><div class="v">' + escapeHtml(runtime.lastHost || "Chưa có") + '</div></div>' +
      '<div class="item"><div class="k">Lỗi gần nhất</div><div class="v">' + escapeHtml(runtime.lastError || "Không có") + '</div></div>' +
      '</div><div class="buttons"><a class="btn secondary" href="/enable">Bật</a><a class="btn secondary" href="/disable">Tắt</a><a class="btn secondary" href="/status">Làm mới</a></div></div>' +
      '<div class="card"><h2>Đặt vị trí</h2><form action="/set" method="get"><div class="grid">' +
      '<div class="full"><label>Tọa độ hoặc link Google/Apple Maps</label><input id="input" name="input" placeholder="10.776889, 106.700806 hoặc dán link Maps"><div class="hint">Hỗ trợ tọa độ trực tiếp, URL có q/query/ll, dạng /@lat,lng, !3d...!4d và link maps.app.goo.gl.</div></div>' +
      '<div><label>Vĩ độ</label><input name="latitude" inputmode="decimal" value="' + escapeHtml(cfg.latitude) + '"></div>' +
      '<div><label>Kinh độ</label><input name="longitude" inputmode="decimal" value="' + escapeHtml(cfg.longitude) + '"></div>' +
      '<div class="full"><label>Tên vị trí</label><input name="label" value="' + escapeHtml(cfg.label || "") + '" placeholder="Nhà, cơ quan, điểm thử nghiệm..."></div>' +
      '<div><label>Độ chính xác ngang (m)</label><input name="horizontalAccuracy" type="number" min="1" max="1000" value="' + escapeHtml(cfg.horizontalAccuracy) + '"></div>' +
      '<div><label>Dao động quanh điểm (m)</label><input name="jitterRadius" type="number" min="0" max="1000" step="0.1" value="' + escapeHtml(cfg.jitterRadius) + '"></div>' +
      '<div><label>Độ cao</label><select name="altitudeMode"><option value="preserve"' + selected(cfg.altitudeMode, "preserve") + '>Giữ từ phản hồi gốc</option><option value="manual"' + selected(cfg.altitudeMode, "manual") + '>Dùng giá trị nhập</option></select></div>' +
      '<div><label>Độ cao thủ công (m)</label><input name="altitude" type="number" value="' + escapeHtml(cfg.altitude) + '"></div>' +
      '<div><label>Trạng thái chuyển động</label><select name="motionMode"><option value="preserve"' + selected(cfg.motionMode, "preserve") + '>Giữ từ phản hồi gốc</option><option value="static"' + selected(cfg.motionMode, "static") + '>Dùng giá trị tĩnh của script</option></select></div>' +
      '<div><label>Chế độ gỡ lỗi</label><select name="debug"><option value="false"' + selected(cfg.debug, false) + '>Tắt</option><option value="true"' + selected(cfg.debug, true) + '>Bật</option></select></div>' +
      '</div><div class="buttons"><button class="btn" type="submit">Lưu và áp dụng</button><button class="btn secondary" type="button" onclick="pasteMap()">Dán clipboard</button></div></form></div>' +
      '<div class="card"><h2>Khôi phục</h2><p class="sub">Xóa cả cấu hình hiện hành, bản dự phòng và nhật ký hoạt động.</p><a class="btn danger" href="/reset" onclick="return confirm(\'Xóa toàn bộ cấu hình?\')">Đặt lại toàn bộ</a></div>' +
      '<script>async function pasteMap(){try{var t=await navigator.clipboard.readText();document.getElementById("input").value=t}catch(e){alert("Safari không cho đọc clipboard tự động. Hãy chạm giữ ô nhập và chọn Dán.")}}</script>' +
      '</div></body></html>';
    done(200, "text/html; charset=utf-8", body);
  }

  function applySet(args, coords) {
    var cfg = currentConfig();
    if (coords) {
      cfg.latitude = coords.latitude;
      cfg.longitude = coords.longitude;
    } else if (args.latitude !== "" || args.longitude !== "") {
      var manual = validateCoordinates(args.latitude || cfg.latitude, args.longitude || cfg.longitude);
      cfg.latitude = manual.latitude;
      cfg.longitude = manual.longitude;
    }

    if (args.horizontalAccuracy !== undefined && args.horizontalAccuracy !== "") {
      cfg.horizontalAccuracy = args.horizontalAccuracy;
    }
    if (args.jitterRadius !== undefined && args.jitterRadius !== "") {
      cfg.jitterRadius = args.jitterRadius;
    }
    if (args.altitudeMode) {
      cfg.altitudeMode = args.altitudeMode;
    }
    if (args.altitude !== undefined && args.altitude !== "") {
      cfg.altitude = args.altitude;
    }
    if (args.motionMode) {
      cfg.motionMode = args.motionMode;
    }
    if (args.debug !== undefined) {
      cfg.debug = args.debug;
    }
    if (args.label !== undefined) {
      cfg.label = args.label;
    }
    cfg.enabled = true;
    cfg.expiresAt = 0;
    cfg.sessionSeed = ((Date.now() ^ Math.round(Number(cfg.latitude) * 1000000) ^ Math.round(Number(cfg.longitude) * 1000000)) >>> 0);
    return commitConfig(cfg);
  }

  var requestUrl = typeof $request !== "undefined" && $request ? $request.url : "http://location-spoofer.local/";
  var path = parsePath(requestUrl);
  var args = parseQuery(requestUrl);

  try {
    if (path === "/enable") {
      var enabledCfg = currentConfig();
      enabledCfg.enabled = true;
      enabledCfg.expiresAt = 0;
      commitConfig(enabledCfg);
      page("Đã bật vị trí giả.", "");
      return;
    }

    if (path === "/disable") {
      var disabledCfg = currentConfig();
      disabledCfg.enabled = false;
      commitConfig(disabledCfg);
      page("Đã tắt vị trí giả. Cấu hình vẫn được giữ lại.", "");
      return;
    }

    if (path === "/reset") {
      clearAll();
      page("Đã xóa toàn bộ cấu hình và nhật ký.", "");
      return;
    }

    if (path === "/api/config") {
      done(200, "application/json; charset=utf-8", JSON.stringify({
        config: currentConfig(),
        runtime: readJson(STORE_KEYS.runtime) || {}
      }, null, 2));
      return;
    }

    if (path === "/set") {
      var input = String(args.input || "").trim();
      var parsed = input ? parseLocationInput(input) : null;
      if (input && !parsed && isShortMapUrl(input)) {
        resolveShortMapUrl(input, 0, function (coords, error) {
          try {
            if (!coords) {
              page("", error || "Không phân tích được link bản đồ.");
              return;
            }
            var saved = applySet(args, coords);
            page("Đã lưu: " + saved.latitude + ", " + saved.longitude + ".", "");
          } catch (err) {
            page("", err.message);
          }
        });
        return;
      }
      if (input && !parsed) {
        page("", "Không tìm thấy tọa độ trong nội dung đã nhập.");
        return;
      }
      var savedCfg = applySet(args, parsed);
      page("Đã lưu: " + savedCfg.latitude + ", " + savedCfg.longitude + ".", "");
      return;
    }

    page("", "");
  } catch (err) {
    page("", err && err.message ? err.message : String(err));
  }
}());
