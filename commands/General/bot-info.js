const { version: botVersion } = require('../../package.json');
const { version, EmbedBuilder } = require('discord.js');
const Command = require('../../base/Command.js');
const { QuickDB } = require('quick.db');
require('moment-duration-format');
const moment = require('moment');
const db = new QuickDB();

class BotInfo extends Command {
  constructor(client) {
    super(client, {
      name: 'bot-info',
      description: 'Gives some useful bot information',
      usage: 'bot-info',
      category: 'General',
      aliases: ['bi', 'botinfo', 'about', 'info'],
    });
  }

  async run(msg) {
    await this.client.guilds.cache.forEach((g) => g.available && g.members.fetch());
    const botUptime = moment
      .duration(this.client.uptime)
      .format('y[ years][,] M[ months][,] d[ days][,] h[ hours][,] m[ minutes][, and] s[ seconds]');

    const commands = await db.get('global.commands');
    const embed = new EmbedBuilder()
      .setColor(msg.settings.embedColor)
      .setAuthor({ name: this.client.user.username, iconURL: this.client.user.displayAvatarURL() })
      .setThumbnail(this.client.user.displayAvatarURL())
      .addFields([
        { name: 'Uptime', value: botUptime, inline: true },
        { name: 'Ping', value: Math.floor(this.client.ws.ping).toLocaleString(), inline: true },
        { name: 'Guilds', value: this.client.guilds.cache.size.toLocaleString(), inline: true },
        { name: 'Discord.js', value: version, inline: true },
        { name: 'Node', value: process.version, inline: true },
        {
          name: 'RAM Usage',
          value: `${Math.floor(process.memoryUsage().heapUsed / 1024 / 1024).toLocaleString()} MB`,
          inline: true,
        },
        { name: 'Bot Version', value: botVersion, inline: true },
        { name: 'Commands Used', value: commands.toLocaleString(), inline: true },
        {
          name: 'Quick Bits',
          value:
            '[Invite Link](https://cisn.xyz/mythical) \n[Source Code](https://github.com/TheMonDon/Mythical-Bot) \n[Support Server](https://discord.com/invite/XvHzUNZDdR)',
          inline: true,
        },
      ]);

    return msg.channel.send({ embeds: [embed] });
  }
}

module.exports = BotInfo;
