const Command = require('../../base/Command.js');
const { getMember, getWarns, getTotalPoints, cleanString } = require('../../base/Util.js');
const db = require('quick.db');
const DiscordJS = require('discord.js');
const moment = require('moment');

class warnings extends Command {
  constructor (client) {
    super(client, {
      name: 'warnings',
      description: 'View all your warnings, mods+ can view others warnings.',
      usage: 'warnings [member]',
      category: 'General',
      guildOnly: true,
      aliases: ['warns', 'mywarns', 'mycases']
    });
  }

  async run (msg, args, level) {
    const warns = [];
    let mem;

    if (!args || args.length < 1) {
      mem = msg.author;
    } else {
      mem = getMember(msg, args.join(' '));

      // Find the user by user ID
      if (!mem) {
        const ID = args[0].replace('<@', '').replace('>', '');
        try {
          mem = await this.client.users.fetch(ID);
        } catch (err) {
          mem = msg.author;
        }
      }

      mem = level > 0 ? mem : msg.author;
    }

    const otherWarns = getWarns(mem.id, msg);
    const totalPoints = getTotalPoints(mem.id, msg);

    if (otherWarns) {
      let otherCases = otherWarns.length > 0 ? otherWarns.map((w) => `\`${w.warnID}\``).join(', ') : 'No other cases.';
      if (!otherCases) otherCases = 'No other Cases';

      for (const i of otherWarns) {
        const data = db.get(`servers.${msg.guild.id}.warns.warnings.${i.warnID}`);
        warns.push(`\`${i.warnID}\` - ${data.points} pts - ${cleanString(data.reason, 0, 24)} - ` +
          `${moment(Number(data.timestamp)).format('LLL')}`);
      }
    }

    const em = new DiscordJS.MessageEmbed()
      .setAuthor(mem.user ? mem.user.username : mem.usernam, mem.user ? mem.user.displayAvatarURL() : mem.displayAvatarURL())
      .setColor('ORANGE')
      .setTitle(`Total Warning Points: ${totalPoints}`)
      .setDescription(warns.length ? warns.join('\n') : 'This user is squeaky clean.');
    return msg.channel.send({ embeds: [em] });
  }
}

module.exports = warnings;
