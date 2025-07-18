const Command = require('../../base/Command.js');

class DeleteGiveaway extends Command {
  constructor(client) {
    super(client, {
      name: 'delete-giveaway',
      description: 'Delete a giveaway',
      usage: 'delete-giveaway <Message ID>',
      requiredArgs: 1,
      category: 'Giveaways',
      aliases: ['deletegiveaway', 'delgiveaway', 'gdelete'],
      permLevel: 'Moderator',
      guildOnly: true,
    });
  }

  async run(msg, args) {
    if (!msg.member.permissions.has('ManageMessages')) {
      return this.client.util.errorEmbed(msg, 'You need to have the Manage Messages permission to delete giveaways');
    }
    const query = args.join(' ');

    if (isNaN(query))
      return this.client.util.errorEmbed(msg, msg.settings.prefix + this.help.usage, 'Invalid Message ID');

    const giveaway = this.client.giveawaysManager.giveaways.find(
      (g) => g.messageId === query && g.guildId === msg.guild.id,
    );

    if (!giveaway) return this.client.util.errorEmbed(msg, `Unable to find a giveaway for \`"${query}"\`.`);

    // Throw the 'are you sure?' text at them.
    const response = await this.client.util.awaitReply(
      msg,
      `Are you sure you want to end the giveaway for \`${giveaway.prize}\`?`,
    );

    // If they respond with yes, continue.
    if (this.client.util.yes.includes(response)) {
      // Delete the giveaway
      this.client.giveawaysManager
        .delete(giveaway.messageId)
        .then(() => {
          // Success message
          msg.channel.send('Giveaway deleted!');
        })
        .catch((error) => {
          return this.client.util.errorEmbed(msg, error, 'An error occurred');
        });
    } else if (this.client.util.no.includes(response)) {
      return msg.reply('Action cancelled.');
    }
  }
}

module.exports = DeleteGiveaway;
