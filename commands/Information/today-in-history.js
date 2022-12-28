const Command = require('../../base/Command.js');
const { EmbedBuilder } = require('discord.js');
const fetch = require('node-superfetch');

class TodayInHistory extends Command {
  constructor (client) {
    super(client, {
      name: 'today-in-history',
      description: 'Get information about a date in history',
      usage: 'today-in-history [month] [day]',
      category: 'Information',
      aliases: ['todayinhistory', 'tih']
    });
  }

  async run (msg, text) {
    let month;
    let day;

    // If no text is provided, use the current date
    if (!text || text.length < 1) {
      const date = new Date();
      month = date.getUTCMonth() + 1;
      day = date.getUTCDate();
    } else {
      // Otherwise, parse the text
      month = parseInt(text[0], 10);
      day = parseInt(text[1], 10);
    }

    if (isNaN(month) || (month < 1 && month > 12)) return msg.reply(`Please enter a valid month (1-12) \n${msg.settings.prefix}today-in-history [month] [day]`);

    if (isNaN(day) || (day < 1 && day > 31)) return msg.reply(`Please enter a valid day (1-31) \n${msg.settings.prefix}today-in-history [month] [day]`);

    // If the month and day are valid, format the date
    const date = month && day ? `/${month}/${day}` : '';

    try {
      // Fetch the data from the API
      const { text } = await fetch.get(`http://history.muffinlabs.com/date${date}`);

      // Parse the data
      const body = JSON.parse(text);
      const events = body.data.Events;
      const event = events[Math.floor(Math.random() * events.length)];

      const embed = new EmbedBuilder()
        .setTitle(`On this day (${body.date})...`)
        .setColor(msg.settings.embedColor)
        .setURL(body.url)
        .addFields([{ name: '❯ See More', value: event.links.map(link => `[${link.title}](${link.link.replace(/\)/g, '%29')})`).join(', ') }])
        .setDescription(`${event.year}: ${event.text}`)
        .setTimestamp();

      return msg.channel.send({ embeds: [embed] });
    } catch (err) {
      if (err.status === 404 || err.status === 500) return msg.reply('Invalid date.');
      return msg.reply(`Oh no, an error occurred: \`${err.msg}\`. Try again later!`);
    }
  }
}

module.exports = TodayInHistory;
