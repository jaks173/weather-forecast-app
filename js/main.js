window.WeatherApp = (function () {
  var U = window.WeatherUtils;
  var allCities = [];

  function showForecastMessage(message, isError) {
    document.getElementById('current-panel').classList.add('hidden');
    var c = document.getElementById('weather-forecast');
    c.innerHTML = '';
    var el = document.createElement('p');
    el.className = isError ? 'forecast-error' : 'forecast-loading';
    el.textContent = message;
    c.appendChild(el);
  }

  function populateCityDropdown(cities) {
    allCities = cities;
    var select = document.getElementById('city-select');
    var byRegion = {};
    cities.forEach(function (city) {
      var region = city.region || 'Other';
      if (!byRegion[region]) byRegion[region] = [];
      byRegion[region].push(city);
    });
    Object.keys(byRegion).sort().forEach(function (region) {
      var group = document.createElement('optgroup');
      group.label = region;
      byRegion[region].sort(function (a, b) {
        return (a.city || '').localeCompare(b.city || '');
      }).forEach(function (city) {
        var option = document.createElement('option');
        option.value = city.latitude + ',' + city.longitude;
        option.textContent = city.city + ', ' + (city.country || '');
        option.dataset.cityName = city.city;
        group.appendChild(option);
      });
      select.appendChild(group);
    });
  }

  function setSelectValue(lat, lon) {
    var select = document.getElementById('city-select');
    var val = lat + ',' + lon;
    for (var i = 0; i < select.options.length; i++) {
      if (select.options[i].value === val) {
        select.selectedIndex = i;
        return;
      }
    }
  }

  function openMeteoDirect(lat, lon) {
    var m = 'https://api.open-meteo.com/v1/forecast?latitude=' + lat + '&longitude=' + lon +
      '&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m' +
      '&daily=weather_code,temperature_2m_max,temperature_2m_min,wind_speed_10m_max&timezone=auto&forecast_days=7';
    var a = 'https://air-quality-api.open-meteo.com/v1/air-quality?latitude=' + lat + '&longitude=' + lon +
      '&current=us_aqi,pm2_5,pm10,european_aqi';
    return Promise.all([U.fetchJson(m), U.fetchJson(a)]).then(function (p) {
      return { meteo: p[0], air_quality: p[1] };
    });
  }

  function timerDirect(lat, lon) {
    var direct = 'https://www.7timer.info/bin/api.pl?lon=' + lon + '&lat=' + lat + '&product=civillight&output=json';
    return U.fetchJson('/api/weather?lon=' + lon + '&lat=' + lat).catch(function () {
      return U.fetchJson('https://api.allorigins.win/raw?url=' + encodeURIComponent(direct));
    });
  }

  function fetchBundle(lat, lon) {
    return U.fetchJson('/api/bundle?lon=' + lon + '&lat=' + lat).then(function (b) {
      return { timer: b.timer, meteo: b.meteo, air_quality: b.air_quality };
    }).catch(function () {
      return Promise.all([timerDirect(lat, lon), openMeteoDirect(lat, lon)]).then(function (p) {
        return { timer: p[0], meteo: p[1].meteo, air_quality: p[1].air_quality };
      });
    });
  }

  function renderCurrentPanel(meteo, aq, cityName) {
    var panel = document.getElementById('current-panel');
    panel.classList.remove('hidden');
    panel.innerHTML = '';
    var cur = (meteo && meteo.current) || {};
    var aqCur = (aq && aq.current) || {};
    var usAqi = aqCur.us_aqi;
    var code = cur.weather_code;

    var wCard = document.createElement('div');
    wCard.className = 'panel-card';
    var h2 = document.createElement('h2');
    h2.textContent = 'Now · ' + (cityName || 'Selected city');
    wCard.appendChild(h2);

    var row = document.createElement('div');
    row.className = 'current-main';
    var img = document.createElement('img');
    img.src = 'images/' + U.wmoIcon(code) + '.png';
    img.alt = U.wmoLabel(code);
    img.width = 64;
    img.height = 64;
    row.appendChild(img);

    var col = document.createElement('div');
    var temp = document.createElement('div');
    temp.className = 'current-temp';
    temp.innerHTML = U.fmt(cur.temperature_2m, '°C') + ' <span>feels ' + U.fmt(cur.apparent_temperature, '°C') + '</span>';
    col.appendChild(temp);
    var desc = document.createElement('div');
    desc.className = 'current-desc';
    desc.textContent = U.wmoLabel(code);
    col.appendChild(desc);
    var meta = document.createElement('div');
    meta.className = 'current-meta';
    meta.innerHTML = '<span>Humidity ' + U.fmt(cur.relative_humidity_2m, '%') + '</span><span>Wind ' + U.fmt(cur.wind_speed_10m, ' km/h') + '</span>';
    col.appendChild(meta);
    row.appendChild(col);
    wCard.appendChild(row);
    panel.appendChild(wCard);

    var aCard = document.createElement('div');
    aCard.className = 'panel-card';
    var ah = document.createElement('h2');
    ah.textContent = 'Air quality';
    aCard.appendChild(ah);
    var badge = document.createElement('div');
    badge.className = 'aqi-badge ' + U.aqiClass(usAqi);
    badge.textContent = 'US AQI ' + (usAqi != null ? usAqi : '—') + ' · ' + U.aqiLabel(usAqi);
    aCard.appendChild(badge);
    var grid = document.createElement('div');
    grid.className = 'aqi-grid';
    [['PM2.5', aqCur.pm2_5], ['PM10', aqCur.pm10], ['EU AQI', aqCur.european_aqi]].forEach(function (pair) {
      var cell = document.createElement('div');
      cell.innerHTML = '<strong>' + pair[0] + '</strong>' + (pair[1] != null && pair[0] !== 'EU AQI' ? pair[1].toFixed(1) : U.fmt(pair[1], ''));
      grid.appendChild(cell);
    });
    aCard.appendChild(grid);
    panel.appendChild(aCard);
  }

  function renderTimerForecast(timer) {
    var forecastContainer = document.getElementById('weather-forecast');
    forecastContainer.innerHTML = '';
    if (!timer || !timer.dataseries || !timer.dataseries.length) {
      var p = document.createElement('p');
      p.className = 'forecast-error';
      p.textContent = '7-day forecast unavailable for this location.';
      forecastContainer.appendChild(p);
      return;
    }
    var heading = document.createElement('p');
    heading.className = 'forecast-heading';
    heading.textContent = '7-day outlook';
    forecastContainer.appendChild(heading);
    timer.dataseries.forEach(function (forecast, index) {
      if (index >= 7) return;
      var card = document.createElement('div');
      card.className = 'weather-card';
      var icon = U.TIMER_ICON[forecast.weather] || 'cloudy';
      var img = document.createElement('img');
      img.src = 'images/' + icon + '.png';
      img.alt = forecast.weather;
      card.appendChild(img);
      var content = document.createElement('div');
      content.className = 'weather-card-content';
      var date = new Date();
      date.setDate(date.getDate() + index);
      var title = document.createElement('div');
      title.className = 'weather-card-title';
      title.textContent = date.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
      content.appendChild(title);
      var condition = document.createElement('div');
      condition.className = 'weather-condition';
      condition.textContent = forecast.weather;
      content.appendChild(condition);
      var temp = document.createElement('div');
      temp.className = 'temp';
      temp.textContent = forecast.temp2m.min + '° – ' + forecast.temp2m.max + '°C';
      content.appendChild(temp);
      var wind = document.createElement('div');
      wind.textContent = 'Wind ' + forecast.wind10m_max + ' km/h';
      content.appendChild(wind);
      card.appendChild(content);
      forecastContainer.appendChild(card);
    });
  }

  function fetchWeather(latitude, longitude, cityName) {
    showForecastMessage('Loading forecast…', false);
    document.querySelector('.city-section').scrollIntoView({ behavior: 'smooth', block: 'start' });
    fetchBundle(latitude, longitude)
      .then(function (bundle) {
        renderCurrentPanel(bundle.meteo, bundle.air_quality, cityName);
        renderTimerForecast(bundle.timer);
      })
      .catch(function (error) {
        console.error(error);
        showForecastMessage('Could not load weather for this city.', true);
      });
  }

  function selectCity(lat, lon, cityName) {
    setSelectValue(lat, lon);
    if (window.WeatherMap && window.WeatherMap.flyTo) {
      window.WeatherMap.flyTo(lat, lon);
    }
    fetchWeather(lat, lon, cityName);
  }

  document.getElementById('location-form').addEventListener('submit', function (event) {
    event.preventDefault();
    var selectElement = document.getElementById('city-select');
    var selectedValue = selectElement.value;
    var parts = selectedValue.split(',');
    var cityName = selectElement.options[selectElement.selectedIndex].dataset.cityName || '';
    selectCity(parts[0], parts[1], cityName);
  });

  U.fetchJson('city_coordinates.json')
    .then(function (data) {
      populateCityDropdown(data);
      window.WeatherMap.init();
      return window.WeatherDashboard.loadSnapshot(data);
    })
    .catch(function (error) {
      console.error(error);
      showForecastMessage('Could not load city list. Run ./run.sh locally.', true);
    });

  return { selectCity: selectCity, fetchWeather: fetchWeather };
})();
