const db = require('quick.db');
const DiscordJS = require('discord.js');

module.exports = class {
  constructor (client) {
    this.client = client;
  }

  async run (channel, newChannel) {
    const logChan = db.get(`servers.${channel.guild.id}.logs.channel`);
    if (!logChan) return;

    const logSys = db.get(`servers.${channel.guild.id}.logs.log_system.channel-updated`);
    if (logSys !== 'enabled') return;
    if (channel.name.startsWith('ticket-')) return;

    const chans = db.get(`servers.${channel.guild.id}.logs.noLogChans`) || [];
    if (chans.includes(channel.id)) return;

    const logChannel = channel.guild.channels.cache.get(logChan);
    if (!logChannel.permissionsFor(this.client.user.id).has('SEND_MESSAGES')) return;

    if (channel === newChannel) return;

    if (channel.parent !== newChannel.parent && channel.name !== newChannel.name && channel.topic !== newChannel.topic) {
      let catUp;
      if (!channel.parent && newChannel.parent) {
        catUp = `Updated: ✅ \n New Category: ${newChannel.parent.name}`;
      } else if (!channel.parent && !newChannel.parent) {
        catUp = 'Updated: ❌';
      } else if (channel.parent && !newChannel.parent) {
        catUp = 'Updated: ✅ \n New Category: `None`';
      } else if (channel.parent !== newChannel.parent) {
        catUp = `Updated: ✅ \n New Category: ${newChannel.parent.name}`;
      } else if (channel.parent === newChannel.parent) {
        catUp = 'Updated: ❌';
      }

      const embed = new DiscordJS.MessageEmbed()
        .setTitle(`Channel ${channel.name} Updated`)
        .setColor('#EE82EE')
        .addField('Name', (channel.name === newChannel.name) ? 'Updated: ❌' : `Updated: ✅ \n New Name: ${newChannel.name}`, true)
        .addField('Topic', (channel.topic === newChannel.topic) ? 'Updated: ❌' : `Updated: ✅ \n New Topic: ${newChannel.topic}`, true)
        .addField('Is NSFW?', (newChannel.nsfw) ? '✅' : '❌', true)
        .addField('Category', catUp, true)
        .setFooter({ text: `ID: ${newChannel.id}` })
        .setTimestamp();

      channel.guild.channels.cache.get(logChan).send({ embeds: [embed] });
      db.add(`servers.${channel.guild.id}.logs.channel-updated`, 1);
      db.add(`servers.${channel.guild.id}.logs.all`, 1);
    }
  }
};
