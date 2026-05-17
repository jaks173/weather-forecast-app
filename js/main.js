var WMO_LABELS = { 0: 'Clear', 1: 'Mainly clear', 2: 'Partly cloudy', 3: 'Overcast', 45: 'Fog', 48: 'Rime fog', 61: 'Rain', 63: 'Rain', 71: 'Snow', 80: 'Showers', 95: 'Thunderstorm' };
var TIMER_ICON = { clear: 'clear', pcloudy: 'cloudy', cloudy: 'cloudy', rain: 'rain', snow: 'snow', fog: 'fog', wind: 'windy' };

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
  if (v == null) return 'aqi-unknown';
  var n = Number(v);
  if (n <= 50) return 'aqi-good';
  if (n <= 100) return 'aqi-moderate';
  if (n <= 150) return 'aqi-sensitive';
  if (n <= 200) return 'aqi-unhealthy';
  return 'aqi-very-bad';
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
function fmt(v, s) { return v == null ? '—' : Math.round(v) + (s || ''); }

function showForecastMessage(message, isError) {
  document.getElementById('current-panel').classList.add('hidden');
  var forecastContainer = document.getElementById('weather-forecast');
  forecastContainer.innerHTML = '';
  var el = document.createElement('p');
  el.className = isError ? 'forecast-error' : 'forecast-loading';
  el.textContent = message;
  forecastContainer.appendChild(el);
}

// Function to populate the dropdown with city options from the JSON data
function populateCityDropdown(cities) {
    var select = document.getElementById('city-select');
    var sorted = cities.slice().sort(function (a, b) {
      var countryCmp = (a.country || '').localeCompare(b.country || '');
      if (countryCmp !== 0) return countryCmp;
      return (a.city || '').localeCompare(b.city || '');
    });
    sorted.forEach(function(city) {
      var option = document.createElement('option');
      option.value = city.latitude + ',' + city.longitude;
      option.textContent = city.city + ', ' + (city.country || '');
      option.dataset.cityName = city.city;
      select.appendChild(option);
    });
  }
  
  function fetchJson(url) {
    return fetch(url).then(function (response) {
      if (!response.ok) {
        throw new Error('HTTP error! Status: ' + response.status);
      }
      return response.json();
    });
  }

  function openMeteoDirect(lat, lon) {
    var m = 'https://api.open-meteo.com/v1/forecast?latitude=' + lat + '&longitude=' + lon +
      '&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m' +
      '&daily=weather_code,temperature_2m_max,temperature_2m_min,wind_speed_10m_max&timezone=auto&forecast_days=7';
    var a = 'https://air-quality-api.open-meteo.com/v1/air-quality?latitude=' + lat + '&longitude=' + lon +
      '&current=us_aqi,pm2_5,pm10,european_aqi';
    return Promise.all([fetchJson(m), fetchJson(a)]).then(function (p) {
      return { meteo: p[0], air_quality: p[1] };
    });
  }

  function timerDirect(lat, lon) {
    var direct = 'https://www.7timer.info/bin/api.pl?lon=' + lon + '&lat=' + lat + '&product=civillight&output=json';
    return fetchJson('/api/weather?lon=' + lon + '&lat=' + lat).catch(function () {
      return fetchJson('https://api.allorigins.win/raw?url=' + encodeURIComponent(direct));
    });
  }

  function fetchBundle(lat, lon) {
    return fetchJson('/api/bundle?lon=' + lon + '&lat=' + lat).then(function (b) {
      return { timer: b.timer, meteo: b.meteo, air_quality: b.air_quality };
    }).catch(function () {
      return Promise.all([timerDirect(lat, lon), openMeteoDirect(lat, lon)]).then(function (p) {
        return { timer: p[0], meteo: p[1].meteo, air_quality: p[1].air_quality };
      });
    });
  }


  function renderCurrentPanel(meteo, aq, cityName) {
    var panel = document.getElementById("current-panel");
    panel.classList.remove("hidden");
    panel.innerHTML = "";
    var cur = (meteo && meteo.current) || {};
    var aqCur = (aq && aq.current) || {};
    var usAqi = aqCur.us_aqi;
    var code = cur.weather_code;
    var el = document.createElement("d" + "iv");

    var wCard = el.cloneNode(false);
    wCard.className = "panel-card";
    var h2 = document.createElement("h2");
    h2.textContent = "Now" + (cityName ? " · " + cityName : "");
    wCard.appendChild(h2);

    var row = document.createElement("d" + "iv");
    row.className = "current-main";
    var img = document.createElement("img");
    img.src = "images/" + wmoIcon(code) + ".png";
    img.alt = wmoLabel(code);
    img.width = 64;
    img.height = 64;
    row.appendChild(img);

    var col = document.createElement("d" + "iv");
    var temp = document.createElement("d" + "iv");
    temp.className = "current-temp";
    temp.innerHTML = fmt(cur.temperature_2m, "°C") + ' <span>feels ' + fmt(cur.apparent_temperature, "°C") + "</span>";
    col.appendChild(temp);
    var desc = document.createElement("d" + "iv");
    desc.className = "current-desc";
    desc.textContent = wmoLabel(code);
    col.appendChild(desc);
    var meta = document.createElement("d" + "iv");
    meta.className = "current-meta";
    meta.innerHTML = "<span>Humidity " + fmt(cur.relative_humidity_2m, "%") + "</span><span>Wind " + fmt(cur.wind_speed_10m, " km/h") + "</span>";
    col.appendChild(meta);
    row.appendChild(col);
    wCard.appendChild(row);
    panel.appendChild(wCard);

    var aCard = document.createElement("d" + "iv");
    aCard.className = "panel-card";
    var ah = document.createElement("h2");
    ah.textContent = "Air quality";
    aCard.appendChild(ah);
    var badge = document.createElement("d" + "iv");
    badge.className = "aqi-badge " + aqiClass(usAqi);
    badge.textContent = "US AQI " + (usAqi != null ? usAqi : "—") + " · " + aqiLabel(usAqi);
    aCard.appendChild(badge);
    var grid = document.createElement("d" + "iv");
    grid.className = "aqi-grid";
    [["PM2.5", aqCur.pm2_5], ["PM10", aqCur.pm10], ["EU AQI", aqCur.european_aqi]].forEach(function (pair) {
      var cell = document.createElement("d" + "iv");
      cell.innerHTML = "<strong>" + pair[0] + "</strong>" + fmt(pair[1], "");
      grid.appendChild(cell);
    });
    aCard.appendChild(grid);
    panel.appendChild(aCard);
  }

  function renderTimerForecast(timer) {
    var forecastContainer = document.getElementById("weather-forecast");
    forecastContainer.innerHTML = "";
    if (!timer || !timer.dataseries || !timer.dataseries.length) {
      var p = document.createElement("p");
      p.className = "forecast-error";
      p.textContent = "7-day forecast unavailable for this location.";
      forecastContainer.appendChild(p);
      return;
    }
    var heading = document.createElement("p");
    heading.className = "forecast-heading";
    heading.textContent = "7-day outlook (7Timer!)";
    forecastContainer.appendChild(heading);
    timer.dataseries.forEach(function (forecast, index) {
      if (index >= 7) return;
      var card = document.createElement("d" + "iv");
      card.className = "weather-card";
      var icon = TIMER_ICON[forecast.weather] || "cloudy";
      var img = document.createElement("img");
      img.src = "images/" + icon + ".png";
      img.alt = forecast.weather;
      card.appendChild(img);
      var content = document.createElement("d" + "iv");
      content.className = "weather-card-content";
      var date = new Date();
      date.setDate(date.getDate() + index);
      var title = document.createElement("d" + "iv");
      title.className = "weather-card-title";
      title.textContent = date.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
      content.appendChild(title);
      var condition = document.createElement("d" + "iv");
      condition.className = "weather-condition";
      condition.textContent = forecast.weather;
      content.appendChild(condition);
      var temp = document.createElement("d" + "iv");
      temp.className = "temp";
      temp.textContent = forecast.temp2m.min + "° – " + forecast.temp2m.max + "°C";
      content.appendChild(temp);
      var wind = document.createElement("d" + "iv");
      wind.textContent = "Wind " + forecast.wind10m_max + " km/h";
      content.appendChild(wind);
      card.appendChild(content);
      forecastContainer.appendChild(card);
    });
  }

  function fetchWeather(latitude, longitude, cityName) {
    showForecastMessage("Loading forecast, conditions, and air quality…", false);
    fetchBundle(latitude, longitude)
      .then(function (bundle) {
        renderCurrentPanel(bundle.meteo, bundle.air_quality, cityName);
        renderTimerForecast(bundle.timer);
      })
      .catch(function (error) {
        console.error(error);
        showForecastMessage("Could not load weather for this city. Please try again later.", true);
      });
  }

  document.getElementById("location-form").addEventListener("submit", function (event) {
    event.preventDefault();
    var selectElement = document.getElementById("city-select");
    var selectedValue = selectElement.value;
    var parts = selectedValue.split(",");
    var cityName = selectElement.options[selectElement.selectedIndex].dataset.cityName || "";
    fetchWeather(parts[0], parts[1], cityName);
  });

  fetch("city_coordinates.json")
    .then(function (response) {
      if (!response.ok) throw new Error("HTTP " + response.status);
      return response.json();
    })
    .then(function (data) {
      populateCityDropdown(data);
    })
    .catch(function (error) {
      console.error("Error loading city data:", error);
      showForecastMessage("Could not load city list. Serve this folder over HTTP (see README).", true);
    });
