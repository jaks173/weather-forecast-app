window.WeatherDashboard = (function () {
  var U = window.WeatherUtils;
  var snapshot = [];

  function topN(rows, key, desc, n) {
    var copy = rows.filter(function (r) { return r[key] != null; });
    copy.sort(function (a, b) {
      return desc ? b[key] - a[key] : a[key] - b[key];
    });
    return copy.slice(0, n);
  }

  function renderLeaderboard(title, rows, formatRow) {
    var card = document.createElement('div');
    card.className = 'rank-card';
    var h = document.createElement('h3');
    h.textContent = title;
    card.appendChild(h);
    var ol = document.createElement('ol');
    ol.className = 'rank-list';
    if (!rows.length) {
      var li = document.createElement('li');
      li.textContent = 'No data';
      ol.appendChild(li);
    } else {
      rows.forEach(function (row, i) {
        var li = document.createElement('li');
        li.className = 'rank-item';
        li.dataset.lat = row.latitude;
        li.dataset.lon = row.longitude;
        li.dataset.city = row.city;
        li.innerHTML = formatRow(row, i + 1);
        li.addEventListener('click', function () {
          if (window.WeatherApp && window.WeatherApp.selectCity) {
            window.WeatherApp.selectCity(row.latitude, row.longitude, row.city);
          }
        });
        ol.appendChild(li);
      });
    }
    card.appendChild(ol);
    return card;
  }

  function renderRankings(rows) {
    var grid = document.getElementById('rankings-grid');
    grid.innerHTML = '';
    grid.appendChild(renderLeaderboard('Highest AQI (worst air)', topN(rows, 'us_aqi', true, 10), function (r, n) {
      return '<span class="rank-num">' + n + '</span><span class="rank-city">' + r.city + ', ' + r.country + '</span>' +
        '<span class="rank-val ' + U.aqiClass(r.us_aqi) + '">AQI ' + U.fmt(r.us_aqi, '') + '</span>';
    }));
    grid.appendChild(renderLeaderboard('Cleanest air (lowest AQI)', topN(rows, 'us_aqi', false, 10), function (r, n) {
      return '<span class="rank-num">' + n + '</span><span class="rank-city">' + r.city + ', ' + r.country + '</span>' +
        '<span class="rank-val ' + U.aqiClass(r.us_aqi) + '">AQI ' + U.fmt(r.us_aqi, '') + '</span>';
    }));
    grid.appendChild(renderLeaderboard('Hottest now', topN(rows, 'temperature', true, 10), function (r, n) {
      return '<span class="rank-num">' + n + '</span><span class="rank-city">' + r.city + ', ' + r.country + '</span>' +
        '<span class="rank-val">🌡 ' + U.fmt(r.temperature, '°C') + '</span>';
    }));
    grid.appendChild(renderLeaderboard('Highest PM2.5', topN(rows, 'pm2_5', true, 10), function (r, n) {
      return '<span class="rank-num">' + n + '</span><span class="rank-city">' + r.city + ', ' + r.country + '</span>' +
        '<span class="rank-val">PM2.5 ' + (r.pm2_5 != null ? r.pm2_5.toFixed(1) : '—') + ' µg/m³</span>';
    }));
  }

  function clientSnapshotFallback(cities) {
    var batch = cities.slice(0, 24);
    return Promise.all(batch.map(function (c) {
      var lat = c.latitude;
      var lon = c.longitude;
      var m = 'https://api.open-meteo.com/v1/forecast?latitude=' + lat + '&longitude=' + lon +
        '&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m&timezone=auto';
      var a = 'https://air-quality-api.open-meteo.com/v1/air-quality?latitude=' + lat + '&longitude=' + lon +
        '&current=us_aqi,pm2_5,pm10,european_aqi';
      return Promise.all([U.fetchJson(m), U.fetchJson(a)]).then(function (p) {
        var cur = (p[0].current) || {};
        var aq = (p[1].current) || {};
        return {
          city: c.city, country: c.country, region: c.region,
          latitude: lat, longitude: lon,
          temperature: cur.temperature_2m, feels_like: cur.apparent_temperature,
          humidity: cur.relative_humidity_2m, wind: cur.wind_speed_10m,
          weather_code: cur.weather_code,
          us_aqi: aq.us_aqi, pm2_5: aq.pm2_5, pm10: aq.pm10, european_aqi: aq.european_aqi
        };
      }).catch(function () {
        return { city: c.city, country: c.country, region: c.region, latitude: lat, longitude: lon };
      });
    }));
  }

  function loadSnapshot(cityList) {
    var status = document.getElementById('snapshot-status');
    status.textContent = 'Loading live data for ' + cityList.length + ' cities…';
    return U.fetchJson('/api/world-snapshot')
      .then(function (data) {
        snapshot = data.cities || [];
        status.textContent = 'Updated just now · ' + snapshot.length + ' cities';
        return snapshot;
      })
      .catch(function () {
        status.textContent = 'Using browser fetch (subset of cities)…';
        return clientSnapshotFallback(cityList).then(function (rows) {
          snapshot = rows;
          status.textContent = 'Partial snapshot · ' + rows.length + ' cities';
          return snapshot;
        });
      })
      .then(function (rows) {
        renderRankings(rows);
        if (window.WeatherMap && window.WeatherMap.setMarkers) {
          window.WeatherMap.setMarkers(rows);
        }
        return rows;
      });
  }

  function getSnapshot() { return snapshot; }

  return { loadSnapshot: loadSnapshot, getSnapshot: getSnapshot, renderRankings: renderRankings };
})();
