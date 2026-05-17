window.WeatherUtils = (function () {
  var WMO_LABELS = {
    0: 'Clear', 1: 'Mainly clear', 2: 'Partly cloudy', 3: 'Overcast',
    45: 'Fog', 48: 'Rime fog', 61: 'Rain', 63: 'Rain', 71: 'Snow', 80: 'Showers', 95: 'Thunderstorm'
  };
  var TIMER_ICON = {
    clear: 'clear', pcloudy: 'cloudy', cloudy: 'cloudy', rain: 'rain', snow: 'snow', fog: 'fog', wind: 'windy'
  };

  function wmoLabel(code) { return WMO_LABELS[code] || 'Unknown'; }
  function wmoIcon(code) {
    if (code === 0 || code === 1) return 'clear';
    if (code === 2 || code === 3) return 'cloudy';
    if (code === 45 || code === 48) return 'fog';
    if (code >= 51 && code <= 67) return 'rain';
    if (code >= 71 && code <= 77) return 'snow';
    if (code >= 80) return 'rain';
    return 'cloudy';
  }
  function aqiClass(v) {
    if (v == null || v === '') return 'aqi-unknown';
    var n = Number(v);
    if (n <= 50) return 'aqi-good';
    if (n <= 100) return 'aqi-moderate';
    if (n <= 150) return 'aqi-sensitive';
    if (n <= 200) return 'aqi-unhealthy';
    return 'aqi-very-bad';
  }
  function aqiColor(v) {
    if (v == null) return '#8b9cb3';
    var n = Number(v);
    if (n <= 50) return '#22c55e';
    if (n <= 100) return '#eab308';
    if (n <= 150) return '#f97316';
    if (n <= 200) return '#ef4444';
    return '#a855f7';
  }
  function aqiLabel(v) {
    if (v == null) return 'No data';
    var n = Number(v);
    if (n <= 50) return 'Good';
    if (n <= 100) return 'Moderate';
    if (n <= 150) return 'Unhealthy (sensitive)';
    if (n <= 200) return 'Unhealthy';
    if (n <= 300) return 'Very unhealthy';
    return 'Hazardous';
  }
  function fmt(v, s) { return v == null || v === '' ? '—' : Math.round(v) + (s || ''); }

  function fetchJson(url) {
    return fetch(url).then(function (r) {
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return r.json();
    });
  }

  return {
    wmoLabel: wmoLabel,
    wmoIcon: wmoIcon,
    aqiClass: aqiClass,
    aqiColor: aqiColor,
    aqiLabel: aqiLabel,
    fmt: fmt,
    fetchJson: fetchJson,
    TIMER_ICON: TIMER_ICON
  };
})();
