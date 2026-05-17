function showForecastMessage(message, isError) {
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

  // Function to fetch and display weather data
  function fetchWeather(latitude, longitude) {
    showForecastMessage('Loading forecast...', false);
    var directUrl =
      'https://www.7timer.info/bin/api.pl?lon=' +
      encodeURIComponent(longitude) +
      '&lat=' +
      encodeURIComponent(latitude) +
      '&product=civillight&output=json';
    var proxyUrl =
      '/api/weather?lon=' +
      encodeURIComponent(longitude) +
      '&lat=' +
      encodeURIComponent(latitude);
    var corsUrl =
      'https://api.allorigins.win/raw?url=' + encodeURIComponent(directUrl);

    fetchJson(proxyUrl)
      .catch(function () {
        return fetchJson(corsUrl);
      })
      .then(function (data) {
        displayWeather(data);
      })
      .catch(function (error) {
        console.error('Error fetching weather data:', error);
        showForecastMessage(
          'Could not load weather for this city. Please try again later.',
          true
        );
      });
  }
  
  // Function to display weather data and the corresponding image
  function displayWeather(data) {
    var forecastContainer = document.getElementById('weather-forecast');
    forecastContainer.innerHTML = ''; // Clear previous results

    if (!data || !data.dataseries || !data.dataseries.length) {
      showForecastMessage('No forecast data available for this location.', true);
      return;
    }
  
    // Assuming the API returns an array of 7-day forecast data in data.dataseries
    data.dataseries.forEach(function(forecast, index) {
      if (index < 7) { // Limit to 7 days
        // Create a card for each forecast day
        var card = document.createElement('div');
        card.className = 'weather-card';
  
        var img = document.createElement('img');
        img.src = `images/${forecast.weather}.png`; // Replace with the correct image path
        img.alt = forecast.weather;
        card.appendChild(img);
  
        var content = document.createElement('div');
        content.className = 'weather-card-content';
  
        var date = new Date();
        date.setDate(date.getDate() + index);
        var title = document.createElement('div');
        title.className = 'weather-card-title';
        title.textContent = date.toDateString();
        content.appendChild(title);
  
        // Here we add the weather condition title
        var condition = document.createElement('div');
        condition.className = 'weather-condition';
        condition.textContent = forecast.weather; // Assuming this is how the data is returned
        content.appendChild(condition);
  
        var temp = document.createElement('div');
        temp.textContent = `Temperature: ${forecast.temp2m.min}°C - ${forecast.temp2m.max}°C`;
        content.appendChild(temp);
  
        var wind = document.createElement('div');
        wind.textContent = `Wind: ${forecast.wind10m_max} km/h`;
        content.appendChild(wind);
  
        card.appendChild(content);
        forecastContainer.appendChild(card);
      }
    });
  }
  
  // Event listener for form submission
  document.getElementById('location-form').addEventListener('submit', function(event) {
    event.preventDefault();
    var selectElement = document.getElementById('city-select');
    var selectedValue = selectElement.value;
    var [latitude, longitude] = selectedValue.split(',');
  
    // Fetch and display the weather data
    fetchWeather(latitude, longitude);
  });
  
  // Fetch and populate the dropdown with city data
  fetch('city_coordinates.json')
    .then(response => {
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
      return response.json();
    })
    .then(data => {
      console.log('City data loaded:', data); // Check if data is loaded correctly
      populateCityDropdown(data);
    })
    .catch(error => {
      console.error('Error loading city data:', error);
      showForecastMessage(
        'Could not load city list. Serve this folder over HTTP (see README).',
        true
      );
    });
