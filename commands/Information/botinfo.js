const Command = require('../../base/Command.js');
const DiscordJS = require('discord.js');
const moment = require('moment');
require('moment-duration-format');
const db = require('quick.db');

class Stats extends Command {
  constructor (client) {
    super(client, {
      name: 'botinfo',
      description: 'Gives some useful this.client information',
      usage: 'botinfo',
      category: 'Information',
      aliases: ['bi']
    });
  }

  async run (msg) { // eslint-disable-line no-unused-vars
    await this.client.guilds.cache.forEach((g) => g.available && g.members.fetch());
    const botuptime = moment.duration(this.client.uptime).format('y[ years][,] M[ Months]d[ days][,] h[ hours][,] m[ minutes][, and] s[ seconds]');
      
    const embed = new DiscordJS.MessageEmbed()
      .setColor('#2ecc71')
      .setAuthor(this.client.user.username, this.client.user.displayAvatarURL())
      .setThumbnail(this.client.user.displayAvatarURL())
      .addField('Uptime', botuptime, true)
      .addField('Ping', Math.floor(this.client.ws.ping).toLocaleString(), true)
      .addField('Guilds', this.client.guilds.cache.array().length.toLocaleString(), true)
      .addField('Channels', this.client.channels.cache.size.toLocaleString(), true)
      .addField('Users', this.client.users.cache.size.toLocaleString(), true)
      .addField('Commands Used', db.get('global.commands'), true)
      .addField('Discord.js', DiscordJS.version, true)
      .addField('Node', process.version, true)
      .addField('RAM Usage', `${Math.floor((process.memoryUsage().heapUsed / 1024)/1024).toLocaleString()} MB`, true);
    msg.channel.send(embed);
  }
}

module.exports = Stats;
