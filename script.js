const cityInput = document.getElementById("city");
const searchBtn = document.getElementById("searchBtn");

const suggestionsBox = document.getElementById("suggestions");

const weatherBox = document.getElementById("weather");
const loading = document.getElementById("loading");
const errorBox = document.getElementById("error");

const cityName = document.getElementById("cityName");
const tempEl = document.getElementById("temp");
const descEl = document.getElementById("desc");
const feelEl = document.getElementById("feel");
const humidityEl = document.getElementById("humidity");
const windEl = document.getElementById("wind");
const rainEl = document.getElementById("rain");
const emojiEl = document.getElementById("emoji");
const updateTime = document.getElementById("updateTime");
const forecastEl = document.getElementById("forecast");

// Hava durumu kodları
const weatherCodes = {
    0: ["☀️", "Açık"],
    1: ["🌤️", "Az Bulutlu"],
    2: ["⛅", "Parçalı Bulutlu"],
    3: ["☁️", "Bulutlu"],
    45: ["🌫️", "Sisli"],
    48: ["🌫️", "Yoğun Sis"],
    51: ["🌦️", "Hafif Çise"],
    53: ["🌦️", "Çise"],
    55: ["🌧️", "Yoğun Çise"],
    61: ["🌧️", "Hafif Yağmur"],
    63: ["🌧️", "Yağmur"],
    65: ["🌧️", "Şiddetli Yağmur"],
    71: ["❄️", "Hafif Kar"],
    73: ["❄️", "Kar"],
    75: ["❄️", "Yoğun Kar"],
    80: ["🌦️", "Sağanak"],
    81: ["⛈️", "Kuvvetli Sağanak"],
    82: ["⛈️", "Şiddetli Sağanak"],
    95: ["⛈️", "Fırtına"]
};

// ------------------------
// KOORDİNAT AL (İL / İLÇE)
// ------------------------
async function getCoordinates(query) {

    const res = await fetch(
        `https://geocoding-api.open-meteo.com/v1/search?name=${query}&count=5&language=tr&country=TR`
    );

    const data = await res.json();

    if (!data.results) throw new Error("Yer bulunamadı");

    return data.results;
}

// --------------------------
// HAVA DURUMU VERİLERİNİ ÇEK
// --------------------------
async function getWeather(query) {

    try {

        loading.style.display = "block";
        errorBox.style.display = "none";
        weatherBox.style.opacity = "0.5";

        const results = await getCoordinates(query);
        const place = results[0];

        const url = `https://api.open-meteo.com/v1/forecast?latitude=${place.latitude}&longitude=${place.longitude}&current=temperature_2m,relative_humidity_2m,wind_speed_10m,weather_code,apparent_temperature&daily=weather_code,temperature_2m_max,temperature_2m_min&hourly=precipitation_probability&forecast_days=7&timezone=auto`;

        const res = await fetch(url);
        const data = await res.json();

        const current = data.current;
        const daily = data.daily;

        const code = weatherCodes[current.weather_code] || ["❓", "Bilinmiyor"];
        const rainChance = data.hourly.precipitation_probability[0] || 0;

        cityName.textContent = place.name;
        tempEl.textContent = Math.round(current.temperature_2m);
        descEl.textContent = code[1];
        emojiEl.textContent = code[0];

        feelEl.textContent = Math.round(current.apparent_temperature) + "°C";
        humidityEl.textContent = "%" + current.relative_humidity_2m;
        windEl.textContent = current.wind_speed_10m + " km/s";
        rainEl.textContent = "%" + rainChance;

        // Güncelleme zamanı
        updateTime.textContent = new Date().toLocaleTimeString("tr-TR");

        // 7 GÜNLÜK TAHMİN OLUŞTURMA
        forecastEl.innerHTML = "";
        daily.time.forEach((date, index) => {
            const dateObj = new Date(date);
            const dayName = index === 0 ? "Bugün" : dateObj.toLocaleDateString("tr-TR", { weekday: 'short' });
            const dayCode = weatherCodes[daily.weather_code[index]] || ["❓", "Bilinmiyor"];
            const maxT = Math.round(daily.temperature_2m_max[index]);
            const minT = Math.round(daily.temperature_2m_min[index]);

            forecastEl.innerHTML += `
                <div class="forecast-item">
                    <span class="forecast-day">${dayName}</span>
                    <span class="forecast-emoji">${dayCode[0]}</span>
                    <div class="forecast-temps">
                        <span class="max-temp">${maxT}°</span>
                        <span class="min-temp">${minT}°</span>
                    </div>
                </div>
            `;
        });

        suggestionsBox.innerHTML = "";

        weatherBox.classList.add("fade");
        setTimeout(() => weatherBox.classList.remove("fade"), 400);

    } catch (err) {

        errorBox.style.display = "block";
        errorBox.textContent = err.message;

    } finally {

        loading.style.display = "none";
        weatherBox.style.opacity = "1";
    }
}

// -------------
// AUTO COMPLETE
// -------------
cityInput.addEventListener("input", async () => {

    const q = cityInput.value.trim();

    if (q.length < 2) {
        suggestionsBox.innerHTML = "";
        return;
    }

    const res = await fetch(
        `https://geocoding-api.open-meteo.com/v1/search?name=${q}&count=5&language=tr&country=TR`
    );

    const data = await res.json();

    if (!data.results) {
        suggestionsBox.innerHTML = "";
        return;
    }

    suggestionsBox.innerHTML = data.results.map(item => `
        <div onclick="selectCity('${item.name}')">
            ${item.name} ${item.admin1 ? "- " + item.admin1 : ""}
        </div>
    `).join("");
});

// Şehir
window.selectCity = function (name) {
    cityInput.value = name;
    suggestionsBox.innerHTML = "";
};

// "Arama butonu" dışında bir yere tıklandığında liste kapanır.
document.addEventListener("click", (e) => {
    if (!e.target.closest(".search")) {
        suggestionsBox.innerHTML = "";
    }
});

// "Sağ tık ile menü açma" özelliği devre dışı
document.addEventListener('contextmenu', (event) => {
    event.preventDefault();
});

// -------------
// BUTON + ENTER
// -------------
searchBtn.addEventListener("click", () => {
    getWeather(cityInput.value);
});

cityInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") {
        getWeather(cityInput.value);
    }
});

// -----------------------------------
// HER DAKİKA BAŞI OTOMATİK GÜNCELLEME
// -----------------------------------
function autoUpdateWeather() {

    function schedule() {

        const now = new Date();

        const msToNextMinute =
            (60 - now.getSeconds()) * 1000 - now.getMilliseconds();

        setTimeout(() => {

            if (cityInput.value.trim()) {
                getWeather(cityInput.value);
            }

            setInterval(() => {
                if (cityInput.value.trim()) {
                    getWeather(cityInput.value);
                }
            }, 60000);

        }, msToNextMinute);
    }

    schedule();
}

autoUpdateWeather();

// ---------------------
// AÇILIŞ EKRANI - AYDIN
// ---------------------
getWeather("Aydın");