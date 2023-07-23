const Command = require('../../base/Command.js');
const db = require('quick.db');
const { EmbedBuilder } = require('discord.js');
const moment = require('moment');

class Warnings extends Command {
  constructor(client) {
    super(client, {
      name: 'warnings',
      description: 'View all your warnings. Moderators can view others warnings.',
      usage: 'Warnings [user]',
      category: 'General',
      aliases: ['warns', 'mywarns', 'mycases'],
      guildOnly: true,
    });
  }

  async run(msg, args, level) {
    const warns = [];
    let mem;

    if (args?.length < 1) {
      mem = msg.author;
    } else {
      mem = await this.client.util.getMember(msg, args.join(' '));

      // Find the user by user ID
      if (!mem) {
        const ID = args[0].replace(/<@|>/g, '');
        try {
          mem = await this.client.users.fetch(ID);
        } catch (err) {
          mem = msg.author;
        }
      }

      mem = level > 0 ? mem : msg.author;
    }

    const otherWarns = this.client.util.getWarns(mem.id, msg);
    const totalPoints = this.client.util.getTotalPoints(mem.id, msg);

    if (otherWarns) {
      let otherCases = otherWarns.length > 0 ? otherWarns.map((w) => `\`${w.warnID}\``).join(', ') : 'No other cases.';
      if (!otherCases) otherCases = 'No other Cases';

      for (const i of otherWarns) {
        const data = db.get(`servers.${msg.guild.id}.warns.warnings.${i.warnID}`);
        warns.push(
          `\`${i.warnID}\` - ${data.points} pts - ${this.client.util.limitStringLength(data.reason, 0, 24)} - ` +
            `${moment(Number(data.timestamp)).format('LLL')}`,
        );
      }
    }

    mem = mem.user ? mem.user : mem;
    const em = new EmbedBuilder()
      .setAuthor({ name: mem.username, iconURL: mem.displayAvatarURL() })
      .setColor('#FFA500')
      .setTitle(`Total Warning Points: ${totalPoints}`)
      .setDescription(warns.length ? warns.join('\n') : 'This user is squeaky clean.');
    return msg.channel.send({ embeds: [em] });
  }
}

module.exports = Warnings;
