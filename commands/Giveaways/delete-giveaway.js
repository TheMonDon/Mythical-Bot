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
      guildOnly: true,
    });
  }

  async run(msg, args) {
    const usage = `Incorrect Usage: ${msg.settings.prefix}delete-giveaway <Message ID>`;

    if (!msg.member.permissions.has('ManageMessages')) {
      return msg.channel.send(':x: You need to have the Manage Nessages permissions to delete giveaways');
    }

    const query = args.join(' ');

    const authorName = msg.author.discriminator === '0' ? msg.author.username : msg.author.tag;
    const ErrorEmbed = new EmbedBuilder()
      .setAuthor({ name: authorName, iconURL: msg.author.displayAvatarURL() })
      .setTitle('Invalid Message ID')
      .setColor(msg.settings.embedErrorColor);

    if (isNaN(query)) {
      ErrorEmbed.setDescription(usage);
      return msg.channel.send({ embeds: [ErrorEmbed] });
    }

    const giveaway = this.client.giveawaysManager.giveaways.find(
      (g) => g.messageId === query && g.guildId === msg.guild.id,
    );

    // If no giveaway was found
    if (!giveaway) {
      ErrorEmbed.setTitle('Unable to find a giveaway for `' + query + '`.');
      return msg.channel.send(ErrorEmbed);
    }

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
