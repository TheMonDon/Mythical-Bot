const Command = require('../../base/Command.js');
const { getMember, getWarns, getTotalPoints } = require('../../util/Util.js');
const db = require('quick.db');
const DiscordJS = require('discord.js');

class DeleteWarning extends Command {
  constructor (client) {
    super(client, {
      name: 'clear-warnings',
      description: 'Clear all the warnings of a specific user.',
      usage: 'clear-warnings <user>',
      category: 'Administrator',
      guildOnly: true,
      permLevel: 'Administrator',
      aliases: ['cw', 'clearwarns', 'clearwarnings', 'cwarns']
    });
  }

  async run (msg, args) {
    let mem;
    const usage = `Incorrect Usage: ${msg.settings.prefix}clear-warnings <user>`;

    if (!args || args.length < 1) return msg.channel.send(usage);

    mem = getMember(msg, args.join(' '));

    // Find the user by user ID
    if (!mem) {
      const ID = args[0].replace('<@', '').replace('>', '');
      try {
        mem = await this.client.users.fetch(ID);
      } catch (err) {
        return msg.channel.send(usage);
      }
    }

    const otherWarns = getWarns(mem.id, msg);
    const previousPoints = getTotalPoints(mem.id, msg);

    if (!otherWarns || otherWarns.length < 1) return msg.channel.send('That user has no warnings.');

    for (const i of otherWarns) {
      db.delete(`servers.${msg.guild.id}.warns.warnings.${i.warnID}`);
    }

    if (previousPoints >= 10) {
      if (!msg.guild.me.permissions.has('BAN_MEMBERS')) return msg.channel.send('The bot does not have Ban_Members permission to unban the user.');
      await msg.guild.members.unban(mem.id).catch(() => null);
    }

    const otherCases = otherWarns.map((w) => `\`${w.warnID}\``).join(', ');

    const em = new DiscordJS.MessageEmbed()
      .setDescription(`${msg.author.tag} has cleared all the warnings from a user.`)
      .setColor('ORANGE')
      .addField('From User', `${mem} (${mem.id})`, true)
      .addField('Cleared Cases', otherCases, true);
    mem.send(em).catch(() => null);
    return msg.channel.send({ embeds: [em] });
  }
}

module.exports = DeleteWarning;
