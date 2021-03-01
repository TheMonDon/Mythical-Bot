const Command = require('../../base/Command.js');
const DiscordJS = require('discord.js');
const fetch = require('node-superfetch');

class tih extends Command {
  constructor (client) {
    super(client, {
      name: 'today-in-history',
      description: 'Get information about a date in history',
      usage: 'today-in-history',
      category: 'Information',
      aliases: ['todayinhistory', 'tih']
    });
  }

  async run (msg, text) {
    const p = msg.settings.prefix;

    let month;
    let day;
    if (!text || text.length < 1) {
      const date = new Date();
      month = date.getUTCMonth() + 1;
      day = date.getUTCDate();
    } else {
      month = parseInt(text[0]);
      day = parseInt(text[1]);
    }

    if (isNaN(month) || (month < 1 && month > 12)) {
      return msg.reply(`please enter a valid month (1-12) \n ${p}today-in-history <month> <day>`);
    }

    if (isNaN(day) || (day < 1 && day > 31)) {
      return msg.reply(`please enter a valid date (1-31) \n ${p}today-in-history <month> <day>`);
    }

    const date = month && day ? `/${month}/${day}` : '';
    try {
      const { text } = await fetch.get(`http://history.muffinlabs.com/date${date}`);
      const body = JSON.parse(text);
      const events = body.data.Events;
      const event = events[Math.floor(Math.random() * events.length)];
      const embed = new DiscordJS.MessageEmbed()
        .setColor(0x9797FF)
        .setURL(body.url)
        .setTitle(`On this day (${body.date})...`)
        .setTimestamp()
        .setDescription(`${event.year}: ${event.text}`)
        .addField('❯ See More', event.links.map(link => `[${link.title}](${link.link.replace(/\)/g, '%29')})`).join(', '));

      return msg.channel.send(embed);
    } catch (err) {
      if (err.status === 404 || err.status === 500) return msg.reply('Invalid date.');
      return msg.reply(`Oh no, an error occurred: \`${err.msg}\`. Try again later!`);
    }
  }
}

module.exports = tih;
