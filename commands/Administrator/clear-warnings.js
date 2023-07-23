const Command = require('../../base/Command.js');
const db = require('quick.db');
const { EmbedBuilder } = require('discord.js');

class ClearWarnings extends Command {
  constructor(client) {
    super(client, {
      name: 'clear-warnings',
      description: 'Clear all the warnings of the specific user.',
      usage: 'clear-warnings <User>',
      category: 'Administrator',
      permLevel: 'Administrator',
      aliases: ['clearwarns', 'clearwarnings', 'cwarns'],
      guildOnly: true,
      requiredArgs: 1,
    });
  }

  async run(msg, args) {
    const color = msg.settings.embedColor;

    let mem = await this.client.util.getMember(msg, args.join(' '));

    if (!mem) {
      const ID = args[0].replace(/<@|>/g, '');
      try {
        mem = await this.client.users.fetch(ID);
      } catch (err) {
        return this.client.util.errorEmbedusage(msg, msg.settings.prefix + this.help.usage, 'Invalid Member');
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
        msg.channel.send('The bot does not have Ban Members permission to unban the user.');
      } else {
        await msg.guild.members.unban(mem.id).catch(() => null);
      }
    }

    const otherCases = otherWarns.map((w) => `\`${w.warnID}\``).join(', ');
    const username = msg.author.discriminator === '0' ? msg.author.username : msg.author.tag;

    const userEmbed = new EmbedBuilder()
      .setDescription('Warnings Cleared')
      .setColor(color)
      .addFields([
        { name: 'Moderator', value: `${username} (${msg.author.id})`, inline: true },
        { name: 'Cleared Cases', value: otherCases, inline: true },
        { name: 'Issued In', value: msg.guild.name, inline: true },
      ]);
    const userMessage = await mem.send({ embeds: [userEmbed] }).catch(() => null);

    const logEmbed = new EmbedBuilder()
      .setTitle('Warnings Cleared')
      .setColor(color)
      .addFields([
        { name: 'Moderator', value: `${username} (${msg.author.id})`, inline: true },
        { name: 'User', value: `${mem} (${mem.id})`, inline: true },
        { name: 'Cleared Cases', value: otherCases, inline: true },
      ]);
    if (!userMessage) logEmbed.setFooter({ text: 'Failed to send a DM to the user. (User has DMs disabled)' });

    if (logChan) {
      const channelEmbed = new EmbedBuilder()
        .setTitle('Warnings Cleared')
        .setColor(color)
        .addFields([
          { name: 'User', value: `${mem} (${mem.id})` },
          { name: 'Cleared Cases', value: otherCases },
        ]);

      msg.channel.send({ embeds: [channelEmbed] }).then((embed) => {
        setTimeout(() => embed.delete(), 30000);
      });

      return msg.guild.channels.cache.get(logChan).send({ embeds: [logEmbed] });
    } else {
      return msg.channel.send({ embeds: [logEmbed] });
    }
  }
}

module.exports = ClearWarnings;
