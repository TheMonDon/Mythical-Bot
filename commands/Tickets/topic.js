const Command = require('../../base/Command.js');
const db = require('quick.db');
const { EmbedBuilder } = require('discord.js');
const { DateTime } = require('luxon');
const moment = require('moment');
require('moment-duration-format');

class Topic extends Command {
  constructor (client) {
    super(client, {
      name: 'topic',
      description: 'Change the topic of your ticket',
      usage: 'Topic <New Topic>',
      category: 'Tickets',
      guildOnly: true
    });
  }

  async run (msg, args) {
    const server = msg.guild;
    if (!db.get(`servers.${msg.guild.id}.tickets`)) return msg.channel.send('The ticket system has not been setup in this server.');

    if (!msg.channel.name.startsWith('ticket')) return msg.channel.send('You need to be inside the ticket you want to change the topic of.');

    const cooldown = 300; // 5 minutes
    let channelCooldown = db.get(`servers.${server.id}.tickets.${msg.channel.id}.tCooldown`) || {};

    if (channelCooldown.active) {
      const timeleft = channelCooldown.time - Date.now();
      if (timeleft < 0 || timeleft > (cooldown * 1000)) {
        // this is to check if the bot restarted before their cooldown was set.
        channelCooldown = {};
        channelCooldown.active = false;
        db.set(`servers.${server.id}.tickets.${msg.channel.id}.tCooldown`, channelCooldown);
      } else {
        const tLeft = moment.duration(timeleft)
          .format('y[ years][,] M[ Months]d[ days][,] h[ hours][,] m[ minutes][, and] s[ seconds]'); // format to any format
        const embed = new EmbedBuilder()
          .setColor(msg.settings.embedErrorColor)
          .setAuthor({ name: msg.author.tag, iconURL: msg.author.displayAvatarURL() })
          .setDescription(`You can't change the topic for another ${tLeft}`);
        return msg.channel.send({ embeds: [embed] });
      }
    }

    if (!args) return msg.channel.send(`Incorrect Usage: ${msg.settings.prefix}Topic <New Topic>`);

    let topic = args.join(' ');
    topic = topic.slice(0, 1024);
    if (topic.length === 0) return msg.channel.send(`Incorrect Usage: ${msg.settings.prefix}Topic <New Topic>`);

    const owner = db.get(`servers.${msg.guild.id}.tickets.${msg.channel.id}.owner`);
    if (owner !== msg.author.id) return msg.channel.send('You need to be the owner of the ticket to change the topic.');

    // Logging info
    const output = `${DateTime.now().toLocaleString(DateTime.DATETIME_FULL)} - ${msg.author.tag} has changed the topic to: \n${topic}.`;

    db.push(`servers.${msg.guild.id}.tickets.${msg.channel.id}.chatLogs`, output);
    await msg.channel.setTopic(topic);

    const em = new EmbedBuilder()
      .setTitle('Topic Changed')
      .setColor('#E65DF4')
      .setDescription(`${msg.author} has changed the topic to: \n${topic}`);
    await msg.channel.send({ embeds: [em] });

    channelCooldown.time = Date.now() + (cooldown * 1000);
    channelCooldown.active = true;
    db.set(`servers.${server.id}.tickets.${msg.channel.id}.tCooldown`, channelCooldown);

    setTimeout(() => {
      channelCooldown = { active: false };
      db.set(`servers.${server.id}.tickets.${msg.channe.id}.tCooldown`, channelCooldown);
    }, cooldown * 1000);
  }
}

module.exports = Topic;
