const Command = require('../../base/Command.js');
const DiscordJS = require('discord.js');
const weather = require('weather-js');

class Weather extends Command {
  constructor (client) {
    super(client, {
      name: 'weather',
      description: 'Get the weather information from any city',
      usage: 'weather',
      category: 'Information',
      aliases: ['temp']
    });
  }

  async run (msg, text) {
    const city = text.join(' ');

    if (!city) return msg.channel.send('Please enter a city to get the weather in!');

    weather.find({
      search: city,
      degreeType: 'F'
    }, function (err, result) {
      if (err) console.log(err);

      if (!result || result.length === 0) {
        return msg.channel.send(`No data was available for the location \`${(String(city).length > 1959) ? String(city).substring(0, 1956) + '...' : city}\``);
      } else {
        const dc = Math.round(((result[0].current.temperature - 32) * 5 / 9) * 100) / 100;
        const dc2 = Math.round(((result[0].current.feelslike - 32) * 5 / 9) * 100) / 100;
        const b4 = result[0].current.winddisplay.split('mph');
        const a4 = Math.round(b4[0] * 1.609344) + ' kph' + b4[1];

        const embed = new DiscordJS.EmbedBuilder()
          .setColor('#0099CC')
          .setTitle(`Weather in: ${result[0].location.name}`)
          .setThumbnail(result[0].current.imageUrl)
          .addFields([
            { name: 'Temperature: ', value: `${result[0].current.temperature}°F \n${dc}°C` },
            { name: 'Feels Like: ', value: `${result[0].current.feelslike}°F \n${dc2}°C` },
            { name: 'Humidity: ', value: `${result[0].current.humidity}%` }
          ])
          .setDescription(`**Sky weather:** ${result[0].current.skytext} \n\n**Wind info:** ${result[0].current.winddisplay} (${a4})`);
        return msg.channel.send({ embeds: [embed] });
      }
    });
  }
}

module.exports = Weather;
