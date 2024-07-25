const Command = require('../../base/Command.js');
const { EmbedBuilder } = require('discord.js');
const { QuickDB } = require('quick.db');
const db = new QuickDB();

class DeleteItem extends Command {
  constructor(client) {
    super(client, {
      name: 'delete-item',
      category: 'Items',
      description: 'Delete an item from the store.',
      usage: 'delete-item <item name>',
      aliases: ['deleteitem', 'delitem'],
      permLevel: 'Administrator',
      guildOnly: true,
      requiredArgs: 1,
    });
  }

  async run(msg, args) {
    const itemName = args.join(' ').toLowerCase();
    const store = (await db.get(`servers.${msg.guild.id}.economy.store`)) || {};

    // Find the item in the store regardless of case
    const itemKey = Object.keys(store).find((key) => key.toLowerCase() === itemName);

    const item = store[itemKey];
    if (!item) {
      const embed = new EmbedBuilder()
        .setAuthor({ name: msg.author.tag, iconURL: msg.author.displayAvatarURL() })
        .setColor(msg.settings.embedErrorColor)
        .setDescription('There is not an item with that name.');

      return msg.channel.send({ embeds: [embed] });
    }

    await db.delete(`servers.${msg.guild.id}.economy.store.${itemKey}`);
    const embed = new EmbedBuilder()
      .setColor(msg.settings.embedColor)
      .setAuthor({ name: msg.author.tag, iconURL: msg.author.displayAvatarURL() })
      .setDescription('Item has been removed from the store.');
    return msg.channel.send({ embeds: [embed] });
  }
}

module.exports = DeleteItem;
