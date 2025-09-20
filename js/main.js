// Function to populate the dropdown with city options from the JSON data
function populateCityDropdown(cities) {
    var select = document.getElementById('city-select');
    cities.forEach(function(city) {
      var option = document.createElement('option');
      option.value = city.latitude + ',' + city.longitude;
      option.textContent = city.city + ', ' + city.country;
      select.appendChild(option);
    });
  }
  
  // Function to fetch and display weather data
  function fetchWeather(latitude, longitude) {
    // Please replace with your own API URL and key if required
    var apiUrl = `https://www.7timer.info/bin/api.pl?lon=${longitude}&lat=${latitude}&product=civillight&output=json`;

  
    fetch(apiUrl)
      .then(response => {
        if (!response.ok) {
          throw new Error(`HTTP error! Status: ${response.status}`);
        }
        return response.json();
      })
      .then(data => {
        displayWeather(data);
      })
      .catch(error => {
        console.error('Error fetching weather data:', error);
      });
  }
  
  // Function to display weather data and the corresponding image
  function displayWeather(data) {
    var forecastContainer = document.getElementById('weather-forecast');
    forecastContainer.innerHTML = ''; // Clear previous results
  
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
    });
  
document.getElementById('location-form').addEventListener('submit', function(event) {
  event.preventDefault();
  console.log("Form submitted"); // Debug
  var selectElement = document.getElementById('city-select');
  console.log("Selected value:", selectElement.value);
  ...
});
