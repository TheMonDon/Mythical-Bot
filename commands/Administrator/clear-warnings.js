const Command = require('../../base/Command.js');
const { getMember, getWarns, getTotalPoints } = require('../../util/Util.js');
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
      aliases: ['cw', 'clearwarns', 'clearwarnings', 'cwarns'],
      guildOnly: true
    });
  }

  async run (msg, args) {
    const usage = `Incorrect Usage: ${msg.settings.prefix}Clear-Warnings <user>`;
    const color = msg.settings.embedColor;

    if (!args || args.length < 1) return msg.reply(usage);

    let mem = await await getMember(msg, args.join(' '));

    // Find the user by user ID
    if (!mem) {
      const ID = args[0].replace('<@', '').replace('>', '');
      try {
        mem = await this.client.users.fetch(ID);
      } catch (err) {
        return msg.reply(usage);
      }
    }

    const otherWarns = getWarns(mem.id, msg);
    const previousPoints = getTotalPoints(mem.id, msg);

    if (!otherWarns || otherWarns.length < 1) return msg.channel.send('That user has no warnings.');

    for (const i of otherWarns) {
      db.delete(`servers.${msg.guild.id}.warns.warnings.${i.warnID}`);
    }

    if (previousPoints >= 10) {
      if (!msg.guild.members.me.permissions.has('BanMembers')) return msg.channel.send('The bot does not have BanMembers permission to unban the user.');
      await msg.guild.members.unban(mem.id).catch(() => null);
    }

    const otherCases = otherWarns.map((w) => `\`${w.warnID}\``).join(', ');

    const em = new EmbedBuilder()
      .setDescription(`${msg.author.tag} has cleared all the warnings from a user.`)
      .setColor(color)
      .addFields([
        { name: 'User', value: `${mem} (${mem.id})` },
        { name: 'Cleared Cases', value: otherCases }
      ]);

    const memEmbed = new EmbedBuilder()
      .setDescription(`${msg.author.tag} has cleared all your warnings.`)
      .setColor(color)
      .addFields([
        { name: 'Cleared Cases', value: otherCases },
        { name: 'Issued In', value: msg.guild.name }
      ]);

    mem.send({ embeds: [memEmbed] }).catch(() => null);
    return msg.channel.send({ embeds: [em] });
  }
}

module.exports = ClearWarnings;
