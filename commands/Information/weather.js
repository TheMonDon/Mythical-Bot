const Command = require('../../base/Command.js');
const { EmbedBuilder } = require('discord.js');
const config = require('../../config.js');
const weatherApi = require('openweather-apis');

class Weather extends Command {
  constructor(client) {
    super(client, {
      name: 'weather',
      description: 'Get the weather information from any city',
      usage: 'weather <City Name | Zip Code>',
      requiredArgs: 1,
      category: 'Information',
    });
  }

  async run(msg, text) {
    const city = text.join(' ');
    const ZipCode = /^-?\d+\.?\d*$/;

    // Set the stuff for the weather api
    weatherApi.setLang('en');
    weatherApi.setAPPID(config.OpenWeather);
    weatherApi.setUnits('imperial');

    if (ZipCode.test(city)) {
      weatherApi.setZipCode(city);
    } else {
      weatherApi.setCity(city);
    }

    // GetAllWeather returns a JSON object with all the weather information
    weatherApi.getAllWeather(function (err, JSONObj) {
      if (err) this.client.logger.error(`Weather error: ${err}`);

      if (!JSONObj || JSONObj.length === 0)
        return msg.channel.send(
          `No data was available for the location \`${
            String(city).length > 1959 ? String(city).substring(0, 1956) + '...' : city
          }\``,
        );

      // Convert from imperial to metric
      const metricTemperature = Math.round((((JSONObj.main.temp - 32) * 5) / 9) * 100) / 100;
      const metricFeelsLike = Math.round((((JSONObj.main.feels_like - 32) * 5) / 9) * 100) / 100;
      const metricWindSpeed = Math.round(JSONObj.wind.speed * 1.609344) + ' kph';

      const embed = new EmbedBuilder()
        .setColor(msg.settings.embedColor)
        .setTitle(`Weather in: ${JSONObj.name}`)
        .addFields([
          { name: 'Temperature: ', value: `${JSONObj.main.temp}°F \n${metricTemperature}°C` },
          { name: 'Feels Like: ', value: `${JSONObj.main.feels_like}°F \n${metricFeelsLike}°C` },
          { name: 'Humidity: ', value: `${JSONObj.main.humidity}%` },
        ])
        .setDescription(
          `**Sky info:** ${JSONObj.weather[0].description} \n\n**Wind Info:** ${
            JSONObj.wind.speed + 'mph'
          } (${metricWindSpeed})`,
        );

      return msg.channel.send({ embeds: [embed] });
    });
  }
}

module.exports = Weather;
