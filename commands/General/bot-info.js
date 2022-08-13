const Command = require('../../base/Command.js');
const { version, EmbedBuilder } = require('discord.js');
const moment = require('moment');
require('moment-duration-format');
const db = require('quick.db');
const pjson = require('../../package.json');

class BotInfo extends Command {
  constructor (client) {
    super(client, {
      name: 'bot-info',
      description: 'Gives some useful bot information',
      usage: 'bot-info',
      category: 'General',
      aliases: ['bi', 'botinfo', 'about']
    });
  }

  async run (msg) {
    await this.client.guilds.cache.forEach((g) => g.available && g.members.fetch());
    const botuptime = moment.duration(this.client.uptime).format('y[ years][,] M[ months][,] d[ days][,] h[ hours][,] m[ minutes][, and] s[ seconds]');

    const embed = new EmbedBuilder()
      .setColor('#2ecc71')
      .setAuthor({ name: this.client.user.username, iconURL: this.client.user.displayAvatarURL() })
      .setThumbnail(this.client.user.displayAvatarURL())
      .addFields([
        { name: 'Uptime', value: botuptime, inline: true },
        { name: 'Ping', value: Math.floor(this.client.ws.ping).toLocaleString(), inline: true },
        { name: 'Guilds', value: this.client.guilds.cache.size.toLocaleString(), inline: true },
        { name: 'Commands Used', value: db.get('global.commands').toLocaleString(), inline: false },
        { name: 'Discord.js', value: version, inline: true },
        { name: 'Node', value: process.version, inline: true },
        { name: 'RAM Usage', value: `${Math.floor((process.memoryUsage().heapUsed / 1024) / 1024).toLocaleString()} MB`, inline: true },
        { name: 'Bot Version', value: pjson.version, inline: true },
        { name: 'Invite', value: '[https://cisn.xyz/mythical](https://cisn.xyz/mythical)', inline: true },
        { name: 'Source Code', value: '[Github](https://github.com/TheMonDon/Mythical-Bot)', inline: true }
      ]);
    return msg.channel.send({ embeds: [embed] });
  }
}

module.exports = BotInfo;
