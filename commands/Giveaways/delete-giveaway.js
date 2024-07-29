const Command = require('../../base/Command.js');
const { EmbedBuilder } = require('discord.js');

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
    if (!msg.member.permissions.has('ManageMessages'))
      return this.client.util.errorEmbed(msg, 'You need to have the Manage Messages permission to delete giveaways');
    const query = args.join(' ');

    const ErrorEmbed = new EmbedBuilder()
      .setAuthor({ name: msg.author.tag, iconURL: msg.author.displayAvatarURL() })
      .setColor(msg.settings.embedErrorColor);

    if (isNaN(query))
      return this.client.util.errorEmbed(msg, msg.settings.prefix + this.help.usage, 'Invalid Message ID');

    const giveaway = this.client.giveawaysManager.giveaways.find(
      (g) => g.messageId === query && g.guildId === msg.guild.id,
    );

    if (!giveaway) return this.client.util.errorEmbed(msg, `Unable to find a giveaway for \`"${query}"\`.`);

    // Delete the giveaway
    this.client.giveawaysManager
      .delete(giveaway.messageId)
      .then(() => {
        // Success message
        msg.channel.send('Giveaway deleted!');
      })
      .catch((e) => {
        ErrorEmbed.setTitle(e);
        return msg.channel.send(ErrorEmbed);
      });
  }
}

module.exports = DeleteGiveaway;
