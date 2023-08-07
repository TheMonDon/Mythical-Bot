const Command = require('../../base/Command.js');
const { EmbedBuilder } = require('discord.js');

class RerollGiveaway extends Command {
  constructor(client) {
    super(client, {
      name: 'reroll-giveaway',
      description: 'Reroll a giveaway',
      usage: 'reroll-giveaway <Message ID>',
      requiredArgs: 1,
      category: 'Giveaways',
      aliases: ['reroll', 'rerollgiveaway', 'greroll'],
      guildOnly: true,
    });
  }

  async run(msg, args) {
    if (!msg.member.permissions.has('ManageMessages'))
      return this.client.util.errorEmbed(msg, 'You need to have the Manage Nessages permission to reroll giveaways');
    const query = args.join('');

    const authorName = msg.author.discriminator === '0' ? msg.author.username : msg.author.tag;
    const ErrorEmbed = new EmbedBuilder()
      .setAuthor({ name: authorName, iconURL: msg.author.displayAvatarURL() })
      .setColor(msg.settings.embedErrorColor);

    if (isNaN(query)) return this.client.util.errorEmbed(msg, msg.settings.prefix + this.help.usage, 'Incorrect Usage');

    const giveaway = this.client.giveawaysManager.giveaways.find(
      (g) => g.messageId === query && g.guildId === msg.guild.id,
    );

    if (!giveaway) return this.client.util.errorEmbed(msg, `Unable to find a giveaway for \`"${query}"\`.`);
    if (!giveaway.ended) return this.client.util.errorEmbed(msg, 'That giveaway has already ended.');

    // Reroll the giveaway
    this.client.giveawaysManager
      .reroll(giveaway.messageId)
      .then(() => {
        // Success message
        msg.channel.send('Giveaway rerolled!');
      })
      .catch((e) => {
        ErrorEmbed.setTitle(e);
        return msg.channel.send(ErrorEmbed);
      });
  }
}

module.exports = RerollGiveaway;
