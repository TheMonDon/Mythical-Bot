const Command = require('../../base/Command.js');
const { EmbedBuilder } = require('discord.js');

class EndGiveaway extends Command {
  constructor(client) {
    super(client, {
      name: 'end-giveaway',
      description: 'End an active giveaway',
      usage: 'end-giveaway <Message ID>',
      requiredArgs: 1,
      category: 'Giveaways',
      aliases: ['endgiveaway', 'giveawayend'],
      permLevel: 'Administrator',
      guildOnly: true,
    });
  }

  async run(msg, args) {
    const messageID = args.join(' ');

    if (isNaN(messageID)) {
      return this.client.util.errorEmbed(msg, msg.settings.prefix + this.help.usage, 'Invalid Message ID');
    }

    const [giveawayRows] = await this.client.db.execute(
      /* sql */ `
        SELECT
          *
        FROM
          giveaways
        WHERE
          message_id = ?
          AND server_id = ?
      `,
      [messageID, msg.guild.id],
    );

    const giveaway = giveawayRows[0];

    if (!giveaway) {
      return this.client.util.errorEmbed(msg, `Unable to find a giveaway for \`"${messageID}"\`.`, 'Invalid Giveaway');
    }
    if (giveaway.status === 'ended') {
      return this.client.util.errorEmbed(msg, 'Only active giveaways can be ended!', 'Invalid Giveaway Status');
    }

    await this.client.db.execute(
      /* sql */ `
        UPDATE giveaways
        SET
          end_at = ?
        WHERE
          message_id = ?
          AND server_id = ?
      `,
      [Date.now(), messageID, msg.guild.id],
    );

    const embed = new EmbedBuilder()
      .setTitle('Giveaway Ended')
      .setDescription(`The giveaway for **${giveaway.prize}** has been ended.\nWinners will be announced shortly.`)
      .setColor(msg.settings.embedSuccessColor)
      .setTimestamp();

    return msg.channel.send({ embeds: [embed] });
  }
}

module.exports = EndGiveaway;
