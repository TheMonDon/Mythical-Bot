const Command = require('../../base/Command.js');
const { EmbedBuilder } = require('discord.js');
const { QuickDB } = require('quick.db');
const db = new QuickDB();

class CreateItem extends Command {
  constructor(client) {
    super(client, {
      name: 'create-item',
      category: 'Items',
      description: 'Create an item to be shown in the store.',
      usage: 'create-item <item name>',
      longDescription: 'Create an item to be shown in the store. The item name will be cut off at 200 characters',
      aliases: ['createitem'],
      permLevel: 'Administrator',
      guildOnly: true,
      requiredArgs: 1,
    });
  }

  async run(msg, args) {
    const name = args.join(' ').slice(0, 200);
    const store = (await db.get(`servers.${msg.guild.id}.economy.store`)) || {};
    const filter = (m) => m.author.id === msg.author.id;
    const embed = new EmbedBuilder()
      .setAuthor({ name: msg.author.tag, iconURL: msg.author.displayAvatarURL() })
      .setColor(msg.settings.embedColor)
      .addFields([{ name: 'Name', value: name, inline: true }])
      .setFooter({ text: 'Type cancel to quit.' })
      .setTimestamp();

    // Find the item in the store regardless of case
    const item = Object.keys(store).find((key) => key.toLowerCase() === name.toLowerCase());
    if (item) {
      const noItemEmbed = new EmbedBuilder()
        .setAuthor({ name: msg.author.tag, iconURL: msg.author.displayAvatarURL() })
        .setColor(msg.settings.embedErrorColor)
        .setDescription('There is already an item with that name.');

      return msg.channel.send({ embeds: [noItemEmbed] });
    }

    let cost;
    let collected;
    let isValid = false;

    const message = await msg.channel.send({ content: 'What would you like the price to be?', embeds: [embed] });

    while (!isValid) {
      collected = await msg.channel
        .awaitMessages({
          filter,
          max: 1,
          time: 60000,
          errors: ['time'],
        })
        .catch(() => null);
      if (!collected) return msg.reply('You did not reply in time, the command has been cancelled.');
      if (collected.first().content.toLowerCase() === 'cancel') return msg.reply('The command has been cancelled.');

      cost = parseInt(
        collected
          .first()
          .content.toLowerCase()
          .replace(/[^0-9\\.]/g, ''),
      );

      if (isNaN(cost)) {
        await collected
          .first()
          .reply('The cost must be a valid number. Please enter the cost again or type `cancel` to exit.');
      } else if (cost === Infinity) {
        await collected.first().reply(`The cost must be less than ${BigInt(Number.MAX_VALUE.toLocaleString())}.`);
      } else if (cost < 0) {
        await msg.reply('The cost must be at least zero. Please enter a valid cost.');
      } else {
        isValid = true;
      }
    }

    const currencySymbol = (await db.get(`servers.${msg.guild.id}.economy.symbol`)) || '$';
    embed.addFields([{ name: 'Cost', value: currencySymbol + cost.toLocaleString(), inline: true }]);
    await message.edit({
      content: 'What would you like the description to be? \nThis should be no more than 1000 characters',
      embeds: [embed],
    });

    isValid = false;
    let description;

    while (!isValid) {
      collected = await msg.channel
        .awaitMessages({
          filter,
          max: 1,
          time: 60000,
          errors: ['time'],
        })
        .catch(() => null);
      if (!collected) return msg.reply('You did not reply in time, the command has been cancelled.');
      if (collected.first().content.toLowerCase() === 'cancel')
        return collected.first().reply('The command has been cancelled.');

      description = collected.first().content;
      if (description.length > 1000) {
        collected
          .first()
          .reply(
            'The description must be less than 1024 characters. Please try again or use `cancel` to cancel the command',
          );
      } else {
        isValid = true;
      }
    }

    embed.addFields([{ name: 'Description', value: description, inline: true }]);

    store[name] = {
      cost,
      description,
    };

    await db.set(`servers.${msg.guild.id}.economy.store`, store);
    return message.edit({ content: ':white_check_mark: Item created successfully!', embeds: [embed] });
  }
}

module.exports = CreateItem;
