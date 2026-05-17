window.WeatherMap = (function () {
  var U = window.WeatherUtils;
  var map = null;
  var layer = null;

  function popupHtml(row) {
    return (
      '<strong>' + row.city + ', ' + row.country + '</strong><br>' +
      'Temp: ' + U.fmt(row.temperature, '°C') + '<br>' +
      'US AQI: ' + U.fmt(row.us_aqi, '') + ' (' + U.aqiLabel(row.us_aqi) + ')<br>' +
      'PM2.5: ' + (row.pm2_5 != null ? row.pm2_5.toFixed(1) + ' µg/m³' : '—')
    );
  }

  function renderLegend() {
    var el = document.getElementById('map-legend');
    el.innerHTML =
      '<span><i style="background:#22c55e"></i> Good (0–50)</span>' +
      '<span><i style="background:#eab308"></i> Moderate</span>' +
      '<span><i style="background:#f97316"></i> Sensitive</span>' +
      '<span><i style="background:#ef4444"></i> Unhealthy</span>' +
      '<span><i style="background:#a855f7"></i> Hazardous</span>';
  }

  function init() {
    map = L.map('weather-map', { scrollWheelZoom: true }).setView([20, 0], 2);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap',
      maxZoom: 18
    }).addTo(map);
    layer = L.layerGroup().addTo(map);
    renderLegend();
  }

  function setMarkers(rows) {
    if (!map) init();
    layer.clearLayers();
    rows.forEach(function (row) {
      if (row.latitude == null || row.longitude == null) return;
      var lat = parseFloat(row.latitude);
      var lon = parseFloat(row.longitude);
      var color = U.aqiColor(row.us_aqi);
      var marker = L.circleMarker([lat, lon], {
        radius: 8,
        fillColor: color,
        color: '#1a2332',
        weight: 1,
        opacity: 1,
        fillOpacity: 0.85
      });
      marker.bindPopup(popupHtml(row));
      marker.on('click', function () {
        if (window.WeatherApp && window.WeatherApp.selectCity) {
          window.WeatherApp.selectCity(row.latitude, row.longitude, row.city);
        }
      });
      layer.addLayer(marker);
    });
  }

  function flyTo(lat, lon) {
    if (!map) return;
    map.flyTo([parseFloat(lat), parseFloat(lon)], 6, { duration: 1 });
  }

  return { init: init, setMarkers: setMarkers, flyTo: flyTo };
})();
