const Command = require('../../base/Command.js');
const { EmbedBuilder } = require('discord.js');
const { QuickDB } = require('quick.db');
const moment = require('moment');
const db = new QuickDB();

class WarnInfo extends Command {
  constructor(client) {
    super(client, {
      name: 'warn-info',
      description: 'View the information of a specific case.',
      usage: 'warn-info <caseID>',
      category: 'Moderator',
      permLevel: 'Moderator',
      aliases: ['case', 'warning', 'caseinfo', 'warninginfo', 'warninfo'],
      requiredArgs: 1,
      guildOnly: true,
    });
  }

  async run(msg, args) {
    const caseID = args.join(' ');
    const warn = await db.get(`servers.${msg.guild.id}.warns.warnings.${caseID}`);

    if (!warn) return msg.channel.send("I couldn't find any case with that ID.");

    const { mod, points, reason, user, timestamp, messageURL } = warn;
    const victim = await this.client.users.fetch(user);
    const moderator = await this.client.users.fetch(mod);

    const em = new EmbedBuilder()
      .setAuthor({ name: msg.member.displayName, iconURL: msg.member.displayAvatarURL() })
      .setColor(msg.settings.embedColor)
      .addFields([
        { name: 'Case ID', value: caseID.toString(), inline: true },
        { name: 'User', value: victim.toString(), inline: true },
        { name: 'Points', value: points.toString(), inline: true },
        { name: 'Moderator', value: moderator.toString(), inline: true },
        { name: 'Warned on', value: moment(timestamp).format('LLL'), inline: true },
        { name: 'Message URL', value: messageURL, inline: true },
        { name: 'Reason', value: reason, inline: false },
      ]);
    return msg.channel.send({ embeds: [em] });
  }
}

module.exports = WarnInfo;
