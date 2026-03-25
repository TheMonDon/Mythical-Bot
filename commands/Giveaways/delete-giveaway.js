const Command = require('../../base/Command.js');

class DeleteGiveaway extends Command {
  constructor(client) {
    super(client, {
      name: 'delete-giveaway',
      description: 'Delete an active giveaway',
      usage: 'delete-giveaway <Message ID>',
      requiredArgs: 1,
      category: 'Giveaways',
      aliases: ['deletegiveaway', 'delgiveaway', 'gdelete'],
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
      return this.client.util.errorEmbed(msg, `Unable to find a giveaway for \`"${messageID}"\`.`);
    }

    if (giveaway.status === 'ended') {
      return this.client.util.errorEmbed(msg, `Unable to delete a giveaway that has already ended.`);
    }

    await this.client.db.execute(
      /* sql */ `
        DELETE FROM giveaways
        WHERE
          message_id = ?
          AND server_id = ?
      `,
      [messageID, msg.guild.id],
    );

    await this.client.db.execute(
      /* sql */ `
        DELETE FROM giveaway_entries
        WHERE
          message_id = ?
      `,
      [messageID],
    );

    const channel = await this.client.channels.fetch(giveaway.channel_id).catch(() => null);
    if (channel) {
      const message = await channel.messages.fetch(giveaway.message_id).catch(() => null);
      if (message) {
        await message.delete().catch(() => null);
      }
    }

    return msg.channel.send(`Giveaway for **${giveaway.prize}** has been deleted.`);
  }
}

module.exports = DeleteGiveaway;
