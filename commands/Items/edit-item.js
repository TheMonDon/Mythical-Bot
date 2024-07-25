/* eslint-disable no-case-declarations */
const Command = require('../../base/Command.js');
const { EmbedBuilder } = require('discord.js');
const { QuickDB } = require('quick.db');
const db = new QuickDB();

class EditItem extends Command {
  constructor(client) {
    super(client, {
      name: 'edit-item',
      category: 'Items',
      description: 'Edit an item in the store.',
      usage: 'edit-item <name|price|description> "<item name>" <new value>',
      aliases: ['edititem'],
      permLevel: 'Administrator',
      guildOnly: true,
      requiredArgs: 3,
    });
  }

  async run(msg, args) {
    const attribute = args.shift().toLowerCase();
    const itemNameStartIndex = args.findIndex((arg) => arg.startsWith('"'));
    const itemNameEndIndex = args.findIndex((arg) => arg.endsWith('"'));

    if (itemNameStartIndex === -1 || itemNameEndIndex === -1) {
      return msg.reply('Please enclose the item name in double quotes.');
    }

    const itemName = args
      .slice(itemNameStartIndex, itemNameEndIndex + 1)
      .join(' ')
      .replace(/"/g, '');
    const newValue = args.slice(itemNameEndIndex + 1).join(' ');

    const store = (await db.get(`servers.${msg.guild.id}.economy.store`)) || {};

    // Find the item in the store regardless of case
    const itemKey = Object.keys(store).find((key) => key.toLowerCase() === itemName.toLowerCase());

    if (!itemKey) return msg.reply('That item does not exist in the store.');

    const item = store[itemKey];

    switch (attribute) {
      case 'name':
        // Ensure the new name is not already taken
        const newItemKey = newValue.toLowerCase();
        if (Object.keys(store).find((key) => key.toLowerCase() === newItemKey)) {
          return msg.reply('An item with that name already exists.');
        }
        // Update the item name
        store[newValue] = item;
        delete store[itemKey];
        break;
      case 'price':
        const price = parseInt(newValue, 10);
        if (isNaN(price) || price < 0) {
          return msg.reply('Please provide a valid price.');
        }
        item.cost = price;
        store[itemKey] = item;
        break;
      case 'description':
        item.description = newValue;
        store[itemKey] = item;
        break;
      default:
        return msg.reply('Invalid attribute. You can only edit name, price, or description.');
    }

    await db.set(`servers.${msg.guild.id}.economy.store`, store);

    const embed = new EmbedBuilder()
      .setTitle('Item Edited')
      .setDescription(`The **${attribute}** of **${itemKey}** has been updated to **${newValue}**.`)
      .setColor(msg.settings.embedColor)
      .setTimestamp();

    return msg.channel.send({ embeds: [embed] });
  }
}

module.exports = EditItem;
