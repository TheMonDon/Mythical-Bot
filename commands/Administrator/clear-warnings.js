const Command = require('../../base/Command.js');
const db = require('quick.db');
const { EmbedBuilder } = require('discord.js');

class ClearWarnings extends Command {
  constructor (client) {
    super(client, {
      name: 'clear-warnings',
      description: 'Clear all the warnings of the specific user.',
      usage: 'Clear-Warnings <User>',
      category: 'Administrator',
      permLevel: 'Administrator',
      aliases: ['clearwarns', 'clearwarnings', 'cwarns'],
      guildOnly: true
    });
  }

  async run (msg, args) {
    const usage = `Incorrect Usage: ${msg.settings.prefix}Clear-Warnings <user>`;
    const color = msg.settings.embedColor;

    if (!args || args.length < 1) return msg.reply(usage);

    let mem = await this.client.util.getMember(msg, args.join(' '));

    // Find the user by user ID
    if (!mem) {
      const ID = args[0].replace('<@', '').replace('>', '');
      try {
        mem = await this.client.users.fetch(ID);
      } catch (err) {
        return msg.reply(usage);
      }
    }

    const otherWarns = this.client.util.getWarns(mem.id, msg);
    const previousPoints = this.client.util.getTotalPoints(mem.id, msg);
    const logChan = db.get(`servers.${msg.guild.id}.warns.channel`);

    if (!otherWarns || otherWarns.length < 1) return msg.channel.send('That user has no warnings.');

    for (const i of otherWarns) {
      db.delete(`servers.${msg.guild.id}.warns.warnings.${i.warnID}`);
    }

    if (previousPoints >= 10) {
      if (!msg.guild.members.me.permissions.has('BanMembers')) {
        msg.channel.send('The bot does not have BanMembers permission to unban the user.');
      } else {
        await msg.guild.members.unban(mem.id).catch(() => null);
      }
    }

    const otherCases = otherWarns.map((w) => `\`${w.warnID}\``).join(', ');

    const userEmbed = new EmbedBuilder()
      .setDescription('Warnings Cleared')
      .setColor(color)
      .addFields([
        { name: 'Moderator', value: `${msg.author.tag} (${msg.author.id})`, inline: true },
        { name: 'Cleared Cases', value: otherCases, inline: true },
        { name: 'Issued In', value: msg.guild.name, inline: true }
      ]);
    const userMessage = await mem.send({ embeds: [userEmbed] }).catch(() => null);

    const logEmbed = new EmbedBuilder()
      .setTitle('Warnings Cleared')
      .setColor(color)
      .addFields([
        { name: 'Moderator', value: `${msg.author.tag} (${msg.author.id})`, inline: true },
        { name: 'User', value: `${mem} (${mem.id})`, inline: true },
        { name: 'Cleared Cases', value: otherCases, inline: true }
      ]);
    if (!userMessage) logEmbed.setFooter({ text: 'Failed to send a DM to the user. (User has DMs disabled)' });

    if (logChan) {
      const channelEmbed = new EmbedBuilder()
        .setTitle('Warnings Cleared')
        .setColor(color)
        .addFields([
          { name: 'User', value: `${mem} (${mem.id})` },
          { name: 'Cleared Cases', value: otherCases }
        ]);

      msg.channel.send({ embeds: [channelEmbed] })
        .then(embed => {
          setTimeout(() => embed.delete(), 30000);
        });

      return msg.guild.channels.cache.get(logChan).send({ embeds: [logEmbed] });
    } else {
      return msg.channel.send({ embeds: [logEmbed] });
    }
  }
}

module.exports = ClearWarnings;
